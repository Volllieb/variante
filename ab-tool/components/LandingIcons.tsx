'use client'

export {
  Check,
  MousePointer2,
  Sparkles,
  Rocket,
  Zap,
  Shield,
  Gauge,
  Globe,
  Palette,
} from 'lucide-react'

/** Tiny Figma-like SVG for the landing page section heading */
export function FigmaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Figma">
      <path d="M12 12.5C12 11.12 13.12 10 14.5 10H17V15H14.5C13.12 15 12 13.88 12 12.5Z" fill="currentColor" fillOpacity="0.55" />
      <path d="M7 20.5C7 19.12 8.12 18 9.5 18H12V20.5H9.5C8.12 20.5 7 21.62 7 23C7 24.38 8.12 25.5 9.5 25.5H12V20.5Z" fill="currentColor" fillOpacity="0.9" />
      <path d="M12 3V8.5H17C18.38 8.5 19.5 7.38 19.5 6C19.5 4.62 18.38 3.5 17 3.5C15.62 3.5 14.5 4.62 14.5 6V8.5H12V3Z" fill="currentColor" fillOpacity="0.7" />
      <path d="M1 12.5C1 11.12 2.12 10 3.5 10H6V15H3.5C2.12 15 1 13.88 1 12.5Z" fill="currentColor" fillOpacity="0.8" />
      <path d="M1 6C1 4.62 2.12 3.5 3.5 3.5H6V8.5H3.5C2.12 8.5 1 7.38 1 6Z" fill="currentColor" fillOpacity="0.6" />
    </svg>
  )
}
