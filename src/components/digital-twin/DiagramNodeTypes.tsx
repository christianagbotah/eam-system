'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type EdgeProps, getBezierPath } from 'reactflow';
import {
  Cpu, Thermometer, Gauge, Activity, GitBranch,
  ChevronDown, ChevronUp, Droplets, Zap, Wind, FlaskConical,
  Settings, Shield, CircleDot, Filter, Fuel, Warehouse,
  Radio, Cog, Box, Layers, AlertTriangle,
} from 'lucide-react';

// ============================================================================
// SHARED STYLES & HELPERS
// ============================================================================

const statusColors: Record<string, string> = {
  operational: '#10b981',
  normal: '#10b981',
  active: '#10b981',
  online: '#10b981',
  running: '#10b981',
  standby: '#f59e0b',
  warning: '#f59e0b',
  stopped: '#6b7280',
  offline: '#6b7280',
  inactive: '#6b7280',
  critical: '#ef4444',
  alarm: '#ef4444',
  error: '#ef4444',
  fault: '#ef4444',
};

const criticalityColors: Record<string, string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

const assetTypeIcons: Record<string, React.ElementType> = {
  chiller: Wind,
  pump: Droplets,
  transformer: Zap,
  switchgear: Zap,
  mcc: Cpu,
  motor: Cog,
  compressor: Wind,
  dryer: Thermometer,
  filter: Filter,
  receiver: Warehouse,
  ahu: Wind,
  vav: Settings,
  supply: Zap,
  generator: Zap,
  enduser: Box,
  valve: ChevronDown,
  default: Activity,
};

const nodeBaseStyle: React.CSSProperties = {
  background: '#1e293b',
  borderRadius: '12px',
  border: '1px solid rgba(148,163,184,0.15)',
  minWidth: '180px',
  fontFamily: 'inherit',
  backdropFilter: 'blur(12px)',
};

function HealthBar({ health }: { health: number }) {
  const color = health >= 80 ? '#10b981' : health >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(148,163,184,0.15)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${health}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{health}%</span>
    </div>
  );
}

// ============================================================================
// ASSET NODE
// ============================================================================

export interface AssetNodeData {
  label: string;
  assetType?: string;
  status?: string;
  criticality?: string;
  health?: number;
  parameters?: { name: string; value: string; unit: string }[];
  assetId?: string | null;
  [key: string]: unknown;
}

function AssetNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AssetNodeData;
  const Icon = assetTypeIcons[nodeData.assetType || 'default'] || Activity;
  const statusColor = statusColors[nodeData.status || 'operational'] || '#10b981';
  const critColor = criticalityColors[nodeData.criticality || 'medium'] || '#3b82f6';

  return (
    <div
      style={{
        ...nodeBaseStyle,
        borderColor: selected ? '#10b981' : `rgba(148,163,184,0.15)`,
        boxShadow: selected ? '0 0 20px rgba(16,185,129,0.2)' : '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: statusColor, border: '2px solid #1e293b', width: 10, height: 10 }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${statusColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color: statusColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nodeData.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', background: statusColor,
              boxShadow: nodeData.status === 'warning' ? `0 0 6px ${statusColor}` : 'none',
              animation: nodeData.status === 'warning' ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' }}>
              {nodeData.status || 'operational'}
            </span>
            <div style={{ width: 1, height: 10, background: 'rgba(148,163,184,0.2)' }} />
            <span style={{ fontSize: 10, color: critColor, textTransform: 'uppercase', fontWeight: 600 }}>
              {nodeData.criticality || 'medium'}
            </span>
          </div>
        </div>
      </div>

      {/* Health bar */}
      {nodeData.health !== undefined && (
        <div style={{ padding: '0 12px 6px' }}>
          <HealthBar health={nodeData.health} />
        </div>
      )}

      {/* Parameters */}
      {nodeData.parameters && nodeData.parameters.length > 0 && (
        <div style={{
          padding: '6px 12px 8px', borderTop: '1px solid rgba(148,163,184,0.08)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px',
        }}>
          {nodeData.parameters.slice(0, 4).map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#64748b' }}>{p.name}</span>
              <span style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 600, fontFamily: 'monospace' }}>
                {p.value}{p.unit ? ` ${p.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: statusColor, border: '2px solid #1e293b', width: 10, height: 10 }} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export const AssetNode = memo(AssetNodeComponent);

// ============================================================================
// SENSOR NODE
// ============================================================================

export interface SensorNodeData {
  label: string;
  parameter: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: 'normal' | 'warning' | 'alarm';
  [key: string]: unknown;
}

function SensorNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SensorNodeData;
  const statusColor = statusColors[nodeData.status] || '#10b981';
  const isAlarm = nodeData.status === 'alarm';
  const isWarning = nodeData.status === 'warning';

  const percentage = nodeData.max !== nodeData.min
    ? Math.min(100, Math.max(0, ((nodeData.value - nodeData.min) / (nodeData.max - nodeData.min)) * 100))
    : 50;

  return (
    <div style={{
      ...nodeBaseStyle,
      minWidth: '140px',
      borderColor: isAlarm ? '#ef4444' : isWarning ? '#f59e0b' : selected ? '#10b981' : 'rgba(148,163,184,0.15)',
      boxShadow: isAlarm
        ? '0 0 16px rgba(239,68,68,0.3), inset 0 0 0 1px rgba(239,68,68,0.1)'
        : isWarning
          ? '0 0 12px rgba(245,158,11,0.2)'
          : selected
            ? '0 0 16px rgba(16,185,129,0.2)'
            : '0 4px 12px rgba(0,0,0,0.3)',
      animation: isAlarm ? 'sensorPulse 1.5s infinite' : 'none',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: statusColor, border: '2px solid #1e293b', width: 8, height: 8 }} />

      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Radio size={12} style={{ color: statusColor }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.5 }}>{nodeData.label}</span>
        </div>

        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4 }}>{nodeData.parameter}</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
          <span style={{
            fontSize: 22, fontWeight: 700, fontFamily: 'monospace',
            color: statusColor,
          }}>
            {typeof nodeData.value === 'number' ? nodeData.value.toFixed(1) : nodeData.value}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{nodeData.unit}</span>
        </div>

        {/* Gauge bar */}
        <div style={{ height: 4, background: 'rgba(148,163,184,0.12)', borderRadius: 2, position: 'relative' }}>
          <div style={{
            height: '100%', width: `${percentage}%`, background: statusColor, borderRadius: 2,
            transition: 'width 0.5s',
          }} />
          <div style={{ position: 'absolute', top: -2, left: 0, width: 1, height: 8, background: '#475569', borderRadius: 0.5 }} />
          <div style={{ position: 'absolute', top: -2, right: 0, width: 1, height: 8, background: '#475569', borderRadius: 0.5 }} />
        </div>

        {isAlarm && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <AlertTriangle size={10} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>OUT OF RANGE</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: statusColor, border: '2px solid #1e293b', width: 8, height: 8 }} />

      <style>{`
        @keyframes sensorPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

export const SensorNode = memo(SensorNodeComponent);

// ============================================================================
// VALVE NODE
// ============================================================================

export interface ValveNodeData {
  label: string;
  state: 'open' | 'closed' | 'partial';
  valveType?: string;
  [key: string]: unknown;
}

function ValveNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ValveNodeData;
  const isOpen = nodeData.state === 'open';
  const isClosed = nodeData.state === 'closed';
  const color = isOpen ? '#10b981' : isClosed ? '#ef4444' : '#f59e0b';
  const Icon = isOpen ? ChevronUp : ChevronDown;

  return (
    <div style={{
      ...nodeBaseStyle,
      minWidth: '80px',
      borderColor: selected ? '#10b981' : `${color}40`,
      boxShadow: selected ? '0 0 16px rgba(16,185,129,0.2)' : '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: color, border: '2px solid #1e293b', width: 8, height: 8 }} />

      <div style={{ padding: '10px 14px', textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `${color}15`, border: `2px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 6px', position: 'relative',
        }}>
          <Icon size={20} style={{ color }} />
          <div style={{
            position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
            width: 8, height: 8, borderRadius: '50%',
            background: color,
          }} />
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0' }}>{nodeData.label}</div>
        <div style={{
          fontSize: 9, fontWeight: 600, textTransform: 'uppercase', marginTop: 2,
          color,
        }}>
          {nodeData.state}
        </div>
        {nodeData.valveType && (
          <div style={{ fontSize: 8, color: '#64748b', marginTop: 1, textTransform: 'capitalize' }}>
            {nodeData.valveType}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: color, border: '2px solid #1e293b', width: 8, height: 8 }} />
    </div>
  );
}

export const ValveNode = memo(ValveNodeComponent);

// ============================================================================
// JUNCTION NODE
// ============================================================================

export interface JunctionNodeData {
  label?: string;
  [key: string]: unknown;
}

function JunctionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as JunctionNodeData;

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#64748b', border: '2px solid #1e293b', width: 8, height: 8 }} />
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: '#334155',
        border: `2px solid ${selected ? '#10b981' : '#475569'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: selected ? '0 0 12px rgba(16,185,129,0.3)' : '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        <CircleDot size={10} style={{ color: '#94a3b8' }} />
      </div>
      {nodeData.label && (
        <div style={{
          position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap',
          background: '#1e293b', padding: '1px 6px', borderRadius: 4,
        }}>
          {nodeData.label}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#64748b', border: '2px solid #1e293b', width: 8, height: 8 }} />
    </>
  );
}

export const JunctionNode = memo(JunctionNodeComponent);

// ============================================================================
// PUMP NODE — Industrial pump symbol
// ============================================================================

export interface PumpNodeData {
  label: string;
  pumpType?: 'centrifugal' | 'reciprocating' | 'gear' | 'diaphragm' | 'submersible';
  status?: 'running' | 'stopped' | 'fault';
  health?: number;
  flowRate?: number;
  head?: number;
  [key: string]: unknown;
}

function PumpNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as PumpNodeData;
  const statusColor = statusColors[nodeData.status || 'stopped'] || '#6b7280';
  const isRunning = nodeData.status === 'running';
  const isFault = nodeData.status === 'fault';

  return (
    <div style={{
      ...nodeBaseStyle,
      minWidth: '160px',
      borderColor: isFault ? '#ef4444' : selected ? '#10b981' : `rgba(148,163,184,0.15)`,
      boxShadow: isFault
        ? '0 0 16px rgba(239,68,68,0.25)'
        : selected
          ? '0 0 20px rgba(16,185,129,0.2)'
          : '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: statusColor, border: '2px solid #1e293b', width: 10, height: 10 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 6px' }}>
        {/* Pump symbol — circle with rotating animation */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `${statusColor}15`, border: `2px solid ${statusColor}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', flexShrink: 0,
        }}>
          <div style={{
            animation: isRunning ? 'pumpSpin 2s linear infinite' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Pump impeller blades */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill={statusColor} opacity={0.6} />
              <path d="M12 2C12 2 14 8 12 9C10 10 4 8 4 8" stroke={statusColor} strokeWidth="2" strokeLinecap="round" />
              <path d="M12 2C12 2 14 8 12 9C10 10 4 8 4 8" stroke={statusColor} strokeWidth="2" strokeLinecap="round" transform="rotate(120 12 12)" />
              <path d="M12 2C12 2 14 8 12 9C10 10 4 8 4 8" stroke={statusColor} strokeWidth="2" strokeLinecap="round" transform="rotate(240 12 12)" />
            </svg>
          </div>
          {/* Status dot */}
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 10, height: 10, borderRadius: '50%',
            background: statusColor,
            boxShadow: isRunning ? `0 0 6px ${statusColor}` : 'none',
            animation: isRunning ? 'pulse 2s infinite' : 'none',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nodeData.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: statusColor }}>
              {nodeData.status || 'stopped'}
            </span>
            <span style={{ fontSize: 8, color: '#64748b', textTransform: 'capitalize' }}>
              {nodeData.pumpType || 'centrifugal'}
            </span>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div style={{
        padding: '6px 12px 8px', borderTop: '1px solid rgba(148,163,184,0.08)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px',
      }}>
        {nodeData.flowRate !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#64748b' }}>Flow</span>
            <span style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 600, fontFamily: 'monospace' }}>{nodeData.flowRate} m³/h</span>
          </div>
        )}
        {nodeData.head !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#64748b' }}>Head</span>
            <span style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 600, fontFamily: 'monospace' }}>{nodeData.head} m</span>
          </div>
        )}
      </div>

      {/* Health */}
      {nodeData.health !== undefined && (
        <div style={{ padding: '0 12px 8px' }}>
          <HealthBar health={nodeData.health} />
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: statusColor, border: '2px solid #1e293b', width: 10, height: 10 }} />

      <style>{`
        @keyframes pumpSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export const PumpNode = memo(PumpNodeComponent);

// ============================================================================
// TANK NODE — Storage tank with fill level
// ============================================================================

export interface TankNodeData {
  label: string;
  fillLevel?: number; // 0-100
  capacity?: number;
  temperature?: number;
  levelStatus?: 'high' | 'normal' | 'low';
  medium?: string;
  [key: string]: unknown;
}

function TankNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TankNodeData;
  const fillLevel = nodeData.fillLevel ?? 0;
  const levelStatus = nodeData.levelStatus || 'normal';

  const levelColorMap: Record<string, string> = { high: '#f59e0b', normal: '#10b981', low: '#ef4444' };
  const levelColor = levelColorMap[levelStatus] || '#10b981';
  const tempColor = (nodeData.temperature ?? 0) > 60 ? '#ef4444' : (nodeData.temperature ?? 0) > 40 ? '#f59e0b' : '#10b981';

  return (
    <div style={{
      ...nodeBaseStyle,
      minWidth: '140px',
      borderColor: selected ? '#10b981' : levelStatus === 'low' ? '#ef444480' : 'rgba(148,163,184,0.15)',
      boxShadow: selected ? '0 0 20px rgba(16,185,129,0.2)' : levelStatus === 'low' ? '0 0 12px rgba(239,68,68,0.15)' : '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: levelColor, border: '2px solid #1e293b', width: 8, height: 8 }} />

      <div style={{ padding: '10px 12px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Warehouse size={14} style={{ color: levelColor }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nodeData.label}
          </span>
          {nodeData.medium && (
            <span style={{ fontSize: 8, color: '#64748b', background: 'rgba(148,163,184,0.1)', padding: '1px 6px', borderRadius: 4 }}>
              {nodeData.medium}
            </span>
          )}
        </div>

        {/* Tank visual */}
        <div style={{
          width: '100%', height: 60, borderRadius: 8,
          border: '2px solid rgba(148,163,184,0.2)',
          background: 'rgba(15,23,42,0.6)',
          position: 'relative', overflow: 'hidden',
          marginBottom: 6,
        }}>
          {/* Fill level bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${fillLevel}%`,
            background: `linear-gradient(to top, ${levelColor}60, ${levelColor}30)`,
            borderTop: `2px solid ${levelColor}80`,
            transition: 'height 0.5s',
          }} />
          {/* Level markers */}
          {[25, 50, 75].map((mark) => (
            <div key={mark} style={{
              position: 'absolute', left: 4, right: 4,
              bottom: `${mark}%`, height: 1,
              background: 'rgba(148,163,184,0.1)',
            }} />
          ))}
          {/* Fill percentage */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: levelColor,
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}>
            {fillLevel}%
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {/* Level status badge */}
          <div style={{
            fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
            color: levelColor, background: `${levelColor}15`,
            padding: '2px 8px', borderRadius: 4,
            border: `1px solid ${levelColor}30`,
          }}>
            {levelStatus}
          </div>
          {nodeData.capacity !== undefined && (
            <span style={{ fontSize: 9, color: '#94a3b8' }}>
              {nodeData.capacity} L
            </span>
          )}
          {nodeData.temperature !== undefined && (
            <span style={{ fontSize: 9, color: tempColor, fontWeight: 600, fontFamily: 'monospace' }}>
              <Thermometer size={8} style={{ verticalAlign: -1, marginRight: 2 }} />
              {nodeData.temperature}°C
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: levelColor, border: '2px solid #1e293b', width: 8, height: 8 }} />
    </div>
  );
}

export const TankNode = memo(TankNodeComponent);

// ============================================================================
// MOTOR NODE — Electric motor
// ============================================================================

export interface MotorNodeData {
  label: string;
  rpm?: number;
  powerRating?: number;
  status?: 'running' | 'stopped' | 'fault';
  vibration?: number;
  temperature?: number;
  current?: number;
  [key: string]: unknown;
}

function MotorNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as MotorNodeData;
  const statusColor = statusColors[nodeData.status || 'stopped'] || '#6b7280';
  const isRunning = nodeData.status === 'running';
  const isFault = nodeData.status === 'fault';

  const vibColor = (nodeData.vibration ?? 0) > 7 ? '#ef4444' : (nodeData.vibration ?? 0) > 4 ? '#f59e0b' : '#10b981';
  const tempColor = (nodeData.temperature ?? 0) > 80 ? '#ef4444' : (nodeData.temperature ?? 0) > 65 ? '#f59e0b' : '#10b981';

  return (
    <div style={{
      ...nodeBaseStyle,
      minWidth: '160px',
      borderColor: isFault ? '#ef4444' : selected ? '#10b981' : 'rgba(148,163,184,0.15)',
      boxShadow: isFault
        ? '0 0 16px rgba(239,68,68,0.25)'
        : selected
          ? '0 0 20px rgba(16,185,129,0.2)'
          : '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: statusColor, border: '2px solid #1e293b', width: 10, height: 10 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 6px' }}>
        {/* Motor symbol — gear/cog */}
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${statusColor}15`, border: `2px solid ${statusColor}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', flexShrink: 0,
        }}>
          <Cog size={20} style={{ color: statusColor, animation: isRunning ? 'motorSpin 1.5s linear infinite' : 'none' }} />
          {/* Status dot */}
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 10, height: 10, borderRadius: '50%',
            background: statusColor,
            boxShadow: isRunning ? `0 0 6px ${statusColor}` : 'none',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nodeData.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: statusColor }}>
              {nodeData.status || 'stopped'}
            </span>
            <div style={{ width: 1, height: 8, background: 'rgba(148,163,184,0.2)' }} />
            <Zap size={8} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' }}>
              {nodeData.powerRating ?? 0} kW
            </span>
          </div>
        </div>
      </div>

      {/* RPM + Vibration */}
      <div style={{
        padding: '6px 12px 8px', borderTop: '1px solid rgba(148,163,184,0.08)',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px',
      }}>
        {nodeData.rpm !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#64748b' }}>RPM</span>
            <span style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 600, fontFamily: 'monospace' }}>{nodeData.rpm}</span>
          </div>
        )}
        {nodeData.current !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#64748b' }}>I</span>
            <span style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 600, fontFamily: 'monospace' }}>{nodeData.current}A</span>
          </div>
        )}
        {nodeData.vibration !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#64748b' }}>Vib</span>
            <span style={{ fontSize: 9, color: vibColor, fontWeight: 600, fontFamily: 'monospace' }}>{nodeData.vibration}</span>
          </div>
        )}
      </div>

      {/* Vibration bar */}
      {nodeData.vibration !== undefined && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(148,163,184,0.12)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (nodeData.vibration / 10) * 100)}%`,
                background: vibColor, borderRadius: 2,
              }} />
            </div>
            <span style={{ fontSize: 8, color: vibColor, fontWeight: 600 }}>mm/s</span>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: statusColor, border: '2px solid #1e293b', width: 10, height: 10 }} />

      <style>{`
        @keyframes motorSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export const MotorNode = memo(MotorNodeComponent);

// ============================================================================
// PIPE NODE — Pipe segment with animated flow
// ============================================================================

export interface PipeNodeData {
  label: string;
  diameter?: string;
  material?: string;
  flowRate?: number;
  pressure?: number;
  flowDirection?: 'forward' | 'reverse';
  [key: string]: unknown;
}

function PipeNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as PipeNodeData;
  const pressureColor = (nodeData.pressure ?? 0) > 10 ? '#ef4444' : (nodeData.pressure ?? 0) > 6 ? '#f59e0b' : '#06b6d4';

  return (
    <div style={{
      ...nodeBaseStyle,
      minWidth: '180px',
      borderColor: selected ? '#06b6d4' : 'rgba(148,163,184,0.15)',
      boxShadow: selected ? '0 0 20px rgba(6,182,212,0.2)' : '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#06b6d4', border: '2px solid #1e293b', width: 10, height: 10 }} />

      <div style={{ padding: '8px 12px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Droplets size={12} style={{ color: '#06b6d4' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', flex: 1 }}>{nodeData.label}</span>
          {nodeData.diameter && (
            <span style={{ fontSize: 8, color: '#94a3b8', background: 'rgba(6,182,212,0.1)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
              DN{nodeData.diameter}
            </span>
          )}
        </div>

        {/* Animated pipe */}
        <div style={{
          width: '100%', height: 12, borderRadius: 6,
          background: 'rgba(6,182,212,0.08)',
          border: '1px solid rgba(6,182,212,0.2)',
          position: 'relative', overflow: 'hidden',
          marginBottom: 6,
        }}>
          {/* Flow animation */}
          <div style={{
            position: 'absolute', inset: 2, borderRadius: 4,
            background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)',
            backgroundSize: '20px 100%',
            animation: nodeData.flowRate ? 'pipeFlow 1s linear infinite' : 'none',
          }} />
          {/* Direction arrow */}
          <div style={{
            position: 'absolute', top: '50%', left: nodeData.flowDirection === 'reverse' ? '15%' : '75%', transform: 'translateY(-50%)',
            color: '#06b6d4', fontSize: 8,
            opacity: nodeData.flowRate ? 1 : 0.3,
          }}>
            {nodeData.flowDirection === 'reverse' ? '◀' : '▶'}
          </div>
        </div>

        {/* Specs row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px',
          borderTop: '1px solid rgba(148,163,184,0.08)', paddingTop: 6,
        }}>
          {nodeData.flowRate !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#64748b' }}>Flow</span>
              <span style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 600, fontFamily: 'monospace' }}>{nodeData.flowRate} m³/h</span>
            </div>
          )}
          {nodeData.pressure !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#64748b' }}>P</span>
              <span style={{ fontSize: 9, color: pressureColor, fontWeight: 600, fontFamily: 'monospace' }}>{nodeData.pressure} bar</span>
            </div>
          )}
          {nodeData.material && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#64748b' }}>Mat</span>
              <span style={{ fontSize: 8, color: '#94a3b8', textTransform: 'capitalize' }}>{nodeData.material}</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#06b6d4', border: '2px solid #1e293b', width: 10, height: 10 }} />

      <style>{`
        @keyframes pipeFlow {
          0% { background-position: -20px 0; }
          100% { background-position: 20px 0; }
        }
      `}</style>
    </div>
  );
}

export const PipeNode = memo(PipeNodeComponent);

// ============================================================================
// CUSTOM EDGE TYPES
// ============================================================================

// --- Process Flow Edge (animated dots) ---

export interface ProcessFlowEdgeData {
  flowStatus?: 'normal' | 'warning' | 'alarm' | 'inactive';
  label?: string;
  [key: string]: unknown;
}

function ProcessFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as ProcessFlowEdgeData | undefined;
  const flowStatus = edgeData?.flowStatus || 'normal';
  const isActive = flowStatus !== 'inactive';

  const colorMap: Record<string, string> = {
    normal: '#10b981',
    warning: '#f59e0b',
    alarm: '#ef4444',
    inactive: '#475569',
  };
  const edgeColor = colorMap[flowStatus] || '#10b981';

  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  return (
    <>
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={6}
          strokeOpacity={0.15}
          style={{ filter: 'blur(3px)' }}
        />
      )}
      <path
        d={edgePath}
        fill="none"
        stroke={edgeColor}
        strokeWidth={isActive ? 2.5 : 1.5}
        strokeOpacity={isActive ? 0.7 : 0.3}
        strokeDasharray={isActive ? undefined : '6 4'}
      />
      {isActive && (
        <circle r="4" fill={edgeColor} filter={`drop-shadow(0 0 3px ${edgeColor})`}>
          <animateMotion
            dur={`${flowStatus === 'alarm' ? '1s' : flowStatus === 'warning' ? '2s' : '3s'}`}
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#10b981"
          strokeWidth={6}
          strokeOpacity={0.15}
        />
      )}
      {edgeData?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 8}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={10}
          fontFamily="inherit"
          fontWeight={600}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {edgeData.label}
        </text>
      )}
    </>
  );
}

// --- Signal Edge (dashed) ---

function SignalEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        strokeOpacity={0.6}
      />
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={5}
          strokeOpacity={0.15}
        />
      )}
    </>
  );
}

// --- Pipe Edge (thick with gradient) ---

function PipeEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  const edgeId = `pipe-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <>
      <defs>
        <linearGradient id={edgeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(6,182,212,0.15)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d={edgePath}
        fill="none"
        stroke={`url(#${edgeId})`}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={10}
          strokeOpacity={0.12}
        />
      )}
    </>
  );
}

// ============================================================================
// EXPORT: Node & Edge type maps for ReactFlow
// ============================================================================

export const nodeTypes = {
  assetNode: AssetNode,
  sensorNode: SensorNode,
  valveNode: ValveNode,
  junctionNode: JunctionNode,
  pumpNode: PumpNode,
  tankNode: TankNode,
  motorNode: MotorNode,
  pipeNode: PipeNode,
};

export const edgeTypes = {
  processFlowEdge: ProcessFlowEdge,
  signalEdge: SignalEdge,
  pipeEdge: PipeEdge,
};

export type CustomNodeTypes = typeof nodeTypes;
export type CustomEdgeTypes = typeof edgeTypes;
