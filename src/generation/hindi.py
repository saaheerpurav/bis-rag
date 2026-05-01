"""
Translate response content to Hindi (Devanagari) via GPT-4o.
"""
from tenacity import retry, wait_random_exponential, stop_after_attempt

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import get_openai_client, OPENAI_API_KEY, OPENAI_MINI_MODEL

TRANSLATE_PROMPT = """Translate this BIS standards compliance text to simple Hindi (Devanagari script).
Keep IS code numbers, standard numbers, technical terms in English.
Be clear and accessible for a small business owner.

Text: {text}

Hindi translation:"""


class HindiTranslator:
    def __init__(self):
        self.client = get_openai_client()

    @retry(wait=wait_random_exponential(min=1, max=10), stop=stop_after_attempt(3))
    def translate(self, text: str) -> str:
        resp = self.client.chat.completions.create(
            model=OPENAI_MINI_MODEL,
            messages=[{"role": "user", "content": TRANSLATE_PROMPT.format(text=text)}],
            max_tokens=800,
            temperature=0.1,
        )
        return resp.choices[0].message.content.strip()

    def translate_result(self, result: dict) -> dict:
        """Translate rationale and roadmap tip in a result dict."""
        translated = result.copy()
        if result.get("rationale"):
            translated["rationale"] = self.translate(result["rationale"])
        if result.get("roadmap", {}).get("msme_tip"):
            translated["roadmap"] = result["roadmap"].copy()
            translated["roadmap"]["msme_tip"] = self.translate(result["roadmap"]["msme_tip"])
        return translated
