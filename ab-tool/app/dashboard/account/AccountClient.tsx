'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import type { Domain, AddState } from './types'
import { AvatarSection } from './sections/AvatarSection'
import { EmailSection } from './sections/EmailSection'
import { ConnectedPagesSection } from './sections/ConnectedPagesSection'
import { ExperimentSettingsSection } from './sections/ExperimentSettingsSection'
import { PasswordSection } from './sections/PasswordSection'
import { ApiTokenSection } from './sections/ApiTokenSection'
import { DangerZoneSection } from './sections/DangerZoneSection'

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
  const [addState, setAddState] = useState<AddState>('input')
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

        <AvatarSection
          email={email}
          router={router}
          avatarUrl={avatarUrl}
          setAvatarUrl={setAvatarUrl}
          avatarUploading={avatarUploading}
          avatarError={avatarError}
          fileInputRef={fileInputRef}
          uploadAvatar={uploadAvatar}
          setAvatarUploading={setAvatarUploading}
          setAvatarError={setAvatarError}
        />

        <EmailSection
          email={email}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          emailSent={emailSent}
          busy={busy}
          changeEmail={changeEmail}
        />

        <ConnectedPagesSection
          plan={plan}
          domains={domains}
          domainBusy={domainBusy}
          domainError={domainError}
          verifying={verifying}
          deleteId={deleteId}
          setDeleteId={setDeleteId}
          addingPage={addingPage}
          setAddingPage={setAddingPage}
          addUrl={addUrl}
          setAddUrl={setAddUrl}
          addState={addState}
          setAddState={setAddState}
          addError={addError}
          setAddError={setAddError}
          normalize={normalize}
          verifyDomain={verifyDomain}
          deleteDomain={deleteDomain}
          addAdditionalPage={addAdditionalPage}
          replaceExistingPage={replaceExistingPage}
          resetAddFlow={resetAddFlow}
        />

        <ExperimentSettingsSection
          email={email}
          autoPromote={autoPromote}
          notifyWinner={notifyWinner}
          prefsError={prefsError}
          savePreference={savePreference}
        />

        <PasswordSection
          email={email}
          pwSent={pwSent}
          busy={busy}
          changePassword={changePassword}
        />

        <ApiTokenSection
          token={token}
          showToken={showToken}
          setShowToken={setShowToken}
          tokenCopied={tokenCopied}
          tokenBusy={tokenBusy}
          regenerateConfirm={regenerateConfirm}
          setRegenerateConfirm={setRegenerateConfirm}
          copyToken={copyToken}
          regenerateToken={regenerateToken}
        />

        <DangerZoneSection
          showDelete={showDelete}
          setShowDelete={setShowDelete}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
          deleting={deleting}
          deleteAccount={deleteAccount}
          dangerConfirm={dangerConfirm}
        />

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
