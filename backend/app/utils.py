"""
Small helpers shared between the FastAPI routes (main.py) and the LangGraph
pipeline (graph/nodes.py). Pulled out on their own so graph/nodes.py can
reuse them without importing main.py (which would create a circular import,
since main.py also needs to import the graph module to expose it as a route).
"""
import io
import json
import ast
from PyPDF2 import PdfReader


def is_rate_limit_error(exc: Exception) -> bool:
    """
    Best-effort detection of a rate-limit error coming back from
    Groq/litellm/instructor. These libraries wrap the underlying HTTP
    error in different exception classes depending on which layer catches
    it first (litellm.RateLimitError, instructor.InstructorRetryException,
    etc.), so checking the error text is more reliable than checking a
    specific exception type.
    """
    text = str(exc).lower()
    return "rate limit" in text or "ratelimiterror" in text or " 429" in text or "429 " in text


def parse_agent_output(output):
    """
    Converts a CrewAI TaskOutput (which might be a Pydantic model, JSON
    string, or Python-literal string) into a plain dict/list for JSON
    responses.
    """
    # 1. If it's already a Pydantic object, dump it
    if hasattr(output, 'pydantic') and output.pydantic:
        return output.pydantic.model_dump()

    # 2. Get the raw string content
    content = output.raw if hasattr(output, 'raw') else str(output)

    # 3. Try parsing as standard JSON
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 4. Try parsing as a Python literal (handles single-quoted dicts)
    try:
        return ast.literal_eval(content)
    except (ValueError, SyntaxError):
        pass

    # 5. Fallback: return the raw string wrapped in a dict
    return {"raw_output": content}


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extracts all text from a PDF's raw bytes.
    Guards against pages that return None (e.g. scanned/image-only pages),
    which previously crashed the app with a TypeError on string concatenation.
    """
    pdf_reader = PdfReader(io.BytesIO(content))
    resume_text = ""
    for page in pdf_reader.pages:
        resume_text += page.extract_text() or ""
    return resume_text