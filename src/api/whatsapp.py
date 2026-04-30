"""
Twilio WhatsApp webhook handler.
Handles text messages and voice notes (via Whisper transcription).
"""
import httpx
import tempfile
from pathlib import Path
from fastapi import APIRouter, Form, Request
from fastapi.responses import PlainTextResponse
from twilio.rest import Client as TwilioClient
from twilio.request_validator import RequestValidator

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, OPENAI_API_KEY

router = APIRouter()

# Detect Hindi in message
def is_hindi(text: str) -> bool:
    return any("\u0900" <= c <= "\u097f" for c in text)


def format_whatsapp_reply(results: list, query: str) -> str:
    """Format top-3 results for WhatsApp."""
    lines = [f"🔍 *BIS Standards for:* _{query[:80]}_\n"]
    for i, r in enumerate(results[:3], 1):
        lines.append(f"*{i}. {r['is_code_formatted']}*")
        lines.append(f"   📋 {r['title']}")
        if r.get("rationale"):
            lines.append(f"   💡 {r['rationale'][:200]}")
        lines.append("")
    lines.append("_Powered by BIS Compliance Co-pilot_")
    return "\n".join(lines)


async def transcribe_voice(media_url: str) -> str:
    """Download voice note and transcribe via Whisper."""
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    async with httpx.AsyncClient() as http:
        resp = await http.get(
            media_url,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            timeout=30,
        )
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
        tmp.write(resp.content)
        tmp_path = tmp.name
    with open(tmp_path, "rb") as audio:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio,
        )
    return transcript.text


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(
    request: Request,
    Body: str = Form(default=""),
    From: str = Form(default=""),
    MediaUrl0: str = Form(default=None),
    MediaContentType0: str = Form(default=None),
):
    # Import pipeline lazily (already initialized at startup)
    from src.api.main import pipeline

    query_text = Body.strip()
    language = "en"

    # Handle voice note
    if MediaUrl0 and MediaContentType0 and "audio" in MediaContentType0:
        try:
            query_text = await transcribe_voice(MediaUrl0)
        except Exception as e:
            query_text = Body or "BIS building material standards"

    if not query_text:
        return PlainTextResponse(
            '<?xml version="1.0"?><Response><Message>Please send a text or voice message describing your product.</Message></Response>',
            media_type="text/xml",
        )

    # Detect language
    if is_hindi(query_text):
        language = "hi"

    try:
        result = pipeline.query(
            query_text,
            top_n=3,
            include_rationale=True,
            include_roadmap=False,
            language=language,
        )
        reply = format_whatsapp_reply(result["results"], query_text)
    except Exception as e:
        reply = f"Sorry, I couldn't process your query. Please try again.\nError: {str(e)[:100]}"

    xml_reply = f'<?xml version="1.0"?><Response><Message>{reply}</Message></Response>'
    return PlainTextResponse(xml_reply, media_type="text/xml")
