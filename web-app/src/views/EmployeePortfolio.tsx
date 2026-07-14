import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Layout } from '../components/Layout'
import { NFTGallery } from '../components/NFTGallery'
import { NFTDetail } from '../components/NFTDetail'
import { useEmployeeNFTs } from '../hooks/useEmployeeNFTs'
import type { EmployeeNFTData } from '../hooks/useEmployeeNFTs'
import styles from './EmployeePortfolio.module.css'

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
        <h1 className={styles.titleLine}>My Portfolio</h1>
        <p className={styles.subtitle}>
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
