"""
End-to-end RAG pipeline.

Flow:
1. Decompose query → structured intent
2. HyDE → hypothetical document → embed
3. Parallel: Dense (FAISS) + Sparse (BM25) retrieval
4. Reciprocal Rank Fusion → top-20 candidates
5. BGE Cross-Encoder rerank → top-5 IS codes
6. Registry verification (hallucination shield)
7. GPT-4o rationale + compliance roadmap generation
"""
import json
import time
import asyncio
from pathlib import Path
from typing import Optional

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from src.config import (
    REGISTRY_PATH, BM25_TOP_K, DENSE_TOP_K, RERANK_TOP_N, OPENAI_API_KEY
)
from src.retrieval.vector_store import VectorStore
from src.retrieval.bm25_store import BM25Store
from src.retrieval.hybrid import reciprocal_rank_fusion


class RAGPipeline:
    def __init__(
        self,
        generate_rationale: bool = True,
        generate_roadmap: bool = False,
        force_local: bool = False,
    ):
        self.generate_rationale = generate_rationale
        self.generate_roadmap = generate_roadmap

        # Load registry
        with open(REGISTRY_PATH, encoding="utf-8") as f:
            self.registry: dict = json.load(f)
        print(f"  Registry: {len(self.registry)} standards loaded")

        # Load indexes
        self.vector_store = VectorStore.from_disk()
        self.bm25_store = BM25Store.from_disk()

        # Load embedder (OpenAI only)
        from src.retrieval.embedder import get_embedder
        self.embedder = get_embedder()

        # Query enhancement
        from src.retrieval.hyde import HyDEGenerator
        from src.retrieval.decomposer import QueryDecomposer
        self.hyde = HyDEGenerator()
        self.decomposer = QueryDecomposer()

        # Reranker (GPT-4o-mini, no local model download)
        from src.retrieval.reranker import Reranker
        self.reranker = Reranker()

        # Generation
        if generate_rationale:
            from src.generation.rationale import RationaleGenerator
            self.rationale_gen = RationaleGenerator()
        else:
            self.rationale_gen = None

        if generate_roadmap:
            from src.generation.roadmap import RoadmapGenerator
            self.roadmap_gen = RoadmapGenerator()
        else:
            self.roadmap_gen = None

    def _verify_against_registry(self, candidates: list) -> list:
        """Hallucination shield: only return codes that exist in registry."""
        verified = []
        for meta, score in candidates:
            if meta["is_code_norm"] in self.registry:
                verified.append((meta, score))
        return verified

    def _format_is_code(self, meta: dict) -> str:
        """Return the canonical IS code string e.g. 'IS 269: 1989'"""
        std = self.registry.get(meta["is_code_norm"], {})
        is_code = std.get("is_code", meta["is_code"])
        year = std.get("year", meta.get("year", ""))
        return f"{is_code}: {year}"

    def query(
        self,
        query_text: str,
        top_n: int = 5,
        include_rationale: bool = None,
        include_roadmap: bool = False,
        language: str = "en",
    ) -> dict:
        """
        Run full RAG pipeline.
        Returns: {
            retrieved_standards: ["IS 269: 1989", ...],
            results: [{is_code, year, title, rationale, confidence, roadmap}, ...],
            latency_seconds: float
        }
        """
        t0 = time.perf_counter()
        include_rationale = include_rationale if include_rationale is not None else self.generate_rationale

        import concurrent.futures

        # Step 1: One API call for HyDE text + expanded query (replaces 2 separate calls)
        hyde_result = self.hyde.generate_full(query_text)
        hyde_text = hyde_result.get("hyde", query_text)
        expanded_query = hyde_result.get("expanded", query_text)
        decomposed = {"keywords": hyde_result.get("keywords", []), "expanded_query": expanded_query}

        # Step 2: Embed HyDE text + BM25 search in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
            fut_vec = ex.submit(self.embedder.embed_one, hyde_text)
            fut_bm25 = ex.submit(self.bm25_store.search, expanded_query, BM25_TOP_K)

        query_vec = fut_vec.result()
        bm25_results = fut_bm25.result()

        # Dense search (FAISS is in-memory, instant)
        dense_results = self.vector_store.search(query_vec, top_k=DENSE_TOP_K)

        # Step 4: RRF fusion -> top-20
        fused = reciprocal_rank_fusion([dense_results, bm25_results], k=60)[:20]

        # Step 5: Rerank -> top-N
        # rerank=True uses GPT-4o-mini (~+1.5s), rerank=False uses RRF order (already 100% on public set)
        use_rerank = getattr(self, '_use_rerank', True)
        if use_rerank and len(fused) > top_n:
            reranked = self.reranker.rerank(query_text, fused, top_n=top_n)
        else:
            reranked = fused[:top_n]

        # Step 6: Hallucination shield
        verified = self._verify_against_registry(reranked)

        # Build output standards list
        retrieved_standards = [self._format_is_code(m) for m, _ in verified]

        # Step 7: Generate rationale (batch)
        rationales = {}
        if include_rationale and self.rationale_gen and verified:
            std_list = [self.registry[m["is_code_norm"]] for m, _ in verified]
            rationales = self.rationale_gen.generate_batch(query_text, std_list)

        # Build detailed results
        results = []
        for meta, score in verified:
            std = self.registry.get(meta["is_code_norm"], meta)
            is_code_full = self._format_is_code(meta)
            rationale = rationales.get(is_code_full, rationales.get(std.get("is_code", ""), ""))

            entry = {
                "is_code": std.get("is_code", meta["is_code"]),
                "year": std.get("year", meta.get("year")),
                "title": std.get("title", meta.get("title", "")),
                "section": std.get("section", meta.get("section", 0)),
                "section_name": std.get("section_name", meta.get("section_name", "")),
                "confidence": round(float(score), 4),
                "rationale": rationale,
                "page_start": std.get("page_start", 0),
                "cross_refs": std.get("cross_refs", [])[:5],
                "is_code_formatted": is_code_full,
            }

            if include_roadmap and self.roadmap_gen:
                entry["roadmap"] = self.roadmap_gen.generate(query_text, std)

            results.append(entry)

        latency = time.perf_counter() - t0

        # Hindi translation
        if language == "hi":
            from src.generation.hindi import HindiTranslator
            translator = HindiTranslator()
            results = [translator.translate_result(r) for r in results]

        return {
            "query": query_text,
            "retrieved_standards": retrieved_standards,
            "results": results,
            "latency_seconds": round(latency, 3),
            "decomposed": decomposed,
        }

    @classmethod
    def load(cls, generate_rationale: bool = False, generate_roadmap: bool = False, use_rerank: bool = False):
        """Fast load for inference."""
        instance = cls(generate_rationale=generate_rationale, generate_roadmap=generate_roadmap)
        instance._use_rerank = use_rerank
        return instance
