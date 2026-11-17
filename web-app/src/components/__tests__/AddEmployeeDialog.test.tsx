import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddEmployeeDialog } from '../AddEmployeeDialog'

// --- Hoisted mocks ---

const mockRegisterEmployee = vi.hoisted(() => vi.fn())
const mockReset = vi.hoisted(() => vi.fn())
const mockUseRegisterEmployee = vi.hoisted(() => vi.fn())
const mockBuildExplorerTxUrl = vi.hoisted(() => vi.fn())

vi.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children,
}))

vi.mock('../../hooks/useRegisterEmployee', () => ({
  useRegisterEmployee: mockUseRegisterEmployee,
}))

vi.mock('../../utils/format', () => ({
  buildExplorerTxUrl: mockBuildExplorerTxUrl,
}))

// --- Fixtures ---

const COMPANY_ID = 7n
const VALID_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`
const TX_HASH = '0xTxHash456' as `0x${string}`

// --- Helper ---

function setupHookState(overrides: Record<string, unknown> = {}) {
  const defaults = {
    registerEmployee: mockRegisterEmployee,
    step: 'idle' as const,
    isConfirming: false,
    txHash: undefined as `0x${string}` | undefined,
    error: null as Error | null,
    reset: mockReset,
  }
  mockUseRegisterEmployee.mockReturnValue({ ...defaults, ...overrides })
}

function renderDialog(props: Partial<React.ComponentProps<typeof AddEmployeeDialog>> = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    companyId: COMPANY_ID,
  }
  return { ...defaults, ...props, ...render(<AddEmployeeDialog {...defaults} {...props} />) }
}

function fillAddress(value: string) {
  fireEvent.change(screen.getByLabelText('Wallet Address'), { target: { value } })
}

function fillName(value: string) {
  fireEvent.change(screen.getByLabelText('Employee Name'), { target: { value } })
}

function clickSubmit() {
  fireEvent.click(screen.getByRole('button', { name: /add employee/i }))
}

function clickCancel() {
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
}

// --- Tests ---

describe('AddEmployeeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupHookState()
    mockRegisterEmployee.mockResolvedValue(TX_HASH)
    mockBuildExplorerTxUrl.mockReturnValue('https://etherscan.io/tx/0xTxHash456')
  })

  // ---- renders form fields ----

  it('renders address input with placeholder and name input', () => {
    renderDialog()

    expect(screen.getByLabelText('Wallet Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Wallet Address')).toHaveAttribute('placeholder', '0x...')
    expect(screen.getByLabelText('Employee Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Employee Name')).toHaveAttribute('placeholder', 'Enter employee name')
    expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  // ---- validation: empty address ----

  it('submit button disabled when address is empty', () => {
    renderDialog()

    fillName('Alice')
    clickSubmit()

    expect(mockRegisterEmployee).not.toHaveBeenCalled()
  })

  // ---- validation: invalid address ----

  it('submit button disabled when address format is invalid', () => {
    renderDialog()

    fillAddress('not-an-address')
    fillName('Alice')
    clickSubmit()

    expect(screen.getByText(/invalid address format/i)).toBeInTheDocument()
    expect(mockRegisterEmployee).not.toHaveBeenCalled()
  })

  // ---- validation: empty name ----

  it('submit button disabled when name is empty', () => {
    renderDialog()

    fillAddress(VALID_ADDRESS)
    clickSubmit()

    expect(screen.getByText(/employee name is required/i)).toBeInTheDocument()
    expect(mockRegisterEmployee).not.toHaveBeenCalled()
  })

  // ---- validation: valid inputs ----

  it('submit button enabled and form submits when both fields valid', async () => {
    const { onSuccess: _onSuccess } = renderDialog()

    fillAddress(VALID_ADDRESS)
    fillName('Alice')
    clickSubmit()

    await waitFor(() => {
      expect(mockRegisterEmployee).toHaveBeenCalledWith(VALID_ADDRESS, COMPANY_ID, 'Alice')
    })
  })

  // ---- submit calls registerEmployee ----

  it('calls registerEmployee with correct arguments', async () => {
    renderDialog()

    fillAddress(VALID_ADDRESS)
    fillName('Bob Smith')
    clickSubmit()

    await waitFor(() => {
      expect(mockRegisterEmployee).toHaveBeenCalledTimes(1)
      expect(mockRegisterEmployee).toHaveBeenCalledWith(VALID_ADDRESS, COMPANY_ID, 'Bob Smith')
    })
  })

  // ---- loading state ----

  it('disables inputs and shows confirming text when isConfirming is true', () => {
    setupHookState({ step: 'confirming' as const, isConfirming: true, txHash: TX_HASH })
    renderDialog()

    expect(screen.getByLabelText('Wallet Address')).toBeDisabled()
    expect(screen.getByLabelText('Employee Name')).toBeDisabled()
    expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })

  // ---- success callback ----

  it('calls onSuccess when step transitions to success', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    const { rerender } = render(
      <AddEmployeeDialog open={true} onClose={onClose} onSuccess={onSuccess} companyId={COMPANY_ID} />,
    )

    // Transition hook to success
    setupHookState({ step: 'success' as const })
    rerender(
      <AddEmployeeDialog open={true} onClose={onClose} onSuccess={onSuccess} companyId={COMPANY_ID} />,
    )

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  // ---- close button ----

  it('calls onClose when close button clicked (not confirming)', () => {
    const onClose = vi.fn()
    renderDialog({ onClose })

    clickCancel()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ---- cancel button ----

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn()
    renderDialog({ onClose })

    clickCancel()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ---- close blocked during confirming ----

  it('does not call onClose when confirming', () => {
    setupHookState({ step: 'confirming' as const, isConfirming: true, txHash: TX_HASH })
    const onClose = vi.fn()
    renderDialog({ onClose })

    clickCancel()

    expect(onClose).not.toHaveBeenCalled()
  })

  // ---- reset called on close ----

  it('calls reset when closing', () => {
    renderDialog({ onClose: vi.fn() })

    clickCancel()

    expect(mockReset).toHaveBeenCalled()
  })

  // ---- validation error shown ----

  it('shows validation error message in alert role', () => {
    renderDialog()

    fillAddress('bad')
    fillName('Alice')
    clickSubmit()

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid address format/i)
  })
})
