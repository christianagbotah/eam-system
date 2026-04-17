# Escalation Timer System — Work Record

## Summary
Built a comprehensive escalation timer system for the EAM application that automatically escalates overdue maintenance requests, work orders, and safety incidents.

## Files Created/Modified

### Database Schema (`prisma/schema.prisma`)
- Added `escalationLevel` (Int, default 0) and `lastEscalatedAt` (DateTime?) fields to:
  - `MaintenanceRequest` — tracks escalation state for pending/in-progress MRs
  - `WorkOrder` — tracks escalation state for assigned/in-progress WOs
  - `SafetyIncident` — tracks escalation state for open/investigating incidents
- Created new `EscalationLog` model for audit trail of all escalation events

### API Endpoints

1. **`/api/escalation/config`** (GET/PUT)
   - Reads/writes escalation configuration to `data/escalation-config.json`
   - Requires admin authentication
   - Configurable thresholds per entity type (MR, WO, Safety)
   - Cooldown periods to prevent notification spam
   - Tracks lastCheckAt and lastCheckResults

2. **`/api/escalation/check`** (POST)
   - Main escalation engine, callable by cron or manually
   - Auth: session (admin) OR `x-escalation-secret` header
   - **MR Logic**: Finds pending/in_progress MRs older than threshold → notifies supervisor (L1), then manager (L2 after 48h)
   - **WO Logic**: Finds assigned/in_progress WOs past plannedEnd → notifies technician+supervisor (L1), then manager (L2 after 48h overdue)
   - **Safety Logic**: Finds open/investigating incidents older than 4h → notifies officer+manager (L1), then plant manager (L2 after 8h)
   - Uses cooldown concept via `lastEscalatedAt` to be idempotent
   - Creates `EscalationLog` entries for each escalation
   - Sends notifications via existing `notifyUser` system
   - Returns detailed summary

3. **`/api/escalation/summary`** (GET)
   - Returns counts of currently overdue items by type
   - Includes recent escalation log history (last 20)
   - Shows total escalation counts by entity type
   - Requires admin authentication

### UI Component (`SettingsPages.tsx`)
- Added `EscalationSettingsCard` component on General Settings page
- Features:
  - Master enable/disable toggle
  - Per-entity-type enable toggle
  - Level 1 and Level 2 threshold inputs (hours)
  - Cooldown period inputs (minutes)
  - Last check summary with escalation counts
  - "Run Escalation Check Now" button for manual triggering
  - Color-coded safety section (red border) for visual emphasis

### Configuration File
- Created `data/escalation-config.json` with sensible defaults

## Design Decisions
- **Idempotency**: Each escalation checks `lastEscalatedAt` + cooldown before re-notifying
- **Two-level escalation**: Level 1 notifies immediate contacts; Level 2 escalates to management
- **Config-driven thresholds**: All timing is configurable without code changes
- **JSON file storage**: Config stored in `data/` for simplicity, no DB migration needed
- **Cron-compatible**: POST endpoint accepts secret header for external scheduler integration
