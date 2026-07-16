import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MintNftPage } from '../MintNftPage'
import type { ReactNode } from 'react'
import type { EmployeeData } from '../../hooks/useCompanyEmployees'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUseMintCompanyId = vi.hoisted(() => vi.fn())
const mockUseCompanyEmployees = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
}))

vi.mock('../../hooks/useMintCompanyId', () => ({
  useMintCompanyId: mockUseMintCompanyId,
}))

vi.mock('../../hooks/useCompanyEmployees', () => ({
  useCompanyEmployees: mockUseCompanyEmployees,
}))

vi.mock('../../components/MinterMintForm', () => ({
  MinterMintForm: ({
    companyId,
    employees,
  }: {
    companyId: bigint
    employees: EmployeeData[]
  }) => (
    <div
      data-testid="minter-mint-form"
      data-company-id={String(companyId)}
      data-employees={JSON.stringify(employees)}
    >
      MinterMintForm
    </div>
  ),
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
    companyId?: {
      companyId?: bigint | null
      isLoading?: boolean
      error?: Error | null
    }
    employees?: {
      employees?: EmployeeData[]
      isLoading?: boolean
    }
  } = {},
) {
  mockUseAccount.mockReturnValue({
    address: '0xMinter' as `0x${string}`,
    isConnected: true,
    ...(overrides.account ?? {}),
  })
  mockUseMintCompanyId.mockReturnValue({
    companyId: 1n,
    isLoading: false,
    error: null,
    ...(overrides.companyId ?? {}),
  })
  mockUseCompanyEmployees.mockReturnValue({
    employees: [
      {
        employee: '0xEmp1' as `0x${string}`,
        name: 'Alice',
        registrationDate: '2024-01-01',
      },
      {
        employee: '0xEmp2' as `0x${string}`,
        name: 'Bob',
        registrationDate: '2024-02-01',
      },
    ],
    isLoading: false,
    ...(overrides.employees ?? {}),
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

  it('renders MinterMintForm when connected', () => {
    renderPage()

    expect(screen.getByTestId('minter-mint-form')).toBeInTheDocument()
  })

  it('passes companyId and employees to MinterMintForm', () => {
    renderPage()

    const form = screen.getByTestId('minter-mint-form')
    expect(form).toHaveAttribute('data-company-id', '1')
    expect(JSON.parse(form.getAttribute('data-employees')!)).toHaveLength(2)
  })

  it('shows loading while employees fetch', () => {
    setupMocks({ employees: { employees: [], isLoading: true } })
    renderPage()

    expect(screen.getByText(/loading employees/i)).toBeInTheDocument()
    expect(screen.queryByTestId('minter-mint-form')).not.toBeInTheDocument()
  })

  it('shows connect prompt when disconnected', () => {
    setupMocks({ account: { isConnected: false } })
    renderPage()

    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
    expect(screen.queryByTestId('minter-mint-form')).not.toBeInTheDocument()
  })

  it('does not render raw URI input', () => {
    renderPage()

    const urlInput = document.querySelector('input[type="url"]')
    expect(urlInput).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/metadata uri/i)).not.toBeInTheDocument()
  })

  it('shows error when company cannot be resolved', () => {
    setupMocks({
      companyId: {
        companyId: null,
        isLoading: false,
        error: new Error(
          'Unable to find a company for this wallet. You must be a company admin or a registered employee with minter access.',
        ),
      },
    })
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent(/unable to find a company/i)
    expect(screen.queryByTestId('minter-mint-form')).not.toBeInTheDocument()
  })
})
