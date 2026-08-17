# Repairs/RWOP UAT Defect Register

Generated during RC1 Hard UAT Gate.

## Defects Found and Fixed During This Gate

| ID | Title | Severity | Status | Root Cause | Fix |
|----|-------|----------|--------|------------|-----|
| REP-UAT-001 | 152 false-positive assertions in Playwright suite | BLOCKER | FIXED | Tests written with soft-pass patterns (\|\| true, .catch(() => false), waitForTimeout) | Complete rewrite of all 10 scenarios + helpers with fail-fast API-based assertions |
| REP-UAT-002 | Missing /api/work-orders/[id]/handover endpoint | MAJOR | FIXED | Service function existed but no HTTP route | Created route.ts delegating to initiateHandover/resumeAfterHandover |
| REP-UAT-003 | Missing /api/work-orders/[id]/rework endpoint | MAJOR | FIXED | Service function existed but no HTTP route | Created route.ts delegating to requestRework |
| REP-UAT-004 | No plant scope on 5 WO mutation routes | MAJOR | FIXED (prior gate) | Routes accepted cross-plant requests | Added getPlantScope() checks |
| REP-UAT-005 | Closed WO accepted measurements/attachments | MAJOR | FIXED (prior gate) | No isLocked/status check | Added guards to POST endpoints |
| REP-UAT-006 | Labor cost always 0 | BLOCKER | FIXED (prior gate) | No LaborRate model | Implemented LaborRate + lookup hierarchy |
| REP-UAT-007 | Offline sync handlers lacked closed WO check | MAJOR | FIXED (prior gate) | 5 sync handlers modified without immutability guard | Added isLocked/status checks |

## Open Defects

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| REP-UAT-008 | No ToolCalibrationRequirement creation API for E2E seeding | MINOR | OPEN | Tool calibration tests need seeded calibration data; no API to create it programmatically. Workaround: seed script or direct DB insert during test setup. |
| REP-UAT-009 | MaintenancePages.tsx exceeds 500KB Babel threshold | MINOR | OPEN | Non-blocking performance concern; large file causes Babel deoptimization warning. Future refactoring item (GATE 16: do NOT split during RC). |
| REP-UAT-010 | No real MariaDB/Redis in CI sandbox | INFRA | OPEN | Cannot execute real migration or BullMQ tests in current environment. Docker Compose provided for external staging validation. |

## Defect Triage

- BLOCKER: 0 open (2 found, 2 fixed)
- MAJOR: 0 open (5 found, 5 fixed)
- MINOR: 2 open (non-blocking)
- INFRA: 1 open (environmental)
