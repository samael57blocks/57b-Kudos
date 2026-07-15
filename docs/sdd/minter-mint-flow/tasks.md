# Tasks — minter-mint-flow

## Scope
Parameterize `useMintNFT` for `mintKudos()`, create `MinterMintForm` component with employee dropdown, update `MintNftPage`. TDD: every implementation task is preceded by its test task.

## Dependencies
- Spec: `sdd/minter-mint-flow/spec` (#419)
- Design: `sdd/minter-mint-flow/design` (#420)

---

## Phase 1: `useMintNFT` Parameterization

### T1 — Test: `useMintNFT` functionName parameter
**File:** `web-app/src/hooks/__tests__/useMintNFT.test.ts` (modify existing)
**Type:** test

Add tests inside the existing `describe('useMintNFT')` block:

| # | Test | Assertion |
|---|------|-----------|
| T1a | default functionName calls `recognize` | `writeContractAsync` called with `functionName: 'recognize'` |
| T1b | explicit `'recognize'` calls `recognize` | Same as T1a — backward compat |
| T1c | explicit `'mintKudos'` calls `mintKudos` | `writeContractAsync` called with `functionName: 'mintKudos'` |
| T1d | metadata pipeline unchanged for both functions | `buildMetadata` and `uploadMetadata` called regardless of functionName |

Pattern reference: existing tests at lines 108–156 of `useMintNFT.test.ts`. Use `setupMocks()` + `renderHook(() => useMintNFT(42n, 'mintKudos'))`.

---

### T2 — Implement: `useMintNFT` functionName parameter
**File:** `web-app/src/hooks/useMintNFT.ts` (modify existing)
**Type:** implement

Changes:
1. Update signature: `useMintNFT(companyId: bigint, functionName: 'recognize' | 'mintKudos' = 'recognize')`
2. Add `functionName` to `useCallback` dependency array
3. Replace hardcoded `'recognize'` on line 149 with `functionName` variable

No other changes. The rest of the state machine, metadata pipeline, and toast logic remain identical.

---

### T3 — Verify: `useMintNFT` parameterization
**Command:** `pnpm --filter web-app test -- --run useMintNFT`
**Type:** verify

All T1 tests (T1a–T1d) plus all existing tests must pass. Zero regressions.

---

## Phase 2: `MinterMintForm` Component

### T4 — Test: `MinterMintForm` rendering & employee dropdown
**File:** `web-app/src/components/__tests__/MinterMintForm.test.tsx` (create new)
**Type:** test

Mock setup (same pattern as `MintNFTForm.test.tsx` lines 6–38):
- `vi.hoisted` mocks for: `useMintNFT`, `usePublicClient`, `uploadImage`, `getContractAddresses`
- `vi.mock` for: `../../hooks/useMintNFT`, `wagmi`, `../../utils/ipfs`, `../../config/contracts`
- Fixture: `COMPANY_ID = 42n`, `EMPLOYEES = [{ employee: '0x1111...', name: 'Alice', registrationDate: '2024-01-01' }, { employee: '0x2222...', name: 'Bob', registrationDate: '2024-02-01' }]`
- Helper: `renderForm()` → `render(<MinterMintForm companyId={COMPANY_ID} employees={EMPLOYEES} />)`

| # | Test | Assertion |
|---|------|-----------|
| T4a | renders employee dropdown with names | `<option>` elements show `Alice`, `Bob` (not raw addresses) |
| T4b | shows "Select an employee..." placeholder | Default `<option>` with placeholder text |
| T4c | renders value, date, comments, image fields | `getByLabelText` for each: "Value (ETH)", "Date", "Comments", "Image" |
| T4d | renders submit button with initial label | Button text is "Mint Kudos" |
| T4e | form title says "Mint Kudos NFT" | Heading rendered |

---

### T5 — Test: `MinterMintForm` validation & submission
**File:** `web-app/src/components/__tests__/MinterMintForm.test.tsx` (append)
**Type:** test

| # | Test | Assertion |
|---|------|-----------|
| T5a | shows inline error when value is empty/non-numeric | Error text visible, `mint` not called |
| T5b | calls mint with correct achievement on valid submission | `mint` called with employee address from dropdown, value, date, comments, name |
| T5c | sends `functionName: 'mintKudos'` to useMintNFT | Hook called with `(companyId, 'mintKudos')` |
| T5d | image upload calls uploadImage and passes CID to mint | `uploadImage` called with file, `imageCid` in mint args |
| T5e | resets form fields on success | All fields cleared after step transitions to success |

---

### T6 — Test: `MinterMintForm` UI states
**File:** `web-app/src/components/__tests__/MinterMintForm.test.tsx` (append)
**Type:** test

| # | Test | Assertion |
|---|------|-----------|
| T6a | disables form during uploading step | All inputs + button disabled |
| T6b | disables form during confirming step | All inputs + button disabled |
| T6c | shows tx explorer link during confirming | Link with txHash in href |
| T6d | shows error message on mint failure | Error text with `role="alert"` |
| T6e | button text changes: Mint → Uploading → Confirming | Button label reflects current step |

---

### T7 — Implement: `MinterMintForm.module.css`
**File:** `web-app/src/components/MinterMintForm.module.css` (create new)
**Type:** implement

Copy styles from `MintNFTForm.module.css` — same design tokens, same class names (`.form`, `.label`, `.input`, `.textarea`, `.button`, `.buttonDisabled`, `.error`, `.link`, `.title`, `.success`, `.uploading`). No deviations.

---

### T8 — Implement: `MinterMintForm` component
**File:** `web-app/src/components/MinterMintForm.tsx` (create new)
**Type:** implement

Props:
```ts
interface MinterMintFormProps {
  companyId: bigint
  employees: EmployeeData[]
}
```

Implementation approach (based on `MintNFTForm.tsx` patterns):
1. Import `useMintNFT(companyId, 'mintKudos')` — passes `functionName` explicitly
2. Employee field: `<select>` dropdown iterating `employees`, displaying `emp.name` as option text, `emp.employee` as value
3. Form fields: value (text), date (date input), comments (textarea), image (file input)
4. On submit: validate value is numeric, upload image if provided, construct employeeName from `emp.name`, call `mint({ employee, name: 'Employee Recognition', description, value, date, employeeName, imageCid })`
5. Status: explorer link during confirming, error with `role="alert"`, success message
6. Button labels: "Mint Kudos" → "Uploading…" → "Confirming…"

Key difference from `MintNFTForm`: employee is a dropdown (not text input), uses `emp.name` directly for employeeName instead of truncating address.

---

### T9 — Verify: `MinterMintForm` tests
**Command:** `pnpm --filter web-app test -- --run MinterMintForm`
**Type:** verify

All T4, T5, T6 tests pass. No regressions in other test files.

---

## Phase 3: `MintNftPage` Integration

### T10 — Test: `MintNftPage` updated for `MinterMintForm`
**File:** `web-app/src/views/__tests__/MintNftPage.test.tsx` (modify existing)
**Type:** test

Update existing mocks (lines 14–43): add mock for `MinterMintForm` to render a test-friendly stub.

| # | Test | Assertion |
|---|------|-----------|
| T10a | renders MinterMintForm (no raw URI input) | No "Metadata URI" label present; MinterMintForm rendered |
| T10b | passes employees to MinterMintForm | Stub receives employees prop |
| T10c | shows loading while employees fetch | "Loading employees..." text visible |
| T10d | shows connect prompt when disconnected | "Connect your wallet" text (existing test, keep) |

Remove/update existing tests that assert on the raw URI form (lines 95–141, 143–182, 196–211) since those elements no longer exist.

---

### T11 — Implement: `MintNftPage` integration
**File:** `web-app/src/views/MintNftPage.tsx` (modify existing)
**Type:** implement

Changes:
1. Remove `useState` for `selectedEmployee`, `uri`, `txHash`, `txError` (lines 20–23)
2. Remove `useWriteContract`, `useWaitForTransactionReceipt`, `COMPANY_REGISTRY_ABI` imports (no longer needed)
3. Remove inline `handleSubmit` function (lines 30–48)
4. Remove inline form JSX (lines 87–124)
5. Import `MinterMintForm` from `../components/MinterMintForm`
6. Render `<MinterMintForm companyId={companyId} employees={employees} />` in place of the form
7. Keep: Layout wrapper, not-connected guard, loading state, success/error messages from `MinterMintForm`

Simplified structure:
```tsx
<Layout>
  {!isConnected ? ( <connect prompt/> ) : (
    <div className={styles.container}>
      <h1>...</h1>
      <p>...</p>
      {isLoading ? <loading/> : <MinterMintForm companyId={companyId} employees={employees}/>}
    </div>
  )}
</Layout>
```

---

### T12 — Verify: `MintNftPage` tests
**Command:** `pnpm --filter web-app test -- --run MintNftPage`
**Type:** verify

All T10 tests pass. Existing tests in other files unaffected.

---

## Phase 4: Full Regression

### T13 — Verify: full test suite
**Command:** `pnpm --filter web-app test -- --run`
**Type:** verify

Every test file passes. Zero regressions across the entire web-app test suite.

---

### T14 — Verify: typecheck
**Command:** `pnpm --filter web-app typecheck` (or `tsc --noEmit`)
**Type:** verify

Zero TypeScript errors. All new types resolve correctly.

---

## Task Summary

| # | Type | Task | File |
|---|------|------|------|
| T1 | test | useMintNFT functionName parameter tests | `hooks/__tests__/useMintNFT.test.ts` |
| T2 | implement | useMintNFT functionName parameter | `hooks/useMintNFT.ts` |
| T3 | verify | useMintNFT parameterization tests pass | — |
| T4 | test | MinterMintForm rendering & dropdown tests | `components/__tests__/MinterMintForm.test.tsx` |
| T5 | test | MinterMintForm validation & submission tests | `components/__tests__/MinterMintForm.test.tsx` |
| T6 | test | MinterMintForm UI state tests | `components/__tests__/MinterMintForm.test.tsx` |
| T7 | implement | MinterMintForm.module.css styles | `components/MinterMintForm.module.css` |
| T8 | implement | MinterMintForm component | `components/MinterMintForm.tsx` |
| T9 | verify | MinterMintForm tests pass | — |
| T10 | test | MintNftPage updated tests | `views/__tests__/MintNftPage.test.tsx` |
| T11 | implement | MintNftPage integration | `views/MintNftPage.tsx` |
| T12 | verify | MintNftPage tests pass | — |
| T13 | verify | Full test suite regression | — |
| T14 | verify | TypeScript typecheck | — |
