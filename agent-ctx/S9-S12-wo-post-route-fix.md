# Task S9/S12: Fix WO POST Route — State Machine, Tool Semantics, Transaction Safety

## Agent: full-stack-developer
## File: `/home/z/my-project/src/app/api/work-orders/route.ts`

## Summary
Fixed four critical issues in the WO POST (create) route:

### Fix 1: Removed direct MR status update (state machine bypass)
**Before (lines 492-501):** The route directly called `db.maintenanceRequest.update()` to set status to `'converted'` — bypassing the state machine entirely (no validation, no history, no role check).

**After:** Replaced with validation-only logic:
- Validates MR exists
- Validates MR is in `'approved'` status (rejects if not)
- Validates MR doesn't already have a WO
- Sets `maintenanceRequestId` on the WO but does NOT change MR status
- Added comment explaining the MR→WO conversion must ONLY happen through the dedicated convert endpoint

### Fix 2: Tool semantics — RepairToolRequest + RepairToolRequestItem
**Before:** Tools created `RepairToolRequest` header records but no line items.

**After:** Each tool now creates:
- `RepairToolRequest` (header) with proper fields: `reason: 'Planned for WO creation'`, `source: 'planner_suggested'`, `status: 'pending'`, `urgency: 'normal'`
- `RepairToolRequestItem` (line item) with: `quantityRequested`, `toolCode`, `category`, `unitCost`, `quantityIssued: 0`

Both new format (object with `toolId`) and legacy format (string ID) are handled.

### Fix 3: Entire POST handler wrapped in transaction
**Before:** All DB operations were individual calls — partial failures would leave orphaned records (WO without team members, materials without WO, etc.).

**After:** All operations inside `db.$transaction(async (tx) => { ... })`:
- WO number generation
- WO creation
- Team member creation
- Material creation (RepairMaterialRequest)
- Tool creation (RepairToolRequest + RepairToolRequestItem)
- Component linking
- Suggested parts/tools JSON update
- Audit log

Imported `Prisma` for `Prisma.TransactionClient` type used in `generateWoNumber()`.

### Fix 4: WO number generation inside transaction
**Before:** `generateWoNumber()` ran outside the transaction with its own `db` call — race condition between concurrent WO creations could produce duplicate WO numbers.

**After:** `generateWoNumber()` accepts `Prisma.TransactionClient` as parameter and runs inside the transaction. The `findFirst` query for the latest WO number is serialized by the transaction, preventing duplicates.

## Preserved
- GET handler completely unchanged (lines 27-162)
- All query parameter handling for GET
- All payload field acceptance for POST
- Response format (`{ success, data }` with status codes)
- Both legacy (string ID) and new (object) formats for parts and tools
- Plant scoping for GET

## Verification
- ESLint passes with no errors
- All automated checks passed:
  - No `maintenanceRequest.update` in the file
  - No `'converted'` status being set
  - MR validation present (exists, approved, no duplicate WO)
  - Transaction wrapper present
  - `repairToolRequestItem.create` present
  - Audit log uses `tx.auditLog.create` (inside transaction)
  - GET handler intact with all query params
