from typing import Annotated, List, Dict, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    # Standard chat history
    messages: Annotated[List, add_messages]
    # Persistent user data (Skills, Resume text)
    user_profile: Dict
    # Data gathered from Scrapers or Prep tools
    context_data: List[Dict]
    # Tracking current UI module: "scraper", "resume", "prep", "email", "video"
    active_module: str
    # Human-in-the-loop approval status
    is_approved: bool