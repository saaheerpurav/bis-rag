"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
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
  { value: "534", label: "STANDARDS" },
  { value: "1602", label: "CHUNKS" },
  { value: "100%", label: "HIT RATE" },
  { value: "0.90", label: "MRR @5" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState("");

  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.15]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  const handleSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const res = await queryStandards(q, { include_rationale: true, include_roadmap: true, language });
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
    <div className="min-h-screen flex flex-col items-center w-full">

      {/* ===== HERO ===== */}
      <motion.section
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="w-full relative flex flex-col items-center px-6 pt-24 md:pt-32 lg:pt-40 pb-10 md:pb-16"
      >
        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <span className="text-massive-number text-[8rem] md:text-[14rem] lg:text-[20rem] text-muted/[0.06]">534</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center mt-32"
        >
          <h1 className="text-hero text-fg break-words text-center">
            BIS<br /><span className="text-accent">CO-PILOT</span>
          </h1>

          {/* Subtitle — high contrast, clearly readable */}
          <p className="mt-5 md:mt-6 text-base md:text-lg lg:text-xl text-fg/90 max-w-xl text-center font-normal leading-relaxed">
            Describe your product. Get the exact BIS standards you need — in seconds.
          </p>

          {/* Debug line — subtle */}
          <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-muted-fg/40 font-medium text-center">
            Powered by RAG · SP 21:2005
          </p>
        </motion.div>
      </motion.section>

      {/* ===== STATS MARQUEE ===== */}
      <div className="w-full border-y border-accent/30 bg-accent py-3 md:py-3.5 overflow-hidden">
        <Marquee speed={50} gradient={false} autoFill>
          {STATS.map((stat, i) => (
            <div key={i} className="flex items-center gap-3 mx-12 md:mx-16">
              <span className="font-display font-bold text-lg md:text-2xl text-accent-fg tracking-tighter">
                {stat.value}
              </span>
              <span className="text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-accent-fg/50 font-semibold">
                {stat.label}
              </span>
              <span className="w-[1px] h-4 bg-accent-fg/20 ml-6" aria-hidden="true" />
            </div>
          ))}
        </Marquee>
      </div>

      {/* ===== SEARCH SECTION ===== */}
      <section className="w-full max-w-4xl mx-auto px-6 md:px-8 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Search card — elevated surface with visible border + shadow */}
          <div className="search-card rounded-lg p-8 md:p-12">

            <label
              htmlFor="search-input"
              className="block text-[11px] text-center uppercase tracking-[0.2em] text-muted-fg/70 font-semibold mb-5"
            >
              Describe your product
            </label>

            {/* Input — visible background, clear border */}
            <div className="bg-bg rounded-md border border-border-bright px-5 py-4 mb-8 focus-within:border-accent transition-colors duration-200">
              <textarea
                id="search-input"
                className="w-full bg-transparent text-base md:text-lg text-fg placeholder-muted-fg/30 font-display font-semibold uppercase tracking-tight resize-none outline-none min-h-[72px] md:min-h-[88px] leading-relaxed"
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

            {/* CTA button — full width, big, unmissable */}
            <button
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              className="w-full py-4 md:py-5 bg-accent text-accent-fg font-display font-bold text-base md:text-lg uppercase tracking-tight rounded-md hover:brightness-110 hover:shadow-[0_0_20px_rgba(223,225,4,0.2)] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 mb-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Searching...
                </span>
              ) : (
                "Find Standards →"
              )}
            </button>

            {/* Secondary actions — voice + language */}
            <div className="flex items-center justify-center gap-3">
              <VoiceMic onResult={handleVoice} language={language} />
              <button
                onClick={() => setLanguage((l) => (l === "en" ? "hi" : "en"))}
                className="text-[11px] px-4 py-2.5 border border-border rounded-md text-muted-fg uppercase tracking-widest font-semibold hover:bg-muted hover:text-fg hover:border-border-bright active:scale-95 transition-all duration-200"
              >
                {language === "en" ? "🇮🇳 Hindi" : "🇬🇧 English"}
              </button>
            </div>
          </div>

          {/* Suggestion chips */}
          {!result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 md:mt-10"
            >
              <p className="text-[10px] text-center uppercase tracking-[0.2em] text-muted-fg/40 font-semibold mb-4">
                Try these
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setQuery(ex); handleSearch(ex); }}
                    className="text-[11px] px-3.5 py-1.5 border border-border rounded-md text-muted-fg/70 uppercase tracking-wide font-medium hover:bg-accent hover:text-accent-fg hover:border-accent active:scale-95 transition-all duration-200"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ===== ERROR ===== */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full mx-auto max-w-4xl px-6 md:px-8 mb-8"
          >
            <div className="border border-red-500/50 bg-red-500/10 rounded-lg p-5 text-red-400 text-sm font-medium">
              ⚠ {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== RESULTS ===== */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto px-6 md:px-8 pb-20 md:pb-32 w-full"
          >
            <div className="flex items-center justify-between mb-6 md:mb-8 border-b border-border pb-4">
              <div className="flex items-baseline gap-4">
                <span className="text-massive-number text-4xl md:text-5xl text-accent font-bold">
                  {result.results.length}
                </span>
                <div>
                  <p className="text-sm uppercase tracking-widest font-bold text-fg">Standards Found</p>
                  <p className="text-xs uppercase tracking-widest text-muted-fg/60">
                    {result.latency_seconds.toFixed(2)}s latency
                  </p>
                </div>
              </div>
              <a href="/graph" className="text-xs uppercase tracking-widest font-bold text-accent hover:text-fg transition-colors duration-200">
                View Graph →
              </a>
            </div>
            <div className="grid gap-[1px] bg-border/50 rounded-lg overflow-hidden">
              {result.results.map((r, i) => (
                <ResultCard key={r.is_code_formatted} result={r} index={i} query={result.query} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FOOTER MARQUEE ===== */}
      {!result && (
        <div className="w-full mt-auto border-t border-border/50 py-6 overflow-hidden">
          <Marquee speed={40} gradient={false} autoFill>
            <span className="text-section text-muted/[0.12] mx-6 select-none" aria-hidden="true">BIS COMPLIANCE</span>
            <span className="text-section text-accent/[0.08] mx-6 select-none" aria-hidden="true">◆</span>
            <span className="text-section text-muted/[0.12] mx-6 select-none" aria-hidden="true">CO-PILOT</span>
            <span className="text-section text-accent/[0.08] mx-6 select-none" aria-hidden="true">◆</span>
          </Marquee>
        </div>
      )}
    </div>
  );
}
