// ============================================================================
// Domain Event Bus Service — Critical Workflow Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock the database before importing the service ----
const mockDomainEventCreate = vi.fn().mockResolvedValue({ id: 'evt_mock_1' });
const mockDomainEventUpdate = vi.fn().mockResolvedValue({});
const mockDomainEventCount = vi.fn().mockResolvedValue(0);
const mockDomainEventGroupBy = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/db', () => ({
  db: {
    domainEvent: {
      create: mockDomainEventCreate,
      update: mockDomainEventUpdate,
      count: mockDomainEventCount,
      groupBy: mockDomainEventGroupBy,
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    workOrder: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null) },
    failureRecord: { count: vi.fn().mockResolvedValue(0) },
    asset: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({}) },
    pmSchedule: { findMany: vi.fn().mockResolvedValue([]) },
    workOrderMaterial: { findMany: vi.fn().mockResolvedValue([]) },
    inventoryItem: { findUnique: vi.fn().mockResolvedValue(null) },
    digitalTwin: { findUnique: vi.fn().mockResolvedValue(null) },
    notification: { create: vi.fn().mockResolvedValue({}) },
  },
}));

// Helper to dynamically import a fresh event bus instance
async function importFreshBus() {
  vi.resetModules();
  const mod = await import('@/services/eventBus.service');
  return mod.domainEventBus;
}

describe('DomainEventBus', () => {
  let bus: Awaited<ReturnType<typeof importFreshBus>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset all mock default behaviors
    mockDomainEventCreate.mockResolvedValue({ id: 'evt_mock_1' });
    mockDomainEventUpdate.mockResolvedValue({});
    mockDomainEventCount.mockResolvedValue(0);
    mockDomainEventGroupBy.mockResolvedValue([]);
    bus = await importFreshBus();
  });

  // -------------------------------------------------------------------------
  // Test 1: Publishing an event creates a DB record
  // -------------------------------------------------------------------------
  it('should persist an event to DB when published', async () => {
    await bus.publish('WorkOrderCreated', {
      workOrderId: 'wo-1',
      woNumber: 'WO-001',
      type: 'corrective',
      priority: 'high',
      requestedBy: 'user-1',
    });

    expect(mockDomainEventCreate).toHaveBeenCalledTimes(1);
    const createArgs = mockDomainEventCreate.mock.calls[0][0];
    expect(createArgs.data.eventType).toBe('WorkOrderCreated');
    expect(createArgs.data.payload.workOrderId).toBe('wo-1');
    expect(createArgs.data.status).toBe('pending');
    expect(createArgs.data.correlationId).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Test 2: Subscribing to an event receives the payload
  // -------------------------------------------------------------------------
  it('should deliver published event to subscribers', async () => {
    const handler = vi.fn();
    bus.subscribe('WorkOrderCreated', handler);

    const payload = {
      workOrderId: 'wo-2',
      woNumber: 'WO-002',
      type: 'preventive',
      priority: 'low',
      requestedBy: 'user-2',
    };

    await bus.publish('WorkOrderCreated', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    const receivedEvent = handler.mock.calls[0][0];
    expect(receivedEvent.eventType).toBe('WorkOrderCreated');
    expect(receivedEvent.payload.woNumber).toBe('WO-002');
    expect(receivedEvent.correlationId).toBeTruthy();
    expect(receivedEvent.timestamp).toBeInstanceOf(Date);
  });

  // -------------------------------------------------------------------------
  // Test 3: Unsubscribing stops receiving events
  // -------------------------------------------------------------------------
  it('should stop receiving events after unsubscribe', async () => {
    const handler = vi.fn();
    const unsubscribe = bus.subscribe('WorkOrderCreated', handler);

    await bus.publish('WorkOrderCreated', {
      workOrderId: 'wo-3',
      woNumber: 'WO-003',
      type: 'corrective',
      priority: 'medium',
      requestedBy: 'user-3',
    });
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();

    await bus.publish('WorkOrderCreated', {
      workOrderId: 'wo-4',
      woNumber: 'WO-004',
      type: 'corrective',
      priority: 'low',
      requestedBy: 'user-4',
    });
    expect(handler).toHaveBeenCalledTimes(1); // no additional calls
  });

  // -------------------------------------------------------------------------
  // Test 4: Wildcard subscribers receive all events
  // -------------------------------------------------------------------------
  it('wildcard subscribers should receive all event types', async () => {
    const handler = vi.fn();
    bus.subscribeToAll(handler);

    await bus.publish('WorkOrderCreated', {
      workOrderId: 'wo-5',
      woNumber: 'WO-005',
      type: 'corrective',
      priority: 'high',
      requestedBy: 'user-5',
    });

    await bus.publish('AssetHealthChanged', {
      assetId: 'asset-1',
      assetTag: 'P-001',
      previousHealth: 'good',
      newHealth: 'fair',
      healthScore: 60,
      reason: 'test',
    });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0][0].eventType).toBe('WorkOrderCreated');
    expect(handler.mock.calls[1][0].eventType).toBe('AssetHealthChanged');
  });

  // -------------------------------------------------------------------------
  // Test 5: Error isolation — one failing handler doesn't stop others
  // -------------------------------------------------------------------------
  it('should isolate handler errors — other handlers still execute', async () => {
    const failHandler = vi.fn().mockRejectedValue(new Error('handler boom'));
    const okHandler = vi.fn();

    bus.subscribe('WorkOrderCreated', failHandler, { label: 'failing', maxRetries: 1, backoffBaseMs: 10 });
    bus.subscribe('WorkOrderCreated', okHandler, { label: 'ok', maxRetries: 1, backoffBaseMs: 10 });

    await bus.publish('WorkOrderCreated', {
      workOrderId: 'wo-6',
      woNumber: 'WO-006',
      type: 'corrective',
      priority: 'high',
      requestedBy: 'user-6',
    });

    // Both should be called (error isolation)
    expect(failHandler).toHaveBeenCalled();
    expect(okHandler).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test 6: Retry mechanism
  // -------------------------------------------------------------------------
  it('should retry failing handlers up to maxRetries', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('retry me'));

    bus.subscribe('WorkOrderCreated', handler, { label: 'retry-test', maxRetries: 3, backoffBaseMs: 10 });

    await bus.publish('WorkOrderCreated', {
      workOrderId: 'wo-7',
      woNumber: 'WO-007',
      type: 'corrective',
      priority: 'high',
      requestedBy: 'user-7',
    });

    // Handler should be called 3 times (maxRetries)
    expect(handler).toHaveBeenCalledTimes(3);
  });

  // -------------------------------------------------------------------------
  // Test 7: Dead-letter events after max retries
  // -------------------------------------------------------------------------
  it('should move event to dead-letter after retries exhausted', async () => {
    mockDomainEventUpdate.mockResolvedValue({});

    const handler = vi.fn().mockRejectedValue(new Error('permanent failure'));

    bus.subscribe('WorkOrderCreated', handler, { label: 'dead-letter-test', maxRetries: 1, backoffBaseMs: 10 });

    await bus.publish('WorkOrderCreated', {
      workOrderId: 'wo-8',
      woNumber: 'WO-008',
      type: 'corrective',
      priority: 'high',
      requestedBy: 'user-8',
    });

    // After retry exhausted, should call moveToDeadLetter (db update with dead_letter status)
    const updateCalls = mockDomainEventUpdate.mock.calls;
    const deadLetterCall = updateCalls.find(
      (call: unknown[]) => call[0]?.data?.status === 'dead_letter',
    );
    expect(deadLetterCall).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Test 8: Event stats
  // -------------------------------------------------------------------------
  it('should return event statistics', async () => {
    mockDomainEventCount.mockResolvedValueOnce(42); // total
    mockDomainEventGroupBy.mockResolvedValueOnce([{ eventType: 'WorkOrderCreated', _count: 20 }]);
    mockDomainEventGroupBy.mockResolvedValueOnce([{ status: 'processed', _count: 30 }]);
    mockDomainEventCount.mockResolvedValueOnce(5);  // lastHour
    mockDomainEventCount.mockResolvedValueOnce(15); // last24Hours
    mockDomainEventCount.mockResolvedValueOnce(42); // last7Days

    const stats = await bus.getEventStats();

    expect(stats.total).toBe(42);
    expect(stats.byType['WorkOrderCreated']).toBe(20);
    expect(stats.throughput.lastHour).toBe(5);
    expect(stats.throughput.last24Hours).toBe(15);
    expect(stats.handlerCount).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // Test 9: Event envelope fields
  // -------------------------------------------------------------------------
  it('should include correct envelope fields on published event', async () => {
    const handler = vi.fn();
    bus.subscribe('AlarmTriggered', handler);

    await bus.publish('AlarmTriggered', {
      alarmId: 'alarm-1',
      ruleName: 'High Temp',
      severity: 'critical',
      metricName: 'temperature',
      value: 95,
      threshold: 85,
      sourceId: 'src-1',
    }, {
      entityName: 'TelemetrySource',
      entityId: 'src-1',
      source: 'test-suite',
    });

    const event = handler.mock.calls[0][0];
    expect(event.id).toBeTruthy();
    expect(event.version).toBe(1);
    expect(event.source).toBe('test-suite');
    expect(event.entityName).toBe('TelemetrySource');
    expect(event.entityId).toBe('src-1');
  });

  // -------------------------------------------------------------------------
  // Test 10: Correlation ID propagation
  // -------------------------------------------------------------------------
  it('should allow custom correlation ID and set causation ID', async () => {
    const handler = vi.fn();
    bus.subscribe('InventoryLow', handler);

    const correlationId = 'corr-12345';
    await bus.publish('InventoryLow', {
      itemId: 'item-1',
      itemCode: 'BOLT-001',
      itemName: 'M10 Bolt',
      currentStock: 2,
      minStockLevel: 10,
      reorderQuantity: 50,
      plantId: 'plant-1',
    }, {
      correlationId,
      causationId: 'evt-parent-001',
    });

    const event = handler.mock.calls[0][0];
    expect(event.correlationId).toBe(correlationId);
    expect(event.causationId).toBe('evt-parent-001');
  });

  // -------------------------------------------------------------------------
  // Test 11: Multiple subscribers to same event type
  // -------------------------------------------------------------------------
  it('should deliver to all subscribers of the same event type', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    bus.subscribe('SafetyIncidentCreated', handler1, { label: 'safety-1', maxRetries: 1, backoffBaseMs: 10 });
    bus.subscribe('SafetyIncidentCreated', handler2, { label: 'safety-2', maxRetries: 1, backoffBaseMs: 10 });
    bus.subscribe('SafetyIncidentCreated', handler3, { label: 'safety-3', maxRetries: 1, backoffBaseMs: 10 });

    await bus.publish('SafetyIncidentCreated', {
      incidentId: 'si-1',
      type: 'near-miss',
      severity: 'minor',
      location: 'Plant A',
      reportedBy: 'user-1',
      description: 'Test incident',
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler3).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test 12: Handler metrics tracking
  // -------------------------------------------------------------------------
  it('should track handler metrics for successful and failed calls', async () => {
    const successHandler = vi.fn().mockResolvedValue(undefined);
    const failHandler = vi.fn().mockRejectedValue(new Error('fail'));

    bus.subscribe('UserLoggedIn', successHandler, { label: 'success-h', maxRetries: 1, backoffBaseMs: 10 });
    bus.subscribe('UserLoggedIn', failHandler, { label: 'fail-h', maxRetries: 1, backoffBaseMs: 10 });

    await bus.publish('UserLoggedIn', {
      userId: 'user-1',
      username: 'jdoe',
      loginMethod: 'password',
    });

    const metrics = bus.getHandlerMetrics();
    expect(metrics.totalTraces).toBeGreaterThanOrEqual(2);

    const successMetrics = metrics.handlers.find(h => h.label === 'success-h');
    const failMetrics = metrics.handlers.find(h => h.label === 'fail-h');
    expect(successMetrics?.successCount).toBeGreaterThanOrEqual(1);
    expect(failMetrics?.failureCount).toBeGreaterThanOrEqual(1);
  });
});
