const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface StandardResult {
  is_code: string;
  year: number;
  title: string;
  section: number;
  section_name: string;
  confidence: number;
  rationale?: string;
  roadmap?: RoadmapData;
  page_start: number;
  cross_refs: string[];
  is_code_formatted: string;
}

export interface RoadmapData {
  license_type: string;
  required_tests: string[];
  estimated_cost_inr: string;
  timeline_weeks: number;
  key_labs: string[];
  msme_tip: string;
}

export interface QueryResponse {
  query: string;
  retrieved_standards: string[];
  results: StandardResult[];
  latency_seconds: number;
  decomposed?: Record<string, string>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { node_count: number; edge_count: number; sections: number };
}

export interface GraphNode {
  id: string;
  is_code: string;
  year: number;
  title: string;
  section: number;
  section_name: string;
  page_start: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export async function queryStandards(
  query: string,
  options?: {
    top_n?: number;
    include_rationale?: boolean;
    include_roadmap?: boolean;
    language?: "en" | "hi";
  }
): Promise<QueryResponse> {
  const res = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      top_n: options?.top_n ?? 5,
      include_rationale: options?.include_rationale ?? true,
      include_roadmap: options?.include_roadmap ?? false,
      language: options?.language ?? "en",
    }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
  return res.json();
}

export async function voiceQuery(
  audioBlob: Blob,
  language: "en" | "hi" = "en"
): Promise<QueryResponse & { transcribed_query: string }> {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice.webm");
  const res = await fetch(`${BASE}/voice?language=${language}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Voice query failed");
  return res.json();
}

export async function getGraph(): Promise<GraphData> {
  const res = await fetch(`${BASE}/graph`);
  if (!res.ok) throw new Error("Graph fetch failed");
  return res.json();
}

export async function getStandard(code: string) {
  const res = await fetch(`${BASE}/standard/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error("Standard not found");
  return res.json();
}

export async function getNeighbors(isCode: string, depth = 1) {
  const res = await fetch(`${BASE}/graph/neighbors/${encodeURIComponent(isCode)}?depth=${depth}`);
  if (!res.ok) throw new Error("Neighbors fetch failed");
  return res.json();
}

export async function listStandards(section?: number, search?: string) {
  const params = new URLSearchParams();
  if (section !== undefined) params.set("section", String(section));
  if (search) params.set("search", search);
  params.set("limit", "200");
  const res = await fetch(`${BASE}/standards?${params}`);
  if (!res.ok) throw new Error("Standards list failed");
  return res.json();
}
