'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  Bot,
  Sparkles,
  Globe,
  Search,
  Wand2,
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button, Card } from '@/app/components'

// ─── Tool-Labels ───

const TOOL_LABELS: Record<string, { icon: typeof Globe; running: string; done: string }> = {
  'tool-fetchSite': { icon: Globe, running: 'Loading page…', done: 'Page loaded' },
  'tool-analyzeCRO': { icon: Search, running: 'Analyzing CRO potential…', done: 'Analysis complete' },
  'tool-generateVariant': { icon: Wand2, running: 'Generating variant…', done: 'Variant generated' },
  'tool-createTest': { icon: FlaskConical, running: 'Creating test…', done: 'Test created' },
}

// ─── Props ───

interface Props {
  domain: string | null
  hasVerifiedDomain: boolean
  /** Aufgerufen statt router.refresh() — der Parent macht den Reload sichtbar. */
  onRefreshed?: () => void
}

// ─── Component ───

export function AgentPanel({ domain, hasVerifiedDomain, onRefreshed }: Props) {
  const host = domain ? domain.replace(/^https?:\/\//, '') : null
  const [expanded, setExpanded] = useState(false)

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent' }),
  })

  const isRunning = status === 'submitted' || status === 'streaming'
  const hasRun = messages.length > 0
  const isDone = hasRun && status === 'ready'

  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current === 'streaming' && status === 'ready') onRefreshed?.()
    prevStatus.current = status
  }, [status, onRefreshed])

  const handleRun = () => {
    if (!domain) return
    setMessages([])
    sendMessage(
      { text: `Analysiere ${domain} und erstelle A/B-Tests.` },
      { body: { domain, pageGoal: 'signups' } }
    )
  }

  if (!domain || !hasVerifiedDomain) return null

  return (
    <Card padding="none">
      {/* Header */}
      <Button variant="ghost"
        onClick={() => setExpanded((v) => !v)}
        className="w-full justify-between px-4 py-3 text-left hover:bg-transparent"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pro/10">
            <Bot className="h-3.5 w-3.5 text-pro" />
          </div>
          <div>
            <p className="text-body font-semibold text-text">Auto-Optimize</p>
            <p className="text-meta text-text-3">
              AI agent scans {host}, finds optimizations, creates tests — one click
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-text-3" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-3" />
        )}
      </Button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {/* Idle state */}
          {!hasRun && !isRunning && (
            <Button variant="primary" size="md"
              onClick={handleRun}
              className="bg-pro hover:bg-pro/90"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Optimize {host}
            </Button>
          )}

          {/* Messages */}
          {hasRun && (
            <div className="space-y-1.5">
              {messages
                .filter((m) => m.role === 'assistant')
                .map((m) => (
                  <div key={m.id} className="space-y-1">
                    {m.parts.map((part, i) => {
                      if (part.type === 'text' && part.text.trim()) {
                        return (
                          <p key={i} className="text-meta leading-relaxed text-text-2">
                            {part.text}
                          </p>
                        )
                      }
                      const info = TOOL_LABELS[part.type]
                      if (info && 'state' in part) {
                        const state = part.state as string
                        const done = state === 'output-available'
                        const failed = state === 'output-error'
                        const label = done ? info.done : info.running
                        return (
                          <p
                            key={i}
                            className={`flex items-center gap-1.5 text-meta ${
                              done ? 'text-ok/70' : failed ? 'text-err/70' : 'text-pro/70'
                            }`}
                          >
                            {done ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            ) : failed ? (
                              <XCircle className="h-3 w-3 shrink-0" />
                            ) : (
                              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                            )}
                            {label}
                          </p>
                        )
                      }
                      return null
                    })}
                  </div>
                ))}

              {/* Running indicator */}
              {isRunning && (
                <div className="flex items-center gap-2 py-1 text-meta text-pro">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Working…
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-meta text-err/70 flex items-center gap-1.5">
                  <XCircle className="h-3 w-3 shrink-0" />
                  {error.message || 'Agent run failed'}
                </p>
              )}

              {/* Retry button */}
              {(isDone || error) && (
                <Button
                  variant="secondary"
                  onClick={handleRun}
                  className="mt-1 w-full gap-1.5 rounded-sm py-1.5 text-meta"
                >
                  <Sparkles className="h-3 w-3" />
                  Run again
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
