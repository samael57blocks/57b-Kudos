import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ── Styles ────────────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const dialogStyle: React.CSSProperties = {
  background: 'var(--bg, #fff)',
  borderRadius: '8px',
  padding: '24px',
  minWidth: '400px',
  maxWidth: '480px',
  width: '100%',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  outline: 'none',
  position: 'relative',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Portal-based modal dialog rendered at `document.body` level.
 *
 * Features:
 * - Backdrop that closes on click
 * - Ref-based focus trap (Tab/Shift+Tab cycle)
 * - ESC key to close
 * - `aria-modal` for accessibility
 * - Restores focus to previously focused element on close
 */
export function Dialog({ open, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // ── Focus trap + keyboard handlers ────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    // Store the previously focused element so we can restore focus on close
    prevFocusRef.current = document.activeElement as HTMLElement

    // Small delay to ensure the portal has rendered
    requestAnimationFrame(() => {
      dialogRef.current?.focus()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap: cycle Tab/Shift+Tab within the dialog
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that opened the dialog
      prevFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      style={backdropStyle}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Dialog"
    >
      <div
        ref={dialogRef}
        style={dialogStyle}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
