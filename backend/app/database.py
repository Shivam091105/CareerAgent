import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.career_os_db

# Collections
users_collection = db.users
history_collection = db.chat_history

# User Profile Schema
class UserProfile(BaseModel):
    name: str
    email: str
    skills: List[str] = []
    experience: List[Dict] = []
    projects: List[Dict] = []
    resume_text: Optional[str] = None
    preferences: Dict = Field(default_factory=dict)

# DB Helper Functions
async def get_user_profile(email: str):
    return await users_collection.find_one({"email": email})

async def save_user_profile(profile_data: dict):
    return await users_collection.update_one(
        {"email": profile_data["email"]},
        {"$set": profile_data},
        upsert=True
    )