# Task ID: 3 — Multi-Tool Requests with Quantity Tracking

## Agent: full-stack-developer

## Files Modified

### 1. `/src/app/api/repairs/tool-requests/route.ts`
**GET endpoint updates:**
- Added `items` include with nested tool data (id, toolCode, name, status, category, condition, quantity)
- Added backward compatibility: for old requests with no items, creates `_virtualItem` from flat fields (toolId, toolName, quantityRequested: 1, quantityIssued, quantityReturned based on status)

**POST endpoint updates:**
- Added `generateRequestNumber()` helper — produces sequential `TR-YYYYMM-NNNN` format
- Accepts `items` array in request body with `[{ toolId?, toolName, toolCode?, category?, quantityRequested }]`
- Validates at least 1 item exists
- Checks tool availability and stock for each item
- Creates header + all line items in a single Prisma transaction
- Sets availability status per item (available/limited/unavailable)
- Sets `toolName` on header to first item's name

### 2. `/src/app/api/repairs/tool-requests/[id]/route.ts`
**GET endpoint:** Added `items` include with tool data + `_virtualItem` backward compat

**POST workflow actions:**
- `supervisor_approve`: Sets `quantityApproved` on each item (min of requested vs available stock). Adds warnings for limited stock.
- `storekeeper_approve`: Re-checks each item's tool availability at approval time. Sets `availabilityStatus` on each item.
- `issue`: Now accepts `issuedItems` array: `[{ itemId, quantityIssued, issueNotes? }]`. For each item: deducts from Tool.quantity, creates ToolTransaction, tracks partial issues via issueNotes, sets availabilityStatus and conditionAtIssue.
- `return`: Now accepts `returnedItems` array: `[{ itemId, quantityReturned, conditionAtReturn }]`. For each item: adds back to Tool.quantity, creates ToolTransaction, tracks condition.
- All legacy single-tool paths preserved for backward compatibility.

**PUT endpoint:** Now accepts `items` array to update line items (delete+recreate pattern). Validates items, checks availability, returns warnings. Falls back to header-only update if no items provided.

### 3. `/src/components/modules/RepairsPages.tsx`
**Complete rebuild of `RepairToolRequestsPage` component (~1000 lines):**

**Type:**
- Added `ToolItemRow` type for form state

**State:**
- Added `issueOpen` / `issueForm` for Issue Tools dialog
- Added `returnItemsOpen` / `returnItemsForm` for Return Tools dialog
- Changed `createForm` to multi-tool: `{ workOrderId, reason, notes, urgency, items: ToolItemRow[] }`
- Changed `editForm` similarly

**Helper functions:**
- `getRequestItems(r)` — handles virtual items for old data
- `getToolNamesSummary(r)` — "3 tools: Wrench, Drill, +1 more"
- `getFulfillmentRatio(r)` — issued/requested for progress bar
- `AvailabilityBadge` — green/yellow/red badge component
- `ToolItemRowEditor` — reusable editor row with AsyncSearchableSelect, qty input, stock indicator, remove button

**CREATE FORM (ResponsiveDialog):**
- Work Order selector (AsyncSearchableSelect)
- Dynamic tool items list: search/select tools, set qty, see stock badge
- "Add Another Tool" button
- Urgency selector, Reason, Notes

**LIST VIEW (Table):**
- Request Number column (e.g. TR-202606-0001)
- Tools column (count + name summary)
- Total Qty column
- Fulfillment column (progress bar + ratio)
- Status + Urgency, Age
- Actions via dropdown menu (Approve, Reject, Issue, Return, Edit, Delete)

**DETAIL SHEET (Side Sheet, wider sm:max-w-xl):**
- Header: Request Number badge + Status + Urgency
- Tool Items Card: each item shows name/code, qty (Requested/Approved/Issued/Returned), availability badge, issue notes, conditions
- Request info: Requested By, Created date, Reason, Notes, Rejection Reason
- Workflow Action buttons (conditional on status + role)
- Edit/Delete buttons for owner

**ISSUE TOOLS DIALOG:**
- For each item: tool name, requested/approved/in-stock qty
- Input for quantity to issue (capped by approved qty and stock)
- Notes field for partial issue reasons
- Partial issue warning

**RETURN TOOLS DIALOG:**
- For each item: tool name, issued qty
- Input for quantity to return
- Condition selector dropdown (New/Good/Fair/Poor/Damaged)

**EDIT FORM:**
- Same tool items editor as create form
- Pre-filled from existing request items
- Reason, Notes, Urgency editable

## Backward Compatibility
- Old single-tool requests (no items) work with `_virtualItem` for display
- Legacy `issue` and `return` actions still work for single-tool requests
- `PUT` falls back to header-only update if no `items` array provided
- All existing role checks and notification patterns preserved
