import os
from dotenv import load_dotenv
from langchain_community.tools.tavily_search import TavilySearchResults

load_dotenv(override=True)

# Optimized Search Tool for Free Tier LLMs
tavily_search = TavilySearchResults(
    max_results=2,
    search_depth="basic",
    include_answer=False,          # Don't waste tokens on Tavily's AI summary
    include_raw_content=False,     # CRITICAL: prevent massive payloads
    include_images=False,
)