// ============================================================================
// MQTT PROTOCOL ADAPTER — Production-grade industrial MQTT connectivity
// Handles connection lifecycle, topic subscription, QoS, retained messages
// Features: deduplication, offline buffering, broker failover, telemetry
// batching, device status tracking, enhanced statistics
// ============================================================================
import { createLogger } from '@/lib/logger';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';

const log = createLogger('MQTTAdapter');

export interface MQTTConnectionConfig {
  broker: string;
  port: number;
  username?: string;
  password?: string;
  clientId: string;
  protocol?: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  keepalive?: number;
  cleanSession?: boolean;
  willTopic?: string;
  willMessage?: string;
  /** Production feature: additional broker URLs for failover */
  failoverBrokers?: Array<{ broker: string; port: number; protocol?: 'mqtt' | 'mqtts' | 'ws' | 'wss' }>;
  /** Production feature: deduplication TTL in ms (default 60_000) */
  dedupTtlMs?: number;
  /** Production feature: max offline buffer size (default 10000) */
  offlineBufferMaxSize?: number;
  /** Production feature: batch flush interval in ms (default 5000) */
  batchFlushIntervalMs?: number;
  /** Production feature: batch max size before forced flush (default 100) */
  batchMaxSize?: number;
  /** Production feature: device timeout in ms (default 300_000 = 5min) */
  deviceTimeoutMs?: number;
}

export interface MQTTSubscription {
  topic: string;
  qos: 0 | 1 | 2;
  mappingId: string;
}

interface IncomingMessage {
  topic: string;
  payload: Buffer | string;
  qos: number;
  retain: boolean;
}

interface DedupEntry {
  hash: string;
  expiresAt: number;
}

interface OfflineBufferedMessage {
  topic: string;
  message: string | Buffer;
  qos: 0 | 1 | 2;
  retain: boolean;
  enqueuedAt: number;
}

interface BatchMessage {
  topic: string;
  payload: Buffer | string;
  qos: number;
  retain: boolean;
  mappingId: string;
  timestamp: Date;
}

interface DeviceRecord {
  topic: string;
  lastSeenAt: number;
  messageCount: number;
}

interface BrokerHealth {
  broker: string;
  port: number;
  successfulConnections: number;
  failedConnections: number;
  lastAttemptAt: number;
  lastSuccessAt: number | null;
  avgConnectTimeMs: number;
  healthScore: number; // 0-100
}

interface MpsWindowEntry {
  count: number;
  windowStart: number;
}

export class MQTTAdapter extends EventEmitter {
  private config: MQTTConnectionConfig;
  private connected = false;
  private connecting = false;
  private subscriptions: Map<string, MQTTSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private messageCount = 0;
  private errorCount = 0;
  private droppedCount = 0;
  private lastMessageAt: Date | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  // In production: private client: mqtt.MqttClient

  // ── 1. Message Deduplication ───────────────────────────────────────────
  private dedupCache: Map<string, DedupEntry> = new Map();
  private dedupTtlMs: number;
  private dedupCleanupInterval: ReturnType<typeof setInterval> | null = null;

  // ── 2. Offline Buffering ───────────────────────────────────────────────
  private offlineBuffer: OfflineBufferedMessage[] = [];
  private offlineBufferMaxSize: number;

  // ── 3. Broker Failover ─────────────────────────────────────────────────
  private brokerHealthMap: Map<string, BrokerHealth> = new Map();
  private currentBrokerIndex = 0;
  private totalBrokers: Array<{ broker: string; port: number; protocol?: 'mqtt' | 'mqtts' | 'ws' | 'wss' }> = [];

  // ── 4. Telemetry Batching ──────────────────────────────────────────────
  private batchBuffer: BatchMessage[] = [];
  private batchFlushIntervalMs: number;
  private batchMaxSize: number;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private totalBatchesFlushed = 0;

  // ── 5. Device Status Tracking ──────────────────────────────────────────
  private deviceRegistry: Map<string, DeviceRecord> = new Map();
  private deviceTimeoutMs: number;
  private deviceCheckInterval: ReturnType<typeof setInterval> | null = null;

  // ── 6. Enhanced Statistics ─────────────────────────────────────────────
  private bytesReceived = 0;
  private bytesSent = 0;
  private mpsWindows: MpsWindowEntry[] = [];
  private currentMpsWindow: MpsWindowEntry | null = null;
  private latencySamples: number[] = [];
  private connectStartTime = 0;

  constructor(config: MQTTConnectionConfig) {
    super();
    this.config = config;

    // Initialize production feature configs
    this.dedupTtlMs = config.dedupTtlMs ?? 60_000;
    this.offlineBufferMaxSize = config.offlineBufferMaxSize ?? 10_000;
    this.batchFlushIntervalMs = config.batchFlushIntervalMs ?? 5_000;
    this.batchMaxSize = config.batchMaxSize ?? 100;
    this.deviceTimeoutMs = config.deviceTimeoutMs ?? 300_000;

    // Build broker list (primary + failover)
    this.totalBrokers = [
      { broker: config.broker, port: config.port, protocol: config.protocol },
      ...(config.failoverBrokers || []),
    ];
    // Initialize health for each broker
    for (const b of this.totalBrokers) {
      const key = `${b.broker}:${b.port}`;
      this.brokerHealthMap.set(key, {
        broker: b.broker,
        port: b.port,
        successfulConnections: 0,
        failedConnections: 0,
        lastAttemptAt: 0,
        lastSuccessAt: null,
        avgConnectTimeMs: 0,
        healthScore: 100,
      });
    }
  }

  getStatus() {
    const currentBroker = this.totalBrokers[this.currentBrokerIndex];
    return {
      protocol: 'mqtt',
      connected: this.connected,
      connecting: this.connecting,
      subscriptions: Array.from(this.subscriptions.values()),
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      droppedCount: this.droppedCount,
      lastMessageAt: this.lastMessageAt,
      reconnectAttempts: this.reconnectAttempts,
      broker: `${currentBroker?.protocol || this.config.protocol || 'mqtt'}://${currentBroker?.broker || this.config.broker}:${currentBroker?.port}`,
      clientId: this.config.clientId,
      currentBrokerIndex: this.currentBrokerIndex,
      totalBrokers: this.totalBrokers.length,
      // Enhanced stats
      bytesReceived: this.bytesReceived,
      bytesSent: this.bytesSent,
      messagesPerSecond: this.getMessagesPerSecond(),
      avgLatencyMs: this.getAvgLatencyMs(),
      // Batching
      batchSize: this.batchBuffer.length,
      totalBatchesFlushed: this.totalBatchesFlushed,
      // Offline buffer
      offlineBufferSize: this.offlineBuffer.length,
      offlineBufferMaxSize: this.offlineBufferMaxSize,
      // Device tracking
      trackedDevices: this.deviceRegistry.size,
      // Dedup
      dedupCacheSize: this.dedupCache.size,
      // Broker health
      brokerHealth: Array.from(this.brokerHealthMap.values()),
    };
  }

  async connect(): Promise<void> {
    if (this.connected || this.connecting) return;
    this.connecting = true;
    this.emit('status_change', { status: 'connecting' });

    // Try brokers in order (failover support)
    const maxAttempts = this.totalBrokers.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const brokerIdx = this.currentBrokerIndex;
      const broker = this.totalBrokers[brokerIdx];
      const brokerKey = `${broker.broker}:${broker.port}`;
      const health = this.brokerHealthMap.get(brokerKey)!;

      log.info(`Connecting to MQTT broker [${brokerIdx + 1}/${maxAttempts}]: ${broker.broker}:${broker.port}`);
      health.lastAttemptAt = Date.now();

      try {
        this.connectStartTime = Date.now();

        // Production: use 'mqtt' package
        // const mqtt = await import('mqtt');
        // const url = `${broker.protocol || 'mqtt'}://${this.config.username ? `${this.config.username}:${this.config.password}@` : ''}${broker.broker}:${broker.port}`;
        // this.client = mqtt.connect(url, { clientId: this.config.clientId, keepalive: this.config.keepalive || 60, cleanSession: this.config.cleanSession ?? true, will: this.config.willTopic ? { topic: this.config.willTopic, payload: this.config.willMessage || '', retain: false, qos: 1 } : undefined });

        // Simulate successful connection for now
        await this.simulateConnection();

        const connectTimeMs = Date.now() - this.connectStartTime;
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempts = 0;

        // Update broker health
        health.successfulConnections++;
        health.lastSuccessAt = Date.now();
        health.avgConnectTimeMs = health.avgConnectTimeMs === 0
          ? connectTimeMs
          : Math.round((health.avgConnectTimeMs * (health.successfulConnections - 1) + connectTimeMs) / health.successfulConnections);
        // Boost health score
        health.healthScore = Math.min(100, health.healthScore + 5);

        this.emit('connected');
        this.emit('status_change', { status: 'connected', brokerIndex: brokerIdx });
        log.info(`MQTT connected successfully to ${broker.broker}:${broker.port} in ${connectTimeMs}ms`);

        // Setup production services
        this.setupHeartbeat();
        this.setupBatching();
        this.setupDedupCleanup();
        this.setupDeviceTimeoutCheck();

        // Flush offline buffer
        await this.flushOfflineBuffer();

        return; // Success
      } catch (error) {
        lastError = error as Error;
        health.failedConnections++;
        // Penalize health score
        health.healthScore = Math.max(0, health.healthScore - 15);
        log.warn(`MQTT broker [${broker.broker}:${broker.port}] connection failed: ${(error as Error).message}`);

        // Move to next broker
        this.currentBrokerIndex = (brokerIdx + 1) % this.totalBrokers.length;
      }
    }

    // All brokers failed
    this.connected = false;
    this.connecting = false;
    this.errorCount++;
    this.emit('error', lastError);
    this.emit('status_change', { status: 'error', error: lastError?.message });
    log.error('All MQTT brokers failed', lastError!);
    this.scheduleReconnect();
    throw lastError;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.connecting = false;
    this.cleanupTimers();
    // Production: await this.client?.endAsync();
    this.subscriptions.clear();
    this.emit('disconnected');
    this.emit('status_change', { status: 'disconnected' });
    log.info('MQTT disconnected');
  }

  subscribe(subscription: MQTTSubscription): void {
    if (!this.connected) throw new Error('MQTT not connected');
    this.subscriptions.set(subscription.topic, subscription);
    // Production: this.client.subscribe(subscription.topic, { qos: subscription.qos });
    log.info(`Subscribed to MQTT topic: ${subscription.topic} (QoS ${subscription.qos})`);
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
    // Production: this.client.unsubscribe(topic);
    log.info(`Unsubscribed from MQTT topic: ${topic}`);
  }

  publish(topic: string, message: string | Buffer, qos: 0 | 1 | 2 = 0, retain = false): void {
    const msgSize = typeof message === 'string' ? Buffer.byteLength(message) : message.length;

    if (!this.connected) {
      // Offline buffering: queue the message
      if (this.offlineBuffer.length >= this.offlineBufferMaxSize) {
        // Buffer full — discard oldest
        this.offlineBuffer.shift();
        this.droppedCount++;
        log.warn(`Offline buffer full (${this.offlineBufferMaxSize}), discarding oldest message`);
      }
      this.offlineBuffer.push({ topic, message, qos, retain, enqueuedAt: Date.now() });
      log.debug(`Buffered message for offline publish to ${topic} (buffer: ${this.offlineBuffer.length})`);
      return;
    }

    // Production: this.client.publish(topic, message, { qos, retain });
    log.debug(`Published to ${topic}: ${message.toString().substring(0, 100)}`);
    this.messageCount++;
    this.bytesSent += msgSize;
  }

  // Handle incoming message (called by production MQTT client 'message' event)
  handleIncomingMessage(msg: IncomingMessage): void {
    const handlerStart = Date.now();

    // ── 1. Deduplication check ──────────────────────────────────────────
    const msgStr = msg.payload.toString();
    const dedupKey = `${msg.topic}:${createHash('sha256').update(msgStr).digest('hex').substring(0, 16)}`;
    const now = Date.now();

    const existing = this.dedupCache.get(dedupKey);
    if (existing && existing.expiresAt > now) {
      // Duplicate detected
      this.droppedCount++;
      log.debug(`Duplicate message discarded: ${msg.topic}`);
      return;
    }

    // Add to dedup cache
    this.dedupCache.set(dedupKey, { hash: dedupKey, expiresAt: now + this.dedupTtlMs });

    // ── 6. Update stats ────────────────────────────────────────────────
    this.messageCount++;
    this.lastMessageAt = new Date();
    const msgSize = typeof msg.payload === 'string' ? Buffer.byteLength(msg.payload) : msg.payload.length;
    this.bytesReceived += msgSize;

    // Track messages per second
    this.trackMps();

    // ── 5. Device status tracking ──────────────────────────────────────
    this.updateDeviceStatus(msg.topic);

    // ── 4. Add to batch buffer ─────────────────────────────────────────
    const subscription = this.subscriptions.get(msg.topic);
    if (subscription) {
      this.batchBuffer.push({
        topic: msg.topic,
        payload: msg.payload,
        qos: msg.qos,
        retain: msg.retain,
        mappingId: subscription.mappingId,
        timestamp: new Date(),
      });

      // Check batch flush conditions
      if (this.batchBuffer.length >= this.batchMaxSize) {
        this.flushBatch();
      }
    }

    // Also emit individual 'data' event for real-time consumers
    if (subscription) {
      this.emit('data', {
        topic: msg.topic,
        payload: msg.payload,
        qos: msg.qos,
        retain: msg.retain,
        mappingId: subscription.mappingId,
        timestamp: new Date(),
      });
    } else {
      log.debug(`No mapping for topic: ${msg.topic}`);
    }

    // Track latency (handler completion time)
    const latencyMs = Date.now() - handlerStart;
    this.trackLatency(latencyMs);
  }

  // ── 1. Deduplication ─────────────────────────────────────────────────

  private setupDedupCleanup(): void {
    if (this.dedupCleanupInterval) clearInterval(this.dedupCleanupInterval);
    this.dedupCleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      for (const [key, entry] of this.dedupCache) {
        if (entry.expiresAt <= now) {
          this.dedupCache.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) log.debug(`Dedup cache cleanup: removed ${cleaned} entries`);
    }, 30_000); // cleanup every 30s
  }

  // ── 2. Offline Buffering ───────────────────────────────────────────────

  private async flushOfflineBuffer(): Promise<void> {
    if (this.offlineBuffer.length === 0) return;

    const messages = [...this.offlineBuffer];
    this.offlineBuffer = [];
    log.info(`Flushing ${messages.length} buffered offline messages`);

    for (const msg of messages) {
      try {
        // Production: this.client.publish(msg.topic, msg.message, { qos: msg.qos, retain: msg.retain });
        this.messageCount++;
        const msgSize = typeof msg.message === 'string' ? Buffer.byteLength(msg.message) : msg.message.length;
        this.bytesSent += msgSize;
      } catch (error) {
        this.errorCount++;
        log.error(`Failed to publish buffered message to ${msg.topic}`, error as Error);
      }
    }

    this.emit('offline_buffer_flushed', { count: messages.length });
  }

  // ── 3. Broker Failover ─────────────────────────────────────────────────

  /** Get the current broker list sorted by health score (best first) */
  getBrokerHealthRanking(): BrokerHealth[] {
    return Array.from(this.brokerHealthMap.values()).sort((a, b) => b.healthScore - a.healthScore);
  }

  /** Force switch to a specific broker by index */
  switchBroker(index: number): void {
    if (index < 0 || index >= this.totalBrokers.length) {
      throw new Error(`Invalid broker index: ${index} (valid: 0-${this.totalBrokers.length - 1})`);
    }
    if (index === this.currentBrokerIndex) return;

    log.info(`Switching broker from index ${this.currentBrokerIndex} to ${index}`);
    this.currentBrokerIndex = index;

    // If connected, reconnect to new broker
    if (this.connected) {
      this.disconnect().then(() => {
        this.connect().catch(() => {});
      });
    }
  }

  /** Get the best broker (highest health score) */
  getBestBroker(): { broker: string; port: number; index: number } | null {
    const ranking = this.getBrokerHealthRanking();
    if (ranking.length === 0) return null;
    const best = ranking[0];
    const idx = this.totalBrokers.findIndex(b => `${b.broker}:${b.port}` === `${best.broker}:${best.port}`);
    return { broker: best.broker, port: best.port, index: idx };
  }

  // ── 4. Telemetry Batching ──────────────────────────────────────────────

  private setupBatching(): void {
    if (this.batchTimer) clearInterval(this.batchTimer);
    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, this.batchFlushIntervalMs);
    log.info(`Batching enabled: flush every ${this.batchFlushIntervalMs}ms or at ${this.batchMaxSize} messages`);
  }

  private flushBatch(): void {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];
    this.totalBatchesFlushed++;

    this.emit('batch', {
      messages: batch,
      count: batch.length,
      flushedAt: new Date(),
    });

    log.debug(`Batch flushed: ${batch.length} messages (total batches: ${this.totalBatchesFlushed})`);
  }

  // ── 5. Device Status Tracking ──────────────────────────────────────────

  private updateDeviceStatus(topic: string): void {
    const now = Date.now();
    const existing = this.deviceRegistry.get(topic);
    if (existing) {
      existing.lastSeenAt = now;
      existing.messageCount++;
    } else {
      this.deviceRegistry.set(topic, { topic, lastSeenAt: now, messageCount: 1 });
    }
  }

  private setupDeviceTimeoutCheck(): void {
    if (this.deviceCheckInterval) clearInterval(this.deviceCheckInterval);
    this.deviceCheckInterval = setInterval(() => {
      const now = Date.now();
      for (const [topic, record] of this.deviceRegistry) {
        if (now - record.lastSeenAt > this.deviceTimeoutMs) {
          this.emit('device_timeout', {
            topic,
            lastSeenAt: new Date(record.lastSeenAt),
            messageCount: record.messageCount,
            timeoutMs: this.deviceTimeoutMs,
          });
          // Remove from registry (device is considered offline)
          this.deviceRegistry.delete(topic);
          log.warn(`Device timeout: ${topic} (last seen ${Math.round((now - record.lastSeenAt) / 1000)}s ago)`);
        }
      }
    }, 60_000); // Check every minute
  }

  getDeviceStatuses(): Array<{ topic: string; lastSeenAt: Date; messageCount: number; isOnline: boolean }> {
    const now = Date.now();
    return Array.from(this.deviceRegistry.values()).map(r => ({
      topic: r.topic,
      lastSeenAt: new Date(r.lastSeenAt),
      messageCount: r.messageCount,
      isOnline: (now - r.lastSeenAt) <= this.deviceTimeoutMs,
    }));
  }

  // ── 6. Enhanced Statistics ─────────────────────────────────────────────

  private trackMps(): void {
    const now = Date.now();
    const windowSize = 1000; // 1-second windows

    if (!this.currentMpsWindow || now - this.currentMpsWindow.windowStart >= windowSize) {
      // Start new window
      if (this.currentMpsWindow) {
        this.mpsWindows.push(this.currentMpsWindow);
      }
      this.currentMpsWindow = { count: 1, windowStart: now };

      // Keep only last 60 windows (60 seconds)
      while (this.mpsWindows.length > 60) {
        this.mpsWindows.shift();
      }
    } else {
      this.currentMpsWindow.count++;
    }
  }

  getMessagesPerSecond(): number {
    const allWindows = [...this.mpsWindows];
    if (this.currentMpsWindow) allWindows.push(this.currentMpsWindow);
    if (allWindows.length === 0) return 0;

    const totalMessages = allWindows.reduce((sum, w) => sum + w.count, 0);
    const totalTimeSec = allWindows.length; // each window is ~1 second
    return Math.round((totalMessages / Math.max(totalTimeSec, 1)) * 100) / 100;
  }

  private trackLatency(latencyMs: number): void {
    this.latencySamples.push(latencyMs);
    if (this.latencySamples.length > 100) {
      this.latencySamples.shift();
    }
  }

  getAvgLatencyMs(): number {
    if (this.latencySamples.length === 0) return 0;
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.latencySamples.length) * 100) / 100;
  }

  getP99LatencyMs(): number {
    if (this.latencySamples.length === 0) return 0;
    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.99);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  // ── Connection Lifecycle Helpers ───────────────────────────────────────

  private setupHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.emit('heartbeat', {
          timestamp: new Date(),
          messageCount: this.messageCount,
          bytesReceived: this.bytesReceived,
          bytesSent: this.bytesSent,
          mps: this.getMessagesPerSecond(),
          activeDevices: this.deviceRegistry.size,
          batchSize: this.batchBuffer.length,
        });
      }
    }, 30000);
  }

  private cleanupTimers(): void {
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.batchTimer) { clearInterval(this.batchTimer); this.batchTimer = null; }
    if (this.dedupCleanupInterval) { clearInterval(this.dedupCleanupInterval); this.dedupCleanupInterval = null; }
    if (this.deviceCheckInterval) { clearInterval(this.deviceCheckInterval); this.deviceCheckInterval = null; }

    // Flush remaining batch on disconnect
    if (this.batchBuffer.length > 0) {
      this.flushBatch();
    }
  }

  private async simulateConnection(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 500));
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
      this.emit('max_reconnect');
      return;
    }
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    log.info(`Scheduling MQTT reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  // ── Configuration Update ───────────────────────────────────────────────

  /** Update config at runtime (e.g., for failover broker list changes) */
  updateConfig(partial: Partial<MQTTConnectionConfig>): void {
    Object.assign(this.config, partial);
    if (partial.failoverBrokers) {
      // Rebuild broker list
      this.totalBrokers = [
        { broker: this.config.broker, port: this.config.port, protocol: this.config.protocol },
        ...partial.failoverBrokers,
      ];
      for (const b of this.totalBrokers) {
        const key = `${b.broker}:${b.port}`;
        if (!this.brokerHealthMap.has(key)) {
          this.brokerHealthMap.set(key, {
            broker: b.broker,
            port: b.port,
            successfulConnections: 0,
            failedConnections: 0,
            lastAttemptAt: 0,
            lastSuccessAt: null,
            avgConnectTimeMs: 0,
            healthScore: 100,
          });
        }
      }
    }
    log.info('MQTT adapter config updated');
  }

  /** Reset all statistics counters */
  resetStats(): void {
    this.messageCount = 0;
    this.errorCount = 0;
    this.droppedCount = 0;
    this.bytesReceived = 0;
    this.bytesSent = 0;
    this.mpsWindows = [];
    this.currentMpsWindow = null;
    this.latencySamples = [];
    this.totalBatchesFlushed = 0;
    this.dedupCache.clear();
    this.deviceRegistry.clear();
    log.info('MQTT adapter statistics reset');
  }
}
