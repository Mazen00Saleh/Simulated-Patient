"""api.routes.admin

Admin endpoints:
  GET  /api/v1/admin/sessions         — list all sessions with summary info
  GET  /api/v1/admin/sessions/{id}    — full session: messages + evaluations
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from api.database import _sessions, _messages, _evaluations, _cases, _db, get_analytics_data, _serialize

router = APIRouter(prefix="/admin", tags=["Admin"])


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
    """Return full session details: metadata, conversation history, evaluations, and case data."""
    session = _sessions().find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    case_id = session.get("case_id")
    case = None
    if case_id:
        case = _cases().find_one({"case_id": case_id}, {"_id": 0})

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
        "case": _serialize(case) if case else None,
    }


@router.get("/analytics")
def analytics():
    """Return aggregated analytics data for the admin dashboard."""
    return get_analytics_data()
