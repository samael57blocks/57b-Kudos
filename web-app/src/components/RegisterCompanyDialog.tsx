import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAccount } from 'wagmi'
import { Dialog } from './Dialog'
import { useRegisterCompany } from '../hooks/useRegisterCompany'
import { buildExplorerTxUrl } from '../utils/format'
import styles from './RegisterCompanyDialog.module.css'

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
  const explorerUrl = buildExplorerTxUrl(txHash, import.meta.env.VITE_BLOCK_EXPLORER_URL)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3 className={styles.title}>Register Company</h3>

        {/* Company Name */}
        <label className={styles.label}>
          Company Name
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            disabled={isFormDisabled}
            className={styles.input}
            aria-label="Company Name"
            autoFocus
          />
          {validationError && (
            <span className={styles.error} role="alert">
              {validationError}
            </span>
          )}
        </label>

        {/* Transaction link */}
        {step === 'confirming' && txHash && explorerUrl && (
          <p className={styles.link}>
            Transaction submitted:{' '}
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              View on Etherscan
            </a>
          </p>
        )}

        {/* Error message */}
        {step === 'error' && error && (
          <p className={styles.error} role="alert">
            {error.message}
          </p>
        )}

        {/* Actions */}
        <div className={styles.buttonRow}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isFormDisabled}
            className={isFormDisabled ? styles.buttonDisabled : styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isFormDisabled}
            className={isFormDisabled ? styles.buttonDisabled : styles.button}
          >
            {isConfirming ? 'Confirming…' : 'Register'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
