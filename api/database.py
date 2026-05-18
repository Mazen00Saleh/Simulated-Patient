"""api.database

MongoDB database handler.
Uses pymongo for all persistence. Connection URI is read from the
MONGODB_URI environment variable (falls back to localhost).

Collections:
    sessions     — one doc per simulation session
    messages     — conversation history
    evaluations  — patient / trainee evaluation results
"""

import json
import os
from datetime import datetime, timedelta, timezone

from pymongo import MongoClient, ASCENDING
from pymongo.collection import Collection

from src.utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

_MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
_DB_NAME = "simulated_patient"

_client: MongoClient | None = None


def _get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(_MONGODB_URI)
    return _client


def _db():
    return _get_client()[_DB_NAME]


def _sessions() -> Collection:
    return _db()["sessions"]


def _messages() -> Collection:
    return _db()["messages"]


def _evaluations() -> Collection:
    return _db()["evaluations"]


def _cases() -> Collection:
    return _db()["cases"]


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


# ---------------------------------------------------------------------------
# Init (creates indexes)
# ---------------------------------------------------------------------------

def init_db():
    """Create indexes so lookups by session_id are fast."""
    logger.info("Initializing MongoDB database")
    _sessions().create_index([("session_id", ASCENDING)], unique=True, background=True)
    _sessions().create_index([("user_id", ASCENDING)], background=True)
    _sessions().create_index([("case_id", ASCENDING)], background=True)
    _messages().create_index([("session_id", ASCENDING)], background=True)
    _messages().create_index([("created_at", ASCENDING)], background=True)
    _evaluations().create_index([("session_id", ASCENDING)], background=True)
    _evaluations().create_index([("created_at", ASCENDING)], background=True)
    _cases().create_index([("case_id", ASCENDING)], unique=True, background=True)
    logger.debug("Database indexes created successfully")


# ---------------------------------------------------------------------------
# Session CRUD
# ---------------------------------------------------------------------------

def save_session(session_id: str, condition: str, language: str, profile_json: str = None, case_id: str = None, user_id: str = None, duration_minutes: int = 15):
    """Insert a new session document with a known minute expiry."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=duration_minutes)
    
    logger.info(f"Session created: session_id={session_id!r}, condition={condition!r}, language={language!r}, case_id={case_id!r}, user_id={user_id!r}, duration={duration_minutes} minutes")
    
    doc = {
        "session_id": session_id,
        "condition": condition,
        "language": language,
        "created_at": now,
        "expires_at": expires_at,
        "profile": profile_json,  # raw JSON string or None
        "case_id": case_id,
        "user_id": user_id,
    }
    _sessions().insert_one(doc)


def get_session_info(session_id: str) -> dict | None:
    """Return the session document as a plain dict, or None."""
    doc = _sessions().find_one({"session_id": session_id}, {"_id": 0})
    if not doc:
        logger.warning(f"Session not found: {session_id!r}")
    return doc  # already a dict; expires_at is a datetime object


def get_session_profile(session_id: str):
    """Return a PatientProfile dataclass for a session, or None."""
    from src.patient_sim.interfaces import PatientProfile

    doc = _sessions().find_one(
        {"session_id": session_id},
        {"condition": 1, "language": 1, "profile": 1, "_id": 0},
    )
    if not doc or not doc.get("profile"):
        return None
    try:
        data = json.loads(doc["profile"])
        data.pop("condition", None)
        data.pop("language", None)
        return PatientProfile(
            condition=doc["condition"],
            language=doc["language"],
            **data,
        )
    except Exception:
        return None


def delete_session_data(session_id: str):
    """Remove a session and all its related messages and evaluations."""
    _messages().delete_many({"session_id": session_id})
    _evaluations().delete_many({"session_id": session_id})
    _sessions().delete_one({"session_id": session_id})


# ---------------------------------------------------------------------------
# Message CRUD
# ---------------------------------------------------------------------------

def add_message(session_id: str, role: str, content: str):
    """Append a message to the conversation history."""
    _messages().insert_one(
        {
            "session_id": session_id,
            "role": role,
            "content": content,
            "created_at": datetime.now(timezone.utc),
        }
    )


def get_session_history(session_id: str) -> list[dict]:
    """Return all messages for a session, ordered by creation time."""
    cursor = _messages().find(
        {"session_id": session_id},
        {"_id": 0, "role": 1, "content": 1},
        sort=[("created_at", ASCENDING)],
    )
    return [{"role": m["role"], "content": m["content"]} for m in cursor]


# ---------------------------------------------------------------------------
# Evaluation CRUD
# ---------------------------------------------------------------------------

def save_evaluation(session_id: str, eval_type: str, score_data: dict):
    """Persist an evaluation result."""
    _evaluations().insert_one(
        {
            "session_id": session_id,
            "eval_type": eval_type,
            "score_data": score_data,  # store as a real dict, not JSON string
            "created_at": datetime.now(timezone.utc),
        }
    )


def get_latest_trainee_eval(session_id: str) -> dict | None:
    """Return the most recent trainee evaluation score_data dict, or None."""
    doc = _evaluations().find_one(
        {"session_id": session_id, "eval_type": "trainee"},
        {"_id": 0, "score_data": 1},
        sort=[("created_at", -1)],
    )
    if not doc:
        return None
    return doc["score_data"]


# ---------------------------------------------------------------------------
# Timer helpers
# ---------------------------------------------------------------------------

def is_session_active(session_id: str) -> bool:
    """Return True if the session exists and has not expired yet."""
    doc = _sessions().find_one(
        {"session_id": session_id},
        {"expires_at": 1, "_id": 0},
    )
    if doc is None:
        return False
    expires = doc.get("expires_at")
    if not expires:
        return True
    # ensure both sides are tz-aware
    now = datetime.now(timezone.utc)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return now < expires


def time_left_seconds(session_id: str) -> float:
    """Return number of seconds remaining for a session, or 0.0."""
    doc = _sessions().find_one(
        {"session_id": session_id},
        {"expires_at": 1, "_id": 0},
    )
    if not doc or not doc.get("expires_at"):
        return 0.0
    expires = doc["expires_at"]
    now = datetime.now(timezone.utc)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    delta = expires - now
    remaining = max(0.0, delta.total_seconds())
    return remaining


def expire_session_now(session_id: str):
    """Force a session to expire immediately."""
    _sessions().update_one(
        {"session_id": session_id},
        {"$set": {"expires_at": datetime.now(timezone.utc)}},
    )


# ---------------------------------------------------------------------------
# Results helpers
# ---------------------------------------------------------------------------

def compute_session_results(session_id: str) -> dict:
    """Generate strengths/weaknesses/improvement from the latest trainee eval."""
    eval_data = get_latest_trainee_eval(session_id)
    strengths: list[str] = []
    weaknesses: list[str] = []
    if eval_data and isinstance(eval_data, dict):
        for item in eval_data.get("items", []):
            desc = item.get("desc") or item.get("id")
            if item.get("achieved"):
                strengths.append(desc)
            else:
                weaknesses.append(desc)
    improvement = "Review the items you missed and seek feedback from an examiner."
    return {"strengths": strengths, "weaknesses": weaknesses, "improvement": improvement}


# ---------------------------------------------------------------------------
# Case CRUD
# ---------------------------------------------------------------------------

def save_case(case_data: dict) -> str:
    """Insert or replace a case. Returns the case_id."""
    case_id = case_data.get("case_id")
    if not case_id:
        raise ValueError("case_data must include a 'case_id'.")
    case_data["updated_at"] = datetime.now(timezone.utc)
    case_data.setdefault("created_at", datetime.now(timezone.utc))
    _cases().replace_one({"case_id": case_id}, case_data, upsert=True)
    logger.info(f"Case saved: {case_id!r}")
    return case_id


def get_case(case_id: str) -> dict | None:
    """Return a single case document."""
    return _cases().find_one({"case_id": case_id}, {"_id": 0})


def list_cases() -> list[dict]:
    """Return all cases, newest first."""
    return list(_cases().find({}, {"_id": 0}).sort("updated_at", -1))


def delete_case(case_id: str) -> bool:
    """Delete a case. Returns True if something was deleted."""
    result = _cases().delete_one({"case_id": case_id})
    return result.deleted_count > 0


def get_case_rubric(case_id: str) -> dict | None:
    """Return just the rubric embedded in a case, or None."""
    case = get_case(case_id)
    if not case:
        return None
    return case.get("rubric")


# ---------------------------------------------------------------------------
# Analytics helpers
# ---------------------------------------------------------------------------

def get_analytics_data() -> dict:
    """Aggregate analytics across all sessions and evaluations."""
    sessions_col = _sessions()
    evals_col = _evaluations()

    total_sessions = sessions_col.count_documents({})
    total_evaluated = evals_col.count_documents({"eval_type": "trainee"})

    # Per-user stats
    user_pipeline = [
        {"$group": {
            "_id": "$user_id",
            "session_count": {"$sum": 1},
            "session_ids": {"$push": "$session_id"},
        }}
    ]
    user_sessions = {r["_id"]: r for r in sessions_col.aggregate(user_pipeline)}

    per_user = []
    for uid, info in user_sessions.items():
        sids = info["session_ids"]
        evals = list(evals_col.find(
            {"session_id": {"$in": sids}, "eval_type": "trainee"},
            {"_id": 0, "score_data": 1}
        ))
        scores = []
        passes = 0
        for ev in evals:
            sd = ev.get("score_data", {})
            pct = sd.get("percent")
            if pct is not None:
                scores.append(float(pct))
            if sd.get("pass"):
                passes += 1
        avg_score = (sum(scores) / len(scores)) if scores else None
        pass_rate = (passes / len(evals)) if evals else None
        per_user.append({
            "user_id": uid,
            "session_count": info["session_count"],
            "eval_count": len(evals),
            "avg_score": round(avg_score, 3) if avg_score is not None else None,
            "pass_rate": round(pass_rate, 3) if pass_rate is not None else None,
        })

    # Per-case stats
    case_pipeline = [
        {"$match": {"case_id": {"$ne": None}}},
        {"$group": {
            "_id": "$case_id",
            "session_count": {"$sum": 1},
            "session_ids": {"$push": "$session_id"},
        }}
    ]
    case_sessions = list(sessions_col.aggregate(case_pipeline))
    per_case = []
    for cs in case_sessions:
        cid = cs["_id"]
        sids = cs["session_ids"]
        evals = list(evals_col.find(
            {"session_id": {"$in": sids}, "eval_type": "trainee"},
            {"_id": 0, "score_data": 1}
        ))
        scores = []
        passes = 0
        for ev in evals:
            sd = ev.get("score_data", {})
            pct = sd.get("percent")
            if pct is not None:
                scores.append(float(pct))
            if sd.get("pass"):
                passes += 1
        avg_score = (sum(scores) / len(scores)) if scores else None
        pass_rate = (passes / len(evals)) if evals else None
        case_doc = get_case(cid)
        per_case.append({
            "case_id": cid,
            "title": case_doc.get("title", cid) if case_doc else cid,
            "session_count": cs["session_count"],
            "eval_count": len(evals),
            "avg_score": round(avg_score, 3) if avg_score is not None else None,
            "pass_rate": round(pass_rate, 3) if pass_rate is not None else None,
        })

    # Rubric item performance (across all trainee evals)
    all_evals = list(evals_col.find({"eval_type": "trainee"}, {"_id": 0, "score_data": 1}))
    item_stats: dict[str, dict] = {}
    for ev in all_evals:
        sd = ev.get("score_data", {})
        for item in sd.get("items", []):
            iid = item.get("id", "unknown")
            if iid not in item_stats:
                item_stats[iid] = {"id": iid, "desc": item.get("desc", ""), "total": 0, "achieved": 0}
            if item.get("included", True):
                item_stats[iid]["total"] += 1
                if item.get("achieved"):
                    item_stats[iid]["achieved"] += 1

    item_performance = []
    for iid, st in item_stats.items():
        rate = (st["achieved"] / st["total"]) if st["total"] > 0 else 0
        item_performance.append({**st, "achievement_rate": round(rate, 3)})
    item_performance.sort(key=lambda x: x["achievement_rate"])

    # Score distribution buckets
    all_scores = []
    all_passes = 0
    for ev in all_evals:
        sd = ev.get("score_data", {})
        pct = sd.get("percent")
        if pct is not None:
            all_scores.append(float(pct))
        if sd.get("pass"):
            all_passes += 1

    buckets = {"0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0}
    for s in all_scores:
        pct100 = s * 100
        if pct100 < 20:
            buckets["0-20"] += 1
        elif pct100 < 40:
            buckets["20-40"] += 1
        elif pct100 < 60:
            buckets["40-60"] += 1
        elif pct100 < 80:
            buckets["60-80"] += 1
        else:
            buckets["80-100"] += 1

    overall_avg = (sum(all_scores) / len(all_scores)) if all_scores else 0
    overall_pass_rate = (all_passes / len(all_evals)) if all_evals else 0

    return {
        "total_sessions": total_sessions,
        "total_evaluated": total_evaluated,
        "overall_avg_score": round(overall_avg, 3),
        "overall_pass_rate": round(overall_pass_rate, 3),
        "score_distribution": buckets,
        "per_user": per_user,
        "per_case": per_case,
        "item_performance": item_performance,
    }
