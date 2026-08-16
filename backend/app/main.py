import sys
import os
import uuid
import uvicorn
import json
import ast  # Needed to parse Python-style dicts
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from PyPDF2 import PdfReader
import io
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


app = FastAPI(title="Career-Agent.OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- HELPER: Clean Agent Output ---
def parse_agent_output(output):
    """
    Converts the Agent's output (which might be a string with single quotes)
    into a proper Python List/Dictionary for JSON response.
    """
    # 1. If it's already a Pydantic object, dump it
    if hasattr(output, 'pydantic') and output.pydantic:
        return output.pydantic.model_dump()

    # 2. Get the raw string content
    # CrewAI output might be an object, so we get .raw or str()
    content = output.raw if hasattr(output, 'raw') else str(output)

    # 3. Try parsing as Standard JSON
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass  # Not standard JSON, keep trying

    # 4. Try parsing as Python Literal (handles single quotes 'key': 'value')
    try:
        return ast.literal_eval(content)
    except (ValueError, SyntaxError):
        pass  # Failed to parse structure

    # 5. Fallback: Return raw string wrapped in a dict
    return {"raw_output": content}


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extracts all text from a PDF's raw bytes.
    Guards against pages that return None (e.g. scanned/image-only pages)
    which previously crashed the app with a TypeError on string concatenation.
    """
    pdf_reader = PdfReader(io.BytesIO(content))
    resume_text = ""
    for page in pdf_reader.pages:
        resume_text += page.extract_text() or ""
    return resume_text


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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- MODULE 2: Resume Analyzer ---
@app.post("/api/analyze-resume")
async def analyze_resume(
        file: UploadFile = File(...),
        job_description: str = Form(...)
):
    print(f"📥 [RESUME ANALYZER] Request Received. File: {file.filename}")

    try:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        content = await file.read()
        resume_text = extract_text_from_pdf(content)

        print(f"✅ [RESUME ANALYZER] Text Extracted: {len(resume_text)} chars")

        resume_crew = ResumeCrew()
        inputs = {
            'resume_text': resume_text,
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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- MODULE 3: Interview Prep ---
@app.post("/api/interview-prep")
async def interview_prep(
        file: UploadFile = File(...),
        job_description: str = Form(...)
):
    print(f"📥 [INTERVIEW COACH] Request Received. File: {file.filename}")

    try:
        # A. Extract Text from PDF (Reuse logic)
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        content = await file.read()
        resume_text = extract_text_from_pdf(content)

        print(f"✅ [INTERVIEW COACH] Resume extracted. Generating questions...")

        # B. Run Agent
        interview_crew = InterviewCrew()
        inputs = {
            'resume_text': resume_text,
            'job_description': job_description
        }

        # Same fix as above: don't block the event loop with a sync call.
        result = await run_in_threadpool(interview_crew.kickoff, inputs=inputs)

        # C. Return Data (using our helper)
        return parse_agent_output(result)

    except Exception as e:
        print(f"❌ [INTERVIEW COACH ERROR]:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- MODULE 4: Cold Email Generator ---
@app.post("/api/generate-email")
async def generate_email(
        file: UploadFile = File(...),
        job_description: str = Form(...),
        company: str = Form(...),
        recipient: str = Form(...)
):
    print(f"📥 [EMAIL AGENT] Request Received for company: {company}")

    try:
        # A. Extract Text from PDF (Standard Logic)
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        content = await file.read()
        resume_text = extract_text_from_pdf(content)

        print(f"✅ [EMAIL AGENT] Resume extracted. Writing email...")

        # B. Run Agent
        email_crew = EmailCrew()
        inputs = {
            'resume_text': resume_text,
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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup always runs, on both success and failure.
        if os.path.exists(temp_video): os.remove(temp_video)
        if os.path.exists(temp_audio): os.remove(temp_audio)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)