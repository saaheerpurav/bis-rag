"""
Reciprocal Rank Fusion (RRF) to merge dense + sparse results.
"""
from typing import List, Tuple


def reciprocal_rank_fusion(
    ranked_lists: List[List[Tuple[dict, float]]],
    k: int = 60,
) -> List[Tuple[dict, float]]:
    """
    Fuse multiple ranked lists using RRF.
    Each entry is (metadata_dict, score).
    Groups by is_code_norm to deduplicate across chunk types.
    """
    rrf_scores: dict[str, float] = {}
    best_meta: dict[str, dict] = {}

    for ranked in ranked_lists:
        for rank, (meta, _) in enumerate(ranked, start=1):
            key = meta["is_code_norm"]
            rrf_scores[key] = rrf_scores.get(key, 0.0) + 1.0 / (k + rank)
            # Keep the best (scope chunk preferred) meta
            if key not in best_meta or meta.get("chunk_type") == "scope":
                best_meta[key] = meta

    fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [(best_meta[key], score) for key, score in fused]
