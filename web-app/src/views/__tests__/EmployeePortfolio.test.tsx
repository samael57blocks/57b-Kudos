import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmployeePortfolio } from '../EmployeePortfolio'
import type { ReactNode } from 'react'
import type { EmployeeNFTData } from '../../hooks/useEmployeeNFTs'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseEmployeeNFTs = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
}))

vi.mock('../../hooks/useEmployeeNFTs', () => ({
  useEmployeeNFTs: mockUseEmployeeNFTs,
}))

// Mock Layout to just render children
vi.mock('../../components/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

// Mock child components
vi.mock('../../components/NFTGallery', () => ({
  NFTGallery: ({
    nfts,
    onSelect,
  }: {
    nfts: EmployeeNFTData[]
    onSelect: (nft: EmployeeNFTData) => void
  }) => (
    <div data-testid="nft-gallery">
      {nfts.map((nft) => (
        <button
          key={nft.tokenId.toString()}
          data-testid={`nft-card-${nft.tokenId}`}
          onClick={() => onSelect(nft)}
        >
          #{nft.tokenId.toString()}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../../components/NFTDetail', () => ({
  NFTDetail: ({
    nft,
    isOpen,
    onClose,
  }: {
    nft: EmployeeNFTData | null
    isOpen: boolean
    onClose: () => void
  }) => (
    <div data-testid="nft-detail" data-open={isOpen}>
      {nft && <span data-testid="detail-token-id">{nft.tokenId.toString()}</span>}
      <button data-testid="close-detail" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}))

// --- Fixtures ---

const MOCK_NFTS: EmployeeNFTData[] = [
  { tokenId: 1n, tokenURI: 'ipfs://QmOne', companyName: 'Alpha Corp' },
  { tokenId: 2n, tokenURI: 'ipfs://QmTwo', companyName: 'Beta Inc' },
]

describe('EmployeePortfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccount.mockReturnValue({
      address: '0xEmployee' as `0x${string}`,
      isConnected: true,
    })
    mockUseEmployeeNFTs.mockReturnValue({
      nfts: MOCK_NFTS,
      isLoading: false,
      error: null,
    })
  })

  it('renders NFT gallery with employee NFTs', () => {
    render(<EmployeePortfolio />)

    expect(screen.getByTestId('nft-gallery')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('shows connect message when wallet is not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
    })

    render(<EmployeePortfolio />)

    expect(
      screen.getByText('Connect your wallet to view your portfolio'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('nft-gallery')).not.toBeInTheDocument()
  })

  it('shows connect message when address is undefined', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: true,
    })

    render(<EmployeePortfolio />)

    expect(
      screen.getByText('Connect your wallet to view your portfolio'),
    ).toBeInTheDocument()
  })

  it('opens NFTDetail when an NFT is selected and closes on close', () => {
    render(<EmployeePortfolio />)

    // Click on the first NFT
    fireEvent.click(screen.getByTestId('nft-card-1'))

    // Detail should now be open
    expect(screen.getByTestId('nft-detail')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('detail-token-id')).toHaveTextContent('1')

    // Close the detail
    fireEvent.click(screen.getByTestId('close-detail'))

    // Detail should be closed
    expect(screen.getByTestId('nft-detail')).toHaveAttribute('data-open', 'false')
  })
})
