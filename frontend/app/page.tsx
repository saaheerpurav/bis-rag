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
  "Asbestos cement corrugated roofing sheets",
  "White Portland cement decorative purposes",
];

const STATS = [
  { value: "534", label: "STANDARDS" },
  { value: "1602", label: "CHUNKS" },
  { value: "100%", label: "HIT RATE" },
  { value: "0.28s", label: "LATENCY" },
  { value: "27", label: "SECTIONS" },
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
        const res = await queryStandards(q, {
          include_rationale: true,
          include_roadmap: true,
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
    <div className="min-h-screen flex flex-col">
      {/* ============================================
          HERO — Massive viewport-width typography
          ============================================ */}
      <motion.section
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="relative flex flex-col items-center justify-center px-4 pt-12 md:pt-20 pb-6 overflow-hidden"
      >
        {/* Background decorative number */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          aria-hidden="true"
        >
          <span className="text-massive-number text-[8rem] md:text-[14rem] lg:text-[20rem] text-muted/40">
            534
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center"
        >
          <h1 className="text-hero text-fg">
            BIS
            <br />
            <span className="text-accent">CO-PILOT</span>
          </h1>
          <p className="mt-6 md:mt-8 text-lg md:text-xl lg:text-2xl text-muted-fg max-w-2xl mx-auto font-medium leading-tight tracking-tight">
            Describe your product. Get the exact BIS standards you need — in seconds.
          </p>
          <p className="mt-2 text-xs md:text-sm uppercase tracking-widest text-muted-fg/60 font-medium">
            Powered by RAG · SP 21:2005
          </p>
        </motion.div>
      </motion.section>

      {/* ============================================
          STATS MARQUEE — High energy scrolling stats
          ============================================ */}
      <div className="border-y-2 border-border bg-accent py-3 md:py-4 overflow-hidden">
        <Marquee speed={80} gradient={false} autoFill>
          {STATS.map((stat, i) => (
            <div key={i} className="flex items-center gap-3 mx-6 md:mx-10">
              <span className="font-display font-bold text-2xl md:text-4xl text-accent-fg tracking-tighter">
                {stat.value}
              </span>
              <span className="text-xs md:text-sm uppercase tracking-widest text-accent-fg/70 font-medium">
                {stat.label}
              </span>
              <span className="text-accent-fg/30 text-2xl" aria-hidden="true">
                ◆
              </span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* ============================================
          SEARCH — Brutalist oversized input
          ============================================ */}
      <section className="w-full max-w-[95vw] md:max-w-[90vw] lg:max-w-5xl mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Search box */}
          <div className="border-2 border-border bg-bg p-6 md:p-8">
            <label
              htmlFor="search-input"
              className="block text-xs uppercase tracking-widest text-muted-fg font-medium mb-4"
            >
              DESCRIBE YOUR PRODUCT
            </label>
            <textarea
              id="search-input"
              className="w-full bg-transparent text-xl md:text-2xl lg:text-3xl text-fg placeholder-muted font-display font-bold uppercase tracking-tighter resize-none outline-none min-h-[100px] md:min-h-[120px] leading-tight border-b-2 border-border focus:border-accent transition-colors pb-4"
              placeholder="E.G. '33 GRADE OPC CEMENT CHEMICAL REQUIREMENTS'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch(query);
                }
              }}
            />

            <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <VoiceMic onResult={handleVoice} language={language} />
                <button
                  onClick={() => setLanguage((l) => (l === "en" ? "hi" : "en"))}
                  className="text-xs md:text-sm px-4 py-2.5 border-2 border-border text-muted-fg uppercase tracking-widest font-bold hover:bg-fg hover:text-bg hover:border-fg transition-all duration-200"
                >
                  {language === "en" ? "🇮🇳 HINDI" : "🇬🇧 ENGLISH"}
                </button>
              </div>

              <button
                onClick={() => handleSearch(query)}
                disabled={loading || !query.trim()}
                className="px-8 md:px-12 py-4 md:py-5 bg-accent text-accent-fg font-display font-bold text-sm md:text-base uppercase tracking-tighter hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 flex items-center gap-3"
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    SEARCHING...
                  </span>
                ) : (
                  "FIND STANDARDS →"
                )}
              </button>
            </div>
          </div>

          {/* Example chips */}
          {!result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 md:mt-8"
            >
              <p className="text-xs uppercase tracking-widest text-muted-fg/60 font-medium mb-3">
                TRY THESE
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setQuery(ex);
                      handleSearch(ex);
                    }}
                    className="text-xs px-4 py-2 border-2 border-border text-muted-fg uppercase tracking-wide font-medium hover:bg-accent hover:text-accent-fg hover:border-accent transition-all duration-200"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ============================================
          ERROR STATE
          ============================================ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto max-w-[95vw] md:max-w-[90vw] lg:max-w-5xl px-4 mb-8"
          >
            <div className="border-2 border-red-500 bg-red-500/10 p-4 md:p-6 text-red-400 text-sm md:text-base font-medium uppercase tracking-wide">
              ⚠ {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================
          RESULTS — Kinetic result cards
          ============================================ */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[95vw] md:max-w-[90vw] lg:max-w-5xl mx-auto px-4 pb-20 md:pb-32 w-full"
          >
            {/* Results header */}
            <div className="flex items-center justify-between mb-6 md:mb-8 border-b-2 border-border pb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-massive-number text-4xl md:text-6xl text-accent font-bold">
                  {result.results.length}
                </span>
                <div>
                  <p className="text-sm md:text-base uppercase tracking-widest font-bold text-fg">
                    STANDARDS FOUND
                  </p>
                  <p className="text-xs uppercase tracking-widest text-muted-fg">
                    {result.latency_seconds.toFixed(2)}s LATENCY
                  </p>
                </div>
              </div>
              <a
                href="/graph"
                className="text-xs md:text-sm uppercase tracking-widest font-bold text-accent hover:text-fg transition-colors duration-200"
              >
                VIEW GRAPH →
              </a>
            </div>

            {/* Result cards */}
            <div className="grid gap-[2px] bg-border">
              {result.results.map((r, i) => (
                <ResultCard
                  key={r.is_code_formatted}
                  result={r}
                  index={i}
                  query={result.query}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================
          FOOTER MARQUEE
          ============================================ */}
      {!result && (
        <div className="mt-auto border-t-2 border-border py-6 overflow-hidden">
          <Marquee speed={40} gradient={false} autoFill>
            <span className="text-section text-muted/20 mx-4 select-none" aria-hidden="true">
              BIS COMPLIANCE
            </span>
            <span className="text-section text-accent/20 mx-4 select-none" aria-hidden="true">
              ◆
            </span>
            <span className="text-section text-muted/20 mx-4 select-none" aria-hidden="true">
              CO-PILOT
            </span>
            <span className="text-section text-accent/20 mx-4 select-none" aria-hidden="true">
              ◆
            </span>
          </Marquee>
        </div>
      )}
    </div>
  );
}
