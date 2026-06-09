---
Task ID: 1
Agent: Main Agent
Task: Fix "Transferred" status not showing in All Tools & Requests + remove empty Activity Timeline

Work Log:
- Analyzed root cause: `checkAndCloseToolRequest()` in `tool-transfer-helpers.ts` always set status to `'returned'` regardless of whether items were returned or transferred
- Updated `checkAndCloseToolRequest()` to set `'transferred'` status when all items have `quantityTransferred > 0` and `quantityReturned === 0`
- Updated `decrementToolRequestTransfer()` to also handle `'transferred'` status and reopen prematurely closed requests (set back to `'issued'`) when transfers are rejected/cancelled
- Updated "All Tools & Requests" modal to show descriptive labels: "🔄 Transferred out" / "↩️ Returned" instead of generic "✓ Done"
- Removed empty Activity Timeline section from WO details page (statusHistory is only populated during WO completion flow, so always empty for in-progress WOs)
- The badge styling for `'transferred'` status (teal color) was already present in the modal — it just never triggered because the backend never set that status
- Committed and pushed to GitHub

Stage Summary:
- Files modified: `src/lib/tool-transfer-helpers.ts`, `src/components/modules/MaintenancePages.tsx`
- Key fix: `checkAndCloseToolRequest` now distinguishes between transfer-only and return-only completion
- Key fix: `decrementToolRequestTransfer` now handles `'transferred'` status and reopens prematurely closed requests
- Removed: Activity Timeline section (always empty, not useful)
- Deploy needed: VPS pull + build + restart

---
Task ID: 2
Agent: Main Agent
Task: Fix "Transferred: 1" not showing for transferred tool in All Tools & Requests

Work Log:
- Traced full Transfer Tool flow: select value was `${tr.id}__${item.id}` (request+item ID), NOT the actual Tool DB ID
- The transfer API does `db.tool.findUnique({ where: { id: toolId } })` which always fails with the composite ID
- Even when transfers succeeded from other pages, `incrementToolRequestTransfer` could not find matching items when `item.toolId` was null
- Rewrote tool-transfer-helpers.ts with 2-phase matching: exact toolId first, then fallback by toolName/toolCode
- Fixed Transfer Tool select to use `item.tool?.id` as value (actual Tool DB ID)
- Created sync endpoint POST /api/repairs/tool-transfers/sync-quantities to repair existing data
- Added background auto-sync on WO detail load that re-fetches if records were repaired

Stage Summary:
- Files modified: tool-transfer-helpers.ts (rewritten), MaintenancePages.tsx (Transfer Tool + auto-sync), new sync-quantities route
- Key fix: Transfer Tool now sends real Tool ID, backend matches by name/code as fallback
- Auto-repair: When user opens WO detail, sync endpoint fixes any mismatched quantityTransferred
