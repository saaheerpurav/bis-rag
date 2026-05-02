"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Marquee from "react-fast-marquee";
import { queryStandards, voiceQuery, type QueryResponse } from "@/lib/api";
import ResultCard from "@/components/ResultCard";
import VoiceMic from "@/components/VoiceMic";

const EXAMPLES = [
  "33 Grade Ordinary Portland Cement chemical requirements",
  "Coarse and fine aggregates for structural concrete",
  "Precast concrete pipes for water mains",
  "Hollow lightweight concrete masonry blocks",
  "Portland pozzolana cement fly ash based",
  "Steel reinforcement bars for concrete structures",
];

const STATS = [
  { value: "534", label: "Standards" },
  { value: "1602", label: "Chunks" },
  { value: "100%", label: "Hit Rate" },
  { value: "0.90", label: "MRR @5" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState("");

  const handleSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const res = await queryStandards(q, {
          include_rationale: false,
          include_roadmap: false,
          language,
        });
        setResult(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Query failed. Is the backend running?");
      } finally {
        setLoading(false);
      }
    },
    [language]
  );

  const handleVoice = useCallback(
    async (blob: Blob) => {
      setLoading(true);
      setError("");
      try {
        const res = await voiceQuery(blob, language);
        setQuery(res.transcribed_query || "");
        setResult(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Voice query failed");
      } finally {
        setLoading(false);
      }
    },
    [language]
  );

  return (
    /* Outer wrapper — full height, column, everything centred horizontally */
    <div className="min-h-screen flex flex-col items-center w-full">

      {/* ══════════════ HERO ══════════════ */}
      <section className="w-full max-w-2xl px-8 pt-10 pb-6 md:pt-14 md:pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-hero text-fg">
            BIS
            <br />
            <span className="text-accent">CO-PILOT</span>
          </h1>

          <p className="mt-4 text-base md:text-lg text-muted-fg leading-relaxed">
            Describe your product. Get the exact BIS standards you need, in seconds.
          </p>

          <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-fg/40 font-medium">
            Powered by RAG · SP 21:2005
          </p>
        </motion.div>
      </section>

      {/* ══════════════ STATS TICKER ══════════════ */}
      <div className="w-full border-y border-accent/25 bg-accent py-2 overflow-hidden">
        <Marquee speed={35} gradient={false} autoFill>
          {STATS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 mx-8">
              <span className="font-display font-bold text-sm text-black tracking-tight">
                {s.value}
              </span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-black/50 font-semibold">
                {s.label}
              </span>
              <span className="w-px h-3 bg-black/15 ml-3" aria-hidden="true" />
            </div>
          ))}
        </Marquee>
      </div>

      {/* ══════════════ SEARCH CARD ══════════════ */}
      <section className="w-full max-w-2xl px-8 py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="search-card rounded-xl p-8">

            <p className="text-[10px] text-center uppercase tracking-[0.22em] text-muted-fg/60 font-semibold mb-5">
              Describe your product
            </p>

            {/* Textarea */}
            <div className="bg-bg rounded-lg border border-border px-4 py-3 mb-5 focus-within:border-accent transition-colors duration-200">
              <textarea
                id="search-input"
                className="w-full bg-transparent text-sm md:text-base text-fg placeholder-muted-fg/40 font-display font-medium resize-none outline-none leading-relaxed"
                style={{ minHeight: "80px" }}
                placeholder="e.g. '33 Grade OPC Cement chemical requirements'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch(query);
                  }
                }}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              className="w-full py-4 bg-accent text-black font-display font-bold text-sm rounded-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none transition-all duration-150 mb-5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Searching…
                </span>
              ) : (
                "Find Standards →"
              )}
            </button>

            {/* Voice + language toggle */}
            <div className="flex items-center justify-center gap-4">
              <VoiceMic onResult={handleVoice} language={language} />
              <button
                onClick={() => setLanguage((l) => (l === "en" ? "hi" : "en"))}
                className="text-[11px] px-4 py-2.5 border border-border rounded-lg text-muted-fg uppercase tracking-widest font-semibold hover:bg-muted hover:text-fg hover:border-border-bright active:scale-95 transition-all duration-150"
              >
                {language === "en" ? "🇮🇳 Hindi" : "🇬🇧 English"}
              </button>
            </div>
          </div>

          {/* Example chips */}
          {!result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <p className="text-[9px] text-center uppercase tracking-[0.22em] text-muted-fg/35 font-semibold mb-4">
                Try these
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setQuery(ex); handleSearch(ex); }}
                    className="text-[11px] px-4 py-2 border border-border/60 rounded-md text-muted-fg/60 font-medium hover:bg-accent hover:text-black hover:border-accent active:scale-95 transition-all duration-150"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ══════════════ ERROR ══════════════ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-2xl px-8 mb-6"
          >
            <div className="border border-red-500/40 bg-red-500/8 rounded-lg p-4 text-red-400 text-sm font-medium">
              ⚠ {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ RESULTS ══════════════ */}
      <AnimatePresence>
        {result && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl px-8 pb-20"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-baseline gap-3">
                <span className="font-display font-bold text-3xl text-accent leading-none">
                  {result.results.length}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-fg">Standards Found</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-fg/50">
                    {result.latency_seconds.toFixed(2)}s
                  </p>
                </div>
              </div>
              <a
                href="/graph"
                className="text-[11px] uppercase tracking-widest font-bold text-accent hover:text-fg transition-colors duration-150"
              >
                View Graph →
              </a>
            </div>

            <div className="flex flex-col gap-3">
              {result.results.map((r, i) => (
                <ResultCard key={r.is_code_formatted} result={r} index={i} query={result.query} />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ══════════════ FOOTER ══════════════ */}
      {!result && (
        <div className="w-full mt-auto border-t border-border/20 py-3 overflow-hidden">
          <Marquee speed={20} gradient={false} autoFill>
            <span className="text-[10px] uppercase tracking-[0.28em] font-medium text-muted-fg/15 mx-10 select-none" aria-hidden="true">
              BIS Compliance
            </span>
            <span className="text-muted-fg/10 mx-6 text-xs select-none" aria-hidden="true">◆</span>
            <span className="text-[10px] uppercase tracking-[0.28em] font-medium text-muted-fg/15 mx-10 select-none" aria-hidden="true">
              Co-Pilot
            </span>
            <span className="text-muted-fg/10 mx-6 text-xs select-none" aria-hidden="true">◆</span>
          </Marquee>
        </div>
      )}
    </div>
  );
}
