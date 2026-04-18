"""Seed the MongoDB cases collection from the static cases.json file.

Run with:
    python -m api.seed_cases
"""

import json
from pathlib import Path
from api.database import init_db, save_case

CASES_JSON = Path(__file__).resolve().parent.parent / "frontend-react" / "src" / "data" / "cases.json"


def seed():
    init_db()
    with open(CASES_JSON, "r", encoding="utf-8") as f:
        cases = json.load(f)

    for c in cases:
        case_id = c.get("id")
        title = c.get("title", "")
        # Generate slug-style case_id
        import re
        slug = re.sub(r"[^a-z0-9]+", "_", title.strip().lower()).strip("_")
        case_data = {
            "case_id": slug,
            "title": title,
            "subtitle": c.get("subtitle", ""),
            "difficulty": c.get("difficulty", "Beginner"),
            "skills": c.get("skills", []),
            "dynamics": c.get("dynamics", ""),
            "objective": c.get("objective", ""),
            "duration": c.get("duration", "15 min"),
            "condition": title,  # Maps to patient sim condition
            "language": "English",
            # No rubric yet — admin will create rubrics per case
            "rubric": None,
        }
        save_case(case_data)
        print(f"  ✓ Seeded case: {slug} ({title})")

    print(f"\nDone! Seeded {len(cases)} cases.")


if __name__ == "__main__":
    from src.utils.env import load_env
    load_env()
    seed()
