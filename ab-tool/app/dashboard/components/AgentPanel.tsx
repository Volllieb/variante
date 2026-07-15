'use client'

// Autonome Optimierung: Ein Klick → Agent analysiert die Seite, generiert
// Varianten und legt A/B-Tests an. Streamt live via useChat (/api/agent).
// Konzept: docs/future-features/autonomous-ab-agent.md

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import {
  Sparkles,
  Bot,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Globe,
  Search,
  FlaskConical,
  Wand2,
  Clock,
  ChevronDown,
  ChevronRight,
  Trophy,
  ArrowRight,
} from 'lucide-react'

interface AgentPanelProps {
  domain: string
  plan: string
  userId: string
}

interface AgentRun {
  id: string
  domain: string
  page_goal: string
  suggestions_json: unknown[] | null
  tests_created: string[] | null
  tool_calls_count: number
  cost_estimate: number
  finish_reason: string | null
  created_at: string
}

export function AgentPanel({ domain, plan, userId }: AgentPanelProps) {
  return <AgentRunner domain={domain} userId={userId} plan={plan} />
}

/* ── Pro: Agent-Run mit Live-Stream ── */

function AgentRunner({ domain, userId, plan }: { domain: string; userId: string; plan: string }) {
  const router = useRouter()
  const host = domain.replace(/^https?:\/\//, '')

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent' }),
  })

  const isRunning = status === 'submitted' || status === 'streaming'
  const hasRun = messages.length > 0
  const isDone = hasRun && status === 'ready'

  // Agent run history
  const [history, setHistory] = useState<AgentRun[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  // Recent winner: Auto-Trigger Banner nach abgeschlossenem Test
  const [recentWinner, setRecentWinner] = useState<{ testName: string; winner: string; testId: string } | null>(null)

  // History + Winner laden
  useEffect(() => {
    fetch('/api/agent/runs')
      .then(r => r.json())
      .then(d => { if (d.runs) setHistory(d.runs) })
      .catch(() => {})
  }, [])

  // Recent winner check: Tests mit winner='B' aus den letzten 7 Tagen
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/agent/runs?winnerCheck=1&userId=${encodeURIComponent(userId)}`)
        .then(r => r.json())
        .then(d => {
          if (d.winner && !d.dismissed) setRecentWinner(d.winner)
        })
        .catch(() => {})
    }, 2000)
    return () => clearTimeout(t)
  }, [userId, status])

  // Nach erfolgreichem Run: Server-Components refreshen, damit neue Tests
  // im Grid auftauchen. Und History neu laden.
  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current === 'streaming' && status === 'ready') {
      router.refresh()
      fetch('/api/agent/runs')
        .then(r => r.json())
        .then(d => { if (d.runs) setHistory(d.runs) })
        .catch(() => {})
    }
    prevStatus.current = status
  }, [status, router])

  const handleRun = () => {
    setMessages([]) // vorherigen Run aus der UI räumen
    sendMessage(
      { text: `Analysiere ${domain} und erstelle A/B-Tests.` },
      { body: { domain, pageGoal: 'signups' } }
    )
  }

  return (
    <div className="mb-3 mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-3.5 w-3.5 text-[#a78bfa]" />
        <h2 className="text-[13px] font-semibold text-[#ededed]">Auto-optimize</h2>
        <span className="rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#a78bfa]">AI AGENT</span>
      </div>

      <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
        {/* ─── Auto-Trigger Banner: Recent Winner ─── */}
        {recentWinner && (
          <div className="mb-3 flex items-start gap-2.5 rounded-[8px] border border-[#a78bfa]/20 bg-[#7c3aed]/[0.08] px-3 py-2.5">
            <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[#a78bfa]" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[#ededed]">
                🏆 Your test &quot;{recentWinner.testName}&quot; has a winner!
              </p>
              <p className="mt-0.5 text-[10px] text-[#ededed]/50">
                Variant <strong>{recentWinner.winner}</strong> won. The agent can learn from this and suggest new optimizations.
              </p>
            </div>
            <button
              onClick={() => {
                setRecentWinner(null)
                handleRun()
              }}
              className="shrink-0 inline-flex cursor-pointer items-center gap-1 rounded-[5px] bg-[#7c3aed] px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Optimize now
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Idle: Erklärung + Run-Button */}
        {!hasRun && !isRunning && (
          <div>
            <p className="text-[11px] leading-relaxed text-[#ededed]/50">
              The agent analyzes your page, finds the top 3 optimizations, generates
              variants and creates the A/B tests — all in one run.
            </p>
            <button
              onClick={handleRun}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-[#7c3aed] px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              <Sparkles className="h-3 w-3" />
              Optimize {host}
            </button>
          </div>
        )}

        {/* Run-Output: Tool-Aktivität + gestreamter Text */}
        {hasRun && (
          <div className="space-y-2">
            {messages
              .filter((m) => m.role === 'assistant')
              .map((m) => (
                <AssistantMessage key={m.id} message={m} />
              ))}

            {/* Spinner solange der Agent arbeitet */}
            {isRunning && (
              <div className="flex items-center gap-2 py-1 text-[11px] text-[#a78bfa]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {messages.filter((m) => m.role === 'assistant').length === 0
                  ? `Analyzing ${host}…`
                  : 'Working…'}
              </div>
            )}

            {/* Fehler */}
            {error && (
              <div className="flex items-center gap-2 text-[11px] text-[#f5455c]/80">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                {error.message || 'Agent run failed'}
              </div>
            )}

            {/* Fertig: Erneut-Button */}
            {(isDone || error) && (
              <button
                onClick={handleRun}
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-white/[0.08] py-1.5 text-[11px] text-[#ededed]/60 transition-colors hover:border-white/[0.15] hover:text-[#ededed]/70"
              >
                <RefreshCw className="h-3 w-3" />
                Run again
              </button>
            )}
          </div>
        )}

        {/* ── Agent Run History ── */}
        {history.length > 0 && (
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <button
              onClick={() => setHistoryOpen(o => !o)}
              className="flex w-full items-center gap-1.5 text-[11px] text-[#ededed]/40 transition-colors hover:text-[#ededed]/60"
            >
              {historyOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Clock className="h-3 w-3" />
              History ({history.length})
            </button>

            {historyOpen && (
              <div className="mt-2 space-y-1.5">
                {history.map(run => {
                  const date = new Date(run.created_at)
                  const timeAgo = getTimeAgo(date)
                  const testCount = run.tests_created?.length ?? 0
                  const sugCount = Array.isArray(run.suggestions_json) ? run.suggestions_json.length : 0
                  return (
                    <div
                      key={run.id}
                      className="rounded-[6px] border border-white/[0.05] bg-white/[0.02] px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#ededed]/60">{timeAgo}</span>
                        <span className="text-[10px] text-[#ededed]/30">
                          {run.domain.replace(/^https?:\/\//, '').split('/')[0]}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-[#ededed]/40">
                        <span>{sugCount} {sugCount === 1 ? 'suggestion' : 'suggestions'}</span>
                        <span>{testCount} {testCount === 1 ? 'test' : 'tests'} created</span>
                        {run.cost_estimate ? <span>${run.cost_estimate.toFixed(2)}</span> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Relative Zeitdarstellung ── */

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
}

/* ── Assistant-Message: Text-Parts + Tool-Status-Zeilen ── */

const TOOL_LABELS: Record<string, { icon: typeof Search; running: string; done: string }> = {
  'tool-fetchSite': { icon: Globe, running: 'Loading page…', done: 'Page loaded' },
  'tool-analyzeCRO': { icon: Search, running: 'Analyzing CRO potential…', done: 'Analysis complete' },
  'tool-generateVariant': { icon: Wand2, running: 'Generating variant…', done: 'Variant generated' },
  'tool-createTest': { icon: FlaskConical, running: 'Creating test…', done: 'Test created' },
}

function AssistantMessage({ message }: { message: UIMessage }) {
  return (
    <div className="space-y-1.5">
      {message.parts.map((part, i) => {
        if (part.type === 'text' && part.text.trim()) {
          return (
            <div
              key={i}
              className="text-[11px] leading-relaxed text-[#ededed]/80"
              // Nur eigene, escapte Inhalte — kein rohes LLM-HTML (Injection-Schutz).
              dangerouslySetInnerHTML={{ __html: renderInline(part.text) }}
            />
          )
        }

        const label = TOOL_LABELS[part.type]
        if (label && 'state' in part) {
          const state = part.state as string
          const failed = state === 'output-error'
          const done = state === 'output-available'
          const Icon = label.icon
          const output = 'output' in part ? (part.output as { name?: string; count?: number; success?: boolean } | undefined) : undefined

          let text = done ? label.done : label.running
          if (done && part.type === 'tool-createTest' && output?.name) text = `Test created: ${output.name}`
          if (done && part.type === 'tool-analyzeCRO' && output?.count) text = `${output.count} optimizations found`
          if (done && part.type === 'tool-generateVariant' && output?.success === false) text = 'Variant generation failed — skipping'

          return (
            <div key={i} className="flex items-center gap-2 text-[11px] text-[#ededed]/50">
              {failed ? (
                <XCircle className="h-3 w-3 shrink-0 text-[#f5455c]/70" />
              ) : done ? (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-[#2fd76c]/70" />
              ) : (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#a78bfa]" />
              )}
              <Icon className="h-3 w-3 shrink-0 text-[#ededed]/50" />
              <span className={failed ? 'text-[#f5455c]/70' : undefined}>
                {failed && 'errorText' in part && part.errorText ? String(part.errorText).slice(0, 120) : text}
              </span>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

// Minimal-Markdown (bold, code, Zeilenumbrüche) — HTML wird vorher escaped,
// damit LLM-Output (der Seiteninhalte enthalten kann) nichts injecten kann.
function renderInline(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#ededed]">$1</strong>')
    .replace(/`([^`]*)`/g, '<code class="text-[#a78bfa]">$1</code>')
    .replace(/\n/g, '<br/>')
}
