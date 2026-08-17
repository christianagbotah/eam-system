# Task 11 — Align UAT seed with current Repairs model requirements

## Files Modified

### 1. `scripts/seed-repairs-uat.ts`
- Added 4 plant-limited users to UAT_USERS array:
  - `uat_supervisor_plant_a` (maintenance_supervisor, PLANT-A only)
  - `uat_planner_plant_a` (planner, PLANT-A only)
  - `uat_supervisor_plant_b` (maintenance_supervisor, PLANT-B only)
  - `uat_planner_plant_b` (planner, PLANT-B only)
- Added section 9: Labor rate for uat_tech_single (50 GHS/hr normal, 75 OT)
- Added section 10: 3 inventory materials (Bearing 6205, Seal Kit, Lubricant 5W-30)
- Added section 11: 3 tools with calibration data (valid, expired, failed)
- Updated header comment (9 → 13 users)
- Extended summary output

### 2. `e2e/repairs/helpers/api.ts`
- Added 4 entries to USERS map: supervisor_plant_a, planner_plant_a, supervisor_plant_b, planner_plant_b

## Prisma Models Used
- **Tool**: toolCode (unique), name, category, condition, status, location, plantId, createdById
- **ToolCalibrationRequirement**: toolId (unique), calibrationRequired, calibrationStatus, nextCalibrationDue, calibrationIntervalDays
- **LaborRate**: userId, plantId, tradeId, normalHourlyRate, overtimeHourlyRate, effectiveFrom, currency (no unique constraint beyond id — used findFirst+create)
- **InventoryItem**: itemCode (unique), name, category, unitOfMeasure, currentStock, plantId, createdById, specification, imageUrls

## Verification
- `bun run lint`: 0 errors (34 pre-existing warnings)
- Dev server compiles cleanly
