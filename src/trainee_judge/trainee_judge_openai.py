"""
trainee_judge_openai.py

Calls OpenAI to grade a trainee conversation against an examiner-editable rubric JSON,
returning STRICT structured JSON (when supported) plus response metadata.

Drop-in replacement for trainee_judge_groq.py, using the openai SDK.
"""

from __future__ import annotations

import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from dotenv import load_dotenv
from openai import OpenAI

from src.utils.logger import get_logger, log_call

logger = get_logger(__name__)

from .trainee_judge_schema import (
    load_rubric,
    build_response_format,
    rubric_fingerprint,
)

load_dotenv()


# ----------------------------
# Config
# ----------------------------
@dataclass(frozen=True)
class GroqJudgeConfig:
    """Kept name for backwards compatibility with existing callers."""
    model: str = "gpt-4o"
    temperature: float = 0.0
    seed: Optional[int] = 42
    reasoning_effort: Optional[str] = None   # Not used by OpenAI chat API directly
    max_completion_tokens: int = 800
    strict_schema: bool = True
    timeout_s: Optional[float] = 90.0


# ----------------------------
# Transcript formatting
# ----------------------------
def build_numbered_turns(conversation_history: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Convert your app's conversation history to numbered turns.

    Expected input: [{"role": "user"|"assistant", "content": "..."}]
    Output: [{"turn": 1, "role": "trainee"|"patient", "content": "..."}]
    """
    turns: List[Dict[str, Any]] = []
    t = 1
    for m in conversation_history or []:
        role = m.get("role")
        if role not in ("user", "assistant"):
            continue
        turns.append(
            {
                "turn": t,
                "role": "trainee" if role == "user" else "patient",
                "content": m.get("content", "") or "",
            }
        )
        t += 1
    return turns


def _rubric_for_judge(rubric: Dict[str, Any]) -> Dict[str, Any]:
    """
    Minimize rubric payload sent to the model.
    """
    items_out = []
    for it in rubric.get("items", []) or []:
        items_out.append(
            {
                "id": it.get("id"),
                "desc": it.get("desc"),
                "weight": it.get("weight", 0),
                "gate": it.get("gate", None),
                "safety_critical": bool(it.get("safety_critical", False)),
                "anchors": it.get("anchors", None),
            }
        )

    return {
        "rubric_id": rubric.get("rubric_id", ""),
        "rubric_version": rubric.get("version", ""),
        "rubric_fingerprint": rubric_fingerprint(rubric),
        "items": items_out,
        "pass_criteria": rubric.get("pass_criteria", {}),
    }


# ----------------------------
# Prompting
# ----------------------------
def build_messages(
    rubric: Dict[str, Any],
    turns: List[Dict[str, Any]],
    language: str,
    condition: Optional[str] = None,
) -> List[Dict[str, str]]:
    """
    Builds the messages payload for the judge model.
    """
    rb = _rubric_for_judge(rubric)

    system = (
        "You are a strict psychiatry OSCE examiner grading a trainee.\n"
        "Use ONLY the provided conversation turns as evidence. Do NOT assume unstated facts.\n"
        "Grade each rubric item independently.\n"
        "If an item is partially met or unclear, set achieved=false and explain why.\n"
        "When achieved=true, include evidence_turns that support it.\n"
        "Return only the JSON that matches the provided schema."
    )

    user_payload = {
        "language": language,
        "condition": condition,
        "rubric": rb,
        "conversation_turns": turns,
        "grading_instructions": {
            "evidence": "Use turn numbers. Prefer trainee turns, but you may cite patient turns for context (e.g., risk cue).",
            "achieved_definition": "Achieved if the trainee clearly demonstrates the behavior at least once in the conversation.",
        },
    }

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
    ]


# ----------------------------
# Async Per-Item Judgment
# ----------------------------
async def _judge_single_item_async(
    item_id: str,
    item_desc: str,
    rubric_id: str,
    full_conversation: str,
    language: str,
    groq_config: GroqJudgeConfig,
    executor: ThreadPoolExecutor,
) -> Tuple[str, Dict[str, Any]]:
    """
    Judge a single rubric item asynchronously using OpenAI.
    """
    loop = asyncio.get_event_loop()

    def call_openai_sync():
        """Synchronous OpenAI API call wrapped for async executor."""
        from .trainee_judge_schema import build_judge_output_schema, build_response_format

        # Build minimal rubric dict for single item
        minimal_rubric = {
            "rubric_id": rubric_id,
            "version": "1.0",
            "items": [
                {"id": item_id, "desc": item_desc, "weight": 1.0, "gate": None, "safety_critical": False}
            ]
        }

        system_prompt = (
            "You are a strict psychiatry OSCE examiner grading a trainee's clinical interview.\n"
            "\n"
            "REASONING-FIRST CHAIN OF THOUGHT:\n"
            "1. ANALYZE: Review the rubric item and read through the full conversation turn by turn.\n"
            "2. FIND EVIDENCE: Identify specific turns where the trainee demonstrates (or fails to demonstrate) the expected behavior.\n"
            "3. REASON: Explain what you observed, why it does or does not meet the standard, and your decision threshold.\n"
            "4. SCORE: Only after reasoning, assign a score (0=not shown, 1=partial/implicit, 2=clear/explicit demonstration).\n"
            "\n"
            "Use ONLY the provided conversation turns as evidence. Do NOT assume unstated facts.\n"
            "Be strict: if the evidence is ambiguous or only implicit, score 1 or 0 rather than 2.\n"
            "Return JSON matching the provided schema with rationale as the core reasoning explanation."
        )

        import json as json_module
        turns = json_module.loads(full_conversation)

        user_content = {
            "language": language,
            "rubric_item_id": item_id,
            "rubric_item_desc": item_desc,
            "conversation_turns": turns,
            "grading_instructions": {
                "step_1_analyze": "Read the complete conversation and the rubric item definition.",
                "step_2_find_evidence": "List which turn(s) the trainee demonstrates this behavior (or does not).",
                "step_3_reason": "Explain your evidence analysis and decision logic in the rationale field.",
                "step_4_score": "Assign item_score: 0 (not demonstrated), 1 (partial/implicit), or 2 (clear/explicit).",
                "evidence_citation": "Reference turn numbers where you see evidence (e.g., turn 3 = trainee's 2nd message).",
            },
        }

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json_module.dumps(user_content, ensure_ascii=False)},
        ]

        client = OpenAI()
        response = client.chat.completions.create(
            model=groq_config.model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=groq_config.temperature,
            seed=groq_config.seed,
            max_tokens=groq_config.max_completion_tokens,
            timeout=groq_config.timeout_s,
        )

        return response.choices[0].message.content

    try:
        grade_json_str = await loop.run_in_executor(executor, call_openai_sync)

        logging.warning(f"[DEBUG {item_id}] Raw OpenAI response (first 500 chars): {grade_json_str[:500]}")

        response_data = json.loads(grade_json_str)
        logging.warning(f"[DEBUG {item_id}] Parsed JSON type: {type(response_data)}")
        logging.warning(f"[DEBUG {item_id}] Parsed JSON structure: {str(response_data)[:500]}")

        if isinstance(response_data, dict):
            logging.warning(f"[DEBUG {item_id}] Response is dict with keys: {list(response_data.keys())}")

            if "item_results" in response_data:
                item_results = response_data["item_results"]
                logging.warning(f"[DEBUG {item_id}] item_results type: {type(item_results)}, keys: {list(item_results.keys()) if isinstance(item_results, dict) else 'N/A'}")

                if isinstance(item_results, dict) and item_id in item_results:
                    item_grade = item_results[item_id]
                    logging.warning(f"[DEBUG {item_id}] Found item in item_results, type: {type(item_grade)}")
                else:
                    logging.warning(f"[WARN {item_id}] item_id NOT found in item_results.")
                    item_grade = response_data
            else:
                logging.warning(f"[WARN {item_id}] No 'item_results' key in response. Using full response.")
                item_grade = response_data
        else:
            logging.error(f"[ERROR {item_id}] Response is not a dict: {type(response_data).__name__}")
            item_grade = response_data

        if not isinstance(item_grade, dict):
            logging.error(f"[ERROR {item_id}] item_grade is {type(item_grade).__name__}, not dict.")
            return item_id, {"item_score": 0, "rationale": f"Unexpected response type: {type(item_grade).__name__}"}

        score = item_grade.get("item_score", 0)
        if not isinstance(score, int) or score not in (0, 1, 2):
            logging.warning(f"[WARN {item_id}] Invalid item_score: {score}, resetting to 0")
            score = 0
        item_grade["item_score"] = score

        logging.warning(f"[DEBUG {item_id}] Successfully extracted grade: score={score}, has rationale={bool(item_grade.get('rationale'))}")
        return item_id, item_grade

    except json.JSONDecodeError as e:
        logging.error(f"[ERROR {item_id}] JSON decode error: {e}")
        return item_id, {"item_score": 0, "rationale": f"JSON parse error: {str(e)[:100]}"}

    except Exception as e:
        logging.error(f"[ERROR {item_id}] Unexpected error: {type(e).__name__}: {e}")
        import traceback
        logging.error(f"[ERROR {item_id}] Traceback: {traceback.format_exc()}")
        return item_id, {"item_score": 0, "rationale": f"Error: {str(e)[:100]}"}


async def _judge_all_items_async(
    rubric_items: List[Dict[str, Any]],
    rubric_id: str,
    full_conversation: str,
    language: str,
    groq_config: GroqJudgeConfig,
) -> Dict[str, Dict[str, Any]]:
    """
    Judge all rubric items SEQUENTIALLY to stay within API rate limits.
    """
    results = []
    with ThreadPoolExecutor(max_workers=1) as executor:
        for item in rubric_items:
            result = await _judge_single_item_async(
                item["id"],
                item.get("desc", ""),
                rubric_id,
                full_conversation,
                language,
                groq_config,
                executor,
            )
            results.append(result)

    grades = {}
    for result in results:
        if isinstance(result, Exception):
            logging.error(f"Task failed with exception: {result}")
            continue
        item_id, item_grade = result
        grades[item_id] = item_grade

    return grades


def _generate_summary_feedback_sync(
    scored_items: List[Dict[str, Any]],
    rubric_id: str,
    language: str,
    groq_config: GroqJudgeConfig,
) -> List[str]:
    """
    Generate summary feedback based on scored items using OpenAI.
    """
    item_summaries = "\n".join([
        f"- {item['id']}: score {item.get('item_score', 0)}/2\n  Rationale: {item.get('rationale', '')[:120]}"
        for item in scored_items
    ])

    feedback_prompt = f"""You are a clinical educator providing constructive feedback to a trainee based on their OSCE performance.

REASONING-FIRST ANALYSIS:
Based on these rubric item scores and rationales:
{item_summaries}

**Think through the clinical teaching points:**
1. Read each item's rationale carefully.
2. Identify emerging patterns: What clusters of behaviors did the trainee handle well? What gaps do you see?
3. Consider the progression: Which items did the trainee struggle with early vs. built confidence?
4. Develop specific, actionable feedback grounded in the observed behavior patterns.

**Provide 3-4 feedback bullets:**
1. **Strength** – Identify the trainee's top demonstrated clinical skill(s) from this session.
2. **Growth Area** – Name the specific skill that needs the most development (ground it in item scores/rationale).
3. **Immediate Practice** – Suggest ONE concrete technique or approach they can practice immediately.
4. [Optional] **Next Session** – If applicable, name one follow-up topic or scenario to revisit.

Return ONLY a JSON array of 3-4 string bullets, e.g.:
["Strength: Clear empathy in patient engagement (items X, Y scored 2/2)...", "Growth: Time management in risk assessment...", ...]"""

    try:
        client = OpenAI()
        response = client.chat.completions.create(
            model=groq_config.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert clinical educator. Provide specific, actionable feedback grounded in observed behaviors. Be encouraging but honest."
                },
                {"role": "user", "content": feedback_prompt}
            ],
            temperature=0.2,
            max_tokens=400,
            timeout=25,
        )

        feedback_text = response.choices[0].message.content

        try:
            if "[" in feedback_text and "]" in feedback_text:
                json_str = feedback_text[feedback_text.find("["):feedback_text.rfind("]")+1]
                feedback_list = json.loads(json_str)
                if isinstance(feedback_list, list):
                    return feedback_list
        except json.JSONDecodeError:
            pass

        return [feedback_text]

    except Exception as e:
        logging.error(f"Error generating feedback: {e}")
        return ["Evaluation complete."]


# ----------------------------
# Main judge function (backwards-compatible name)
# ----------------------------
@log_call
def judge_trainee_with_groq(
    conversation_history: List[Dict[str, str]],
    language: str,
    condition: Optional[str] = None,
    rubric_path: Optional[str] = None,
    rubric: Optional[Dict[str, Any]] = None,
    config: GroqJudgeConfig = GroqJudgeConfig(),
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Evaluate trainee performance using per-item async judgment via OpenAI.

    Returns: (grade_json, meta)
    Function name kept for backwards compatibility with existing callers.
    """
    logger.info(f"Judge start: condition={condition!r}, language={language!r}, rubric_path={rubric_path}")

    rb = rubric or load_rubric(rubric_path)
    logger.debug(f"Rubric loaded: {len(rb.get('items', []))} items")

    turns = build_numbered_turns(conversation_history)
    logger.debug(f"Built {len(turns)} conversation turns")

    full_conversation = json.dumps(turns, ensure_ascii=False)
    logger.debug(f"Conversation JSON payload: {len(full_conversation)} bytes")

    import time
    start_time = time.time()

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        logger.debug("Starting per-item judgment coroutine")
        item_results = loop.run_until_complete(
            _judge_all_items_async(
                rb.get("items", []),
                rb.get("rubric_id", ""),
                full_conversation,
                language,
                config,
            )
        )
        logger.info(f"Judgment completed: {len(item_results)} items scored")
        loop.close()

    except Exception as e:
        logger.error(f"Item judgment failed: {type(e).__name__}: {e}", exc_info=True)
        item_results = {
            item["id"]: {"item_score": 0, "rationale": f"Error during judgment: {str(e)[:100]}"}
            for item in rb.get("items", [])
        }

    scored_items = [
        {
            "id": item_id,
            "item_score": grade.get("item_score", 0),
            "rationale": grade.get("rationale", ""),
        }
        for item_id, grade in item_results.items()
    ]

    try:
        logger.debug("Generating summary feedback")
        feedback = _generate_summary_feedback_sync(scored_items, rb.get("rubric_id", ""), language, config)
        logger.info(f"Generated {len(feedback)} feedback items")
    except Exception as e:
        logger.warning(f"Feedback generation failed: {type(e).__name__}: {e}")
        feedback = ["Evaluation complete."]

    grade = {
        "rubric_id": rb.get("rubric_id", ""),
        "rubric_version": rb.get("version", ""),
        "rubric_fingerprint": rubric_fingerprint(rb),
        "item_results": {
            item_id: {
                "item_score": item_results[item_id].get("item_score", 0),
                "rationale": item_results[item_id].get("rationale", ""),
                "anchor_evidence": item_results[item_id].get("anchor_evidence", None),
                "confidence": item_results[item_id].get("confidence", 0.0),
                "evidence_turns": item_results[item_id].get("evidence_turns", []),
            }
            for item_id in [item["id"] for item in rb.get("items", [])]
            if item_id in item_results
        },
        "flags": [],
        "summary_feedback": feedback,
    }

    elapsed = time.time() - start_time
    meta = {
        "model": config.model,
        "system_fingerprint": None,
        "usage": {"total_tokens": 0},
        "seed": config.seed,
        "temperature": config.temperature,
        "strict_schema": config.strict_schema,
        "parallel_judgments": len(item_results),
        "elapsed_seconds": elapsed,
    }

    return grade, meta
