---
Task ID: ARCH-Phase1
Agent: Enterprise Architect
Task: Phase 1 — Enterprise Architecture Refactor

Work Log:
- Created src/lib/errors.ts — enterprise error classes (AppError, NotFound, Validation, Unauthorized, Forbidden, Conflict, RateLimit) with handleApiError global handler
- Created src/lib/logger.ts — structured logging with levels (debug/info/warn/error/fatal), context, and performance timer
- Created src/lib/middleware.ts — centralized API middleware: requireAuth, requirePermission, rateLimit (in-memory per-user), parsePagination, parseSearch, paginatedResponse
- Created src/lib/validation.ts — requireFields, validateEnum, validateRange, sanitizeString, parseJsonSafe
- Created src/repositories/BaseRepository.ts — generic repository pattern with CRUD, pagination (findManyPaginated), exists, count, transaction support
- Created src/services/digitalTwin.service.ts — business logic extracted from API routes: listTwins, getTwinById, createTwin, deleteTwin, createScene, getSceneById, getComponentTree, computeHealthScore with recommendation engine
- Created src/services/reliability.service.ts — Weibull analysis (median rank regression with Lanczos gamma approx), asset risk matrix (weighted health/criticality/activity scoring), MTBF/MTTR computation
- Created src/services/telemetry.service.ts — in-memory ingestion buffer with auto-flush (5s interval), MQTT/OPC-UA configuration placeholders, recent readings query, time-bucket aggregation
- Created src/app/api/v1/digital-twins/route.ts — example v1 route using new architecture (requirePermission, handleApiError, requireFields, digitalTwinService)

Key Decisions:
- Used synchronous getSession() from auth.ts (matches existing pattern)
- Adapted telemetry service to match actual IotReading schema (no parameterKey/quality fields)
- Fixed reliability service assetRiskMatrix to use groupBy for work orders (no direct relation on Asset model)
- Removed sortOrder from ComponentRegistry orderBy (type generation issue with Prisma)
- Used Lanczos approximation for gamma function in Weibull analysis
- Asset model doesn't have workOrders relation; used separate groupBy queries

Stage Summary:
- 9 new infrastructure files created
- Service layer pattern established (separates business logic from API routes)
- Repository pattern for type-safe DB access
- Centralized error handling with structured JSON responses
- Structured logging with performance timing
- API v1 versioning foundation
- Reliability engineering services (Weibull analysis, risk matrix, MTBF/MTTR)
- Telemetry ingestion buffer with auto-flush to database
- MQTT/OPC-UA configuration placeholders for future IoT integration
- All new files pass TypeScript type checking with zero errors
- All new files pass ESLint with zero errors
