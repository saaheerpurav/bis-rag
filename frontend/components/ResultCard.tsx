"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StandardResult } from "@/lib/api";

interface Props {
  result: StandardResult;
  index: number;
  query: string;
}

const SECTION_COLORS: Record<number, string> = {
  1: "indigo", 2: "violet", 3: "blue", 4: "green", 5: "yellow",
  6: "emerald", 7: "orange", 8: "pink", 9: "cyan", 10: "teal",
  14: "red", 15: "rose", 16: "amber",
};

const colorClass = (section: number) => {
  const c = SECTION_COLORS[section] || "slate";
  return `bg-${c}-500/10 text-${c}-400 border-${c}-500/20`;
};

export default function ResultCard({ result, index, query }: Props) {
  const [expanded, setExpanded] = useState(index === 0);
  const confidence = Math.round(result.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        className="w-full text-left p-5 flex items-start justify-between gap-4 group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="is-code text-indigo-300 font-semibold">{result.is_code_formatted}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass(result.section)}`}>
                {result.section_name}
              </span>
            </div>
            <p className="text-white font-medium mt-1 leading-tight">{result.title}</p>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-xs text-[var(--muted)]">{confidence}% match</span>
          <div className="w-20 h-1 rounded bg-[var(--card-border)]">
            <div
              className="confidence-bar"
              style={{ width: `${Math.min(confidence, 100)}%` }}
            />
          </div>
          <span className="text-[var(--muted)] text-lg group-hover:text-white transition-colors mt-1">
            {expanded ? "↑" : "↓"}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[var(--card-border)] pt-4 space-y-4">
              {/* Rationale */}
              {result.rationale && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Why this standard
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.rationale}</p>
                </div>
              )}

              {/* Roadmap */}
              {result.roadmap && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    Compliance Roadmap
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--muted)] text-xs mb-1">License Type</p>
                      <p className="text-white">{result.roadmap.license_type}</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted)] text-xs mb-1">Est. Timeline</p>
                      <p className="text-white">{result.roadmap.timeline_weeks} weeks</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted)] text-xs mb-1">Approx. Cost</p>
                      <p className="text-green-400">{result.roadmap.estimated_cost_inr}</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted)] text-xs mb-1">Year</p>
                      <p className="text-white">{result.year}</p>
                    </div>
                  </div>
                  {result.roadmap.required_tests?.length > 0 && (
                    <div>
                      <p className="text-[var(--muted)] text-xs mb-2">Required Tests</p>
                      <ul className="flex flex-wrap gap-2">
                        {result.roadmap.required_tests.map((t) => (
                          <li key={t} className="text-xs px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300">
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.roadmap.msme_tip && (
                    <p className="text-xs text-yellow-300/80 bg-yellow-500/5 rounded-lg p-2 border border-yellow-500/10">
                      💡 {result.roadmap.msme_tip}
                    </p>
                  )}
                </div>
              )}

              {/* Cross-refs */}
              {result.cross_refs?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Related Standards
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.cross_refs.map((ref) => (
                      <span key={ref} className="is-code text-xs px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)]">
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Source link */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs text-[var(--muted)]">PDF page {result.page_start}</span>
                <a
                  href={`/standard/${encodeURIComponent(result.is_code)}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
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
