"""
Embeddings: OpenAI text-embedding-3-large (primary) with local BGE fallback.
"""
import os
import json
import hashlib
import numpy as np
from pathlib import Path
from typing import Union
from tenacity import retry, wait_random_exponential, stop_after_attempt

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import (
    OPENAI_API_KEY, OPENAI_EMBED_MODEL, OPENAI_EMBED_DIM,
    LOCAL_EMBED_MODEL, CACHE_DIR,
)


class EmbedderOpenAI:
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = OPENAI_EMBED_MODEL
        self.dim = OPENAI_EMBED_DIM
        self._cache = {}
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self._cache_file = CACHE_DIR / "embeddings.json"
        if self._cache_file.exists():
            try:
                with open(self._cache_file, encoding="utf-8") as f:
                    self._cache = json.load(f)
            except (json.JSONDecodeError, Exception):
                print("  Warning: embedding cache corrupted, starting fresh")
                self._cache = {}

    def _save_cache(self):
        # Atomic write via temp file to avoid corruption on interrupt
        tmp = self._cache_file.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._cache, f)
        tmp.replace(self._cache_file)

    @retry(wait=wait_random_exponential(min=1, max=20), stop=stop_after_attempt(5))
    def embed_one(self, text: str) -> np.ndarray:
        key = hashlib.md5(text.encode()).hexdigest()
        if key in self._cache:
            return np.array(self._cache[key], dtype=np.float32)
        resp = self.client.embeddings.create(input=[text[:8000]], model=self.model)
        vec = resp.data[0].embedding
        self._cache[key] = vec
        return np.array(vec, dtype=np.float32)

    @retry(wait=wait_random_exponential(min=1, max=20), stop=stop_after_attempt(5))
    def embed_batch(self, texts: list, batch_size: int = 100) -> np.ndarray:
        results = []
        for i in range(0, len(texts), batch_size):
            batch = [t[:8000] for t in texts[i : i + batch_size]]
            # Check cache first
            vecs = []
            to_embed = []
            to_embed_idx = []
            for j, t in enumerate(batch):
                key = hashlib.md5(t.encode()).hexdigest()
                if key in self._cache:
                    vecs.append((j, np.array(self._cache[key], dtype=np.float32)))
                else:
                    to_embed.append(t)
                    to_embed_idx.append(j)

            if to_embed:
                resp = self.client.embeddings.create(input=to_embed, model=self.model)
                for k, item in enumerate(resp.data):
                    idx = to_embed_idx[k]
                    key = hashlib.md5(to_embed[k].encode()).hexdigest()
                    self._cache[key] = item.embedding
                    vecs.append((idx, np.array(item.embedding, dtype=np.float32)))
                self._save_cache()

            vecs.sort(key=lambda x: x[0])
            results.extend([v for _, v in vecs])

        return np.array(results, dtype=np.float32)


def get_embedder(force_local: bool = False):
    return EmbedderOpenAI()
