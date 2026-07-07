import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Layout } from '../components/Layout'
import { NFTGallery } from '../components/NFTGallery'
import { NFTDetail } from '../components/NFTDetail'
import { useEmployeeNFTs } from '../hooks/useEmployeeNFTs'
import type { EmployeeNFTData } from '../hooks/useEmployeeNFTs'

// ── Styles ────────────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  maxWidth: '960px',
  margin: '0 auto',
}

const connectMessageStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '80px 20px',
  color: 'var(--text, #6b6375)',
}

const connectHeadingStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: 'var(--text-h, #08060d)',
  marginBottom: '8px',
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Employee-facing view that displays all recognition NFTs owned by the
 * connected wallet.
 *
 * Uses useAccount for wallet state and useEmployeeNFTs for NFT data.
 * Renders NFTGallery with filtered NFTs and NFTDetail for the selected NFT.
 * Shows a connect message if the wallet is not connected.
 */
export function EmployeePortfolio() {
  const { address, isConnected } = useAccount()
  const { nfts, isLoading, error } = useEmployeeNFTs(address)
  const [selectedNft, setSelectedNft] = useState<EmployeeNFTData | null>(null)

  if (!isConnected || !address) {
    return (
      <Layout>
        <div style={connectMessageStyle}>
          <p style={connectHeadingStyle}>Connect your wallet to view your portfolio</p>
          <p style={{ fontSize: '14px' }}>
            Your recognition NFTs will appear here once you connect.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={wrapperStyle}>
        <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>My Portfolio</h1>
        <p style={{ color: 'var(--text, #6b6375)', fontSize: '14px', marginBottom: '24px' }}>
          Recognition NFTs you have received
        </p>

        <NFTGallery
          nfts={nfts}
          isLoading={isLoading}
          error={error}
          onSelect={setSelectedNft}
        />

        <NFTDetail
          nft={selectedNft}
          isOpen={!!selectedNft}
          onClose={() => setSelectedNft(null)}
        />
      </div>
    </Layout>
  )
}
