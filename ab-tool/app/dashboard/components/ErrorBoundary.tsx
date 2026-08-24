'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

type Props = { children: ReactNode; label: string }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mb-4 rounded-[var(--radius-lg)] border border-err/20 bg-err-bg px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] bg-err text-[11px] font-bold text-white">!</span>
              <div>
                <p className="text-[12px] font-medium text-err">
                  {this.props.label} failed to load
                </p>
                <p className="mt-0.5 text-[11px] text-text-3">
                  {this.state.error.message || 'An unexpected error occurred.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-[var(--radius-md)] border border-border px-2.5 py-1 text-[11px] text-text-2 transition-colors hover:border-border-strong hover:text-text"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
