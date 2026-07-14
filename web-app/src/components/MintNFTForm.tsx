import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react'
import { usePublicClient } from 'wagmi'
import { isAddress } from 'viem'
import { useMintNFT } from '../hooks/useMintNFT'
import { uploadImage } from '../utils/ipfs'
import {
  COMPANY_REGISTRY_ABI,
  getContractAddresses,
} from '../config/contracts'
import { buildExplorerTxUrl } from '../utils/format'
import {
  labelStyle,
  inputStyle,
  buttonStyle,
  buttonDisabledStyle,
  errorStyle,
  linkStyle,
} from '../styles/tokens'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MintNFTFormProps {
  companyId: bigint
}

// ── Styles ────────────────────────────────────────────────────────────────────

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
  border: '1px solid var(--border, #e5e4e7)',
  borderRadius: '8px',
  background: 'var(--bg, #fff)',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '80px',
  resize: 'vertical',
}

const successStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#38a169',
  fontWeight: 600,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MintNFTForm({ companyId }: MintNFTFormProps) {
  const { mint, step, isConfirming, txHash, error: mintError, reset } =
    useMintNFT(companyId)
  const publicClient = usePublicClient()
  const contracts = getContractAddresses()

  // Form fields
  const [employee, setEmployee] = useState('')
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
      setValue('')
      setDate(todayString())
      setComments('')
      setImageFile(null)
      setValidationErrors({})
      reset()
    }
    prevStepRef.current = step
  }, [step, reset])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    // Validate address
    if (!isAddress(employee)) {
      setValidationErrors((prev) => ({
        ...prev,
        employee: 'Invalid address format',
      }))
      return
    }

    // Validate value
    if (!value || isNaN(Number(value))) {
      setValidationErrors((prev) => ({
        ...prev,
        value: 'Value is required and must be a number',
      }))
      return
    }

    // Check if employee is registered with this company
    if (publicClient && contracts) {
      try {
        const companyOfEmployee = (await publicClient.readContract({
          address: contracts.companyRegistry,
          abi: COMPANY_REGISTRY_ABI,
          functionName: 'getEmployeeCompany',
          args: [employee as `0x${string}`],
        })) as bigint

        if (companyOfEmployee !== companyId) {
          setValidationErrors((prev) => ({
            ...prev,
            employee: 'Address is not a registered employee',
          }))
          return
        }
      } catch {
        setValidationErrors((prev) => ({
          ...prev,
          employee: 'Failed to verify employee registration',
        }))
        return
      }
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

    // Construct employee name from address
    const empAddr = employee as `0x${string}`
    const employeeName = `${empAddr.slice(0, 6)}...${empAddr.slice(-4)}`

    // Call mint
    try {
      await mint({
        employee: empAddr,
        name: 'Employee Recognition',
        description: comments || 'Recognition NFT',
        value,
        date: date || todayString(),
        employeeName,
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
    <form onSubmit={handleSubmit} style={formStyle}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
        Mint Recognition NFT
      </h3>

      {/* Employee Address */}
      <label style={labelStyle}>
        Employee Address
        <input
          type="text"
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          placeholder="0x..."
          disabled={isFormDisabled}
          style={inputStyle}
          aria-label="Employee Address"
        />
        {validationErrors.employee && (
          <span style={errorStyle} role="alert">
            {validationErrors.employee}
          </span>
        )}
      </label>

      {/* Value */}
      <label style={labelStyle}>
        Value (ETH)
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.1"
          disabled={isFormDisabled}
          style={inputStyle}
          aria-label="Value (ETH)"
        />
        {validationErrors.value && (
          <span style={errorStyle} role="alert">
            {validationErrors.value}
          </span>
        )}
      </label>

      {/* Date */}
      <label style={labelStyle}>
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isFormDisabled}
          style={inputStyle}
          aria-label="Date"
        />
      </label>

      {/* Comments */}
      <label style={labelStyle}>
        Comments
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Optional recognition message (max 500 chars)"
          maxLength={500}
          disabled={isFormDisabled}
          style={textareaStyle}
          aria-label="Comments"
        />
      </label>

      {/* Image Upload */}
      <label style={labelStyle}>
        Image (optional)
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={isFormDisabled}
          style={inputStyle}
          aria-label="Image"
        />
      </label>

      {/* Status messages */}
      {step === 'confirming' && txHash && explorerUrl && (
        <p style={linkStyle}>
          Transaction submitted:{' '}
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            View on Etherscan
          </a>
        </p>
      )}

      {step === 'success' && (
        <p style={successStyle}>NFT minted successfully!</p>
      )}

      {step === 'error' && mintError && (
        <p style={errorStyle} role="alert">
          {mintError.message}
        </p>
      )}

      {imageUploading && (
        <p style={{ fontSize: '13px', color: 'var(--text, #6b6375)' }}>
          Uploading image to IPFS…
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isFormDisabled}
        style={isFormDisabled ? buttonDisabledStyle : buttonStyle}
      >
        {step === 'uploading' || imageUploading
          ? 'Uploading…'
          : step === 'confirming'
            ? 'Confirming…'
            : 'Mint NFT'}
      </button>
    </form>
  )
}
