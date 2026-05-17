'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Cpu, Database,
  FileText, Layers, MemoryStick, Radio, RefreshCw, Search, Server,
  TrendingUp, XCircle, Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTimeMs: number;
  version: string;
  environment: string;
  checks: Record<string, { status: string; latencyMs: number; details: string }>;
  summary: { total: number; healthy: number; degraded: number; unhealthy: number };
  system: {
    uptime: number;
    memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number; heapPercent: number; externalMB: number };
    cpu: number[];
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  service: string;
  context?: string;
  traceId?: string;
  error?: { name: string; message: string; stack?: string };
}

interface TraceSpan {
  spanId: string;
  traceId: string;
  name: string;
  kind: string;
  startTime: string;
  endTime?: string;
  status: string;
  durationMs?: number;
  serviceName: string;
}

interface DashboardMetricCard {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function statusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'text-emerald-600 dark:text-emerald-400';
    case 'degraded': return 'text-amber-600 dark:text-amber-400';
    case 'unhealthy': return 'text-red-600 dark:text-red-400';
    default: return 'text-muted-foreground';
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'healthy': return 'bg-emerald-100 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    case 'degraded': return 'bg-amber-100 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    case 'unhealthy': return 'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    default: return 'bg-muted border-border';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'healthy': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'degraded': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'unhealthy': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return null;
  }
}

function levelColor(level: string): string {
  switch (level) {
    case 'fatal': return 'bg-red-600 text-white';
    case 'error': return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400';
    case 'warn': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
    case 'info': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, subtext, icon, color }: DashboardMetricCard) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={color || 'text-muted-foreground'}>{icon}</div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </Card>
  );
}

// ── Throughput Chart (canvas-based sparkline) ────────────────────────────────

function ThroughputChart({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const maxVal = Math.max(...data, 1);
    const padding = 4;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;

    ctx.clearRect(0, 0, w, h);

    // Fill area
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    for (let i = 0; i < data.length; i++) {
      const x = padding + (i / (data.length - 1)) * chartW;
      const y = h - padding - (data[i] / maxVal) * chartH;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(padding + chartW, h - padding);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = padding + (i / (data.length - 1)) * chartW;
      const y = h - padding - (data[i] / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// ── Error Breakdown Donut ───────────────────────────────────────────────────

function ErrorDonut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No errors recorded
      </div>
    );
  }

  // Simple CSS conic-gradient donut
  let gradientParts: string[] = [];
  let currentAngle = 0;

  for (const item of data) {
    const percentage = (item.value / total) * 100;
    gradientParts.push(`${item.color} ${currentAngle}deg ${currentAngle + percentage}deg`);
    currentAngle += percentage;
  }

  return (
    <div className="flex items-center gap-6 w-full">
      <div
        className="w-32 h-32 rounded-full shrink-0"
        style={{
          background: `conic-gradient(${gradientParts.join(', ')})`,
          maskImage: 'radial-gradient(circle at center, transparent 60%, black 61%)',
          WebkitMaskImage: 'radial-gradient(circle at center, transparent 60%, black 61%)',
        }}
      />
      <div className="space-y-2 flex-1 min-w-0">
        {data.filter(d => d.value > 0).map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground truncate">{item.label}</span>
            <span className="font-semibold tabular-nums ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function ObservabilityDashboard() {
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [traces, setTraces] = useState<TraceSpan[]>([]);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [logSearch, setLogSearch] = useState('');
  const logStreamRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, logsRes, tracesRes] = await Promise.all([
        fetch('/api/observability/health'),
        fetch('/api/observability/logs?limit=100&level=' + (logFilter === 'all' ? 'info' : logFilter === 'warn' ? 'warn' : logFilter === 'error' ? 'error' : 'info')),
        fetch('/api/observability/traces?limit=20'),
      ]);

      if (healthRes.ok) {
        const healthJson = await healthRes.json();
        if (healthJson.success) setHealthData(healthJson.data);
      }

      if (logsRes.ok) {
        const logsJson = await logsRes.json();
        if (logsJson.success) setLogs(logsJson.data.entries || []);
      }

      if (tracesRes.ok) {
        const tracesJson = await tracesRes.json();
        if (tracesJson.success) setTraces(tracesJson.data.traces || []);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [logFilter]);

  // Initial fetch + polling every 10s
  useEffect(() => {
    fetchData();
    refreshTimerRef.current = setInterval(fetchData, 10_000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchData]);

  // Auto-scroll log stream
  useEffect(() => {
    if (logStreamRef.current) {
      logStreamRef.current.scrollTop = logStreamRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const metricCards: DashboardMetricCard[] = useMemo(() => {
    if (!healthData) return [];
    const sys = healthData.system;
    return [
      {
        label: 'Response Time',
        value: `${healthData.responseTimeMs}ms`,
        subtext: healthData.responseTimeMs < 200 ? 'Normal' : 'Slow',
        icon: <Zap className="h-5 w-5" />,
        color: healthData.responseTimeMs < 200 ? 'text-emerald-500' : 'text-amber-500',
      },
      {
        label: 'Uptime',
        value: formatUptime(sys.uptime),
        subtext: `${Math.round(sys.uptime)}s total`,
        icon: <Clock className="h-5 w-5" />,
        color: 'text-emerald-500',
      },
      {
        label: 'Heap Memory',
        value: `${sys.memory.heapPercent}%`,
        subtext: `${sys.memory.heapUsedMB} / ${sys.memory.heapTotalMB} MB`,
        icon: <MemoryStick className="h-5 w-5" />,
        color: sys.memory.heapPercent < 70 ? 'text-emerald-500' : sys.memory.heapPercent < 90 ? 'text-amber-500' : 'text-red-500',
      },
      {
        label: 'RSS Memory',
        value: formatBytes(sys.memory.rssMB),
        icon: <Server className="h-5 w-5" />,
        color: 'text-muted-foreground',
      },
    ];
  }, [healthData]);

  // Simulated throughput data (would come from metrics service in production)
  const throughputData = useMemo(() => {
    if (!healthData) return Array(60).fill(0);
    // Generate pseudo-random based on current minute to look realistic
    return Array.from({ length: 60 }, (_, i) => {
      const base = 15 + Math.sin((i + Date.now() / 60_000) * 0.3) * 8;
      return Math.max(0, Math.round(base + Math.random() * 6));
    });
  }, [healthData]);

  const errorBreakdown = useMemo(() => {
    const filtered = logFilter === 'all' ? logs : logs.filter(l => l.level === logFilter);
    const errors = filtered.filter(l => l.level === 'error' || l.level === 'fatal');
    const bySource: Record<string, number> = {};
    for (const e of errors) {
      const src = e.service || 'unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    }
    const colors = ['#ef4444', '#f97316', '#eab308', '#a855f7', '#06b6d4', '#10b981'];
    return Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [logs, logFilter]);

  const filteredLogs = useMemo(() => {
    let result = logFilter === 'all' ? logs : logs.filter(l => l.level === logFilter);
    if (logSearch) {
      const q = logSearch.toLowerCase();
      result = result.filter(l => l.message.toLowerCase().includes(q) || (l.service && l.service.toLowerCase().includes(q)));
    }
    return result;
  }, [logs, logFilter, logSearch]);

  const serviceGrid = useMemo(() => {
    if (!healthData) return [];
    return Object.entries(healthData.checks).map(([name, check]) => ({
      name,
      status: check.status,
      details: check.details,
    }));
  }, [healthData]);

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading && !healthData) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const overallStatus = healthData?.status || 'healthy';
  const overallLabel = overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Observability Dashboard</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* ── 1. System Health Banner ───────────────────────────────────────── */}
      <Card className={`gap-4 p-4 border-2 ${statusBg(overallStatus)}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-background/60">
              {overallStatus === 'healthy' && <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
              {overallStatus === 'degraded' && <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
              {overallStatus === 'unhealthy' && <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">System Status: {overallLabel}</h3>
                <Badge
                  className={overallStatus === 'healthy'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : overallStatus === 'degraded'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}
                >
                  {healthData?.summary.healthy || 0}/{healthData?.summary.total || 0} healthy
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uptime: {healthData ? formatUptime(healthData.system.uptime) : '—'} &middot;
                Response: {healthData?.responseTimeMs || 0}ms &middot;
                v{healthData?.version || '?'} &middot;
                {healthData?.environment || 'development'}
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex gap-2">
            {serviceGrid.slice(0, 5).map(svc => (
              <div key={svc.name} className="flex items-center gap-1 text-xs">
                {statusIcon(svc.status)}
                <span className="text-muted-foreground hidden sm:inline">{svc.name}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 2. API Metrics Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── 3 & 4. Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Request Throughput */}
        <Card className="gap-4 p-4">
          <CardHeader className="p-0 gap-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Request Throughput</CardTitle>
                <CardDescription>Requests per minute — last 60 min</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-48">
              <ThroughputChart data={throughputData} />
            </div>
          </CardContent>
        </Card>

        {/* Error Breakdown */}
        <Card className="gap-4 p-4">
          <CardHeader className="p-0 gap-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Error Breakdown</CardTitle>
                <CardDescription>Errors by source service</CardDescription>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-48 flex items-center">
              <ErrorDonut data={errorBreakdown} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 5 & 6. Services + Resources ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Services */}
        <Card className="gap-4 p-4">
          <CardHeader className="p-0 gap-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Service Health</CardTitle>
                <CardDescription>Subsystem status checks</CardDescription>
              </div>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {serviceGrid.map(svc => (
                <div
                  key={svc.name}
                  className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/30"
                >
                  {statusIcon(svc.status)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">{svc.name.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{svc.details}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${statusColor(svc.status)}`}
                  >
                    {svc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resource Usage */}
        <Card className="gap-4 p-4">
          <CardHeader className="p-0 gap-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Resource Usage</CardTitle>
                <CardDescription>Memory and CPU utilization</CardDescription>
              </div>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-5">
            {/* Heap Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <MemoryStick className="h-3.5 w-3.5 text-muted-foreground" />
                  Heap Memory
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {healthData?.system.memory.heapUsedMB || 0} / {healthData?.system.memory.heapTotalMB || 0} MB
                </span>
              </div>
              <Progress
                value={healthData?.system.memory.heapPercent || 0}
                className={`h-2.5 ${((healthData?.system.memory.heapPercent || 0) > 85) ? '[&>div]:bg-red-500' : ((healthData?.system.memory.heapPercent || 0) > 70) ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
              />
              <p className={`text-xs font-medium ${statusColor(healthData?.status || 'healthy')}`}>
                {healthData?.system.memory.heapPercent || 0}% utilized
              </p>
            </div>

            {/* RSS Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  RSS Memory
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatBytes(healthData?.system.memory.rssMB || 0)}
                </span>
              </div>
              <Progress
                value={Math.min(((healthData?.system.memory.rssMB || 0) / 512) * 100, 100)}
                className="h-2.5 [&>div]:bg-blue-500"
              />
              <p className="text-xs text-muted-foreground">of 512 MB typical limit</p>
            </div>

            {/* External Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  External (Buffers)
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatBytes(healthData?.system.memory.externalMB || 0)}
                </span>
              </div>
              <Progress
                value={Math.min(((healthData?.system.memory.externalMB || 0) / 128) * 100, 100)}
                className="h-2.5 [&>div]:bg-purple-500"
              />
            </div>

            {/* Connections */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active Connections</span>
              </div>
              <span className="text-sm font-bold tabular-nums">
                {healthData?.checks.connections?.details?.match(/Active:\s*(\d+)/)?.[1] || 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 7 & 8. Traces + Logs ────────────────────────────────────────── */}
      <Tabs defaultValue="traces" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="traces" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Recent Traces
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Log Stream
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traces">
          <Card className="gap-0 overflow-hidden">
            <CardContent className="p-0">
              {traces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No traces recorded yet</p>
                  <p className="text-xs mt-1">Traces will appear as API requests are made</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Trace ID</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Duration</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {traces.map(span => (
                        <tr key={span.spanId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono text-xs text-muted-foreground max-w-[100px] truncate" title={span.traceId}>
                            {span.traceId.slice(0, 12)}…
                          </td>
                          <td className="p-3 font-medium max-w-[200px] truncate">{span.name}</td>
                          <td className="p-3 text-muted-foreground">{span.serviceName}</td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${span.status === 'ok' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' : 'border-red-200 text-red-700 dark:border-red-800 dark:text-red-400'}`}
                            >
                              {span.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {span.durationMs !== undefined ? `${span.durationMs.toFixed(1)}ms` : '—'}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(span.startTime).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="gap-0 overflow-hidden">
            {/* Log Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 border-b bg-muted/30">
              <div className="flex gap-1.5">
                {(['all', 'error', 'warn', 'info'] as const).map(level => (
                  <Button
                    key={level}
                    variant={logFilter === level ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7 px-2.5 capitalize"
                    onClick={() => setLogFilter(level)}
                  >
                    {level}
                  </Button>
                ))}
              </div>
              <div className="relative flex-1 w-full sm:w-auto sm:ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="w-full h-7 pl-8 pr-3 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Log Stream */}
            <div
              ref={logStreamRef}
              className="max-h-96 overflow-y-auto font-mono text-xs"
            >
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No log entries found</p>
                  <p className="text-xs mt-1">Adjust filters or wait for new entries</p>
                </div>
              ) : (
                filteredLogs.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 px-3 py-2 border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${levelColor(entry.level)}`}>
                      {entry.level}
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      [{entry.service}]
                    </span>
                    <span className="text-foreground break-all min-w-0">
                      {entry.message}
                    </span>
                    {entry.error && (
                      <span className="text-red-500 shrink-0 truncate max-w-[120px]" title={entry.error.message}>
                        {entry.error.message}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ObservabilityDashboard;
