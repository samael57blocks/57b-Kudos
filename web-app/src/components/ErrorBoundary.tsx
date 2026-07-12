import { Component, type ReactNode, type ErrorInfo } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px',
  textAlign: 'center',
  color: 'var(--text-h, #08060d)',
}

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '12px',
}

const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--text, #6b6375)',
  marginBottom: '24px',
  maxWidth: '400px',
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 24px',
  fontSize: '14px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  background: 'var(--accent, #aa3bff)',
  color: '#fff',
}

const detailsStyle: React.CSSProperties = {
  marginTop: '24px',
  fontSize: '12px',
  color: '#e53e3e',
  maxWidth: '500px',
  overflow: 'auto',
  padding: '12px',
  background: 'var(--bg-subtle, #f8f8fa)',
  borderRadius: '6px',
  textAlign: 'left',
  whiteSpace: 'pre-wrap',
  fontFamily: 'monospace',
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
        <div style={containerStyle} role="alert">
          <div style={titleStyle}>Something went wrong</div>
          <div style={messageStyle}>
            An unexpected error occurred. Please try again.
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            style={buttonStyle}
          >
            Try Again
          </button>
          {this.state.error && (
            <div style={detailsStyle}>
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
