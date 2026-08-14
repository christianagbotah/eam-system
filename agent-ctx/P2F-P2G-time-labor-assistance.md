# Task P2F-P2G: Time & Labor Hardening + Assistance Request Workflow

## Changes Made

### P2F-1: Pause Reason Validation (time-logs/route.ts)
- Replaced `VALID_PAUSE_REASONS` list from 4 items to 10 per spec
- Old: `['break', 'switch_wo', 'waiting_parts', 'other']`
- New: `['break', 'waiting_parts', 'waiting_tools', 'waiting_shutdown', 'waiting_permit', 'assistance_required', 'production_unavailable', 'safety_hold', 'shift_end', 'other']`
- Removed `switch_wo` (not in spec), added 7 new standard reasons

### P2F-2: Concurrent Session Prevention (time-logs/route.ts)
- Added same-WO active session check before the existing global WO check
- New query finds active (action=start|resume, endTime=null) time log for user+this WO
- Returns 409 if user already has an active session on this specific WO
- Existing global check (different WO) preserved as-is

### P2F-3: Edit Prohibition After Verification/Closure
- **Finding**: No PUT handler exists for time-logs (only GET, POST, DELETE)
- POST handler (line 232-234) already blocks creating time logs on verified/closed WOs
- DELETE handler (line 492-495) already blocks deleting time logs on verified/closed WOs
- No action needed — both mutation handlers already enforce this

### P2G-4: WoTeamMemberRequest Flow Verification
- ✅ POST creates WoTeamMemberRequest with proper fields (reason, role, requestedTrade, requestedUserId)
- ✅ PUT (approve) creates WorkOrderTeamMember entry with accessLevel='read_only', addedVia='request'
- ✅ Approver permission validates: admin, assign_supervisor, plannerId, or assignedBy
- ✅ Notifications sent: to new team member (wo_team_approved) and to requester (wo_team_request_approved/rejected)
- ℹ️ No `urgency` field exists in WoTeamMemberRequest schema — would require schema migration
- 🐛 **BUG FIXED**: `assignedTo` was not in the POST select, making `isAssignee` check always false

### P2G-5: Team Membership Validation Fix (team-member-requests/route.ts)
- Added `assignedTo: true` to the WO select in POST handler
- The existing team membership check (line 117-127) was correct but `isAssignee` was always false because `assignedTo` wasn't selected
- Now the full validation chain works: team member OR assignee OR admin/planner

## Files Modified
1. `src/app/api/work-orders/[id]/time-logs/route.ts` — VALID_PAUSE_REASONS expanded, same-WO session check added
2. `src/app/api/work-orders/[id]/team-member-requests/route.ts` — `assignedTo` added to WO select

## ESLint Results
- All 3 files pass with zero errors/warnings
