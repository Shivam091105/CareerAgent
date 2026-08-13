# AI-Powered Career Intelligence Platform

An AI-powered career intelligence platform that helps job seekers streamline the job search and interview process through specialized AI agents.

The platform combines **job discovery, resume analysis, interview preparation, recruiter outreach, and interview communication analysis** into a single web application powered by **CrewAI, Groq LLMs, FastAPI, and React**.

---

## Overview

The **AI-Powered Career Intelligence Platform** uses specialized AI agents to automate repetitive career-development workflows.

Instead of relying on a single general-purpose chatbot, the system separates responsibilities across task-specific agents:

* **Job Hunter Agent** - discovers relevant job opportunities using web search.
* **Resume Optimization Agent** - evaluates a resume against a job description and identifies ATS gaps.
* **Interview Preparation Agent** - generates role-specific technical and behavioral interview questions.
* **Cold Email Agent** - generates personalized recruiter outreach emails.
* **Video Coach Agent** - transcribes mock interview recordings and evaluates communication skills.

The backend exposes these capabilities through REST APIs, while the React frontend provides an interactive interface for each workflow.

---

## Key Features

### 1. AI Job Discovery

Search for relevant job opportunities using natural-language job queries.

The Job Hunter agent:

* Searches the web using Tavily.
* Identifies relevant job listings.
* Extracts company, role, location, application link, and summary.
* Uses the candidate's skills to improve relevance.

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

---

## System Architecture

```text
                         ┌─────────────────────────┐
                         │      React Frontend     │
                         │   Vite + Tailwind CSS   │
                         └────────────┬────────────┘
                                      │
                                      │ REST API
                                      ▼
                         ┌─────────────────────────┐
                         │      FastAPI Backend    │
                         │                         │
                         │   API /api/... routes   │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
      ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
      │  Job Hunter   │       │ Resume Agent  │       │ Interview     │
      │    Agent      │       │               │       │ Coach Agent   │
      └───────┬───────┘       └───────────────┘       └───────────────┘
              │
              ▼
         Tavily Search

              ┌───────────────────────┬───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
      ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
      │ Cold Email    │       │ Video Coach   │       │ PDF Processing │
      │ Agent         │       │ Agent         │       │   / MongoDB    │
      └───────┬───────┘       └───────┬───────┘       └───────────────┘
              │                       │
              │                       ▼
              │                Groq Whisper
              │
              └───────────────┬────────────────
                              ▼
                       Groq Llama 3.3
```

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
* **Groq**
* **Llama 3.3 70B**
* **Whisper Large V3**

### External Services

* **Tavily** — web search and job discovery
* **Groq API** — LLM inference and speech transcription

### Database

* **MongoDB**
* **Motor**

> MongoDB integration is included in the backend for user profiles and history, but the current API workflows primarily operate directly on request data.

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
│   │   └── reviewer_crew.py
│   │
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   └── dependencies.py
│   │
│   ├── graph/
│   │   ├── nodes.py
│   │   ├── state.py
│   │   └── workflows.py
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
│   │   │   └── Sidebar.jsx
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

---

# API Endpoints

| Endpoint              | Method | Purpose                              |
| --------------------- | ------ | ------------------------------------ |
| `/api/scrape`         | POST   | Search for relevant jobs             |
| `/api/analyze-resume` | POST   | Analyze resume against a JD          |
| `/api/interview-prep` | POST   | Generate interview preparation       |
| `/api/generate-email` | POST   | Generate recruiter outreach email    |
| `/api/analyze-video`  | POST   | Analyze mock interview communication |

---

## API Workflow

### Job Discovery

```text
POST /api/scrape
```

Request:

```json
{
  "email": "candidate@example.com",
  "query": "Java Backend Developer"
}
```

The request is processed by the Job Hunter agent and Tavily web search.

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

# Security & Configuration

API keys should **never be committed to Git**.

The `.env` file should remain local and be included in `.gitignore`.

Example:

```env
GROQ_API_KEY=...
TAVILY_API_KEY=...
MONGO_URL=...
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

Potential extensions include:

* Persistent user authentication and profiles.
* Job recommendation ranking based on candidate profiles.
* Automated job tracking and application history.
* Resume version management for multiple job roles.
* LinkedIn/GitHub profile analysis.
* Interview session history and performance tracking.
* Retrieval-Augmented Generation for personalized career recommendations.
* Agent orchestration using LangGraph for multi-step workflows.
* Background job processing for long-running AI tasks.
* Containerized deployment using Docker.
* Production deployment with authentication, rate limiting, and observability.

---

# Disclaimer

AI-generated job recommendations, resume feedback, interview questions, and communication analysis should be treated as assistance rather than authoritative career advice. Job listings and external links may change or become unavailable.

