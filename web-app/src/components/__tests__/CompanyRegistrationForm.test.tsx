import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompanyRegistrationForm } from '../CompanyRegistrationForm'

// --- Hoisted mocks ---

const mockRegisterCompany = vi.hoisted(() => vi.fn())
const mockReset = vi.hoisted(() => vi.fn())
const mockUseRegisterCompany = vi.hoisted(() => vi.fn())
const mockUseAccount = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useRegisterCompany', () => ({
  useRegisterCompany: mockUseRegisterCompany,
}))

vi.mock('wagmi', async (importOriginal) => {
  const mod = await importOriginal<typeof import('wagmi')>()
  return { ...mod, useAccount: mockUseAccount }
})

// --- Fixtures ---

const TX_HASH = '0xTxHash123' as `0x${string}`
const CONNECTED_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`

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

function fillForm(overrides: { name?: string } = {}) {
  const name = overrides.name ?? 'Acme Corp'

  fireEvent.change(screen.getByLabelText('Company Name'), {
    target: { value: name },
  })
}

/**
 * Submit the form and wait for registerCompany to be called.
 * This sets internal `submittedName` state, required before
 * the success card can render on `step === 'success'`.
 */
async function submitForm() {
  fireEvent.click(screen.getByRole('button', { name: /register company/i }))
  await waitFor(() => {
    expect(mockRegisterCompany).toHaveBeenCalled()
  })
}

// --- Tests ---

describe('CompanyRegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupHookState()
    mockRegisterCompany.mockResolvedValue(TX_HASH)
    mockUseAccount.mockReturnValue({ address: CONNECTED_ADDRESS })
  })

  // ---- render ----

  it('renders company name input and submit button', () => {
    renderForm()

    expect(screen.getByLabelText('Company Name')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /register company/i }),
    ).toBeInTheDocument()
  })

  // ---- validation: empty name ----

  it('shows validation error for empty company name', async () => {
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: /register company/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/company name is required/i),
      ).toBeInTheDocument()
    })
    expect(mockRegisterCompany).not.toHaveBeenCalled()
  })

  // ---- happy path ----

  it('calls registerCompany with name and connected address on valid submit', async () => {
    renderForm()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /register company/i }))

    await waitFor(() => {
      expect(mockRegisterCompany).toHaveBeenCalledWith(
        'Acme Corp',
        CONNECTED_ADDRESS,
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

  // ---- success card ----

  it('shows success card with company details when registration succeeds', async () => {
    const { rerender } = renderForm()
    fillForm()
    await submitForm()

    // Transition to success
    setupHookState({ step: 'success', companyId: 1n })
    rerender(<CompanyRegistrationForm />)

    // Card heading
    expect(screen.getByText(/company registered/i)).toBeInTheDocument()
    // Company name in the detail grid
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    // Company ID
    expect(screen.getByText('#1')).toBeInTheDocument()
    // Admin wallet (truncated)
    expect(screen.getByText('0xf39F…2266')).toBeInTheDocument()
    // Register another button
    expect(
      screen.getByRole('button', { name: /register another company/i }),
    ).toBeInTheDocument()
  })

  it('calls reset when "Register another company" is clicked', async () => {
    const { rerender } = renderForm()
    fillForm()
    await submitForm()

    // Transition to success
    setupHookState({ step: 'success', companyId: 1n })
    rerender(<CompanyRegistrationForm />)

    // Click "Register another company"
    fireEvent.click(
      screen.getByRole('button', { name: /register another company/i }),
    )

    expect(mockReset).toHaveBeenCalled()
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
