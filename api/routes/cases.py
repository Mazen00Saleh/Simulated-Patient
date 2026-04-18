"""api.routes.cases

Case endpoints:
  GET    /api/v1/cases            — list all cases (public)
  GET    /api/v1/cases/{case_id}  — get a single case (public)
  POST   /api/v1/admin/cases      — create/update a case (admin)
  PUT    /api/v1/admin/cases/{id} — update a case (admin)
  DELETE /api/v1/admin/cases/{id} — delete a case (admin)
"""

from __future__ import annotations

import re
from fastapi import APIRouter, HTTPException, status
from api.database import save_case, get_case, list_cases, delete_case, _serialize

# ── Public router ──
router = APIRouter(prefix="/cases", tags=["Cases"])

# ── Admin router (mounted separately in main.py) ──
admin_router = APIRouter(prefix="/admin/cases", tags=["Admin – Cases"])


def _sanitize_case_id(title: str) -> str:
    """Generate a URL-safe case_id from a title."""
    slug = re.sub(r"[^a-z0-9]+", "_", title.strip().lower()).strip("_")
    return slug or "untitled"


@router.get("")
def api_list_cases():
    """Return all cases (without rubric details for list view)."""
    cases = list_cases()
    result = []
    for c in cases:
        row = _serialize(c)
        # Strip rubric from listing to keep response lightweight
        row.pop("rubric", None)
        row.pop("patient_cues", None)
        result.append(row)
    return result


@router.get("/{case_id}")
def api_get_case(case_id: str):
    """Return a single case with full rubric."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    return _serialize(case)


# ── Admin Endpoints ──

@admin_router.post("")
def api_create_case(body: dict):
    """Create or update a case. Body must include at least title and condition."""
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=422, detail="title is required.")

    # Generate case_id from title if not provided
    case_id = body.get("case_id") or _sanitize_case_id(title)
    body["case_id"] = case_id

    # Validate rubric if provided
    rubric = body.get("rubric")
    if rubric:
        if not isinstance(rubric, dict):
            raise HTTPException(status_code=422, detail="rubric must be a JSON object.")
        rubric.setdefault("rubric_id", case_id)
        rubric.setdefault("version", "1.0.0")
        if "items" not in rubric:
            rubric["items"] = []
        if "pass_criteria" not in rubric:
            rubric["pass_criteria"] = {"min_percent": 0.6, "fail_on_flags": ["SAFETY_CRITICAL"]}

    saved_id = save_case(body)
    return {"case_id": saved_id, "status": "saved"}


@admin_router.put("/{case_id}")
def api_update_case(case_id: str, body: dict):
    """Update an existing case."""
    existing = get_case(case_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    body["case_id"] = case_id
    # Preserve created_at
    body["created_at"] = existing.get("created_at")

    rubric = body.get("rubric")
    if rubric and isinstance(rubric, dict):
        rubric.setdefault("rubric_id", case_id)
        rubric.setdefault("version", "1.0.0")

    save_case(body)
    return {"case_id": case_id, "status": "updated"}


@admin_router.delete("/{case_id}")
def api_delete_case(case_id: str):
    """Delete a case."""
    deleted = delete_case(case_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    return {"case_id": case_id, "status": "deleted"}
