import { useCallback, useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { buildMetadata, type MetadataParams } from '../utils/metadata'
import { uploadMetadata } from '../utils/ipfs'
import { COMPANY_REGISTRY_ABI, getContractAddresses } from '../config/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContractFunction = 'recognize' | 'mintKudos'

export type MintStep = 'idle' | 'uploading' | 'confirming' | 'success' | 'error'

export interface Achievement {
  employee: `0x${string}`
  name: string
  description: string
  value: string
  date: string
  employeeName: string
  /** Optional IPFS CID for attached image */
  imageCid?: string
}

export interface UseMintNFTResult {
  mint: (achievement: Achievement) => Promise<`0x${string}`>
  step: MintStep
  isConfirming: boolean
  txHash: `0x${string}` | undefined
  error: Error | null
  reset: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Mint an NFT for an employee of the given company.
 *
 * State machine: `idle → uploading → confirming → success | error`
 *
 * Steps:
 * 1. `buildMetadata` from the achievement data
 * 2. `uploadMetadata` to IPFS (Pinata)
 * 3. `recognize()` on the CompanyRegistry contract
 * 4. Wait for the transaction receipt
 *
 * Double-submit is prevented via a ref guard.
 */
export function useMintNFT(
  companyId: bigint,
  contractFunction?: ContractFunction,
): UseMintNFTResult {
  const { writeContractAsync, data: txHashData, error: writeError } =
    useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess: txSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHashData,
  })

  const [step, setStep] = useState<MintStep>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const isMintingRef = useRef(false)

  // ── Effects: sync wagmi state to our step machine ──────────────────────────

  // When tx receipt comes through → success
  useEffect(() => {
    if (txSuccess && step === 'confirming') {
      setStep('success')
    }
  }, [txSuccess, step])

  // When wagmi writeContract provides a hash, store it
  useEffect(() => {
    if (txHashData && txHashData !== txHash) {
      setTxHash(txHashData)
    }
  }, [txHashData, txHash])

  // Write errors (e.g. user reject)
  useEffect(() => {
    if (writeError && step === 'confirming') {
      setError(writeError)
      setStep('error')
    }
  }, [writeError, step])

  // Confirmation errors
  useEffect(() => {
    if (confirmError && step === 'confirming') {
      setError(confirmError)
      setStep('error')
    }
  }, [confirmError, step])

  // ── Toasts ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'uploading') {
      toast.loading('Uploading metadata...')
    } else if (step === 'confirming') {
      toast.loading('Minting NFT...')
    } else if (step === 'success') {
      toast.success('NFT minted!')
    } else if (step === 'error') {
      toast.error(error?.message ?? 'Mint failed')
    }
  }, [step, error])

  // ── Mint function ──────────────────────────────────────────────────────────

  const mint = useCallback(
    async (achievement: Achievement): Promise<`0x${string}`> => {
      if (isMintingRef.current) {
        throw new Error('Mint already in progress')
      }
      isMintingRef.current = true

      try {
        setError(null)
        setStep('uploading')

        // 1. Build metadata
        const params: MetadataParams = {
          name: achievement.name,
          description: achievement.description,
          value: achievement.value,
          date: achievement.date,
          employeeName: achievement.employeeName,
          imageCid: achievement.imageCid,
        }
        const metadata = buildMetadata(params)

        // 2. Upload to IPFS
        const uri = await uploadMetadata(
          metadata as unknown as Record<string, unknown>,
        )

        // 3. Check contracts
        const contracts = getContractAddresses()
        if (!contracts) {
          throw new Error('No contracts configured for this network')
        }

        // 4. Call recognize
        setStep('confirming')
        const hash = await writeContractAsync({
          address: contracts.companyRegistry,
          abi: COMPANY_REGISTRY_ABI,
          functionName: contractFunction ?? 'recognize',
          args: [achievement.employee, uri],
        })

        setTxHash(hash)
        return hash
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Mint failed')
        setError(error)
        setStep('error')
        throw error
      } finally {
        isMintingRef.current = false
      }
    },
    [companyId, writeContractAsync, contractFunction],
  )

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep('idle')
    setTxHash(undefined)
    setError(null)
  }, [])

  return { mint, step, isConfirming, txHash, error, reset }
}
