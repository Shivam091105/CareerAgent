"""
Wires the nodes in graph/nodes.py into an actual LangGraph StateGraph.

This is the piece that was missing before: `graph/state.py` had a state
shape and `graph/nodes.py` had (a broken) node, but nothing ever built a
StateGraph out of them, and nothing in main.py imported this module — so
LangGraph sat in requirements.txt doing nothing.

Pipeline shape:

    START
      |
      v
    load_profile ----(no resume saved)----> END
      |
      | (resume loaded)
      v
    [job already selected?] --yes--> analyze_resume
      |no
      v
    hunt_jobs ----(no jobs found)----> END
      |
      v
    pick_job
      |
      v
    analyze_resume ----(analysis failed)----> END
      |
      v
    prep_interview ----(prep failed)----> END
      |
      v
    draft_email
      |
      v
     END

The branch right after `load_profile` is the actual payoff of using a graph
here instead of five sequential function calls: a job picked via the Job
Hunter's "Prep interview" / "Draft email" buttons (Task 2's job context
bridge) skips straight to `analyze_resume`, while a fresh run from a bare
job title goes through `hunt_jobs` -> `pick_job` first. Both paths converge
on the same downstream nodes.
"""
from langgraph.graph import StateGraph, START, END

from graph.state import PipelineState
from graph.nodes import (
    load_profile_node,
    hunt_jobs_node,
    pick_job_node,
    analyze_resume_node,
    prep_interview_node,
    draft_email_node,
)


def _ok_or_stop(state: PipelineState) -> str:
    return "stop" if state.get("errors") else "continue"


def _route_after_profile(state: PipelineState) -> str:
    if state.get("errors"):
        return "stop"
    if state.get("selected_job"):
        return "has_job"
    return "need_job"


def build_pipeline_graph():
    graph = StateGraph(PipelineState)

    graph.add_node("load_profile", load_profile_node)
    graph.add_node("hunt_jobs", hunt_jobs_node)
    graph.add_node("pick_job", pick_job_node)
    graph.add_node("analyze_resume", analyze_resume_node)
    graph.add_node("prep_interview", prep_interview_node)
    graph.add_node("draft_email", draft_email_node)

    graph.add_edge(START, "load_profile")

    graph.add_conditional_edges("load_profile", _route_after_profile, {
        "stop": END,
        "has_job": "analyze_resume",
        "need_job": "hunt_jobs",
    })

    graph.add_conditional_edges("hunt_jobs", _ok_or_stop, {
        "continue": "pick_job",
        "stop": END,
    })

    graph.add_edge("pick_job", "analyze_resume")

    graph.add_conditional_edges("analyze_resume", _ok_or_stop, {
        "continue": "prep_interview",
        "stop": END,
    })

    graph.add_conditional_edges("prep_interview", _ok_or_stop, {
        "continue": "draft_email",
        "stop": END,
    })

    graph.add_edge("draft_email", END)

    return graph.compile()


# Compiled once at import time and reused for every request — building the
# graph is cheap but there's no reason to redo it on every call.
_compiled_graph = build_pipeline_graph()


async def run_pipeline(inputs: dict) -> dict:
    """
    Runs the full autopilot pipeline end to end and returns the final state
    as a plain dict. `inputs` should contain at least `email` and either
    `job_title` (to search fresh) or `selected_job` (to skip straight to
    matching against a job already picked in the UI).
    """
    initial_state: PipelineState = {
        "email": inputs.get("email", ""),
        "job_title": inputs.get("job_title", ""),
        "skills": inputs.get("skills"),
        "selected_job": inputs.get("selected_job"),
        "errors": [],
    }
    final_state = await _compiled_graph.ainvoke(initial_state)
    return final_state