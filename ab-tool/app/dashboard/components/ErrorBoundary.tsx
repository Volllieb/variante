'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  err: '#f5455c',
}

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
        <div className="mb-4 rounded-[10px] border border-[#f5455c]/20 bg-[#f5455c]/5 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-[4px] text-[11px] font-bold text-white"
                style={{ background: T.err }}>!</span>
              <div>
                <p className="text-[12px] font-medium" style={{ color: T.err }}>
                  {this.props.label} failed to load
                </p>
                <p className="mt-0.5 text-[11px] text-[#ededed]/50">
                  {this.state.error.message || 'An unexpected error occurred.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-[6px] border border-white/10 px-2.5 py-1 text-[11px] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
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
