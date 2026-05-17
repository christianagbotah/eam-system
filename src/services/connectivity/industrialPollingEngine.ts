// ============================================================================
// INDUSTRIAL POLLING ENGINE — Centralized polling orchestration
// Manages all protocol adapters, routes data to batcher and event stream
// Handles adapter lifecycle, configuration reload, and metrics
// ============================================================================
import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';
import { EventEmitter } from 'events';
import { MQTTAdapter, type MQTTConnectionConfig } from './mqttAdapter';
import { OPCUAAdapter, type OPCUAConnectionConfig } from './opcuaAdapter';
import { ModbusAdapter, type ModbusConnectionConfig } from './modbusAdapter';
import { BACnetAdapter, type BACnetConnectionConfig } from './bacnetAdapter';
import { SiemensS7Adapter, type SiemensS7Config } from './siemensS7Adapter';
import { EthernetIPAdapter, type EthernetIPConfig } from './ethernetIpAdapter';
import { RESTAdapter, type RESTConnectionConfig } from './restAdapter';
import { telemetryBatcher } from './telemetryBatcher';
import { eventStreamProcessor } from './eventStreamProcessor';

const log = createLogger('IndustrialPollingEngine');

type ProtocolAdapter = MQTTAdapter | OPCUAAdapter | ModbusAdapter | BACnetAdapter | SiemensS7Adapter | EthernetIPAdapter | RESTAdapter;

interface AdapterInstance {
  id: string;
  sourceId: string;
  protocol: string;
  adapter: ProtocolAdapter;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  connectedAt?: Date;
  errorCount: number;
  dataCount: number;
}

const activeAdapters = new Map<string, AdapterInstance>();

export class IndustrialPollingEngine extends EventEmitter {
  async startSource(sourceId: string, userId: string): Promise<AdapterInstance> {
    const source = await db.telemetryDataSource.findUnique({
      where: { id: sourceId },
      include: { mappings: { where: { isActive: true } } },
    });
    if (!source) throw new Error(`Data source ${sourceId} not found`);
    if (!source.connectionConfig) throw new Error(`No connection config for source ${sourceId}`);

    const config = JSON.parse(source.connectionConfig) as Record<string, unknown>;

    // Create adapter based on protocol
    const adapter = this.createAdapter(source.sourceType, config);
    if (!adapter) throw new Error(`Unsupported protocol: ${source.sourceType}`);

    // Register data handler
    adapter.on('data', (data: { mappingId: string; value: number | unknown; timestamp: Date; [key: string]: unknown }) => {
      const instance = activeAdapters.get(sourceId);
      if (instance) instance.dataCount++;

      // Route to batcher
      if (typeof data.value === 'number') {
        telemetryBatcher.add(sourceId, {
          mappingId: data.mappingId,
          value: data.value,
          quality: 100,
          timestamp: data.timestamp,
        });
      }

      // Route to event stream
      eventStreamProcessor.emitDataIngested(
        source.sourceType,
        sourceId,
        data.mappingId,
        typeof data.value === 'number' ? data.value : 0,
      );
    });

    // Register status handlers
    adapter.on('status_change', (status: { status: string; error?: string }) => {
      const instance = activeAdapters.get(sourceId);
      if (instance) {
        instance.status = status.status as AdapterInstance['status'];
        if (status.status === 'error') instance.errorCount++;
        if (status.status === 'connected') instance.connectedAt = new Date();
      }
      eventStreamProcessor.emitConnectionChanged(sourceId, source.sourceType, status.status, { error: status.error });
      this.emit('adapter_status', { sourceId, ...status });
    });

    adapter.on('error', (error: Error) => {
      log.error(`Adapter error for ${sourceId}`, error);
    });

    // Connect
    await adapter.connect();

    // Create session record
    await db.connectivitySession.create({
      data: {
        sourceId,
        protocol: source.sourceType,
        status: 'connected',
        connectedAt: new Date(),
      },
    });

    // Update source status
    await db.telemetryDataSource.update({
      where: { id: sourceId },
      data: { status: 'connected', lastConnectionAt: new Date() },
    });

    const instance: AdapterInstance = {
      id: sourceId,
      sourceId,
      protocol: source.sourceType,
      adapter,
      status: 'connected',
      connectedAt: new Date(),
      errorCount: 0,
      dataCount: 0,
    };
    activeAdapters.set(sourceId, instance);

    log.info(`Started source ${source.name} (${source.sourceType}) with ${source.mappings.length} mappings`);
    this.emit('source_started', { sourceId, protocol: source.sourceType });
    return instance;
  }

  async stopSource(sourceId: string): Promise<void> {
    const instance = activeAdapters.get(sourceId);
    if (!instance) return;

    await instance.adapter.disconnect();
    activeAdapters.delete(sourceId);

    // Update session
    await db.connectivitySession.updateMany({
      where: { sourceId, status: 'connected' },
      data: { status: 'disconnected', disconnectedAt: new Date() },
    });

    await db.telemetryDataSource.update({
      where: { id: sourceId },
      data: { status: 'disconnected' },
    });

    eventStreamProcessor.emitConnectionChanged(sourceId, instance.protocol, 'disconnected');
    log.info(`Stopped source ${sourceId}`);
    this.emit('source_stopped', { sourceId });
  }

  async stopAll(): Promise<void> {
    const sourceIds = Array.from(activeAdapters.keys());
    await Promise.all(sourceIds.map(id => this.stopSource(id)));
    log.info(`Stopped all ${sourceIds.length} sources`);
  }

  getStatus(): Array<{ sourceId: string; protocol: string; status: string; dataCount: number; errorCount: number; connectedAt?: Date; adapterStatus: unknown }> {
    return Array.from(activeAdapters.values()).map(instance => ({
      sourceId: instance.sourceId,
      protocol: instance.protocol,
      status: instance.status,
      dataCount: instance.dataCount,
      errorCount: instance.errorCount,
      connectedAt: instance.connectedAt,
      adapterStatus: (instance.adapter as { getStatus?: () => unknown }).getStatus?.() || null,
    }));
  }

  async getEngineStats() {
    const [totalSources, connectedSources, totalSessions] = await Promise.all([
      db.telemetryDataSource.count({ where: { isActive: true } }),
      db.connectivitySession.count({ where: { status: 'connected' } }),
      db.connectivitySession.count(),
    ]);

    return {
      activeAdapters: activeAdapters.size,
      totalSources,
      connectedSources,
      totalSessions,
      batcherStats: telemetryBatcher.getStats(),
      eventStreamStats: eventStreamProcessor.getStats(),
    };
  }

  private createAdapter(protocol: string, config: Record<string, unknown>): ProtocolAdapter | null {
    switch (protocol) {
      case 'mqtt': return new MQTTAdapter(config as unknown as MQTTConnectionConfig);
      case 'opcua': return new OPCUAAdapter(config as unknown as OPCUAConnectionConfig);
      case 'modbus_tcp': return new ModbusAdapter(config as unknown as ModbusConnectionConfig);
      case 'bacnet': return new BACnetAdapter(config as unknown as BACnetConnectionConfig);
      case 'siemens_s7': return new SiemensS7Adapter(config as unknown as SiemensS7Config);
      case 'ethernet_ip': return new EthernetIPAdapter(config as unknown as EthernetIPConfig);
      case 'rest_api': return new RESTAdapter(config as unknown as RESTConnectionConfig);
      default: return null;
    }
  }
}

export const industrialPollingEngine = new IndustrialPollingEngine();
