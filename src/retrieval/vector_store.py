"""
FAISS vector store: build and query.
"""
import json
import numpy as np
import faiss
from pathlib import Path
from typing import List, Tuple

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import FAISS_OPENAI_PATH, FAISS_META_PATH


class VectorStore:
    def __init__(self, dim: int, index_path: Path = None, meta_path: Path = None):
        self.dim = dim
        self.index_path = index_path or FAISS_OPENAI_PATH
        self.meta_path = meta_path or FAISS_META_PATH
        self.index = faiss.IndexFlatIP(dim)  # Inner product (cosine on normalized)
        self.meta: List[dict] = []

    def add(self, vectors: np.ndarray, metadata: List[dict]):
        # Normalize for cosine similarity
        faiss.normalize_L2(vectors)
        self.index.add(vectors)
        self.meta.extend(metadata)

    def search(self, query_vec: np.ndarray, top_k: int = 30) -> List[Tuple[dict, float]]:
        q = query_vec.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(q)
        scores, indices = self.index.search(q, top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0:
                results.append((self.meta[idx], float(score)))
        return results

    def save(self):
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.meta, f, ensure_ascii=False)
        print(f"  Saved FAISS index ({self.index.ntotal} vectors) -> {self.index_path}")

    def load(self):
        self.index = faiss.read_index(str(self.index_path))
        with open(self.meta_path, encoding="utf-8") as f:
            self.meta = json.load(f)
        print(f"  Loaded FAISS index ({self.index.ntotal} vectors) OK")
        return self

    @classmethod
    def from_disk(cls, dim: int = None):
        from src.config import LOCAL_EMBED_DIM
        store = cls(dim or LOCAL_EMBED_DIM)
        store.load()
        return store
