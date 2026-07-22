'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { Mail, Globe, Key, Trash2, AlertTriangle, Check, Loader2, X, Camera, User } from 'lucide-react'
import Image from 'next/image'

type Domain = { id: string; url: string; verified: boolean; verified_at?: string | null }

export function AccountClient({ email, domains: initialDomains, avatarUrl: initialAvatar, plan }: { email: string; domains: Domain[]; avatarUrl: string | null; plan: string }) {
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
  // ── Change connected page inline flow ──
  const [changingPage, setChangingPage] = useState(false)
  const [changeUrl, setChangeUrl] = useState('')
  const [changeState, setChangeState] = useState<'input' | 'deleting' | 'saving' | 'checking' | 'not-found' | 'verified'>('input')
  const [changeError, setChangeError] = useState('')
  // ── Add additional page inline flow ──
  const [addingPage, setAddingPage] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addState, setAddState] = useState<'input' | 'saving' | 'checking' | 'not-found' | 'verified'>('input')
  const [addError, setAddError] = useState('')

  // ── Helper ──
  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  const [newEmail, setNewEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [pwSent, setPwSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

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
        body: JSON.stringify({ url }),
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

  async function changeConnectedPage() {
    const primary = domains[0]
    if (!primary || !changeUrl.trim()) return

    const normalized = normalize(changeUrl)
    if (!normalized || !normalized.includes('.')) {
      setChangeError('Please enter a valid domain (e.g. yoursite.com)')
      return
    }

    // Don't replace with the same URL
    if (normalized === primary.url) {
      setChangeError('That already is your connected page.')
      return
    }

    setChangeError('')

    // Free-Plan (Limit=1): Delete old FIRST to free the slot
    if (plan === 'free') {
      setChangeState('deleting')
      try {
        const delRes = await fetch(`/api/domains?id=${primary.id}`, { method: 'DELETE' })
        if (!delRes.ok) {
          const data = await delRes.json().catch(() => ({}))
          setChangeError(data.error || 'Failed to remove current page.')
          setChangeState('input')
          return
        }
      } catch {
        setChangeError('Connection failed.')
        setChangeState('input')
        return
      }
    }

    // Save new domain
    setChangeState('saving')
    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
      if (saveRes.status === 402) {
        const data = await saveRes.json().catch(() => ({}))
        setChangeError(data.error || 'Domain limit reached.')
        setChangeState('input')
        return
      }
      if (!saveRes.ok && saveRes.status !== 409) {
        const data = await saveRes.json().catch(() => ({}))
        setChangeError(data.error || 'Failed to save domain. Refresh the page and try again.')
        setChangeState('input')
        return
      }
    } catch {
      setChangeError('Connection failed.')
      setChangeState('input')
      return
    }

    // Snippet check
    setChangeState('checking')
    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: normalized }),
      })
      const json = await checkRes.json()

      if (!json.detected) {
        // If snippet not found and we already deleted the old domain (Free plan),
        // the user is in a broken state — show error with recovery option
        if (plan === 'free') {
          setChangeError('Snippet not found on the new domain, and the old domain was removed. Re-add your previous domain or install the snippet first.')
        }
        setChangeState('not-found')
        return
      }
    } catch {
      setChangeState('not-found')
      return
    }

    // Verify new domain + capture server ID
    let newDomainId: string | undefined
    try {
      const domainsRes = await fetch('/api/domains')
      const { domains: freshDomains } = await domainsRes.json()
      const newDomain = (freshDomains || []).find((d: Domain) => d.url === normalized)
      if (newDomain?.id) {
        newDomainId = newDomain.id
        await fetch('/api/domains/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domainId: newDomain.id }),
        })
      }
    } catch { /* Verify is best-effort */ }

    // Pro/Agency: Delete old domain AFTER new one is verified
    if (plan !== 'free') {
      try {
        await fetch(`/api/domains?id=${primary.id}`, { method: 'DELETE' })
      } catch { /* best-effort — old domain may remain but new one works */ }
    }

    // Update local state — remove old, add new at front
    // ponytail: use server ID, not crypto.randomUUID() — fake IDs break delete/verify
    setDomains((prev) => {
      const withoutOld = prev.filter((d) => d.id !== primary.id)
      return [{ id: newDomainId ?? crypto.randomUUID(), url: normalized, verified: true, verified_at: new Date().toISOString() }, ...withoutOld]
    })
    setChangeState('verified')
  }

  async function addAdditionalPage() {
    if (!addUrl.trim()) return

    const normalized = normalize(addUrl)
    if (!normalized || !normalized.includes('.')) {
      setAddError('Please enter a valid domain (e.g. yoursite.com)')
      return
    }

    setAddError('')
    setAddState('saving')

    // 1. Save domain
    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
      if (saveRes.status === 402) {
        const data = await saveRes.json().catch(() => ({ error: 'Domain limit reached.' }))
        setAddError(data.error || 'Domain limit reached.')
        setAddState('input')
        return
      }
      if (!saveRes.ok && saveRes.status !== 409) {
        const data = await saveRes.json().catch(() => ({}))
        setAddError(data.error || 'Failed to save domain.')
        setAddState('input')
        return
      }
    } catch {
      setAddError('Connection failed.')
      setAddState('input')
      return
    }

    // 2. Snippet check
    setAddState('checking')
    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: normalized }),
      })
      const json = await checkRes.json()
      if (!json.detected) {
        setAddState('not-found')
        return
      }
    } catch {
      setAddState('not-found')
      return
    }

    // 3. Verify + capture server ID
    let newDomainId: string | undefined
    try {
      const domainsRes = await fetch('/api/domains')
      const { domains: freshDomains } = await domainsRes.json()
      const newDomain = (freshDomains || []).find((d: Domain) => d.url === normalized)
      if (newDomain?.id) {
        newDomainId = newDomain.id
        await fetch('/api/domains/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domainId: newDomain.id }),
        })
      }
    } catch { /* best-effort */ }

    // 4. Update local state
    // ponytail: use server ID, not crypto.randomUUID() — fake IDs break delete/verify
    setDomains((prev) => [...prev, { id: newDomainId ?? crypto.randomUUID(), url: normalized, verified: true, verified_at: new Date().toISOString() }])
    setAddState('verified')
  }

  function resetAddFlow() {
    setAddingPage(false)
    setAddUrl('')
    setAddState('input')
    setAddError('')
  }

  function resetChangeFlow() {
    setChangingPage(false)
    setChangeUrl('')
    setChangeState('input')
    setChangeError('')
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

  const dangerConfirm = `delete ${email}`

  return (
    <div className="min-w-0 flex-1 px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-[18px] font-semibold text-text">Account</h1>

        {/* Avatar */}
        <div className="rounded-[10px] border border-border bg-bg-1 p-5">
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
        <div className="rounded-[10px] border border-border bg-bg-1 p-5">
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
                className="flex-1 rounded-[6px] border border-border bg-bg-2 px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-border-strong focus:outline-none"
              />
              <button
                onClick={changeEmail}
                disabled={busy || emailSent}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-40"
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

        {/* Connected Page */}
        <div className="rounded-[10px] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Connected Page</span>
          </div>

          <p className="mb-4 text-[12px] text-text-3 leading-relaxed">
            This is where your variante snippet lives. We check this page to verify the snippet is installed.
            Subpages like <code className="rounded-[3px] bg-white/[0.06] px-1 text-[11px]">/pricing</code> inherit the snippet automatically — no need to add them separately.
            When creating a test, you can use <strong className="text-text-2">any URL on this domain</strong>.
          </p>

          {/* ── No connected page ── */}
          {domains.length === 0 && !changingPage && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-[6px] border border-dashed border-pro/30 bg-pro/[0.03] px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-pro" />
                <p className="text-[13px] text-pro">No page connected yet — tests won&apos;t run without a snippet.</p>
              </div>
              <button
                onClick={() => { setChangingPage(true); setChangeState('input'); setChangeError('') }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
              >
                Connect a page
              </button>
            </div>
          )}

          {/* ── Connected page card ── */}
          {domains.length > 0 && !changingPage && (
            <div className="space-y-3">
              {/* Primary domain */}
              <div className="rounded-[8px] border border-ok/20 bg-ok/[0.04] px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ok/15">
                      <Check className="h-3.5 w-3.5 text-ok" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-text truncate">{domains[0].url}</span>
                        {domains[0].verified ? (
                          <span className="flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-semibold text-ok">
                            <Check className="h-2.5 w-2.5" /> Snippet active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-pro/15 px-2 py-0.5 text-[10px] font-semibold text-pro">
                            <AlertTriangle className="h-2.5 w-2.5" /> Not verified
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-3">Snippet-tested on every health check</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!domains[0].verified && (
                      <button
                        onClick={() => verifyDomain(domains[0].id, domains[0].url)}
                        disabled={verifying === domains[0].id}
                        className="cursor-pointer rounded-[6px] border border-border px-3 py-1.5 text-[10px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-40"
                      >
                        {verifying === domains[0].id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-verify'}
                      </button>
                    )}
                    <button
                      onClick={() => { setChangingPage(true); setChangeState('input'); setChangeError(''); setChangeUrl('') }}
                      className="cursor-pointer rounded-[6px] border border-border px-3 py-1.5 text-[10px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional domains */}
              {(domains.length > 1 || addingPage) && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-3/60">Additional pages</p>
                  {domains.slice(1).map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-[6px] bg-bg-2 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13px] text-text-2 truncate">{d.url}</span>
                        {d.verified ? (
                          <span className="shrink-0 rounded-full bg-ok/10 px-1.5 py-0.5 text-[9px] font-semibold text-ok">Verified</span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-pro/10 px-1.5 py-0.5 text-[9px] font-semibold text-pro">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!d.verified && (
                          <button
                            onClick={() => verifyDomain(d.id, d.url)}
                            disabled={verifying === d.id}
                            className="cursor-pointer rounded-[4px] px-2 py-1 text-[10px] text-text-3 transition-colors hover:text-text disabled:opacity-40"
                          >
                            {verifying === d.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Verify'}
                          </button>
                        )}
                        {deleteId === d.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteDomain(d.id)}
                              disabled={domainBusy}
                              className="cursor-pointer rounded-[4px] bg-err px-2 py-0.5 text-[9px] font-semibold text-white hover:opacity-85 disabled:opacity-40"
                            >
                              {domainBusy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              disabled={domainBusy}
                              className="cursor-pointer rounded-[4px] px-1.5 py-0.5 text-[9px] text-text-3 hover:text-text"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(d.id)}
                            className="cursor-pointer rounded-[4px] p-1 text-text-3/50 transition-colors hover:text-err"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add page button or inline form */}
                  {!addingPage ? (
                    <button
                      onClick={() => { setAddingPage(true); setAddState('input'); setAddError(''); setAddUrl('') }}
                      className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-border py-2 text-[10px] font-semibold text-text-3 transition-colors hover:border-border-strong hover:text-text-2"
                    >
                      + Add page
                    </button>
                  ) : (
                    <div className="space-y-2 rounded-[6px] bg-bg-2 p-3">
                      {(addState === 'input' || addState === 'saving' || addState === 'checking') && (
                        <>
                          <div className="flex items-center gap-2 rounded-[4px] border border-border bg-bg-1 px-2.5 py-2">
                            <Globe className="h-3.5 w-3.5 shrink-0 text-text-3" />
                            <input
                              type="text"
                              value={addUrl}
                              onChange={(e) => { setAddUrl(e.target.value); setAddError('') }}
                              onKeyDown={(e) => e.key === 'Enter' && addAdditionalPage()}
                              placeholder="another-site.com"
                              disabled={addState !== 'input'}
                              autoFocus
                              className="flex-1 bg-transparent text-[12px] text-text placeholder:text-text-3/50 outline-none"
                            />
                          </div>
                          {addError && <p className="text-[11px] text-err">{addError}</p>}
                          <div className="flex gap-1.5">
                            <button
                              onClick={addAdditionalPage}
                              disabled={addState !== 'input' || !addUrl.trim()}
                              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] bg-fill-invert py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-30"
                            >
                              {addState === 'saving' || addState === 'checking' ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  {addState === 'saving' ? 'Saving…' : 'Checking snippet…'}
                                </>
                              ) : (
                                'Add'
                              )}
                            </button>
                            <button
                              onClick={resetAddFlow}
                              className="cursor-pointer rounded-[4px] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                      {addState === 'not-found' && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-pro">Snippet not found on <strong>{addUrl.trim()}</strong>. Add it to the page&apos;s &lt;head&gt; and retry.</p>
                          <div className="flex gap-1.5">
                            <button onClick={addAdditionalPage} className="flex cursor-pointer items-center gap-1 rounded-[4px] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:opacity-85">
                              <Loader2 className="h-2.5 w-2.5" /> Retry
                            </button>
                            <button onClick={() => { setAddState('input'); setAddError('') }} className="cursor-pointer rounded-[4px] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Change URL</button>
                            <button onClick={resetAddFlow} className="cursor-pointer rounded-[4px] px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Cancel</button>
                          </div>
                        </div>
                      )}
                      {addState === 'verified' && (
                        <div className="space-y-2">
                          <p className="flex items-center gap-1.5 text-[11px] text-ok"><Check className="h-3 w-3" /> <strong>{addUrl.trim()}</strong> added &amp; verified.</p>
                          <button onClick={resetAddFlow} className="cursor-pointer rounded-[4px] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:opacity-85">Done</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Inline change flow ── */}
          {changingPage && (
            <div className="space-y-3">
              {/* Back button when showing results */}
              {(changeState === 'not-found' || changeState === 'verified') && (
                <button
                  onClick={resetChangeFlow}
                  className="cursor-pointer text-[11px] text-text-3 underline hover:text-text-2"
                >
                  ← Cancel
                </button>
              )}

              {/* Input / Saving / Checking */}
              {(changeState === 'input' || changeState === 'deleting' || changeState === 'saving' || changeState === 'checking') && (
                <>
                  <div className="flex items-center gap-2 rounded-[6px] border border-border bg-bg-2 px-3 py-2.5">
                    <Globe className="h-4 w-4 shrink-0 text-text-3" />
                    <input
                      type="text"
                      value={changeUrl}
                      onChange={(e) => { setChangeUrl(e.target.value); setChangeError('') }}
                      onKeyDown={(e) => e.key === 'Enter' && changeConnectedPage()}
                      placeholder={domains.length > 0 ? 'new-domain.com' : 'yoursite.com'}
                      disabled={changeState !== 'input'}
                      autoFocus
                      className="flex-1 bg-transparent text-[14px] text-text placeholder:text-text-3/50 outline-none"
                    />
                  </div>

                  {changeError && <p className="text-[12px] text-err">{changeError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={changeConnectedPage}
                      disabled={changeState !== 'input' || !changeUrl.trim()}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-fill-invert py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-30"
                    >
                      {changeState === 'deleting' || changeState === 'saving' || changeState === 'checking' ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {changeState === 'deleting' ? 'Removing current…' : changeState === 'saving' ? 'Saving…' : 'Checking snippet…'}
                        </>
                      ) : (
                        domains.length > 0 ? 'Replace connected page' : 'Connect page'
                      )}
                    </button>
                    {domains.length > 0 && changeState === 'input' && (
                      <button
                        onClick={resetChangeFlow}
                        className="cursor-pointer rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-3 transition-colors hover:text-text"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Not found */}
              {changeState === 'not-found' && (
                <div className="rounded-[6px] border border-pro/20 bg-pro/[0.04] px-4 py-3">
                  <p className="text-[13px] font-semibold text-pro">Snippet not found</p>
                  <p className="mt-1 text-[12px] text-text-3">
                    We couldn&apos;t detect the variante snippet on <strong>{changeUrl.trim() || '(your URL)'}</strong>.
                    Add the snippet to your site&apos;s <code className="rounded-[3px] bg-white/[0.06] px-1 text-[11px]">&lt;head&gt;</code>, then try again.
                  </p>
                  {changeError && (
                    <p className="mt-2 text-[11px] text-err">{changeError}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={changeConnectedPage}
                      className="flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => { setChangeState('input'); setChangeError('') }}
                      className="cursor-pointer rounded-[6px] border border-border px-4 py-2 text-[11px] text-text-3 transition-colors hover:text-text"
                    >
                      Change URL
                    </button>
                  </div>
                </div>
              )}

              {/* Verified */}
              {changeState === 'verified' && (
                <div className="rounded-[6px] border border-ok/20 bg-ok/[0.04] px-4 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ok">
                    <Check className="h-4 w-4" /> Page connected
                  </p>
                  <p className="mt-1 text-[12px] text-text-3">
                    <strong>{changeUrl.trim()}</strong> is now your connected page. Snippet verified and active.
                  </p>
                  <button
                    onClick={resetChangeFlow}
                    className="mt-3 cursor-pointer rounded-[6px] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          {domainError && !changingPage && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-err">
              <AlertTriangle className="h-3 w-3" />
              {domainError}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="rounded-[10px] border border-border bg-bg-1 p-5">
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
            className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-[11px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pwSent ? <Check className="h-3.5 w-3.5 text-ok" /> : <Key className="h-3.5 w-3.5" />}
            {pwSent ? 'Link sent — check your inbox' : 'Send password reset link'}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="rounded-[10px] border border-err/20 bg-bg-1 p-5">
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
                className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-err/20 bg-err-bg px-4 py-2 text-[11px] font-semibold text-err transition-colors hover:bg-err/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete account
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-err">
                Type <code className="rounded-[4px] bg-err-bg px-1.5 py-0.5 font-mono text-[12px]">{dangerConfirm}</code> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={dangerConfirm}
                className="w-full rounded-[6px] border border-err/20 bg-bg-2 px-3 py-2 font-mono text-[13px] text-text placeholder:text-text-3 focus:border-err/40 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={deleting || deleteConfirm !== dangerConfirm}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-err px-4 py-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-30"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {deleting ? 'Deleting…' : 'Yes, delete my account'}
                </button>
                <button
                  onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                  disabled={deleting}
                  className="cursor-pointer rounded-[6px] border border-border px-4 py-2 text-[11px] font-semibold text-text-3 transition-colors hover:text-text disabled:opacity-30"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[6px] border border-err/20 bg-err-bg px-4 py-3 text-[12px] text-err">
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
