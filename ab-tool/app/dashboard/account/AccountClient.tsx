'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { Mail, Globe, Key, Trash2, AlertTriangle, Check, Loader2, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'

const T = {
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

type Domain = { id: string; url: string; verified: boolean; verified_at?: string | null }

export function AccountClient({ email, domains: initialDomains }: { email: string; domains: Domain[] }) {
  const router = useRouter()
  const [domains, setDomains] = useState<Domain[]>(initialDomains)
  const [domainBusy, setDomainBusy] = useState(false)
  const [domainError, setDomainError] = useState('')
  const [verifying, setVerifying] = useState<string | null>(null) // domain id being verified
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [pwSent, setPwSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

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
        <h1 className="text-[18px] font-semibold text-[#ededed]">Account</h1>

        {/* Current email */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-[#ededed]/40" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Email</span>
          </div>
          <p className="text-[15px] font-medium text-[#ededed]">{email}</p>

          <div className="mt-4 space-y-3">
            <p className="text-[11px] text-[#ededed]/40">Change to a new email address. A confirmation link will be sent.</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
                className="flex-1 rounded-[6px] border border-white/10 bg-[#111111] px-3 py-2 text-[13px] text-[#ededed] placeholder:text-[#ededed]/50 focus:border-white/[0.18] focus:outline-none"
              />
              <button
                onClick={changeEmail}
                disabled={busy || emailSent}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-4 py-2 text-[11px] font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-40"
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

        {/* Website / Domain */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-[#ededed]/40" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Website</span>
          </div>

          {domains.length === 0 && (
            <div className="space-y-3">
              <p className="text-[12px] text-[#ededed]/40">No website connected. Head to Setup to add one.</p>
              <Link
                href="/dashboard/setup"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-4 py-2 text-[11px] font-semibold text-black transition-opacity hover:opacity-85"
              >
                Go to Setup
              </Link>
            </div>
          )}

          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-[6px] bg-[#111111] px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[14px] font-medium text-[#ededed] truncate">{d.url}</span>
                {d.verified ? (
                  <span className="flex items-center gap-1 rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok">
                    <Check className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-pro/10 px-2 py-0.5 text-[10px] font-semibold text-pro">Pending</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!d.verified && (
                  <button
                    onClick={() => verifyDomain(d.id, d.url)}
                    disabled={verifying === d.id}
                    className="cursor-pointer rounded-[6px] border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed] disabled:opacity-40"
                  >
                    {verifying === d.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Re-verify'
                    )}
                  </button>
                )}
                <a
                  href={`https://${d.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer rounded-[6px] p-1.5 text-[#ededed]/50 transition-colors hover:text-[#ededed]/60"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {deleteId === d.id ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-pro">
                      Active tests on this domain will be paused. Test configurations are preserved — reconnect anytime.
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteDomain(d.id)}
                        disabled={domainBusy}
                        className="cursor-pointer rounded-[4px] bg-err px-2 py-1 text-[10px] font-semibold text-white hover:opacity-85 disabled:opacity-40"
                      >
                        {domainBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        disabled={domainBusy}
                        className="cursor-pointer rounded-[4px] px-2 py-1 text-[10px] text-[#ededed]/40 hover:text-[#ededed]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteId(d.id)}
                    className="cursor-pointer rounded-[6px] p-1.5 text-[#ededed]/40 transition-colors hover:text-err"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {domains.length > 0 && (
            <p className="mt-3 text-[12px] text-[#ededed]/50">
              To replace this website, delete it first, then add a new one via{' '}
              <Link href="/dashboard/setup" className="underline hover:text-[#ededed]/60">Setup</Link>.
            </p>
          )}

          {domainError && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-err">
              <AlertTriangle className="h-3 w-3" />
              {domainError}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-[#ededed]/40" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Password</span>
          </div>
          <p className="text-[11px] text-[#ededed]/40">
            Receive a reset link at <strong className="font-medium text-[#ededed]/62">{email}</strong>.
          </p>
          <button
            onClick={changePassword}
            disabled={busy || pwSent}
            className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 px-4 py-2 text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed] disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pwSent ? <Check className="h-3.5 w-3.5 text-ok" /> : <Key className="h-3.5 w-3.5" />}
            {pwSent ? 'Link sent — check your inbox' : 'Send password reset link'}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="rounded-[10px] border border-err/20 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-err" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-err">Danger Zone</span>
          </div>
          {!showDelete ? (
            <>
              <p className="text-[12px] leading-relaxed text-[#ededed]/40">
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
                className="w-full rounded-[6px] border border-err/20 bg-[#111111] px-3 py-2 font-mono text-[13px] text-[#ededed] placeholder:text-[#ededed]/40 focus:border-err/40 focus:outline-none"
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
                  className="cursor-pointer rounded-[6px] border border-white/10 px-4 py-2 text-[11px] font-semibold text-[#ededed]/40 transition-colors hover:text-[#ededed] disabled:opacity-30"
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
            className="cursor-pointer text-[12px] text-[#ededed]/50 transition-colors hover:text-err"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
