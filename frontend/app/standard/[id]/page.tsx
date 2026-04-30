"use client";
import { use, useEffect, useState } from "react";
import { getStandard, getNeighbors } from "@/lib/api";

export default function StandardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [std, setStd] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [neighbors, setNeighbors] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  useEffect(() => {
    const code = decodeURIComponent(id);
    getStandard(code).then(setStd).catch(console.error);
    getNeighbors(code).then(setNeighbors).catch(console.error);
  }, [id]);

  if (!std) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <a href="/" className="text-sm text-[var(--muted)] hover:text-white mb-6 block">← Back to search</a>

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="is-code text-indigo-300 text-xl font-bold">{std.is_code as string}: {std.year as number}</span>
            <h1 className="text-white text-2xl font-bold mt-2">{std.title as string}</h1>
            <p className="text-[var(--muted)] text-sm mt-1">
              Section {std.section as number}: {std.section_name as string}
              {std.revision ? <span className="ml-2">· {String(std.revision)}</span> : null}
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            PDF Page {std.page_start as number}
          </span>
        </div>
      </div>

      {std.scope && (
        <div className="glass rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Scope</h2>
          <p className="text-gray-300 text-sm leading-relaxed">{std.scope as string}</p>
        </div>
      )}

      {std.requirements && (
        <div className="glass rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Key Requirements</h2>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{(std.requirements as string).slice(0, 1500)}</p>
        </div>
      )}

      {Array.isArray(std.cross_refs) && std.cross_refs.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            Cross-References ({std.cross_refs.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {(std.cross_refs as string[]).map((ref) => (
              <a
                key={ref}
                href={`/standard/${encodeURIComponent(ref.split(":")[0].trim())}`}
                className="is-code text-xs px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-indigo-400 hover:border-indigo-500/50 transition-all"
              >
                {ref}
              </a>
            ))}
          </div>
        </div>
      )}

      {neighbors && (neighbors.nodes as unknown[]).length > 1 && (
        <div className="mt-4 glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            Network ({(neighbors.nodes as unknown[]).length - 1} connected standards)
          </h2>
          <a href="/graph" className="text-sm text-indigo-400 hover:text-indigo-300">
            View in Knowledge Graph →
          </a>
        </div>
      )}
    </div>
  );
}
