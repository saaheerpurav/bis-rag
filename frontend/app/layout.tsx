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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* Noise texture overlay */}
        <svg className="noise-overlay" aria-hidden="true">
          <title>Background texture</title>
          <filter id="noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>

        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/90 backdrop-blur-sm border-b-2 border-border px-4 md:px-8 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <span
              className="w-8 h-8 bg-accent flex items-center justify-center font-bold text-accent-fg text-sm"
              aria-hidden="true"
            >
              B
            </span>
            <span className="font-display font-bold text-sm md:text-base uppercase tracking-widest text-fg">
              BIS Co-pilot
            </span>
          </a>
          <div className="flex items-center gap-4 md:gap-8">
            <a
              href="/"
              className="text-xs md:text-sm uppercase tracking-widest font-medium text-muted-fg hover:text-accent transition-colors duration-200"
            >
              Search
            </a>
            <a
              href="/graph"
              className="text-xs md:text-sm uppercase tracking-widest font-medium text-muted-fg hover:text-accent transition-colors duration-200"
            >
              Graph
            </a>
          </div>
        </nav>

        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
