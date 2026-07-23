import { useState } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { ProfileHeader } from '../components/ProfileHeader'
import { RecognitionGallery } from '../components/RecognitionGallery'
import { RecognitionDetail } from '../components/RecognitionDetail'
import { CircularBadge } from '../components/CircularBadge'
import { RewardDetail } from '../components/RewardDetail'
import { usePortfolioData } from '../hooks/usePortfolioData'
import { useBonusReward } from '../hooks/useBonusReward'
import type { BadgeCategory } from '../lib/recognition-data'
import styles from './EmployeePortfolio.module.css'

/**
 * Employee-facing portfolio view showing recognition NFTs as HexBadge categories.
 *
 * Layout:
 * - Profile header with avatar, name, and recognition count
 * - Recognition Portfolio grid with category HexBadges
 *   - NFT57B (unclaimed): click → RecognitionDetail with Claim button
 *   - RecognitionToken (claimed): click → RecognitionDetail with "Already Claimed"
 * - Rewards section (if has BonusReward balance) — CircularBadge
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
  const { balance, claimReward, isClaiming } = useBonusReward(address)

  // Modal states
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null)
  const [showRewardDetail, setShowRewardDetail] = useState(false)

  // Find NFT data for the selected category
  // Prefer unclaimed NFT57B (for claim flow), fallback to claimed RecognitionToken
  const selectedNft = selectedCategory
    ? nfts.find((nft) => nft.category === selectedCategory && !nft.isClaimed)
      ?? nfts.find((nft) => nft.category === selectedCategory)
    : null

  const isClaimed = selectedNft?.isClaimed ?? false

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

      {/* Recognition Portfolio — NFT57B + RecognitionToken */}
      <RecognitionGallery
        categories={categories}
        isLoading={isLoading}
        onSelect={setSelectedCategory}
      />

      {/* Rewards Section — BonusReward only */}
      {balance > 0n && (
        <div className={styles.rewards}>
          <h3 className={styles.sectionTitle}>Rewards</h3>
          <div
            className={styles.badgeClickable}
            onClick={() => setShowRewardDetail(true)}
            onKeyDown={(e) => e.key === 'Enter' && setShowRewardDetail(true)}
            role="button"
            tabIndex={0}
          >
            <CircularBadge amount={formatEther(balance)} size="lg" />
            <div className={styles.badgeInfo}>
              <span className={styles.badgeCategoryName}>Bonus Reward</span>
              <span className={styles.badgeSubtitle}>{formatEther(balance)} 57BB</span>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={styles.error} role="alert">
          <p className={styles.errorTitle}>Failed to load recognitions</p>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      )}

      {/* Recognition Detail Modal — Works for both NFT57B and RecognitionToken */}
      <RecognitionDetail
        category={selectedCategory}
        employeeName={employeeName}
        description={selectedNft?.description ?? null}
        tokenId={isClaimed ? null : (selectedNft?.tokenId ?? null)}
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        isClaimed={isClaimed}
      />

      {/* BonusReward Detail Modal */}
      <RewardDetail
        balance={formatEther(balance)}
        isOpen={showRewardDetail}
        onClose={() => setShowRewardDetail(false)}
        onClaim={claimReward}
        isClaiming={isClaiming}
      />
    </div>
  )
}
