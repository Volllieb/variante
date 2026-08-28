'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { Mail, Globe, Key, Trash2, AlertTriangle, Check, Loader2, X, Camera, User, Copy, FlaskConical } from 'lucide-react'
import Image from 'next/image'

type Domain = { id: string; url: string; verified: boolean; verified_at?: string | null }

/**
 * Schalter im Monochrom-Stil. role="switch" + aria-checked, damit Screenreader
 * den Zustand ansagen (Plan A11Y-01), sichtbarer focus-visible-Ring statt
 * outline-none ohne Ersatz (Plan A11Y-03).
 */
function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (next: boolean) => void; label: string; id: string }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 ${
        checked ? 'border-transparent bg-fill-invert' : 'border-border bg-bg-2'
      }`}
    >
      <span
        className={`absolute top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full transition-all ${
          checked ? 'left-[19px] bg-text-on-invert' : 'left-[2px] bg-text-3'
        }`}
      />
    </button>
  )
}

export function AccountClient({ email, domains: initialDomains, avatarUrl: initialAvatar, plan, apiToken: initialToken, notifyOnWinner: initialNotify, autoPromoteWinner: initialAutoPromote }: { email: string; domains: Domain[]; avatarUrl: string | null; plan: string; apiToken: string | null; notifyOnWinner: boolean; autoPromoteWinner: boolean }) {
  const router = useRouter()
  const [domains, setDomains] = useState<Domain[]>(initialDomains)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [domainBusy, setDomainBusy] = useState(false)
  const [domainError, setDomainError] = useState('')
  const [verifying, setVerifying] = useState<string | null>(null) // domain id being verified
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // ── Add-page inline flow — the single flow used both to connect the first
  // page and to add every page after it. Hitting the plan limit surfaces a
  // 'limit' state offering to replace the existing page, instead of a
  // separate always-visible "Change" flow.
  const [addingPage, setAddingPage] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addState, setAddState] = useState<'input' | 'saving' | 'not-found' | 'limit' | 'replacing' | 'verified'>('input')
  const [addError, setAddError] = useState('')

  // ── Helpers ──
  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  /** Shared pipeline: save domain → snippet-check → verify. Returns server domain ID on success. */
  async function saveDomainAndVerify(normalized: string): Promise<
    | { ok: true; domainId: string }
    | { ok: false; reason: 'limit-reached' | 'save-failed' | 'not-found'; error?: string }
  > {
    // 1. Save domain
    const saveRes = await fetch('/api/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalized }),
    })
    if (saveRes.status === 402) {
      const data = await saveRes.json().catch(() => ({}))
      return { ok: false, reason: 'limit-reached', error: data.error || 'Domain limit reached.' }
    }
    if (!saveRes.ok && saveRes.status !== 409) {
      const data = await saveRes.json().catch(() => ({}))
      return { ok: false, reason: 'save-failed', error: data.error || 'Failed to save domain.' }
    }

    // 2. Snippet check
    const checkRes = await fetch('/api/snippet-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_url: normalized }),
    })
    const json = await checkRes.json()
    if (!json.detected) return { ok: false, reason: 'not-found' }

    // 3. Verify + capture server ID
    const domainsRes = await fetch('/api/domains')
    const { domains: freshDomains } = await domainsRes.json()
    const newDomain = (freshDomains || []).find((d: Domain) => d.url === normalized)
    if (newDomain?.id) {
      await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId: newDomain.id }),
      }).catch(() => { /* best-effort */ })
    }
    return { ok: true, domainId: newDomain?.id ?? crypto.randomUUID() }
  }

  const [newEmail, setNewEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [pwSent, setPwSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // ── Experiment-Einstellungen (Plan RA-06) ──
  // Beide Schalter lagen bisher tot in der DB. autoPromote entscheidet, ob der
  // Winner-Cron eine Gewinner-Variante selbstständig auf der Kundenseite
  // ausrollt — bis hierher gab es dafür kein Opt-out.
  const [autoPromote, setAutoPromote] = useState(initialAutoPromote)
  const [notifyWinner, setNotifyWinner] = useState(initialNotify)
  const [prefsError, setPrefsError] = useState('')

  async function savePreference(patch: { auto_promote_winner?: boolean } | { notify_on_winner?: boolean }) {
    setPrefsError('')
    // Optimistisch umschalten, bei Fehler zurückrollen — ein Toggle, der erst
    // nach dem Roundtrip reagiert, fühlt sich kaputt an.
    const rollback = { autoPromote, notifyWinner }
    if ('auto_promote_winner' in patch && typeof patch.auto_promote_winner === 'boolean') setAutoPromote(patch.auto_promote_winner)
    if ('notify_on_winner' in patch && typeof patch.notify_on_winner === 'boolean') setNotifyWinner(patch.notify_on_winner)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      setAutoPromote(rollback.autoPromote)
      setNotifyWinner(rollback.notifyWinner)
      setPrefsError('Could not save. Please try again.')
    }
  }

  // ── API Token ──
  const [token, setToken] = useState<string | null>(initialToken)
  const [showToken, setShowToken] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [tokenBusy, setTokenBusy] = useState(false)
  const [regenerateConfirm, setRegenerateConfirm] = useState(false)

  async function uploadAvatar(file: File) {
    if (!file) return
    setAvatarUploading(true)
    setAvatarError('')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.url) {
        setAvatarUrl(data.url) // URL already versioned by API
        router.refresh() // Update sidebar via server re-fetch
      } else {
        setAvatarError(data.error ?? 'Upload failed')
      }
    } catch {
      setAvatarError('Connection failed.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function changeEmail() {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error } = await getBrowserSupabase().auth.updateUser({ email: newEmail.trim() })
      if (error) {
        setError(error.message)
      } else {
        setEmailSent(true)
      }
    } catch {
      setError('Connection failed.')
    } finally {
      setBusy(false)
    }
  }

  async function changePassword() {
    setBusy(true)
    setError('')
    try {
      const { error } = await getBrowserSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) {
        setError(error.message)
      } else {
        setPwSent(true)
      }
    } catch {
      setError('Connection failed.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyDomain(domainId: string, url: string) {
    setVerifying(domainId)
    setDomainError('')
    try {
      const res = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: url }),
      })
      const data = await res.json()
      if (data.detected) {
        const vRes = await fetch('/api/domains/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domainId }),
        })
        if (vRes.ok) {
          setDomains((prev) =>
            prev.map((d) => (d.id === domainId ? { ...d, verified: true, verified_at: new Date().toISOString() } : d))
          )
        } else {
          setDomainError('Snippet found but verification failed.')
        }
      } else {
        setDomainError(`No snippet found on ${url}. Install the A/B script first.`)
      }
    } catch {
      setDomainError('Connection failed.')
    } finally {
      setVerifying(null)
    }
  }

  async function deleteDomain(domainId: string) {
    setDomainBusy(true)
    setDomainError('')
    try {
      const res = await fetch(`/api/domains?id=${domainId}`, { method: 'DELETE' })
      if (res.ok) {
        setDomains((prev) => prev.filter((d) => d.id !== domainId))
      } else {
        const data = await res.json()
        setDomainError(data.error ?? 'Failed to remove domain.')
      }
    } catch {
      setDomainError('Connection failed.')
    } finally {
      setDomainBusy(false)
      setDeleteId(null)
    }
  }

  async function addAdditionalPage() {
    if (!addUrl.trim()) return

    const normalized = normalize(addUrl)
    if (!normalized || !normalized.includes('.')) {
      setAddError('Please enter a valid domain (e.g. yoursite.com)')
      return
    }
    if (domains.some((d) => d.url === normalized)) {
      setAddError('That page is already connected.')
      return
    }

    setAddError('')
    setAddState('saving')

    const result = await saveDomainAndVerify(normalized)
    if (!result.ok) {
      if (result.reason === 'limit-reached') {
        setAddError(result.error ?? 'Page limit reached.')
        setAddState('limit')
      } else if (result.reason === 'save-failed') {
        setAddError(result.error ?? 'Failed to save domain.')
        setAddState('input')
      } else {
        setAddState('not-found')
      }
      return
    }

    setDomains((prev) => [...prev, { id: result.domainId, url: normalized, verified: true, verified_at: new Date().toISOString() }])
    setAddState('verified')
  }

  /**
   * Only reachable from the single-domain 'limit' state. Checks the snippet
   * on the candidate URL FIRST — the existing page is only deleted once the
   * replacement is confirmed live, so a failed check never leaves the
   * account without a working page (the old change-flow deleted first).
   */
  async function replaceExistingPage() {
    const existing = domains[0]
    const normalized = normalize(addUrl)
    if (!existing || !normalized) return

    setAddState('replacing')
    setAddError('')

    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: normalized }),
      })
      const checkJson = await checkRes.json()
      if (!checkJson.detected) {
        setAddState('not-found')
        return
      }
    } catch {
      setAddError('Connection failed.')
      setAddState('limit')
      return
    }

    try {
      await fetch(`/api/domains?id=${existing.id}`, { method: 'DELETE' })
    } catch { /* best-effort */ }

    const result = await saveDomainAndVerify(normalized)
    if (!result.ok) {
      setAddError(result.error ?? 'Something went wrong while replacing your page — please re-add it.')
      setAddState('input')
      return
    }

    setDomains([{ id: result.domainId, url: normalized, verified: true, verified_at: new Date().toISOString() }])
    setAddState('verified')
  }

  function resetAddFlow() {
    setAddingPage(false)
    setAddUrl('')
    setAddState('input')
    setAddError('')
    setDomainError('')
  }

  async function deleteAccount() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
      })
      if (res.ok) {
        await getBrowserSupabase().auth.signOut()
        window.location.href = '/'
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete account.')
      }
    } catch {
      setError('Connection failed.')
    } finally {
      setDeleting(false)
    }
  }

  async function logout() {
    await getBrowserSupabase().auth.signOut()
    window.location.href = '/'
  }

  async function copyToken() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = token
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  async function regenerateToken() {
    setTokenBusy(true)
    try {
      const res = await fetch('/api/token/regenerate', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.token) {
        setToken(data.token)
        setRegenerateConfirm(false)
      } else {
        setError(data.error ?? 'Failed to regenerate token.')
      }
    } catch {
      setError('Connection failed.')
    } finally {
      setTokenBusy(false)
    }
  }

  const dangerConfirm = `delete ${email}`

  return (
    <div className="min-w-0 flex-1 px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-[18px] font-semibold text-text">Account</h1>

        {/* Avatar */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Profile Picture</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Avatar preview */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-white/10 transition-colors hover:border-white/[0.18] disabled:opacity-50"
              aria-label="Change profile picture"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={email ?? 'Profile picture'}
                  width={64}
                  height={64}
                  className="h-full w-full rounded-full object-cover"
                  unoptimized
                  key={avatarUrl}
                />
              ) : (
                <User className="h-6 w-6 text-text-3" />
              )}
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </button>

            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[12px] text-text-3">
                {avatarUrl
                  ? 'Click the image to upload a new picture. PNG, JPEG, WebP or GIF — max 2 MB.'
                  : 'Upload a profile picture. PNG, JPEG, WebP or GIF — max 2 MB.'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadAvatar(file)
                  // Reset so re-selecting the same file works
                  e.target.value = ''
                }}
              />
              {avatarUrl && (
                <button
                  onClick={async () => {
                    setAvatarUploading(true)
                    try {
                      await fetch('/api/profile/avatar', { method: 'DELETE' })
                      setAvatarUrl(null)
                      router.refresh()
                    } catch {
                      setAvatarError('Failed to remove.')
                    } finally {
                      setAvatarUploading(false)
                    }
                  }}
                  disabled={avatarUploading}
                  className="text-[11px] text-text-3 underline hover:text-err disabled:opacity-40"
                >
                  Remove
                </button>
              )}
              {avatarError && (
                <p className="text-[11px] text-err">{avatarError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Current email */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Email</span>
          </div>
          <p className="text-[15px] font-medium text-text">{email}</p>

          <div className="mt-4 space-y-3">
            <p className="text-[11px] text-text-3">Change to a new email address. A confirmation link will be sent.</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
                className="flex-1 rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
              />
              <button
                onClick={changeEmail}
                disabled={busy || emailSent}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : emailSent ? <Check className="h-3.5 w-3.5" /> : null}
                {emailSent ? 'Sent' : 'Change'}
              </button>
            </div>
            {emailSent && (
              <p className="flex items-center gap-1.5 text-[12px] text-ok">
                <Check className="h-3 w-3" />
                Confirmation sent — check both old and new inbox.
              </p>
            )}
          </div>
        </div>

        {/* Connected Pages */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Connected Pages</span>
          </div>

          <p className="mb-4 text-[12px] text-text-3 leading-relaxed">
            This is where your variante snippet lives. We check these pages to verify the snippet is installed.
            Subpages like <code className="rounded-[3px] bg-white/[0.06] px-1 text-[11px]">/pricing</code> inherit the snippet automatically — no need to add them separately.
            When creating a test, you can use <strong className="text-text-2">any URL on a connected domain</strong>.
          </p>

          {/* ── Empty state ── */}
          {domains.length === 0 && !addingPage && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-pro/30 bg-pro/[0.03] px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-pro" />
                <p className="text-[13px] text-pro">No page connected yet — tests won&apos;t run without a snippet.</p>
              </div>
              <button
                onClick={() => { setAddingPage(true); setAddState('input'); setAddError(''); setAddUrl('') }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover"
              >
                Seite hinzufügen
              </button>
            </div>
          )}

          {/* ── Page list — every domain gets identical treatment, no "primary" special-case ── */}
          {domains.length > 0 && (
            <div className="space-y-1.5">
              {domains.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 ${
                    d.verified ? 'border-ok/20 bg-ok/[0.04]' : 'border-pro/20 bg-pro/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] font-medium text-text truncate">{d.url}</span>
                    {d.verified ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-ok/15 px-1.5 py-0.5 text-[9px] font-semibold text-ok">
                        <Check className="h-2.5 w-2.5" /> Verified
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-pro/15 px-1.5 py-0.5 text-[9px] font-semibold text-pro">
                        <AlertTriangle className="h-2.5 w-2.5" /> Not verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!d.verified && (
                      <button
                        onClick={() => verifyDomain(d.id, d.url)}
                        disabled={verifying === d.id}
                        className="cursor-pointer rounded-[var(--radius-sm)] px-2 py-1 text-[10px] font-semibold text-text-2 transition-colors hover:text-text disabled:opacity-40"
                      >
                        {verifying === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-verify'}
                      </button>
                    )}
                    {deleteId === d.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteDomain(d.id)}
                          disabled={domainBusy}
                          className="cursor-pointer rounded-[var(--radius-sm)] bg-err px-2 py-0.5 text-[9px] font-semibold text-white hover:bg-err/90 disabled:opacity-40"
                        >
                          {domainBusy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          disabled={domainBusy}
                          className="cursor-pointer rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[9px] text-text-3 hover:text-text"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(d.id)}
                        className="cursor-pointer rounded-[var(--radius-sm)] p-1 text-text-3/50 transition-colors hover:text-err"
                        aria-label={`Remove ${d.url}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Add-page trigger — same flow for page 1 and page N, so this is the only "add" button in the section ── */}
          {domains.length > 0 && !addingPage && (
            <div className="mt-2">
              {plan === 'free' ? (
                <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-pro/20 bg-pro/[0.02] px-3 py-2">
                  <span className="text-[10px] font-medium text-pro/80">Free plan: 1 page</span>
                  <a href="/dashboard/billing" className="text-[10px] font-semibold text-pro underline hover:text-pro/80 transition-colors">Pro includes 5 pages →</a>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingPage(true); setAddState('input'); setAddError(''); setAddUrl('') }}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border py-2 text-[10px] font-semibold text-text-3 transition-colors hover:border-border-strong hover:text-text-2"
                >
                  + Weitere Seite hinzufügen
                </button>
              )}
            </div>
          )}

          {/* ── Inline add form — input → saving → verified / not-found / limit ── */}
          {addingPage && (
            <div className="mt-3 space-y-2 rounded-[var(--radius-md)] bg-bg-2 p-3">
              {(addState === 'input' || addState === 'saving') && (
                <>
                  <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-1 px-2.5 py-2">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-text-3" />
                    <input
                      type="text"
                      value={addUrl}
                      onChange={(e) => { setAddUrl(e.target.value); setAddError('') }}
                      onKeyDown={(e) => e.key === 'Enter' && addAdditionalPage()}
                      placeholder="yoursite.com"
                      disabled={addState !== 'input'}
                      autoFocus
                      className="flex-1 bg-transparent text-[12px] text-text placeholder:text-text-3/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
                    />
                  </div>
                  {addError && <p className="text-[11px] text-err">{addError}</p>}
                  <div className="flex gap-1.5">
                    <button
                      onClick={addAdditionalPage}
                      disabled={addState !== 'input' || !addUrl.trim()}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-fill-invert py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:opacity-30"
                    >
                      {addState === 'saving' ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Saving & checking…
                        </>
                      ) : (
                        'Add'
                      )}
                    </button>
                    <button
                      onClick={resetAddFlow}
                      className="cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {addState === 'not-found' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-pro">Snippet not found on <strong>{normalize(addUrl)}</strong>. Add it to the page&apos;s &lt;head&gt; and retry.</p>
                  <div className="flex gap-1.5">
                    <button onClick={addAdditionalPage} className="flex cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">
                      <Loader2 className="h-2.5 w-2.5" /> Retry
                    </button>
                    <button onClick={() => { setAddState('input'); setAddError('') }} className="cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Change URL</button>
                    <button onClick={resetAddFlow} className="cursor-pointer rounded-[var(--radius-sm)] px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Cancel</button>
                  </div>
                </div>
              )}

              {/* Plan limit hit — a contextual swap prompt instead of a permanent "Change" button */}
              {addState === 'limit' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-pro">{addError || 'Page limit reached.'}</p>
                  {domains.length === 1 ? (
                    <>
                      <p className="text-[11px] text-text-3">
                        Replace <strong className="text-text-2">{domains[0].url}</strong> with <strong className="text-text-2">{normalize(addUrl)}</strong>?
                        We&apos;ll confirm the new snippet is live first — your current page stays connected until then.
                      </p>
                      <div className="flex gap-1.5">
                        <button onClick={replaceExistingPage} className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">
                          Replace page
                        </button>
                        <button onClick={resetAddFlow} className="cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-1.5">
                      <a href="/dashboard/billing" className="cursor-pointer rounded-[var(--radius-sm)] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">Upgrade plan</a>
                      <button onClick={resetAddFlow} className="cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Cancel</button>
                    </div>
                  )}
                </div>
              )}

              {addState === 'replacing' && (
                <div className="flex items-center gap-2 text-[11px] text-text-3">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking snippet on {normalize(addUrl)}…
                </div>
              )}

              {addState === 'verified' && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-ok"><Check className="h-3 w-3" /> <strong>{normalize(addUrl)}</strong> added &amp; verified.</p>
                  <button onClick={resetAddFlow} className="cursor-pointer rounded-[var(--radius-sm)] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">Done</button>
                </div>
              )}
            </div>
          )}

          {domainError && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-err">
              <AlertTriangle className="h-3 w-3" />
              {domainError}
            </p>
          )}
        </div>

        {/* Experiments — Auto-Promotion & Winner-Mails (Plan RA-06) */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="h-4 w-4 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Experiments</span>
          </div>

          <div className="space-y-4">
            {/* Auto-apply winners */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <label htmlFor="auto-promote" className="cursor-pointer text-[13px] font-medium text-text">
                  Apply winners automatically
                </label>
                <p className="mt-1 text-[11px] leading-relaxed text-text-3">
                  When a test reaches significance, serve the winning variant to{' '}
                  <strong className="font-medium text-text-2">all</strong> visitors and close the test.
                  Turn this off to review each winner before it goes live on your site.
                </p>
              </div>
              <Toggle
                id="auto-promote"
                checked={autoPromote}
                onChange={(next) => savePreference({ auto_promote_winner: next })}
                label="Apply winners automatically"
              />
            </div>

            {!autoPromote && (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
                <p className="text-[11px] leading-relaxed text-text-3">
                  Winners will be recorded and you&apos;ll be notified, but nothing changes on your site
                  until you hit <strong className="font-medium text-text-2">Apply winner</strong> on the
                  test. Tests keep running at their current split in the meantime.
                </p>
              </div>
            )}

            <div className="h-px bg-border" />

            {/* Winner emails */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <label htmlFor="notify-winner" className="cursor-pointer text-[13px] font-medium text-text">
                  Email me when a test finds a winner
                </label>
                <p className="mt-1 text-[11px] leading-relaxed text-text-3">
                  One email per test, sent to <strong className="font-medium text-text-2">{email}</strong>.
                  In-app notifications stay on either way.
                </p>
              </div>
              <Toggle
                id="notify-winner"
                checked={notifyWinner}
                onChange={(next) => savePreference({ notify_on_winner: next })}
                label="Email me when a test finds a winner"
              />
            </div>

            {prefsError && (
              <p className="flex items-center gap-1.5 text-[11px] text-err" role="alert">
                <AlertTriangle className="h-3.5 w-3.5" />
                {prefsError}
              </p>
            )}
          </div>
        </div>

        {/* Password */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Password</span>
          </div>
          <p className="text-[11px] text-text-3">
            Receive a reset link at <strong className="font-medium text-text-2">{email}</strong>.
          </p>
          <button
            onClick={changePassword}
            disabled={busy || pwSent}
            className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-4 py-2 text-[11px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pwSent ? <Check className="h-3.5 w-3.5 text-ok" /> : <Key className="h-3.5 w-3.5" />}
            {pwSent ? 'Link sent — check your inbox' : 'Send password reset link'}
          </button>
        </div>

        {/* API Token — used by Figma plugin and API access */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">API Token</span>
          </div>

          {!token ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-pro/30 bg-pro/[0.03] px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-pro" />
                <p className="text-[12px] text-pro">No API token found. This is required for the Figma plugin.</p>
              </div>
              <button
                onClick={regenerateToken}
                disabled={tokenBusy}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:opacity-40"
              >
                {tokenBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                Generate token
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-text-3 leading-relaxed">
                This token authenticates the <strong className="text-text-2">Figma plugin</strong> and API requests.
                Treat it like a password — do not share it publicly.
              </p>

              {/* Token display */}
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2.5">
                <Key className="h-3.5 w-3.5 shrink-0 text-text-3" />
                <code className="flex-1 text-[12px] font-mono text-text truncate select-all">
                  {showToken ? token : `••••••••••••••••${token.slice(-4)}`}
                </code>
                <button
                  onClick={() => setShowToken((v) => !v)}
                  className="shrink-0 cursor-pointer text-[10px] text-text-3 transition-colors hover:text-text-2"
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyToken}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[11px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text"
                >
                  {tokenCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                  {tokenCopied ? 'Copied' : 'Copy'}
                </button>

                {!regenerateConfirm ? (
                  <button
                    onClick={() => setRegenerateConfirm(true)}
                    className="cursor-pointer rounded-[var(--radius-md)] px-3 py-1.5 text-[11px] font-medium text-text-3 transition-colors hover:text-err"
                  >
                    Regenerate
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={regenerateToken}
                      disabled={tokenBusy}
                      className="flex cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] bg-err px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:bg-err/90 disabled:opacity-40"
                    >
                      {tokenBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Confirm
                    </button>
                    <button
                      onClick={() => setRegenerateConfirm(false)}
                      disabled={tokenBusy}
                      className="cursor-pointer rounded-[var(--radius-sm)] px-2 py-1 text-[10px] text-text-3 transition-colors hover:text-text disabled:opacity-30"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-text-3/60">
                Regenerating invalidates the old token immediately. Update it in the Figma plugin afterwards.
              </p>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="rounded-[var(--radius-lg)] border border-err/20 bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-err" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-err">Danger Zone</span>
          </div>
          {!showDelete ? (
            <>
              <p className="text-[12px] leading-relaxed text-text-3">
                Permanently delete your account and all associated data — experiments, stats, and settings. This cannot be undone.
              </p>
              <button
                onClick={() => setShowDelete(true)}
                className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-err/20 bg-err-bg px-4 py-2 text-[11px] font-semibold text-err transition-colors hover:bg-err/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete account
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-err">
                Type <code className="rounded-[var(--radius-sm)] bg-err-bg px-1.5 py-0.5 font-mono text-[12px]">{dangerConfirm}</code> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={dangerConfirm}
                className="w-full rounded-[var(--radius-md)] border border-err/20 bg-bg-2 px-3 py-2 font-mono text-[13px] text-text placeholder:text-text-3 focus:border-err/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={deleting || deleteConfirm !== dangerConfirm}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-err px-4 py-2 text-[11px] font-semibold text-white transition-opacity hover:bg-err/90 disabled:opacity-30"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {deleting ? 'Deleting…' : 'Yes, delete my account'}
                </button>
                <button
                  onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                  disabled={deleting}
                  className="cursor-pointer rounded-[var(--radius-md)] border border-border px-4 py-2 text-[11px] font-semibold text-text-3 transition-colors hover:text-text disabled:opacity-30"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[var(--radius-md)] border border-err/20 bg-err-bg px-4 py-3 text-[12px] text-err">
            {error}
          </div>
        )}

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={logout}
            className="cursor-pointer text-[12px] text-text-3 transition-colors hover:text-err"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
