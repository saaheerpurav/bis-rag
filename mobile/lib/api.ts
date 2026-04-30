const BASE = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8000"; // Android emulator

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
}

export async function queryStandards(
  query: string,
  opts?: { top_n?: number; language?: "en" | "hi"; include_roadmap?: boolean }
): Promise<QueryResponse> {
  const res = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      top_n: opts?.top_n ?? 5,
      include_rationale: true,
      include_roadmap: opts?.include_roadmap ?? true,
      language: opts?.language ?? "en",
    }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
  return res.json();
}

export async function voiceQuery(
  audioUri: string,
  language: "en" | "hi" = "en"
): Promise<QueryResponse & { transcribed_query: string }> {
  const formData = new FormData();
  formData.append("file", {
    uri: audioUri,
    name: "voice.m4a",
    type: "audio/m4a",
  } as unknown as Blob);

  const res = await fetch(`${BASE}/voice?language=${language}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Voice query failed");
  return res.json();
}
