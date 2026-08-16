"""
Profile store — Task 1 of the orchestration work.

Keeps one resume per user (keyed by email, since the app has no real auth
yet) so every other module can pull the resume instead of asking the user
to re-upload a PDF each time.

Uses plain sqlite3 from the standard library — no new dependency, no
server to run, and it's a five-minute swap to Mongo/Postgres later if the
app grows real user accounts.
"""
import sqlite3
import os
from datetime import datetime, timezone
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "career_agent.db")


@contextmanager
def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create the profiles table if it doesn't exist yet. Call once on startup."""
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                email TEXT PRIMARY KEY,
                resume_text TEXT NOT NULL DEFAULT '',
                filename TEXT,
                updated_at TEXT NOT NULL
            )
        """)


def get_profile(email: str) -> dict | None:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT email, resume_text, filename, updated_at FROM profiles WHERE email = ?",
            (email,)
        ).fetchone()
        return dict(row) if row else None


def upsert_profile(email: str, resume_text: str, filename: str | None = None) -> dict:
    """
    Creates the profile if it doesn't exist yet, otherwise overwrites it.
    `filename` is only updated when a new one is given (e.g. editing the
    text by hand shouldn't erase the record of which PDF it came from).
    """
    now = datetime.now(timezone.utc).isoformat()
    with _get_conn() as conn:
        existing = conn.execute("SELECT filename FROM profiles WHERE email = ?", (email,)).fetchone()
        final_filename = filename if filename is not None else (existing["filename"] if existing else None)
        conn.execute("""
            INSERT INTO profiles (email, resume_text, filename, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                resume_text = excluded.resume_text,
                filename = excluded.filename,
                updated_at = excluded.updated_at
        """, (email, resume_text, final_filename, now))
    return get_profile(email)


def delete_profile(email: str) -> bool:
    with _get_conn() as conn:
        cur = conn.execute("DELETE FROM profiles WHERE email = ?", (email,))
        return cur.rowcount > 0