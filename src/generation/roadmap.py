"""
Compliance Roadmap generator.
For each matched standard, produce actionable guidance for MSEs:
required tests, BIS license type, cost range, timeline.
"""
import json
from tenacity import retry, wait_random_exponential, stop_after_attempt

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import get_openai_client, OPENAI_API_KEY, OPENAI_MINI_MODEL, CHUNKS_PATH


ROADMAP_PROMPT = """You are a BIS compliance consultant helping an Indian Micro/Small Enterprise.

Product query: {query}
Standard: {is_code} ({year}) — {title}
Standard text excerpt: {chunk_text}

Generate a compliance roadmap JSON object with these exact keys:
- license_type: BIS license type (e.g. "ISI Mark (IS Product Certification)", "CRS (Compulsory Registration Scheme)", "Self Declaration", "Testing Only")
- required_tests: list of 3-5 key tests required (from the standard text)
- estimated_cost_inr: rough cost range in INR for testing + certification (e.g. "₹15,000 – ₹50,000")
- timeline_weeks: estimated weeks to get certification (integer)
- key_labs: list of 2-3 types of labs that can test this (e.g. "BIS empanelled cement testing lab", "NABL accredited materials lab")
- msme_tip: one practical tip for small manufacturers

JSON only:"""


class RoadmapGenerator:
    def __init__(self):
        self.client = get_openai_client()
        self._chunk_lookup: dict[str, str] = {}
        if CHUNKS_PATH.exists():
            with open(CHUNKS_PATH, encoding="utf-8") as f:
                for line in f:
                    c = json.loads(line)
                    code = c["is_code_norm"]
                    if code not in self._chunk_lookup or c["chunk_type"] == "full":
                        self._chunk_lookup[code] = c["text"]

    @retry(wait=wait_random_exponential(min=1, max=10), stop=stop_after_attempt(3))
    def generate(self, query: str, standard: dict) -> dict:
        chunk_text = self._chunk_lookup.get(standard["is_code_norm"], "")[:800]
        resp = self.client.chat.completions.create(
            model=OPENAI_MINI_MODEL,
            messages=[{"role": "user", "content": ROADMAP_PROMPT.format(
                query=query,
                is_code=standard["is_code"],
                year=standard["year"],
                title=standard["title"],
                chunk_text=chunk_text,
            )}],
            max_tokens=400,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        try:
            result = json.loads(resp.choices[0].message.content)
            return result
        except Exception:
            return {
                "license_type": "ISI Mark",
                "required_tests": ["Refer to standard"],
                "estimated_cost_inr": "₹20,000 – ₹1,00,000",
                "timeline_weeks": 12,
                "key_labs": ["NABL accredited lab"],
                "msme_tip": "Contact BIS regional office for guidance.",
            }
