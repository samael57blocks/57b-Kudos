import { useState } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { ProfileHeader } from '../components/ProfileHeader'
import { RecognitionGallery } from '../components/RecognitionGallery'
import { RecognitionDetail } from '../components/RecognitionDetail'
import { CircularBadge } from '../components/CircularBadge'
import { RewardDetail } from '../components/RewardDetail'
import { Badge } from '../components/HexBadge/Badge'
import { usePortfolioData } from '../hooks/usePortfolioData'
import { useBonusReward } from '../hooks/useBonusReward'
import { useRecognitionToken } from '../hooks/useRecognitionToken'
import type { BadgeCategory } from '../lib/recognition-data'
import styles from './EmployeePortfolio.module.css'

/**
 * Employee-facing portfolio view showing recognition NFTs as HexBadge categories.
 *
 * Layout:
 * - Profile header with avatar, name, and recognition count
 * - Recognition Portfolio grid with category HexBadges
 * - Recognition Badge section (if claimed) — HexBadge with category name
 * - Rewards section (if has balance) — CircularBadge for BonusReward
 * - Modals for claim flow and reward details
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
  const {
    hasToken,
    tokenId,
    category: recognitionCategory,
    employeeName: recognitionEmployeeName,
    description: recognitionDescription,
  } = useRecognitionToken(address)

  // Modal states
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null)
  const [showRewardDetail, setShowRewardDetail] = useState(false)
  const [showRecognitionDetail, setShowRecognitionDetail] = useState(false)

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

      {/* Recognition Badge — Permanent, non-transferable */}
      {hasToken && recognitionCategory && (
        <div className={styles.recognitionBadge}>
          <h3 className={styles.sectionTitle}>Recognition Badge</h3>
          <div
            className={styles.badgeClickable}
            onClick={() => setShowRecognitionDetail(true)}
            onKeyDown={(e) => e.key === 'Enter' && setShowRecognitionDetail(true)}
            role="button"
            tabIndex={0}
          >
            <Badge category={recognitionCategory} size="lg" />
            <div className={styles.badgeInfo}>
              <span className={styles.badgeCategoryName}>
                {recognitionCategory}
              </span>
              <span className={styles.badgeSubtitle}>Permanent Recognition</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Recognition Detail Modal — From gallery NFT selection */}
      <RecognitionDetail
        category={selectedCategory}
        employeeName={employeeName}
        description={selectedNft?.description ?? null}
        tokenId={selectedNft?.tokenId ?? null}
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
      />

      {/* BonusReward Detail Modal */}
      <RewardDetail
        balance={formatEther(balance)}
        isOpen={showRewardDetail}
        onClose={() => setShowRewardDetail(false)}
        onClaim={claimReward}
        isClaiming={isClaiming}
      />

      {/* RecognitionToken Detail Modal — Shows original NFT info from metadata */}
      <RecognitionDetail
        category={recognitionCategory}
        employeeName={recognitionEmployeeName}
        description={recognitionDescription}
        tokenId={tokenId}
        isOpen={showRecognitionDetail}
        onClose={() => setShowRecognitionDetail(false)}
      />
    </div>
  )
}
