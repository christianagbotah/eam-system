# Phase D — Reliability Engineering Platform

## Task ID: phase-d-reliability-engineering
## Agent: Main Developer

## Summary
Implemented the complete Phase D Reliability Engineering Platform for iAssetsPro, including:

### Files Created

#### Schema Additions
- **`prisma/phase-d-additions.prisma`** — 5 new models with full field definitions and index mappings
  - `FailureMode` — Standardized failure mode catalog (RCM codes, ISO 14224 alignment)
  - `RcmAnalysis` — Reliability-centered maintenance analysis records
  - `WeibullAnalysis` — Weibull life data analysis parameter storage
  - `DowntimeAnalysis` — Computed downtime metrics (MTBF/MTTR/availability)
  - `RemainingUsefulLife` — Predictive remaining useful life estimates
  - Includes documented relation additions for existing User, Asset, ComponentRegistry, FailureRecord models

#### Service Layer
- **`src/services/reliabilityEngineering.service.ts`** — Full service with 16 methods:
  - Failure Modes: list (paginated/filters), create, get, update, delete
  - RCM: list, create, get, update, delete
  - Weibull: run analysis (median rank regression), list, get
  - Downtime: compute (MTBF/MTTR/availability/reliability), list
  - RUL: compute (multi-method degradation estimation), get
  - Criticality: asset ranking (5-factor composite scoring)
  - Includes gamma function approximation, Benard's median rank regression
  - Full validation helpers and error handling

#### API Routes (9 route files)
- `/api/reliability/failure-modes/route.ts` — GET (list), POST (create)
- `/api/reliability/failure-modes/[id]/route.ts` — GET, PATCH, DELETE
- `/api/reliability/rcm/route.ts` — GET (list by asset), POST (create)
- `/api/reliability/rcm/[id]/route.ts` — GET, PATCH, DELETE
- `/api/reliability/weibull-engineering/route.ts` — GET (list), POST (run analysis)
- `/api/reliability/weibull-engineering/[id]/route.ts` — GET (single)
- `/api/reliability/downtime/route.ts` — GET (list), POST (compute)
- `/api/reliability/rul/route.ts` — GET, POST (compute)
- `/api/reliability/criticality/route.ts` — GET (plant ranking)
- All routes follow existing auth/error patterns with `getSession`, `hasPermission`, `handleApiError`

#### Frontend
- **`src/components/modules/ReliabilityEngineeringPage.tsx`** — Full React page with 6 tabs:
  1. **Overview** — Summary cards, quick navigation, criticality ranking table
  2. **Failure Modes** — Searchable/filterable catalog, create dialog, detail dialog
  3. **RCM Analysis** — Search by asset, create analysis, status badges
  4. **Weibull** — Run analysis, result cards (β, η, B10, interpretation), detail dialog
  5. **Downtime** — Compute analysis, MTBF/MTTR/availability metrics, history table
  6. **RUL** — Health progress, RUL estimate, confidence score, component details

#### Integration
- Updated `EAMApp.tsx` — Added lazy import and route case for `reliability-engineering`
- Updated `Sidebar.tsx` — Added "Reliability" nav section with ShieldAlert icon

### Design Decisions
- Used `weibull-engineering` route path to avoid conflicts with existing `/api/reliability/weibull` route
- Schema NOT modified (as instructed) — additions in separate `phase-d-additions.prisma`
- All new API routes use relative paths via gateway
- Multi-method RUL estimation (operating hours, failure frequency, condition trends)
- Weibull analysis uses Benard's median rank regression (matching existing reliability service)

### Lint Status
- No new lint errors introduced from Phase D files
- All 1864 existing errors are pre-existing from other modules
