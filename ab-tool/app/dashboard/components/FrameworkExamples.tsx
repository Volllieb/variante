'use client'

import { ChevronDown } from 'lucide-react'
import { AB_JS_INTEGRITY } from '@/lib/snippetCode'

const examples = [
  {
    label: 'Next.js App Router',
    file: 'app/layout.tsx',
    code: `// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.getvariante.com" crossorigin />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="${AB_JS_INTEGRITY}" crossorigin="anonymous"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}`,
  },
  {
    label: 'Next.js Pages Router',
    file: 'pages/_document.tsx',
    code: `// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://www.getvariante.com" crossorigin />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="${AB_JS_INTEGRITY}" crossorigin="anonymous"></script>
      </Head>
      <body><Main /><NextScript /></body>
    </Html>
  )
}`,
  },
  {
    label: 'Plain HTML',
    file: '<head>',
    code: `<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://www.getvariante.com" crossorigin>
  <style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
  <script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
  <script async src="https://www.getvariante.com/ab.js" integrity="${AB_JS_INTEGRITY}" crossorigin="anonymous"><\/script>
</head>
<body><!-- your content --></body>
</html>`,
  },
]

export function FrameworkExamples() {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Framework examples</p>
      {examples.map(({ label, file, code }) => (
        <details key={label} className="group rounded-[6px] border border-border [&_summary]:list-none">
          <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2.5 text-[11px] font-semibold text-text-2 transition-colors hover:text-text">
            <span>{label}</span>
            <span className="flex items-center gap-2">
              <code className="rounded-[5px] bg-bg-2 px-2 py-0.5 font-mono text-[11px] text-text-3">
                {file}
              </code>
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <pre className="overflow-x-auto border-t border-border px-3 py-3 text-[10px] leading-relaxed text-text-3">
{code}
          </pre>
        </details>
      ))}
    </div>
  )
}
