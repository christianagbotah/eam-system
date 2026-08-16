# Step 12 — Playwright UAT Suite

## Files Created

### Seed Script
- `scripts/seed-repairs-uat.ts` — Idempotent Prisma seed for all UAT test data

### Playwright Config
- `playwright-repairs.config.ts` — Separate config for repairs UAT (60s timeout, sequential)

### Auth Helper
- `e2e/repairs/helpers/auth.ts` — `authenticateAs()`, `loginViaUI()`, `switchUser()`, navigation helpers

### Test Scenarios (9 files, 42 test cases)
| File | Scenarios | Tests |
|------|-----------|-------|
| `scenario-a-single-tech.spec.ts` | Full single-tech lifecycle | 10 |
| `scenario-b-multi-tech.spec.ts` | Multi-tech team flow | 6 |
| `scenario-c-supervisor-assignment.spec.ts` | Supervisor delegation | 3 |
| `scenario-d-assistance.spec.ts` | Assistance request | 4 |
| `scenario-e-rework.spec.ts` | Rework flow | 5 |
| `scenario-f-shift-handover.spec.ts` | Shift handover | 4 |
| `scenario-g-resource-blockers.spec.ts` | Resource blockers | 3 |
| `scenario-h-cross-plant-security.spec.ts` | Cross-plant security | 4 |
| `scenario-i-offline-retry.spec.ts` | Offline sync | 3 |

## Notes
- `@playwright/test` v1.60.0 already installed
- No production code changed
- Run with: `npx playwright test --config=playwright-repairs.config.ts`
- Seed with: `DATABASE_URL="mysql://..." npx tsx scripts/seed-repairs-uat.ts`
