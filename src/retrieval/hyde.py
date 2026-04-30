"""
HyDE + Query Decomposition in a single API call.
Saves one round-trip vs calling them separately.
"""
import hashlib
import json
from pathlib import Path
from tenacity import retry, wait_random_exponential, stop_after_attempt

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import OPENAI_API_KEY, OPENAI_MINI_MODEL, CACHE_DIR


COMBINED_PROMPT = """You are a BIS standards expert. Given a user query, return a JSON object with:
1. "hyde": A 100-word hypothetical BIS standard description (start with IS code format, include scope, material, requirements)
2. "keywords": 6 BM25 search keywords (material names, grade, technical terms)
3. "expanded": expanded query string combining material + grade + application

Query: {query}

JSON only:"""


class HyDEGenerator:
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self._cache_file = CACHE_DIR / "hyde_cache.json"
        self._cache = {}
        if self._cache_file.exists():
            try:
                with open(self._cache_file, encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception:
                self._cache = {}

    @retry(wait=wait_random_exponential(min=1, max=10), stop=stop_after_attempt(3))
    def generate(self, query: str) -> str:
        """Returns the HyDE hypothetical document text."""
        key = hashlib.md5(query.strip().lower().encode()).hexdigest()
        if key in self._cache:
            return self._cache[key].get("hyde", query)

        resp = self.client.chat.completions.create(
            model=OPENAI_MINI_MODEL,
            messages=[{"role": "user", "content": COMBINED_PROMPT.format(query=query)}],
            max_tokens=250,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        try:
            result = json.loads(resp.choices[0].message.content)
        except Exception:
            result = {"hyde": query, "keywords": [], "expanded": query}

        self._cache[key] = result
        self._save_cache()
        return result.get("hyde", query)

    def generate_full(self, query: str) -> dict:
        """Returns {hyde, keywords, expanded} — for decomposer integration."""
        key = hashlib.md5(query.strip().lower().encode()).hexdigest()
        if key in self._cache:
            return self._cache[key]

        resp = self.client.chat.completions.create(
            model=OPENAI_MINI_MODEL,
            messages=[{"role": "user", "content": COMBINED_PROMPT.format(query=query)}],
            max_tokens=250,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        try:
            result = json.loads(resp.choices[0].message.content)
        except Exception:
            result = {"hyde": query, "keywords": [], "expanded": query}

        self._cache[key] = result
        self._save_cache()
        return result

    def _save_cache(self):
        tmp = self._cache_file.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._cache, f)
        tmp.replace(self._cache_file)
