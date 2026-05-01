"""
Local embedder using fastembed + BAAI/bge-small-en-v1.5.
- ONNX runtime — no PyTorch, no GPU needed
- ~23MB model downloaded once on first use to local cache
- ~80ms per query on CPU, scales to any test set size
- No API key required
"""
import numpy as np
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import LOCAL_EMBED_MODEL, LOCAL_EMBED_DIM


class EmbedderFastEmbed:
    def __init__(self):
        from fastembed import TextEmbedding
        print(f"  Loading {LOCAL_EMBED_MODEL} (ONNX, CPU)...")
        self.model = TextEmbedding(LOCAL_EMBED_MODEL)
        self.dim = LOCAL_EMBED_DIM

    def embed_one(self, text: str) -> np.ndarray:
        # bge-small max tokens ~512, truncate to be safe
        vec = list(self.model.embed([text[:2000]]))[0]
        return np.array(vec, dtype=np.float32)

    def embed_batch(self, texts: list, batch_size: int = 256) -> np.ndarray:
        truncated = [t[:2000] for t in texts]
        vecs = list(self.model.embed(truncated, batch_size=batch_size))
        return np.array(vecs, dtype=np.float32)


def get_embedder():
    return EmbedderFastEmbed()
