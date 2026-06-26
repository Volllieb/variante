import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AB Spike – Client-Site",
  description: "Simuliert die fremde Client-Site für den AB-Testing-Spike",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* AB-Testing V2.1 — universeller Snippet (auf jeder Seite identisch).
            Anti-Flicker versteckt die Seite, bis ab.js die aktive Variante auflöst.
            Selektor & Ziel kommen serverseitig über /api/resolve. */}
        <link rel="preconnect" href="https://ab-tool-pied.vercel.app" />
        <style
          id="__ab_hide"
          dangerouslySetInnerHTML={{ __html: `html.__ab_pending{opacity:0!important}` }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              `document.documentElement.classList.add("__ab_pending");` +
              `(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();` +
              `setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)`,
          }}
        />
        <script async src="https://ab-tool-pied.vercel.app/ab.js" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
