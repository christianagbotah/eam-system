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
