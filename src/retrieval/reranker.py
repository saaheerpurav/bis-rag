"""
GPT-4o-mini reranker — no model downloads, pure OpenAI API.
Takes top-20 candidates, returns top-N scored by relevance.
"""
import json
from pathlib import Path
from typing import List, Tuple
from tenacity import retry, wait_random_exponential, stop_after_attempt

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import OPENAI_API_KEY, OPENAI_MINI_MODEL, CHUNKS_PATH, RERANK_TOP_N

RERANK_PROMPT = """You are a BIS standards expert. Given a user query and a list of candidate BIS standards, rank them by relevance.

Query: {query}

Candidates (is_code_norm -> title):
{candidates}

Return a JSON array of is_code_norm values ordered from MOST to LEAST relevant. Include all of them.
JSON array only, no markdown:"""


class Reranker:
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        # Load chunk text lookup
        self._chunk_lookup: dict[str, str] = {}
        if CHUNKS_PATH.exists():
            with open(CHUNKS_PATH, encoding="utf-8") as f:
                for line in f:
                    c = json.loads(line)
                    code = c["is_code_norm"]
                    if code not in self._chunk_lookup or c["chunk_type"] == "scope":
                        self._chunk_lookup[code] = c["text"][:300]

    @retry(wait=wait_random_exponential(min=1, max=10), stop=stop_after_attempt(3))
    def rerank(
        self,
        query: str,
        candidates: List[Tuple[dict, float]],
        top_n: int = RERANK_TOP_N,
    ) -> List[Tuple[dict, float]]:
        if not candidates:
            return []
        if len(candidates) <= top_n:
            return candidates

        # Build candidates block
        lines = []
        meta_map = {}
        for meta, score in candidates:
            code = meta["is_code_norm"]
            meta_map[code] = (meta, score)
            snippet = self._chunk_lookup.get(code, meta["title"])[:200]
            lines.append(f"{code}: {meta['title']} | {snippet}")

        candidates_block = "\n".join(lines)

        try:
            resp = self.client.chat.completions.create(
                model=OPENAI_MINI_MODEL,
                messages=[{"role": "user", "content": RERANK_PROMPT.format(
                    query=query,
                    candidates=candidates_block,
                )}],
                max_tokens=500,
                temperature=0.0,
                response_format={"type": "json_object"},
            )
            content = resp.choices[0].message.content
            # The model might return {"ranked": [...]} or just [...]
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                ranked_codes = next(iter(parsed.values()))
            else:
                ranked_codes = parsed

            result = []
            for code in ranked_codes:
                if code in meta_map:
                    result.append(meta_map[code])
            # Fill in any missing
            for code, item in meta_map.items():
                if code not in [r[0]["is_code_norm"] for r in result]:
                    result.append(item)
            return result[:top_n]

        except Exception:
            # Fallback: return original RRF order
            return candidates[:top_n]
