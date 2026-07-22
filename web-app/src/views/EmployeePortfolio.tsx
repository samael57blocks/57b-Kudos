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
 * - Rewards section with CircularBadge (BonusReward) + HexBadge (RecognitionToken)
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
  const { hasToken, tokenId, tokenURI } = useRecognitionToken(address)

  // Modal states
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null)
  const [showRewardDetail, setShowRewardDetail] = useState(false)
  const [showRecognitionDetail, setShowRecognitionDetail] = useState(false)

  // Find the first NFT matching the selected category for description
  const selectedNft = selectedCategory
    ? nfts.find((nft) => nft.category === selectedCategory)
    : null

  // Find the original NFT that was claimed (for RecognitionToken detail)
  // The RecognitionToken uses the same metadata URI as the original NFT
  const recognitionNft = tokenURI
    ? nfts.find((nft) => nft.tokenURI === tokenURI)
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

      {/* Rewards Section */}
      {(balance > 0n || hasToken) && (
        <div className={styles.rewards}>
          <h3 className={styles.rewardsTitle}>Rewards</h3>

          <div className={styles.rewardBadges}>
            {/* BonusReward — Circular Badge */}
            {balance > 0n && (
              <div
                className={styles.rewardBadgeItem}
                onClick={() => setShowRewardDetail(true)}
                onKeyDown={(e) => e.key === 'Enter' && setShowRewardDetail(true)}
                role="button"
                tabIndex={0}
              >
                <CircularBadge
                  amount={formatEther(balance)}
                  size="lg"
                />
                <span className={styles.rewardBadgeLabel}>Bonus Reward</span>
              </div>
            )}

            {/* RecognitionToken — Hex Badge */}
            {hasToken && (
              <div
                className={styles.rewardBadgeItem}
                onClick={() => setShowRecognitionDetail(true)}
                onKeyDown={(e) => e.key === 'Enter' && setShowRecognitionDetail(true)}
                role="button"
                tabIndex={0}
              >
                <Badge category={recognitionNft?.category ?? 'Innovation'} size="lg" />
                <span className={styles.rewardBadgeLabel}>Recognition</span>
              </div>
            )}
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

      {/* Recognition Detail Modal — Original NFT from gallery */}
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

      {/* RecognitionToken Detail Modal — Shows original NFT info */}
      <RecognitionDetail
        category={recognitionNft?.category ?? null}
        employeeName={employeeName}
        description={recognitionNft?.description ?? null}
        tokenId={tokenId}
        isOpen={showRecognitionDetail}
        onClose={() => setShowRecognitionDetail(false)}
      />
    </div>
  )
}
