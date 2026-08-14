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
            model="groq/llama-3.3-70b-versatile",
            api_key=api_key,
            temperature=0
        )

    async def kickoff(self, inputs):
        # 2. Define Agent Manually
        hunter_agent = Agent(
            role='Senior Technical Talent Scout',
            goal='Find the most relevant {job_title} roles that match the user\'s skill set: {skills}.',
            backstory=(
                "You are an expert at navigating job boards. "
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
                "Search for exactly 5 active job listings for {job_title}. "
                "Focus on these specific requirements: {skills}. "
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

        return await crew.kickoff_async(inputs=inputs)
