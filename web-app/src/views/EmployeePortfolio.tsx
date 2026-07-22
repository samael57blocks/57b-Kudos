import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ProfileHeader } from '../components/ProfileHeader'
import { RecognitionGallery } from '../components/RecognitionGallery'
import { RecognitionDetail } from '../components/RecognitionDetail'
import { usePortfolioData } from '../hooks/usePortfolioData'
import type { BadgeCategory } from '../lib/recognition-data'
import styles from './EmployeePortfolio.module.css'

/**
 * Employee-facing portfolio view showing recognition NFTs as HexBadge categories.
 *
 * Layout:
 * - Profile header with avatar, name, and recognition count
 * - Recognition Portfolio grid with category HexBadges
 * - RecognitionDetail modal when a badge is clicked
 */
export function EmployeePortfolio() {
  const { address, isConnected } = useAccount()
  const {
    nfts,
    categories,
    employeeName,
    totalRecognitions,
    isLoading,
    error,
  } = usePortfolioData(address)
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null)

  // Find the first NFT matching the selected category for description
  const selectedNft = selectedCategory
    ? nfts.find((nft) => nft.category === selectedCategory)
    : null

  if (!isConnected || !address) {
    return (
      <div className={styles.connectMessage}>
        <p className={styles.connectHeading}>Connect your wallet to view your portfolio</p>
        <p className={styles.smallText}>
          Your recognition NFTs will appear here once you connect.
        </p>
      </div>
    )
  }

  return (
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
        onSelect={setSelectedCategory}
      />

      {/* Error state */}
      {error && (
        <div className={styles.error} role="alert">
          <p className={styles.errorTitle}>Failed to load recognitions</p>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      )}

      {/* Recognition Detail Modal */}
      <RecognitionDetail
        category={selectedCategory}
        employeeName={employeeName}
        description={selectedNft?.description ?? null}
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
      />
    </div>
  )
}
