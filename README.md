# AI-Powered Career Intelligence Platform

An AI-powered career intelligence platform that helps job seekers streamline the job search and interview process through specialized AI agents.

The platform combines **job discovery, resume analysis, interview preparation, recruiter outreach, interview communication analysis, and full-pipeline autopilot orchestration** into a single web application powered by **CrewAI, LangGraph, Groq LLMs, FastAPI, and React**.

---

## Overview

The **AI-Powered Career Intelligence Platform** uses specialized AI agents to automate repetitive career-development workflows.

Instead of relying on a single general-purpose chatbot, the system separates responsibilities across task-specific agents:

* **Job Hunter Agent** - discovers relevant job opportunities using web search, adapting its search strategy (and required skills) to whatever role is searched, not just tech roles.
* **Resume Optimization Agent** - evaluates a resume against a job description and identifies ATS gaps.
* **Interview Preparation Agent** - generates role-specific technical and behavioral interview questions.
* **Cold Email Agent** - generates personalized recruiter outreach emails.
* **Video Coach Agent** - transcribes mock interview recordings and evaluates communication skills.
* **Profile Store** - saves a candidate's resume once (keyed by email) so every other module can reuse it instead of re-uploading a PDF each time.
* **Autopilot Orchestrator (LangGraph)** - chains the job hunter, resume, interview, and email agents into a single automated pipeline, with a real branch: skip straight to matching if a job was already picked in the UI, otherwise search fresh first.

The backend exposes these capabilities through REST APIs, while the React frontend provides an interactive interface for each workflow.

---

## Key Features

### 0. Candidate Profile (Save Once, Reuse Everywhere)

Set an email as your profile ID, upload a PDF resume once (or paste/edit the text directly), and every other module — Resume Optimizer, Interview Coach, Cold Emailer, Autopilot — reuses it by default. A one-click "Upload different" option is still available for a one-off run without touching the saved profile.

Stored in a lightweight SQLite database (`backend/app/career_agent.db`), keyed by email. No login system yet — this is a plain identifier, not authentication.

### 1. AI Job Discovery

Search for relevant job opportunities using natural-language job queries.

The Job Hunter agent:

* Searches the web using Tavily.
* Identifies relevant job listings.
* Extracts company, role, location, application link, and summary.
* Uses the candidate's skills to improve relevance — if no skills are given, the agent infers what's actually relevant to the searched role itself (technical, medical, creative, managerial, etc.) instead of defaulting to a fixed tech skill list.

### 2. Resume Optimization

Upload a PDF resume and provide a target job description.

The Resume Optimization agent:

* Extracts resume text from PDF files.
* Identifies technical skills and keywords from the job description.
* Compares the resume against the target role.
* Generates an ATS-oriented match score.
* Identifies missing keywords.
* Suggests optimized resume bullet points.
* Critiques the professional summary.

### 3. AI Interview Preparation

Generate personalized interview preparation from a resume and job description.

The Interview Coach generates:

* Technical interview questions.
* Behavioral interview questions.
* Context explaining why each question is relevant.
* STAR-based sample answers.
* Role-specific interview tips.

### 4. Personalized Cold Email Generation

Generate concise recruiter outreach emails based on:

* Candidate resume.
* Job description.
* Company.
* Recruiter or hiring-manager name.

The agent identifies relevant candidate experience and connects it with the requirements of the target role.

### 5. AI Video Interview Coach

Upload a mock interview recording and receive communication feedback.

The workflow:

```text
Interview Video
      ↓
MoviePy
      ↓
Audio Extraction
      ↓
Groq Whisper
      ↓
Transcript
      ↓
CrewAI Communication Coach
      ↓
Soft-Skill Analysis
```

The system evaluates:

* Speaking score.
* Clarity.
* Communication quality.
* Filler-word usage.
* Delivery.
* Areas for improvement.

### 6. Autopilot (LangGraph Orchestration)

Run the entire pipeline — job match, resume analysis, interview prep, and cold email draft — in a single request instead of clicking through five separate modules.

```text
                         load_profile
                              │
              ┌───────────────┴───────────────┐
      job already picked?              no job picked yet
              │                                │
              ▼                                ▼
       analyze_resume  ◄──── pick_job ◄──── hunt_jobs
              │
              ▼
        prep_interview
              │
              ▼
         draft_email
```

If a job was already selected via the Job Hunter's "Prep interview" / "Draft email" buttons, the graph skips straight to `analyze_resume`. Otherwise it searches fresh via `hunt_jobs` → `pick_job` first. Both paths converge on the same downstream stages.

If any stage fails (e.g. a rate limit), that stage records the error and the graph routes straight to an early end instead of continuing — so a failed interview-prep call doesn't immediately fire another LLM call for the email draft into the same rate limit. The response always includes whatever *did* complete, plus a plain-English reason for whatever didn't.

---

## System Architecture

```text
                         ┌─────────────────────────┐
                         │      React Frontend      │
                         │  Vite + Tailwind + Context│
                         └────────────┬────────────┘
                                      │ REST API
                                      ▼
                         ┌─────────────────────────┐
                         │      FastAPI Backend     │
                         │  /api/... routes, 429s   │
                         └──────┬────────────┬──────┘
                                │            │
                                ▼            ▼
                  ┌──────────────────┐  ┌──────────────────────┐
                  │  Profile Store    │  │ LangGraph Orchestrator│
                  │  SQLite, by email │  │ /api/orchestrate/run │
                  └──────────────────┘  └──────────┬────────────┘
                                                    │
                                                    ▼
                                       ┌─────────────────────────┐
                                       │      5 Crew Modules      │
                                       │  hunter · resume · int-  │
                                       │  erview · email · video  │
                                       └──────────┬──────┬───────┘
                                                  │      │
                                                  ▼      ▼
                                      ┌────────────────┐ ┌──────────────┐
                                      │ Groq LLM+Whisper│ │ Tavily Search│
                                      │ retry + backoff │ │ (job hunter) │
                                      └────────────────┘ └──────────────┘
```

The FastAPI backend exposes both the direct, standalone `/api/...` routes (used by the individual frontend pages) *and* the LangGraph orchestrator, which internally calls the same 5 crew modules in sequence rather than duplicating any agent logic. Every crew's `LLM(...)` instance is configured with a timeout and automatic retry/backoff, so a transient Groq rate limit is absorbed silently where possible; anything that still fails comes back as a proper `429` instead of a raw stack trace.

---

## Technology Stack

### Frontend

* **React 19**
* **Vite**
* **Tailwind CSS**
* **Axios**
* **Framer Motion**
* **Lucide React**
* **React Router**

### Backend

* **Python**
* **FastAPI**
* **Uvicorn**
* **Pydantic**
* **PyPDF2**
* **MoviePy**

### AI / Agent Framework

* **CrewAI**
* **LangGraph** — orchestrates the Autopilot pipeline (`backend/graph/`)
* **Groq**
* **Llama 3.3 70B** (or your account's current available Groq model — see Troubleshooting)
* **Whisper Large V3**
* **litellm** — auto-retry/backoff on rate limits, used underneath CrewAI's `LLM(...)`

### External Services

* **Tavily** — web search and job discovery
* **Groq API** — LLM inference and speech transcription

### Data Storage

* **SQLite** — the profile store (`backend/app/career_agent.db`), created automatically on first run. Not committed to git.
* **MongoDB / Motor** — present in the backend's dependencies for future use, but not currently wired into any route (see `app/database.py`, `app/dependencies.py`).

---

## Project Structure

```text
Career-Agent-OS/
│
├── backend/
│   │
│   ├── agents/
│   │   ├── config/
│   │   │   ├── agents.yaml
│   │   │   ├── tasks.yaml
│   │   │   ├── resume_agents.yaml
│   │   │   └── resume_tasks.yaml
│   │   │
│   │   ├── hunter_crew.py
│   │   ├── resume_crew.py
│   │   ├── interview_crew.py
│   │   ├── email_crew.py
│   │   ├── video_crew.py
│   │   └── reviewer_crew.py        # scaffold, not currently wired up
│   │
│   ├── app/
│   │   ├── main.py                 # all FastAPI routes
│   │   ├── utils.py                # parse_agent_output, PDF extraction, rate-limit detection
│   │   ├── profile_store.py        # SQLite-backed profile CRUD
│   │   ├── database.py             # MongoDB scaffold, not currently wired up
│   │   ├── dependencies.py         # scaffold, not currently wired up
│   │   └── career_agent.db         # auto-created SQLite file (gitignored)
│   │
│   ├── graph/
│   │   ├── state.py                # PipelineState — shared state shape
│   │   ├── nodes.py                # one node per pipeline stage
│   │   └── workflows.py            # builds + compiles the StateGraph
│   │
│   ├── tools/
│   │   └── tavily_search.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── JobDashboard.jsx
│   │   │   ├── ResumeOptimizer.jsx
│   │   │   ├── InterviewPrep.jsx
│   │   │   ├── ColdEmail.jsx
│   │   │   ├── VideoCoach.jsx
│   │   │   ├── Profile.jsx         # upload/edit the saved resume
│   │   │   ├── AutoPilot.jsx       # triggers /api/orchestrate/run
│   │   │   └── Sidebar.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AppContext.jsx      # shared email/profile/selectedJob state
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# Getting Started

## Prerequisites

Make sure the following are installed:

* Python 3.10+
* Node.js 18+
* npm
* Git

For video analysis, MoviePy may also require **FFmpeg** depending on the installed MoviePy environment.

---

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Career-Agent-OS
```

---

## 2. Set Up the Backend

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

### Windows

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
MONGO_URL=mongodb://localhost:27017
```

### Required API Keys

#### Groq

Used for:

* Llama 3.3 70B inference.
* Whisper speech transcription.

#### Tavily

Used by the Job Hunter agent for web search.

MongoDB is optional for the currently exposed workflows.

---

## 4. Start the Backend

From the `backend` directory:

```bash
python app/main.py
```

The FastAPI server will start at:

```text
http://localhost:8000
```

FastAPI's interactive API documentation is available at:

```text
http://localhost:8000/docs
```

---

## 5. Start the Frontend

Open a second terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

Before using **Resume Optimizer**, **Interview Coach**, **Cold Emailer**, or **Autopilot** without re-uploading a PDF each time, visit `/profile` first, set an email, and upload/save a resume.

---

# API Endpoints

| Endpoint                | Method | Purpose                                          |
| ------------------------ | ------ | ------------------------------------------------- |
| `/api/profile/{email}`   | GET    | Fetch a saved profile                            |
| `/api/profile/upload`    | POST   | Upload/replace a resume PDF, parsed and saved    |
| `/api/profile`           | PUT    | Save hand-edited resume text                     |
| `/api/orchestrate/run`   | POST   | Run the full Autopilot pipeline (LangGraph)      |
| `/api/scrape`            | POST   | Search for relevant jobs                          |
| `/api/analyze-resume`    | POST   | Analyze resume against a JD                       |
| `/api/interview-prep`    | POST   | Generate interview preparation                    |
| `/api/generate-email`    | POST   | Generate recruiter outreach email                 |
| `/api/analyze-video`     | POST   | Analyze mock interview communication              |

`analyze-resume`, `interview-prep`, and `generate-email` each accept **either** a fresh PDF upload (`file`) **or** a `resume_text` form field pulled from the saved profile — whichever is present is used.

---

## API Workflow

### Candidate Profile

```text
GET  /api/profile/{email}
POST /api/profile/upload   (multipart: email, file)
PUT  /api/profile          (json: email, resume_text)
```

Every other module that needs a resume can send `resume_text` instead of re-uploading a file, by pulling it from `GET /api/profile/{email}` first.

---

### Autopilot (Full Pipeline)

```text
POST /api/orchestrate/run
```

Request:

```json
{
  "email": "candidate@example.com",
  "job_title": "Backend Engineer",
  "skills": null,
  "selected_job": null
}
```

Provide either `job_title` (search fresh) or `selected_job` (skip straight to matching, e.g. a job picked in Job Hunter). Returns the matched job, resume analysis, interview prep, cold email draft, and a list of any per-stage errors.

---

### Job Discovery

```text
POST /api/scrape
```

Request:

```json
{
  "email": "candidate@example.com",
  "query": "Java Backend Developer",
  "skills": null
}
```

`skills` is optional. If omitted, the Job Hunter agent infers what's relevant to the searched role itself instead of using a fixed list. The request is processed by the Job Hunter agent and Tavily web search.

---

### Resume Analysis

```text
POST /api/analyze-resume
```

Accepts:

* Resume PDF.
* Job description.

Returns:

* ATS score.
* Missing keywords.
* Summary critique.
* Optimized bullet points.

---

### Interview Preparation

```text
POST /api/interview-prep
```

Accepts:

* Resume PDF.
* Job description.

Returns:

* Technical questions.
* Behavioral questions.
* Sample STAR answers.
* Interview tips.

---

### Cold Email Generation

```text
POST /api/generate-email
```

Accepts:

* Resume PDF.
* Job description.
* Company name.
* Recruiter name.

Returns:

* Subject line.
* Email body.
* Explanation of the selected outreach strategy.

---

### Video Analysis

```text
POST /api/analyze-video
```

Accepts:

* Interview video.

Returns:

* Communication score.
* General feedback.
* Filler-word assessment.
* Improvement recommendations.

---

# Agent Architecture

Each career workflow is implemented as a specialized CrewAI agent.

```text
                    Career Intelligence Platform
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        Job Hunter       Resume Optimizer   Interview Coach
             │                │                │
          Tavily             Resume + JD      Resume + JD
             │                │                │
             └────────────────┼────────────────┘
                              │
                              ▼
                         Groq Llama
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        Cold Email        Video Coach       Recommendations
```

The agents use structured Pydantic output models where appropriate, allowing the FastAPI layer to return predictable JSON responses to the frontend.

---

# Resume Analysis Pipeline

```text
Resume PDF
    │
    ▼
PyPDF2
    │
    ▼
Extracted Resume Text
    │
    ├───────────────┐
    │               │
    ▼               ▼
Resume Content   Job Description
    │               │
    └───────┬───────┘
            ▼
    Resume Optimization Agent
            │
            ▼
     ATS / Skill Analysis
            │
      ┌─────┼─────┐
      ▼     ▼     ▼
    Score  Gaps  Rewrite
```

---

# Video Analysis Pipeline

```text
Video Upload
     │
     ▼
MoviePy
     │
     ▼
Audio Extraction
     │
     ▼
Groq Whisper
     │
     ▼
Interview Transcript
     │
     ▼
Communication Coach Agent
     │
     ▼
Structured Feedback
```

---

# Autopilot Pipeline (LangGraph)

```text
                          load_profile
                               │
               ┌───────────────┴───────────────┐
        job already picked?              no job picked yet
               │                                │
               ▼                                ▼
        analyze_resume ◄──── pick_job ◄──── hunt_jobs
               │
               ▼
         prep_interview
               │
               ▼
          draft_email
```

Built and compiled in `backend/graph/workflows.py`. Every node in `backend/graph/nodes.py` wraps an existing crew — no new AI behavior, just chaining the existing steps. If any stage fails, it's recorded in the response's `errors` list and the graph stops there rather than continuing into a stage that would likely fail too (e.g. hitting the same rate limit twice in a row).

---

# Reliability & Rate Limits

Groq occasionally rate-limits requests, and the model available to a given API key can change over time. The project handles this in a few places:

* **Retry with backoff** — every crew's `LLM(...)` is configured with `additional_params={"num_retries": 3}` and a `timeout`, forwarded straight to `litellm`, which auto-retries on 429s before giving up.
* **A fixed graph edge** — `prep_interview → draft_email` used to be unconditional, so a rate limit on interview prep didn't stop the email draft from immediately hitting the same limit. It's now a conditional edge like every other stage.
* **Proper HTTP status codes** — `app/utils.py`'s `is_rate_limit_error()` detects rate-limit errors by message content (since Groq/litellm/instructor wrap them in different exception classes) and every route returns `429` with a clear message instead of a raw `500` stack trace.
* **Spaced-out Autopilot calls** — Autopilot fires up to 4 LLM calls in one request, which alone can trip a per-minute limit. A short delay between stages spreads the calls out.
* **Model not found ≠ rate limit** — if you see `model_not_found` rather than a rate-limit error, that's a different issue: Groq has deprecated the hardcoded model string. Check `console.groq.com/docs/models` (or list models via the Groq client) for what's currently available on your account, and update the `model="groq/..."` string in the 5 files under `backend/agents/`.

---

# Security & Configuration

API keys should **never be committed to Git**.

The `.env` file should remain local and be included in `.gitignore`.

Example:

```env
GROQ_API_KEY=...
TAVILY_API_KEY=...
MONGO_URL=...
```

Also gitignore the auto-created SQLite profile database:

```gitignore
backend/app/career_agent.db
```

For deployment, configure these values using the hosting platform's environment-variable system rather than committing credentials to the repository.

---

# Development

Run the frontend development server:

```bash
cd frontend
npm run dev
```

Run the backend:

```bash
cd backend
python app/main.py
```

Build the frontend for production:

```bash
cd frontend
npm run build
```

Preview the production frontend build:

```bash
npm run preview
```

Run frontend linting:

```bash
npm run lint
```

---

# Future Improvements

Done since this section was first written: candidate profiles (SQLite-backed, reused across modules), LangGraph orchestration for the full pipeline, and rate-limit-aware retries/error handling.

Potential extensions still open:

* Persistent user authentication (the current profile is keyed by a plain email string, not a login).
* Job recommendation ranking based on candidate profiles.
* Automated job tracking and application history (a run-history log tied to each profile).
* Resume version management for multiple job roles.
* LinkedIn/GitHub profile analysis.
* Interview session history and performance tracking.
* Retrieval-Augmented Generation — worth adding once a profile holds multiple resumes/cover letters/saved jobs; a single resume already fits in one prompt, so RAG isn't needed yet.
* Background job processing for long-running AI tasks (Autopilot currently runs synchronously within the request).
* Automated test coverage (currently none).
* Containerized deployment using Docker.
* Production deployment with authentication, rate limiting, and observability.

---

# Disclaimer

AI-generated job recommendations, resume feedback, interview questions, and communication analysis should be treated as assistance rather than authoritative career advice. Job listings and external links may change or become unavailable.