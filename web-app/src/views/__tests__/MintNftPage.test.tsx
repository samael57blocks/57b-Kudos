import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MintNftPage } from '../MintNftPage'
import type { ReactNode } from 'react'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseCompanyId = vi.hoisted(() => vi.fn())
const mockUseCompanyEmployees = vi.hoisted(() => vi.fn())
const mockWriteContractAsync = vi.hoisted(() => vi.fn())
const mockUseWaitForTransactionReceipt = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  useWriteContract: () => ({
    writeContractAsync: mockWriteContractAsync,
  }),
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
}))

vi.mock('../../hooks/useCompanyId', () => ({
  useCompanyId: mockUseCompanyId,
}))

vi.mock('../../hooks/useCompanyEmployees', () => ({
  useCompanyEmployees: mockUseCompanyEmployees,
}))

vi.mock('../../config/contracts', () => ({
  COMPANY_REGISTRY_ABI: [],
  getContractAddresses: () => ({
    companyRegistry: '0xRegistry',
    nft57b: '0xNFT57B',
  }),
}))

// Mock Layout to just render children
vi.mock('../../components/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

// --- Helpers ---

function setupMocks(
  overrides: {
    account?: { address?: `0x${string}`; isConnected?: boolean }
    companyId?: { companyId?: bigint | null; isLoading?: boolean }
    employees?: { employees?: Array<{ employee: `0x${string}`; date: string }>; isLoading?: boolean }
    receipt?: { data?: unknown; isLoading?: boolean; isError?: boolean; error?: Error | null }
  } = {},
) {
  mockUseAccount.mockReturnValue({
    address: '0xMinter' as `0x${string}`,
    isConnected: true,
    ...(overrides.account ?? {}),
  })
  mockUseCompanyId.mockReturnValue({
    companyId: 1n,
    isLoading: false,
    ...(overrides.companyId ?? {}),
  })
  mockUseCompanyEmployees.mockReturnValue({
    employees: [
      { employee: '0xEmp1' as `0x${string}`, date: '' },
      { employee: '0xEmp2' as `0x${string}`, date: '' },
    ],
    isLoading: false,
    ...(overrides.employees ?? {}),
  })
  mockWriteContractAsync.mockReset()
  mockUseWaitForTransactionReceipt.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    ...(overrides.receipt ?? {}),
  })
}

function renderPage() {
  return render(<MintNftPage />)
}

// --- Tests ---

describe('MintNftPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders the mint form with employee dropdown and URI input', () => {
    renderPage()

    expect(screen.getByText(/mint kudos nft/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/employee/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/metadata uri/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mint kudos/i })).toBeInTheDocument()
  })

  it('populates employee dropdown with company employees', () => {
    renderPage()

    const select = screen.getByLabelText(/employee/i) as HTMLSelectElement
    expect(select.options.length).toBe(3) // placeholder + 2 employees
    expect(screen.getByText('0xEmp1')).toBeInTheDocument()
    expect(screen.getByText('0xEmp2')).toBeInTheDocument()
  })

  it('shows wallet not connected message when address is missing', () => {
    setupMocks({ account: { isConnected: false } })
    renderPage()

    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
  })

  it('calls writeContractAsync on submit with correct args', async () => {
    mockWriteContractAsync.mockResolvedValue('0xtxhash')
    renderPage()

    // Select first employee
    const select = screen.getByLabelText(/employee/i)
    fireEvent.change(select, { target: { value: '0xEmp1' } })

    // Enter URI
    const uriInput = screen.getByLabelText(/metadata uri/i)
    fireEvent.change(uriInput, { target: { value: 'ipfs://QmTest' } })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /mint kudos/i }))

    expect(mockWriteContractAsync).toHaveBeenCalledWith({
      address: '0xRegistry',
      abi: [],
      functionName: 'mintKudos',
      args: ['0xEmp1', 'ipfs://QmTest'],
    })
  })

  it('disables submit button while transaction is pending', async () => {
    let resolveTx!: (value: string) => void
    mockWriteContractAsync.mockImplementation(
      () => new Promise<string>((r) => { resolveTx = r }),
    )
    // Initially not loading — form renders normally
    mockUseWaitForTransactionReceipt.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    })
    renderPage()

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/employee/i), {
      target: { value: '0xEmp1' },
    })
    fireEvent.change(screen.getByLabelText(/metadata uri/i), {
      target: { value: 'ipfs://QmTest' },
    })
    fireEvent.click(screen.getByRole('button', { name: /mint kudos/i }))

    // After writeContractAsync resolves, txHash is set and receipt mock returns isLoading
    mockUseWaitForTransactionReceipt.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    })

    // Resolve the writeContractAsync promise
    resolveTx('0xtxhash')

    // Button should now show Minting... and be disabled (wait for React re-render)
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /minting\.\.\./i })
      expect(button).toBeDisabled()
    })
  })

  it('shows success message after transaction confirms', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      data: { status: 'success' },
      isLoading: false,
      isError: false,
      error: null,
    })
    renderPage()

    expect(screen.getByText(/kudos minted successfully/i)).toBeInTheDocument()
  })

  it('shows error message when writeContractAsync rejects', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('User rejected'))
    renderPage()

    fireEvent.change(screen.getByLabelText(/employee/i), {
      target: { value: '0xEmp1' },
    })
    fireEvent.change(screen.getByLabelText(/metadata uri/i), {
      target: { value: 'ipfs://QmTest' },
    })
    fireEvent.click(screen.getByRole('button', { name: /mint kudos/i }))

    // Wait for the rejection to resolve
    await screen.findByText(/user rejected/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/user rejected/i)
  })

  it('shows loading state while employees are being fetched', () => {
    setupMocks({
      employees: { employees: [], isLoading: true },
    })
    renderPage()

    expect(screen.getByText(/loading employees/i)).toBeInTheDocument()
  })
})
