"""
Generate per-standard rationale grounded in the retrieved chunk text.
"""
import json
from pathlib import Path
from tenacity import retry, wait_random_exponential, stop_after_attempt

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import get_openai_client, OPENAI_API_KEY, OPENAI_CHAT_MODEL, CHUNKS_PATH


RATIONALE_PROMPT = """You are a BIS standards compliance expert helping Indian MSEs.

Query: {query}
Standard: {is_code} ({year}) — {title}
Relevant text: {chunk_text}

Write a 2-sentence rationale explaining:
1. Why this standard is relevant to the query
2. What specific requirement it covers

Be specific, cite exact requirements where possible. No hallucination — only use the provided text."""

BATCH_RATIONALE_PROMPT = """You are a BIS standards compliance expert.

User query: {query}

For each standard below, write a 2-sentence rationale explaining why it is relevant.
Return a JSON object with is_code as key and rationale as value.

Standards:
{standards_block}

JSON only:"""


class RationaleGenerator:
    def __init__(self):
        self.client = get_openai_client()
        # Load chunk texts for grounding
        self._chunk_lookup: dict[str, str] = {}
        if CHUNKS_PATH.exists():
            with open(CHUNKS_PATH, encoding="utf-8") as f:
                for line in f:
                    c = json.loads(line)
                    code = c["is_code_norm"]
                    if code not in self._chunk_lookup or c["chunk_type"] == "scope":
                        self._chunk_lookup[code] = c["text"]

    @retry(wait=wait_random_exponential(min=1, max=10), stop=stop_after_attempt(3))
    def generate_batch(self, query: str, standards: list) -> dict:
        """Generate rationales for multiple standards in one API call."""
        block = "\n".join(
            f"- {s['is_code']} ({s['year']}): {s['title']}\n  Context: {self._chunk_lookup.get(s['is_code_norm'], '')[:400]}"
            for s in standards
        )
        resp = self.client.chat.completions.create(
            model=OPENAI_CHAT_MODEL,
            messages=[{"role": "user", "content": BATCH_RATIONALE_PROMPT.format(
                query=query, standards_block=block
            )}],
            max_tokens=600,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        try:
            return json.loads(resp.choices[0].message.content)
        except Exception:
            return {}
