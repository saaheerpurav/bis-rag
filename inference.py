"""
BIS Compliance Co-pilot: Judge Entry Point
==========================================

Usage:
    python inference.py --input public_test_set.json --output team_results.json
    python inference.py --input hidden_private_dataset.json --output team_results.json

Pipeline (fully local, zero API calls):
    1. fastembed bge-small-en-v1.5 (ONNX) embeds the query locally (~80ms, CPU only)
    2. BM25 sparse retrieval runs in parallel (~5ms)
    3. Per-list deduplication by IS code prevents multi-chunk score inflation
    4. Reciprocal Rank Fusion (RRF k=60) merges dense + sparse ranked lists
    5. Hallucination shield: verifies every IS code against the parsed registry
    6. Returns top-5 IS codes with latency

Input JSON schema:
    [{"id": "Q1", "query": "product description", "expected_standards": [...]}]

Output JSON schema (strict, matches eval_script.py):
    [{"id": "Q1", "query": "...", "expected_standards": [...],
      "retrieved_standards": ["IS 269: 1989", ...], "latency_seconds": 0.28}]

Requirements:
    - pip install -r requirements.txt
    - data/processed/ indexes (pre-built, included in repo)
    - No API key needed. No GPU needed. No internet connection needed.
"""
import argparse
import json
import sys
import time
from pathlib import Path

# Ensure project root on path
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))


def parse_args():
    parser = argparse.ArgumentParser(description="BIS RAG Inference")
    parser.add_argument("--input", required=True, help="Path to input JSON file")
    parser.add_argument("--output", required=True, help="Path to output JSON file")
    parser.add_argument("--top-n", type=int, default=5, help="Number of standards to retrieve")
    return parser.parse_args()


def main():
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    # Load queries
    with open(input_path, encoding="utf-8") as f:
        queries = json.load(f)
    print(f"Loaded {len(queries)} queries from {input_path}")

    # Initialize pipeline
    print("Initializing RAG pipeline...")
    t_init = time.perf_counter()
    try:
        from src.pipeline import RAGPipeline
        pipeline = RAGPipeline.load(generate_rationale=False, generate_roadmap=False)
    except Exception as e:
        print(f"ERROR: Failed to initialize pipeline: {e}")
        sys.exit(1)
    print(f"Pipeline ready in {time.perf_counter() - t_init:.1f}s")

    # Run inference
    results = []
    total_start = time.perf_counter()

    for i, item in enumerate(queries):
        query_id = item.get("id", f"Q{i+1}")
        query_text = item.get("query", "")
        expected = item.get("expected_standards", [])

        print(f"[{i+1}/{len(queries)}] {query_id}: {query_text[:80]}...")
        t0 = time.perf_counter()

        try:
            result = pipeline.query(query_text, top_n=args.top_n)
            retrieved = result["retrieved_standards"]
            latency = result["latency_seconds"]
        except Exception as e:
            print(f"  ERROR on {query_id}: {e}")
            retrieved = []
            latency = time.perf_counter() - t0

        output_item = {
            "id": query_id,
            "query": query_text,
            "expected_standards": expected,
            "retrieved_standards": retrieved,
            "latency_seconds": round(latency, 3),
        }
        results.append(output_item)
        print(f"  -> {retrieved[:3]} ({latency:.2f}s)")

    total_time = time.perf_counter() - total_start

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {len(results)} results -> {output_path}")
    print(f"  Total time: {total_time:.1f}s | Avg: {total_time/len(results):.2f}s/query")


if __name__ == "__main__":
    main()
