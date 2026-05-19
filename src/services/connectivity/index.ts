// ============================================================================
// CONNECTIVITY MODULE — Facade for all industrial connectivity services
// Exports all adapters, services, and the polling engine
// ============================================================================

export { MQTTAdapter, type MQTTConnectionConfig, type MQTTSubscription } from './mqttAdapter';
export { OPCUAAdapter, type OPCUAConnectionConfig, type OPUAMonitoredItem } from './opcuaAdapter';
export { ModbusAdapter, type ModbusConnectionConfig, type ModbusPollDefinition } from './modbusAdapter';
export { BACnetAdapter, type BACnetConnectionConfig, type BACnetObjectRef } from './bacnetAdapter';
export { SiemensS7Adapter, type SiemensS7Config, type S7DataBlock } from './siemensS7Adapter';
export { EthernetIPAdapter, type EthernetIPConfig, type CIPTag } from './ethernetIpAdapter';
export { RESTAdapter, type RESTConnectionConfig, type RESTPollDefinition } from './restAdapter';
export { edgeGatewayService, EdgeGatewayService } from './edgeGateway';
export { telemetryBatcher, TelemetryBatcher } from './telemetryBatcher';
export { eventStreamProcessor, EventStreamProcessor } from './eventStreamProcessor';
export { industrialPollingEngine, IndustrialPollingEngine } from './industrialPollingEngine';

// Re-export types for convenience
export type MQTTAdapterClass = MQTTAdapter;
export type OPCUAAdapterClass = OPCUAAdapter;
export type ModbusAdapterClass = ModbusAdapter;
export type BACnetAdapterClass = BACnetAdapter;
export type SiemensS7AdapterClass = SiemensS7Adapter;
export type EthernetIPAdapterClass = EthernetIPAdapter;
export type RESTAdapterClass = RESTAdapter;
