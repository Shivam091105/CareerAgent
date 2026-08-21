"""
LangGraph nodes for the "autopilot" pipeline.

Each node is a small async function: `(state: PipelineState) -> dict`.
LangGraph calls them in the order wired up in workflows.py, merging
whatever dict each one returns into the shared state before the next node
runs.

Every node wraps one of the crews that already power the standalone
/api/... routes in main.py — nothing new is happening AI-wise, this is
purely about chaining the existing steps together instead of requiring five
separate button clicks.

The three CrewAI crews used here (Resume/Interview/Email) expose a
*synchronous* `.kickoff()` — same as in main.py, that's offloaded to a
worker thread with `asyncio.to_thread` so it doesn't block the event loop.
JobHunterCrew already exposes an async `.kickoff()`.

Autopilot fires up to 4 LLM calls back-to-back in a single request (search,
resume, interview, email), which is enough on its own to trip a per-minute
Groq rate limit even with just one user running it — a small delay between
stages spreads the calls out so that's less likely to happen in the first
place. It's a cheap mitigation on top of the retry/backoff already
configured on each LLM() instance in the crew files.
"""
import asyncio

from agents.hunter_crew import JobHunterCrew
from agents.resume_crew import ResumeCrew
from agents.interview_crew import InterviewCrew
from agents.email_crew import EmailCrew
from app import profile_store
from app.utils import parse_agent_output, is_rate_limit_error
from graph.state import PipelineState

# Pause between successive LLM-calling stages in the pipeline, to spread
# out the request rate rather than firing 4 calls in immediate succession.
INTER_STAGE_DELAY_SECONDS = 2


def _with_error(state: PipelineState, message: str) -> dict:
    return {"errors": [*state.get("errors", []), message]}


def _describe_failure(stage: str, e: Exception) -> str:
    if is_rate_limit_error(e):
        return f"{stage} failed: Groq's rate limit was hit. Wait a moment and try again."
    return f"{stage} failed: {e}"


async def load_profile_node(state: PipelineState) -> dict:
    """Pull the saved resume for this email out of the profile store (Task 1)."""
    email = state.get("email", "").strip()
    if not email:
        return _with_error(state, "No email provided — can't look up a profile.")

    profile = await asyncio.to_thread(profile_store.get_profile, email)
    if not profile or not profile.get("resume_text", "").strip():
        return _with_error(
            state,
            f"No saved resume found for {email}. Upload one on the Profile page first."
        )

    return {"resume_text": profile["resume_text"]}


async def hunt_jobs_node(state: PipelineState) -> dict:
    """Search for jobs matching job_title/skills (only runs if no job was pre-selected)."""
    job_title = state.get("job_title", "").strip()
    if not job_title:
        return _with_error(state, "No job title provided to search for.")

    try:
        crew = JobHunterCrew()
        result = await crew.kickoff(inputs={
            "job_title": job_title,
            "skills": state.get("skills") or None
        })
        parsed = parse_agent_output(result)
        jobs = parsed if isinstance(parsed, list) else parsed.get("jobs", [])
    except Exception as e:
        return _with_error(state, _describe_failure("Job search", e))

    if not jobs:
        return _with_error(state, f"No jobs found for '{job_title}'.")
    return {"jobs": jobs}


def pick_job_node(state: PipelineState) -> dict:
    """Take the top result from the search as the job to build everything else around."""
    jobs = state.get("jobs", [])
    if not jobs:
        return _with_error(state, "No jobs available to select from.")
    return {"selected_job": jobs[0]}


async def analyze_resume_node(state: PipelineState) -> dict:
    job = state.get("selected_job")
    if not job:
        return _with_error(state, "No selected job to analyze the resume against.")

    await asyncio.sleep(INTER_STAGE_DELAY_SECONDS)
    try:
        crew = ResumeCrew()
        result = await asyncio.to_thread(crew.kickoff, {
            "resume_text": state["resume_text"],
            "job_description": job.get("summary", "")
        })
        return {"resume_analysis": parse_agent_output(result)}
    except Exception as e:
        return _with_error(state, _describe_failure("Resume analysis", e))


async def prep_interview_node(state: PipelineState) -> dict:
    job = state.get("selected_job")
    if not job:
        return _with_error(state, "No selected job to prep interview questions for.")

    await asyncio.sleep(INTER_STAGE_DELAY_SECONDS)
    try:
        crew = InterviewCrew()
        result = await asyncio.to_thread(crew.kickoff, {
            "resume_text": state["resume_text"],
            "job_description": job.get("summary", "")
        })
        return {"interview_prep": parse_agent_output(result)}
    except Exception as e:
        return _with_error(state, _describe_failure("Interview prep", e))


async def draft_email_node(state: PipelineState) -> dict:
    job = state.get("selected_job")
    if not job:
        return _with_error(state, "No selected job to draft a cold email for.")

    await asyncio.sleep(INTER_STAGE_DELAY_SECONDS)
    try:
        crew = EmailCrew()
        result = await asyncio.to_thread(crew.kickoff, {
            "resume_text": state["resume_text"],
            "job_description": job.get("summary", ""),
            "company_name": job.get("company", "the company"),
            "recipient_name": "Hiring Manager"
        })
        return {"cold_email": parse_agent_output(result)}
    except Exception as e:
        return _with_error(state, _describe_failure("Cold email draft", e))