import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompanyDashboardSection } from '../CompanyDashboardSection'

// --- Hoisted mocks ---

const mockUseCompanyId = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useCompanyId', () => ({
  useCompanyId: mockUseCompanyId,
}))

// Mock child components so they don't need their own mocks
vi.mock('../../components/MintNFTForm', () => ({
  MintNFTForm: ({ companyId }: { companyId: bigint }) => (
    <div data-testid="mint-nft-form">MintNFTForm: {companyId.toString()}</div>
  ),
}))

vi.mock('../../components/NFTTable', () => ({
  NFTTable: ({ companyId }: { companyId: bigint }) => (
    <div data-testid="nft-table">NFTTable: {companyId.toString()}</div>
  ),
}))

vi.mock('../../components/EmployeeList', () => ({
  EmployeeList: ({ companyId }: { companyId: bigint }) => (
    <div data-testid="employee-list">EmployeeList: {companyId.toString()}</div>
  ),
}))

// --- Helpers ---

function setupMocks(overrides: { companyId?: bigint | null; isLoading?: boolean } = {}) {
  mockUseCompanyId.mockReturnValue({
    companyId: overrides.companyId ?? 42n,
    isLoading: overrides.isLoading ?? false,
  })
}

function renderSection(companyId: bigint) {
  return render(<CompanyDashboardSection companyId={companyId} />)
}

// --- Tests ---

describe('CompanyDashboardSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders heading "Company Dashboard"', () => {
    renderSection(42n)
    expect(screen.getByRole('heading', { name: /company dashboard/i })).toBeInTheDocument()
  })

  it('renders MintNFTForm, NFTTable, and EmployeeList with companyId', () => {
    renderSection(42n)

    expect(screen.getByTestId('mint-nft-form')).toBeInTheDocument()
    expect(screen.getByTestId('mint-nft-form')).toHaveTextContent('42')

    expect(screen.getByTestId('nft-table')).toBeInTheDocument()
    expect(screen.getByTestId('nft-table')).toHaveTextContent('42')

    expect(screen.getByTestId('employee-list')).toBeInTheDocument()
    expect(screen.getByTestId('employee-list')).toHaveTextContent('42')
  })

  it('passes different companyId to child components', () => {
    renderSection(99n)

    expect(screen.getByTestId('mint-nft-form')).toHaveTextContent('99')
    expect(screen.getByTestId('nft-table')).toHaveTextContent('99')
    expect(screen.getByTestId('employee-list')).toHaveTextContent('99')
  })
})
