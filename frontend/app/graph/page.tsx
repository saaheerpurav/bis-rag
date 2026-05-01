"use client";
import { useEffect, useRef, useState } from "react";
import { getGraph, type GraphData, type GraphNode } from "@/lib/api";
import * as d3 from "d3";

const SECTION_COLORS: Record<number, string> = {
  1: "#DFE104", 2: "#A1A1AA", 3: "#FAFAFA", 4: "#DFE104", 5: "#A1A1AA",
  6: "#FAFAFA", 7: "#DFE104", 8: "#A1A1AA", 9: "#FAFAFA", 10: "#DFE104",
  14: "#A1A1AA", 15: "#FAFAFA", 16: "#DFE104", 17: "#A1A1AA",
};
const sectionColor = (s: number) => SECTION_COLORS[s] || "#3F3F46";

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
      if (
        search &&
        !n.is_code.toLowerCase().includes(search.toLowerCase()) &&
        !n.title.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graph.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const g = svg.append("g");

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (e) => {
          g.attr("transform", e.transform.toString());
        })
    );

    const sim = d3
      .forceSimulation(filteredNodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(filteredEdges)
          .id((d: d3.SimulationNodeDatum) => (d as GraphNode).id)
          .distance(60)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(14));

    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredEdges)
      .join("line")
      .attr("class", "graph-link");

    const dragHandler = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart();
        (d as GraphNode & d3.SimulationNodeDatum).fx = e.x;
        (d as GraphNode & d3.SimulationNodeDatum).fy = e.y;
      })
      .on("drag", (e, d) => {
        (d as GraphNode & d3.SimulationNodeDatum).fx = e.x;
        (d as GraphNode & d3.SimulationNodeDatum).fy = e.y;
      })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        (d as GraphNode & d3.SimulationNodeDatum).fx = null;
        (d as GraphNode & d3.SimulationNodeDatum).fy = null;
      });

    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .attr("class", "graph-node")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(dragHandler as any);

    node
      .append("circle")
      .attr("r", 6)
      .attr("fill", (d) => sectionColor(d.section))
      .attr("fill-opacity", 0.8)
      .on("click", (_, d) => setSelected(d));

    node
      .append("title")
      .text((d) => `${d.is_code}: ${d.year}\n${d.title}`);

    node
      .filter(() => filteredNodes.length < 150)
      .append("text")
      .attr("class", "graph-label")
      .attr("x", 9)
      .attr("dy", "0.35em")
      .text((d) => d.is_code.replace("IS ", ""));

    sim.on("tick", () => {
      link
        .attr(
          "x1",
          (d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) =>
            ((d.source as GraphNode & d3.SimulationNodeDatum).x ?? 0)
        )
        .attr(
          "y1",
          (d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) =>
            ((d.source as GraphNode & d3.SimulationNodeDatum).y ?? 0)
        )
        .attr(
          "x2",
          (d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) =>
            ((d.target as GraphNode & d3.SimulationNodeDatum).x ?? 0)
        )
        .attr(
          "y2",
          (d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) =>
            ((d.target as GraphNode & d3.SimulationNodeDatum).y ?? 0)
        );
      node.attr(
        "transform",
        (d) =>
          `translate(${(d as GraphNode & d3.SimulationNodeDatum).x ?? 0},${(d as GraphNode & d3.SimulationNodeDatum).y ?? 0})`
      );
    });

    return () => {
      sim.stop();
    };
  }, [graph, filter, search]);

  const sections = graph
    ? [...new Set(graph.nodes.map((n) => n.section))].sort((a, b) => a - b)
    : [];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-bg border-b-2 border-border flex-wrap">
        <input
          className="bg-transparent border-b-2 border-border focus:border-accent px-0 py-2 text-sm md:text-base text-fg placeholder-muted font-display font-bold uppercase tracking-tighter outline-none w-48 md:w-64 transition-colors"
          placeholder="SEARCH IS CODE..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-bg border-2 border-border px-3 py-2 text-xs md:text-sm text-fg uppercase tracking-widest font-bold outline-none appearance-none cursor-pointer hover:border-accent transition-colors"
          value={filter ?? ""}
          onChange={(e) =>
            setFilter(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">ALL SECTIONS</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              SECTION {s}
            </option>
          ))}
        </select>
        {graph && (
          <span className="text-xs uppercase tracking-widest text-muted-fg font-medium ml-auto">
            {graph.stats.node_count} STANDARDS · {graph.stats.edge_count} EDGES
          </span>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative bg-bg">
        {!graph && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <span className="text-massive-number text-6xl md:text-8xl text-muted/30 font-bold" aria-hidden="true">
              ...
            </span>
            <span className="text-xs uppercase tracking-widest text-muted-fg font-medium">
              LOADING GRAPH
            </span>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />

        {/* Selected node panel */}
        {selected && (
          <div className="absolute top-4 right-4 bg-bg border-2 border-border p-5 md:p-6 w-72 md:w-80">
            <button
              onClick={() => setSelected(null)}
              className="float-right text-muted-fg hover:text-accent text-xl font-bold transition-colors"
              aria-label="Close panel"
            >
              ×
            </button>
            <p className="is-code text-accent font-semibold text-sm">
              {selected.is_code}: {selected.year}
            </p>
            <p className="text-fg text-base md:text-lg font-bold uppercase tracking-tight mt-2 leading-tight">
              {selected.title}
            </p>
            <p className="text-xs uppercase tracking-widest text-muted-fg mt-3">
              {selected.section_name}
            </p>
            <p className="text-xs uppercase tracking-widest text-muted-fg mt-1">
              PDF PAGE {selected.page_start}
            </p>
            <a
              href={`/standard/${encodeURIComponent(selected.is_code)}`}
              className="block mt-4 text-xs uppercase tracking-widest font-bold text-accent hover:text-fg transition-colors duration-200"
            >
              VIEW FULL STANDARD →
            </a>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 md:p-4 bg-bg border-t-2 border-border flex gap-4 md:gap-6 flex-wrap text-xs">
        {Object.entries(SECTION_COLORS)
          .slice(0, 8)
          .map(([s, color]) => (
            <span
              key={s}
              className="flex items-center gap-2 text-muted-fg uppercase tracking-widest font-medium"
            >
              <span
                className="w-3 h-3"
                style={{ background: color }}
                aria-hidden="true"
              />
              §{s}
            </span>
          ))}
        <span className="text-muted-fg uppercase tracking-widest font-medium">
          · DRAG · SCROLL · CLICK
        </span>
      </div>
    </div>
  );
}
