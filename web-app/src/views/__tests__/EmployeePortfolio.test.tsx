import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmployeePortfolio } from '../EmployeePortfolio'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUsePortfolioData = vi.hoisted(() => vi.fn())
const mockUseBonusReward = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
}))

vi.mock('../../hooks/usePortfolioData', () => ({
  usePortfolioData: mockUsePortfolioData,
}))

vi.mock('../../hooks/useBonusReward', () => ({
  useBonusReward: mockUseBonusReward,
}))

// Mock child components
vi.mock('../../components/RecognitionGallery', () => ({
  RecognitionGallery: ({
    categories,
    onSelect,
  }: {
    categories: { category: string; count: number; hasClaimed: boolean }[]
    onSelect?: (category: string) => void
  }) => (
    <div data-testid="recognition-gallery">
      {categories.map((cat) => (
        <button
          key={cat.category}
          data-testid={`category-${cat.category}`}
          onClick={() => onSelect?.(cat.category)}
        >
          {cat.category} ×{cat.count}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../../components/RecognitionDetail', () => ({
  RecognitionDetail: ({
    category,
    isOpen,
    onClose,
  }: {
    category: string | null
    isOpen: boolean
    onClose: () => void
  }) => (
    <div data-testid="recognition-detail" data-open={isOpen}>
      {category && <span data-testid="detail-category">{category}</span>}
      <button data-testid="close-detail" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}))

vi.mock('../../components/RewardDetail', () => ({
  RewardDetail: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean
    onClose: () => void
  }) => (
    <div data-testid="reward-detail" data-open={isOpen}>
      <button data-testid="close-reward" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}))

vi.mock('../../components/ProfileHeader', () => ({
  ProfileHeader: ({ employeeName }: { employeeName: string | null }) => (
    <div data-testid="profile-header">{employeeName}</div>
  ),
}))

vi.mock('../../components/CircularBadge', () => ({
  CircularBadge: ({ amount }: { amount: string }) => (
    <div data-testid="circular-badge">{amount}</div>
  ),
}))

// --- Fixtures ---

const MOCK_CATEGORIES = [
  { category: 'Innovation', count: 2, hasClaimed: false },
  { category: 'Leadership', count: 1, hasClaimed: true },
]

describe('EmployeePortfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccount.mockReturnValue({
      address: '0xEmployee' as `0x${string}`,
      isConnected: true,
    })
    mockUsePortfolioData.mockReturnValue({
      nfts: [],
      categories: MOCK_CATEGORIES,
      employeeName: 'Alice Johnson',
      totalRecognitions: 3,
      isLoading: false,
      error: null,
    })
    mockUseBonusReward.mockReturnValue({
      balance: 0n,
      claimReward: vi.fn(),
      isClaiming: false,
      error: null,
    })
  })

  it('renders recognition gallery with categories', () => {
    render(<EmployeePortfolio />)

    expect(screen.getByTestId('recognition-gallery')).toBeInTheDocument()
    expect(screen.getByText('Innovation ×2')).toBeInTheDocument()
    expect(screen.getByText('Leadership ×1')).toBeInTheDocument()
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
    expect(screen.queryByTestId('recognition-gallery')).not.toBeInTheDocument()
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

  it('opens RecognitionDetail when a category is selected and closes on close', () => {
    render(<EmployeePortfolio />)

    // Click on the first category
    fireEvent.click(screen.getByTestId('category-Innovation'))

    // Detail should now be open
    expect(screen.getByTestId('recognition-detail')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('detail-category')).toHaveTextContent('Innovation')

    // Close the detail
    fireEvent.click(screen.getByTestId('close-detail'))

    // Detail should be closed
    expect(screen.getByTestId('recognition-detail')).toHaveAttribute('data-open', 'false')
  })
})
