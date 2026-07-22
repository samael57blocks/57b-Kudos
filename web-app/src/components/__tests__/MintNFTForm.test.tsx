import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MintNFTForm } from '../MintNFTForm'

// --- Hoisted mocks ---

const mockMint = vi.hoisted(() => vi.fn())
const mockReset = vi.hoisted(() => vi.fn())
const mockUseMintNFT = vi.hoisted(() => vi.fn())
const mockReadContract = vi.hoisted(() => vi.fn())
const mockUsePublicClient = vi.hoisted(() => vi.fn())
const mockUploadImage = vi.hoisted(() => vi.fn())
const mockGetContractAddresses = vi.hoisted(() =>
  vi.fn(() => ({
    nft57b: '0xNFT' as `0x${string}`,
    companyRegistry: '0xRegistry' as `0x${string}`,
  })),
)

vi.mock('../../hooks/useMintNFT', () => ({
  useMintNFT: mockUseMintNFT,
}))

vi.mock('wagmi', () => ({
  usePublicClient: mockUsePublicClient,
}))

vi.mock('../../utils/ipfs', () => ({
  uploadImage: mockUploadImage,
}))

vi.mock('../../config/contracts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../config/contracts')>()
  return {
    ...mod,
    getContractAddresses: mockGetContractAddresses,
  }
})

// --- Fixtures ---

const COMPANY_ID = 42n
const VALID_EMPLOYEE = '0x1111111111111111111111111111111111111111' as `0x${string}`
const TX_HASH = '0xTxHash123' as `0x${string}`

// --- Helper ---

function setupMintNFTState(overrides: Record<string, unknown> = {}) {
  const defaults = {
    mint: mockMint,
    step: 'idle' as const,
    isConfirming: false,
    txHash: undefined,
    error: null,
    reset: mockReset,
  }
  mockUseMintNFT.mockReturnValue({ ...defaults, ...overrides })
}

function renderForm() {
  return render(<MintNFTForm companyId={COMPANY_ID} />)
}

function fillForm(overrides: { employee?: string; value?: string; date?: string; comments?: string } = {}) {
  const emp = overrides.employee ?? VALID_EMPLOYEE
  const val = overrides.value ?? '100'

  fireEvent.change(screen.getByLabelText('Employee Address'), { target: { value: emp } })
  fireEvent.change(screen.getByLabelText('Value (ETH)'), { target: { value: val } })

  if (overrides.date !== undefined) {
    const dateInput = screen.queryByLabelText('Date')
    if (dateInput) fireEvent.change(dateInput, { target: { value: overrides.date } })
  }

  if (overrides.comments !== undefined) {
    const commentsInput = screen.queryByLabelText('Comments')
    if (commentsInput) fireEvent.change(commentsInput, { target: { value: overrides.comments } })
  }
}

// --- Tests ---

describe('MintNFTForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMintNFTState()
    mockUsePublicClient.mockReturnValue({
      readContract: mockReadContract,
    })
    mockReadContract.mockResolvedValue(COMPANY_ID) // employee is registered for this company
    mockMint.mockResolvedValue(TX_HASH)
  })

  // ---- render ----

  it('renders all form fields and submit button', () => {
    renderForm()

    expect(screen.getByLabelText('Employee Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Value (ETH)')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Comments')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mint nft/i })).toBeInTheDocument()
  })

  // ---- validation: invalid address ----

  it('shows inline error for invalid employee address on submit', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Employee Address'), { target: { value: 'not-an-address' } })
    fireEvent.change(screen.getByLabelText('Value (ETH)'), { target: { value: '100' } })

    fireEvent.click(screen.getByRole('button', { name: /mint nft/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid address format/i)).toBeInTheDocument()
    })
    expect(mockMint).not.toHaveBeenCalled()
  })

  // ---- validation: unregistered employee ----

  it('shows inline error when employee is not registered with this company', async () => {
    // getEmployeeCompany returns a DIFFERENT companyId
    mockReadContract.mockResolvedValue(99n)

    renderForm()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /mint nft/i }))

    await waitFor(() => {
      expect(screen.getByText(/not a registered employee/i)).toBeInTheDocument()
    })
    expect(mockMint).not.toHaveBeenCalled()
  })

  it('shows inline error when getEmployeeCompany throws', async () => {
    mockReadContract.mockRejectedValue(new Error('RPC error'))

    renderForm()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /mint nft/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to verify employee registration/i)).toBeInTheDocument()
    })
    expect(mockMint).not.toHaveBeenCalled()
  })

  // ---- happy path submission ----

  it('calls mint with correct achievement on valid submission', async () => {
    renderForm()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /mint nft/i }))

    await waitFor(() => {
      expect(mockReadContract).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockMint).toHaveBeenCalled()
    })

    const callArgs = mockMint.mock.calls[0][0]
    expect(callArgs.employee).toBe(VALID_EMPLOYEE)
    expect(callArgs.value).toBe('100')
    expect(callArgs.name).toBeTruthy()
  })

  // ---- disabled states ----

  it('disables inputs and submit button when step is uploading', () => {
    setupMintNFTState({ step: 'uploading' })
    renderForm()

    expect(screen.getByLabelText('Employee Address')).toBeDisabled()
    expect(screen.getByLabelText('Value (ETH)')).toBeDisabled()
    expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
  })

  it('disables inputs and submit button when step is confirming', () => {
    setupMintNFTState({ step: 'confirming', txHash: TX_HASH })
    renderForm()

    expect(screen.getByLabelText('Employee Address')).toBeDisabled()
    expect(screen.getByLabelText('Value (ETH)')).toBeDisabled()
    expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled()
  })

  // ---- tx explorer link ----

  it('shows transaction explorer link during confirming state', () => {
    setupMintNFTState({ step: 'confirming', txHash: TX_HASH })
    renderForm()

    expect(screen.getByText(/transaction submitted/i)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining(TX_HASH))
  })

  // ---- success resets form ----

  it('calls reset when step transitions to success', async () => {
    // Start idle, then switch to success via re-render
    const { rerender } = render(<MintNFTForm companyId={COMPANY_ID} />)

    // Simulate the hook returning success
    setupMintNFTState({ step: 'success', txHash: TX_HASH })
    rerender(<MintNFTForm companyId={COMPANY_ID} />)

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled()
    })
  })

  // ---- network switch error ----

  it('shows error message when mint process has an error', () => {
    setupMintNFTState({ step: 'error', error: new Error('User rejected') })
    renderForm()

    expect(screen.getByText(/user rejected/i)).toBeInTheDocument()
  })
})
