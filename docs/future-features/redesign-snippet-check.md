# Redesign: Health Check → Snippet Check

> Stand: 20.07.2026
> Status: ✅ Umgesetzt

## Motivation

Der Health Check (`/dashboard/health`) hatte 3 Steps:
1. **Login** — immer ok, null Informationswert
2. **Connect Website** — Domain eingeben → Snippet-Check (der einzig relevante Step)
3. **Figma Plugin Connect** — blockiert Healthy-Status, obwohl Figma-Plugin ein Zukunftsprojekt ist

**Problem:** Over-engineered für das, was wirklich zählt: "Ist das Snippet auf meiner Domain aktiv?"

## Ziel

```
Health Check (3 Steps, eigene Seite) → Snippet Status Badge (im Dashboard integriert)
```

Der Snippet-Check bleibt als API erhalten, wird aber direkt ins Dashboard eingebaut — keine separate Seite mehr nötig.

## UX-Konzept (von @redesign)

### Dashboard mit integriertem Snippet-Status

**Position:** Zwischen Upgrade-Banner (optional) und Overview-Cards. Immer sichtbar.

#### State: Domain verifiziert → Kompakter Badge

```
┌──────────────────────────────────────────────────────────────┐
│ ● Snippet active on yoursite.com    Last checked: 2h ago [Re-check] │
└──────────────────────────────────────────────────────────────┘
```

- Grüner Punkt (`text-ok`), Domain-URL bold, "Last checked" in text-3
- "Re-check" Button rechts (klein, `text-[11px]`)
- Container: `rounded-[10px] border border-ok/20 bg-ok/[0.04] px-4 py-2.5`

#### State: Keine Domain → Banner mit Input

```
┌──────────────────────────────────────────────────────────────────┐
│ 🌐 Connect your site to run A/B tests                            │
│ ┌──────────────────────────────┐  ┌──────────┐                   │
│ │ yoursite.com                 │  │ Check    │                   │
│ └──────────────────────────────┘  └──────────┘                   │
│ No snippet needed? → [Copy snippet] [Copy AI prompt]             │
└──────────────────────────────────────────────────────────────────┘
```

- Inline-Eingabe (wie aktuell in Health-Seite)
- "Check" Button als primäre Aktion
- Secondary: "Copy snippet" + "Copy AI prompt" für Power-User

#### State: Checking

- Input disabled, Spinner im Button, Text "Checking yoursite.com…"

#### State: Not Found (expandiert)

```
┌──────────────────────────────────────────────────────────────┐
│ ✗ Snippet not found on yoursite.com                         │
│ Paste this in your <head>:                                   │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ <script async src="…">                                 │   │
│ └────────────────────────────────────────────────────────┘   │
│ [Copy snippet] [Copy AI prompt] [Re-check] [Change URL]      │
│ ▼ Framework examples                                         │
└──────────────────────────────────────────────────────────────┘
```

- Err-Farben, Snippet-Code im dark pre-Block
- Framework-Beispiele als collapsible details
- Action-Buttons in einer Reihe

#### State: Verified (expandiert)

```
┌──────────────────────────────────────────────────────────────┐
│ ✓ All good — your snippet is live                            │
│ Data is flowing. Visitors and conversions are being tracked. │
│ [Re-check]                                                    │
└──────────────────────────────────────────────────────────────┘
```

- Nach 3s automatisch in kompakte Badge-Version klappen

### Sidebar-Änderung

- "Health" → "Snippet" umbenennen
- Icon: `HeartPulse` → `Code` (lucide)
- Seite bleibt als Fallback für manuelles Kopieren + Framework-Beispiele

### Health-Seite (`/dashboard/health`) — neues Layout

Radikal entschlackt:
- Kein Login-Step
- Kein Figma-Step
- Kein StepCard-System
- Nur: Domain-Input/Status + Snippet-Code + Framework-Beispiele + Re-check

## Komponenten-Struktur

```
DashboardClient.tsx
├── SnippetStatusBadge          ← NEU: immer sichtbar
│   ├── SnippetVerifiedBadge    ← kompakter grüner Badge
│   └── SnippetBanner           ← Input + Check + States
│       ├── SnippetInput
│       ├── SnippetChecking
│       ├── SnippetNotFound
│       └── SnippetVerified
│
├── (restliche Dashboard-Struktur)
└── EmptyDashboard              ← Link zu /dashboard/health statt /onboarding
```

### Props

```tsx
type SnippetStatusBadgeProps = {
  hasVerifiedDomain: boolean
  primaryDomain: string | null
  userId: string
  onDomainVerified: () => void
}

type SnippetBannerProps = {
  userId: string
  onVerified: () => void
}

type SnippetVerifiedBadgeProps = {
  domain: string
  onRecheck: () => void
  lastCheckedAt: Date | null
}
```

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `ab-tool/app/dashboard/DashboardClient.tsx` | `SnippetStatusBadge` einbauen, alten Onboarding-Banner entfernen, `EmptyDashboard`-Links anpassen |
| `ab-tool/app/dashboard/page.tsx` | Props ggf. anpassen (keine Änderung nötig, `hasVerifiedDomain` + `primaryDomain` existieren bereits) |
| `ab-tool/app/dashboard/health/page.tsx` | Server Component bleibt, `SetupData`-Typ entschlacken |
| `ab-tool/app/dashboard/health/SetupClient.tsx` | Login-Step + Figma-Step entfernen, StepCard-System durch einfaches Layout ersetzen |
| `ab-tool/app/dashboard/Sidebar.tsx` | "Health" → "Snippet", `HeartPulse` → `Code` |
| `ab-tool/app/dashboard/tests/TestsClient.tsx` | "Run health check" → "Install snippet" |
| `ab-tool/app/dashboard/components/ConnectWebsite.tsx` | Bleibt als Referenz, wird aber durch `SnippetStatusBadge` abgelöst |
| `docs/Begriffe.md` | Health Check-Eintrag aktualisieren |

## Implementierungs-Reihenfolge

| # | Task | Agent | Aufwand |
|---|---|---|---|
| 1 | `SnippetStatusBadge`-Komponente erstellen (alle States) | @engineer | aufwändig |
| 2 | In `DashboardClient.tsx` einbauen, alten Banner entfernen | @engineer | mittel |
| 3 | `EmptyDashboard`-Links anpassen | @engineer | trivial |
| 4 | Sidebar: "Health" → "Snippet" | @engineer | trivial |
| 5 | `SetupClient.tsx` entschlacken (Login + Figma raus) | @engineer | mittel |
| 6 | `TestsClient.tsx` CTA anpassen | @engineer | trivial |
| 7 | @ponytail Review | @ponytail | — |
| 8 | Build & Deploy | @engineer | trivial |

## Risiken & Annahmen

- **Annahme:** `hasVerifiedDomain` + `primaryDomain` sind bereits in `DashboardClient`-Props vorhanden — kein Umbau der Server Component nötig
- **Annahme:** Der Snippet-Check-API-Call (`/api/snippet-check`) bleibt unverändert
- **Risiko:** Der Badge könnte bei vielen Tests visuell stören — muss kompakt genug sein
- **Risiko:** User die den Health Check gewohnt sind, suchen die Seite — Sidebar-Eintrag bleibt als "Snippet" erhalten
