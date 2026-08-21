"""
Shared state that flows through the LangGraph pipeline.

The original scaffold here (`messages` / `user_profile` / `active_module` /
`is_approved`) was designed for a generic chatbot and never matched what
this app actually does, which is why it was never wired up. This version
matches the real pipeline: profile -> job search -> resume match -> interview
prep -> cold email.

`total=False` means every field is optional — each node only needs to read
the fields earlier nodes actually filled in, and only writes the fields it's
responsible for. LangGraph merges each node's return dict into this state
automatically.
"""
from typing import List, Dict, Optional
from typing_extensions import TypedDict


class PipelineState(TypedDict, total=False):
    # --- inputs, provided by the caller ---
    email: str
    job_title: str
    skills: Optional[str]
    # If the frontend already has a job picked (Task 2's job context
    # bridge), pass it in here to skip straight to matching against it
    # instead of running a fresh search.
    selected_job: Optional[Dict]

    # --- filled in by load_profile_node ---
    resume_text: str

    # --- filled in by hunt_jobs_node / pick_job_node ---
    jobs: List[Dict]

    # --- filled in by analyze_resume_node / prep_interview_node / draft_email_node ---
    resume_analysis: Optional[Dict]
    interview_prep: Optional[Dict]
    cold_email: Optional[Dict]

    # --- bookkeeping ---
    # Any node that hits a problem appends a message here instead of
    # raising, so the graph can route to END cleanly and the caller still
    # gets back everything that *did* succeed.
    errors: List[str]