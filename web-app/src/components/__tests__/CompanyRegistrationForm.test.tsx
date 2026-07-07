import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompanyRegistrationForm } from '../CompanyRegistrationForm'

// --- Hoisted mocks ---

const mockRegisterCompany = vi.hoisted(() => vi.fn())
const mockReset = vi.hoisted(() => vi.fn())
const mockUseRegisterCompany = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useRegisterCompany', () => ({
  useRegisterCompany: mockUseRegisterCompany,
}))

// --- Fixtures ---

const TX_HASH = '0xTxHash123' as `0x${string}`
const VALID_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

// --- Helper ---

function setupHookState(overrides: Record<string, unknown> = {}) {
  const defaults = {
    registerCompany: mockRegisterCompany,
    step: 'idle' as const,
    isConfirming: false,
    txHash: undefined,
    companyId: undefined,
    error: null,
    reset: mockReset,
  }
  mockUseRegisterCompany.mockReturnValue({ ...defaults, ...overrides })
}

function renderForm() {
  return render(<CompanyRegistrationForm />)
}

function fillForm(overrides: { name?: string; wallet?: string } = {}) {
  const name = overrides.name ?? 'Acme Corp'
  const wallet = overrides.wallet ?? VALID_ADDRESS

  fireEvent.change(screen.getByLabelText('Company Name'), {
    target: { value: name },
  })
  fireEvent.change(screen.getByLabelText('Admin Wallet Address'), {
    target: { value: wallet },
  })
}

// --- Tests ---

describe('CompanyRegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupHookState()
    mockRegisterCompany.mockResolvedValue(TX_HASH)
  })

  // ---- render ----

  it('renders company name input, wallet input, and submit button', () => {
    renderForm()

    expect(screen.getByLabelText('Company Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Admin Wallet Address')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /register company/i }),
    ).toBeInTheDocument()
  })

  // ---- validation: empty name ----

  it('shows validation error for empty company name', async () => {
    renderForm()

    fireEvent.change(screen.getByLabelText('Admin Wallet Address'), {
      target: { value: VALID_ADDRESS },
    })
    fireEvent.click(screen.getByRole('button', { name: /register company/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/company name is required/i),
      ).toBeInTheDocument()
    })
    expect(mockRegisterCompany).not.toHaveBeenCalled()
  })

  // ---- validation: invalid wallet ----

  it('shows validation error for invalid wallet address format', async () => {
    renderForm()

    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Acme Corp' },
    })
    fireEvent.change(screen.getByLabelText('Admin Wallet Address'), {
      target: { value: 'not-an-address' },
    })
    fireEvent.click(screen.getByRole('button', { name: /register company/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/invalid wallet address/i),
      ).toBeInTheDocument()
    })
    expect(mockRegisterCompany).not.toHaveBeenCalled()
  })

  // ---- validation: both errors ----

  it('shows validation error for both empty name and invalid wallet', async () => {
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: /register company/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/company name is required/i),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText(/invalid wallet address/i),
    ).toBeInTheDocument()
    expect(mockRegisterCompany).not.toHaveBeenCalled()
  })

  // ---- happy path ----

  it('calls registerCompany with correct name and wallet on valid submit', async () => {
    renderForm()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /register company/i }))

    await waitFor(() => {
      expect(mockRegisterCompany).toHaveBeenCalledWith(
        'Acme Corp',
        VALID_ADDRESS,
      )
    })
  })

  // ---- confirming state ----

  it('shows transaction explorer link during confirming', () => {
    setupHookState({ step: 'confirming', txHash: TX_HASH, isConfirming: true })
    renderForm()

    expect(screen.getByText(/transaction submitted/i)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining(TX_HASH),
    )
  })

  it('disables submit button during confirming', () => {
    setupHookState({ step: 'confirming', isConfirming: true })
    renderForm()

    expect(
      screen.getByRole('button', { name: /confirming/i }),
    ).toBeDisabled()
  })

  // ---- success ----

  it('shows success message when registration succeeds', () => {
    setupHookState({ step: 'success', companyId: 1n })
    renderForm()

    expect(screen.getByText(/company registered/i)).toBeInTheDocument()
  })

  it('calls reset when step transitions to success', async () => {
    const { rerender } = render(<CompanyRegistrationForm />)

    setupHookState({ step: 'success', companyId: 1n })
    rerender(<CompanyRegistrationForm />)

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled()
    })
  })

  // ---- error ----

  it('shows error message with alert role when registration fails', () => {
    setupHookState({
      step: 'error',
      error: new Error('User rejected transaction'),
    })
    renderForm()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/user rejected transaction/i)
  })

  // ---- errors show alert role for validation too ----

  it('shows validation errors with alert role', async () => {
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: /register company/i }))

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThanOrEqual(1)
    })
  })
})
