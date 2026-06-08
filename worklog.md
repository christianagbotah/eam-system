---
Task ID: 1
Agent: Main Agent
Task: Materials & Tools Workflow — Full Implementation

Work Log:
- Explored existing codebase: Found comprehensive RepairMaterialRequest/RepairToolRequest infrastructure, WorkOrderMaterial legacy table, full approval pipeline
- Identified gaps: WO creation stores parts/tools as legacy WorkOrderMaterial with qty=0, no quantities, no visibility on WO detail
- Updated Prisma schema: Added `suggestedParts` and `suggestedTools` JSON fields to WorkOrder model; Added `source` field to RepairMaterialRequest and RepairToolRequest models
- Pushed schema changes via direct SQLite ALTER TABLE (prisma.config.ts validation issue with SQLite)
- Regenerated Prisma client
- Rewrote WO creation API (`/api/work-orders/route.ts`): Now stores suggested parts/tools as JSON on WO AND creates proper RepairMaterialRequest/RepairToolRequest records with `source: 'planner_suggested'`, supports both legacy (string ID) and new ({itemId, quantity, unit}) formats
- Rewrote WO edit API (`/api/work-orders/[id]/route.ts`): Same pattern for updates, deletes and recreates pending suggested requests
- Created new API route `/api/work-orders/[id]/suggested-items/route.ts`: GET returns merged suggested items with pipeline status; PUT handles actions: reject_item, add_item, update_quantity, send_to_store (notifies storekeepers)
- Enhanced WO creation form (CreateWOForm and ConvertToWOForm): Parts/tools now stored as {itemId/toolId, quantity} objects with inline quantity inputs
- Added "Suggested Materials & Tools" Card to WO Detail page: Shows planner suggestions with pipeline status badges, Send to Store button, reject buttons, add part/tool buttons
- All changes include full audit logging via auditLog

Stage Summary:
- Files modified: prisma/schema.prisma, src/app/api/work-orders/route.ts, src/app/api/work-orders/[id]/route.ts, src/components/modules/MaintenancePages.tsx
- Files created: src/app/api/work-orders/[id]/suggested-items/route.ts
- Workflow: Planner suggests → items stored on WO + RepairRequest created → shows on WO detail → technician can reject/modify/add → "Send to Store" notifies storekeepers → store keeper processes through existing approval pipeline
- All changes audit-logged
