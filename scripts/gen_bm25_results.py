"""Generate results file from BM25 for eval_script testing."""
import sys, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.retrieval.bm25_store import BM25Store

bm25 = BM25Store.from_disk()

with open("data/public_test_set.json", encoding="utf-8") as f:
    tests = json.load(f)

results = []
for item in tests:
    t0 = time.perf_counter()
    raw = bm25.search(item["query"], top_k=15)
    seen = {}
    for meta, score in raw:
        key = meta["is_code_norm"]
        if key not in seen:
            seen[key] = (meta, score)
    deduped = list(seen.values())[:5]
    latency = time.perf_counter() - t0
    retrieved = [f"{m['is_code']}: {m['year']}" for m, _ in deduped]
    results.append({
        "id": item["id"],
        "query": item["query"],
        "expected_standards": item["expected_standards"],
        "retrieved_standards": retrieved,
        "latency_seconds": round(latency, 3),
    })

with open("data/bm25_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("Saved data/bm25_results.json")
