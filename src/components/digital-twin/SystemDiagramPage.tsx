'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { nodeTypes, edgeTypes, type AssetNodeData } from './DiagramNodeTypes';
import { diagramTemplates, diagramTypeMeta, type DiagramTemplate } from './DiagramTemplates';

import {
  Plus, Save, FolderOpen, Download, Trash2, Copy, Undo2, Redo2,
  Maximize2, ZoomIn, ZoomOut, LayoutGrid, FileDown, Search,
  ChevronLeft, ChevronRight, Cpu, Thermometer, GitBranch, CircleDot,
  Droplets, Zap, Wind, FlaskConical, Settings, Shield, X,
  Layers, Info, MoreVertical, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ============================================================================
// TYPES
// ============================================================================

interface SystemDiagram {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  nodes: string; // JSON
  edges: string; // JSON
  viewport?: string | null;
  thumbnailUrl?: string | null;
  version: number;
  isActive: boolean;
  isTemplate?: boolean;
  createdById: string;
  createdByIdUser?: { id: string; fullName: string; username: string };
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// FLOW EDITOR (wrapped in ReactFlowProvider)
// ============================================================================

let nodeIdCounter = 1;
const generateNodeId = () => `node-${Date.now()}-${nodeIdCounter++}`;

function createNode(type: string, position: { x: number; y: number }, overrides?: Partial<Node['data']>): Node {
  const id = generateNodeId();
  const baseData: Record<string, unknown> = { label: '' };

  switch (type) {
    case 'assetNode':
      baseData.label = 'New Equipment';
      baseData.assetType = 'default';
      baseData.status = 'operational';
      baseData.criticality = 'medium';
      baseData.health = 100;
      baseData.parameters = [];
      break;
    case 'sensorNode':
      baseData.label = 'SENSOR-01';
      baseData.parameter = 'Measurement';
      baseData.value = 0;
      baseData.unit = '°C';
      baseData.min = 0;
      baseData.max = 100;
      baseData.status = 'normal';
      break;
    case 'valveNode':
      baseData.label = 'VALVE-01';
      baseData.state = 'closed';
      baseData.valveType = 'isolation';
      break;
    case 'junctionNode':
      baseData.label = '';
      break;
  }

  return {
    id,
    type,
    position,
    data: { ...baseData, ...overrides },
  };
}

// --- Properties Panel Component ---

function PropertiesPanel({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
}: {
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: Partial<Node['data']>) => void;
  onDeleteNode: (id: string) => void;
}) {
  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full text-center p-6">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto">
            <Info className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-xs text-slate-500">Select a node to view its properties</p>
        </div>
      </div>
    );
  }

  const data = selectedNode.data as Record<string, unknown>;
  const nodeType = selectedNode.type || 'assetNode';

  const handleChange = (key: string, value: unknown) => {
    onUpdateNode(selectedNode.id, { [key]: value });
  };

  const statusColorMap: Record<string, string> = {
    operational: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    standby: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    alarm: 'bg-red-500/20 text-red-400 border-red-500/30',
    open: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    closed: 'bg-red-500/20 text-red-400 border-red-500/30',
    partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {nodeType.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => onDeleteNode(selectedNode.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete node</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator className="bg-slate-700/50" />

        {/* Common fields */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-400 font-medium">Label</Label>
            <Input
              value={(data.label as string) || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200"
              placeholder="Node label"
            />
          </div>
        </div>

        {/* Asset Node specific fields */}
        {nodeType === 'assetNode' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 font-medium">Asset Type</Label>
              <Select value={(data.assetType as string) || 'default'} onValueChange={(v) => handleChange('assetType', v)}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['default', 'chiller', 'pump', 'transformer', 'switchgear', 'mcc', 'motor', 'compressor', 'dryer', 'filter', 'receiver', 'ahu', 'vav', 'supply', 'generator', 'enduser', 'valve'].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs text-slate-300">{t.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 font-medium">Status</Label>
              <Select value={(data.status as string) || 'operational'} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['operational', 'standby', 'warning', 'critical'].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs text-slate-300 capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(data.status as string) && (
                <Badge variant="outline" className={`text-[10px] mt-1.5 ${statusColorMap[(data.status as string)] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                  {(data.status as string).toUpperCase()}
                </Badge>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 font-medium">Criticality</Label>
              <Select value={(data.criticality as string) || 'medium'} onValueChange={(v) => handleChange('criticality', v)}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['low', 'medium', 'high', 'critical'].map((c) => (
                    <SelectItem key={c} value={c} className="text-xs text-slate-300 capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 font-medium">Health Score</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={(data.health as number) ?? 100}
                onChange={(e) => handleChange('health', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            {/* Display current parameters */}
            {Array.isArray(data.parameters) && (data.parameters as Array<{ name: string; value: string; unit: string }>).length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-400 font-medium">Parameters</Label>
                <div className="space-y-1">
                  {(data.parameters as Array<{ name: string; value: string; unit: string }>).map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-slate-800/50">
                      <span className="text-[10px] text-slate-400">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-300">{p.value} {p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Sensor Node specific fields */}
        {nodeType === 'sensorNode' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 font-medium">Parameter</Label>
              <Input
                value={(data.parameter as string) || ''}
                onChange={(e) => handleChange('parameter', e.target.value)}
                className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-400 font-medium">Value</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={(data.value as number) ?? 0}
                  onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-400 font-medium">Unit</Label>
                <Input
                  value={(data.unit as string) || ''}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-400 font-medium">Min</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={(data.min as number) ?? 0}
                  onChange={(e) => handleChange('min', parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-400 font-medium">Max</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={(data.max as number) ?? 100}
                  onChange={(e) => handleChange('max', parseFloat(e.target.value) || 100)}
                  className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 font-medium">Status</Label>
              <Select value={(data.status as string) || 'normal'} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['normal', 'warning', 'alarm'].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs text-slate-300 capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Valve Node specific fields */}
        {nodeType === 'valveNode' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 font-medium">State</Label>
              <Select value={(data.state as string) || 'closed'} onValueChange={(v) => handleChange('state', v)}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['open', 'closed', 'partial'].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs text-slate-300 capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(data.state as string) && (
                <Badge variant="outline" className={`text-[10px] mt-1.5 ${statusColorMap[(data.state as string)] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                  {(data.state as string).toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 font-medium">Valve Type</Label>
              <Select value={(data.valveType as string) || 'isolation'} onValueChange={(v) => handleChange('valveType', v)}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['isolation', 'bypass', 'control', 'distribution', 'ats'].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs text-slate-300 capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Node ID (read-only) */}
        <Separator className="bg-slate-700/50" />
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500">Node ID</span>
          <p className="text-[10px] font-mono text-slate-600 break-all">{selectedNode.id}</p>
        </div>
      </div>
    </ScrollArea>
  );
}

// --- Flow Editor Inner ---

function FlowEditorInner({
  initialNodes,
  initialEdges,
  onSave,
  diagramName,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => void;
  diagramName: string;
}) {
  const { hasPermission, isAdmin } = useAuthStore();
  const canEdit = hasPermission('digital_twin.create') || hasPermission('digital_twin.update') || isAdmin();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const reactFlowInstance = useReactFlow();
  const { fitView, zoomIn, zoomOut, getNodes, getEdges } = reactFlowInstance;

  const onConnect = useCallback(
    (params: Connection) => {
      const edgeType = params.sourceHandle === 'signal' ? 'signalEdge' : 'processFlowEdge';
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: edgeType,
            data: edgeType === 'processFlowEdge' ? { flowStatus: 'normal' } : undefined,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (deleted.some((n) => n.id === selectedNode?.id)) {
        setSelectedNode(null);
      }
    },
    [selectedNode],
  );

  const addNodeAtCenter = useCallback(
    (type: string) => {
      const { x, y, zoom } = reactFlowInstance.getViewport();
      const position = reactFlowInstance.project({
        x: (window.innerWidth / 2 - x) / zoom - 90,
        y: (window.innerHeight / 2 - y) / zoom - 50,
      });
      const newNode = createNode(type, position);
      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
    },
    [reactFlowInstance, setNodes],
  );

  const updateNodeData = useCallback(
    (id: string, newData: Partial<Node['data']>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...newData } } : n)),
      );
      // Also update selectedNode ref
      setSelectedNode((prev) => (prev?.id === id ? { ...prev, data: { ...prev.data, ...newData } } : prev));
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      if (selectedNode?.id === id) setSelectedNode(null);
    },
    [setNodes, setEdges, selectedNode],
  );

  const handleSave = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    onSave(currentNodes, currentEdges);
  }, [getNodes, getEdges, onSave]);

  const handleExportImage = useCallback(() => {
    // Use the viewport for export via toObject (requires html-to-image)
    // For simplicity, we'll notify the user
    toast.info('Use browser screenshot tools (Ctrl+Shift+S) to export the diagram');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNode && canEdit) {
        deleteNode(selectedNode.id);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, canEdit, deleteNode, handleSave]);

  return (
    <div className="flex h-full w-full">
      {/* Canvas */}
      <div className="flex-1 relative" style={{ background: '#0f172a' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={canEdit ? onNodesChange : undefined}
          onEdgesChange={canEdit ? onEdgesChange : undefined}
          onConnect={canEdit ? onConnect : undefined}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodesDelete={onNodesDelete}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } }}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode="Delete"
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Shift"
          snapToGrid
          snapGrid={[16, 16]}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(n) => {
              const d = n.data as Record<string, unknown>;
              const status = d.status as string || 'operational';
              if (status === 'warning') return '#f59e0b';
              if (status === 'critical' || status === 'alarm') return '#ef4444';
              if (status === 'standby' || status === 'inactive') return '#6b7280';
              return '#10b981';
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
            style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8 }}
          />
          <Controls
            showInteractive={false}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(148,163,184,0.15)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          />

          {/* Top Toolbar */}
          <Panel position="top-left" className="pointer-events-auto">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg" style={{
              background: 'rgba(30,41,59,0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <TooltipProvider delayDuration={0}>
                {/* Add Asset */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Add Node</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-slate-800 border-slate-700 min-w-[160px]">
                      <DropdownMenuItem onClick={() => addNodeAtCenter('assetNode')} className="text-xs text-slate-300 gap-2">
                        <Cpu className="h-3.5 w-3.5 text-emerald-400" /> Equipment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNodeAtCenter('sensorNode')} className="text-xs text-slate-300 gap-2">
                        <Thermometer className="h-3.5 w-3.5 text-sky-400" /> Sensor
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNodeAtCenter('valveNode')} className="text-xs text-slate-300 gap-2">
                        <GitBranch className="h-3.5 w-3.5 text-amber-400" /> Valve
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem onClick={() => addNodeAtCenter('junctionNode')} className="text-xs text-slate-300 gap-2">
                        <CircleDot className="h-3.5 w-3.5 text-slate-400" /> Junction
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <div className="w-px h-5 bg-slate-700" />

                {/* Zoom controls */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-slate-700 hover:text-white" onClick={() => zoomIn()}>
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-slate-700 hover:text-white" onClick={() => zoomOut()}>
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-slate-700 hover:text-white" onClick={() => fitView({ padding: 0.2 })}>
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fit View</TooltipContent>
                </Tooltip>

                <div className="w-px h-5 bg-slate-700" />

                {/* Properties toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${propertiesOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                      onClick={() => setPropertiesOpen(!propertiesOpen)}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Properties Panel</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </Panel>

          {/* Diagram name overlay */}
          <Panel position="top-center">
            <div className="px-3 py-1 rounded-md" style={{
              background: 'rgba(30,41,59,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(148,163,184,0.08)',
            }}>
              <span className="text-xs font-semibold text-slate-300">{diagramName}</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      {propertiesOpen && (
        <div className="w-72 border-l border-slate-700/50 flex flex-col" style={{ background: '#1e293b' }}>
          <div className="px-3 py-2.5 border-b border-slate-700/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Properties</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-slate-300" onClick={() => setPropertiesOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <PropertiesPanel
              selectedNode={selectedNode}
              onUpdateNode={updateNodeData}
              onDeleteNode={deleteNode}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN SYSTEM DIAGRAM PAGE
// ============================================================================

export default function SystemDiagramPage() {
  const { hasPermission, isAdmin } = useAuthStore();
  const canEdit = hasPermission('digital_twin.create') || hasPermission('digital_twin.update') || isAdmin();

  // List state
  const [diagrams, setDiagrams] = useState<SystemDiagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Editor state
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [currentDiagram, setCurrentDiagram] = useState<SystemDiagram | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', type: 'process' });

  // Template dialog
  const [templateOpen, setTemplateOpen] = useState(false);

  // Fetch diagrams
  const fetchDiagrams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (typeFilter !== 'all') params.set('diagramType', typeFilter);
      params.set('limit', '50');

      const res = await api.get(`/api/system-diagrams?${params.toString()}`);
      if (res.success && Array.isArray(res.data)) {
        setDiagrams(res.data);
      }
    } catch {
      toast.error('Failed to load diagrams');
    }
    setLoading(false);
  }, [searchQuery, typeFilter]);

  useEffect(() => { fetchDiagrams(); }, [fetchDiagrams]);

  // Create diagram
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error('Diagram name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/api/system-diagrams', {
        name: createForm.name,
        description: createForm.description || null,
        diagramType: createForm.type,
        nodes: [],
        edges: [],
        isTemplate: false,
      });
      if (res.success && res.data) {
        toast.success('Diagram created');
        setCreateOpen(false);
        setCreateForm({ name: '', description: '', type: 'process' });
        // Open the new diagram in editor
        const diagram = res.data as SystemDiagram;
        setCurrentDiagram(diagram);
        setEditorKey((k) => k + 1);
        setView('editor');
        fetchDiagrams();
      } else {
        toast.error(res.error || 'Failed to create diagram');
      }
    } catch {
      toast.error('Failed to create diagram');
    }
    setSaving(false);
  };

  // Load from template
  const handleLoadTemplate = async (template: DiagramTemplate) => {
    setSaving(true);
    try {
      const res = await api.post('/api/system-diagrams', {
        name: `${template.name} - Copy`,
        description: template.description,
        diagramType: template.diagramType,
        nodes: template.nodes,
        edges: template.edges,
        isTemplate: false,
      });
      if (res.success && res.data) {
        toast.success(`Loaded "${template.name}" template`);
        setTemplateOpen(false);
        const diagram = res.data as SystemDiagram;
        setCurrentDiagram(diagram);
        setEditorKey((k) => k + 1);
        setView('editor');
        fetchDiagrams();
      } else {
        toast.error(res.error || 'Failed to load template');
      }
    } catch {
      toast.error('Failed to load template');
    }
    setSaving(false);
  };

  // Open existing diagram
  const handleOpenDiagram = (diagram: SystemDiagram) => {
    setCurrentDiagram(diagram);
    setEditorKey((k) => k + 1);
    setView('editor');
  };

  // Save diagram
  const handleSaveDiagram = async (nodes: Node[], edges: Edge[]) => {
    if (!currentDiagram) return;
    setSaving(true);
    try {
      const viewport = undefined; // Could capture from reactFlowInstance
      const res = await api.put(`/api/system-diagrams/${currentDiagram.id}`, {
        nodes,
        edges,
        viewport,
      });
      if (res.success) {
        toast.success('Diagram saved');
        setCurrentDiagram((prev) => prev ? { ...prev, nodes: JSON.stringify(nodes), edges: JSON.stringify(edges) } : null);
      } else {
        toast.error(res.error || 'Failed to save diagram');
      }
    } catch {
      toast.error('Failed to save diagram');
    }
    setSaving(false);
  };

  // Delete diagram
  const handleDeleteDiagram = async (id: string) => {
    try {
      const res = await api.delete(`/api/system-diagrams/${id}`);
      if (res.success) {
        toast.success('Diagram deleted');
        setDiagrams((prev) => prev.filter((d) => d.id !== id));
        if (currentDiagram?.id === id) {
          setCurrentDiagram(null);
          setView('list');
        }
      } else {
        toast.error(res.error || 'Failed to delete diagram');
      }
    } catch {
      toast.error('Failed to delete diagram');
    }
  };

  // Parse nodes/edges from stored JSON
  const parseNodes = (diagram: SystemDiagram): Node[] => {
    try {
      const parsed = JSON.parse(diagram.nodes);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parseEdges = (diagram: SystemDiagram): Edge[] => {
    try {
      const parsed = JSON.parse(diagram.edges);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Filter diagrams
  const filteredDiagrams = useMemo(() => {
    return diagrams;
  }, [diagrams]);

  // ============ LIST VIEW ============
  if (view === 'list') {
    return (
      <div className="page-content">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Diagrams</h1>
            <p className="text-muted-foreground mt-1">Enterprise-grade process and instrumentation diagrams</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTemplateOpen(true)} className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Templates
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Diagram
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search diagrams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(diagramTypeMeta).map(([key, meta]) => (
                <SelectItem key={key} value={key}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Diagram Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border/60 p-5">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-4" />
                <Skeleton className="h-32 w-full rounded-lg mb-3" />
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDiagrams.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold mb-1">No diagrams found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {searchQuery || typeFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first diagram or load a template'}
            </p>
            <div className="flex items-center gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setTemplateOpen(true)} className="gap-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                Load Template
              </Button>
              {canEdit && (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Create New
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDiagrams.map((diagram) => {
              const typeMeta = diagramTypeMeta[diagram.type] || diagramTypeMeta.process;
              const nodeCount = (() => { try { return JSON.parse(diagram.nodes).length; } catch { return 0; } })();
              const edgeCount = (() => { try { return JSON.parse(diagram.edges).length; } catch { return 0; } })();
              const timeAgo = new Date(diagram.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={diagram.id}
                  className="group rounded-xl border border-border/60 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                  onClick={() => handleOpenDiagram(diagram)}
                >
                  {/* Mini preview area */}
                  <div className="h-36 rounded-t-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
                    {/* Decorative dots grid */}
                    <div className="absolute inset-0 opacity-20" style={{
                      backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-500/50">{nodeCount}</div>
                        <div className="text-[10px] text-slate-600">nodes</div>
                      </div>
                    </div>
                    {/* Type badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="outline" className={`text-[10px] font-medium ${typeMeta.color} ${typeMeta.bgColor} border-0`}>
                        {typeMeta.label}
                      </Badge>
                    </div>
                    {/* Version badge */}
                    {diagram.version > 1 && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" className="text-[10px] bg-slate-800/80 text-slate-400 border-slate-700">
                          v{diagram.version}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm truncate">{diagram.name}</h3>
                    {diagram.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{diagram.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{nodeCount} nodes</span>
                        <span>{edgeCount} edges</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleOpenDiagram(diagram)} className="text-xs gap-2">
                                <FolderOpen className="h-3.5 w-3.5" /> Open
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteDiagram(diagram.id)} className="text-xs gap-2 text-red-500 focus:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create System Diagram</DialogTitle>
              <DialogDescription>Start a new diagram from scratch or load a pre-built template</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Diagram Name *</Label>
                <Input
                  placeholder="e.g. Chilled Water Distribution"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Diagram Type</Label>
                <Select value={createForm.type} onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(diagramTypeMeta).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !createForm.name.trim()}>
                {saving ? 'Creating...' : 'Create Diagram'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Dialog */}
        <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Diagram Templates</DialogTitle>
              <DialogDescription>Load a pre-built enterprise diagram template</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              {diagramTemplates.map((template) => {
                const meta = diagramTypeMeta[template.diagramType];
                return (
                  <div
                    key={template.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-muted/30 cursor-pointer transition-all"
                    onClick={() => handleLoadTemplate(template)}
                  >
                    <div className={`w-12 h-12 rounded-xl ${meta.bgColor} flex items-center justify-center shrink-0`}>
                      {template.diagramType === 'hvac' && <Wind className="h-5 w-5" style={{ color: meta.color.includes('sky') ? '#0ea5e9' : meta.color.includes('emerald') ? '#10b981' : '#10b981' }} />}
                      {template.diagramType === 'electrical' && <Zap className="h-5 w-5 text-amber-500" />}
                      {template.diagramType === 'process' && <FlaskConical className="h-5 w-5 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={`text-[10px] ${meta.color} ${meta.bgColor} border-0`}>
                          {meta.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {template.nodes.length} nodes / {template.edges.length} edges
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 gap-1">
                      <Copy className="h-3.5 w-3.5" />
                      Use
                    </Button>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============ EDITOR VIEW ============
  const nodes = currentDiagram ? parseNodes(currentDiagram) : [];
  const edges = currentDiagram ? parseEdges(currentDiagram) : [];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col" style={{ background: '#0f172a' }}>
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 shrink-0" style={{ background: '#1e293b' }}>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-400 hover:text-white" onClick={() => setView('list')}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Back</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to list</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Separator orientation="vertical" className="h-5 bg-slate-700" />
          <div>
            <h2 className="text-sm font-semibold text-slate-200">{currentDiagram?.name || 'New Diagram'}</h2>
            {currentDiagram?.description && (
              <p className="text-[10px] text-slate-500 line-clamp-1">{currentDiagram.description}</p>
            )}
          </div>
          {currentDiagram && (
            <Badge variant="outline" className={`text-[10px] ${diagramTypeMeta[currentDiagram.type]?.bgColor || ''} ${diagramTypeMeta[currentDiagram.type]?.color || ''} border-0`}>
              {diagramTypeMeta[currentDiagram.type]?.label || currentDiagram.type}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && currentDiagram && (
            <Button
              size="sm"
              onClick={() => {
                // Trigger save from the editor - we use a custom event
                const event = new CustomEvent('diagram-save');
                window.dispatchEvent(event);
              }}
              disabled={saving}
              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="text-xs">{saving ? 'Saving...' : 'Save'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <DiagramSaveListener onSave={handleSaveDiagram} />
        <ReactFlowProvider>
          <FlowEditorInner
            key={editorKey}
            initialNodes={nodes}
            initialEdges={edges}
            onSave={(n, e) => handleSaveDiagram(n, e)}
            diagramName={currentDiagram?.name || 'New Diagram'}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

// ============================================================================
// SAVE LISTENER (bridges header button to ReactFlow context)
// ============================================================================

function DiagramSaveListener({ onSave }: { onSave: (nodes: Node[], edges: Edge[]) => void }) {
  const { getNodes, getEdges } = useReactFlow();

  useEffect(() => {
    const handler = () => {
      const nodes = getNodes();
      const edges = getEdges();
      onSave(nodes, edges);
    };
    window.addEventListener('diagram-save', handler);
    return () => window.removeEventListener('diagram-save', handler);
  }, [getNodes, getEdges, onSave]);

  return null;
}
