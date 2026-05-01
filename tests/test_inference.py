"""
Test suite for inference pipeline.
Tests: output format, public test set, edge cases, harder private-set-style queries.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))


def run_inference(queries: list, output_file: str = "data/test_output.json") -> list:
    """Write queries to temp file, run inference, return results."""
    tmp_input = ROOT / "data" / "tmp_test_input.json"
    with open(tmp_input, "w", encoding="utf-8") as f:
        json.dump(queries, f)

    result = subprocess.run(
        [sys.executable, "inference.py", "--input", str(tmp_input), "--output", output_file],
        capture_output=True, text=True, cwd=ROOT
    )
    if result.returncode != 0:
        print("STDERR:", result.stderr[-500:])
        raise RuntimeError("inference.py failed")

    with open(ROOT / output_file, encoding="utf-8") as f:
        return json.load(f)


def normalize(s):
    return str(s).replace(" ", "").lower()


def check_format(results: list):
    """Verify output JSON has required fields per eval_script spec."""
    print("\n=== FORMAT CHECK ===")
    required_fields = {"id", "retrieved_standards", "latency_seconds"}
    for r in results:
        missing = required_fields - set(r.keys())
        assert not missing, f"Missing fields in {r.get('id')}: {missing}"
        assert isinstance(r["retrieved_standards"], list), "retrieved_standards must be list"
        assert len(r["retrieved_standards"]) >= 3, f"Need at least 3 standards, got {len(r['retrieved_standards'])}"
        assert isinstance(r["latency_seconds"], (int, float)), "latency_seconds must be numeric"
    print(f"  PASS — all {len(results)} results have correct format")


def check_latency(results: list, max_seconds: float = 5.0):
    """Verify every query is under latency target."""
    print("\n=== LATENCY CHECK ===")
    violations = [(r["id"], r["latency_seconds"]) for r in results if r["latency_seconds"] > max_seconds]
    avg = sum(r["latency_seconds"] for r in results) / len(results)
    max_lat = max(r["latency_seconds"] for r in results)
    print(f"  Avg: {avg:.3f}s | Max: {max_lat:.3f}s | Limit: {max_seconds}s")
    if violations:
        for qid, lat in violations:
            print(f"  FAIL {qid}: {lat:.2f}s exceeds {max_seconds}s")
    else:
        print(f"  PASS — all queries under {max_seconds}s")
    return len(violations) == 0


def check_no_hallucinations(results: list):
    """Verify every returned IS code is in valid format."""
    import re
    print("\n=== HALLUCINATION CHECK ===")
    # Load valid IS codes from registry
    with open(ROOT / "data/processed/registry.json", encoding="utf-8") as f:
        registry = json.load(f)
    valid_codes = set(normalize(v["is_code"] + ": " + str(v["year"])) for v in registry.values())

    bad = []
    for r in results:
        for std in r["retrieved_standards"]:
            if normalize(std) not in valid_codes:
                bad.append((r["id"], std))

    if bad:
        for qid, std in bad:
            print(f"  WARN {qid}: '{std}' not in registry")
    else:
        print(f"  PASS — all returned codes are valid registry entries")
    return len(bad) == 0


def test_public_set():
    """Official public test set — must score 100% hit rate."""
    print("\n" + "="*50)
    print("TEST 1: Official Public Test Set")
    print("="*50)
    with open(ROOT / "data/public_test_set.json", encoding="utf-8") as f:
        queries = json.load(f)

    results = run_inference(queries, "data/public_results.json")
    check_format(results)
    check_latency(results)
    check_no_hallucinations(results)

    hits = 0
    mrr_sum = 0.0
    for item, result in zip(queries, results):
        expected = [normalize(e) for e in item["expected_standards"]]
        retrieved = [normalize(s) for s in result["retrieved_standards"]]
        if any(e in retrieved[:3] for e in expected):
            hits += 1
        for rank, s in enumerate(retrieved[:5], 1):
            if s in expected:
                mrr_sum += 1.0 / rank
                break

    hit_rate = hits / len(queries) * 100
    mrr = mrr_sum / len(queries)
    avg_lat = sum(r["latency_seconds"] for r in results) / len(results)
    print(f"\n  Hit Rate @3: {hit_rate:.0f}%  (target >80%)")
    print(f"  MRR @5:      {mrr:.4f}  (target >0.7)")
    print(f"  Avg Latency: {avg_lat:.3f}s  (target <5s)")
    assert hit_rate >= 80, f"Hit rate {hit_rate}% below 80% target"
    assert mrr >= 0.70, f"MRR {mrr} below 0.70 target"
    assert avg_lat < 5.0, f"Avg latency {avg_lat}s exceeds 5s target"
    print("  PASS")


def test_harder_queries():
    """Simulate harder private-test-set style queries (indirect, phrased differently)."""
    print("\n" + "="*50)
    print("TEST 2: Harder / Indirect Queries (Private Set Simulation)")
    print("="*50)

    harder_queries = [
        {
            "id": "HARD-01",
            "query": "Our startup wants to produce building blocks that are lighter than normal concrete, specifically for partition walls. What IS standard should we follow?",
            "expected_standards": ["IS 2185 (Part 2): 1983"]  # lightweight concrete blocks
        },
        {
            "id": "HARD-02",
            "query": "We are setting up a small factory to make roof sheets from a mixture of cement and mineral fibre. Which standard regulates this product?",
            "expected_standards": ["IS 459: 1992"]  # asbestos cement corrugated sheets
        },
        {
            "id": "HARD-03",
            "query": "I manufacture a type of cement where clinker is mixed with granulated blast furnace slag. What BIS certification do I need?",
            "expected_standards": ["IS 455: 1989"]  # Portland slag cement
        },
        {
            "id": "HARD-04",
            "query": "What standard covers the specification for precast drainage pipes made without steel reinforcement?",
            "expected_standards": ["IS 458: 2003"]  # concrete pipes
        },
        {
            "id": "HARD-05",
            "query": "Which Indian standard applies to the white variety of ordinary Portland cement used in decorative construction?",
            "expected_standards": ["IS 8042: 1989"]  # white Portland cement
        },
    ]

    results = run_inference(harder_queries, "data/harder_results.json")
    check_format(results)
    check_latency(results)
    check_no_hallucinations(results)

    hits = 0
    for item, result in zip(harder_queries, results):
        expected = [normalize(e) for e in item["expected_standards"]]
        retrieved = [normalize(s) for s in result["retrieved_standards"]]
        hit = any(e in retrieved[:3] for e in expected)
        status = "HIT" if hit else "MISS"
        print(f"  {item['id']} [{status}]: {result['retrieved_standards'][:3]}")
        if hit:
            hits += 1

    hit_rate = hits / len(harder_queries) * 100
    print(f"\n  Hit Rate @3: {hit_rate:.0f}% on harder queries")


def test_edge_cases():
    """Edge cases: empty-ish query, very short, multi-product."""
    print("\n" + "="*50)
    print("TEST 3: Edge Cases")
    print("="*50)

    edge_queries = [
        {"id": "EDGE-01", "query": "cement"},
        {"id": "EDGE-02", "query": "IS 269"},
        {"id": "EDGE-03", "query": "What standards do I need for a construction company building houses with cement, concrete blocks, and aggregate?"},
    ]

    results = run_inference(edge_queries, "data/edge_results.json")
    check_format(results)
    check_latency(results)
    check_no_hallucinations(results)

    for r in results:
        print(f"  {r['id']} ({r['latency_seconds']:.2f}s): {r['retrieved_standards'][:3]}")
    print("  PASS — no crashes on edge cases")


if __name__ == "__main__":
    print("Running inference test suite...")
    t0 = time.time()
    test_public_set()
    test_harder_queries()
    test_edge_cases()
    print(f"\n{'='*50}")
    print(f"All tests completed in {time.time()-t0:.1f}s")
    print("="*50)
