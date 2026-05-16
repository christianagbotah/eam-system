'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Info,
  Wrench,
  Radio,
  Box,
  FileText,
  ExternalLink,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  MapPin,
  Tag,
  Cpu,
  Gauge,
  Thermometer,
  Zap,
  Droplets,
  Activity,
  Package,
  ClipboardList,
  User,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

export interface ComponentInfoPanelProps {
  /** Override selected asset data from the store (optional) */
  asset?: Record<string, unknown> | null;
  /** Override work orders from the store (optional) */
  workOrders?: Record<string, unknown>[];
  /** Override IoT devices from the store (optional) */
  iotDevices?: Record<string, unknown>[];
  /** Override PM schedules from the store (optional) */
  pmSchedules?: Record<string, unknown>[];
  /** Override BOM children from the store (optional) */
  bomChildren?: Record<string, unknown>[];
  /** Override attachments from the store (optional) */
  attachments?: Record<string, unknown>[];
  /** Whether the panel is visible */
  isOpen?: boolean;
  /** Callback to close the panel */
  onClose?: () => void;
}

// ============================================================================
// Helper: Safe field accessor
// ============================================================================

function field(record: Record<string, unknown> | null | undefined, key: string, fallback = '—'): string {
  if (!record) return fallback;
  const val = record[key];
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val || fallback;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val instanceof Date) return val.toLocaleDateString();
  return String(val);
}

// ============================================================================
// Status badge helper
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    active: { variant: 'default', className: 'bg-emerald-600 text-white' },
    completed: { variant: 'default', className: 'bg-emerald-600 text-white' },
    closed: { variant: 'secondary', className: 'bg-slate-600 text-slate-100' },
    in_progress: { variant: 'default', className: 'bg-blue-600 text-white' },
    'in progress': { variant: 'default', className: 'bg-blue-600 text-white' },
    open: { variant: 'outline', className: 'border-amber-500 text-amber-400' },
    pending: { variant: 'outline', className: 'border-amber-500 text-amber-400' },
    assigned: { variant: 'outline', className: 'border-blue-500 text-blue-400' },
    approved: { variant: 'outline', className: 'border-green-500 text-green-400' },
    on_hold: { variant: 'outline', className: 'border-orange-500 text-orange-400' },
    overdue: { variant: 'destructive', className: 'bg-red-600 text-white' },
    cancelled: { variant: 'secondary', className: 'bg-slate-700 text-slate-300' },
    new: { variant: 'default', className: 'bg-emerald-600 text-white' },
    good: { variant: 'default', className: 'bg-emerald-600 text-white' },
    fair: { variant: 'outline', className: 'border-amber-500 text-amber-400' },
    poor: { variant: 'destructive', className: 'bg-red-600 text-white' },
    critical: { variant: 'destructive', className: 'bg-red-600 text-white' },
    operational: { variant: 'default', className: 'bg-emerald-600 text-white' },
    degraded: { variant: 'outline', className: 'border-amber-500 text-amber-400' },
    offline: { variant: 'secondary', className: 'bg-slate-700 text-slate-300' },
  };

  const cfg = config[s] ?? { variant: 'secondary' as const, className: 'bg-slate-600 text-slate-100' };

  return <Badge variant={cfg.variant} className={`text-[10px] px-1.5 py-0 ${cfg.className}`}>{status}</Badge>;
}

// ============================================================================
// Priority badge helper
// ============================================================================

function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority || '').toLowerCase();
  const colorMap: Record<string, string> = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-amber-400',
    low: 'text-slate-400',
    emergency: 'text-red-500 font-bold',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase ${colorMap[p] ?? 'text-slate-400'}`}>
      {priority || '—'}
    </span>
  );
}

// ============================================================================
// Section Card wrapper
// ============================================================================

function SectionCard({ title, icon, children, className = '' }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className="bg-white/[0.03] border-white/[0.06] rounded-lg">
      <CardHeader className="py-2.5 px-3">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Info Field
// ============================================================================

function InfoField({ label, value, icon }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {icon && <span className="text-slate-500 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="text-xs text-slate-200 font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab: Overview
// ============================================================================

function OverviewTab({ asset }: { asset: Record<string, unknown> | null }) {
  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
        <Info className="h-8 w-8 mb-2 opacity-40" />
        <span className="text-xs">No asset data available</span>
      </div>
    );
  }

  const criticalityMap: Record<string, string> = {
    critical: 'text-red-400 bg-red-400/10',
    high: 'text-orange-400 bg-orange-400/10',
    medium: 'text-amber-400 bg-amber-400/10',
    low: 'text-slate-400 bg-slate-400/10',
  };

  const criticality = String(asset.criticality ?? '').toLowerCase();
  const critClass = criticalityMap[criticality] ?? 'text-slate-400 bg-slate-400/10';

  const condition = String(asset.condition ?? 'unknown').toLowerCase();
  const conditionColors: Record<string, string> = {
    new: 'text-emerald-400',
    good: 'text-emerald-400',
    fair: 'text-amber-400',
    poor: 'text-red-400',
    out_of_service: 'text-slate-500',
  };

  return (
    <div className="space-y-3">
      {/* Asset Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">
            {field(asset, 'name')}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Tag className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-400 font-mono">{field(asset, 'assetTag')}</span>
          </div>
        </div>
        <StatusBadge status={field(asset, 'status', 'unknown')} />
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
          <div className="text-[10px] text-slate-500 uppercase">Condition</div>
          <div className={`text-sm font-bold mt-0.5 ${conditionColors[condition] ?? 'text-slate-400'}`}>
            {field(asset, 'condition', 'Unknown')}
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
          <div className="text-[10px] text-slate-500 uppercase">Criticality</div>
          <div className={`text-sm font-bold mt-0.5 ${critClass.split(' ')[0]}`}>
            {field(asset, 'criticality', 'Low')}
          </div>
        </div>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Details */}
      <SectionCard title="Asset Details" icon={<Info className="h-3.5 w-3.5 text-slate-400" />}>
        <div className="space-y-0.5">
          <InfoField label="Manufacturer" value={field(asset, 'manufacturer')} icon={<Building2 className="h-3 w-3" />} />
          <InfoField label="Model" value={field(asset, 'model')} icon={<Package className="h-3 w-3" />} />
          <InfoField label="Serial No." value={field(asset, 'serialNumber')} icon={<Tag className="h-3 w-3" />} />
          <InfoField label="Category" value={field(asset, 'category')} icon={<Box className="h-3 w-3" />} />
          <InfoField label="Location" value={field(asset, 'location')} icon={<MapPin className="h-3 w-3" />} />
          <InfoField label="Plant" value={field(asset, 'plantName')} icon={<Building2 className="h-3 w-3" />} />
          <InfoField label="Install Date" value={field(asset, 'installDate')} icon={<Clock className="h-3 w-3" />} />
          <InfoField label="Warranty Exp." value={field(asset, 'warrantyExpiry')} icon={<Timer className="h-3 w-3" />} />
        </div>
      </SectionCard>

      {/* Description */}
      {asset.description && String(asset.description).length > 0 && (
        <SectionCard title="Description" icon={<FileText className="h-3.5 w-3.5 text-slate-400" />}>
          <p className="text-xs text-slate-300 leading-relaxed">
            {String(asset.description)}
          </p>
        </SectionCard>
      )}
    </div>
  );
}

// ============================================================================
// Tab: Maintenance
// ============================================================================

function MaintenanceTab({
  workOrders,
  pmSchedules,
}: {
  workOrders: Record<string, unknown>[];
  pmSchedules: Record<string, unknown>[];
}) {
  return (
    <div className="space-y-3">
      {/* Work Orders */}
      <SectionCard title={`Work Orders (${workOrders.length})`} icon={<ClipboardList className="h-3.5 w-3.5 text-slate-400" />}>
        {workOrders.length === 0 ? (
          <div className="text-xs text-slate-500 py-2 text-center">No work orders found</div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
            {workOrders.map((wo, i) => {
              const isOverdue = wo.dueDate && new Date(String(wo.dueDate)) < new Date() &&
                !['completed', 'closed', 'cancelled'].includes(String(wo.status ?? '').toLowerCase());

              return (
                <div
                  key={String(wo.id ?? i)}
                  className="flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {field(wo, 'woNumber', `WO-${String(wo.id).slice(0, 6)}`)}
                      </span>
                      {isOverdue && <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {field(wo, 'title', 'Untitled')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge status={field(wo, 'status', 'unknown')} />
                    <PriorityBadge priority={field(wo, 'priority', 'low')} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* PM Schedules */}
      <SectionCard title={`PM Schedules (${pmSchedules.length})`} icon={<Timer className="h-3.5 w-3.5 text-slate-400" />}>
        {pmSchedules.length === 0 ? (
          <div className="text-xs text-slate-500 py-2 text-center">No PM schedules found</div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {pmSchedules.map((pm, i) => {
              const nextDue = field(pm, 'nextDueDate');
              const isOverdue = nextDue !== '—' && new Date(nextDue) < new Date();

              return (
                <div
                  key={String(pm.id ?? i)}
                  className="flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {field(pm, 'name', 'PM Schedule')}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">
                        Every {field(pm, 'frequencyValue')} {field(pm, 'frequencyUnit')}
                      </span>
                      {isOverdue && (
                        <Badge className="bg-red-600 text-white text-[9px] px-1 py-0">OVERDUE</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 flex-shrink-0">
                    {nextDue !== '—' && (
                      <span className={isOverdue ? 'text-red-400' : ''}>
                        Due: {nextDue}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ============================================================================
// Tab: IoT / Sensors
// ============================================================================

function IoTSensorsTab({ iotDevices }: { iotDevices: Record<string, unknown>[] }) {
  // Sensor icon by type
  const sensorIcon = (device: Record<string, unknown>) => {
    const type = String(device.type ?? device.deviceType ?? '').toLowerCase();
    if (type.includes('temp')) return <Thermometer className="h-3.5 w-3.5 text-red-400" />;
    if (type.includes('vibr')) return <Activity className="h-3.5 w-3.5 text-blue-400" />;
    if (type.includes('press')) return <Gauge className="h-3.5 w-3.5 text-amber-400" />;
    if (type.includes('current') || type.includes('electr')) return <Zap className="h-3.5 w-3.5 text-yellow-400" />;
    if (type.includes('flow') || type.includes('liquid')) return <Droplets className="h-3.5 w-3.5 text-cyan-400" />;
    return <Cpu className="h-3.5 w-3.5 text-slate-400" />;
  };

  // Trend indicator
  const trendIndicator = (value: number, threshold: number) => {
    const ratio = value / threshold;
    if (ratio > 0.9) return <TrendingUp className="h-3 w-3 text-red-400" />;
    if (ratio > 0.7) return <TrendingUp className="h-3 w-3 text-amber-400" />;
    return <Minus className="h-3 w-3 text-emerald-400" />;
  };

  return (
    <div className="space-y-3">
      <SectionCard title={`IoT Devices (${iotDevices.length})`} icon={<Radio className="h-3.5 w-3.5 text-slate-400" />}>
        {iotDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-slate-500">
            <Cpu className="h-8 w-8 mb-2 opacity-40" />
            <span className="text-xs">No IoT devices configured</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {iotDevices.map((device, i) => {
              const lastReading = device.lastReading as number | null;
              const threshold = device.threshold as number | null;
              const status = String(device.status ?? 'unknown').toLowerCase();

              return (
                <div
                  key={String(device.id ?? i)}
                  className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {sensorIcon(device)}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {field(device, 'name', 'Sensor')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {field(device, 'deviceCode')}
                      </div>
                    </div>
                    <StatusBadge status={field(device, 'status', 'unknown')} />
                  </div>

                  {/* Reading value */}
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-lg font-bold text-slate-100">
                        {lastReading !== null ? lastReading.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">
                        {field(device, 'unit')}
                      </span>
                    </div>
                    {lastReading !== null && threshold ? (
                      <div className="flex items-center gap-1">
                        {trendIndicator(lastReading, threshold)}
                        <span className="text-[10px] text-slate-500">
                          / {threshold} {field(device, 'unit')}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Threshold progress bar */}
                  {lastReading !== null && threshold ? (
                    <div className="mt-2">
                      <Progress
                        value={Math.min((lastReading / threshold) * 100, 100)}
                        className="h-1.5 bg-white/5"
                      />
                    </div>
                  ) : null}

                  {/* Last reading timestamp */}
                  {device.lastReadingAt && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="h-2.5 w-2.5 text-slate-600" />
                      <span className="text-[9px] text-slate-500">
                        Last reading: {new Date(String(device.lastReadingAt)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ============================================================================
// Tab: BOM / Parts
// ============================================================================

function BomPartsTab({ bomChildren }: { bomChildren: Record<string, unknown>[] }) {
  return (
    <div className="space-y-3">
      <SectionCard title={`Bill of Materials (${bomChildren.length})`} icon={<Box className="h-3.5 w-3.5 text-slate-400" />}>
        {bomChildren.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-slate-500">
            <Package className="h-8 w-8 mb-2 opacity-40" />
            <span className="text-xs">No BOM data available</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
            {bomChildren.map((item, i) => (
              <div
                key={String(item.id ?? i)}
                className="flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <Package className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">
                    {field(item, 'childAssetName', field(item, 'partName', 'Component'))}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {field(item, 'partNumber', field(item, 'childAssetTag', ''))}
                    </span>
                    <span className="text-[10px] text-slate-600">•</span>
                    <span className="text-[10px] text-slate-500">Qty: {field(item, 'quantity', '1')}</span>
                  </div>
                </div>
                <ChevronRight className="h-3 w-3 text-slate-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ============================================================================
// Tab: Documents
// ============================================================================

function DocumentsTab({ attachments }: { attachments: Record<string, unknown>[] }) {
  const fileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    if (['dwg', 'dxf'].includes(ext)) return '📐';
    return '📎';
  };

  return (
    <div className="space-y-3">
      <SectionCard title={`Documents (${attachments.length})`} icon={<FileText className="h-3.5 w-3.5 text-slate-400" />}>
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-slate-500">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <span className="text-xs">No attachments found</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
            {attachments.map((att, i) => {
              const fileName = field(att, 'fileName', field(att, 'name', 'File'));
              const fileSize = field(att, 'fileSize', '');
              const fileType = field(att, 'fileType', field(att, 'mimeType', ''));
              const category = field(att, 'category', 'general');

              return (
                <div
                  key={String(att.id ?? i)}
                  className="flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors group"
                >
                  <span className="text-base flex-shrink-0">{fileIcon(fileName)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                      {fileName}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className="text-[8px] px-1 py-0 bg-white/5 text-slate-500 border-white/10">
                        {category}
                      </Badge>
                      {fileSize && fileSize !== '—' && (
                        <span className="text-[10px] text-slate-600">{fileSize}</span>
                      )}
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 border-slate-700 text-slate-200 text-xs">
                      Download
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ============================================================================
// Main ComponentInfoPanel
// ============================================================================

export function ComponentInfoPanel({
  asset: externalAsset,
  workOrders: externalWO,
  iotDevices: externalIoT,
  pmSchedules: externalPM,
  bomChildren: externalBom,
  attachments: externalAttachments,
  isOpen = true,
  onClose,
}: ComponentInfoPanelProps) {
  const storeAsset = useDigitalTwinStore((s) => s.selectedAsset);
  const storeWorkOrders = useDigitalTwinStore((s) => s.assetWorkOrders);
  const storeIoTDevices = useDigitalTwinStore((s) => s.assetIoTDevices);
  const storePmSchedules = useDigitalTwinStore((s) => s.assetPmSchedules);
  const storeBomChildren = useDigitalTwinStore((s) => s.assetBomChildren);
  const storeAttachments = useDigitalTwinStore((s) => s.assetAttachments);
  const isLoadingAssetData = useDigitalTwinStore((s) => s.isLoadingAssetData);
  const setInfoPanelOpen = useDigitalTwinStore((s) => s.setInfoPanelOpen);

  const asset = externalAsset ?? storeAsset;
  const workOrders = externalWO ?? storeWorkOrders;
  const iotDevices = externalIoT ?? storeIoTDevices;
  const pmSchedules = externalPM ?? storePmSchedules;
  const bomChildren = externalBom ?? storeBomChildren;
  const attachments = externalAttachments ?? storeAttachments;

  const handleClose = useCallback(() => {
    setInfoPanelOpen(false);
    onClose?.();
  }, [setInfoPanelOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-0 right-0 z-20 h-full flex flex-col animate-in slide-in-from-right duration-300"
      style={{
        width: '380px',
        background: 'rgba(10,10,18,0.95)',
        borderLeft: '1px solid rgba(148,163,184,0.1)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-cyan-500/20 flex items-center justify-center">
            <Box className="h-3 w-3 text-cyan-400" />
          </div>
          <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            Component Details
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-6 w-6 text-slate-400 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Loading state */}
      {isLoadingAssetData ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Loading asset data...</span>
          </div>
        </div>
      ) : (
        /* Tabs */
        <ScrollArea className="flex-1">
          <div className="p-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full bg-white/[0.04] h-8 p-0.5 mb-3">
                <TabsTrigger
                  value="overview"
                  className="flex-1 h-7 text-[10px] gap-1 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300"
                >
                  <Info className="h-3 w-3" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="maintenance"
                  className="flex-1 h-7 text-[10px] gap-1 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300"
                >
                  <Wrench className="h-3 w-3" />
                  Maint.
                </TabsTrigger>
                <TabsTrigger
                  value="iot"
                  className="flex-1 h-7 text-[10px] gap-1 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300"
                >
                  <Radio className="h-3 w-3" />
                  IoT
                </TabsTrigger>
                <TabsTrigger
                  value="bom"
                  className="flex-1 h-7 text-[10px] gap-1 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300"
                >
                  <Box className="h-3 w-3" />
                  BOM
                </TabsTrigger>
                <TabsTrigger
                  value="docs"
                  className="flex-1 h-7 text-[10px] gap-1 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300"
                >
                  <FileText className="h-3 w-3" />
                  Docs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab asset={asset} />
              </TabsContent>

              <TabsContent value="maintenance">
                <MaintenanceTab workOrders={workOrders} pmSchedules={pmSchedules} />
              </TabsContent>

              <TabsContent value="iot">
                <IoTSensorsTab iotDevices={iotDevices} />
              </TabsContent>

              <TabsContent value="bom">
                <BomPartsTab bomChildren={bomChildren} />
              </TabsContent>

              <TabsContent value="docs">
                <DocumentsTab attachments={attachments} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default ComponentInfoPanel;
