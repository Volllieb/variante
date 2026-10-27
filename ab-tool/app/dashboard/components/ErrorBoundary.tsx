'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/app/components'

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
        <div className="mb-4 rounded-md border border-err/20 bg-err-bg px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-err text-meta font-semibold text-text">!</span>
              <div>
                <p className="text-small font-medium text-err">
                  {this.props.label} failed to load
                </p>
                <p className="mt-0.5 text-meta text-text-3">
                  {this.state.error.message || 'An unexpected error occurred.'}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => this.setState({ error: null })}
              className="shrink-0 gap-1 px-2.5 py-1 text-meta"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
