"""api.routes.voice

Voice endpoints (ElevenLabs):
  POST /api/v1/voice/transcribe  — upload audio, get transcription text back
  POST /api/v1/voice/speak       — send text, get MP3 audio back
"""

from __future__ import annotations

import os
from io import BytesIO

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice"])


def _get_elevenlabs_client():
    """Lazily create the ElevenLabs client so missing keys give a clear error."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key or api_key == "your_elevenlabs_api_key_here":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ELEVENLABS_API_KEY is not configured on the server.",
        )
    try:
        from elevenlabs.client import ElevenLabs
        return ElevenLabs(api_key=api_key)
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="elevenlabs package is not installed. Run: pip install elevenlabs",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Transcribe endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file (webm/mp3/wav/ogg)"),
    language_code: str = Form("ara", description="Language code: 'eng' for English, 'ara' for Arabic"),
):
    """
    Convert uploaded audio to text using ElevenLabs Scribe STT.

    Returns: { "text": "transcribed text..." }
    """
    client = _get_elevenlabs_client()

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded audio file is empty.",
        )

    try:
        logger.info(f"Transcribing audio: size={len(audio_bytes)} bytes, lang={language_code}")
        audio_data = BytesIO(audio_bytes)
        # Give it the original filename so ElevenLabs can detect the mime type
        audio_data.name = audio.filename or "recording.webm"

        result = client.speech_to_text.convert(
            file=audio_data,
            model_id="scribe_v1",
            language_code=language_code,
            diarize=False,
        )
        text = result.text.strip() if result.text else ""
        logger.info(f"Transcription result: {text[:100]!r}")
        return {"text": text}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Transcription failed: {type(exc).__name__}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs transcription failed: {exc}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Text-to-speech endpoint
# ─────────────────────────────────────────────────────────────────────────────

class SpeakRequest(BaseModel):
    text: str
    language: str = "English"  # "English" | "Arabic"
    session_id: str | None = None


@router.post("/speak")
def speak_text(body: SpeakRequest):
    """
    Convert text to MP3 audio using ElevenLabs TTS.

    Returns: audio/mpeg binary stream
    """
    if not body.text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="text must not be empty.",
        )

    client = _get_elevenlabs_client()

    # 1. Determine base voice ID
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
    male_voice = os.getenv("ELEVENLABS_VOICE_ID_MALE")
    female_voice = os.getenv("ELEVENLABS_VOICE_ID_FEMALE")

    # 2. Try to refine voice by patient gender if session_id is provided
    if body.session_id:
        from api.database import get_session_info
        import json
        session = get_session_info(body.session_id)
        if session and session.get("profile"):
            try:
                profile = json.loads(session["profile"])
                gender = str(profile.get("gender", "")).lower()
                if "female" in gender and female_voice:
                    voice_id = female_voice
                    logger.info(f"Using female voice for session {body.session_id}")
                elif "male" in gender and male_voice:
                    voice_id = male_voice
                    logger.info(f"Using male voice for session {body.session_id}")
            except Exception as e:
                logger.warning(f"Failed to parse profile for voice selection: {e}")

    try:
        logger.info(f"TTS: voice={voice_id}, lang={body.language}, text_len={len(body.text)}")
        audio_iter = client.text_to_speech.convert(
            text=body.text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
            voice_settings={
                "stability": 0.90,
                "similarity_boost": 0.70,
                "style": 0.00,
                "use_speaker_boost": False,
            },
        )

        # Collect all chunks into a single buffer
        audio_buffer = BytesIO()
        for chunk in audio_iter:
            audio_buffer.write(chunk)
        audio_buffer.seek(0)

        logger.info(f"TTS audio generated: {audio_buffer.getbuffer().nbytes} bytes")

        return StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=patient_reply.mp3"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"TTS failed: {type(exc).__name__}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs TTS failed: {exc}",
        )
