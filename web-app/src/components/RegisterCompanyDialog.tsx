import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAccount } from 'wagmi'
import { Dialog } from './Dialog'
import { useRegisterCompany } from '../hooks/useRegisterCompany'

// ── Styles ────────────────────────────────────────────────────────────────────

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-h, #08060d)',
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '6px',
  background: 'var(--bg, #fff)',
  color: 'var(--text, #08060d)',
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '8px',
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  background: 'var(--accent, #aa3bff)',
  color: '#fff',
}

const cancelButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'transparent',
  color: 'var(--text, #6b6375)',
  border: '1px solid var(--border, #e5e4e7)',
}

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
}

const errorStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#e53e3e',
  marginTop: '2px',
}

const linkStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--accent, #aa3bff)',
  textDecoration: 'underline',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegisterCompanyDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (companyId: bigint) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A form dialog for registering a new company on-chain.
 *
 * Wraps `useRegisterCompany` inside a portal-based `Dialog`.
 * Emits `onSuccess(companyId)` when the transaction is confirmed.
 * Shows loading state while confirming and error state on failure.
 */
export function RegisterCompanyDialog({
  open,
  onClose,
  onSuccess,
}: RegisterCompanyDialogProps) {
  const { registerCompany, step, isConfirming, txHash, companyId, error, reset } =
    useRegisterCompany()
  const { address } = useAccount()

  const [companyName, setCompanyName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Track previous step to detect success transitions
  const prevStepRef = useRef(step)

  // ── Success transition → notify parent ────────────────────────────────────

  useEffect(() => {
    if (step === 'success' && prevStepRef.current !== 'success' && companyId !== undefined) {
      onSuccess(companyId)
      // Reset dialog state for next use
      setCompanyName('')
      setValidationError(null)
      reset()
    }
    prevStepRef.current = step
  }, [step, companyId, onSuccess, reset])

  // ── Reset form state when dialog opens ────────────────────────────────────

  useEffect(() => {
    if (open) {
      setCompanyName('')
      setValidationError(null)
    }
  }, [open])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const trimmed = companyName.trim()
    if (!trimmed) {
      setValidationError('Company name is required')
      return
    }

    if (!address) return

    try {
      await registerCompany(trimmed, address)
    } catch {
      // Error handled by useRegisterCompany
    }
  }

  const handleClose = () => {
    if (isConfirming) return // Prevent closing while confirming
    reset()
    setCompanyName('')
    setValidationError(null)
    onClose()
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const isFormDisabled = isConfirming
  const explorerUrl =
    txHash && import.meta.env.VITE_BLOCK_EXPLORER_URL
      ? `${import.meta.env.VITE_BLOCK_EXPLORER_URL}${txHash}`
      : txHash
        ? `https://etherscan.io/tx/${txHash}`
        : undefined

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <h3 style={titleStyle}>Register Company</h3>

        {/* Company Name */}
        <label style={labelStyle}>
          Company Name
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            disabled={isFormDisabled}
            style={inputStyle}
            aria-label="Company Name"
            autoFocus
          />
          {validationError && (
            <span style={errorStyle} role="alert">
              {validationError}
            </span>
          )}
        </label>

        {/* Transaction link */}
        {step === 'confirming' && txHash && explorerUrl && (
          <p style={linkStyle}>
            Transaction submitted:{' '}
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              View on Etherscan
            </a>
          </p>
        )}

        {/* Error message */}
        {step === 'error' && error && (
          <p style={errorStyle} role="alert">
            {error.message}
          </p>
        )}

        {/* Actions */}
        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isFormDisabled}
            style={isFormDisabled ? buttonDisabledStyle : cancelButtonStyle}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isFormDisabled}
            style={isFormDisabled ? buttonDisabledStyle : buttonStyle}
          >
            {isConfirming ? 'Confirming…' : 'Register'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
