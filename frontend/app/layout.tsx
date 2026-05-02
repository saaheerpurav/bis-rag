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
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>

        {/* Navbar — clean, properly spaced */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border/50 px-6 md:px-12 lg:px-16 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <span className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center font-bold text-accent-fg text-xs group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
              B
            </span>
            <span className="font-display font-bold text-sm uppercase tracking-widest text-fg">
              BIS Co-pilot
            </span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/" className="text-xs uppercase tracking-widest font-semibold text-muted-fg hover:text-accent transition-colors duration-200">
              Search
            </a>
            <a href="/graph" className="text-xs uppercase tracking-widest font-semibold text-muted-fg hover:text-accent transition-colors duration-200">
              Graph
            </a>
          </div>
        </nav>

        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
