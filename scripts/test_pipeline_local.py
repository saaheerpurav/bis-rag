"""
Test the pipeline without API key (BM25 + local reranker only).
Run: python scripts/test_pipeline_local.py
"""
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.retrieval.bm25_store import BM25Store
from src.retrieval.hybrid import reciprocal_rank_fusion
import json

# Load registry
with open("data/processed/registry.json", encoding="utf-8") as f:
    registry = json.load(f)

bm25 = BM25Store.from_disk()

# Load public test set
with open("data/public_test_set.json", encoding="utf-8") as f:
    tests = json.load(f)

print("=" * 60)
print("BM25-only pipeline test (no API key needed)")
print("=" * 60)

hits = 0
for item in tests:
    query = item["query"]
    expected = [e.replace(" ", "").lower() for e in item["expected_standards"]]

    results = bm25.search(query, top_k=10)

    # Deduplicate by IS code
    seen = {}
    for meta, score in results:
        key = meta["is_code_norm"]
        if key not in seen:
            seen[key] = (meta, score)
    deduped = list(seen.values())[:5]

    retrieved = [f"{m['is_code']}: {m['year']}" for m, _ in deduped]
    retrieved_norm = [r.replace(" ", "").lower() for r in retrieved]

    top3_norm = retrieved_norm[:3]
    hit = any(e in top3_norm for e in expected)
    if hit:
        hits += 1

    status = "HIT" if hit else "MISS"
    print(f"\n[{item['id']}] {status}")
    print(f"  Q: {query[:70]}...")
    print(f"  Expected: {item['expected_standards']}")
    print(f"  Retrieved: {retrieved[:3]}")

print(f"\n{'='*60}")
print(f"Hit Rate @3 (BM25 only): {hits}/{len(tests)} = {hits/len(tests)*100:.1f}%")
print("With HyDE + FAISS + Reranker, expect significantly higher.")
