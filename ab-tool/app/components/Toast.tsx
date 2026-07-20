'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { X, Check, AlertTriangle, Info } from 'lucide-react'

/* ── Types ── */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type Toast = {
  id: string
  type: ToastType
  message: string
  duration?: number
}

type ToastContextValue = {
  toasts: Toast[]
  toast: (type: ToastType, message: string, duration?: number) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/* ── Icons ── */
const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
}

const colors: Record<ToastType, { border: string; bg: string; text: string }> = {
  success: { border: 'border-[#2fd76c]/20', bg: 'bg-[#2fd76c]/5', text: 'text-[#2fd76c]' },
  error: { border: 'border-[#f5455c]/20', bg: 'bg-[#f5455c]/5', text: 'text-[#f5455c]' },
  warning: { border: 'border-[#f5a623]/20', bg: 'bg-[#f5a623]/5', text: 'text-[#f5a623]' },
  info: { border: 'border-white/20', bg: 'bg-white/5', text: 'text-[#ededed]' },
}

/* ── Provider ── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (type: ToastType, message: string, duration = 5000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]) // max 5
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/* ── Hook ── */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

/* ── Container ── */
function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[]
  dismiss: (id: string) => void
}) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  )
}

/* ── Single Toast ── */
function ToastItem({
  toast: t,
  dismiss,
}: {
  toast: Toast
  dismiss: (id: string) => void
}) {
  const Icon = icons[t.type]
  const c = colors[t.type]

  useEffect(() => {
    if (!t.duration) return
    const timer = setTimeout(() => dismiss(t.id), t.duration)
    return () => clearTimeout(timer)
  }, [t.id, t.duration, dismiss])

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-[10px] border ${c.border} ${c.bg} px-4 py-3 shadow-lg backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] max-w-sm`}
      role="alert"
    >
      <Icon className={`h-4 w-4 shrink-0 ${c.text}`} />
      <p className={`flex-1 text-[13px] leading-snug ${c.text}`}>{t.message}</p>
      <button
        onClick={() => dismiss(t.id)}
        className={`cursor-pointer ${c.text}/60 hover:${c.text} shrink-0`}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
