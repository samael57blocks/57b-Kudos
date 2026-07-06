import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompanyDashboard } from '../CompanyDashboard'
import type { ReactNode } from 'react'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseCompanyId = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
}))

vi.mock('../../hooks/useCompanyId', () => ({
  useCompanyId: mockUseCompanyId,
}))

// Mock Layout to just render children
vi.mock('../../components/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
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

function setupMocks(overrides: Record<string, unknown> = {}) {
  const accountDefaults = {
    address: '0xAdmin' as `0x${string}`,
    isConnected: true,
  }
  const companyIdDefaults = {
    companyId: 42n,
    isLoading: false,
    error: null,
  }
  mockUseAccount.mockReturnValue({ ...accountDefaults, ...(overrides.account ?? {}) })
  mockUseCompanyId.mockReturnValue({ ...companyIdDefaults, ...(overrides.companyId ?? {}) })
}

function renderDashboard() {
  return render(<CompanyDashboard />)
}

// --- Tests ---

describe('CompanyDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('shows not-registered message when companyId is null', () => {
    setupMocks({ companyId: { companyId: null, isLoading: false } })
    renderDashboard()

    expect(
      screen.getByText('You are not registered as a company admin'),
    ).toBeInTheDocument()
  })

  it('shows loading message while resolving companyId', () => {
    setupMocks({ companyId: { companyId: null, isLoading: true } })
    renderDashboard()

    expect(screen.getByText(/loading.*dashboard/i)).toBeInTheDocument()
  })

  it('renders MintNFTForm, NFTTable, and EmployeeList when companyId is resolved', () => {
    setupMocks({ companyId: { companyId: 42n, isLoading: false } })
    renderDashboard()

    expect(screen.getByTestId('mint-nft-form')).toBeInTheDocument()
    expect(screen.getByTestId('mint-nft-form')).toHaveTextContent('42')

    expect(screen.getByTestId('nft-table')).toBeInTheDocument()
    expect(screen.getByTestId('nft-table')).toHaveTextContent('42')

    expect(screen.getByTestId('employee-list')).toBeInTheDocument()
    expect(screen.getByTestId('employee-list')).toHaveTextContent('42')
  })
})
