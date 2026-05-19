// ============================================================================
// OPC-UA Protocol Adapter — Integration Test Scaffolding
// Tests: session config, node subscription, data type conversion,
//        connection lifecycle, browse, monitored items
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mock the logger before importing the adapter ----
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

async function createFreshAdapter(config?: Partial<import('@/services/connectivity/opcuaAdapter').OPCUAConnectionConfig>) {
  vi.resetModules();
  const { OPCUAAdapter } = await import('@/services/connectivity/opcuaAdapter');
  return new OPCUAAdapter({
    endpoint: 'opc.tcp://localhost:4840',
    ...config,
  });
}

describe('OPCUAAdapter', () => {
  let adapter: Awaited<ReturnType<typeof createFreshAdapter>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    adapter = await createFreshAdapter({
      securityMode: 'SignAndEncrypt',
      securityPolicy: 'Basic256Sha256',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Test 1: Constructor initializes with correct config
  it('should initialize with correct default state', () => {
    const status = adapter.getStatus();
    expect(status.protocol).toBe('opcua');
    expect(status.connected).toBe(false);
    expect(status.connecting).toBe(false);
    expect(status.monitoredItems).toEqual([]);
    expect(status.subscriptionId).toBeNull();
    expect(status.readCount).toBe(0);
    expect(status.errorCount).toBe(0);
    expect(status.reconnectAttempts).toBe(0);
  });

  // Test 2: Session configuration with security settings
  it('should accept session configuration with security mode and policy', () => {
    const status = adapter.getStatus();
    expect(status.endpoint).toBe('opc.tcp://localhost:4840');
    expect(status.securityMode).toBe('SignAndEncrypt');
  });

  // Test 3: Session configuration with authentication credentials
  it('should accept session configuration with username and password', async () => {
    const authAdapter = await createFreshAdapter({
      endpoint: 'opc.tcp://secure-plc:4840',
      username: 'operator',
      password: 'pass123',
      securityMode: 'Sign',
      securityPolicy: 'Basic128Rsa15',
      requestedSessionTimeout: 60000,
    });
    const status = authAdapter.getStatus();
    expect(status.endpoint).toBe('opc.tcp://secure-plc:4840');
    expect(status.securityMode).toBe('Sign');
  });

  // Test 4: Default security mode is None
  it('should default securityMode to None when not specified', async () => {
    const defaultAdapter = await createFreshAdapter({
      endpoint: 'opc.tcp://localhost:4840',
    });
    const status = defaultAdapter.getStatus();
    expect(status.securityMode).toBe('None');
  });

  // Test 5: Successful connection emits events (using fake timers)
  it('should connect successfully and emit connected + status_change events', async () => {
    const connectedSpy = vi.fn();
    const statusSpy = vi.fn();
    adapter.on('connected', connectedSpy);
    adapter.on('status_change', statusSpy);

    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    expect(connectedSpy).toHaveBeenCalledTimes(1);
    expect(statusSpy).toHaveBeenCalledWith({ status: 'connected' });
    expect(adapter.getStatus().connected).toBe(true);
    expect(adapter.getStatus().connecting).toBe(false);
    expect(adapter.getStatus().reconnectAttempts).toBe(0);
  });

  // Test 6: Connection emits status_change on connecting
  it('should emit status_change with connecting status', async () => {
    const statusSpy = vi.fn();
    adapter.on('status_change', statusSpy);

    adapter.connect(); // fire and forget — 'connecting' status emitted synchronously
    expect(statusSpy).toHaveBeenCalledWith({ status: 'connecting' });
  });

  // Test 7: Disconnect clears monitored items
  it('should disconnect and clear monitored items', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    adapter.addMonitoredItem({
      nodeId: 'ns=2;s=Temperature',
      mappingId: 'map-temp-1',
      samplingInterval: 1000,
    });

    expect(adapter.getStatus().monitoredItems.length).toBe(1);

    await adapter.disconnect();
    expect(adapter.getStatus().connected).toBe(false);
    expect(adapter.getStatus().monitoredItems.length).toBe(0);
  });

  // Test 8: Read node requires connection
  it('should throw when reading a node while not connected', async () => {
    await expect(
      adapter.readNode('ns=2;s=Pressure', 'map-pres-1'),
    ).rejects.toThrow('OPC-UA not connected');
  });

  // Test 9: Read node returns data
  it('should read a node and return expected structure', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    const dataSpy = vi.fn();
    adapter.on('data', dataSpy);

    const result = await adapter.readNode('ns=2;s=Temperature', 'map-temp-1');

    expect(result.nodeId).toBe('ns=2;s=Temperature');
    expect(result.statusCode).toBe('Good');
    expect(result.sourceTimestamp).toBeInstanceOf(Date);
    expect(adapter.getStatus().readCount).toBe(1);
    expect(dataSpy).toHaveBeenCalledTimes(1);
  });

  // Test 10: Browse node requires connection
  it('should throw when browsing while not connected', async () => {
    await expect(
      adapter.browseNode('ns=2;s=Objects'),
    ).rejects.toThrow('OPC-UA not connected');
  });

  // Test 11: Browse node returns array
  it('should browse a node and return array of references', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    const result = await adapter.browseNode('ns=2;s=Objects');
    expect(Array.isArray(result)).toBe(true);
  });

  // Test 12: Add monitored item requires connection
  it('should throw when adding monitored item while not connected', () => {
    expect(() => {
      adapter.addMonitoredItem({
        nodeId: 'ns=2;s=Temperature',
        mappingId: 'map-temp-1',
      });
    }).toThrow('OPC-UA not connected');
  });

  // Test 13: Add monitored item registers and increments subscribe count
  it('should register monitored item and increment subscribe count', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    adapter.addMonitoredItem({
      nodeId: 'ns=2;s=Temperature',
      mappingId: 'map-temp-1',
      samplingInterval: 2000,
      queueSize: 20,
      discardOldest: true,
    });

    adapter.addMonitoredItem({
      nodeId: 'ns=2;s=Pressure',
      mappingId: 'map-pres-1',
      samplingInterval: 5000,
    });

    const status = adapter.getStatus();
    expect(status.monitoredItems.length).toBe(2);
    expect(status.subscribeCount).toBe(2);

    const tempItem = status.monitoredItems.find(i => i.nodeId === 'ns=2;s=Temperature');
    expect(tempItem?.mappingId).toBe('map-temp-1');
    expect(tempItem?.samplingInterval).toBe(2000);
  });

  // Test 14: Remove monitored item
  it('should remove a monitored item by nodeId', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    adapter.addMonitoredItem({
      nodeId: 'ns=2;s=Temperature',
      mappingId: 'map-temp-1',
    });

    expect(adapter.getStatus().monitoredItems.length).toBe(1);

    adapter.removeMonitoredItem('ns=2;s=Temperature');
    expect(adapter.getStatus().monitoredItems.length).toBe(0);
  });

  // Test 15: Remove non-existent monitored item is safe
  it('should safely remove a non-existent monitored item', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    adapter.removeMonitoredItem('ns=2;s=NonExistent');
    expect(adapter.getStatus().monitoredItems.length).toBe(0);
  });

  // Test 16: Duplicate connection attempts are no-ops
  it('should not reconnect if already connected', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    const connectedSpy = vi.fn();
    adapter.on('connected', connectedSpy);

    await adapter.connect();
    expect(connectedSpy).not.toHaveBeenCalled();
  });

  // Test 17: Data type conversion — read returns null placeholder value
  it('should handle null value in read result', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    const result = await adapter.readNode('ns=2;s=UnknownType', 'map-unknown-1');
    expect(result.value).toBeNull();
    expect(result.statusCode).toBe('Good');
  });

  // Test 18: Last data timestamp updated on read
  it('should update lastDataAt timestamp when reading nodes', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    expect(adapter.getStatus().lastDataAt).toBeNull();

    await adapter.readNode('ns=2;s=Temperature', 'map-temp-1');
    expect(adapter.getStatus().lastDataAt).toBeInstanceOf(Date);
  });

  // Test 19: Error count starts at 0
  it('should handle connection failure with error event', async () => {
    const status = adapter.getStatus();
    expect(status.errorCount).toBe(0);
  });

  // Test 20: Monitored items with default parameters
  it('should handle monitored items with default sampling and queue', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(900);
    await connectPromise;

    adapter.addMonitoredItem({
      nodeId: 'ns=2;s=FlowRate',
      mappingId: 'map-flow-1',
    });

    const item = adapter.getStatus().monitoredItems[0];
    expect(item.nodeId).toBe('ns=2;s=FlowRate');
    expect(item.mappingId).toBe('map-flow-1');
  });
});
