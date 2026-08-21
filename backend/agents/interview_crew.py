import os
from typing import List
from pydantic import BaseModel, Field
from crewai import Agent, Crew, Process, Task, LLM
from dotenv import load_dotenv

load_dotenv()

# --- Output Schema ---
class InterviewQuestion(BaseModel):
    question: str = Field(..., description="The interview question.")
    context: str = Field(..., description="Why this question is being asked (e.g., 'Based on missing skill X').")
    sample_answer: str = Field(..., description="A strong, STAR-format answer key.")

class InterviewPrep(BaseModel):
    technical_questions: List[InterviewQuestion] = Field(..., description="5 technical questions based on the JD.")
    behavioral_questions: List[InterviewQuestion] = Field(..., description="3 behavioral questions based on resume gaps or culture.")
    tips: List[str] = Field(..., description="3 specific tips to ace this specific interview.")

class InterviewCrew:
    """Interview Prep Crew - Manual Setup"""

    def __init__(self):
        # Using Groq for speed
        self.llm = LLM(
            model="groq/openai/gpt-oss-120b",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.2,
            timeout=60,
            additional_params={"num_retries": 3}
        )

    def kickoff(self, inputs):
        # 1. Define Agent
        coach_agent = Agent(
            role='Senior Tech Hiring Manager',
            goal='Prepare the candidate for a specific job interview by generating targeted, high-stakes questions.',
            backstory=(
                "You are a strict but helpful hiring manager at a top tech company. "
                "You analyze job descriptions and resumes to find weak spots. "
                "You want to test if the candidate truly knows the skills they claim, "
                "and if they can handle the requirements they lack."
            ),
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )

        # 2. Define Task
        prep_task = Task(
            description=(
                "1. Analyze the provided Job Description (JD) and Candidate Resume.\n"
                "2. Identify technical skills in the JD that are weak or missing in the Resume.\n"
                "3. Generate 5 Technical Questions specifically targeting those weak spots.\n"
                "4. Generate 3 Behavioral Questions based on the role's seniority.\n"
                "5. Provide a 'model answer' for each using the STAR method.\n\n"
                "Job Description:\n{job_description}\n\n"
                "Resume Text:\n{resume_text}"
            ),
            expected_output="A structured interview preparation guide with questions and answers.",
            agent=coach_agent,
            output_pydantic=InterviewPrep
        )

        # 3. Create Crew
        crew = Crew(
            agents=[coach_agent],
            tasks=[prep_task],
            process=Process.sequential,
            verbose=True
        )

        return crew.kickoff(inputs=inputs)