# Task 6-7: Expand Readiness Rules & Complete Technician Eligibility

## Files Modified
- `src/services/workOrderReadiness.service.ts` — Expanded with 6 new rules, refactored warnings channel
- `src/services/technicianEligibility.service.ts` — Expanded with 2 new checks

## Changes Summary

### Step 6 — Readiness Service
New rules added:
| Gate | Code | Severity | Description |
|------|------|----------|-------------|
| start | REQUIRED_PERMIT_CHECK | warning | safetyNotes mentions permit/LOTO |
| start | TECH_ELIG_* | blocker/warning | Delegates to technicianEligibility service |
| complete | UNRESOLVED_HANDOVER | blocker | Pending shift handovers |
| complete | REQUIRED_FAILURE_CODING | warning | Corrective/predictive WO missing failure description |
| verify | INCOMPLETE_COST_WARNING | warning | No time logs or material costs |
| close | AUTHORITATIVE_COST_UNAVAILABLE | warning | Zero total cost and no time logs |

### Step 7 — Technician Eligibility Service
New checks added:
| Code | Severity | Description |
|------|----------|-------------|
| NO_SKILL_RECORD | warning | User has zero UserSkill records |
| NO_CERTIFICATION | warning | User not certified for WO's required trade |

### Key Design Decisions
- Eligibility results merged into readiness with `TECH_ELIG_` prefix to avoid code collisions
- `checkStartReadiness` made async; other check functions remain sync
- All existing rules and public API signatures fully preserved
- `bun run build` passed with zero errors
