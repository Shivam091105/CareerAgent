import os
from typing import List
from pydantic import BaseModel, Field
from crewai import Agent, Crew, Process, Task, LLM
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# --- Output Schema ---
class SoftSkillAnalysis(BaseModel):
    score: int = Field(..., description="Overall soft skill score out of 100.")
    feedback: str = Field(..., description="General feedback on the delivery.")
    filler_words_count: str = Field(..., description="Estimate of filler words usage (High/Medium/Low).")
    improvements: List[str] = Field(..., description="3 specific actionable tips to improve.")

class VideoCrew:
    """Soft Skill Analysis Crew"""

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.llm = LLM(
            model="groq/openai/gpt-oss-120b",
            api_key=self.api_key,
            temperature=0.3,
            timeout=60,
            additional_params={"num_retries": 3}
        )
        self.client = Groq(api_key=self.api_key)

    # def transcribe_audio(self, audio_path):
    #     """Uses Groq's Whisper model to transcribe audio fast."""
    #     with open(audio_path, "rb") as file:
    #         transcription = self.client.audio.transcriptions.create(
    #             file=(audio_path, file.read()),
    #             model="distil-whisper-large-v3-en",
    #             response_format="json",
    #             language="en",
    #             temperature=0.0
    #         )
    #     return transcription.text

    def transcribe_audio(self, audio_path):
        """Uses Groq's Whisper model to transcribe audio fast."""
        with open(audio_path, "rb") as file:
            transcription = self.client.audio.transcriptions.create(
                file=(audio_path, file.read()),
                model="whisper-large-v3",  # <--- UPDATED MODEL NAME
                response_format="json",
                language="en",
                temperature=0.0
            )
        return transcription.text

    def kickoff(self, audio_path):
        # 1. Transcribe first (Not an agent task, just a tool step)
        print("🎙️ Transcribing audio...")
        transcript = self.transcribe_audio(audio_path)
        print(f"📝 Transcript: {transcript[:50]}...")

        # 2. Define Agent
        coach_agent = Agent(
            role='Communication Coach',
            goal='Analyze speech transcripts for soft skills, confidence, and clarity.',
            backstory=(
                "You are a speech pathologist and executive communication coach. "
                "You listen to candidates' answers and evaluate them on clarity, "
                "conciseness, and confidence. You hate filler words and rambling."
            ),
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )

        # 3. Define Task
        analysis_task = Task(
            description=(
                "Analyze the following interview transcript:\n"
                f"'{transcript}'\n\n"
                "Evaluate for:\n"
                "1. Clarity and Structure (Did they get to the point?)\n"
                "2. Filler Words (Um, like, you know)\n"
                "3. Tone (Confident vs. Hesitant)\n"
                "Provide a score (0-100) and 3 specific improvement tips."
            ),
            expected_output="A structured analysis of the candidate's speech.",
            agent=coach_agent,
            output_pydantic=SoftSkillAnalysis
        )

        # 4. Create Crew
        crew = Crew(
            agents=[coach_agent],
            tasks=[analysis_task],
            process=Process.sequential,
            verbose=True
        )

        return crew.kickoff()