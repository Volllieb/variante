'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * Hero-Demo-Video: bettet die GSAP-Animation als Video-Player-ähnliches
 * Element ein. Der iframe-Inhalt läuft automatisch — der Play-Button
 * ist rein dekorativ und verschwindet beim ersten Tap/Hover.
 */
export function LandingDemo() {
  const [revealed, setRevealed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reveal after a short delay so the animation is ready
    const t = setTimeout(() => setRevealed(true), 600)
    return () => clearTimeout(t)
  }, [])

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
