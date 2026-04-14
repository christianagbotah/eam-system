# Task ID: 7-b — Convert Entity Reference Fields to AsyncSearchableSelect

**Status**: Completed

## Changes Made

### File 1: `src/components/modules/ProductionPages.tsx`
1. Added `import { AsyncSearchableSelect } from '@/components/ui/searchable-select'`
2. **ProductionSchedulingPage** (line 364): Replaced non-searchable `<Select>` for Work Center with `<AsyncSearchableSelect>` fetching from `/api/work-centers?limit=999`, labels: `${wc.name} (${wc.code})`
3. **ProductionOrdersPage** (line 878): Replaced non-searchable `<Select>` for Work Center with `<AsyncSearchableSelect>` fetching from `/api/work-centers?limit=999`, labels: `${wc.name} (${wc.code})`
4. **ProductionBatchesPage** (line 992): Replaced non-searchable `<Select>` for Order with `<AsyncSearchableSelect>` fetching from `/api/production-orders?limit=999`, filtered out cancelled orders, labels: `${o.orderNumber} — ${o.title}`

### File 2: `src/components/modules/IoTPages.tsx`
1. Added `import { AsyncSearchableSelect } from '@/components/ui/searchable-select'`
2. **IotRulesPage** (line 706): Replaced non-searchable `<Select>` for Device with `<AsyncSearchableSelect>` fetching from `/api/iot/devices?limit=999`, labels: `${d.name} (${d.deviceCode})`
   - Preserved the `onValueChange` logic that auto-fills the `parameter` field from the selected device using the existing `devices` state for lookup

## Verification
- `bun run lint`: Zero errors, zero warnings
- Dev server returning HTTP 200 consistently
- No other functionality was changed
