import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Dialog } from './Dialog'
import { useRegisterEmployee } from '../hooks/useRegisterEmployee'
import { buildExplorerTxUrl } from '../utils/format'
import styles from './AddEmployeeDialog.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AddEmployeeDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  companyId: bigint
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A form dialog for adding an employee to a company on-chain.
 *
 * Wraps `useRegisterEmployee` inside a portal-based `Dialog`.
 * Emits `onSuccess()` when the transaction is confirmed.
 * Shows loading state while confirming and error state on failure.
 */
export function AddEmployeeDialog({
  open,
  onClose,
  onSuccess,
  companyId,
}: AddEmployeeDialogProps) {
  const { registerEmployee, step, isConfirming, txHash, error, reset } =
    useRegisterEmployee()

  const [address, setAddress] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const prevStepRef = useRef(step)

  // ── Success transition → notify parent ────────────────────────────────────

  useEffect(() => {
    if (step === 'success' && prevStepRef.current !== 'success') {
      onSuccess()
      setAddress('')
      setEmployeeName('')
      setValidationError(null)
      reset()
    }
    prevStepRef.current = step
  }, [step, onSuccess, reset])

  // ── Reset form state when dialog opens ────────────────────────────────────

  useEffect(() => {
    if (open) {
      setAddress('')
      setEmployeeName('')
      setValidationError(null)
    }
  }, [open])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!address.trim()) {
      setValidationError('Address is required')
      return
    }

    if (!ADDRESS_RE.test(address.trim())) {
      setValidationError('Invalid address format (0x + 40 hex characters)')
      return
    }

    const trimmedName = employeeName.trim()
    if (!trimmedName) {
      setValidationError('Employee name is required')
      return
    }

    try {
      await registerEmployee(address.trim() as `0x${string}`, companyId, trimmedName)
    } catch {
      // Error handled by useRegisterEmployee
    }
  }

  const handleClose = () => {
    if (isConfirming) return
    reset()
    setAddress('')
    setEmployeeName('')
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
        <h3 className={styles.title}>Add Employee</h3>

        {/* Employee Address */}
        <label className={styles.label}>
          Wallet Address
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            disabled={isFormDisabled}
            className={`${styles.input} ${styles.mono}`}
            aria-label="Wallet Address"
            autoFocus
          />
        </label>

        {/* Employee Name */}
        <label className={styles.label}>
          Employee Name
          <input
            type="text"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Enter employee name"
            disabled={isFormDisabled}
            className={styles.input}
            aria-label="Employee Name"
          />
        </label>

        {validationError && (
          <span className={styles.error} role="alert">
            {validationError}
          </span>
        )}

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
            {isConfirming ? 'Confirming…' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
