'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * Hero-Demo-Video: bettet die GSAP-Animation als Video-Player-ähnliches
 * Element ein. Synchronisiert das Overlay via postMessage mit der
 * tatsächlichen GSAP-Timeline — kein blindes Timeout mehr.
 */
export function LandingDemo() {
  const [revealed, setRevealed] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Listen for the iframe's "I'm ready" signal
    const handler = (e: MessageEvent) => {
      if (e.data === 'hero-animation-ready') {
        setIframeReady(true)
      }
    }
    window.addEventListener('message', handler)

    // Fallback: reveal after 1.2s even if postMessage never arrives
    fallbackTimer.current = setTimeout(() => setRevealed(true), 1200)

    return () => {
      window.removeEventListener('message', handler)
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
    }
  }, [])

  // Once the iframe signals readiness, reveal with a short grace delay
  useEffect(() => {
    if (iframeReady) {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
      const t = setTimeout(() => setRevealed(true), 200)
      return () => clearTimeout(t)
    }
  }, [iframeReady])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl border border-border bg-bg-1 select-none"
      style={{ aspectRatio: '820/480' }}
      onMouseEnter={() => setRevealed(true)}
      onClick={() => setRevealed(true)}
      aria-label="Product demo: A/B test animation"
      role="img"
    >
      {/* iframe — always loaded, hidden until revealed */}
      <iframe
        src="/ab-test-hero-animation.html"
        className="absolute inset-0 w-full h-full border-0"
        title="A/B test demo showing variant A vs variant B"
        loading="eager"
        sandbox="allow-scripts allow-same-origin"
      />

      {/* Overlay: fades out when revealed */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity duration-500 pointer-events-none ${
          revealed ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Play button */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur shadow-lg">
          <div className="ml-1.5 h-0 w-0 border-b-[10px] border-l-[18px] border-t-[10px] border-b-transparent border-l-white border-t-transparent" />
        </div>
      </div>

      {/* "Demo" badge */}
      <span className="absolute left-3 top-3 z-10 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white/70 backdrop-blur pointer-events-none">
        Demo
      </span>
    </div>
  )
}
