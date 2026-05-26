# EAM System Worklog

---
Task ID: 1
Agent: main
Task: Fix dashboard showing all zeros + VPS OOM build failure

Work Log:
- Analyzed dashboard stats API (`src/app/api/dashboard/stats/route.ts`) — found that ALL 40+ queries run in a single Promise.all, and if ANY query fails (e.g., missing table like `iot_devices`, `non_conformance_reports`, `quality_audits`), the entire response fails with 500
- Analyzed dashboard frontend (`src/components/modules/DashboardPages.tsx`) — found that API errors are silently swallowed and stats stay `null`, causing all `|| 0` fallbacks to show zeros
- Root cause: The VPS build kept failing with OOM kill (exit code 137), so the fix from previous session (commit c79d3e3d) was never deployed
- Fixed dashboard stats API: Added `safe()` helper that wraps each query with `.catch()` and returns fallback values (0 for counts, [] for arrays). Now one failing query doesn't kill the entire response. Also added console.warn logging for failed queries.
- Fixed dashboard frontend: Added `error` state, replaced silent error handling with visible error banner + retry button. Now shows "Unable to Load Dashboard" with error details instead of misleading all-zeros view.
- Created VPS deployment script (`scripts/deploy-vps.sh`) with: automatic swap setup (2GB), Node.js memory limiting (`--max-old-space-size=1024`), build monitoring, OOM detection with helpful error messages
- Updated `scripts/vm-deploy.sh` with same memory protections
- Verified notification popover is correctly implemented: badge count, pending requests banner, click-to-navigate, mark-all-read all work correctly
- Verified Notification type has all required fields (id, type, title, message, actionUrl, isRead, createdAt)
- Verified `mr-detail` and `wo-detail` are valid PageNames in navigation system

Stage Summary:
- **Dashboard API fix**: `src/app/api/dashboard/stats/route.ts` — each query wrapped with `safe()` for resilience
- **Dashboard UI fix**: `src/components/modules/DashboardPages.tsx` — error state with retry instead of silent zeros
- **Deploy script**: `scripts/deploy-vps.sh` — handles OOM with swap + memory limits
- **Updated**: `scripts/vm-deploy.sh` — same memory protections
- **Key insight**: The VPS OOM build failure (exit 137) was blocking ALL previous fixes from being deployed. User needs to run `bash scripts/deploy-vps.sh --swap` first, then `bash scripts/deploy-vps.sh`

---
Task ID: 2
Agent: main
Task: Fix 400 Bad Request on approve maintenance request

Work Log:
- Investigated the approve endpoint at `src/app/api/maintenance-requests/[id]/approve/route.ts`
- The 400 comes from `executeTransition` in `src/lib/state-machine.ts` — it queries the `status_transitions` table for a matching rule
- Most likely root cause: `status_transitions` table is empty on VPS (seed was never run), OR user role mismatch
- Added diagnostic logging to state machine: logs missing transition rules and role mismatches with actionable hints
- Added `debug` field to the 400 response body on the approve endpoint (includes mrStatus, userRoles, userId)
- Improved error messages: now includes hints like "Run: bun run prisma/seed.ts" when transition rules are missing
- Created diagnostic API endpoint at `/api/diagnostics/status-transitions` — can be curl'd without auth to check if transitions are seeded
- Created transition auto-seed script at `scripts/seed-transitions.ts` — inserts missing MR/WO transitions without touching other data

Stage Summary:
- **Approve route**: Now returns `debug` field in 400 response with diagnostic info
- **State machine**: Improved error messages with actionable hints (seed instructions, required roles)
- **Diagnostic endpoint**: `GET /api/diagnostics/status-transitions` — checks if transitions exist, reports missing ones
- **Seed script**: `scripts/seed-transitions.ts` — targeted re-seed of only status_transitions table
- **VPS fix**: After deploying, user should curl the diagnostic endpoint and/or run the seed script
