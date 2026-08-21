import os
from crewai import Agent, Crew, Process, Task, LLM
from crewai.tools import tool
from tools.tavily_search import tavily_search
from dotenv import load_dotenv

load_dotenv()

# --- 1. Define Native CrewAI Tool ---
@tool("Web Search")
def web_search(query: str):
    """
    Useful for searching job listings online.
    Input should be a search query string.
    Returns a list of search results.
    """
    return tavily_search.invoke(query)

class JobHunterCrew:
    """Job Hunter Crew - Manual Setup (Powered by Groq)"""

    def __init__(self):
        # --- SWITCHED TO GROQ ---
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is missing in .env file")

        self.llm = LLM(
            model="groq/openai/gpt-oss-120b",
            api_key=api_key,
            temperature=0,
            timeout=60,
            max_completion_tokens=900,
            additional_params={"num_retries": 3}
        )

    async def kickoff(self, inputs):
        job_title = inputs.get('job_title', '')
        user_skills = inputs.get('skills')

        if user_skills:
            skills_instruction = f"the user's specific skill set: {user_skills}"
        else:
            skills_instruction = (
                f"the skills and qualifications that are typically required "
                f"for a '{job_title}' role. First think about what a "
                f"'{job_title}' actually needs (these may be technical, "
                f"medical, creative, managerial, etc. — do not assume a "
                f"tech role), then use those as your search filters."
            )

        # 2. Define Agent Manually
        hunter_agent = Agent(
            role='Senior Technical Talent Scout',
            goal=f"Find the most relevant {job_title} roles that match {skills_instruction}.",
            backstory=(
                "You are an expert at navigating job boards across every industry, "
                "not just tech. You adapt your search strategy to whatever role "
                "you're given. "
                "IMPORTANT: You ONLY use the tools provided to you (Web Search). "
                "Do NOT attempt to use 'brave_search', 'google_search', or any other tool. "
                "If you cannot find jobs, simply return an empty list."
            ),
            tools=[web_search],
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )

        # 3. Define Task Manually
        search_task = Task(
            description=(
                f"Search for exactly 3 active job listings for '{job_title}'. "
                f"Focus on {skills_instruction} "
                "Identify the company name, location, and application link."
            ),
            expected_output="A list of dictionaries containing 'company', 'role', 'link', and 'summary'.",
            agent=hunter_agent
        )

        # 4. Create Crew Manually
        crew = Crew(
            agents=[hunter_agent],
            tasks=[search_task],
            process=Process.sequential,
            verbose=True
        )

        # job_title/skills are already baked into the prompts above via
        # f-strings, so we no longer need CrewAI's {placeholder} substitution
        # here — but kickoff_async still accepts inputs harmlessly.
        return await crew.kickoff_async(inputs=inputs)