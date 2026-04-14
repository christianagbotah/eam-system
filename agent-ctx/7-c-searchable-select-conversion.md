# Task 7-c: Convert Entity Reference Fields to AsyncSearchableSelect

## Files Modified
1. `src/components/modules/InventoryPages.tsx`
2. `src/components/modules/AssetPages.tsx`

## Changes

### InventoryPages.tsx — 7 conversions

1. **Stock Movement Dialog — Item select** (was line 427-430)
   - Replaced `<Select>` with `<AsyncSearchableSelect>` fetching from `/api/inventory?limit=999`
   - Label: `${it.name} (${it.itemCode})`

2. **Inventory Requests — Item select** (was line 1090)
   - Replaced with `<AsyncSearchableSelect>` fetching from `/api/inventory?limit=999`
   - Filters `isActive !== false` in fetchOptions (same as original `.filter((i: any) => i.isActive)`)

3. **Inventory Transfers — Item select** (was line 1217)
   - Same pattern as requests, fetching from `/api/inventory?limit=999`

4. **Inventory Transfers — From Location** (was line 1220)
   - Replaced with `<AsyncSearchableSelect>` fetching from `/api/inventory/locations?limit=999`
   - Label: `${l.name} (${l.code})`

5. **Inventory Transfers — To Location** (was line 1222)
   - Same pattern as From Location

6. **Purchase Order form — Supplier** (was line 1461)
   - Replaced with `<AsyncSearchableSelect>` fetching from `/api/suppliers?limit=999`
   - Label: `${s.name} (${s.code})`

7. **Receiving form — PO select** (was line 1580)
   - Replaced with sync `<SearchableSelect>` (not async) since purchaseOrders data is already loaded in component state
   - Preserved composite value splitting logic (`v.split('-')`)
   - Added `SearchableSelect` to import

### AssetPages.tsx — 2 conversions

1. **BOM form — Component select** (was line 964)
   - Replaced `<Select>` with `<AsyncSearchableSelect>` fetching from `/api/assets?limit=999`
   - Label: `${a.name} (${a.assetTag})`

2. **Digital Twin form — Asset select** (was line 1300)
   - Same pattern as BOM component

## Import Changes
- `InventoryPages.tsx`: Changed `AsyncSearchableSelect` import to `{ AsyncSearchableSelect, SearchableSelect }`
- `AssetPages.tsx`: Already had both imports, no change needed

## Verification
- `bun run lint` passes with zero errors
