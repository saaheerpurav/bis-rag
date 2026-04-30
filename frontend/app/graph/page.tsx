"use client";
import { useEffect, useRef, useState } from "react";
import { getGraph, type GraphData, type GraphNode } from "@/lib/api";
import * as d3 from "d3";

const SECTION_COLORS: Record<number, string> = {
  1: "#6366f1", 2: "#8b5cf6", 3: "#3b82f6", 4: "#22c55e", 5: "#eab308",
  6: "#10b981", 7: "#f97316", 8: "#ec4899", 9: "#06b6d4", 10: "#14b8a6",
  14: "#ef4444", 15: "#f43f5e", 16: "#f59e0b", 17: "#84cc16",
};
const sectionColor = (s: number) => SECTION_COLORS[s] || "#64748b";

export default function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<number | null>(null);

  useEffect(() => {
    getGraph().then(setGraph).catch(console.error);
  }, []);

  useEffect(() => {
    if (!graph || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 600;

    const filteredNodes = graph.nodes.filter((n) => {
      if (filter !== null && n.section !== filter) return false;
      if (search && !n.is_code.toLowerCase().includes(search.toLowerCase()) &&
          !n.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graph.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on("zoom", (e) => {
        g.attr("transform", e.transform.toString());
      })
    );

    const sim = d3.forceSimulation(filteredNodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(filteredEdges).id((d: d3.SimulationNodeDatum) => (d as GraphNode).id).distance(60))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(14));

    const link = g.append("g").attr("class", "links")
      .selectAll("line")
      .data(filteredEdges)
      .join("line")
      .attr("class", "graph-link");

    const dragHandler = d3.drag<SVGGElement, GraphNode>()
      .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); (d as GraphNode & d3.SimulationNodeDatum).fx = e.x; (d as GraphNode & d3.SimulationNodeDatum).fy = e.y; })
      .on("drag", (e, d) => { (d as GraphNode & d3.SimulationNodeDatum).fx = e.x; (d as GraphNode & d3.SimulationNodeDatum).fy = e.y; })
      .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); (d as GraphNode & d3.SimulationNodeDatum).fx = null; (d as GraphNode & d3.SimulationNodeDatum).fy = null; });

    const node = g.append("g").attr("class", "nodes")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .attr("class", "graph-node")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(dragHandler as any);

    node.append("circle")
      .attr("r", 6)
      .attr("fill", (d) => sectionColor(d.section))
      .attr("fill-opacity", 0.8)
      .on("click", (_, d) => setSelected(d));

    node.append("title").text((d) => `${d.is_code}: ${d.year}\n${d.title}`);

    node.filter((d) => filteredNodes.length < 150)
      .append("text")
      .attr("class", "graph-label")
      .attr("x", 9)
      .attr("dy", "0.35em")
      .text((d) => d.is_code.replace("IS ", ""));

    sim.on("tick", () => {
      link
        .attr("x1", (d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) => ((d.source as GraphNode & d3.SimulationNodeDatum).x ?? 0))
        .attr("y1", (d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) => ((d.source as GraphNode & d3.SimulationNodeDatum).y ?? 0))
        .attr("x2", (d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) => ((d.target as GraphNode & d3.SimulationNodeDatum).x ?? 0))
        .attr("y2", (d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) => ((d.target as GraphNode & d3.SimulationNodeDatum).y ?? 0));
      node.attr("transform", (d) => `translate(${(d as GraphNode & d3.SimulationNodeDatum).x ?? 0},${(d as GraphNode & d3.SimulationNodeDatum).y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [graph, filter, search]);

  const sections = graph ? [...new Set(graph.nodes.map((n) => n.section))].sort((a, b) => a - b) : [];

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-3 p-3 glass border-b border-[var(--card-border)] flex-wrap">
        <input
          className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[var(--muted)] outline-none w-52"
          placeholder="Search IS code or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={filter ?? ""}
          onChange={(e) => setFilter(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s} value={s}>Section {s}</option>
          ))}
        </select>
        {graph && (
          <span className="text-xs text-[var(--muted)] ml-auto">
            {graph.stats.node_count} standards · {graph.stats.edge_count} edges
          </span>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative">
        {!graph && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)]">
            Loading graph...
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />

        {/* Selected node panel */}
        {selected && (
          <div className="absolute top-4 right-4 glass rounded-xl p-4 w-72 shadow-xl">
            <button
              onClick={() => setSelected(null)}
              className="float-right text-[var(--muted)] hover:text-white text-lg"
            >
              ×
            </button>
            <p className="is-code text-indigo-300 font-semibold">{selected.is_code}: {selected.year}</p>
            <p className="text-white text-sm font-medium mt-1">{selected.title}</p>
            <p className="text-xs text-[var(--muted)] mt-2">{selected.section_name}</p>
            <p className="text-xs text-[var(--muted)]">PDF page {selected.page_start}</p>
            <a
              href={`/standard/${encodeURIComponent(selected.is_code)}`}
              className="block mt-3 text-xs text-indigo-400 hover:text-indigo-300"
            >
              View full standard →
            </a>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 glass border-t border-[var(--card-border)] flex gap-3 flex-wrap text-xs">
        {Object.entries(SECTION_COLORS).slice(0, 8).map(([s, color]) => (
          <span key={s} className="flex items-center gap-1.5 text-[var(--muted)]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            §{s}
          </span>
        ))}
        <span className="text-[var(--muted)]">· Drag, scroll to zoom, click to inspect</span>
      </div>
    </div>
  );
}
