from agents.hunter_crew import JobHunterCrew


def run_scraper_node(state: dict):
    # Extract inputs
    user_skills = state.get("user_profile", {}).get("skills", [])
    last_message = state.get("messages")[-1]
    user_query = last_message["content"] if isinstance(last_message, dict) else last_message.content

    inputs = {
        "job_title": user_query,
        "skills": ", ".join(user_skills) if user_skills else "General Tech"
    }

    print(f"🚀 Kicking off Scraper Crew with inputs: {inputs}")
    crew_instance = JobHunterCrew().crew()
    result = crew_instance.kickoff(inputs=inputs)

    # --- THE FIX: Extract data from Pydantic model ---
    if hasattr(result, 'pydantic') and result.pydantic:
        # If output_pydantic was successful
        final_data = result.pydantic.dict()
    elif hasattr(result, 'json_dict') and result.json_dict:
        # Fallback for json outputs
        final_data = result.json_dict
    else:
        # Fallback for raw string
        final_data = {"jobs": [], "raw_output": str(result)}

    return {"retrieved_info": final_data}