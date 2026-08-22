import os
from crewai import Agent, Crew, Process, Task, LLM
from crewai.tools import tool
from tools.tavily_search import tavily_search
from dotenv import load_dotenv

load_dotenv(override=True)

# --- 1. Define Native CrewAI Tool ---
@tool("Web Search")
def web_search(query: str):
    """
    Useful for searching job listings online.
    Input should be a search query string.
    Returns a list of search results.
    """
    results = tavily_search.invoke(query)

    # Aggressively trim results to keep token count low
    if isinstance(results, list):
        for r in results:
            if isinstance(r, dict) and "content" in r and isinstance(r["content"], str):
                r["content"] = r["content"][:200]
    return results

class JobHunterCrew:
    """Job Hunter Crew - Manual Setup (Powered by Groq)"""

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is missing in .env file")

        self.llm = LLM(
            model="groq/openai/gpt-oss-120b",
            api_key=api_key,
            temperature=0,
            timeout=60,
            additional_params={"num_retries": 3}
        )

    async def kickoff(self, inputs):
        job_title = inputs.get('job_title', '')
        user_skills = inputs.get('skills')

        if user_skills:
            skill_list = [s.strip() for s in user_skills.split(",") if s.strip()]
            trimmed_skills = ", ".join(skill_list[:5])
            skills_instruction = f"these key skills: {trimmed_skills}"
        else:
            skills_instruction = f"skills typical for a '{job_title}' role"

        # 2. Define Agent — keep backstory minimal to save tokens
        hunter_agent = Agent(
            role='Job Scout',
            goal=f"Find 3 relevant {job_title} job listings matching {skills_instruction}.",
            backstory=(
                "You find job listings using Web Search. "
                "ONLY use the Web Search tool provided. "
                "Do NOT use any other tool. "
                "If no jobs found, return an empty list."
            ),
            tools=[web_search],
            llm=self.llm,
            verbose=True,
            allow_delegation=False,
            max_iter=3,
            max_tier=2
        )

        # 3. Define Task — concise description to cut input tokens
        search_task = Task(
            description=(
                f"Find 3 active '{job_title}' job listings matching {skills_instruction}. "
                "For each job return company, role, link, and a one-line summary."
            ),
            expected_output="A JSON list of objects with keys: company, role, link, summary.",
            agent=hunter_agent
        )

        # 4. Create Crew
        crew = Crew(
            agents=[hunter_agent],
            tasks=[search_task],
            process=Process.sequential,
            verbose=True
        )

        return await crew.kickoff_async(inputs=inputs)