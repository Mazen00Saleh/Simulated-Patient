"""api.routes.admin

Admin endpoints:
  GET  /api/v1/admin/sessions         — list all sessions with summary info
  GET  /api/v1/admin/sessions/{id}    — full session: messages + evaluations
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from api.database import _sessions, _messages, _evaluations

router = APIRouter(prefix="/admin", tags=["Admin"])


def _serialize(doc: dict) -> dict:
    """Convert MongoDB doc to a JSON-safe dict (stringify datetimes, remove _id)."""
    out = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


@router.get("/sessions")
def list_sessions():
    """Return all sessions ordered newest first, with a message count."""
    sessions = list(
        _sessions().find({}, {"_id": 0}).sort("created_at", -1)
    )
    result = []
    for s in sessions:
        sid = s.get("session_id")
        msg_count = _messages().count_documents(
            {"session_id": sid, "role": {"$ne": "system"}}
        )
        has_trainee_eval = _evaluations().count_documents(
            {"session_id": sid, "eval_type": "trainee"}
        ) > 0
        row = _serialize(s)
        row["message_count"] = msg_count
        row["has_trainee_eval"] = has_trainee_eval
        result.append(row)
    return result


@router.get("/sessions/{session_id}")
def get_session_detail(session_id: str):
    """Return full session details: metadata, conversation history, and evaluations."""
    session = _sessions().find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    messages = list(
        _messages().find(
            {"session_id": session_id},
            {"_id": 0, "role": 1, "content": 1, "created_at": 1},
            sort=[("created_at", 1)],
        )
    )

    evaluations = list(
        _evaluations().find(
            {"session_id": session_id},
            {"_id": 0},
            sort=[("created_at", 1)],
        )
    )

    return {
        "session": _serialize(session),
        "messages": [_serialize(m) for m in messages],
        "evaluations": [_serialize(e) for e in evaluations],
    }
