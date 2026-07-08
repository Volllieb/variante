# Figma Community — Store Listing (variante)

> Texte zum Einfügen in den Figma-„Publish"-Dialog.
> Icon + Cover-Art werden **im Publish-Dialog hochgeladen**, nicht im manifest.
> Brand-Farbe: `#0D99FF`. Privacy: https://www.getvariante.com/privacy
> Kategorie im Publish-Dialog: **Design tools**
> Support-Kontakt (Publish-Pflichtfeld): `hello@getvariante.com` — steht auch in der Privacy Policy §7

---

## Plugin-Name
variante — A/B Testing

## Tagline (kurz, ~120 Zeichen)
A/B-test your AI-built website right from Figma. No developer, no code in `<head>`-fiddling — pick, ship, measure.

## Tags (Figma erlaubt mehrere)
`ab-testing` · `experiments` · `conversion` · `cro` · `landing-page` · `analytics` · `no-code` · `marketing`

---

## Beschreibung (lang)

**A/B testing for AI-generated websites — built where you design.**

You designed it in Figma, an AI turned it into a live site (Custom HTML, WordPress, Next/React, Shopify…). Now you want to know which version actually converts — without touching code or waiting on a developer. That's variante.

### How it works
1. **Open the plugin** in Figma and start a test.
2. **Pick the element** — the plugin opens your live site with a built-in hover picker (no extension needed). Click the element, done.
3. **Write the variant** — new copy, color, layout — right in the plugin. AI can generate it from your Figma selection.
4. **Ship it.** variante serves both versions, splits traffic, and tracks the conversion goal you choose.
5. **Read the result** — clear winner, lift %, and confidence — back in the plugin dashboard.

### Why designers use it
- **No dev required.** No experiment framework, no tag manager wrestling.
- **Works where native A/B doesn't.** Built for platforms without built-in testing — Custom HTML, WordPress, plain Next/React, Shopify.
- **Figma-native, not Figma-ish.** Lives in your sidebar, follows light/dark, feels like part of the tool.
- **Free to start.** Run your first live test on the Free tier (carries a small "powered by variante" badge; removable on Pro).

### What you need
- A live website where you can add the variante snippet (one `<script>` tag).
- The element picker runs directly in your browser — no extension install required.

Privacy: we only store the element you pick, your variant, the page URL, and the conversion events you define. Full policy: https://www.getvariante.com/privacy

---

## Security Disclosure (Publish-Pflichtfeld)

### 1. Do you host a backend server for your plugin?
**Yes, and data derived from Figma Plugins API is sent to this backend.**
The plugin sends the user-selected Figma layer (text, colors, geometry) to `api.getvariante.com` to generate Variant B via the OpenAI API (no storage).

### 2. Does your plugin widget make any network requests to servers you do not host?
**My plugin makes requests not captured by the above.**
The plugin only communicates with `getvariante.com` (our own server). No static assets from CDNs, no analytics tools, no third-party trackers. The only exception is the AI generation step, which hits OpenAI's API (no data stored there).

### 3. Does your plugin widget use any user authentication?
**Yes, my plugin widget has user authentication. This is handled via a site that I host.**
Login flows through `getvariante.com` (Supabase Auth). The plugin stores an API token (UUID v4) in Figma's sandboxed `clientStorage` and sends it via `Authorization: Bearer` header.

### 4. Do you store any data read derived from Figma's Plugin API?
**No, my plugin widget does not store any data derived from Figma's Plugin API.**
The authentication token stored in `figma.clientStorage` is user input (pasted from the dashboard), not derived from Figma's Plugin API. Figma selection data is only held in memory for the current request and sent directly to the backend — no local persistence.

### 5. Vulnerability management & security standards
Vulnerability reports: `hello@getvariante.com` — 24h acknowledgment, 30-day fix target. No formal certifications as a solo pre-launch project, but the infrastructure stack is SOC 2-audited: Supabase (database), Stripe (payments, PCI DSS Level 1), Vercel (hosting). GDPR-compliant (Germany-based, data in Frankfurt).

### 6. Credential security
Passwords hashed via Supabase Auth (bcrypt). HTTP-only Secure cookies for dashboard sessions. API tokens (UUID v4) stored in Figma sandboxed `clientStorage`, sent via Bearer header. Stripe handles all payment data directly — no card data touches our server. Server secrets encrypted in Vercel environment variables.

### 7. Data flow (elaboration)
The plugin extracts only the user-selected Figma element (layer type, name, text, fill colors, strokes, geometry). No full-file scan. Data flow: Figma selection → `api.getvariante.com/generate` → OpenAI API (AI gen, no storage). Test config + conversion events → Supabase Postgres (Frankfurt, DE). No analytics (GA, Amplitude, Sentry). No third-party data sharing beyond the AI generation step.

---

## Publish-Dialog Einstellungen

| Feld | Wert |
|---|---|
| **Category** | Design tools |
| **Subcategory** | Other |
| **Support contact** | `hello@getvariante.com` |
| **Privacy Policy URL** | `https://www.getvariante.com/privacy` |
| **Manage updates** | I'm a solo developer. I manage and update my plugin myself. |

## Assets-Checklist (im Publish-Dialog hochladen)
- [ ] **Plugin-Icon** (128×128 PNG, quadratisch) — Brand-Mark auf `#0D99FF`
- [ ] **Cover-Art** (1920×960 PNG) — Plugin-UI + Tagline
- [ ] **3–5 Screenshots** der Plugin-Screens (Onboarding, Variant-Editor, Dashboard/Results)
