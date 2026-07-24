---
name: performance-optimizer
description: Performance-Optimierung für Next.js auf Vercel. Core Web Vitals (LCP, INP, CLS), Rendering-Strategien, Caching, Bundle-Analyse, Image/Font-Optimierung. Verwenden bei: langsame Seiten, Lighthouse-Audit, Ladezeit-Optimierung.
---

# Performance Optimizer

## Core Web Vitals Reference

| Metric | What It Measures | Good Threshold |
|--------|-----------------|----------------|
| LCP | Largest Contentful Paint | < 2.5s |
| INP | Interaction to Next Paint | < 200ms |
| CLS | Cumulative Layout Shift | < 0.1 |
| FCP | First Contentful Paint | < 1.8s |
| TTFB | Time to First Byte | < 800ms |

## LCP Diagnostic Tree

```
LCP > 2.5s?
├─ What is the LCP element?
│  ├─ Hero image
│  │  ├─ Using `next/image`? → Check `priority` prop on above-fold images
│  │  ├─ Image format? → WebP/AVIF (automatic with next/image)
│  │  ├─ Image size > 200KB? → Resize to actual display dimensions
│  │  ├─ Lazy loaded? → Remove `loading="lazy"` for above-fold images
│  │  └─ CDN serving? → Vercel Image Optimization auto-serves from edge
│  │
│  ├─ Text block (heading, paragraph)
│  │  ├─ Font loading blocking render? → `next/font` with `display: swap`
│  │  ├─ Web font file > 100KB? → Subset to needed characters
│  │  └─ Font loaded from third-party? → Self-host via `next/font/google`
│  │
│  └─ Video / background image
│     ├─ Use `poster` attribute for video elements
│     └─ Preload critical background images with `<link rel="preload">`
│
├─ Server response time (TTFB) > 800ms?
│  ├─ Using SSR for static content? → Switch to SSG or ISR
│  ├─ Can use Cache Components? → Add `'use cache'` to slow Server Components
│  ├─ Database queries slow? → Add connection pooling, check query plans
│  └─ Region mismatch? → Deploy function in same region as database
│
└─ Render-blocking resources?
   ├─ Large CSS file? → CSS Modules or Tailwind for tree-shaking
   ├─ Synchronous scripts in `<head>`? → `next/script` with `afterInteractive`
   └─ Third-party scripts? → Defer with `next/script strategy="lazyOnload"`
```

## INP Diagnostic Tree

```
INP > 200ms?
├─ Which interaction is slow?
│  ├─ Button click / form submit
│  │  ├─ Heavy computation on main thread? → Web Worker
│  │  ├─ State update triggers large re-render? → `useMemo`/`React.memo`
│  │  ├─ Fetch request blocking UI? → `useTransition` for non-urgent updates
│  │  └─ Server Action slow? → Optimistic UI with `useOptimistic`
│  │
│  ├─ Scroll / resize handlers
│  │  ├─ No debounce/throttle? → `requestAnimationFrame` or debounce
│  │  ├─ Layout thrashing? → Batch DOM reads, then writes
│  │  └─ Intersection Observer available? → Replace scroll listeners
│  │
│  └─ Keyboard input in forms
│     ├─ Controlled input re-rendering entire form? → `useRef` for form state
│     ├─ Expensive validation on every keystroke? → Debounce validation
│     └─ Large component tree updating? → Push `'use client'` boundary down
│
├─ Hydration time > 500ms?
│  ├─ Too many client components? → Audit `'use client'` boundaries
│  ├─ Large component tree hydrating at once? → Suspense for progressive hydration
│  ├─ Third-party scripts competing? → Defer with `next/script`
│  └─ Bundle size > 200KB (gzipped)? → See bundle analysis below
│
└─ Long tasks (> 50ms) on main thread?
   ├─ Profile with Chrome DevTools → Performance tab
   ├─ Break up long tasks with `scheduler.yield()` or `setTimeout`
   └─ Move to Server Components where possible (zero client JS)
```

## CLS Diagnostic Tree

```
CLS > 0.1?
├─ Images causing layout shift?
│  ├─ Missing `width`/`height`? → Always set dimensions (next/image does this)
│  ├─ Not using `next/image`? → Migrate to `next/image`
│  └─ Aspect ratio changes on load? → Set explicit `aspect-ratio` in CSS
│
├─ Fonts causing layout shift?
│  ├─ Not using `next/font`? → Migrate to `next/font` (zero-CLS)
│  ├─ FOUT (flash of unstyled text)? → `next/font` with `adjustFontFallback: true`
│  └─ Custom font metrics off? → Use `size-adjust` CSS property
│
├─ Dynamic content injected above viewport?
│  ├─ Ad banners / cookie banners? → Reserve space with `min-height`
│  ├─ Async-loaded components? → Skeleton placeholders with fixed dimensions
│  └─ Toast notifications? → Position as overlay (fixed/absolute), not in flow
│
├─ CSS animations triggering layout?
│  ├─ Animating `width`, `height`, `top`, `left`? → Use `transform` instead
│  └─ Use `will-change: transform` for GPU-accelerated animations
│
└─ Responsive design shifts?
   ├─ Different layouts per breakpoint causing jump? → Consistent aspect ratios
   └─ Client-side media query check? → Use CSS media queries, not JS `matchMedia`
```

## Rendering Strategy Decision Tree

```
Need to fetch data?
├── From a Server Component?
│   └── Use: Fetch directly (no API needed)
├── From a Client Component?
│   ├── Is it a mutation (POST/PUT/DELETE)?
│   │   └── Use: Server Action
│   └── Is it a read (GET)?
│       └── Use: Route Handler OR pass from Server Component
├── Need external API access (webhooks, third parties)?
│   └── Use: Route Handler
└── Need REST API for mobile app / external clients?
    └── Use: Route Handler
```

## Cache Invalidation Patterns

```tsx
// cacheTag() — Tag cached content
import { cacheTag } from 'next/cache'
async function getProducts() {
  'use cache'
  cacheTag('products')
  return db.products.findMany()
}

// updateTag() — Immediate invalidation (same request sees fresh data)
'use server'
import { updateTag } from 'next/cache'
export async function updateProduct(id: string, data: FormData) {
  await db.products.update({ where: { id }, data })
  updateTag(`product-${id}`)
}

// revalidateTag() — Background revalidation (next request sees fresh data)
'use server'
import { revalidateTag } from 'next/cache'
export async function createPost(data: FormData) {
  await db.posts.create({ data })
  revalidateTag('posts')
}
```

## Bundle Size Analysis

```bash
next experimental-analyze        # Interactive UI
next experimental-analyze --output  # Save to .next/diagnostics/analyze
```

## Image Optimization

- Always use `next/image` (automatic WebP/AVIF, lazy loading, dimensions)
- Above-fold images: `priority` prop
- Remote images: configure domains in `next.config.ts`
- `fill` prop for parent-relative sizing with `objectFit`

## Performance Audit Checklist

1. **Measure first**: Speed Insights dashboard for real-user CWV data
2. **Identify LCP element**: Chrome DevTools → Performance
3. **Audit `'use client'`**: Every `'use client'` file ships JS — minimize
4. **Check images**: Above-fold images use `next/image` with `priority`
5. **Check fonts**: All fonts via `next/font` (zero CLS)
6. **Check third-party scripts**: `next/script` with correct strategy
7. **Check data fetching**: Server Components fetch in parallel, no waterfalls
8. **Check caching**: Cache Components for expensive operations
9. **Check bundle**: Run analyzer, look for low-hanging fruit
10. **Check infrastructure**: Functions in correct region, Fluid Compute enabled

## RSC Boundaries Quick Reference

| Pattern | Valid? | Fix |
|---------|--------|-----|
| `'use client'` + `async function` | No | Fetch in server parent, pass data |
| Pass `() => {}` to client | No | Define in client or use server action |
| Pass `new Date()` to client | No | Use `.toISOString()` |
| Pass `new Map()` to client | No | Convert to object/array |
| Pass class instance to client | No | Pass plain object |
| Pass server action to client | Yes | - |
| Pass `string/number/boolean` | Yes | - |
| Pass plain object/array | Yes | - |
