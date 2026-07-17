import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Layout } from '../components/Layout'
import { ProfileHeader } from '../components/ProfileHeader'
import { RecognitionGallery } from '../components/RecognitionGallery'
import { NFTDetail } from '../components/NFTDetail'
import { usePortfolioData } from '../hooks/usePortfolioData'
import type { NFTWithMetadata } from '../hooks/usePortfolioData'
import styles from './EmployeePortfolio.module.css'

/**
 * Employee-facing portfolio view showing recognition NFTs as HexBadge categories.
 *
 * Layout:
 * - Profile header with avatar, name, and recognition count
 * - Recognition Portfolio grid with category HexBadges
 * - NFTDetail modal for individual NFT inspection
 */
export function EmployeePortfolio() {
  const { address, isConnected } = useAccount()
  const {
    categories,
    employeeName,
    totalRecognitions,
    isLoading,
    error,
  } = usePortfolioData(address)
  const [selectedNft, setSelectedNft] = useState<NFTWithMetadata | null>(null)

  if (!isConnected || !address) {
    return (
      <Layout>
        <div className={styles.connectMessage}>
          <p className={styles.connectHeading}>Connect your wallet to view your portfolio</p>
          <p className={styles.smallText}>
            Your recognition NFTs will appear here once you connect.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className={styles.wrapper}>
        {/* Profile Header */}
        <ProfileHeader
          employeeName={employeeName}
          address={address}
          totalRecognitions={totalRecognitions}
        />

        {/* Recognition Portfolio */}
        <RecognitionGallery
          categories={categories}
          isLoading={isLoading}
        />

        {/* Error state */}
        {error && (
          <div className={styles.error} role="alert">
            <p className={styles.errorTitle}>Failed to load recognitions</p>
            <p className={styles.errorMessage}>{error.message}</p>
          </div>
        )}

        {/* NFT Detail Modal */}
        <NFTDetail
          nft={selectedNft}
          isOpen={!!selectedNft}
          onClose={() => setSelectedNft(null)}
        />
      </div>
    </Layout>
  )
}
