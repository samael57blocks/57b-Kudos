import { useState, useEffect, useRef,  type FormEvent } from 'react'
import { useMintNFT } from '../hooks/useMintNFT'
import { uploadImage } from '../utils/ipfs'
import { buildExplorerTxUrl } from '../utils/format'
import type { EmployeeData } from '../hooks/useCompanyEmployees'
import { CategoryPicker } from './CategoryPicker'
import { BADGE_CONFIG, type BadgeCategory } from '../lib/recognition-data'
import styles from './MinterMintForm.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MinterMintFormProps {
  companyId: bigint
  employees: EmployeeData[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MinterMintForm({ companyId, employees }: MinterMintFormProps) {
  const { mint, step, txHash, error: mintError, reset } =
    useMintNFT(companyId, 'mintKudos')

  // Form fields
  const [employee, setEmployee] = useState('')
  const [category, setCategory] = useState<BadgeCategory | ''>('')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayString())
  const [comments, setComments] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})

  // Track previous step for detecting transitions
  const prevStepRef = useRef(step)

  // ── Reset form on success ────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'success' && prevStepRef.current !== 'success') {
      setEmployee('')
      setCategory('')
      setValue('0.1')
      setDate(todayString())
      setComments('')
      setImageFile(null)
      setValidationErrors({})
      reset()
    }
    prevStepRef.current = step
  }, [step, reset])

  // ── Handlers ─────────────────────────────────────────────────────────────

  /*const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
  }*/

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    // Validate employee selection
    if (!employee) {
      setValidationErrors((prev) => ({
        ...prev,
        employee: 'Please select an employee',
      }))
      return
    }

    // Validate category selection
    if (!category) {
      setValidationErrors((prev) => ({
        ...prev,
        category: 'Please select a recognition category',
      }))
      return
    }

    // Upload image if provided
    let imageCid: string | undefined
    if (imageFile) {
      setImageUploading(true)
      try {
        imageCid = await uploadImage(imageFile)
      } catch {
        setImageUploading(false)
        return
      }
      setImageUploading(false)
    }

    // Find employee name from the selected address
    const emp = employees.find((e) => e.employee === employee)
    const employeeName = emp?.name ?? 'Unknown'
    const categoryConfig = BADGE_CONFIG[category]

    // Call mint
    try {
      await mint({
        employee: employee as `0x${string}`,
        name: categoryConfig.description.replace('Awarded for ', ''),
        description: comments || categoryConfig.description,
        value,
        date: date || todayString(),
        employeeName,
        category,
        imageCid,
      })
    } catch {
      // Error handled by useMintNFT
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const isInFlight = step === 'uploading' || step === 'confirming' || imageUploading
  const isFormDisabled = isInFlight
  const explorerUrl = buildExplorerTxUrl(txHash, import.meta.env.VITE_BLOCK_EXPLORER_URL)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Category Picker */}
      <CategoryPicker
        value={category}
        onChange={setCategory}
        disabled={isFormDisabled}
        error={validationErrors.category}
      />

      
      {/* Employee Select */}
      <label className={styles.label}>
        Select a Recipient
        <select
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          disabled={isFormDisabled}
          className={styles.input}
          aria-label="Employee"
        >
          <option value="">Select an employee...</option>
          {employees.map((emp) => (
            <option key={emp.employee} value={emp.employee}>
              {emp.name}
            </option>
          ))}
        </select>
        {validationErrors.employee && (
          <span className={styles.error} role="alert">
            {validationErrors.employee}
          </span>
        )}
      </label>

      {/* Comments */}
      <label className={styles.label}>
        Recognition Message
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Describe what this person did and why it deserves recognition..."
          maxLength={500}
          disabled={isFormDisabled}
          className={styles.textarea}
          aria-label="Comments"
        />
      </label>

      {/* Status messages */}
      {step === 'confirming' && txHash && explorerUrl && (
        <p className={styles.link}>
          Transaction submitted:{' '}
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
            View on Etherscan
          </a>
        </p>
      )}

      {step === 'success' && (
        <p className={styles.success}>NFT minted successfully!</p>
      )}

      {step === 'error' && mintError && (
        <p className={styles.error} role="alert">
          {mintError.message}
        </p>
      )}

      {imageUploading && (
        <p className={styles.uploading}>
          Uploading image to IPFS…
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isFormDisabled}
        className={isFormDisabled ? styles.buttonDisabled : styles.button}
      >
        {step === 'uploading' || imageUploading
          ? 'Uploading…'
          : step === 'confirming'
            ? 'Confirming…'
            : 'Send Recognition'}
      </button>
    </form>
  )
}
