/**
 * GET /api/picker-bridge?url=<encoded-url>&mode=element|goal
 *
 * Server-seitiger Proxy für den Element-Picker.
 *
 * Problem: Der Picker in ab.js wird nur aktiv, wenn das Snippet auf der
 * Zielseite installiert ist. Bei der Test-Erstellung ist das oft nicht der Fall.
 *
 * Lösung: Dieser Proxy fetched die Zielseite, injectet ab.js in den <head>,
 * und serviert die modifizierte Seite. Der Picker startet dann direkt.
 *
 * Relative URLs (CSS, Bilder, Links) werden auf die originale Domain umgebogen,
 * damit die Seite korrekt rendered.
 *
 * Einschränkung: JS-heavy SPAs (React, Vue) die per Client-Rendering den
 * eigentlichen Content laden, funktionieren nicht — fetch() sieht nur die
 * leere Shell. Das ist akzeptabel: der User muss das Snippet installieren,
 * um solche Seiten zu testen.
 */

import { NextRequest, NextResponse } from 'next/server'
import { safeError } from '@/lib/safeLog'

const FETCH_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 2_000_000 // 2 MB Safety-Net

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url')
  const mode = request.nextUrl.searchParams.get('mode') || 'element'

  if (!urlParam) {
    return new NextResponse('Missing ?url= parameter', { status: 400 })
  }

  // URL normalisieren
  let targetUrl = urlParam.trim()
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  // Nur http/https erlauben (SSRF-Schutz)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new NextResponse('Only http/https URLs are allowed', { status: 400 })
  }

  const origin = parsed.origin

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VariantePicker/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      return new NextResponse(`Failed to fetch page (${res.status})`, { status: 502 })
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return new NextResponse('Not an HTML page', { status: 400 })
    }

    let html = await res.text()
    if (html.length > MAX_RESPONSE_BYTES) {
      html = html.slice(0, MAX_RESPONSE_BYTES)
    }

    // Relative URLs in absolute umbiegen (für <base href>)
    const baseTag = `<base href="${origin}/">`

    // ab.js als inline-Script injecten (kein async — Picker muss sofort starten)
    const abJsUrl = `${request.nextUrl.origin}/ab.js`
    const pickerParam = mode === 'goal' ? 'ab_goal=pick' : 'ab_pick=new'

    // ab.js als <script> mit den Picker-Parametern einfügen
    const pickerScript = `
<script>
// Variante Picker Bridge — injected by /api/picker-bridge
(function() {
  // Picker-Parameter in die URL schreiben, damit ab.js sie findet
  var url = new URL(window.location.href);
  url.searchParams.set('${mode === 'goal' ? 'ab_goal' : 'ab_pick'}', 'pick');
  url.searchParams.set('ab_api', '${request.nextUrl.origin}');
  window.history.replaceState({}, '', url);

  // ab.js dynamisch laden
  var s = document.createElement('script');
  s.src = '${abJsUrl}';
  s.onload = function() {
    // Picker manuell triggern falls ab.js den auto-start verpasst hat
    if (typeof window.__abRekindlePicker === 'function') {
      window.__abRekindlePicker();
    }
  };
  document.head.appendChild(s);
})();
<\/script>`

    // <base> und Picker-Script in <head> einfügen
    // Strategie: Nach <head> oder <title> oder <meta> — vor dem ersten <link>/<script>
    const headClosePos = html.lastIndexOf('</head>')
    if (headClosePos !== -1) {
      html = html.slice(0, headClosePos) + baseTag + pickerScript + html.slice(headClosePos)
    } else {
      // Fallback: vor </html> oder ans Ende
      const htmlClosePos = html.lastIndexOf('</html>')
      if (htmlClosePos !== -1) {
        html = html.slice(0, htmlClosePos) + baseTag + pickerScript + html.slice(htmlClosePos)
      } else {
        html = html + baseTag + pickerScript
      }
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Kein Caching — der Picker muss immer frisch sein
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    safeError('picker-bridge', err)
    return new NextResponse('Failed to load page', { status: 502 })
  }
}
