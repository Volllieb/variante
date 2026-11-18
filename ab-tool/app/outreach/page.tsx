'use client'

/**
 * Internes Outreach-Tool — Review- & Send-UI.
 * URLs rein (eine pro Zeile, optional "url | Anzeigen-Kontext") → Entwürfe raus,
 * inkl. extrahierter Kontakt-E-Mail. Pro Entwurf: An/Betreff/Text editierbar + Senden.
 * Gated per OUTREACH_SECRET. Ruft POST /api/outreach/draft und /api/outreach/send.
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
  contactEmail: string | null
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
  pro: '#f5a623',
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

function inputStyle(width: number | string): React.CSSProperties {
  return {
    width, background: C.bg1, color: C.text, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: '9px 12px', fontSize: 13, outline: 'none',
  }
}

export default function OutreachPage() {
  const [secret, setSecret] = useState('')
  const [senderName, setSenderName] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [raw, setRaw] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    try {
      setSecret(sessionStorage.getItem('outreach_secret') ?? '')
      setSenderName(sessionStorage.getItem('outreach_sender') ?? '')
      setReplyTo(sessionStorage.getItem('outreach_replyto') ?? '')
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
    setRows(leads.map((l) => ({ ...l, status: 'pending' })))

    for (let i = 0; i < leads.length; i++) {
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'loading' } : r)))
      try {
        const res = await fetch('/api/outreach/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-outreach-secret': secret },
          body: JSON.stringify({ url: leads[i].url, adContext: leads[i].adContext, senderName: senderName || undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'done', draft: data.draft } : r)))
      } catch (e) {
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'error', error: e instanceof Error ? e.message : String(e) } : r)))
      }
    }
    setRunning(false)
  }

  const leadCount = parseLeads(raw).length

  return (
    <div style={{ minHeight: '100vh', background: C.bg0, color: C.text, fontFamily: 'Inter, system-ui, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>Outreach — Draft &amp; Send</h1>
        <p style={{ color: C.text2, fontSize: 13, margin: '0 0 24px' }}>
          Lead-URLs rein, personalisierte Entwürfe raus. Kontakt kommt aus Seite/Impressum. Senden erst nach deiner Freigabe pro Mail.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <input type="password" placeholder="OUTREACH_SECRET" value={secret}
            onChange={(e) => { setSecret(e.target.value); persist('outreach_secret', e.target.value) }} style={inputStyle(220)} />
          <input type="text" placeholder="Absendername (Signatur)" value={senderName}
            onChange={(e) => { setSenderName(e.target.value); persist('outreach_sender', e.target.value) }} style={inputStyle(220)} />
          <input type="email" placeholder="Antworten an (deine E-Mail)" value={replyTo}
            onChange={(e) => { setReplyTo(e.target.value); persist('outreach_replyto', e.target.value) }} style={inputStyle(240)} />
        </div>

        <textarea
          placeholder={'Eine Lead-URL pro Zeile, optional mit Anzeigen-Kontext:\nanjastaubli.ch | Workbook-Vorlagen, läuft seit >1 Jahr'}
          value={raw} onChange={(e) => setRaw(e.target.value)} rows={6}
          style={{ ...inputStyle('100%'), fontFamily: 'ui-monospace, monospace', resize: 'vertical', lineHeight: 1.5 }}
        />

        <div style={{ marginTop: 12 }}>
          <button onClick={run} disabled={running || !secret || leadCount === 0}
            style={{
              background: running || !secret || leadCount === 0 ? C.bg2 : '#fff',
              color: running || !secret || leadCount === 0 ? C.text3 : '#000',
              border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 13, fontWeight: 600,
              cursor: running || !secret || leadCount === 0 ? 'not-allowed' : 'pointer',
            }}>
            {running ? 'Generiere…' : `Entwürfe generieren${leadCount ? ` (${leadCount})` : ''}`}
          </button>
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((row, i) => (
            <DraftCard key={i} row={row} secret={secret} senderName={senderName} replyTo={replyTo} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DraftCard({ row, secret, senderName, replyTo }: { row: Row; secret: string; senderName: string; replyTo: string }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [sendMsg, setSendMsg] = useState('')

  // Entwurf → Felder vorbefüllen, sobald er eintrifft.
  useEffect(() => {
    if (row.draft) {
      setTo(row.draft.contactEmail ?? '')
      setSubject(row.draft.email.subject)
      setBodyText(row.draft.email.body)
    }
  }, [row.draft])

  const dotColor = row.status === 'done' ? C.ok : row.status === 'error' ? C.err : C.text3

  async function send() {
    if (!to) return
    if (!window.confirm(`Mail jetzt an ${to} senden?`)) return
    setSendState('sending'); setSendMsg('')
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-outreach-secret': secret },
        body: JSON.stringify({ to, subject, body: bodyText, replyTo: replyTo || undefined, senderName: senderName || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
      setSendState('sent')
    } catch (e) {
      setSendState('error'); setSendMsg(e instanceof Error ? e.message : String(e))
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
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
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

          {sendState === 'sent' ? (
            <div style={{ color: C.ok, fontSize: 13, fontWeight: 500 }}>Gesendet an {to} ✓</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 11, color: C.text3 }}>
                  An {row.draft.contactEmail ? '' : '(keine E-Mail gefunden — manuell eintragen)'}
                  <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="empfaenger@domain.de"
                    style={{ ...inputStyle('100%'), marginTop: 3, borderColor: row.draft.contactEmail ? C.border : C.pro }} />
                </label>
                <label style={{ fontSize: 11, color: C.text3 }}>
                  Betreff
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle('100%'), marginTop: 3 }} />
                </label>
                <label style={{ fontSize: 11, color: C.text3 }}>
                  Text
                  <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={7}
                    style={{ ...inputStyle('100%'), marginTop: 3, resize: 'vertical', lineHeight: 1.55 }} />
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <button onClick={send} disabled={!to || sendState === 'sending'}
                  style={{
                    background: !to || sendState === 'sending' ? C.bg2 : '#fff',
                    color: !to || sendState === 'sending' ? C.text3 : '#000',
                    border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    cursor: !to || sendState === 'sending' ? 'not-allowed' : 'pointer',
                  }}>
                  {sendState === 'sending' ? 'Sende…' : 'Senden'}
                </button>
                {sendState === 'error' && <span style={{ color: C.err, fontSize: 12 }}>{sendMsg}</span>}
                <span style={{ color: C.text3, fontSize: 11 }}>Opt-out-Hinweis wird automatisch angehängt.</span>
              </div>
            </>
          )}

          <div style={{ fontSize: 11, color: C.text3, marginTop: 10 }}>
            Sprache: {row.draft.lang} · {row.draft.suggestions.length} Vorschläge
          </div>
        </>
      )}
    </div>
  )
}
