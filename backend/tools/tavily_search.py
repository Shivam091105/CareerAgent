import os
from dotenv import load_dotenv
from langchain_community.tools.tavily_search import TavilySearchResults

load_dotenv()

# Optimized Search Tool for Free Tier LLMs
tavily_search = TavilySearchResults(
    max_results=2,             # Reduced from 5 to 3 to save tokens
    # search_depth="advanced",
    search_depth="basic",  # Basic search is faster and uses fewer tokens
    include_answer=True,
    include_raw_content=False, # CRITICAL: Set to False to prevent massive payloads
    include_images=False,
)