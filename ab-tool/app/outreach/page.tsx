'use client'

/**
 * Internes Outreach-Tool — Review-UI.
 * URLs rein (eine pro Zeile, optional "url | Anzeigen-Kontext") → Cold-Mail-Entwürfe raus.
 * Gated per OUTREACH_SECRET (im Feld eingeben, bleibt in sessionStorage).
 * Ruft POST /api/outreach/draft.
 */

import { useState, useEffect, useCallback } from 'react'

interface Suggestion {
  element: string
  original: string
  variant: string
  why: string
}
interface Draft {
  analyzedUrl: string
  pageTitle: string
  lang: string
  primary: Suggestion
  suggestions: Suggestion[]
  email: { subject: string; body: string }
}
interface Row {
  url: string
  adContext?: string
  status: 'pending' | 'loading' | 'done' | 'error'
  draft?: Draft
  error?: string
}

const C = {
  bg0: '#000000',
  bg1: '#0a0a0a',
  bg2: '#111111',
  border: 'rgba(255,255,255,.10)',
  borderStrong: 'rgba(255,255,255,.18)',
  text: '#ededed',
  text2: 'rgba(237,237,237,.62)',
  text3: 'rgba(237,237,237,.40)',
  ok: '#2fd76c',
  err: '#f5455c',
}

function parseLeads(raw: string): { url: string; adContext?: string }[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, ...rest] = line.split('|')
      const adContext = rest.join('|').trim()
      return { url: url.trim(), adContext: adContext || undefined }
    })
    .filter((l) => l.url)
}

export default function OutreachPage() {
  const [secret, setSecret] = useState('')
  const [senderName, setSenderName] = useState('')
  const [raw, setRaw] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    try {
      setSecret(sessionStorage.getItem('outreach_secret') ?? '')
      setSenderName(sessionStorage.getItem('outreach_sender') ?? '')
    } catch {
      /* sessionStorage unavailable */
    }
  }, [])

  const persist = useCallback((key: string, val: string) => {
    try {
      sessionStorage.setItem(key, val)
    } catch {
      /* ignore */
    }
  }, [])

  async function run() {
    const leads = parseLeads(raw)
    if (leads.length === 0 || !secret) return
    setRunning(true)
    const initial: Row[] = leads.map((l) => ({ ...l, status: 'pending' }))
    setRows(initial)

    for (let i = 0; i < leads.length; i++) {
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'loading' } : r)))
      try {
        const res = await fetch('/api/outreach/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-outreach-secret': secret },
          body: JSON.stringify({
            url: leads[i].url,
            adContext: leads[i].adContext,
            senderName: senderName || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'done', draft: data.draft } : r)))
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'error', error: msg } : r)))
      }
    }
    setRunning(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg0, color: C.text, fontFamily: 'Inter, system-ui, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>Outreach — Draft Engine</h1>
        <p style={{ color: C.text2, fontSize: 13, margin: '0 0 24px' }}>
          Lead-URLs rein, personalisierte Cold-Mail-Entwürfe raus. Nutzt dieselbe Analyse-Engine wie der Pagechecker.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            type="password"
            placeholder="OUTREACH_SECRET"
            value={secret}
            onChange={(e) => { setSecret(e.target.value); persist('outreach_secret', e.target.value) }}
            style={inputStyle(260)}
          />
          <input
            type="text"
            placeholder="Absendername (Signatur)"
            value={senderName}
            onChange={(e) => { setSenderName(e.target.value); persist('outreach_sender', e.target.value) }}
            style={inputStyle(260)}
          />
        </div>

        <textarea
          placeholder={'Eine Lead-URL pro Zeile.\nOptional mit Anzeigen-Kontext:\nanjastaubli.ch | Workbook-Vorlagen, läuft seit >1 Jahr'}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          style={{ ...inputStyle('100%'), fontFamily: 'ui-monospace, monospace', resize: 'vertical', lineHeight: 1.5 }}
        />

        <div style={{ marginTop: 12 }}>
          <button
            onClick={run}
            disabled={running || !secret || parseLeads(raw).length === 0}
            style={{
              background: running || !secret || parseLeads(raw).length === 0 ? C.bg2 : '#fff',
              color: running || !secret || parseLeads(raw).length === 0 ? C.text3 : '#000',
              border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 13, fontWeight: 600,
              cursor: running || !secret || parseLeads(raw).length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {running ? 'Generiere…' : `Entwürfe generieren${parseLeads(raw).length ? ` (${parseLeads(raw).length})` : ''}`}
          </button>
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((row, i) => (
            <DraftCard key={i} row={row} />
          ))}
        </div>
      </div>
    </div>
  )
}

function inputStyle(width: number | string): React.CSSProperties {
  return {
    width, background: C.bg1, color: C.text, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: '9px 12px', fontSize: 13, outline: 'none',
  }
}

function DraftCard({ row }: { row: Row }) {
  const [copied, setCopied] = useState(false)

  const dotColor = row.status === 'done' ? C.ok : row.status === 'error' ? C.err : C.text3

  async function copy() {
    if (!row.draft) return
    const text = `${row.draft.email.subject}\n\n${row.draft.email.body}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-all' }}>{row.url}</span>
        {row.status === 'loading' && <span style={{ color: C.text3, fontSize: 12 }}>analysiere…</span>}
      </div>

      {row.status === 'error' && (
        <div style={{ color: C.err, fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>{row.error}</div>
      )}

      {row.draft && (
        <>
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: C.text3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>
              Stärkster Hebel · {row.draft.primary.element}
            </div>
            <div style={{ fontSize: 13, marginBottom: 2 }}>
              <span style={{ color: C.text3 }}>„{row.draft.primary.original}"</span>
              <span style={{ color: C.text3 }}> → </span>
              <span style={{ color: C.text }}>„{row.draft.primary.variant}"</span>
            </div>
            <div style={{ fontSize: 12, color: C.text2 }}>{row.draft.primary.why}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Betreff: {row.draft.email.subject}</div>
            <button
              onClick={copy}
              style={{ background: 'transparent', color: C.text2, border: `1px solid ${C.borderStrong}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              {copied ? 'Kopiert ✓' : 'Mail kopieren'}
            </button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, color: C.text, margin: 0, lineHeight: 1.55 }}>
            {row.draft.email.body}
          </pre>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 8 }}>
            Sprache: {row.draft.lang} · {row.draft.suggestions.length} Vorschläge analysiert
          </div>
        </>
      )}
    </div>
  )
}
