---
name: seo
description: SEO-Wissensbasis für Variante — Next.js Metadata API, Structured Data (JSON-LD), robots.txt, Sitemap, Canonical URLs, Core Web Vitals SEO-Impact, Keyword-Strategie. Verwenden bei: SEO-Audit, Meta-Tags, Open Graph, Schema.org, SERP-Optimierung.
---

# SEO — Variante-Wissensbasis

## Variante-Kontext

| Bereich | Dateien |
|---|---|
| **Landingpage** | `ab-tool/app/page.tsx` (Server Component), `ab-tool/app/layout.tsx` (Root-Layout mit Metadata) |
| **Dashboard** | `ab-tool/app/dashboard/` — eingeloggte User, `noindex` |
| **Auth-Pages** | `ab-tool/app/login/`, `signup/`, `update-password/` — `noindex` |
| **Rechtliches** | `ab-tool/app/imprint/`, `privacy/` — statisch, indexierbar |
| **Results (public)** | `ab-tool/app/results/[id]/page.tsx` — öffentliche Ergebnis-Seiten, höchstes SEO-Potenzial |
| **API-Routes** | `ab-tool/app/api/` — kein SEO |
| **Globals** | `ab-tool/app/globals.css`, `next.config.ts`, `vercel.json` |

## Next.js Metadata-API

Variante nutzt Next.js 16 App Router mit der **Metadata API**. Alle SEO-relevanten Tags werden in `layout.tsx` oder `page.tsx` via `export const metadata: Metadata` oder `generateMetadata()` gesetzt.

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '...',
  description: '...',
  openGraph: { ... },
  twitter: { ... },
  alternates: { canonical: '...' },
  robots: { index: true, follow: true },
}
```

## Seiten-Priorität

| Prio | Seite | SEO-Potenzial |
|---|---|---|
| 🔴 **1** | `/` (Landingpage) | Höchstes — Haupt-Einstieg |
| 🔴 **2** | `/results/[id]` | Hoch — Unique Content, dynamisches `generateMetadata()` |
| 🟡 **3** | `/imprint`, `/privacy` | Niedrig — Pflichtseiten |
| ⚪ **4** | `/dashboard`, `/login`, etc. | Kein SEO — `noindex` |
| ⚪ **5** | `/api/*` | Kein SEO |

## SEO-Checkliste

### On-Page
1. **Title-Tag**: 50-60 Zeichen, primäres Keyword vorne, Brand hinten (`... | variante`)
2. **Meta-Description**: 120-155 Zeichen, Call-to-Action, Unique pro Seite
3. **H1**: Genau eine, enthält primäres Keyword
4. **Heading-Hierarchie**: H1 → H2 → H3, keine Sprünge
5. **Bilder**: Alle `<img>` haben `alt`-Text
6. **Interne Links**: Descriptive Anchor-Text, keine "Click here"-Links

### Technical
7. **Canonical URL**: Jede Seite hat `<link rel="canonical">` (Next.js: `alternates.canonical`)
8. **robots.txt**: `app/robots.ts` oder `public/robots.txt`
9. **Sitemap.xml**: `app/sitemap.ts` oder `next.config.ts`
10. **Status-Codes**: Keine 404 auf internen Links, 301-Redirects wo nötig
11. **SSL/HTTPS**: Vercel handled das

### Structured Data
12. **JSON-LD**: Relevante Schema-Types pro Seite (WebSite, Organization, SoftwareApplication, FAQ, BreadcrumbList)
13. **Rich Results Test**: https://search.google.com/test/rich-results

### Performance (Core Web Vitals — SEO-Impact)
14. **LCP < 2.5s**: Largest Contentful Paint
15. **CLS < 0.1**: Cumulative Layout Shift
16. **INP < 200ms**: Interaction to Next Paint

### Content
18. **Keyword im Title**: Primäres Keyword erscheint im Title-Tag
19. **Keyword in H1**: Primäres Keyword erscheint in der H1
20. **Keyword in ersten 100 Wörtern**: Primäres Keyword früh im Content
21. **LSI-Keywords**: Verwandte Begriffe im Content
22. **Content-Länge**: Mindestens 300 Wörter für Landing-Pages

## Structured Data — Variante-spezifisch

### Landingpage (`/`)
```typescript
{
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  'name': 'variante',
  'applicationCategory': 'DesignApplication',
  'operatingSystem': 'Web',
  'description': 'A/B-Testing direkt aus Figma — kein Entwickler nötig.',
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'EUR',
  },
}
```

### Results (`/results/[id]`)
```typescript
{
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  'name': '{Test-Name} — A/B-Test Ergebnisse | variante',
  'description': 'A/B-Test "{Test-Name}": Variante {B|A} führt mit +{Uplift}% Uplift.',
}
```

### Globale Structured Data (in Root-Layout)
```typescript
{
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': 'variante',
  'url': 'https://variante.app',
  'description': 'A/B-Testing für Designer — direkt aus Figma.',
}
```

## robots.txt & Sitemap

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/dashboard/', '/login/', '/signup/', '/api/'] },
    ],
    sitemap: 'https://variante.app/sitemap.xml',
  }
}
```

## Regeln

- **Immer das Root-Layout prüfen**, bevor page-spezifische Metadata geändert wird. Next.js merged globale + Page-Metadata.
- **`noindex` nur wo sinnvoll**: Dashboard, Auth-Pages, API. NICHT auf Landingpage, Results, oder rechtlichen Seiten.
- **Canonical URLs** sind Pflicht auf `/results/[id]` — jede Ergebnis-Seite ist unique Content.
- **Nach jeder SEO-Änderung**: `next build` auf Metadata-Warnungen prüfen.
- **Structured Data immer validieren**: https://validator.schema.org/ oder Google Rich Results Test.
- **Kein `hreflang`** — variante ist aktuell nur Deutsch.

## Typischer Workflow

1. **SEO-Audit**: Checkliste durchgehen
2. **Meta-Tags optimieren**: Title, Description, OG, Twitter Cards pro Seite
3. **Structured Data hinzufügen**: JSON-LD in `layout.tsx` oder `page.tsx`
4. **robots.txt + Sitemap**: `app/robots.ts` + `app/sitemap.ts`
5. **Canonical prüfen**: `alternates.canonical` auf allen indexierbaren Seiten
6. **Validieren**: Schema-Validator, Rich Results Test, Lighthouse Audit
7. **Build prüfen**: `next build` auf Metadata-Warnungen checken
