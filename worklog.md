---
Task ID: 1
Agent: Main Agent
Task: Fix socket.io 404 on port 3004 and Machine Availability page error

Work Log:
- Investigated socket.io 404: notification-service mini-service on port 3004 not running on VPS
- Rewrote useWebSocket hook to perform pre-flight health check against port 3005 /health endpoint before connecting
- Fixed health check URL from `/?XTransformPort=3005/health` to `/health?XTransformPort=3005` (correct Caddy gateway format)
- When service is unavailable, hook retries every 30s instead of spamming 404 polling requests
- Set primary transport to 'websocket' with 'polling' as fallback, disabled upgrade to reduce noise

- Investigated Machine Availability "failed to load machines" error
- Discovered root cause: MachineAvailabilityPage.tsx used bare `fetch()` without Authorization header
- The Next.js middleware (src/proxy.ts) blocks ALL /api/* requests without Bearer token → returns 401
- The frontend received 401 response, saw `success: false`, showed error toast
- Fixed by replacing bare `fetch()` with `api.get()` from the shared API client which auto-injects auth headers
- Also added console.error logging for better debugging on VPS
- Improved error toast to show actual error details

- Also identified 20 other bare fetch() calls across 4 files (HistorianPages, ObservabilityPages, ConnectivityPages, MaintenancePages) that have the same auth issue — not yet fixed

Stage Summary:
- Files changed: src/hooks/useWebSocket.ts, src/components/modules/MachineAvailabilityPage.tsx
- Root causes identified and fixed for both reported issues
- Both files pass ESLint cleanly

---
Task ID: 1-a
Agent: Explore Agent
Task: Investigate machine list, asset hierarchy, repairs WO creation, and repair reports

Work Log:
- Investigated AssetsPage (machine list/asset register) - calls GET /api/assets with no filters, shows ALL assets including sub-components
- Investigated AssetHierarchyPage - loads ALL assets, separates roots (parentId=null) from children to build tree view
- Investigated Asset model in prisma/schema.prisma - hierarchy is purely via parentId field (self-referencing "AssetHierarchy" relation), no assetLevel or assetType field
- Investigated ComponentRegistry model - separate entity linked to Assets via assetId, has own hierarchy (parentId), componentType field, lifecycle tracking
- Investigated WorkOrder model - links to assetId/assetName but NOT to ComponentRegistry entries
- Investigated RepairsPages.tsx - contains 6 sub-pages: Material Requests, Tool Requests, Tool Transfers, Downtime, Completion, Analytics. None link WOs to ComponentRegistry
- Investigated MR→WO conversion flow in MaintenancePages.tsx - asset selected via AsyncSearchableSelect from /api/assets (all assets), converts to WO with assetId but does NOT copy assetName
- Investigated WOReportsPage.tsx - shows type/status/trade/priority distribution, downtime by trade, response time by priority, breakdowns by trade, man-hours by technician, materials cost, failure rate, stoppages, cost by trade. NO "machine name + parts worked on" report
- Investigated EnterpriseReports.tsx - shows top 10 assets by downtime (from /api/reports/maintenance), cost by asset (from /api/reports/enterprise). NO parts/components detail per repair
- Investigated RepairAnalyticsPage in RepairsPages.tsx - shows KPIs, material requests, tool requests, downtime, rework analysis, reconciliation report, enterprise report, downtime report, repeat failures. NO per-component repair data
- Investigated /api/assets route - supports status, condition, criticality, categoryId, plantId, departmentId, search filters. Does NOT support parentId filtering or top-level-only filter
- Investigated /api/repairs/reports route - supports lifecycle, execution, materials, tools, downtime, technician_performance report types. Returns WO-level data only, no component-level breakdown

Key Findings:
1. Asset list shows ALL assets (no parent/top-level filter)
2. Machine vs Component is purely parentId-based (null = machine/top-level)
3. Repair WOs link to machines only (assetId), NOT to individual parts/components
4. No report shows "machine name + which parts were worked on"
5. ComponentRegistry exists but is completely disconnected from the repair workflow

Stage Summary:
- No code changes made (research only)
- Identified key architectural gap: repair WOs don't track individual parts/components worked on
- Asset API needs parentId=null filter support for top-level asset queries
