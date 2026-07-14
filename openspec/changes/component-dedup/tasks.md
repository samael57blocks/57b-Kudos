# Tasks: Component Deduplication (component-dedup)

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

| Field | Value |
|-------|-------|
| Estimated changed lines | ~340 (230 added + 110 removed) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Bugfixes + new modules + tests | Single PR | All tests/docs included |
| 2 | Consumer component import updates | Same PR | Depends on Unit 1 being on disk |

---

## Phase 1: Bug Fixes (standalone)

- [x] 1.1 Add `@keyframes pulse` to `web-app/src/index.css` — ~8 lines after line 111
- [x] 1.2 Fix `VITE_IPFS_GATEWAY` → `VITE_PINATA_GATEWAY` in `NFTTable.tsx` — replace local `buildGatewayURL` usage

## Phase 2: New Shared Modules (standalone)

- [x] 2.1 Export `gatewayURL` from `web-app/src/utils/ipfs.ts` — add `export` keyword on line 64
- [x] 2.2 Create `web-app/src/utils/format.ts` — `formatAddress()` + `buildExplorerTxUrl()`
- [x] 2.3 Create `web-app/src/styles/tokens.ts` — `skeletonStyle` + `labelStyle` + `inputStyle` + `buttonStyle` + `buttonDisabledStyle` + `errorStyle` + `linkStyle`

## Phase 3: Consumer Import Updates (depends on Phase 2)

- [x] 3.1 Update `NFTTable.tsx` — import `formatAddress` from `../utils/format`, `gatewayURL` from `../utils/ipfs`, `skeletonStyle` from `../styles/tokens`; remove local `truncateAddress`, `buildGatewayURL`, `skeletonStyle`
- [x] 3.2 Update `EmployeeList.tsx` — import `formatAddress` + `skeletonStyle`; remove local definitions
- [x] 3.3 Update `CompanyCard.tsx` — import `formatAddress`; remove local definition
- [x] 3.4 Update `ConnectButton.tsx` — import `formatAddress`; remove local `truncateAddress`
- [x] 3.5 Update `NFTGallery.tsx` — keeps local skeletonStyle (card-level); @keyframes pulse dependency satisfied by Phase 1
- [x] 3.6 Update `MintNFTForm.tsx` — import 6 form tokens + `buildExplorerTxUrl`; remove local styles + explorer logic
- [x] 3.7 Update `RegisterCompanyDialog.tsx` — import 6 form tokens + `buildExplorerTxUrl`; remove local styles + explorer logic

## Phase 4: Tests (depends on Phase 2)

- [x] 4.1 Create `web-app/src/utils/__tests__/format.test.ts` — unit tests for `formatAddress` (2 scenarios) + `buildExplorerTxUrl` (3 scenarios)

## Phase 5: Verification

- [x] 5.1 Run `pnpm build` — verify zero NEW type errors (5 pre-existing on develop)
- [x] 5.2 Run `pnpm test` — verify all 199 tests pass (32/32 suites)
- [x] 5.3 Verify skeleton animations render visually (optional)

---

## Dependency Graph

```
Phase 1 (bugfixes) ──────┐
                          ├── no deps on each other
Phase 2 (shared modules) ─┤
  2.1 ipfs.ts export      │
  2.2 format.ts           │
  2.3 tokens.ts           │
                          │
Phase 3 (consumers) ──────┤── depends on Phase 2
  3.1-3.7                 │
                          │
Phase 4 (tests) ───────────── depends on 2.2 (format.ts)
                          │
Phase 5 (verification) ────── depends on all above
```

## Critical Path

`2.2 (format.ts)` → `4.1 (tests)` and `3.1-3.7 (consumers)` → `5.1 (build)` → `5.2 (test)`

No blockers. All phases are shallow. Longest chain: 3 steps.

## Commit Grouping (recommended)

| Commit | Tasks | Message |
|--------|-------|---------|
| 1 | 1.1, 1.2 | `fix(web-app): add @keyframes pulse and fix VITE_IPFS_GATEWAY env var` |
| 2 | 2.1, 2.2, 2.3 | `refactor(web-app): extract formatAddress, buildExplorerTxUrl, and style tokens to shared modules` |
| 3 | 3.1-3.7 | `refactor(web-app): update 7 components to import from shared modules` |
| 4 | 4.1 | `test(web-app): add unit tests for format.ts` |
| 5 | 5.1, 5.2 | `chore(web-app): verify build and tests pass` |

Total: 5 commits, single PR, ~340 changed lines.
