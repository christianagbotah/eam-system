# Task K-1: Phase K AI Engine Agent

## Task
Build the Industrial AI & Predictive Intelligence layer for iAssetsPro EAM system.

## Files Created

### Services
1. **`/home/z/my-project/src/services/predictiveEngine.service.ts`**
   - `PredictiveEngine` class with static methods
   - `calculateHealthScore(assetId)` — Weighted composite health score (5 factors)
   - `predictFailure(assetId)` — Failure probability with time horizon
   - `detectAnomalies(sourceId, lookbackHours)` — 3-sigma anomaly detection
   - `optimizeMaintenance(assetId)` — Strategy recommendation
   - `batchHealthAssessment(assetIds)` — Parallel batch processing
   - `getInsightsDashboard(plantId?)` — Dashboard aggregation

2. **`/home/z/my-project/src/services/aiCopilot.service.ts`**
   - `AiCopilotService` class with static methods
   - `troubleshoot(context, query)` — Rule-based troubleshooting (7 categories)
   - `recommendPlan(assetId)` — AI maintenance plan generation
   - `analyzeReliability(assetId)` — Reliability trend analysis

### API Routes
3. **`/home/z/my-project/src/app/api/ai/troubleshoot/route.ts`** — POST
4. **`/home/z/my-project/src/app/api/ai/health/[assetId]/route.ts`** — GET
5. **`/home/z/my-project/src/app/api/ai/predict/[assetId]/route.ts`** — GET
6. **`/home/z/my-project/src/app/api/ai/anomalies/route.ts`** — GET
7. **`/home/z/my-project/src/app/api/ai/insights/route.ts`** — GET

## Schema Adaptations
- `installDate` → `installedDate` (actual Prisma field name on Asset model)
- `assetTypeId` → `categoryId` (Asset uses categoryId, not assetTypeId)
- `telemetrySource` → `telemetryDataSource` (actual Prisma model name)
- `failureRecord` query scoped by `assetId` for accurate per-asset failure history
- `severity` → `failureSeverity` (actual field name on FailureRecord model)

## Dependencies Used
- `@/lib/db` — Prisma client
- `@/lib/logger` — Structured logging
- `@/lib/cache` — In-memory TTL cache
- `@/services/timeSeries.service` — Time-series read/stats
- `@/lib/auth` — Session authentication

## Verification
- ESLint: Zero errors on all new files
- Pre-existing errors (1894) are unrelated to Phase K changes
