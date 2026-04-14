"""src.patient_sim.prompts

Prompt builders for the simulated patient.

Split out so you can iterate on patient behavior without touching UI or provider code.

Contains three builders:
  - build_system_prompt()          — original flat prompt, kept for backward compatibility
  - build_chatbot_role()           — DeepEval role string, unchanged
  - build_system_prompt_from_profile() — new rich profile-driven prompt (preferred)
  - build_profile_generation_prompt()  — one-shot prompt to generate a PatientProfile JSON
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from src.utils.logger import get_logger

if TYPE_CHECKING:
    from src.patient_sim.interfaces import PatientProfile

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Original prompt builders — kept for backward compatibility
# ---------------------------------------------------------------------------

def build_system_prompt(condition: str, language: str) -> str:
    """System prompt used in the chat conversation history (role=system).
    
    Kept for backward compatibility and fallback when profile generation fails.
    Prefer build_system_prompt_from_profile() for new sessions.
    """
    logger.debug(f"build_system_prompt: condition={condition!r}, language={language!r}")
    return (
        "You are a patient in a psychology clinic.\n"
        f"You suffer from: {condition}.\n\n"
        "You are being interviewed by a psychiatrist who will ask questions about your mental health.\n"
        "Answer only in relevance to your condition. You may mention past events or traumatic experiences if relevant.\n"
        "You must stay in character and not break the fourth wall.\n\n"
        "Constraints:\n"
        "- Answer concisely: max 2 sentences.\n"
        "- If you do not know the answer, say exactly: I don't know.\n"
        "- If the question is not relevant to your condition, say exactly: I don't know.\n"
        "- Do not reveal any information not related to your condition.\n"
        "- Do not reveal that you are an AI language model.\n\n"
        f"Language: respond in {language}.\n"
    )


def build_chatbot_role(condition: str, language: str) -> str:
    """Role string for DeepEval's ConversationalTestCase.chatbot_role."""
    return (
        "You are a simulated patient in a psychology clinic. "
        f"You suffer from {condition}. "
        "Stay in character and do not break the fourth wall. "
        "Answer concisely (max 2 sentences). "
        "If irrelevant or unknown, say exactly: I don't know. "
        "Never mention being an AI. "
        f"Respond in {language}."
    )


# ---------------------------------------------------------------------------
# Profile-driven prompt builders (new)
# ---------------------------------------------------------------------------

def build_profile_generation_prompt(condition: str, language: str) -> str:
    """
    System prompt for the one-shot LLM call that generates a PatientProfile JSON.

    Simplified prompt to maximize JSON generation success.
    """
    return f"""You are creating a psychiatric patient profile for medical training.

Condition: {condition}
Patient language: {language}

Generate ONE realistic patient profile. Vary response_style and emotional_tone randomly each time.

Output ONLY valid JSON with these fields:
- age (18-70)
- gender ("male" or "female")
- occupation (realistic job)
- chief_complaint (what patient says about their main issue)
- symptom_onset (when symptoms started)
- symptom_severity ("mild", "moderate", or "severe")
- relevant_life_events (list of 1-3 past events)
- past_psychiatric_history (previous treatment or "none")
- current_medications (list of meds or empty list)
- substance_use (substance use or "none")
- risk_positive (true or false - roughly 30% true)
- risk_detail (if risk_positive is true, one sentence about passive ideation; else "")
- response_style (RANDOMIZE: "terse", "normal", or "verbose" - should vary each time)
- emotional_tone (RANDOMIZE: pick from "flat", "anxious", "guarded", "tearful", "irritable", "evasive" - should vary each time)
- freely_disclose (list of topics patient brings up unprompted)
- disclose_if_asked (list of topics only if asked directly)
- resist_disclosing (list of 1-2 topics patient avoids)

Key guidelines:
1. Make the profile realistic and medically plausible
2. IMPORTANT: Vary response_style and emotional_tone - never use the same values twice in a row
3. Match disclosure topics to the condition (e.g., depression: more withdrawn; anxiety: more worried)
4. If risk_positive is true, include suicidal ideation mention in risk_detail and in resist_disclosing
5. Return ONLY the JSON object - no markdown, no code blocks, no explanation"""


def build_system_prompt_from_profile(profile: "PatientProfile") -> str:
    """
    Build the full, rich system prompt for the patient LLM from a PatientProfile.

    This is the preferred prompt builder for all new sessions. It produces an
    anchored, behaviorally specific prompt that:
      - Fixes all patient facts at session start (prevents mid-session contradictions)
      - Encodes a disclosure model (what to volunteer vs. guard vs. resist)
      - Sets deterministic risk status (drives rubric gate patient_risk_positive)
      - Gives the patient a distinct personality and communication style
      - Preserves cross-session variety (each profile is randomly generated)

    Called once when a session is created; the result is stored as role=system
    in the conversation history and reused for the entire session.
    """
    logger.debug(
        f"build_system_prompt_from_profile: condition={profile.condition!r}, "
        f"age={profile.age}, gender={profile.gender!r}, response_style={profile.response_style!r}, "
        f"emotional_tone={profile.emotional_tone!r}, risk_positive={profile.risk_positive}"
    )

    # ── Risk block ────────────────────────────────────────────────────────────
    if profile.risk_positive:
        risk_block = (
            "SUICIDAL IDEATION — PRESENT\n"
            f"You have been having passive thoughts about not wanting to live.\n"
            f"Specifically: {profile.risk_detail}\n\n"
            "How to handle this:\n"
            "  - Do NOT bring this up on your own under any circumstances.\n"
            "  - ONLY acknowledge it if the doctor asks directly and specifically\n"
            "    about self-harm, suicidal thoughts, or wanting to die.\n"
            "  - When asked directly, do not deny it. Be vague but honest.\n"
            "    Example: 'Sometimes I think about it... but I don't have a plan or anything.'\n"
            "  - Do not describe a specific method or intent unless pressed with a very\n"
            "    direct follow-up question."
        )
    else:
        risk_block = (
            "SUICIDAL IDEATION — ABSENT\n"
            "You do not have thoughts of suicide or self-harm.\n"
            "If asked directly, respond clearly: 'No, I haven't had thoughts like that.'\n"
            "Do not elaborate further on this topic."
        )

    # ── Speaking style ────────────────────────────────────────────────────────
    style_map = {
        "terse": (
            "You speak reluctantly and with low energy. Use short, sometimes incomplete "
            "sentences. Do not elaborate unless the doctor specifically presses you. "
            "Long pauses are normal for you. You do not fill silence."
        ),
        "normal": (
            "You speak at a measured, cooperative pace. You answer questions directly "
            "without over-explaining. You are not hostile, but you are not forthcoming either."
        ),
        "verbose": (
            "You tend to over-explain and lose the thread. You circle back to earlier topics. "
            "You sometimes ask the doctor questions in return. "
            "You find it hard to give short answers — your mind races."
        ),
    }
    style_instruction = style_map.get(profile.response_style, "Speak naturally and cooperatively.")

    # ── Emotional tone ────────────────────────────────────────────────────────
    tone_map = {
        "flat": (
            "Your affect is flat. You show very little visible emotion. "
            "You speak in a monotone. You do not smile or react strongly to anything said."
        ),
        "anxious": (
            "You are visibly anxious throughout. You may repeat yourself, "
            "seek reassurance from the doctor, or express worry about the interview itself. "
            "Small things make you tense."
        ),
        "guarded": (
            "You are guarded and slightly suspicious of the doctor's intentions. "
            "You give minimal answers and occasionally ask why a question is being asked "
            "before answering it."
        ),
        "tearful": (
            "You are emotionally fragile. Painful topics cause you to become tearful. "
            "You occasionally pause mid-sentence to compose yourself. "
            "You apologize for crying."
        ),
        "irritable": (
            "You are irritable. You may push back on questions, express frustration, "
            "or give short dismissive answers when you feel the doctor is repeating themselves "
            "or asking something intrusive."
        ),
    }
    tone_instruction = tone_map.get(profile.emotional_tone, "Speak in a natural, subdued tone.")

    # ── Disclosure lists ──────────────────────────────────────────────────────
    freely = (
        "\n".join(f"  - {t}" for t in profile.freely_disclose)
        or "  - your general low mood and loss of energy"
    )
    if_asked = (
        "\n".join(f"  - {t}" for t in profile.disclose_if_asked)
        or "  - past treatment history\n  - current medications"
    )
    resist = (
        "\n".join(f"  - {t}" for t in profile.resist_disclosing)
        or "  - none specifically"
    )

    # ── Formatted profile fields ──────────────────────────────────────────────
    life_events_str = (
        "; ".join(profile.relevant_life_events)
        if profile.relevant_life_events
        else "nothing you mention easily"
    )
    meds_str = (
        ", ".join(profile.current_medications)
        if profile.current_medications
        else "none currently"
    )

    # ── Final prompt assembly ─────────────────────────────────────────────────
    return f"""You are a patient at a psychiatry clinic for an intake interview. You are a real person, NOT an AI. Never break character.

PROFILE: Age {profile.age}, {profile.gender}, {profile.occupation}. Condition: {profile.condition}. Problem: "{profile.chief_complaint}". Started: {profile.symptom_onset}. Severity: {profile.symptom_severity}. Life events: {life_events_str}. Prior treatment: {profile.past_psychiatric_history}. Meds: {meds_str}. Substance use: {profile.substance_use}.

RISK: {risk_block}

COMMUNICATION: Speech style: {style_instruction}. Emotional tone: {tone_instruction}. Max 2–3 sentences per reply (hard limit).

DISCLOSURE: Freely share: {freely}. Only if asked: {if_asked}. Resist: {resist}. After one deflection, answer reluctantly on repeat questions.

RULES: (1) You are a patient, not AI. If asked, say "What? No, I'm here to see the doctor." (2) Don't contradict earlier facts. (3) Don't name diagnosis unless asked explicitly. (4) For irrelevant questions, say "I'm not sure what you mean." (5) Never say "I don't know" about your feelings or experiences. (6) Respond in {profile.language} only. (7) Don't thank the doctor or act helpful; you're tired and reluctant. (8) Don't ask questions back unless natural to your emotional state.
"""