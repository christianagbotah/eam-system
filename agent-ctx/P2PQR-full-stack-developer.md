---
Task ID: P2PQR
Agent: full-stack-developer
Task: Implement P2P (Reliability Feedback), P2Q (Notification Queue), P2R (Audit Context)

Work Log:
- Read worklog (2103 lines) for Phase 1, 2A-O context
- Analyzed complete/route.ts, close/route.ts, notifications.ts, prisma schema

- P2R-1: Created audit-helpers.ts (src/lib/audit-helpers.ts)
  - `extractAuditContext(request, additional?)` — extracts IP (x-forwarded-for/x-real-ip), User-Agent, session cookie
  - `buildAuditData(action, entityType, entityId, userId, oldValues?, newValues?, context?)` — returns complete audit log data object
  - Drop-in replacement for direct db.auditLog.create calls
  - AuditLog schema already supports ipAddress, userAgent, sessionId, plantId, departmentId

- P2R-2: Updated WO complete route (src/app/api/work-orders/[id]/complete/route.ts)
  - Imported extractAuditContext and buildAuditData
  - Replaced 2 direct db.auditLog.create calls with buildAuditData
  - Work order completion audit log now includes IP, User-Agent, session ID
  - PM schedule advancement audit log also uses buildAuditData

- P2Q-1: Created repair-notifications.ts (src/lib/repair-notifications.ts)
  - 16 event types covering full repairs lifecycle: assistance_requested/approved/rejected, tool_approved/ready/issued/overdue, material_approved/issued, completion_submitted, rework_requested, supervisor_verified, planner_closed, wo_started, wo_on_hold, shift_handover_pending
  - `EVENT_TEMPLATES` maps each event to title + message template with {woNumber}, {actorName}, {details} placeholders
  - `sendRepairNotification(payload)` — fire-and-forget with error logging, uses notifyUser with repair_ prefixed type
  - forceSms for rework_requested and tool_overdue events
  - `sendRepairNotificationMulti(userIds, payload)` — broadcast to multiple users

- P2P-1: Created reliability-events.ts (src/lib/reliability-events.ts)
  - `emitReliabilityEvent(event)` — updates/creates FailureRecord when WO is closed
  - Adapted to schema: FailureRecord.componentId is required (not optional) — only creates when componentId available
  - Asset.lastMaintenanceDate does not exist in schema — skipped that update
  - Uses upsert with deterministic ID (`${workOrderId}-reliability`)

- P2P-2: Integrated reliability event into planner closeout (src/app/api/work-orders/[id]/close/route.ts)
  - Added import of emitReliabilityEvent
  - Added failureMode, failureCause, correctiveAction to body destructuring
  - Fires emitReliabilityEvent after successful WO close (fire-and-forget with .catch(() => {}))
  - Passes assetId, downtimeMinutes, totalCost, performedById from WO context

- ESLint: All 5 files pass with zero errors/warnings

Stage Summary:
- Files created: 3 (src/lib/audit-helpers.ts, src/lib/repair-notifications.ts, src/lib/reliability-events.ts)
- Files modified: 2 (src/app/api/work-orders/[id]/complete/route.ts, src/app/api/work-orders/[id]/close/route.ts)
- P2R: Audit context (IP, User-Agent, session) now captured on WO completion and PM schedule advancement
- P2Q: 16 repair lifecycle notification events with templates, fire-and-forget dispatch, multi-user broadcast
- P2P: Reliability event emitter integrated into planner closeout for FailureRecord upsert
- Schema adaptation notes: FailureRecord requires componentId (not optional), Asset lacks lastMaintenanceDate
- ESLint clean on all files
