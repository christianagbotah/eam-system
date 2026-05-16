'use client';

import type { Node, Edge } from 'reactflow';

// ============================================================================
// DIAGRAM TEMPLATE DATA
// Enterprise-grade pre-built system diagram templates
// ============================================================================

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  diagramType: 'piping' | 'electrical' | 'process' | 'hvac' | 'control' | 'safety';
  thumbnail: string;
  nodes: Node[];
  edges: Edge[];
}

// --- Chilled Water System Template ---
export const chilledWaterTemplate: DiagramTemplate = {
  id: 'tpl-chilled-water',
  name: 'Chilled Water System',
  description: 'Complete chilled water distribution system with chiller plant, primary/secondary pumps, AHUs and VAV terminals',
  diagramType: 'hvac',
  thumbnail: 'chl',
  nodes: [
    // Chiller Plant
    {
      id: 'chiller-1',
      type: 'assetNode',
      position: { x: 80, y: 200 },
      data: {
        label: 'Chiller CH-1',
        assetType: 'chiller',
        status: 'operational',
        criticality: 'critical',
        health: 92,
        parameters: [
          { name: 'Supply Temp', value: '6.2', unit: '°C' },
          { name: 'Return Temp', value: '12.8', unit: '°C' },
          { name: 'Load', value: '78', unit: '%' },
        ],
        assetId: null,
      },
    },
    {
      id: 'chiller-2',
      type: 'assetNode',
      position: { x: 80, y: 420 },
      data: {
        label: 'Chiller CH-2',
        assetType: 'chiller',
        status: 'standby',
        criticality: 'critical',
        health: 88,
        parameters: [
          { name: 'Supply Temp', value: '-', unit: '°C' },
          { name: 'Return Temp', value: '-', unit: '°C' },
          { name: 'Load', value: '0', unit: '%' },
        ],
        assetId: null,
      },
    },
    // Primary Pumps
    {
      id: 'pump-p1',
      type: 'assetNode',
      position: { x: 380, y: 160 },
      data: {
        label: 'Primary Pump P-1',
        assetType: 'pump',
        status: 'operational',
        criticality: 'high',
        health: 95,
        parameters: [
          { name: 'Flow', value: '48.2', unit: 'm³/h' },
          { name: 'Head', value: '32', unit: 'm' },
          { name: 'Power', value: '15.2', unit: 'kW' },
        ],
        assetId: null,
      },
    },
    {
      id: 'pump-p2',
      type: 'assetNode',
      position: { x: 380, y: 320 },
      data: {
        label: 'Primary Pump P-2',
        assetType: 'pump',
        status: 'operational',
        criticality: 'high',
        health: 91,
        parameters: [
          { name: 'Flow', value: '47.8', unit: 'm³/h' },
          { name: 'Head', value: '31', unit: 'm' },
          { name: 'Power', value: '14.9', unit: 'kW' },
        ],
        assetId: null,
      },
    },
    // Secondary Pumps
    {
      id: 'pump-s1',
      type: 'assetNode',
      position: { x: 680, y: 160 },
      data: {
        label: 'Secondary Pump S-1',
        assetType: 'pump',
        status: 'operational',
        criticality: 'high',
        health: 87,
        parameters: [
          { name: 'Flow', value: '52.1', unit: 'm³/h' },
          { name: 'Delta P', value: '180', unit: 'kPa' },
          { name: 'VFD Speed', value: '72', unit: '%' },
        ],
        assetId: null,
      },
    },
    {
      id: 'pump-s2',
      type: 'assetNode',
      position: { x: 680, y: 320 },
      data: {
        label: 'Secondary Pump S-2',
        assetType: 'pump',
        status: 'standby',
        criticality: 'high',
        health: 84,
        parameters: [
          { name: 'Flow', value: '-', unit: 'm³/h' },
          { name: 'Delta P', value: '-', unit: 'kPa' },
          { name: 'VFD Speed', value: '0', unit: '%' },
        ],
        assetId: null,
      },
    },
    // AHU
    {
      id: 'ahu-1',
      type: 'assetNode',
      position: { x: 1000, y: 120 },
      data: {
        label: 'AHU-1 (Floor 1)',
        assetType: 'ahu',
        status: 'operational',
        criticality: 'medium',
        health: 93,
        parameters: [
          { name: 'Supply Air', value: '12.5', unit: '°C' },
          { name: 'Return Air', value: '24.1', unit: '°C' },
          { name: 'Fan Speed', value: '68', unit: '%' },
        ],
        assetId: null,
      },
    },
    {
      id: 'ahu-2',
      type: 'assetNode',
      position: { x: 1000, y: 320 },
      data: {
        label: 'AHU-2 (Floor 2)',
        assetType: 'ahu',
        status: 'operational',
        criticality: 'medium',
        health: 89,
        parameters: [
          { name: 'Supply Air', value: '13.1', unit: '°C' },
          { name: 'Return Air', value: '24.8', unit: '°C' },
          { name: 'Fan Speed', value: '72', unit: '%' },
        ],
        assetId: null,
      },
    },
    // VAVs
    {
      id: 'vav-101',
      type: 'assetNode',
      position: { x: 1320, y: 60 },
      data: {
        label: 'VAV-101',
        assetType: 'vav',
        status: 'operational',
        criticality: 'low',
        health: 96,
        parameters: [
          { name: 'Zone Temp', value: '22.4', unit: '°C' },
          { name: 'Airflow', value: '340', unit: 'CFM' },
        ],
        assetId: null,
      },
    },
    {
      id: 'vav-102',
      type: 'assetNode',
      position: { x: 1320, y: 180 },
      data: {
        label: 'VAV-102',
        assetType: 'vav',
        status: 'warning',
        criticality: 'low',
        health: 72,
        parameters: [
          { name: 'Zone Temp', value: '25.1', unit: '°C' },
          { name: 'Airflow', value: '410', unit: 'CFM' },
        ],
        assetId: null,
      },
    },
    {
      id: 'vav-201',
      type: 'assetNode',
      position: { x: 1320, y: 280 },
      data: {
        label: 'VAV-201',
        assetType: 'vav',
        status: 'operational',
        criticality: 'low',
        health: 94,
        parameters: [
          { name: 'Zone Temp', value: '22.8', unit: '°C' },
          { name: 'Airflow', value: '320', unit: 'CFM' },
        ],
        assetId: null,
      },
    },
    {
      id: 'vav-202',
      type: 'assetNode',
      position: { x: 1320, y: 400 },
      data: {
        label: 'VAV-202',
        assetType: 'vav',
        status: 'operational',
        criticality: 'low',
        health: 90,
        parameters: [
          { name: 'Zone Temp', value: '23.0', unit: '°C' },
          { name: 'Airflow', value: '295', unit: 'CFM' },
        ],
        assetId: null,
      },
    },
    // Sensors
    {
      id: 'sensor-chwst',
      type: 'sensorNode',
      position: { x: 230, y: 160 },
      data: {
        label: 'CHWST',
        parameter: 'Chilled Water Supply Temp',
        value: 6.2,
        unit: '°C',
        min: 4,
        max: 10,
        status: 'normal',
      },
    },
    {
      id: 'sensor-chwrt',
      type: 'sensorNode',
      position: { x: 230, y: 440 },
      data: {
        label: 'CHWRT',
        parameter: 'Chilled Water Return Temp',
        value: 12.8,
        unit: '°C',
        min: 8,
        max: 14,
        status: 'normal',
      },
    },
    {
      id: 'sensor-dp',
      type: 'sensorNode',
      position: { x: 850, y: 240 },
      data: {
        label: 'DP-001',
        parameter: 'Differential Pressure',
        value: 182,
        unit: 'kPa',
        min: 140,
        max: 210,
        status: 'normal',
      },
    },
    // Valves
    {
      id: 'valve-iso-1',
      type: 'valveNode',
      position: { x: 530, y: 200 },
      data: {
        label: 'ISO-01',
        state: 'open',
        valveType: 'isolation',
      },
    },
    {
      id: 'valve-bypass',
      type: 'valveNode',
      position: { x: 530, y: 380 },
      data: {
        label: 'BP-01',
        state: 'closed',
        valveType: 'bypass',
      },
    },
    // Junction points
    {
      id: 'junc-header',
      type: 'junctionNode',
      position: { x: 530, y: 100 },
      data: { label: 'Header' },
    },
  ],
  edges: [
    // Chiller → Sensor
    { id: 'e-ch1-sensor', source: 'chiller-1', target: 'sensor-chwst', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-sensor-ch1', source: 'sensor-chwrt', target: 'chiller-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    // Chiller → Header junction
    { id: 'e-ch1-junc', source: 'chiller-1', target: 'junc-header', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-ch2-junc', source: 'chiller-2', target: 'junc-header', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    // Header → Pumps
    { id: 'e-junc-p1', source: 'junc-header', target: 'pump-p1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-junc-p2', source: 'junc-header', target: 'pump-p2', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    // Pumps → Valve
    { id: 'e-p1-valve', source: 'pump-p1', target: 'valve-iso-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-p2-valve', source: 'pump-p2', target: 'valve-iso-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-p2-bypass', source: 'pump-p2', target: 'valve-bypass', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    // Valve → Secondary pumps
    { id: 'e-valve-s1', source: 'valve-iso-1', target: 'pump-s1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-valve-s2', source: 'valve-iso-1', target: 'pump-s2', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    // Secondary pumps → DP sensor
    { id: 'e-s1-dp', source: 'pump-s1', target: 'sensor-dp', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    // DP sensor → AHUs
    { id: 'e-dp-ahu1', source: 'sensor-dp', target: 'ahu-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-dp-ahu2', source: 'sensor-dp', target: 'ahu-2', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    // AHUs → VAVs
    { id: 'e-ahu1-vav1', source: 'ahu-1', target: 'vav-101', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-ahu1-vav2', source: 'ahu-1', target: 'vav-102', type: 'processFlowEdge', data: { flowStatus: 'warning' } },
    { id: 'e-ahu2-vav3', source: 'ahu-2', target: 'vav-201', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-ahu2-vav4', source: 'ahu-2', target: 'vav-202', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
  ],
};

// --- Electrical Distribution Template ---
export const electricalDistributionTemplate: DiagramTemplate = {
  id: 'tpl-electrical-dist',
  name: 'Electrical Distribution',
  description: 'Medium voltage electrical distribution system with transformer, switchgear, MCC and motor loads',
  diagramType: 'electrical',
  thumbnail: 'elec',
  nodes: [
    // HV Supply
    {
      id: 'hv-supply',
      type: 'assetNode',
      position: { x: 60, y: 280 },
      data: {
        label: 'HV Supply 11kV',
        assetType: 'supply',
        status: 'operational',
        criticality: 'critical',
        health: 99,
        parameters: [
          { name: 'Voltage', value: '11042', unit: 'V' },
          { name: 'Frequency', value: '50.01', unit: 'Hz' },
          { name: 'Power Factor', value: '0.96', unit: '' },
        ],
        assetId: null,
      },
    },
    // Transformer
    {
      id: 'tx-1',
      type: 'assetNode',
      position: { x: 320, y: 200 },
      data: {
        label: 'Transformer TX-1',
        assetType: 'transformer',
        status: 'operational',
        criticality: 'critical',
        health: 94,
        parameters: [
          { name: 'Primary V', value: '11042', unit: 'V' },
          { name: 'Secondary V', value: '415', unit: 'V' },
          { name: 'Oil Temp', value: '62', unit: '°C' },
          { name: 'Load', value: '78', unit: '%' },
        ],
        assetId: null,
      },
    },
    {
      id: 'tx-2',
      type: 'assetNode',
      position: { x: 320, y: 420 },
      data: {
        label: 'Transformer TX-2',
        assetType: 'transformer',
        status: 'standby',
        criticality: 'critical',
        health: 97,
        parameters: [
          { name: 'Primary V', value: '-', unit: 'V' },
          { name: 'Secondary V', value: '-', unit: 'V' },
          { name: 'Oil Temp', value: '38', unit: '°C' },
          { name: 'Load', value: '0', unit: '%' },
        ],
        assetId: null,
      },
    },
    // Main Switchgear
    {
      id: 'msb-1',
      type: 'assetNode',
      position: { x: 620, y: 200 },
      data: {
        label: 'MSB-1 Main Switchboard',
        assetType: 'switchgear',
        status: 'operational',
        criticality: 'critical',
        health: 91,
        parameters: [
          { name: 'Bus Voltage', value: '413', unit: 'V' },
          { name: 'Bus Current', value: '1240', unit: 'A' },
          { name: 'Power', value: '820', unit: 'kW' },
        ],
        assetId: null,
      },
    },
    // ATS
    {
      id: 'ats-1',
      type: 'valveNode',
      position: { x: 530, y: 340 },
      data: {
        label: 'ATS-1',
        state: 'open',
        valveType: 'ats',
      },
    },
    // MCC-1
    {
      id: 'mcc-1',
      type: 'assetNode',
      position: { x: 920, y: 100 },
      data: {
        label: 'MCC-1 Process Motors',
        assetType: 'mcc',
        status: 'operational',
        criticality: 'high',
        health: 88,
        parameters: [
          { name: 'Active Feeders', value: '12', unit: '/16' },
          { name: 'Total Load', value: '340', unit: 'kW' },
        ],
        assetId: null,
      },
    },
    {
      id: 'mcc-2',
      type: 'assetNode',
      position: { x: 920, y: 320 },
      data: {
        label: 'MCC-2 Utility Motors',
        assetType: 'mcc',
        status: 'operational',
        criticality: 'high',
        health: 85,
        parameters: [
          { name: 'Active Feeders', value: '8', unit: '/12' },
          { name: 'Total Load', value: '210', unit: 'kW' },
        ],
        assetId: null,
      },
    },
    // Motors
    {
      id: 'motor-m1',
      type: 'assetNode',
      position: { x: 1240, y: 40 },
      data: {
        label: 'Motor M-101',
        assetType: 'motor',
        status: 'operational',
        criticality: 'medium',
        health: 82,
        parameters: [
          { name: 'Current', value: '87', unit: 'A' },
          { name: 'Vibration', value: '2.8', unit: 'mm/s' },
          { name: 'Temp', value: '68', unit: '°C' },
        ],
        assetId: null,
      },
    },
    {
      id: 'motor-m2',
      type: 'assetNode',
      position: { x: 1240, y: 160 },
      data: {
        label: 'Motor M-102',
        assetType: 'motor',
        status: 'warning',
        criticality: 'high',
        health: 64,
        parameters: [
          { name: 'Current', value: '95', unit: 'A' },
          { name: 'Vibration', value: '7.2', unit: 'mm/s' },
          { name: 'Temp', value: '82', unit: '°C' },
        ],
        assetId: null,
      },
    },
    {
      id: 'motor-m3',
      type: 'assetNode',
      position: { x: 1240, y: 280 },
      data: {
        label: 'Motor M-201',
        assetType: 'motor',
        status: 'operational',
        criticality: 'medium',
        health: 90,
        parameters: [
          { name: 'Current', value: '45', unit: 'A' },
          { name: 'Vibration', value: '1.9', unit: 'mm/s' },
          { name: 'Temp', value: '55', unit: '°C' },
        ],
        assetId: null,
      },
    },
    {
      id: 'motor-m4',
      type: 'assetNode',
      position: { x: 1240, y: 400 },
      data: {
        label: 'Motor M-202',
        assetType: 'motor',
        status: 'operational',
        criticality: 'low',
        health: 93,
        parameters: [
          { name: 'Current', value: '22', unit: 'A' },
          { name: 'Vibration', value: '1.2', unit: 'mm/s' },
          { name: 'Temp', value: '48', unit: '°C' },
        ],
        assetId: null,
      },
    },
    // Sensors
    {
      id: 'sensor-pf',
      type: 'sensorNode',
      position: { x: 190, y: 240 },
      data: {
        label: 'PF-MTR',
        parameter: 'Power Factor',
        value: 0.96,
        unit: '',
        min: 0.9,
        max: 1.0,
        status: 'normal',
      },
    },
    {
      id: 'sensor-vib-m2',
      type: 'sensorNode',
      position: { x: 1400, y: 140 },
      data: {
        label: 'VIB-102',
        parameter: 'Vibration',
        value: 7.2,
        unit: 'mm/s',
        min: 0,
        max: 5,
        status: 'alarm',
      },
    },
    // Emergency Generator
    {
      id: 'gen-1',
      type: 'assetNode',
      position: { x: 320, y: 540 },
      data: {
        label: 'Emergency Gen G-1',
        assetType: 'generator',
        status: 'standby',
        criticality: 'critical',
        health: 86,
        parameters: [
          { name: 'Fuel Level', value: '82', unit: '%' },
          { name: 'Last Test', value: '3d', unit: 'ago' },
        ],
        assetId: null,
      },
    },
  ],
  edges: [
    // HV → Transformer
    { id: 'e-hv-tx1', source: 'hv-supply', target: 'tx-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-hv-tx2', source: 'hv-supply', target: 'tx-2', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    // HV → PF sensor
    { id: 'e-hv-pf', source: 'hv-supply', target: 'sensor-pf', type: 'signalEdge' },
    // Transformer → MSB
    { id: 'e-tx1-msb', source: 'tx-1', target: 'msb-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-tx2-ats', source: 'tx-2', target: 'ats-1', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    { id: 'e-ats-msb', source: 'ats-1', target: 'msb-1', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    // MSB → MCC
    { id: 'e-msb-mcc1', source: 'msb-1', target: 'mcc-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-msb-mcc2', source: 'msb-1', target: 'mcc-2', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    // MCC → Motors
    { id: 'e-mcc1-m1', source: 'mcc-1', target: 'motor-m1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-mcc1-m2', source: 'mcc-1', target: 'motor-m2', type: 'processFlowEdge', data: { flowStatus: 'warning' } },
    { id: 'e-mcc2-m3', source: 'mcc-2', target: 'motor-m3', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-mcc2-m4', source: 'mcc-2', target: 'motor-m4', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    // Vibration sensor on M-102
    { id: 'e-m2-vib', source: 'motor-m2', target: 'sensor-vib-m2', type: 'signalEdge' },
    // Gen backup path
    { id: 'e-gen-ats', source: 'gen-1', target: 'ats-1', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
  ],
};

// --- Compressed Air System Template ---
export const compressedAirTemplate: DiagramTemplate = {
  id: 'tpl-compressed-air',
  name: 'Compressed Air System',
  description: 'Industrial compressed air system with compressors, dryer, receiver and distribution network',
  diagramType: 'process',
  thumbnail: 'air',
  nodes: [
    // Compressors
    {
      id: 'comp-1',
      type: 'assetNode',
      position: { x: 80, y: 120 },
      data: {
        label: 'Compressor C-1',
        assetType: 'compressor',
        status: 'operational',
        criticality: 'critical',
        health: 88,
        parameters: [
          { name: 'Discharge P', value: '7.2', unit: 'bar' },
          { name: 'Discharge T', value: '92', unit: '°C' },
          { name: 'Load', value: '82', unit: '%' },
          { name: 'Run Hours', value: '18420', unit: 'h' },
        ],
        assetId: null,
      },
    },
    {
      id: 'comp-2',
      type: 'assetNode',
      position: { x: 80, y: 340 },
      data: {
        label: 'Compressor C-2',
        assetType: 'compressor',
        status: 'operational',
        criticality: 'critical',
        health: 79,
        parameters: [
          { name: 'Discharge P', value: '7.1', unit: 'bar' },
          { name: 'Discharge T', value: '88', unit: '°C' },
          { name: 'Load', value: '68', unit: '%' },
          { name: 'Run Hours', value: '22350', unit: 'h' },
        ],
        assetId: null,
      },
    },
    {
      id: 'comp-3',
      type: 'assetNode',
      position: { x: 80, y: 540 },
      data: {
        label: 'Compressor C-3',
        assetType: 'compressor',
        status: 'standby',
        criticality: 'critical',
        health: 95,
        parameters: [
          { name: 'Discharge P', value: '-', unit: 'bar' },
          { name: 'Discharge T', value: '-', unit: '°C' },
          { name: 'Load', value: '0', unit: '%' },
          { name: 'Run Hours', value: '8100', unit: 'h' },
        ],
        assetId: null,
      },
    },
    // Dryer
    {
      id: 'dryer-1',
      type: 'assetNode',
      position: { x: 420, y: 200 },
      data: {
        label: 'Refrigerant Dryer D-1',
        assetType: 'dryer',
        status: 'operational',
        criticality: 'high',
        health: 92,
        parameters: [
          { name: 'Inlet T', value: '38', unit: '°C' },
          { name: 'Dew Point', value: '3', unit: '°C' },
          { name: 'Pressure Drop', value: '0.15', unit: 'bar' },
        ],
        assetId: null,
      },
    },
    // Filters
    {
      id: 'filter-1',
      type: 'assetNode',
      position: { x: 420, y: 400 },
      data: {
        label: 'Particulate Filter F-1',
        assetType: 'filter',
        status: 'operational',
        criticality: 'medium',
        health: 85,
        parameters: [
          { name: 'DP', value: '0.08', unit: 'bar' },
          { name: 'DP Alarm', value: '>0.3', unit: 'bar' },
        ],
        assetId: null,
      },
    },
    // Receiver
    {
      id: 'receiver-1',
      type: 'assetNode',
      position: { x: 740, y: 240 },
      data: {
        label: 'Air Receiver R-1',
        assetType: 'receiver',
        status: 'operational',
        criticality: 'high',
        health: 96,
        parameters: [
          { name: 'Pressure', value: '7.0', unit: 'bar' },
          { name: 'Capacity', value: '5000', unit: 'L' },
          { name: 'Drain', value: 'Auto', unit: '' },
        ],
        assetId: null,
      },
    },
    // Distribution valves
    {
      id: 'valve-dist-1',
      type: 'valveNode',
      position: { x: 1000, y: 120 },
      data: {
        label: 'DV-01',
        state: 'open',
        valveType: 'distribution',
      },
    },
    {
      id: 'valve-dist-2',
      type: 'valveNode',
      position: { x: 1000, y: 280 },
      data: {
        label: 'DV-02',
        state: 'open',
        valveType: 'distribution',
      },
    },
    {
      id: 'valve-dist-3',
      type: 'valveNode',
      position: { x: 1000, y: 440 },
      data: {
        label: 'DV-03',
        state: 'closed',
        valveType: 'distribution',
      },
    },
    // End users
    {
      id: 'user-prod',
      type: 'assetNode',
      position: { x: 1280, y: 60 },
      data: {
        label: 'Production Line',
        assetType: 'enduser',
        status: 'operational',
        criticality: 'high',
        health: 90,
        parameters: [
          { name: 'Air Demand', value: '2.4', unit: 'm³/min' },
          { name: 'Pressure', value: '6.2', unit: 'bar' },
        ],
        assetId: null,
      },
    },
    {
      id: 'user-pkg',
      type: 'assetNode',
      position: { x: 1280, y: 220 },
      data: {
        label: 'Packaging Area',
        assetType: 'enduser',
        status: 'operational',
        criticality: 'medium',
        health: 88,
        parameters: [
          { name: 'Air Demand', value: '1.8', unit: 'm³/min' },
          { name: 'Pressure', value: '6.0', unit: 'bar' },
        ],
        assetId: null,
      },
    },
    {
      id: 'user-tools',
      type: 'assetNode',
      position: { x: 1280, y: 380 },
      data: {
        label: 'Workshop Tools',
        assetType: 'enduser',
        status: 'operational',
        criticality: 'low',
        health: 95,
        parameters: [
          { name: 'Air Demand', value: '0.6', unit: 'm³/min' },
          { name: 'Pressure', value: '5.8', unit: 'bar' },
        ],
        assetId: null,
      },
    },
    // Sensors
    {
      id: 'sensor-dp1',
      type: 'sensorNode',
      position: { x: 580, y: 160 },
      data: {
        label: 'PT-101',
        parameter: 'Line Pressure',
        value: 7.0,
        unit: 'bar',
        min: 6.0,
        max: 8.0,
        status: 'normal',
      },
    },
    {
      id: 'sensor-dp2',
      type: 'sensorNode',
      position: { x: 580, y: 340 },
      data: {
        label: 'PT-102',
        parameter: 'Filter DP',
        value: 0.08,
        unit: 'bar',
        min: 0,
        max: 0.3,
        status: 'normal',
      },
    },
    {
      id: 'sensor-flow',
      type: 'sensorNode',
      position: { x: 1140, y: 180 },
      data: {
        label: 'FT-101',
        parameter: 'Total Flow',
        value: 4.8,
        unit: 'm³/min',
        min: 0,
        max: 8,
        status: 'normal',
      },
    },
    // Junction
    {
      id: 'junc-manifold',
      type: 'junctionNode',
      position: { x: 1000, y: 280 },
      data: { label: 'Manifold' },
    },
  ],
  edges: [
    // Compressors → Dryer/Filter
    { id: 'e-c1-dryer', source: 'comp-1', target: 'dryer-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-c2-dryer', source: 'comp-2', target: 'dryer-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-c3-dryer', source: 'comp-3', target: 'dryer-1', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    { id: 'e-dryer-filter', source: 'dryer-1', target: 'filter-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    // Sensors
    { id: 'e-dryer-pt1', source: 'dryer-1', target: 'sensor-dp1', type: 'signalEdge' },
    { id: 'e-filter-pt2', source: 'filter-1', target: 'sensor-dp2', type: 'signalEdge' },
    // → Receiver
    { id: 'e-pt1-recv', source: 'sensor-dp1', target: 'receiver-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-pt2-recv', source: 'sensor-dp2', target: 'receiver-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    // Receiver → Distribution
    { id: 'e-recv-dist1', source: 'receiver-1', target: 'valve-dist-1', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-recv-dist2', source: 'receiver-1', target: 'valve-dist-2', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-recv-dist3', source: 'receiver-1', target: 'valve-dist-3', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    // Distribution → End users
    { id: 'e-dist1-prod', source: 'valve-dist-1', target: 'user-prod', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-dist2-pkg', source: 'valve-dist-2', target: 'user-pkg', type: 'processFlowEdge', data: { flowStatus: 'normal' } },
    { id: 'e-dist3-tools', source: 'valve-dist-3', target: 'user-tools', type: 'processFlowEdge', data: { flowStatus: 'inactive' } },
    // Flow sensor
    { id: 'e-dist1-flow', source: 'valve-dist-1', target: 'sensor-flow', type: 'signalEdge' },
  ],
};

// --- All Templates ---
export const diagramTemplates: DiagramTemplate[] = [
  chilledWaterTemplate,
  electricalDistributionTemplate,
  compressedAirTemplate,
];

// --- Diagram type metadata ---
export const diagramTypeMeta: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  piping: { label: 'Piping', color: 'text-cyan-600', bgColor: 'bg-cyan-50 dark:bg-cyan-950/40', icon: 'Droplets' },
  electrical: { label: 'Electrical', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/40', icon: 'Zap' },
  process: { label: 'Process', color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/40', icon: 'FlaskConical' },
  hvac: { label: 'HVAC', color: 'text-sky-600', bgColor: 'bg-sky-50 dark:bg-sky-950/40', icon: 'Thermometer' },
  control: { label: 'Control', color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-950/40', icon: 'Settings' },
  safety: { label: 'Safety', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/40', icon: 'Shield' },
};
