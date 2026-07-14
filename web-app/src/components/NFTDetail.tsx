import { useEffect, useCallback, useMemo } from 'react'
import { useTokenMetadata } from '../hooks/useTokenMetadata'
import { RecognitionBadge } from './RecognitionBadge'
import { getContractAddresses } from '../config/contracts'
import type { EmployeeNFTData } from '../hooks/useEmployeeNFTs'
import styles from './NFTDetail.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NFTDetailProps {
  nft: EmployeeNFTData | null
  isOpen: boolean
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Modal overlay that displays full details for a single NFT.
 *
 * Resolves metadata from the NFT's tokenURI using useTokenMetadata.
 * Shows loading state while metadata is being fetched.
 * Closes on backdrop click or Escape key.
 */
export function NFTDetail({ nft, isOpen, onClose }: NFTDetailProps) {
  const { data: metadata, isLoading: metaLoading } = useTokenMetadata(
    nft?.tokenURI,
  )

  const explorerUrl = useMemo(() => {
    if (!nft) return undefined

    const baseUrl =
      import.meta.env.VITE_BLOCK_EXPLORER_URL ?? 'https://etherscan.io'
    const contracts = getContractAddresses()
    if (!contracts) return undefined

    return `${baseUrl}/nft/${contracts.nft57b}/${nft.tokenId.toString()}`
  }, [nft])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen || !nft) return null

  const metaName = metadata?.name as string | undefined
  const metaDescription = metadata?.description as string | undefined
  const metaValue = metadata?.value as string | undefined
  const metaDate = metadata?.date as string | undefined
  const metaImage = metadata?.image as string | undefined

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      data-testid="modal-overlay"
    >
      <div className={styles.modal} role="dialog" aria-label="NFT details">
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ✕
        </button>

        <h2 className={styles.header}>
          NFT #{nft.tokenId.toString()}
        </h2>
        <p className={styles.subtitle}>
          {nft.companyName ?? 'Unknown Company'}
        </p>

        {metaLoading && (
          <div className={styles.loading}>Loading metadata…</div>
        )}

        {metaImage && (
          <img
            src={metaImage}
            alt={metaName ?? `NFT #${nft.tokenId}`}
            className={styles.media}
          />
        )}

        <div>
          {metaName && (
            <div className={styles.field}>
              <span className={styles.label}>Name</span>
              <span className={styles.value}>{metaName}</span>
            </div>
          )}

          {metaDescription && (
            <div className={styles.field}>
              <span className={styles.label}>Description</span>
              <span className={styles.valueDescription}>
                {metaDescription}
              </span>
            </div>
          )}

          {metaValue && (
            <div className={styles.field}>
              <span className={styles.label}>Value</span>
              <span className={styles.value}>
                <RecognitionBadge value={metaValue} />
              </span>
            </div>
          )}

          {metaDate && (
            <div className={styles.field}>
              <span className={styles.label}>Date</span>
              <span className={styles.value}>{metaDate}</span>
            </div>
          )}

          <div className={styles.field}>
            <span className={styles.label}>Token ID</span>
            <span className={styles.value}>{nft.tokenId.toString()}</span>
          </div>

          {explorerUrl && (
            <div className={styles.fieldLast}>
              <span className={styles.label}>Explorer</span>
              <span className={styles.value}>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                  data-testid="explorer-link"
                >
                  View on Etherscan ↗
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
