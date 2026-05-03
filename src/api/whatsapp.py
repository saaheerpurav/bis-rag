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
from src.config import get_openai_client, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, OPENAI_API_KEY

router = APIRouter()

# Detect Hindi in message
def is_hindi(text: str) -> bool:
    return any("\u0900" <= c <= "\u097f" for c in text)


def format_whatsapp_reply(results: list, query: str) -> str:
    """Format top-3 results for WhatsApp with match % and scope."""
    lines = [f"🔍 *BIS Standards for:* _{query[:80]}_\n"]

    for i, r in enumerate(results[:3], 1):
        pct = int(round(r.get("confidence", 0) * 100))
        scope = r.get("scope", "").replace("\n", " ").strip()
        scope_short = (scope[:120] + "…") if len(scope) > 120 else scope

        lines.append(f"*{i}. {r['is_code_formatted']}* — {pct}% match")
        lines.append(f"   📋 {r['title'].title()}")
        if scope_short:
            lines.append(f"   _{scope_short}_")
        lines.append("")

    # Cross-refs from top result
    top_refs = results[0].get("cross_refs", []) if results else []
    if top_refs:
        lines.append(f"🔗 *Related:* {', '.join(top_refs[:3])}")
        lines.append("")

    lines.append("_Send another product description to search again._")
    return "\n".join(lines)


async def transcribe_voice(media_url: str) -> str:
    """Download voice note and transcribe via Whisper."""
    client = get_openai_client()
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
            include_rationale=False,
            include_roadmap=False,
            language=language,
        )
        reply = format_whatsapp_reply(result["results"], query_text)
    except Exception as e:
        reply = f"Sorry, I couldn't process your query. Please try again.\nError: {str(e)[:100]}"

    xml_reply = f'<?xml version="1.0"?><Response><Message>{reply}</Message></Response>'
    return PlainTextResponse(xml_reply, media_type="text/xml")
