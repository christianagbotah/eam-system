# Task S3 — Refactor state-machine.ts to support transaction clients

## Summary
Refactored `src/lib/state-machine.ts` to accept an optional `Prisma.TransactionClient` parameter in both `checkTransition()` and `executeTransition()`, enabling callers to compose multiple DB operations (e.g., WO creation + MR status transition) in a single atomic transaction.

## Changes Made

### File: `src/lib/state-machine.ts`

1. **Added import**: `import { Prisma } from '@prisma/client';`

2. **`checkTransition()`** — Added 5th optional parameter `tx?: Prisma.TransactionClient`:
   - When `tx` is provided, all `statusTransition.findFirst()` queries use `tx` instead of `db`
   - When omitted, falls back to `db` (fully backward compatible)

3. **`executeTransition()`** — Added `tx?: Prisma.TransactionClient` as an optional field inside the existing `options` parameter:
   - Entity status lookup (step 1) uses `tx ?? db`
   - Passes `tx` through to `checkTransition()` call (step 2)
   - When `tx` is provided: runs update + audit operations directly on `tx` (no new transaction created)
   - When `tx` is omitted: creates its own `db.$transaction()` with `innerTx` (identical to original behavior)
   - Both `work_order` and `maintenance_request` paths support the external `tx`
   - Final `findUnique` to return updated record also uses `tx ?? db`

4. **`getAvailableTransitions()`** — Left unchanged (no transaction support needed for read-only query)

## Backward Compatibility
- All existing callers continue to work without any changes
- Return types are unchanged
- No state transition rules or seeding logic was modified
- All existing comments and documentation preserved

## Lint
- `state-machine.ts` has zero lint errors (verified)
