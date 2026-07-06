import { useEffect, useCallback } from 'react'
import { useTokenMetadata } from '../hooks/useTokenMetadata'
import { RecognitionBadge } from './RecognitionBadge'
import type { EmployeeNFTData } from '../hooks/useEmployeeNFTs'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NFTDetailProps {
  nft: EmployeeNFTData | null
  isOpen: boolean
  onClose: () => void
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
}

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  maxWidth: '560px',
  width: '100%',
  maxHeight: '80vh',
  overflowY: 'auto',
  padding: '32px',
  position: 'relative',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
}

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'none',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  color: 'var(--text, #6b6375)',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
}

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '1px solid var(--border, #e5e4e7)',
  fontSize: '14px',
}

const fieldLabelStyle: React.CSSProperties = {
  color: 'var(--text, #6b6375)',
  fontWeight: 500,
}

const fieldValueStyle: React.CSSProperties = {
  color: 'var(--text-h, #08060d)',
  fontWeight: 600,
  textAlign: 'right',
}

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  color: 'var(--text, #6b6375)',
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
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      data-testid="modal-overlay"
    >
      <div style={modalStyle} role="dialog" aria-label="NFT details">
        <button
          style={closeButtonStyle}
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ✕
        </button>

        <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '22px' }}>
          NFT #{nft.tokenId.toString()}
        </h2>
        <p style={{ color: 'var(--text, #6b6375)', fontSize: '14px', marginBottom: '20px' }}>
          {nft.companyName ?? 'Unknown Company'}
        </p>

        {metaLoading && (
          <div style={loadingStyle}>Loading metadata…</div>
        )}

        {metaImage && (
          <img
            src={metaImage}
            alt={metaName ?? `NFT #${nft.tokenId}`}
            style={{
              width: '100%',
              borderRadius: '12px',
              marginBottom: '20px',
              maxHeight: '300px',
              objectFit: 'cover',
            }}
          />
        )}

        <div>
          {metaName && (
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Name</span>
              <span style={fieldValueStyle}>{metaName}</span>
            </div>
          )}

          {metaDescription && (
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Description</span>
              <span style={{ ...fieldValueStyle, fontWeight: 400, maxWidth: '300px' }}>
                {metaDescription}
              </span>
            </div>
          )}

          {metaValue && (
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Value</span>
              <span style={fieldValueStyle}>
                <RecognitionBadge value={metaValue} />
              </span>
            </div>
          )}

          {metaDate && (
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Date</span>
              <span style={fieldValueStyle}>{metaDate}</span>
            </div>
          )}

          <div style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Token ID</span>
            <span style={fieldValueStyle}>{nft.tokenId.toString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
