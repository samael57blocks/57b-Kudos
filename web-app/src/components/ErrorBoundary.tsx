import { Component, type ReactNode, type ErrorInfo } from 'react'
import styles from './ErrorBoundary.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Error boundary that catches unhandled render errors and displays
 * a fallback UI with a retry button.
 *
 * Must be a class component — React error boundaries require
 * `componentDidCatch` or `getDerivedStateFromError`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.container} role="alert">
          <div className={styles.title}>Something went wrong</div>
          <div className={styles.message}>
            An unexpected error occurred. Please try again.
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className={styles.button}
          >
            Try Again
          </button>
          {this.state.error && (
            <div className={styles.details}>
              {this.state.error.name}: {this.state.error.message}
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
