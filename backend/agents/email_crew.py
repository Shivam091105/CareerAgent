import os
from typing import List
from pydantic import BaseModel, Field
from crewai import Agent, Crew, Process, Task, LLM
from dotenv import load_dotenv

load_dotenv()

# --- Output Schema ---
class ColdEmail(BaseModel):
    subject_line: str = Field(..., description="A catchy, non-spammy subject line (under 7 words).")
    email_body: str = Field(..., description="The full email content (under 150 words).")
    explanation: str = Field(..., description="Why this angle was chosen based on the JD.")

class EmailCrew:
    """Cold Email Outreach Crew - Manual Setup"""

    def __init__(self):
        # Using Groq for speed and persuasive writing capabilities
        self.llm = LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.7 # Higher temp for creativity
        )

    def kickoff(self, inputs):
        # 1. Define Agent
        copywriter_agent = Agent(
            role='Expert Career Copywriter',
            goal='Write high-conversion cold emails that get candidates interviews.',
            backstory=(
                "You are a master of 'Direct Response' copywriting. "
                "You know that recruiters are busy and hate long, generic emails. "
                "Your goal is to write emails that hook the reader in the first sentence, "
                "prove value immediately, and end with a low-friction call to action."
            ),
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )

        # 2. Define Task
        email_task = Task(
            description=(
                "1. Analyze the Job Description to find the #1 biggest problem the company needs solved.\n"
                "2. Scan the Resume to find the single most relevant achievement that solves that problem.\n"
                "3. Write a Cold Email to {recipient_name} at {company_name}.\n"
                "   - Constraints: Under 150 words. No fluff. Casual but professional tone.\n"
                "   - Structure: Hook (acknowledge their need) -> Value (proof I can fix it) -> Ask (chat availability).\n\n"
                "Job Description:\n{job_description}\n\n"
                "Resume Text:\n{resume_text}"
            ),
            expected_output="A structured JSON with subject line, body, and strategy explanation.",
            agent=copywriter_agent,
            output_pydantic=ColdEmail
        )

        # 3. Create Crew
        crew = Crew(
            agents=[copywriter_agent],
            tasks=[email_task],
            process=Process.sequential,
            verbose=True
        )

        return crew.kickoff(inputs=inputs)

