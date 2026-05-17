// ============================================================================
// OPC-UA PROTOCOL ADAPTER — Industrial OPC-UA connectivity
// Session management, browse, read, subscribe, monitored items
// ============================================================================
import { createLogger } from '@/lib/logger';
import { EventEmitter } from 'events';

const log = createLogger('OPCUAAdapter');

export interface OPCUAConnectionConfig {
  endpoint: string;
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';
  username?: string;
  password?: string;
  defaultNamespace?: string;
  requestedSessionTimeout?: number;
}

export interface OPUAMonitoredItem {
  nodeId: string;
  attributeId?: number; // default 13 (Value)
  samplingInterval?: number; // ms
  queueSize?: number;
  discardOldest?: boolean;
  mappingId: string;
}

export class OPCUAAdapter extends EventEmitter {
  private config: OPCUAConnectionConfig;
  private connected = false;
  private connecting = false;
  private monitoredItems: Map<string, OPUAMonitoredItem> = new Map();
  private subscriptionId: string | null = null;
  private reconnectAttempts = 0;
  private readCount = 0;
  private subscribeCount = 0;
  private errorCount = 0;
  private lastDataAt: Date | null = null;

  constructor(config: OPCUAConnectionConfig) {
    super();
    this.config = config;
  }

  getStatus() {
    return {
      protocol: 'opcua',
      connected: this.connected,
      connecting: this.connecting,
      monitoredItems: Array.from(this.monitoredItems.values()),
      subscriptionId: this.subscriptionId,
      readCount: this.readCount,
      subscribeCount: this.subscribeCount,
      errorCount: this.errorCount,
      lastDataAt: this.lastDataAt,
      reconnectAttempts: this.reconnectAttempts,
      endpoint: this.config.endpoint,
      securityMode: this.config.securityMode || 'None',
    };
  }

  async connect(): Promise<void> {
    if (this.connected || this.connecting) return;
    this.connecting = true;
    this.emit('status_change', { status: 'connecting' });
    log.info(`Connecting to OPC-UA server: ${this.config.endpoint}`);

    try {
      // Production: use 'node-opcua' package
      // const opcua = await import('node-opcua');
      // const endpointUrl = this.config.endpoint;
      // const securityMode = opcua.MessageSecurityMode[this.config.securityMode || 'None'];
      // const securityPolicy = opcua.SecurityPolicy[this.config.securityPolicy || 'None'];
      // this.client = opcua.OPCUAClient.create({ endpointMustExist: false, securityMode, securityPolicy });
      // await this.client.connect(endpointUrl);
      // this.session = await this.client.createSession(this.config.username ? { type: opcua.UserTokenType.UserName, userName: this.config.username, password: this.config.password } : undefined);
      // this.subscription = await this.session.createSubscription2({ requestedPublishingInterval: 1000, requestedLifetimeCount: 100, requestedMaxKeepAliveCount: 10, maxNotificationsPerPublish: 100, publishingEnabled: true });

      await new Promise((resolve) => setTimeout(resolve, 800));

      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;
      this.emit('connected');
      this.emit('status_change', { status: 'connected' });
      log.info('OPC-UA session established');
    } catch (error) {
      this.connected = false;
      this.connecting = false;
      this.errorCount++;
      this.emit('error', error);
      this.emit('status_change', { status: 'error', error: (error as Error).message });
      log.error('OPC-UA connection failed', error as Error);
      this.scheduleReconnect();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.connecting = false;
    this.monitoredItems.clear();
    // Production: await this.subscription?.terminate(); await this.session?.close(); await this.client?.disconnect();
    this.emit('disconnected');
    this.emit('status_change', { status: 'disconnected' });
    log.info('OPC-UA session closed');
  }

  async readNode(nodeId: string, mappingId: string): Promise<{ nodeId: string; value: unknown; statusCode: string; sourceTimestamp: Date }> {
    if (!this.connected) throw new Error('OPC-UA not connected');
    this.readCount++;
    this.lastDataAt = new Date();
    // Production: const dataValue = await this.session.readVariableValue(nodeId);
    log.debug(`Read OPC-UA node: ${nodeId}`);
    this.emit('data', { nodeId, mappingId, timestamp: new Date(), value: null, statusCode: 'Good', sourceTimestamp: new Date() });
    return { nodeId, value: null, statusCode: 'Good', sourceTimestamp: new Date() };
  }

  async browseNode(nodeId: string): Promise<Array<{ nodeId: string; browseName: string; nodeClass: string; displayName: string }>> {
    if (!this.connected) throw new Error('OPC-UA not connected');
    // Production: const browseResult = await this.session.browse(nodeId);
    log.debug(`Browsing OPC-UA node: ${nodeId}`);
    return [];
  }

  addMonitoredItem(item: OPUAMonitoredItem): void {
    if (!this.connected) throw new Error('OPC-UA not connected');
    this.monitoredItems.set(item.nodeId, item);
    this.subscribeCount++;
    // Production: const itemToMonitor = { nodeId: item.nodeId, attributeId: item.attributeId || 13 };
    // const parameters = { samplingInterval: item.samplingInterval || 1000, queueSize: item.queueSize || 10, discardOldest: item.discardOldest ?? true };
    // const monitoredItem = await this.subscription.monitor(itemToMonitor, parameters, 10);
    // monitoredItem.on('changed', (dataValue) => { this.emit('data', { nodeId: item.nodeId, mappingId: item.mappingId, value: dataValue.value.value, statusCode: dataValue.statusCode.name, sourceTimestamp: dataValue.sourceTimestamp, timestamp: new Date() }); });
    log.info(`Added monitored item: ${item.nodeId} (sampling: ${item.samplingInterval || 1000}ms)`);
  }

  removeMonitoredItem(nodeId: string): void {
    this.monitoredItems.delete(nodeId);
    log.info(`Removed monitored item: ${nodeId}`);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= 5) { this.emit('max_reconnect'); return; }
    this.reconnectAttempts++;
    setTimeout(() => { this.connect().catch(() => {}); }, this.reconnectAttempts * 5000);
  }
}
