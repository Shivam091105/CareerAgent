import sys
import os
import uuid
import uvicorn
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import traceback
from moviepy import VideoFileClip

import crewai.llms.cache as crewai_cache
crewai_cache.mark_cache_breakpoint = lambda msg: msg

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Agents
from agents.hunter_crew import JobHunterCrew
from agents.resume_crew import ResumeCrew
from agents.interview_crew import InterviewCrew
from agents.email_crew import EmailCrew
from agents.video_crew import VideoCrew
from app import profile_store
from app.utils import parse_agent_output, extract_text_from_pdf, is_rate_limit_error
from graph.workflows import run_pipeline


app = FastAPI(title="Career-Agent.OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Task 1: profile store — make sure the `profiles` table exists before any
# request tries to read/write it.
profile_store.init_db()


# --- HELPER: turn a caught LLM-call exception into the right HTTP error ---
def raise_for_llm_error(e: Exception):
    """
    Every route that calls a crew catches exceptions the same way: log it,
    then decide whether it was a rate limit (so the user should just wait
    and retry) or something else (a real 500). Centralized here so all six
    routes give the same, correct response instead of dumping a raw
    stack-trace string at the user either way.
    """
    traceback.print_exc()
    if is_rate_limit_error(e):
        raise HTTPException(
            status_code=429,
            detail="Groq's rate limit was hit. Please wait a moment and try again."
        )
    raise HTTPException(status_code=500, detail=str(e))


# --- HELPER: resolve resume text from either an upload or the saved profile ---
def resolve_resume_text(file: Optional[UploadFile], content: Optional[bytes], resume_text: Optional[str]) -> str:
    """
    Shared by every route that needs resume text (resume analyzer, interview
    prep, cold email). A module can get the text one of two ways now:
      1. A freshly uploaded PDF (old behaviour, still supported).
      2. Text already saved to the user's profile (Task 1) — sent as a plain
         form field, so the frontend doesn't need to fake a PDF upload just
         to reuse text it already has.
    Whichever is present wins; if neither is present, that's a user error.
    """
    if file is not None and content:
        return extract_text_from_pdf(content)
    if resume_text and resume_text.strip():
        return resume_text
    raise HTTPException(
        status_code=400,
        detail="No resume provided. Upload a PDF or save a resume to your profile first."
    )


# --- Profile Store (Task 1) ---
class ProfileTextUpdate(BaseModel):
    email: str
    resume_text: str


@app.get("/api/profile/{email}")
async def get_profile(email: str):
    profile = await run_in_threadpool(profile_store.get_profile, email)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile found for this email yet.")
    return profile


@app.post("/api/profile/upload")
async def upload_profile_resume(
        email: str = Form(...),
        file: UploadFile = File(...)
):
    """Upload (or replace) the PDF resume attached to a profile."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    resume_text = extract_text_from_pdf(content)

    profile = await run_in_threadpool(
        profile_store.upsert_profile, email, resume_text, file.filename
    )
    return profile


@app.put("/api/profile")
async def update_profile_text(payload: ProfileTextUpdate):
    """Save hand-edited resume text without re-uploading a PDF."""
    profile = await run_in_threadpool(
        profile_store.upsert_profile, payload.email, payload.resume_text, None
    )
    return profile


# --- MODULE 0: Autopilot Pipeline (LangGraph) ---
class PipelineRequest(BaseModel):
    email: str
    # Provide job_title for a fresh search, OR selected_job to skip
    # straight to matching against a job already picked in Job Hunter
    # (Task 2's job context bridge).
    job_title: Optional[str] = None
    skills: Optional[str] = None
    selected_job: Optional[dict] = None


@app.post("/api/orchestrate/run")
async def run_orchestration(request: PipelineRequest):
    """
    Runs the full autopilot pipeline: profile -> job search/match ->
    resume analysis -> interview prep -> cold email draft, in one call.
    """
    if not request.job_title and not request.selected_job:
        raise HTTPException(
            status_code=400,
            detail="Provide either a job_title to search, or a selected_job to match against."
        )

    print(f"🛰️ [AUTOPILOT] Running pipeline for {request.email}")
    try:
        final_state = await run_pipeline(request.model_dump())
    except Exception as e:
        print(f"❌ [AUTOPILOT ERROR]:")
        raise_for_llm_error(e)
    print(f"🛰️ [AUTOPILOT] Finished. Errors: {final_state.get('errors') or 'none'}")

    return {
        "jobs": final_state.get("jobs", []),
        "selected_job": final_state.get("selected_job"),
        "resume_analysis": final_state.get("resume_analysis"),
        "interview_prep": final_state.get("interview_prep"),
        "cold_email": final_state.get("cold_email"),
        "errors": final_state.get("errors", []),
    }


# --- MODULE 1: Job Scraper ---
class ScraperRequest(BaseModel):
    email: str
    query: str
    # Optional: if the user tells us their skills, we use them to narrow the
    # search. If they don't, the agent figures out the right skills for the
    # role itself instead of a fixed, hardcoded list.
    skills: Optional[str] = None


@app.post("/api/scrape")
async def trigger_job_scraper(request: ScraperRequest):
    print(f"📥 [JOB HUNTER] Received scrape request for: {request.email}")
    try:
        crew = JobHunterCrew()
        inputs = {
            'job_title': request.query,
            'skills': request.skills.strip() if request.skills and request.skills.strip() else None
        }

        print(f"🚀 [JOB HUNTER] Kicking off for role: {request.query}...")
        result = await crew.kickoff(inputs=inputs)

        # --- CLEANUP STEP ---
        final_data = parse_agent_output(result)
        print(f"✅ [JOB HUNTER] Returning clean data: {type(final_data)}")
        return final_data

    except Exception as e:
        print(f"❌ [JOB HUNTER ERROR]: {e}")
        raise_for_llm_error(e)


# --- MODULE 2: Resume Analyzer ---
@app.post("/api/analyze-resume")
async def analyze_resume(
        file: UploadFile = File(None),
        job_description: str = Form(...),
        resume_text: str = Form(None)
):
    print(f"📥 [RESUME ANALYZER] Request Received. File: {file.filename if file else 'none (using profile text)'}")

    try:
        content = None
        if file is not None:
            if file.content_type != "application/pdf":
                raise HTTPException(status_code=400, detail="Only PDF files are supported")
            content = await file.read()

        resolved_text = resolve_resume_text(file, content, resume_text)

        print(f"✅ [RESUME ANALYZER] Text ready: {len(resolved_text)} chars")

        resume_crew = ResumeCrew()
        inputs = {
            'resume_text': resolved_text,
            'job_description': job_description
        }

        print(f"🚀 [RESUME ANALYZER] Kicking off Agent...")
        # resume_crew.kickoff() is a SYNCHRONOUS, blocking call (it waits on
        # network calls to the LLM). Running it directly inside an `async def`
        # route freezes the entire server for every other user until it
        # finishes. run_in_threadpool moves it to a worker thread so other
        # requests can still be handled concurrently.
        result = await run_in_threadpool(resume_crew.kickoff, inputs=inputs)

        # Use the same cleanup helper
        return parse_agent_output(result)

    except Exception as e:
        print(f"❌ [RESUME ANALYZER ERROR]:")
        raise_for_llm_error(e)


# --- MODULE 3: Interview Prep ---
@app.post("/api/interview-prep")
async def interview_prep(
        file: UploadFile = File(None),
        job_description: str = Form(...),
        resume_text: str = Form(None)
):
    print(f"📥 [INTERVIEW COACH] Request Received. File: {file.filename if file else 'none (using profile text)'}")

    try:
        content = None
        if file is not None:
            if file.content_type != "application/pdf":
                raise HTTPException(status_code=400, detail="Only PDF files are supported")
            content = await file.read()

        resolved_text = resolve_resume_text(file, content, resume_text)

        print(f"✅ [INTERVIEW COACH] Text ready. Generating questions...")

        # B. Run Agent
        interview_crew = InterviewCrew()
        inputs = {
            'resume_text': resolved_text,
            'job_description': job_description
        }

        # Same fix as above: don't block the event loop with a sync call.
        result = await run_in_threadpool(interview_crew.kickoff, inputs=inputs)

        # C. Return Data (using our helper)
        return parse_agent_output(result)

    except Exception as e:
        print(f"❌ [INTERVIEW COACH ERROR]:")
        raise_for_llm_error(e)


# --- MODULE 4: Cold Email Generator ---
@app.post("/api/generate-email")
async def generate_email(
        file: UploadFile = File(None),
        job_description: str = Form(...),
        company: str = Form(...),
        recipient: str = Form(...),
        resume_text: str = Form(None)
):
    print(f"📥 [EMAIL AGENT] Request Received for company: {company}")

    try:
        content = None
        if file is not None:
            if file.content_type != "application/pdf":
                raise HTTPException(status_code=400, detail="Only PDF files are supported")
            content = await file.read()

        resolved_text = resolve_resume_text(file, content, resume_text)

        print(f"✅ [EMAIL AGENT] Text ready. Writing email...")

        # B. Run Agent
        email_crew = EmailCrew()
        inputs = {
            'resume_text': resolved_text,
            'job_description': job_description,
            'company_name': company,
            'recipient_name': recipient
        }

        # Same fix as above: don't block the event loop with a sync call.
        result = await run_in_threadpool(email_crew.kickoff, inputs=inputs)

        # C. Return Clean Data
        return parse_agent_output(result)

    except Exception as e:
        print(f"❌ [EMAIL AGENT ERROR]:")
        raise_for_llm_error(e)


# --- MODULE 5: Video Soft Skills Coach ---
def _extract_audio_sync(temp_video: str, temp_audio: str):
    """Blocking moviepy work, run off the event loop via run_in_threadpool."""
    video = VideoFileClip(temp_video)
    try:
        video.audio.write_audiofile(temp_audio, logger=None)
    finally:
        # Always close, even if writing the audio track fails, otherwise the
        # file handle stays open and os.remove() below can fail (especially
        # on Windows) leaving orphaned temp files on disk.
        video.close()


@app.post("/api/analyze-video")
async def analyze_video(file: UploadFile = File(...)):
    print(f"📥 [VIDEO COACH] Request Received. File: {file.filename}")

    # Use a random id instead of the raw filename: an uploaded filename like
    # "../../etc/passwd.mp4" would otherwise let a request write outside the
    # working directory (path traversal), and it also avoids collisions
    # between two users uploading a file with the same name at once.
    unique_id = uuid.uuid4().hex
    ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    temp_video = f"temp_{unique_id}{ext}"
    temp_audio = f"temp_{unique_id}.mp3"

    try:
        # 1. Save Video Locally.
        # file.read() is the async-friendly way to pull the upload into
        # memory; the actual disk write is blocking I/O so it's offloaded
        # to a worker thread too, keeping the event loop free.
        content = await file.read()

        def _save_video():
            with open(temp_video, "wb") as buffer:
                buffer.write(content)

        await run_in_threadpool(_save_video)

        # 2. Extract Audio using MoviePy (blocking CPU/IO work -> threadpool)
        print("🎬 Extracting audio...")
        await run_in_threadpool(_extract_audio_sync, temp_video, temp_audio)

        # 3. Run Agent
        print("🚀 [VIDEO COACH] Kicking off Agent...")
        video_crew = VideoCrew()
        # Note: kickoff now takes the audio path, not a dict of inputs.
        # video_crew.kickoff() is also a blocking call (transcription + LLM),
        # so it goes through run_in_threadpool as well.
        result = await run_in_threadpool(video_crew.kickoff, audio_path=temp_audio)

        return parse_agent_output(result)

    except Exception as e:
        print(f"❌ [VIDEO COACH ERROR]:")
        raise_for_llm_error(e)

    finally:
        # Cleanup always runs, on both success and failure.
        if os.path.exists(temp_video): os.remove(temp_video)
        if os.path.exists(temp_audio): os.remove(temp_audio)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)