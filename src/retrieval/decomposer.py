"""
Query decomposition: extract structured intent from a user query.
"""
import json
from tenacity import retry, wait_random_exponential, stop_after_attempt

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import get_openai_client, OPENAI_API_KEY, OPENAI_MINI_MODEL


DECOMPOSE_PROMPT = """Extract structured information from this BIS compliance query.
Return a JSON object with these exact keys:
- material: main material or product (e.g. "cement", "steel bars", "glass")
- grade: specific grade/type if mentioned (e.g. "33 grade", "OPC", "fly ash based")
- application: intended use (e.g. "structural concrete", "roofing", "water mains")
- properties: key properties mentioned (e.g. "chemical requirements", "compressive strength")
- keywords: list of 4-6 BM25 search keywords

Query: {query}

JSON only, no markdown:"""


class QueryDecomposer:
    def __init__(self):
        self.client = get_openai_client()

    @retry(wait=wait_random_exponential(min=1, max=10), stop=stop_after_attempt(3))
    def decompose(self, query: str) -> dict:
        try:
            resp = self.client.chat.completions.create(
                model=OPENAI_MINI_MODEL,
                messages=[{"role": "user", "content": DECOMPOSE_PROMPT.format(query=query)}],
                max_tokens=200,
                temperature=0.0,
                response_format={"type": "json_object"},
            )
            result = json.loads(resp.choices[0].message.content)
            return {
                "material": result.get("material", ""),
                "grade": result.get("grade", ""),
                "application": result.get("application", ""),
                "properties": result.get("properties", ""),
                "keywords": result.get("keywords", []),
                "expanded_query": f"{result.get('material','')} {result.get('grade','')} {result.get('application','')} {result.get('properties','')} BIS standard",
            }
        except Exception:
            # Fallback: return raw query
            return {
                "material": "",
                "grade": "",
                "application": "",
                "properties": "",
                "keywords": query.split()[:6],
                "expanded_query": query,
            }
