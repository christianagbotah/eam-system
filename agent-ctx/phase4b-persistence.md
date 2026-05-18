---
Task ID: phase4b
Agent: Phase 4B Implementation
Task: Add persistence and log shipping readiness to the observability stack

Work Log:

### 1. Prisma Schema Enhancements (`prisma/schema.prisma`)
- Added 3 new models under a new "OBSERVABILITY" section at the end of the schema:
  - `ObservabilityLog` — persisted structured log entries with level, service, traceId, correlationId, userId, requestId, durationMs, errorMessage, tags (JSON), metadata (Json), timestamp
  - `ObservabilityTrace` — persisted trace spans with traceId, spanId, parentSpanId, name, serviceName, durationMs, status, attributes (Json), timestamp
  - `ObservabilityMetricSnapshot` — persisted metric point-in-time values with name, type, value, labels (JSON), unit, timestamp
- All tables have proper indexes (level, service, timestamp, traceId for logs; traceId, serviceName, timestamp for traces; name, timestamp for metrics)
- Tables created directly in SQLite via raw SQL (prisma db push blocked by MySQL provider config)

### 2. Persistence Service (`src/services/observability/persistence.service.ts`)
- **Core Persistence Methods**:
  - `persistLogs()`: Bulk-inserts in-memory log entries to ObservabilityLog table. Uses watermark tracking to only insert new entries since last flush. Supports configurable batch sizes. Falls back to individual inserts on bulk failure.
  - `persistTraces()`: Bulk-inserts completed (ended) trace spans to ObservabilityTrace table. Watermark-based dedup. Skips open (non-ended) spans.
  - `persistMetrics()`: Snapshots all current metric values from PrometheusMetricsService and bulk-inserts to ObservabilityMetricSnapshot table.
- **Historical Query Methods**:
  - `queryHistoricalLogs()`: Full-text search, filtering by level/service/traceId/user/date range, pagination, summary stats (byLevel, topServices).
  - `queryHistoricalTraces()`: Filtering by traceId/serviceName/name/minDuration/date range, returns trace tree structure (spans grouped and nested by parentSpanId).
  - `queryHistoricalMetrics()`: Filtering by name/type/date range, aggregation summary (count, avg, max, min per metric).
- **Lifecycle Management**:
  - `flush()`: Full flush cycle for all 3 data types.
  - `gracefulShutdown()`: Flushes with increased batch sizes (5000) to drain all remaining data.
  - `start()`: Starts periodic flush timer (default 30s), registers SIGTERM/SIGINT handlers, runs initial flush after 5s delay.
  - `stop()`: Stops periodic timer.
  - Auto-starts on server import (10s delay to allow app init).
- **Configuration**: `PersistenceConfig` with flushIntervalMs, logsBatchSize, tracesBatchSize, metricsBatchSize, maxRetentionDays, enabled toggle.
- **Status**: `getStatus()` returns isRunning, config, totalPersisted counts, lastFlush result, watermarks.
- **Log Shipping**: `exportData()` method for shipping data to external tools (ELK, Grafana).
- **Safety**: All DB operations wrapped in `safeDbOp()` that gracefully handles DB unavailability.

### 3. API Route: `/api/observability/logs/route.ts` (enhanced)
- GET `?view=historical`: Query persisted logs from DB with filtering (level, service, traceId, correlationId, userId, search, date range), pagination, and summary stats.
- GET `?view=persistence`: Get persistence service status.
- GET `?view=flush`: Manually trigger a log flush.
- Retains all existing views: search (in-memory), stats, anomalies, level.

### 4. API Route: `/api/observability/traces/route.ts` (enhanced)
- GET `?view=historical`: Query persisted traces from DB with filtering (traceId, serviceName, name, minDurationMs, date range), returns trace tree structure with span nesting.
- GET `?view=flush`: Manually trigger a trace flush.
- Retains existing default search view for in-memory traces.

### 5. API Route: `/api/observability/export/route.ts` (new)
- GET: Export observability data in JSON format for log shipping to external tools.
- Supports: `?type=logs|traces|metrics&format=json&from=...&to=...&limit=...`
- Returns structured envelope with metadata (source, version, exportedAt, recordCount, dateRange).
- Sets Content-Disposition header for file download.
- Validates type, format, limit (max 100K), and date formats.
- Useful for shipping to ELK, Grafana Loki, Datadog, etc.

### 6. Health Check Enhancement (`src/app/api/observability/health/route.ts`)
- Added "persistence" check that reports:
  - Running status
  - Flush interval
  - Total persisted counts (logs/traces/metrics)
  - Uses dynamic import to avoid loading persistence service until needed.

### 7. Quality
- All new files pass ESLint with zero new errors
- No lint errors in any of the 4 new/modified files
- Pre-existing 1866 errors unchanged
- DB tables verified created in SQLite

Stage Summary:
- 3 new Prisma models (ObservabilityLog, ObservabilityTrace, ObservabilityMetricSnapshot)
- 1 new service file (persistence.service.ts, ~840 lines)
- 1 new API route (export)
- 2 enhanced API routes (logs, traces)
- 1 enhanced health check route
- Automatic persistence with 30s flush interval
- Graceful shutdown flush on SIGTERM/SIGINT
- Watermark-based deduplication to avoid re-inserting
- Full historical query API with filtering, pagination, and aggregation
- Log shipping readiness via export endpoint with structured JSON envelope
