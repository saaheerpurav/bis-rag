"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StandardResult } from "@/lib/api";

interface Props {
  result: StandardResult;
  index: number;
  query: string;
}

export default function ResultCard({ result, index }: Props) {
  const [expanded, setExpanded] = useState(index === 0);
  const confidence = Math.round(result.confidence * 100);
  const indexDisplay = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="group bg-bg"
    >
      {/* Header — click to expand */}
      {/* [FIX #12] focus-visible ring for keyboard nav */}
      <button
        className="w-full text-left p-6 md:p-8 flex items-start justify-between gap-4 md:gap-8 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset transition-all duration-300"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-4 md:gap-6 flex-1 min-w-0">
          {/* Massive index number */}
          <span
            className="text-massive-number text-4xl md:text-6xl lg:text-7xl text-muted group-hover:text-accent-fg transition-colors duration-300 flex-shrink-0 leading-none"
            aria-hidden="true"
          >
            {indexDisplay}
          </span>

          <div className="min-w-0 pt-1">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <span className="is-code text-accent group-hover:text-accent-fg font-semibold transition-colors duration-300">
                {result.is_code_formatted}
              </span>
              <span className="text-xs px-2 py-0.5 border-2 border-border text-muted-fg uppercase tracking-widest font-medium group-hover:border-accent-fg/30 group-hover:text-accent-fg transition-colors duration-300">
                {result.section_name}
              </span>
            </div>
            <p className="text-fg text-base md:text-xl lg:text-2xl font-bold uppercase tracking-tight mt-2 leading-tight group-hover:text-accent-fg transition-colors duration-300">
              {result.title}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-fg font-bold group-hover:text-accent-fg transition-colors duration-300">
            {confidence}% MATCH
          </span>
          <div className="w-16 md:w-24 h-[3px] bg-border group-hover:bg-accent-fg/30 transition-colors duration-300">
            <div
              className="confidence-bar group-hover:bg-accent-fg"
              style={{ width: `${Math.min(confidence, 100)}%` }}
            />
          </div>
          <span
            className="text-muted-fg text-xl md:text-2xl font-bold group-hover:text-accent-fg transition-all duration-300 mt-1"
            aria-hidden="true"
          >
            {expanded ? "−" : "+"}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* [FIX #10] Consistent padding: p-6 md:p-8 */}
            <div className="px-6 md:px-8 pb-6 md:pb-8 border-t-2 border-border pt-6 space-y-6">
              {/* Rationale */}
              {result.rationale && (
                <div>
                  <h4 className="text-xs font-bold text-muted-fg uppercase tracking-widest mb-3">
                    WHY THIS STANDARD
                  </h4>
                  {/* [FIX #2] Rationale body — brighter for readability */}
                  <p className="text-base md:text-lg text-fg/70 leading-relaxed">
                    {result.rationale}
                  </p>
                </div>
              )}

              {/* Roadmap */}
              {result.roadmap && (
                <div className="border-2 border-border p-6 md:p-8 space-y-5">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-widest">
                    COMPLIANCE ROADMAP
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-fg mb-1">
                        LICENSE
                      </p>
                      <p className="text-base md:text-lg text-fg font-bold uppercase tracking-tight">
                        {result.roadmap.license_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-fg mb-1">
                        TIMELINE
                      </p>
                      <p className="text-base md:text-lg text-fg font-bold uppercase tracking-tight">
                        {result.roadmap.timeline_weeks} WKS
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-fg mb-1">
                        COST
                      </p>
                      <p className="text-base md:text-lg text-accent font-bold tracking-tight">
                        {result.roadmap.estimated_cost_inr}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-fg mb-1">
                        YEAR
                      </p>
                      <p className="text-base md:text-lg text-fg font-bold uppercase tracking-tight">
                        {result.year}
                      </p>
                    </div>
                  </div>

                  {result.roadmap.required_tests?.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-fg mb-2">
                        REQUIRED TESTS
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {result.roadmap.required_tests.map((t) => (
                          <li
                            key={t}
                            className="text-xs px-3 py-1.5 border-2 border-border text-muted-fg uppercase tracking-wide font-medium"
                          >
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.roadmap.msme_tip && (
                    <div className="border-l-4 border-accent pl-4 py-2">
                      <p className="text-xs md:text-sm text-accent uppercase tracking-wide font-medium">
                        💡 {result.roadmap.msme_tip}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cross-refs */}
              {result.cross_refs?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-fg uppercase tracking-widest mb-3">
                    RELATED STANDARDS
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.cross_refs.map((ref) => (
                      <span
                        key={ref}
                        className="is-code text-xs px-3 py-1.5 border-2 border-border text-muted-fg uppercase tracking-wide"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Source link */}
              {/* [FIX #10] Fixed duplicate pt class */}
              <div className="flex items-center gap-6 border-t-2 border-border pt-4">
                <span className="text-xs uppercase tracking-widest text-muted-fg font-medium">
                  PDF PAGE {result.page_start}
                </span>
                <a
                  href={`/standard/${encodeURIComponent(result.is_code)}`}
                  className="text-xs uppercase tracking-widest font-bold text-accent hover:text-fg transition-colors duration-200"
                >
                  VIEW FULL STANDARD →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
