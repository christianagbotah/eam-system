# Task: fix-reliability-assets-inventory

## Summary
Replaced plain text Input fields with AsyncSearchableSelect / SearchableSelect components across 4 module files to improve UX with searchable dropdowns instead of free-text inputs for entity references.

## Changes Made

### FILE 1: `src/components/modules/ReliabilityEngineeringPage.tsx`
- **Added import**: `AsyncSearchableSelect` from `@/components/ui/searchable-select`
- **Added module-level helper**: `fetchAssetOptions` async function that calls `/api/assets?limit=500` and maps to `{ value: id, label: name||assetTag — serialNumber }`
- **Line ~750 (RCM create form)**: Replaced `<Input>` for "Asset ID" with `<AsyncSearchableSelect>`
- **Line ~1133 (Compute Analysis form)**: Replaced `<Input>` for "Asset ID" with `<AsyncSearchableSelect>`

### FILE 2: `src/components/modules/AssetPages.tsx`
- **Already had** `AsyncSearchableSelect`, `SearchableSelect`, `api`, and `useCallback` imports
- **Added `fetchAssetOptions` callback** inside `AssetsConditionMonitoringPage()` using `api.get('/api/assets?limit=500')`, mapping to `{ value: id, label: name||assetTag }`
- **Line ~1153 (Condition Monitoring create form)**: Replaced `<Input placeholder="e.g. Main Compressor A">` for "Asset" with `<AsyncSearchableSelect>`
- **Kept as text**: Location field (~line 279) and Part Number field (~line 980) — these are genuinely free-text

### FILE 3: `src/components/modules/InventoryPages.tsx`
- **Already had** `AsyncSearchableSelect`, `api`, and `useCallback` imports
- **Added two callbacks** inside `InventoryAdjustmentsPage()`:
  - `fetchItemOptions`: fetches from `/api/inventory?limit=500`, maps to `{ value: id, label: name (itemCode) }`
  - `fetchLocationOptions`: fetches from `/api/inventory/locations?limit=100`, maps to `{ value: id, label: name||code }`
- **Lines ~986-987 (Inventory Adjustment form)**: Replaced both "Item *" and "Location *" `<Input>` fields with `<AsyncSearchableSelect>`

### FILE 4: `src/components/modules/OperationsPages.tsx`
- **Added import**: `SearchableSelect` from `@/components/ui/searchable-select`
- **Added `areaOptions` constant** inside `OperationsShiftHandoverPage()` with 7 static options: Plant A, Plant B, Plant C, Warehouse, Workshop, Office, External
- **Line ~715 (Shift Handover edit form)**: Replaced `<Input placeholder="e.g. Plant A">` for "Area" with `<SearchableSelect>` (static list, no async fetch needed)

## Lint Verification
All 4 edited files pass lint with zero errors. Pre-existing lint errors in other files (MaintenancePages.tsx, create-mariadb-adapter.js, etc.) are unrelated.
