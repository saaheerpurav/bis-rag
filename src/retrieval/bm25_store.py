"""
BM25 sparse retrieval over chunk texts.
"""
import re
import json
import pickle
from pathlib import Path
from typing import List, Tuple

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import BM25_PATH


def tokenize(text: str) -> List[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [t for t in text.split() if len(t) > 1]


class BM25Store:
    def __init__(self):
        from rank_bm25 import BM25Okapi
        self.BM25Okapi = BM25Okapi
        self.bm25 = None
        self.meta: List[dict] = []

    def build(self, chunks: List[dict]):
        corpus = [tokenize(c["text"]) for c in chunks]
        self.bm25 = self.BM25Okapi(corpus)
        self.meta = [
            {
                "chunk_id": c["chunk_id"],
                "is_code": c["is_code"],
                "is_code_norm": c["is_code_norm"],
                "year": c["year"],
                "title": c["title"],
                "section": c["section"],
                "section_name": c["section_name"],
                "chunk_type": c["chunk_type"],
                "page_start": c.get("page_start", 0),
            }
            for c in chunks
        ]
        print(f"  BM25: built on {len(corpus)} chunks")

    def search(self, query: str, top_k: int = 30) -> List[Tuple[dict, float]]:
        tokens = tokenize(query)
        scores = self.bm25.get_scores(tokens)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        return [(self.meta[i], float(scores[i])) for i in top_indices]

    def save(self):
        BM25_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(BM25_PATH, "wb") as f:
            pickle.dump({"bm25": self.bm25, "meta": self.meta}, f)
        print(f"  Saved BM25 -> {BM25_PATH}")

    def load(self):
        with open(BM25_PATH, "rb") as f:
            obj = pickle.load(f)
        self.bm25 = obj["bm25"]
        self.meta = obj["meta"]
        print(f"  Loaded BM25 ({len(self.meta)} chunks)")
        return self

    @classmethod
    def from_disk(cls):
        store = cls()
        store.load()
        return store
