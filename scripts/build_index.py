"""
One-shot script: parse PDF -> registry -> chunks -> FAISS -> BM25 -> graph.
Run once: python scripts/build_index.py
"""
import sys
import json
import shutil
import numpy as np
from pathlib import Path
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.config import (
    DATASET_PDF, REGISTRY_PATH, CHUNKS_PATH, GRAPH_PATH,
    FAISS_OPENAI_PATH, FAISS_META_PATH, BM25_PATH, DATA_RAW,
)
from src.ingestion.pdf_parser import parse_pdf, save_registry, save_chunks
from src.ingestion.graph_builder import build_graph


def main():
    # Copy dataset.pdf to data/raw if not there
    src_pdf = Path(__file__).parent.parent.parent / "stuff" / "dataset.pdf"
    if src_pdf.exists() and not DATASET_PDF.exists():
        DATASET_PDF.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_pdf, DATASET_PDF)
        print(f"Copied dataset.pdf -> {DATASET_PDF}")

    if not DATASET_PDF.exists():
        print(f"ERROR: dataset.pdf not found at {DATASET_PDF}")
        print("Place dataset.pdf in data/raw/")
        sys.exit(1)

    print("\n[1/5] Parsing PDF...")
    standards = parse_pdf(DATASET_PDF)
    print(f"  Parsed {len(standards)} standards")

    print("\n[2/5] Saving registry and chunks...")
    save_registry(standards, REGISTRY_PATH)
    save_chunks(standards, CHUNKS_PATH)

    print("\n[3/5] Building Knowledge Graph...")
    with open(REGISTRY_PATH, encoding="utf-8") as f:
        registry = json.load(f)
    build_graph(registry, GRAPH_PATH)

    print("\n[4/5] Building FAISS index (OpenAI embeddings)...")
    from src.retrieval.embedder import get_embedder
    from src.retrieval.vector_store import VectorStore

    chunks = []
    with open(CHUNKS_PATH, encoding="utf-8") as f:
        for line in f:
            chunks.append(json.loads(line))

    embedder = get_embedder()
    texts = [c["text"] for c in chunks]
    print(f"  Embedding {len(texts)} chunks with {embedder.__class__.__name__}...")
    vectors = embedder.embed_batch(texts, batch_size=100)

    store = VectorStore(dim=embedder.dim)
    meta_list = [
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
    store.add(vectors, meta_list)
    store.save()

    print("\n[5/5] Building BM25 index...")
    from src.retrieval.bm25_store import BM25Store
    bm25 = BM25Store()
    bm25.build(chunks)
    bm25.save()

    print("\nOK Index build complete!")
    print(f"  Registry:  {REGISTRY_PATH}")
    print(f"  Chunks:    {CHUNKS_PATH}")
    print(f"  Graph:     {GRAPH_PATH}")
    print(f"  FAISS:     {FAISS_OPENAI_PATH}")
    print(f"  BM25:      {BM25_PATH}")


if __name__ == "__main__":
    main()
