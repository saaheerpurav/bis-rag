"""Quick smoke test - no API key needed."""
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.retrieval.bm25_store import BM25Store

bm25 = BM25Store.from_disk()
results = bm25.search("ordinary Portland cement 33 grade", top_k=5)
print("BM25 smoke test - Query: 33 Grade OPC")
for meta, score in results:
    print(f"  {meta['is_code']} ({meta['year']}) - {meta['title'][:50]} [{score:.3f}]")

print()
results2 = bm25.search("coarse aggregate natural sources structural concrete", top_k=5)
print("BM25 smoke test - Query: aggregates for concrete")
for meta, score in results2:
    print(f"  {meta['is_code']} ({meta['year']}) - {meta['title'][:50]} [{score:.3f}]")
