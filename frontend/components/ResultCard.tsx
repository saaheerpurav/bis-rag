"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyseStandard } from "@/lib/api";
import type { StandardResult, RoadmapData } from "@/lib/api";

interface Props {
  result: StandardResult;
  index: number;
  query: string;
}

export default function ResultCard({ result, index, query }: Props) {
  const [expanded, setExpanded] = useState(index === 0);
  const [rationale, setRationale] = useState<string | null>(result.rationale ?? null);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(result.roadmap ?? null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const confidence = Math.round(result.confidence * 100);
  const indexDisplay = String(index + 1).padStart(2, "0");

  const fetchAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const res = await analyseStandard(query, result.is_code_norm);
      if (res.rationale) setRationale(res.rationale);
      if (res.roadmap) setRoadmap(res.roadmap);
    } catch {
      setRationale("Analysis unavailable. Is the backend running with an LLM configured?");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-surface border border-border rounded-lg overflow-hidden"
    >
      {/* ── Card header ── */}
      <button
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset transition-colors duration-150"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="font-mono text-xl font-bold text-border flex-shrink-0 leading-none mt-0.5">
            {indexDisplay}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-accent text-sm font-semibold tracking-wide">
                {result.is_code_formatted}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 border border-border/60 text-muted-fg/70 rounded font-medium">
                {result.section_name}
              </span>
            </div>
            <p className="text-fg text-sm md:text-base font-semibold leading-snug">
              {result.title}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-fg font-semibold">{confidence}% match</span>
          <div className="w-12 h-[2px] bg-border rounded-full">
            <div className="confidence-bar rounded-full" style={{ width: `${Math.min(confidence, 100)}%` }} />
          </div>
          <span className="text-muted-fg text-base font-bold mt-1">
            {expanded ? "−" : "+"}
          </span>
        </div>
      </button>

      {/* ── Expanded body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 border-t border-border space-y-4">

              {/* AI Analysis — on demand */}
              {!rationale && !roadmap && (
                <button
                  onClick={fetchAnalysis}
                  disabled={loadingAnalysis}
                  className="text-xs px-4 py-2 border border-accent/40 rounded-md text-accent font-semibold hover:bg-accent hover:text-black transition-colors duration-150 disabled:opacity-40"
                >
                  {loadingAnalysis ? "Loading analysis…" : "✦ Get AI Analysis"}
                </button>
              )}

              {/* Rationale */}
              {rationale && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-fg/60 font-semibold mb-1.5">
                    Why this standard
                  </p>
                  <p className="text-sm text-fg/80 leading-relaxed">{rationale}</p>
                </div>
              )}

              {/* Roadmap */}
              {roadmap && (
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <p className="text-[10px] uppercase tracking-widest text-accent font-semibold">
                    Compliance Roadmap
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Licence", value: roadmap.license_type },
                      { label: "Timeline", value: `${roadmap.timeline_weeks} weeks` },
                      { label: "Est. Cost", value: roadmap.estimated_cost_inr },
                      { label: "Year", value: String(result.year) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] uppercase tracking-widest text-muted-fg/50 mb-0.5">{label}</p>
                        <p className="text-sm text-fg font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>

                  {roadmap.required_tests?.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-fg/50 mb-2">Required tests</p>
                      <div className="flex flex-wrap gap-1.5">
                        {roadmap.required_tests.map((t) => (
                          <span key={t} className="text-[10px] px-2.5 py-1 border border-border rounded text-muted-fg">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {roadmap.msme_tip && (
                    <div className="border-l-2 border-accent pl-3">
                      <p className="text-xs text-muted-fg leading-relaxed">💡 {roadmap.msme_tip}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cross-refs */}
              {result.cross_refs?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-fg/60 font-semibold mb-2">
                    Related standards
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.cross_refs.map((ref) => (
                      <span key={ref} className="font-mono text-xs px-2.5 py-1 border border-border rounded text-muted-fg">
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-5 border-t border-border pt-3">
                <span className="text-[10px] text-muted-fg/50">Page {result.page_start}</span>
                <a
                  href={`/standard/${encodeURIComponent(result.is_code)}`}
                  className="text-xs font-semibold text-accent hover:text-fg transition-colors duration-150"
                >
                  View full standard →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
