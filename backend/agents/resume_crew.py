import os
from typing import List
from pydantic import BaseModel, Field
from crewai import Agent, Crew, Process, Task, LLM
from dotenv import load_dotenv

load_dotenv(override=True)

# --- Output Schema ---
class ResumeAnalysis(BaseModel):
    ats_score: int = Field(..., description="A score from 0-100 based on keyword matching.")
    missing_keywords: List[str] = Field(..., description="List of important keywords found in JD but missing in Resume.")
    summary_critique: str = Field(..., description="Critique of the professional summary.")
    bullet_points_optimization: List[str] = Field(..., description="Rewrite 3 resume bullet points to include keywords from the JD.")

class ResumeCrew:
    """Resume Optimization Crew - Manual Setup"""

    def __init__(self):
        # 1. Setup LLM
        self.llm = LLM(
            model="groq/openai/gpt-oss-120b",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0,
            timeout=60,
            additional_params={"num_retries": 3}
        )

    def kickoff(self, inputs):
        # 2. Define Agent Manually
        ats_agent = Agent(
            role='Senior ATS Resume Optimizer',
            goal='Analyze a resume against a job description to calculate an ATS match score.',
            backstory='You are a former recruiter who knows exactly how Applicant Tracking Systems (ATS) work. You are strict about keyword matching.',
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )

        # 3. Define Task Manually
        analysis_task = Task(
            description=(
                "1. Read the provided Resume Text.\n"
                "2. Read the provided Job Description (JD).\n"
                "3. Identify every hard skill and tool mentioned in the JD.\n"
                "4. Check if those skills exist in the Resume Text.\n"
                "5. Calculate an ATS Score (0-100).\n"
                "6. Rewrite 3 bullet points to include missing keywords.\n\n"
                "Resume Text:\n{resume_text}\n\n"
                "Job Description:\n{job_description}"
            ),
            expected_output="A structured analysis containing the score, missing keywords, and rewritten bullet points.",
            agent=ats_agent,
            output_pydantic=ResumeAnalysis # Structured Output
        )

        # 4. Create Crew Manually
        crew = Crew(
            agents=[ats_agent],
            tasks=[analysis_task],
            process=Process.sequential,
            verbose=True
        )

        return crew.kickoff(inputs=inputs)