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
  standby: '#f59e0b',
  warning: '#f59e0b',
  offline: '#6b7280',
  inactive: '#6b7280',
  critical: '#ef4444',
  alarm: '#ef4444',
  error: '#ef4444',
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
          {/* Min/Max markers */}
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
          {/* Valve bowtie indicator */}
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
      {/* Glow layer */}
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
      {/* Base line */}
      <path
        d={edgePath}
        fill="none"
        stroke={edgeColor}
        strokeWidth={isActive ? 2.5 : 1.5}
        strokeOpacity={isActive ? 0.7 : 0.3}
        strokeDasharray={isActive ? undefined : '6 4'}
      />
      {/* Animated flow dot */}
      {isActive && (
        <circle r="4" fill={edgeColor} filter={`drop-shadow(0 0 3px ${edgeColor})`}>
          <animateMotion
            dur={`${flowStatus === 'alarm' ? '1s' : flowStatus === 'warning' ? '2s' : '3s'}`}
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
      {/* Selection highlight */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#10b981"
          strokeWidth={6}
          strokeOpacity={0.15}
        />
      )}
      {/* Label */}
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
      {/* Outer pipe */}
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(6,182,212,0.15)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      {/* Inner pipe */}
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
};

export const edgeTypes = {
  processFlowEdge: ProcessFlowEdge,
  signalEdge: SignalEdge,
  pipeEdge: PipeEdge,
};

export type CustomNodeTypes = typeof nodeTypes;
export type CustomEdgeTypes = typeof edgeTypes;
