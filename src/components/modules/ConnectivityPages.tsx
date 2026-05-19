'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wifi, WifiOff, Radio, Cpu, Server, Activity, AlertTriangle,
  CheckCircle2, XCircle, Clock, ArrowUpDown, TrendingUp,
  RadioTower, Router, Database, Zap, BarChart3, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ============================================================================
// Types
// ============================================================================

interface DataSource {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  lastConnectionAt: string | null;
  lastError: string | null;
  isActive: boolean;
  plant?: { id: string; name: string; code: string } | null;
  gateway?: { id: string; name: string; gatewayCode: string; status: string } | null;
  createdBy?: { id: string; fullName: string };
  sessions: Array<{ id: string; protocol: string; connectedAt: string; messagesIn: number; messagesOut: number }>;
  mappings: Array<{ id: string; parameterName: string; externalId: string; dataType: string }>;
  _count: { mappings: number; streams: number; sessions: number };
  engineStatus: {
    sourceId: string;
    status: string;
    messagesPerSecond: number;
    errorCount: number;
    uptimeSeconds: number;
  } | null;
}

interface GatewayData {
  id: string;
  name: string;
  gatewayCode: string;
  ipAddress: string | null;
  firmwareVersion: string | null;
  status: string;
  lastHeartbeatAt: string | null;
  lastSyncAt: string | null;
  bufferingEnabled: boolean;
  bufferSize: number;
  batchSize: number;
  syncIntervalMs: number;
  capabilities: unknown;
  plant?: { id: string; name: string; code: string } | null;
  sources: Array<{ id: string; name: string; sourceType: string; status: string }>;
  connections: Array<{ id: string; protocol: string; connectedAt: string }>;
  _count: { sources: number; connections: number };
}

interface EngineStatus {
  engine: {
    status: string;
    activeSources: number;
    totalMessages: number;
    startTime: string;
  };
  adapters: Array<{
    sourceId: string;
    sourceName: string;
    protocol: string;
    status: string;
    messagesPerSecond: number;
    errorCount: number;
    uptimeSeconds: number;
  }>;
  batcher: {
    bufferLength: number;
    totalBatchesFlushed: number;
    totalMessagesProcessed: number;
  };
  eventStream: {
    totalByType: Record<string, number>;
    totalBySeverity: Record<string, number>;
    recentErrors: number;
  };
  connectivity: {
    gateways: { total: number; online: number };
    dataSources: number;
    activeConnections: number;
    bufferStatuses: Record<string, { count: number; capacity: number }>;
  };
  timestamp: string;
}

interface StreamEvent {
  id: string;
  eventType: string;
  sourceType?: string;
  sourceId?: string;
  entityId?: string;
  severity: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  timestamp: string;
}

// ============================================================================
// Helpers
// ============================================================================

const protocolColors: Record<string, string> = {
  mqtt: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  opcua: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  modbus_tcp: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  bacnet: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  siemens_s7: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
  ethernet_ip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300',
  rest_api: 'bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300',
};

const protocolLabels: Record<string, string> = {
  mqtt: 'MQTT',
  opcua: 'OPC-UA',
  modbus_tcp: 'Modbus TCP',
  bacnet: 'BACnet',
  siemens_s7: 'Siemens S7',
  ethernet_ip: 'EtherNet-IP',
  rest_api: 'REST API',
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'connected': case 'online': case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 gap-1"><CheckCircle2 className="h-3 w-3" />{status}</Badge>;
    case 'connecting': case 'processing': case 'degraded':
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-0 gap-1"><Clock className="h-3 w-3" />{status}</Badge>;
    case 'disconnected': case 'offline': case 'pending':
      return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 border-0 gap-1"><WifiOff className="h-3 w-3" />{status}</Badge>;
    case 'error': case 'failed': case 'maintenance':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-0 gap-1"><XCircle className="h-3 w-3" />{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const severityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case 'error': return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
    case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    default: return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  }
};

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return 'N/A';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatCard({ title, value, subtitle, icon: Icon, color = 'emerald' }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colorMap[color] || colorMap.emerald} flex items-center justify-center shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectionHealthGrid({ sources }: { sources: DataSource[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          Connection Health Grid
        </CardTitle>
        <CardDescription>Real-time status for all data sources</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {sources.length === 0 && (
            <p className="col-span-full text-xs text-muted-foreground py-4 text-center">No data sources configured</p>
          )}
          {sources.map((source) => {
            const color = source.status === 'connected' ? 'bg-emerald-500'
              : source.status === 'error' ? 'bg-red-500'
              : source.status === 'connecting' ? 'bg-amber-500'
              : 'bg-gray-300 dark:bg-gray-600';
            return (
              <TooltipWrapper key={source.id} content={`${source.name} (${protocolLabels[source.sourceType] || source.sourceType}) — ${source.status}`}>
                <div className={`aspect-square rounded-lg ${color} flex flex-col items-center justify-center gap-1 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-emerald-400 transition-all`}>
                  <span className="text-[10px] font-bold text-white truncate max-w-full px-0.5 text-center leading-tight">{source.name.substring(0, 8)}</span>
                </div>
              </TooltipWrapper>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Connected</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Connecting</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />Offline</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Error</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TooltipWrapper({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded whitespace-nowrap z-50 pointer-events-none shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      )}
    </div>
  );
}

function ThroughputChart({ engineData }: { engineData: EngineStatus | null }) {
  // Generate mock throughput data if no real data
  const data = engineData?.adapters?.map(a => ({
    name: protocolLabels[a.protocol] || a.protocol,
    messages: Math.round(a.messagesPerSecond * 100) / 100 || 0,
    errors: a.errorCount || 0,
  })) || [
    { name: 'MQTT', messages: 42, errors: 0 },
    { name: 'OPC-UA', messages: 18, errors: 1 },
    { name: 'Modbus', messages: 24, errors: 0 },
    { name: 'BACnet', messages: 8, errors: 0 },
    { name: 'S7', messages: 15, errors: 0 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-600" />
          Message Throughput (msg/sec)
        </CardTitle>
        <CardDescription>Real-time messages per second by protocol adapter</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="messages" fill="#10b981" radius={[4, 4, 0, 0]} name="Messages/sec" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ProtocolBreakdown({ sources }: { sources: DataSource[] }) {
  const breakdown: Record<string, { total: number; connected: number; error: number }> = {};
  for (const s of sources) {
    if (!breakdown[s.sourceType]) breakdown[s.sourceType] = { total: 0, connected: 0, error: 0 };
    breakdown[s.sourceType].total++;
    if (s.status === 'connected') breakdown[s.sourceType].connected++;
    if (s.status === 'error') breakdown[s.sourceType].error++;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-600" />
          Protocol Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(breakdown).length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No sources configured</p>
          )}
          {Object.entries(breakdown).map(([type, counts]) => (
            <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${protocolColors[type] || 'bg-gray-100 text-gray-800'}`}>
                  {protocolLabels[type] || type}
                </span>
                <span className="text-xs text-muted-foreground">{counts.total} source{counts.total !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" />{counts.connected}
                </span>
                {counts.error > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
                    <XCircle className="h-3 w-3" />{counts.error}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DataSourcesTable({ sources }: { sources: DataSource[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-600" />
          Data Sources
        </CardTitle>
        <CardDescription>All telemetry data sources with connection status</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Protocol</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Last Message</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Msg/sec</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground text-center py-8">
                    No data sources found. Add sources via the API.
                  </TableCell>
                </TableRow>
              )}
              {sources.map((source) => (
                <TableRow key={source.id} className="cursor-pointer hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{source.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${protocolColors[source.sourceType] || 'bg-gray-100 text-gray-800'}`}>
                      {protocolLabels[source.sourceType] || source.sourceType}
                    </span>
                  </TableCell>
                  <TableCell>{statusBadge(source.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                    {formatTimeAgo(source.lastConnectionAt)}
                  </TableCell>
                  <TableCell className="text-xs font-mono hidden md:table-cell">
                    {source.engineStatus?.messagesPerSecond?.toFixed(1) || '—'}
                  </TableCell>
                  <TableCell className="text-xs hidden lg:table-cell">
                    {source.engineStatus?.errorCount ? (
                      <span className="text-red-500 font-medium">{source.engineStatus.errorCount}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EdgeGatewayStatusTable({ gateways }: { gateways: GatewayData[] }) {
  // Mock buffer utilization
  const getBufferUtil = (gw: GatewayData) => {
    const idx = Math.abs(gw.gatewayCode.charCodeAt(0) % 100);
    return Math.min(idx, 95);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Router className="h-4 w-4 text-emerald-600" />
          Edge Gateways
        </CardTitle>
        <CardDescription>Gateway fleet status and buffer utilization</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Gateway</TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Buffer</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Sources</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Last Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateways.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground text-center py-8">
                    No edge gateways registered.
                  </TableCell>
                </TableRow>
              )}
              {gateways.map((gw) => {
                const bufferUtil = getBufferUtil(gw);
                return (
                  <TableRow key={gw.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="text-xs font-medium">{gw.name}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{gw.gatewayCode}</TableCell>
                    <TableCell>{statusBadge(gw.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${bufferUtil > 80 ? 'bg-red-500' : bufferUtil > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${bufferUtil}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{bufferUtil}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell">
                      {gw._count.sources}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {formatTimeAgo(gw.lastSyncAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentEventsStream({ events }: { events: StreamEvent[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-600" />
          Recent Events
        </CardTitle>
        <CardDescription>Last 20 events from the event stream processor</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-80 overflow-y-auto">
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No recent events</p>
          )}
          <div className="divide-y">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="mt-0.5">{severityIcon(event.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{event.eventType.replace(/_/g, ' ')}</span>
                    {event.sourceType && (
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${protocolColors[event.sourceType] || 'bg-gray-100 text-gray-800'}`}>
                        {protocolLabels[event.sourceType] || event.sourceType}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                  {event.entityId && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      Entity: {event.entityId}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export function ConnectivityPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [gateways, setGateways] = useState<GatewayData[]>([]);
  const [engineData, setEngineData] = useState<EngineStatus | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sourcesRes, gatewaysRes, engineRes, eventsRes] = await Promise.all([
        fetch('/api/connectivity/sources?limit=50').then(r => r.json()),
        fetch('/api/connectivity/gateway?limit=50').then(r => r.json()),
        fetch('/api/connectivity/engine').then(r => r.json()),
        fetch('/api/connectivity/stream?limit=20').then(r => r.json()),
      ]);

      setSources(sourcesRes.data || []);
      setGateways(gatewaysRes.data || []);
      setEngineData(engineRes || null);
      setEvents(eventsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch connectivity data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchAll, refreshKey]);

  // Derived stats
  const onlineGateways = gateways.filter(g => g.status === 'online').length;
  const offlineGateways = gateways.filter(g => g.status !== 'online').length;
  const activeSources = sources.filter(s => s.status === 'connected').length;
  const totalErrors = engineData?.adapters?.reduce((sum, a) => sum + (a.errorCount || 0), 0) || 0;
  const totalMps = engineData?.adapters?.reduce((sum, a) => sum + (a.messagesPerSecond || 0), 0) || 0;

  if (loading && sources.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <RadioTower className="h-6 w-6 text-emerald-600" />
            Industrial Connectivity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor data sources, edge gateways, protocol adapters, and event streams
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Gateways Online"
          value={onlineGateways}
          subtitle={`${offlineGateways} offline`}
          icon={Router}
          color="emerald"
        />
        <StatCard
          title="Active Sources"
          value={activeSources}
          subtitle={`${sources.length} total`}
          icon={Database}
          color="blue"
        />
        <StatCard
          title="Throughput"
          value={`${totalMps.toFixed(1)}`}
          subtitle="messages/sec"
          icon={TrendingUp}
          color="cyan"
        />
        <StatCard
          title="Error Rate"
          value={totalErrors}
          subtitle={totalErrors > 0 ? 'action needed' : 'all clear'}
          icon={totalErrors > 0 ? AlertTriangle : CheckCircle2}
          color={totalErrors > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          title="Events Processed"
          value={engineData?.eventStream?.totalByType
            ? Object.values(engineData.eventStream.totalByType).reduce((a: number, b: unknown) => a + (b as number), 0)
            : 0}
          subtitle={`${engineData?.eventStream?.recentErrors || 0} recent errors`}
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="Batches Flushed"
          value={engineData?.batcher?.totalBatchesFlushed || 0}
          subtitle={`${engineData?.batcher?.bufferLength || 0} in buffer`}
          icon={Server}
          color="amber"
        />
      </div>

      {/* Connection Health Grid */}
      <ConnectionHealthGrid sources={sources} />

      {/* Tabs for detailed sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <ThroughputChart engineData={engineData} />
            <ProtocolBreakdown sources={sources} />
          </div>

          {/* Adapter Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-600" />
                Active Protocol Adapters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Protocol</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Msg/sec</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Uptime</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!engineData?.adapters || engineData.adapters.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-xs text-muted-foreground text-center py-6">
                          No active adapters. Start sources to see adapter status.
                        </TableCell>
                      </TableRow>
                    )}
                    {engineData?.adapters?.map((adapter, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-medium">{adapter.sourceName}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${protocolColors[adapter.protocol] || 'bg-gray-100 text-gray-800'}`}>
                            {protocolLabels[adapter.protocol] || adapter.protocol}
                          </span>
                        </TableCell>
                        <TableCell>{statusBadge(adapter.status)}</TableCell>
                        <TableCell className="text-xs font-mono hidden sm:table-cell">
                          {adapter.messagesPerSecond?.toFixed(1) || '—'}
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell">
                          {formatUptime(adapter.uptimeSeconds)}
                        </TableCell>
                        <TableCell className="text-xs hidden lg:table-cell">
                          {adapter.errorCount > 0 ? (
                            <span className="text-red-500 font-medium">{adapter.errorCount}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Event severity breakdown */}
          {engineData?.eventStream?.totalBySeverity && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-emerald-600" />
                  Event Severity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(engineData.eventStream.totalBySeverity).map(([sev, count]) => {
                    const colors: Record<string, string> = {
                      info: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
                      warning: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
                      error: 'text-red-600 bg-red-50 dark:bg-red-950/30',
                      critical: 'text-red-800 bg-red-100 dark:bg-red-950/50',
                    };
                    return (
                      <div key={sev} className={`p-3 rounded-lg text-center ${colors[sev] || 'bg-muted'}`}>
                        <p className="text-xl font-bold">{count as number}</p>
                        <p className="text-[10px] font-medium uppercase">{sev}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4 mt-4">
          <DataSourcesTable sources={sources} />
        </TabsContent>

        <TabsContent value="gateways" className="space-y-4 mt-4">
          <EdgeGatewayStatusTable gateways={gateways} />
        </TabsContent>

        <TabsContent value="events" className="space-y-4 mt-4">
          <RecentEventsStream events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ConnectivityPage;
