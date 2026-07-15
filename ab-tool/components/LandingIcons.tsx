'use client'

// Icon surface for the landing page. lucide-react reads its defaults from a React
// context, so its icons are client components — the 'use client' boundary here is
// what keeps that out of the page's server tree.
//
// Icon rules (brandguidelines §10): stroke-based outline, currentColor, no fills,
// no emoji as functional icons.

export {
  // Pricing
  Check,
  Zap,
  // Trust bar
  Shield,
  Gauge,
  Globe,
  // How it works
  MousePointer2,
  Sparkles,
  Rocket,
  // AI translation
  Languages,
  Wand2,
  RefreshCw,
  Palette,
} from 'lucide-react'
