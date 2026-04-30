import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BIS Compliance Co-pilot",
  description: "AI-powered BIS Standards Recommendation Engine for Indian MSEs",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--card-border)] px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-[var(--accent)] font-bold text-lg">⬡</span>
            <span className="font-semibold text-sm tracking-wide">BIS Co-pilot</span>
          </a>
          <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
            <a href="/" className="hover:text-white transition-colors">Search</a>
            <a href="/graph" className="hover:text-white transition-colors">Graph</a>
          </div>
        </nav>
        <main className="pt-14">
          {children}
        </main>
      </body>
    </html>
  );
}
