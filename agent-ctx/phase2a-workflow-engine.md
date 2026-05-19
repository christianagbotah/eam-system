# Phase 2A: Workflow Engine — call_api, trigger_job, fork/join, timer

## Task
Implement `call_api` and `trigger_job` actions, fork/join resolution, and timer step timeout execution in the workflow engine.

## Changes Made

### File: `src/services/workflow/engine.service.ts`

#### 1. Timer Registry (new)
- Added module-level `activeTimers` Map for tracking active setTimeout references
- Added `clearTimer(instanceId)` helper for cleanup on workflow cancellation

#### 2. Interface Enhancement
- Added `durationMinutes?: number` and `durationHours?: number` to `WorkflowStepDef` for timer step configuration

#### 3. Template Interpolation Helper (new)
- Added `interpolateTemplate(template, context)` — replaces `{{variable}}` and `{{nested.path}}` placeholders
- Supports strings, arrays, and nested objects recursively
- Used by `call_api` and `trigger_job` for URL/header/body/payload interpolation

#### 4. `call_api` Action Executor (replaces placeholder)
- Config: `{ url, method?, headers?, body?, timeout?, retryCount?, stepKey? }`
- Uses native `fetch()` for HTTP requests
- Template variable interpolation on URL, headers, and body
- Timeout via `AbortController` (default 30s)
- Configurable retry with exponential backoff (1s, 2s, 4s...)
- Stores response in workflow variables: `${stepKey}_status`, `${stepKey}_body`, `${stepKey}_error`
- Emits audit event via `WorkflowStepHistory` on success/failure
- JSON auto-parsing of response body (falls back to raw text)

#### 5. `trigger_job` Action Executor (replaces placeholder)
- Config: `{ queueName, jobName, payload?, delay?, priority?, stepKey? }`
- Uses lazy `import('@/lib/queue')` → `jobQueue.add()` for BullMQ/in-memory queue
- Template variable interpolation on payload
- Stores job ID in workflow variables: `${stepKey}_jobId`
- Graceful fallback on queue unavailability: creates fallback ID and logs error
- Audit event via `WorkflowStepHistory` on success/failure/fallback

#### 6. `set_variable` Action Executor (new, was missing from switch)
- Config: `{ variables: Record<string, unknown> }`
- Returns key-value pairs that get merged into workflow variables

#### 7. Fork/Join Resolution (enhanced)
**Fork handling:**
- When fork executes, stores branch tracking variables: `_forkBranches`, `_branchCompletedCount: 0`, `_branchTotalCount: N`, `_completedBranches: []`

**Join resolution:**
- When a branch's next step is a join step, increments `_branchCompletedCount`
- Records completed step ID in `_completedBranches`
- If `waitAll` (joinCondition !== 'any') and not all branches done:
  - Finds next incomplete branch start step from `_forkBranches`
  - Advances `currentStepId` to that branch and creates history entry
  - Returns without moving past join
- If all branches completed OR `waitAll=false`:
  - Merges updated branch tracking vars into `mergedVars`
  - Falls through to move to join step (join step becomes current step for final advancement)
- Standalone joins (no fork tracking) pass through normally

#### 8. Timer Step Activation (new)
- When advancing to a timer step, clears any existing timer for the instance
- Calculates duration from `durationHours` and `durationMinutes` (with `timeoutMinutes` fallback)
- Sets `setTimeout` for the calculated duration
- Timer callback:
  - Clears timer reference
  - Re-fetches instance to verify still running and at timer step
  - Auto-advances workflow with `action: 'complete'` and system comment
  - Skips if workflow moved away or was cancelled
- Timer reference stored in `activeTimers` Map keyed by instanceId
- Timer cleaned up in `cancelWorkflow()`

#### 9. `executeActions` Return Type Change
- Changed from `Promise<void>` to `Promise<Record<string, unknown>>`
- Collects variable updates from `call_api`, `trigger_job`, and `set_variable` actions
- All callers now merge returned variables into `mergedVars` and persist to DB

#### 10. Context Enhancement
- All `executeActions` calls now include `__stepId` and `__instanceId` in context
- Enables action executors to create audit history entries and construct variable keys

## Quality
- ESLint passes with zero errors
- No changes to existing function signatures (except `executeActions` internal return type)
- All existing functionality preserved — fork, join, timer, call_api, trigger_job are additive
- Lazy import for queue avoids circular dependencies
