import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmployeeRegistration } from '../EmployeeRegistration'
import type { CompanyData } from '../../hooks/useCompanies'

// --- Hoisted mocks ---

const mockUseAccount = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())
const mockReadContract = vi.hoisted(() => vi.fn())
const mockUseCompanies = vi.hoisted(() => vi.fn())
const mockRegisterEmployee = vi.hoisted(() => vi.fn())
const mockReset = vi.hoisted(() => vi.fn())
const mockUseRegisterEmployee = vi.hoisted(() => vi.fn())

vi.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  usePublicClient: mockUsePublicClient,
}))

vi.mock('../../hooks/useCompanies', () => ({
  useCompanies: mockUseCompanies,
}))

vi.mock('../../hooks/useRegisterEmployee', () => ({
  useRegisterEmployee: mockUseRegisterEmployee,
}))

// --- Fixtures ---

const CONNECTED_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`
const TX_HASH = '0xTxHash123' as `0x${string}`

const MOCK_COMPANIES: CompanyData[] = [
  { id: 1n, name: 'Acme Corp', admin: '0xAAA' as `0x${string}`, createdAt: 1000n },
  { id: 2n, name: 'Beta Inc', admin: '0xBBB' as `0x${string}`, createdAt: 2000n },
]

// --- Helpers ---

function setupMocks(overrides: Record<string, unknown> = {}) {
  const accountDefaults = { address: CONNECTED_ADDRESS, isConnected: true }
  const companiesDefaults = {
    companies: MOCK_COMPANIES,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }
  const registerDefaults = {
    registerEmployee: mockRegisterEmployee,
    step: 'idle' as const,
    isConfirming: false,
    txHash: undefined,
    error: null,
    reset: mockReset,
  }

  mockUseAccount.mockReturnValue({ ...accountDefaults, ...(overrides.account ?? {}) })
  mockUseCompanies.mockReturnValue({ ...companiesDefaults, ...(overrides.companies ?? {}) })
  mockUseRegisterEmployee.mockReturnValue({ ...registerDefaults, ...(overrides.register ?? {}) })
  mockUsePublicClient.mockReturnValue({
    readContract: mockReadContract,
  })
  mockReadContract.mockResolvedValue(0n) // not already registered
  mockRegisterEmployee.mockResolvedValue(TX_HASH)
}

function renderComponent() {
  return render(<EmployeeRegistration />)
}

// --- Tests ---

describe('EmployeeRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  // ---- render ----

  it('renders company dropdown and register button when companies exist', async () => {
    renderComponent()

    // Wait for the mount check (getEmployeeCompany) to settle
    expect(await screen.findByLabelText('Select Company')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: /register as employee/i }),
    ).toBeInTheDocument()
  })

  it('renders company options from useCompanies data', async () => {
    renderComponent()

    // Wait for the mount check to settle
    await screen.findByLabelText('Select Company')

    const options = screen.getAllByRole('option')
    // First option is the placeholder
    expect(options[0]).toHaveTextContent('Select a company')
    expect(options[1]).toHaveTextContent('Acme Corp')
    expect(options[2]).toHaveTextContent('Beta Inc')
    expect(options[1]).toHaveValue('1')
    expect(options[2]).toHaveValue('2')
  })

  // ---- loading state ----

  it('shows loading message when companies are loading', async () => {
    setupMocks({ companies: { companies: [], isLoading: true, error: null } })
    renderComponent()

    // Wait for the mount check to settle, then loading state shows
    expect(await screen.findByText(/loading companies/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /register as employee/i }),
    ).not.toBeInTheDocument()
  })

  // ---- empty state ----

  it('shows empty message when no companies are registered', async () => {
    setupMocks({ companies: { companies: [], isLoading: false, error: null } })
    renderComponent()

    // Wait for the mount check to settle
    expect(
      await screen.findByText(/no companies registered yet/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /register as employee/i }),
    ).not.toBeInTheDocument()
  })

  // ---- error state ----

  it('shows error message when useCompanies has error', async () => {
    setupMocks({
      companies: {
        companies: [],
        isLoading: false,
        error: new Error('Failed to fetch'),
      },
    })
    renderComponent()

    // Wait for the mount check to settle
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/failed to fetch/i)
    expect(
      screen.queryByRole('button', { name: /register as employee/i }),
    ).not.toBeInTheDocument()
  })

  // ---- register button disabled without selection ----

  it('disables register button when no company is selected', async () => {
    renderComponent()

    // Wait for the mount check to settle
    expect(
      await screen.findByRole('button', { name: /register as employee/i }),
    ).toBeDisabled()
  })

  // ---- register button enabled with selection ----

  it('enables register button when a company is selected', async () => {
    renderComponent()

    // Wait for the mount check to settle
    await screen.findByLabelText('Select Company')

    fireEvent.change(screen.getByLabelText('Select Company'), {
      target: { value: '1' },
    })

    expect(
      screen.getByRole('button', { name: /register as employee/i }),
    ).not.toBeDisabled()
  })

  // ---- calls registerEmployee ----

  it('calls registerEmployee with selected companyId on submit', async () => {
    renderComponent()

    await screen.findByLabelText('Select Company')

    fireEvent.change(screen.getByLabelText('Select Company'), {
      target: { value: '1' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /register as employee/i }),
    )

    await waitFor(() => {
      expect(mockRegisterEmployee).toHaveBeenCalledWith(1n)
    })
  })

  // ---- already registered guard ----

  it('shows already registered message when getEmployeeCompany returns > 0', async () => {
    mockReadContract.mockResolvedValue(3n) // already registered to company 3

    renderComponent()

    await waitFor(() => {
      expect(
        screen.getByText(/you are already registered/i),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByLabelText('Select Company'),
    ).not.toBeInTheDocument()
  })

  // ---- confirming state ----

  it('shows transaction explorer link during confirming', async () => {
    setupMocks({
      register: {
        step: 'confirming' as const,
        isConfirming: true,
        txHash: TX_HASH,
      },
    })
    renderComponent()

    // Wait for the mount check to settle
    expect(await screen.findByText(/transaction submitted/i)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining(TX_HASH),
    )
  })

  it('disables register button during confirming', async () => {
    setupMocks({
      register: {
        step: 'confirming' as const,
        isConfirming: true,
      },
    })
    renderComponent()

    // Wait for the mount check to settle, then confirming state shows
    expect(
      await screen.findByRole('button', { name: /confirming/i }),
    ).toBeDisabled()
  })

  // ---- success ----

  it('shows success message when registration succeeds', async () => {
    setupMocks({ register: { step: 'success' as const } })
    renderComponent()

    // Wait for the mount check to settle
    expect(await screen.findByText(/successfully registered/i)).toBeInTheDocument()
  })

  // ---- error ----

  it('shows error message with alert role when registration fails', async () => {
    setupMocks({
      register: {
        step: 'error' as const,
        error: new Error('Company not found'),
      },
    })
    renderComponent()

    // Wait for the mount check to settle
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/company not found/i)
  })
})
