"use client";
import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getStandard, getNeighbors } from "@/lib/api";

export default function StandardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [std, setStd] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [neighbors, setNeighbors] = useState<{
    nodes: unknown[];
    edges: unknown[];
  } | null>(null);

  useEffect(() => {
    const code = decodeURIComponent(id);
    getStandard(code).then(setStd).catch(console.error);
    getNeighbors(code).then(setNeighbors).catch(console.error);
  }, [id]);

  if (!std) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <span
          className="text-massive-number text-6xl md:text-8xl text-muted/30 font-bold"
          aria-hidden="true"
        >
          ...
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-fg font-medium">
          LOADING STANDARD
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-[95vw] md:max-w-[90vw] lg:max-w-4xl mx-auto px-4 py-10 md:py-16">
      {/* Back link */}
      <a
        href="/"
        className="text-xs uppercase tracking-widest font-bold text-muted-fg hover:text-accent transition-colors duration-200 mb-8 md:mb-12 block"
      >
        ← BACK TO SEARCH
      </a>

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-2 border-border p-6 md:p-10 mb-[2px] relative overflow-hidden"
      >
        {/* Background decorative year */}
        <div
          className="absolute top-2 right-4 md:right-8 pointer-events-none select-none"
          aria-hidden="true"
        >
          <span className="text-massive-number text-[6rem] md:text-[10rem] text-muted/20 leading-none">
            {std.year as number}
          </span>
        </div>

        <div className="relative z-10">
          <span className="is-code text-accent text-base md:text-lg font-semibold">
            {std.is_code as string}: {std.year as number}
          </span>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tighter mt-3 leading-tight font-display text-fg">
            {std.title as string}
          </h1>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <span className="text-xs px-3 py-1.5 border-2 border-border text-muted-fg uppercase tracking-widest font-medium">
              SECTION {std.section as number}: {std.section_name as string}
            </span>
            {std.revision ? (
              <span className="text-xs px-3 py-1.5 border-2 border-accent text-accent uppercase tracking-widest font-bold">
                {String(std.revision)}
              </span>
            ) : null}
            <span className="text-xs px-3 py-1.5 border-2 border-border text-muted-fg uppercase tracking-widest font-medium">
              PDF PAGE {std.page_start as number}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Scope */}
      {std.scope && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border-2 border-border p-6 md:p-8 mb-[2px]"
        >
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-4">
            SCOPE
          </h2>
          <p className="text-base md:text-lg text-muted-fg leading-tight">
            {std.scope as string}
          </p>
        </motion.div>
      )}

      {/* Requirements */}
      {std.requirements && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border-2 border-border p-6 md:p-8 mb-[2px]"
        >
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-4">
            KEY REQUIREMENTS
          </h2>
          <p className="text-base md:text-lg text-muted-fg leading-tight whitespace-pre-wrap">
            {(std.requirements as string).slice(0, 1500)}
          </p>
        </motion.div>
      )}

      {/* Cross-References */}
      {Array.isArray(std.cross_refs) && std.cross_refs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-2 border-border p-6 md:p-8 mb-[2px]"
        >
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-4">
            CROSS-REFERENCES ({std.cross_refs.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {(std.cross_refs as string[]).map((ref) => (
              <a
                key={ref}
                href={`/standard/${encodeURIComponent(ref.split(":")[0].trim())}`}
                className="group is-code text-xs px-3 py-2 border-2 border-border text-muted-fg uppercase tracking-wide hover:bg-accent hover:text-accent-fg hover:border-accent transition-all duration-200"
              >
                {ref}
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Network */}
      {neighbors && (neighbors.nodes as unknown[]).length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border-2 border-border p-6 md:p-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-2">
                NETWORK
              </h2>
              <p className="text-muted-fg text-sm uppercase tracking-widest font-medium">
                {(neighbors.nodes as unknown[]).length - 1} CONNECTED STANDARDS
              </p>
            </div>
            <a
              href="/graph"
              className="text-xs uppercase tracking-widest font-bold text-accent hover:text-fg transition-colors duration-200"
            >
              VIEW IN GRAPH →
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
