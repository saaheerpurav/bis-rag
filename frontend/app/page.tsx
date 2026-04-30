"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

export default function Home() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSearch = useCallback(async (q: string) => {
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
  }, [language]);

  const handleVoice = useCallback(async (blob: Blob) => {
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
  }, [language]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-4 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            BIS Compliance Co-pilot
          </h1>
          <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">
            Describe your product. Get the exact BIS standards you need — in seconds.
          </p>
          <p className="text-xs text-[var(--muted)] mt-2">Powered by RAG · 534 Standards · SP 21:2005</p>
        </motion.div>

        {/* Search box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-2xl"
        >
          <div className="glass rounded-2xl p-4 glow">
            <div className="flex items-start gap-3">
              <textarea
                className="flex-1 bg-transparent text-sm text-white placeholder-[var(--muted)] resize-none outline-none min-h-[80px]"
                placeholder="E.g. 'We manufacture 33 grade OPC cement. What BIS standard covers physical and chemical requirements?'"
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
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--card-border)]">
              <div className="flex items-center gap-3">
                <VoiceMic onResult={handleVoice} language={language} />
                <button
                  onClick={() => setLanguage(l => l === "en" ? "hi" : "en")}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--card-border)] text-[var(--muted)] hover:text-white hover:border-indigo-500 transition-all"
                >
                  {language === "en" ? "🇮🇳 Switch to Hindi" : "🇬🇧 Switch to English"}
                </button>
              </div>
              <button
                onClick={() => handleSearch(query)}
                disabled={loading || !query.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all flex items-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Searching...
                  </span>
                ) : "Find Standards →"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Example chips */}
        {!result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl"
          >
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); handleSearch(ex); }}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--card-border)] text-[var(--muted)] hover:text-white hover:border-indigo-500 transition-all"
              >
                {ex}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto max-w-2xl px-4 mb-6"
          >
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto px-4 pb-16 w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--muted)]">
                <span className="text-white font-medium">{result.results.length}</span> standards found
                <span className="ml-2 text-xs">· {result.latency_seconds.toFixed(2)}s</span>
              </p>
              <a
                href="/graph"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View Knowledge Graph →
              </a>
            </div>

            <div className="grid gap-4">
              {result.results.map((r, i) => (
                <ResultCard key={r.is_code_formatted} result={r} index={i} query={result.query} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
