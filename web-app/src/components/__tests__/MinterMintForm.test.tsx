import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MinterMintForm } from '../MinterMintForm'
import type { EmployeeData } from '../../hooks/useCompanyEmployees'

// --- Hoisted mocks ---

const mockMint = vi.hoisted(() => vi.fn())
const mockReset = vi.hoisted(() => vi.fn())
const mockUseMintNFT = vi.hoisted(() => vi.fn())
const mockUploadImage = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useMintNFT', () => ({
  useMintNFT: mockUseMintNFT,
}))

vi.mock('../../utils/ipfs', () => ({
  uploadImage: mockUploadImage,
}))

vi.mock('../../utils/format', () => ({
  buildExplorerTxUrl: (txHash?: string, baseUrl?: string) =>
    txHash ? `${baseUrl ?? 'https://etherscan.io'}/tx/${txHash}` : undefined,
}))

vi.mock('../../config/contracts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../config/contracts')>()
  return {
    ...mod,
    getContractAddresses: vi.fn(() => ({
      nft57b: '0xNFT' as `0x${string}`,
      companyRegistry: '0xRegistry' as `0x${string}`,
    })),
  }
})

// --- Fixtures ---

const COMPANY_ID = 42n
const TX_HASH = '0xTxHash123' as `0x${string}`

const EMPLOYEES: EmployeeData[] = [
  {
    employee: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    name: 'Alice Johnson',
    registrationDate: '2024-01-15',
  },
  {
    employee: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    name: 'Bob Smith',
    registrationDate: '2024-02-20',
  },
  {
    employee: '0x3333333333333333333333333333333333333333' as `0x${string}`,
    name: 'Carol Davis',
    registrationDate: '2024-03-10',
  },
]

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

function renderForm(
  employees: EmployeeData[] = EMPLOYEES,
  companyId: bigint = COMPANY_ID,
) {
  return render(<MinterMintForm companyId={companyId} employees={employees} />)
}

function fillForm(
  overrides: { employeeIndex?: number; value?: string; date?: string; comments?: string; category?: string } = {},
) {
  const val = overrides.value ?? '100'
  const empIndex = overrides.employeeIndex ?? 0

  fireEvent.change(screen.getByLabelText('Employee'), {
    target: { value: EMPLOYEES[empIndex].employee },
  })

  // Select first category by default
  const categoryToSelect = overrides.category ?? 'Innovation'
  fireEvent.click(screen.getByText(categoryToSelect).closest('button[type="button"]')!)

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

describe('MinterMintForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMintNFTState()
    mockMint.mockResolvedValue(TX_HASH)
    mockUploadImage.mockResolvedValue('QmImageCid123')
  })

  // ── T4a: renders employee dropdown with names ──

  it('renders employee dropdown with names', () => {
    renderForm()

    const select = screen.getByLabelText('Employee')
    expect(select).toBeInTheDocument()
    expect(select.tagName).toBe('SELECT')

    EMPLOYEES.forEach((emp) => {
      expect(screen.getByRole('option', { name: emp.name })).toBeInTheDocument()
    })
  })

  // ── T4b: shows "Select an employee..." placeholder ──

  it('shows "Select an employee..." placeholder', () => {
    renderForm()

    expect(
      screen.getByRole('option', { name: 'Select an employee...' }),
    ).toBeInTheDocument()
  })

  // ── T4c: renders value, date, comments, image fields ──

  it('renders value, date, comments, and image fields', () => {
    renderForm()

    expect(screen.getByLabelText('Value (ETH)')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Comments')).toBeInTheDocument()
    expect(screen.getByLabelText('Image')).toBeInTheDocument()
  })

  // ── T4d: renders submit button with initial label ──

  it('renders submit button with "Mint Kudos" label', () => {
    renderForm()

    expect(screen.getByRole('button', { name: /mint kudos/i })).toBeInTheDocument()
  })

  // ── T4e: form title says "Mint Kudos NFT" ──

  it('renders heading "Mint Kudos NFT"', () => {
    renderForm()

    expect(screen.getByText('Mint Kudos NFT')).toBeInTheDocument()
  })

  // ── T4f: renders category picker with all categories ──

  it('renders category picker with all recognition categories', () => {
    renderForm()

    const categories = [
      'Innovation', 'Leadership', 'Teamwork', 'Excellence',
      'Mentorship', 'Impact', 'Creativity', 'Reliability',
    ]
    categories.forEach((cat) => {
      expect(screen.getByText(cat)).toBeInTheDocument()
    })
    expect(screen.getByText('Recognition Category')).toBeInTheDocument()
  })

  // ── T5a: shows inline error when value is empty ──

  it('shows inline error when value is empty on submit', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Employee'), {
      target: { value: EMPLOYEES[0].employee },
    })
    // Select a category
    fireEvent.click(screen.getByText('Innovation').closest('button[type="button"]')!)
    // Leave value empty
    fireEvent.change(screen.getByLabelText('Value (ETH)'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /mint kudos/i }))

    await waitFor(() => {
      expect(screen.getByText(/value is required/i)).toBeInTheDocument()
    })
    expect(mockMint).not.toHaveBeenCalled()
  })

  // ── T5b: calls mint with correct achievement ──

  it('calls mint with correct achievement on valid submission', async () => {
    renderForm()
    fillForm({ comments: 'Great work!' })

    fireEvent.click(screen.getByRole('button', { name: /mint kudos/i }))

    await waitFor(() => {
      expect(mockMint).toHaveBeenCalled()
    })

    const callArgs = mockMint.mock.calls[0][0]
    expect(callArgs.employee).toBe(EMPLOYEES[0].employee)
    expect(callArgs.value).toBe('100')
    expect(callArgs.employeeName).toBe('Alice Johnson')
    expect(callArgs.name).toBe('introducing groundbreaking ideas')
    expect(callArgs.category).toBe('Innovation')
  })

  // ── T5c: sends functionName: 'mintKudos' ──

  it('calls useMintNFT with functionName mintKudos', () => {
    renderForm()

    expect(mockUseMintNFT).toHaveBeenCalledWith(COMPANY_ID, 'mintKudos')
  })

  // ── T5d: image upload calls uploadImage and passes CID ──

  it('calls uploadImage when image is provided and passes CID to mint', async () => {
    renderForm()
    fillForm()

    // Simulate file selection
    const file = new File(['dummy'], 'test.png', { type: 'image/png' })
    const imageInput = screen.getByLabelText('Image')
    fireEvent.change(imageInput, { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: /mint kudos/i }))

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith(file)
    })

    await waitFor(() => {
      expect(mockMint).toHaveBeenCalled()
    })

    const callArgs = mockMint.mock.calls[0][0]
    expect(callArgs.imageCid).toBe('QmImageCid123')
  })

  // ── T5e: resets form fields on success ──

  it('resets form fields after success', async () => {
    const { rerender } = render(
      <MinterMintForm companyId={COMPANY_ID} employees={EMPLOYEES} />,
    )

    // Simulate success
    setupMintNFTState({ step: 'success', txHash: TX_HASH })
    rerender(
      <MinterMintForm companyId={COMPANY_ID} employees={EMPLOYEES} />,
    )

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled()
    })
  })

  // ── T6a: disables form during uploading ──

  it('disables all inputs and button during uploading', () => {
    setupMintNFTState({ step: 'uploading' })
    renderForm()

    expect(screen.getByLabelText('Employee')).toBeDisabled()
    expect(screen.getByLabelText('Value (ETH)')).toBeDisabled()
    expect(screen.getByLabelText('Date')).toBeDisabled()
    expect(screen.getByLabelText('Comments')).toBeDisabled()
    expect(screen.getByLabelText('Image')).toBeDisabled()
    expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
  })

  // ── T6b: disables form during confirming ──

  it('disables all inputs and button during confirming', () => {
    setupMintNFTState({ step: 'confirming', txHash: TX_HASH })
    renderForm()

    expect(screen.getByLabelText('Employee')).toBeDisabled()
    expect(screen.getByLabelText('Value (ETH)')).toBeDisabled()
    expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled()
  })

  // ── T6c: shows tx explorer link during confirming ──

  it('shows tx explorer link during confirming', () => {
    setupMintNFTState({ step: 'confirming', txHash: TX_HASH })
    renderForm()

    expect(screen.getByText(/transaction submitted/i)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining(TX_HASH),
    )
  })

  // ── T6d: shows error message on mint failure ──

  it('shows error message with role=alert on mint failure', () => {
    setupMintNFTState({ step: 'error', error: new Error('User rejected') })
    renderForm()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/user rejected/i)).toBeInTheDocument()
  })

  // ── T6e: button text changes: Mint → Uploading → Confirming ──

  it('button text reflects mint step: Mint → Uploading → Confirming', () => {
    // idle
    setupMintNFTState({ step: 'idle' })
    const { rerender } = render(
      <MinterMintForm companyId={COMPANY_ID} employees={EMPLOYEES} />,
    )
    expect(screen.getByRole('button', { name: /mint kudos/i })).toBeInTheDocument()

    // uploading
    setupMintNFTState({ step: 'uploading' })
    rerender(<MinterMintForm companyId={COMPANY_ID} employees={EMPLOYEES} />)
    expect(screen.getByRole('button', { name: /uploading/i })).toBeInTheDocument()

    // confirming
    setupMintNFTState({ step: 'confirming', txHash: TX_HASH })
    rerender(<MinterMintForm companyId={COMPANY_ID} employees={EMPLOYEES} />)
    expect(screen.getByRole('button', { name: /confirming/i })).toBeInTheDocument()
  })
})
