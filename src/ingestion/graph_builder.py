"""
Build a Knowledge Graph of BIS standards from cross-references.
Nodes = IS standards, Edges = cross-reference / supersedes relationships.
"""
import json
import re
from pathlib import Path
import networkx as nx

CROSS_REF_RE = re.compile(
    r"IS\s+([\d]+(?:\s*\(Part\s*[\d]+\))?)\s*:\s*(\d{4})",
    re.IGNORECASE,
)


def build_graph(registry: dict, out_path: Path):
    G = nx.DiGraph()

    # Add all nodes
    for norm_code, std in registry.items():
        G.add_node(
            std["is_code"],
            is_code=std["is_code"],
            year=std["year"],
            title=std["title"],
            section=std["section"],
            section_name=std["section_name"],
            page_start=std["page_start"],
        )

    # Build a lookup: normalized code -> canonical is_code
    code_lookup = {}
    for norm_code, std in registry.items():
        code_lookup[norm_code] = std["is_code"]
        # also index by number only
        num_only = re.sub(r"[^\d]", "", std["is_code"])
        if num_only not in code_lookup:
            code_lookup[num_only] = std["is_code"]

    def find_canonical(raw_ref: str) -> str | None:
        num_only = re.sub(r"[^\d]", "", raw_ref)
        # try normalized full ref first
        norm = re.sub(r"[\s:\-()]", "", raw_ref).lower()
        if norm in code_lookup:
            return code_lookup[norm]
        # try number+year
        if norm in code_lookup:
            return code_lookup[norm]
        # fallback: number only
        if num_only in code_lookup:
            return code_lookup[num_only]
        return None

    # Add edges from cross_refs
    edge_count = 0
    for norm_code, std in registry.items():
        src = std["is_code"]
        for ref in std.get("cross_refs", []):
            target = find_canonical(ref)
            if target and target != src and G.has_node(target):
                G.add_edge(src, target, relation="references")
                edge_count += 1

    print(f"  Graph: {G.number_of_nodes()} nodes, {edge_count} edges")

    # Serialize to JSON (Cytoscape/D3 compatible)
    data = {
        "nodes": [
            {
                "id": n,
                **G.nodes[n],
            }
            for n in G.nodes
        ],
        "edges": [
            {
                "source": u,
                "target": v,
                "relation": G.edges[u, v].get("relation", "references"),
            }
            for u, v in G.edges
        ],
        "stats": {
            "node_count": G.number_of_nodes(),
            "edge_count": G.number_of_edges(),
            "sections": len(set(d["section"] for _, d in G.nodes(data=True))),
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved graph -> {out_path}")
    return G


def load_graph(graph_path: Path) -> dict:
    with open(graph_path, encoding="utf-8") as f:
        return json.load(f)
