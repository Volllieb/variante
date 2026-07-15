// Simple recognizable SVG logos for the "Works with" section
// Monochrome, matching the dark theme text-white/30

export function FigmaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 57" fill="none" className={className} aria-label="Figma">
      <path d="M19 28.5C19 25.98 20.998 23.94 23.46 23.94H27.92V33.06H23.46C20.998 33.06 19 31.02 19 28.5Z" fill="currentColor" fillOpacity="0.4" />
      <path d="M10.08 47.88C10.08 45.36 12.078 43.32 14.54 43.32H19V47.88H14.54C12.078 47.88 10.08 49.92 10.08 52.44C10.08 54.96 12.078 57 14.54 57H19V47.88Z" fill="currentColor" fillOpacity="0.8" />
      <path d="M19 0V11.4H27.92C30.382 11.4 32.38 9.36 32.38 6.84C32.38 4.32 30.382 2.28 27.92 2.28C25.458 2.28 23.46 4.32 23.46 6.84V11.4H19V0Z" fill="currentColor" fillOpacity="0.6" />
      <path d="M0 28.5C0 25.98 1.998 23.94 4.46 23.94H8.92V33.06H4.46C1.998 33.06 0 31.02 0 28.5Z" fill="currentColor" fillOpacity="0.7" />
      <path d="M0 6.84C0 4.32 1.998 2.28 4.46 2.28H8.92V11.4H4.46C1.998 11.4 0 9.36 0 6.84Z" fill="currentColor" fillOpacity="0.5" />
    </svg>
  )
}

export function WordPressLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="WordPress">
      <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <path d="M24 2C24 2 28 18 24 46" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <path d="M24 2C24 2 20 18 24 46" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <circle cx="24" cy="13" r="3" fill="currentColor" fillOpacity="0.7" />
    </svg>
  )
}

export function ShopifyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Shopify">
      <path d="M32 18L30 28C29.7 29.8 28 31 26 31H18C16 31 14.3 29.8 14 28L10 10H36L34 18H32Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M14 14L16 6C16.3 4.5 17.5 3.5 19 3.5H29C30.5 3.5 31.7 4.5 32 6L34 14" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="20" cy="37" r="2.5" fill="currentColor" fillOpacity="0.5" />
      <circle cx="28" cy="37" r="2.5" fill="currentColor" fillOpacity="0.5" />
    </svg>
  )
}

export function ReactLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="React">
      <ellipse cx="24" cy="24" rx="10" ry="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" transform="rotate(60 24 24)" />
      <ellipse cx="24" cy="24" rx="10" ry="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" transform="rotate(-60 24 24)" />
      <ellipse cx="24" cy="24" rx="10" ry="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="24" cy="24" r="4" fill="currentColor" fillOpacity="0.7" />
    </svg>
  )
}

export function NextLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Next.js">
      <path d="M24 4L42 44H6L24 4Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M24 16V28L34 44" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
  )
}

export function VercelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Vercel">
      <path d="M24 4L46 44H2L24 4Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
    </svg>
  )
}

export function SupabaseLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Supabase">
      <path d="M24 4L40 32H8L24 4Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M24 31L16 44H32L24 31Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    </svg>
  )
}

export const techLogos = [
  { name: 'Figma', Logo: FigmaLogo },
  { name: 'WordPress', Logo: WordPressLogo },
  { name: 'Shopify', Logo: ShopifyLogo },
  { name: 'React', Logo: ReactLogo },
  { name: 'Next.js', Logo: NextLogo },
  { name: 'Vercel', Logo: VercelLogo },
  { name: 'Supabase', Logo: SupabaseLogo },
] as const
