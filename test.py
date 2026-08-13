import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

try:
    models = client.models.list()
    print(f"✅ Successfully connected! Here are your available models:\n")
    for model in models.data:
        print(f" - {model.id}")
except Exception as e:
    print(f"❌ Error fetching models: {e}")