'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Target, Gauge, TrendingUp, TrendingDown, Zap, BarChart3, Activity,
  AlertTriangle, Factory, Clock, ArrowUpDown, RefreshCw, Search, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { EmptyState, StatusBadge, PriorityBadge, LoadingSkeleton, formatDate } from '@/components/shared/helpers';

export function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    let active = true;
    api.get(`/api/analytics?period=${period}`).then(res => {
      if (active) {
        if (res.success && res.data) setData(res.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [period]);

  if (loading) return <LoadingSkeleton />;

  const kpis = data?.kpis || {};
  const costs = data?.costs || {};
  const charts = data?.charts || {};

  const kpiCards = [
    { label: 'MTTR', value: `${kpis.mttr || 0} hrs`, icon: Timer, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'MTBF', value: `${kpis.mtbf || 0} hrs`, icon: Activity, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Asset Utilization', value: `${kpis.assetUtilization || 0}%`, icon: Gauge, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'PM Compliance', value: `${kpis.pmCompliance || 0}%`, icon: Target, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: 'SLA Compliance', value: `${kpis.slaCompliance || 0}%`, icon: CheckCircle2, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const woStatusData = (charts.woStatus || []).map((s: any, i: number) => ({
    status: s.status || s.name || `Status ${i}`,
    count: s.count || s.value || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const woStatusConfig = Object.fromEntries(woStatusData.map((s: any, i: number) => [s.status.toLowerCase().replace(/ /g, '_'), { label: s.status, color: CHART_COLORS[i % CHART_COLORS.length] }])) as any;

  const conditionData = (charts.assetCondition || []).map((c: any) => ({
    name: c.condition || c.name || 'Unknown',
    value: c.count || c.value || 0,
    fill: CHART_COLORS[(charts.assetCondition || []).indexOf(c) % CHART_COLORS.length],
  }));

  const conditionConfig = Object.fromEntries(conditionData.map((c: any) => [c.name, { label: c.name, color: c.fill }])) as any;

  const dailyTrendData = (charts.dailyTrend || []).map((d: any) => ({
    date: d.date ? d.date.slice(5) : d.date,
    created: d.created || d.total || 0,
    completed: d.completed || 0,
  }));

  const trendConfig = {
    created: { label: 'Created', color: '#06b6d4' },
    completed: { label: 'Completed', color: '#10b981' },
  } as const;

  const topAssetsData = (charts.topMaintainedAssets || []).map((a: any) => ({
    name: a.name || 'Unknown',
    count: a.count || a.hours || 0,
  }));

  const topAssetsConfig = {
    count: { label: 'WO Count', color: '#10b981' },
  } as const;

  const priorityData = (charts.woPriority || []).map((p: any, i: number) => ({
    priority: (p.priority || p.name || 'Unknown').charAt(0).toUpperCase() + (p.priority || p.name || 'Unknown').slice(1),
    count: p.count || p.value || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const priorityConfig = Object.fromEntries(priorityData.map((p: any, i: number) => [p.priority.toLowerCase(), { label: p.priority, color: CHART_COLORS[i % CHART_COLORS.length] }])) as any;

  const mrCategoryData = (charts.mrCategories || []).map((c: any, i: number) => ({
    category: c.category || c.name || 'Other',
    count: c.count || c.value || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const mrCatConfig = Object.fromEntries(mrCategoryData.map((c: any, i: number) => [c.category.toLowerCase().replace(/ /g, '_'), { label: c.category, color: CHART_COLORS[i % CHART_COLORS.length] }])) as any;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Maintenance performance insights and KPIs</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpiCards.map(kpi => (
          <Card key={kpi.label} className="border-0 shadow-sm dark:bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${kpi.color}`}><kpi.icon className="h-4.5 w-4.5" /></div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Summary */}
      <Card className="border-0 shadow-sm dark:bg-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Cost Summary</CardTitle><CardDescription className="text-xs">Financial overview</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">${((costs.totalMaintenanceCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Total Maint. Cost</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">${((costs.totalLaborCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Labor Cost</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">${((costs.totalPartsCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Parts Cost</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">${((costs.inventoryValue || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Inventory Value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WO Status Distribution */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Work Order Status</CardTitle><CardDescription className="text-xs">Current distribution</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={woStatusConfig} className="h-[260px] w-full">
              <BarChart data={woStatusData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {woStatusData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Asset Condition Donut */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Asset Condition</CardTitle><CardDescription className="text-xs">Distribution by condition</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={conditionConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={conditionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" strokeWidth={2} stroke="hsl(var(--background))">
                  {conditionData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {conditionData.map((c: any) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.fill }} />
                  <span className="text-muted-foreground">{c.name} ({c.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily WO Trend */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Daily WO Trend</CardTitle><CardDescription className="text-xs">Created vs completed</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[260px] w-full">
              <AreaChart data={dailyTrendData} margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="created" stroke="var(--color-created)" fill="var(--color-created)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="completed" stroke="var(--color-completed)" fill="var(--color-completed)" fillOpacity={0.3} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Maintained Assets */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Maintained Assets</CardTitle><CardDescription className="text-xs">By work order count</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={topAssetsConfig} className="h-[260px] w-full">
              <BarChart data={topAssetsData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="var(--color-count)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* WO Priority Pie */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">WO Priority Mix</CardTitle><CardDescription className="text-xs">Distribution by priority</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={priorityConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={priorityData} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="priority" strokeWidth={2} stroke="hsl(var(--background))">
                  {priorityData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {priorityData.map((p: any) => (
                <div key={p.priority} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.fill }} />
                  <span className="text-muted-foreground">{p.priority} ({p.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* MR Category Bar */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">MR Categories</CardTitle><CardDescription className="text-xs">Requests by category</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={mrCatConfig} className="h-[260px] w-full">
              <BarChart data={mrCategoryData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {mrCategoryData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// NOTIFICATION POPOVER (Header)
// ============================================================================

// --- AnalyticsKpiPage separator ---
export function AnalyticsKpiPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<WorkOrder[]>('/api/work-orders'),
      api.get<MaintenanceRequest[]>('/api/maintenance-requests'),
    ]).then(([statsRes, woRes, mrRes]) => {
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (woRes.success && woRes.data) setWorkOrders(woRes.data);
      if (mrRes.success && mrRes.data) setRequests(mrRes.data);
      setLoading(false);
    });
  }, []);

  const totalWOs = stats?.totalWorkOrders || 0;
  const completedWOs = stats?.completedWorkOrders || 0;
  const completionRate = totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0;
  const completedList = workOrders.filter(wo => wo.status === 'completed' || wo.status === 'verified' || wo.status === 'closed');
  const mttr = completedList.length > 0 ? (completedList.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) / completedList.length).toFixed(1) : '0.0';
  const preventiveWOs = stats?.preventiveWO || 0;
  const pmCompliance = totalWOs > 0 ? Math.round((preventiveWOs / totalWOs) * 100) : 0;

  const kpiCards = [
    { label: 'Total Assets', value: '-', icon: Building2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Active Work Orders', value: stats?.activeWorkOrders || 0, icon: Wrench, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'MTTR (Hours)', value: mttr, icon: Timer, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Overdue WOs', value: stats?.overdueWorkOrders || 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'PM Compliance', value: `${pmCompliance}%`, icon: ClipboardCheck, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const recentWOs = [...workOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentMRs = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1><p className="text-muted-foreground mt-1">Organization-wide key performance indicators for maintenance, reliability, and operations</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {kpiCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border"><CardHeader><CardTitle className="text-base">Recent Work Orders</CardTitle><CardDescription className="text-xs">Latest work order activity</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {recentWOs.map(wo => (
                <div key={wo.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{wo.woNumber}</span>
                    <span className="font-medium text-sm truncate">{wo.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0"><StatusBadge status={wo.status} /></div>
                </div>
              ))}
              {recentWOs.length === 0 && <EmptyState icon={Wrench} title="No work orders" description="Work orders will appear here." />}
            </div>
          </CardContent></Card>
          <Card className="border"><CardHeader><CardTitle className="text-base">Recent Maintenance Requests</CardTitle><CardDescription className="text-xs">Latest request activity</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {recentMRs.map(mr => (
                <div key={mr.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{mr.requestNumber}</span>
                    <span className="font-medium text-sm truncate">{mr.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0"><StatusBadge status={mr.status} /></div>
                </div>
              ))}
              {recentMRs.length === 0 && <EmptyState icon={ClipboardList} title="No requests" description="Maintenance requests will appear here." />}
            </div>
          </CardContent></Card>
        </div>
      </>)}
    </div>
  );
}

const gaugeColor = (val: number) => {
  if (val >= 85) return 'text-emerald-500';
  if (val >= 65) return 'text-amber-500';
  return 'text-red-500';
};
const gaugeBg = (val: number) => {
  if (val >= 85) return 'bg-emerald-100 dark:bg-emerald-900/30';
  if (val >= 65) return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
};
const gaugeStrokeColor = (val: number) => {
  if (val >= 85) return 'stroke-emerald-500';
  if (val >= 65) return 'stroke-amber-500';
  return 'stroke-red-500';
};

function GaugeCircle({ value, label, size = 140 }: { value: number; label: string; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`rounded-2xl p-4 ${gaugeBg(value)}`}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted" strokeWidth="10" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className={gaugeStrokeColor(value)} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${gaugeColor(value)}`}>{value}%</span>
        </div>
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function AnalyticsOeePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [assetRes, woRes] = await Promise.all([
          api.get('/api/assets?limit=9999'),
          api.get('/api/work-orders?limit=9999'),
        ]);
        if (assetRes.success && assetRes.data) setAssets(Array.isArray(assetRes.data) ? assetRes.data : []);
        if (woRes.success && woRes.data) setWorkOrders(Array.isArray(woRes.data) ? woRes.data : []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  // OEE data calculated from assets and work orders
  const operationalAssets = assets.filter((a: any) => a.status === 'operational').length;
  const activeAssets = assets.filter((a: any) => !['disposed', 'retired', 'decommissioned'].includes(a.status)).length;
  const totalAssets = activeAssets || 1;

  // Availability = operational assets / active assets * 100
  const availability = activeAssets > 0 ? Math.round((operationalAssets / totalAssets) * 100) : 0;

  // Performance = completed WOs on time / total completed WOs * 100
  const completedWOs = workOrders.filter((wo: any) => wo.status === 'completed' || wo.status === 'closed');
  const completedWithDue = completedWOs.filter((wo: any) => wo.plannedEnd);
  const onTimeWOs = completedWithDue.filter((wo: any) => wo.actualEnd && new Date(wo.actualEnd) <= new Date(wo.plannedEnd));
  const performance = completedWithDue.length > 0 ? Math.round((onTimeWOs.length / completedWithDue.length) * 100) : 0;

  // Quality = WOs completed without rework mentions / total completed * 100
  const reworkPattern = /rework|redo|repeat|refurbish|re-fix|rework required|defective/i;
  const withoutRework = completedWOs.filter((wo: any) => !(wo.notes && reworkPattern.test(wo.notes)) && !(wo.completionNotes && reworkPattern.test(wo.completionNotes)));
  const quality = completedWOs.length > 0 ? Math.round((withoutRework.length / completedWOs.length) * 100) : 0;

  const oee = Math.round((availability * performance * quality) / 10000 * 100) / 100;

  const oeeTarget = 85;
  const gap = oee - oeeTarget;

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OEE Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overall Equipment Effectiveness — Availability × Performance × Quality</p>
      </div>

      {/* OEE Score */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
            <div className="flex flex-col items-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Overall OEE</p>
              <div className={`relative w-44 h-44 rounded-2xl p-4 ${gaugeBg(oee)}`}>
                <svg width="144" height="144" className="-rotate-90">
                  <circle cx="72" cy="72" r="60" fill="none" className="stroke-muted" strokeWidth="12" />
                  <circle cx="72" cy="72" r="60" fill="none" className={gaugeStrokeColor(oee)} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 - (oee / 100) * 2 * Math.PI * 60}
                    style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${gaugeColor(oee)}`}>{oee}%</span>
                  <span className="text-xs text-muted-foreground">Target: {oeeTarget}%</span>
                </div>
              </div>
              <Badge variant={oee >= oeeTarget ? 'default' : 'secondary'} className={`mt-2 ${oee >= oeeTarget ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                {gap >= 0 ? `${gap.toFixed(1)}% above target` : `${Math.abs(gap).toFixed(1)}% below target`}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-8">
              <GaugeCircle value={availability} label="Availability" />
              <GaugeCircle value={performance} label="Performance" />
              <GaugeCircle value={quality} label="Quality" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OEE Breakdown */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">OEE Breakdown</CardTitle><CardDescription>Component contribution to overall OEE</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: 'Availability', value: availability, desc: 'Planned vs unplanned downtime' },
              { label: 'Performance', value: performance, desc: 'Speed losses and minor stops' },
              { label: 'Quality', value: quality, desc: 'Defect rate and rework' },
            ].map(item => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">{item.label}</span>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <span className={`text-sm font-bold ${gaugeColor(item.value)}`}>{item.value}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${item.value >= 85 ? 'bg-emerald-500' : item.value >= 65 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Losses - derived from work order data */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Loss Categories</CardTitle><CardDescription>Production loss analysis derived from asset and work order data</CardDescription></CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {(() => {
              const allWOs = workOrders;
              const unplannedHours = allWOs.filter((wo: any) => wo.type === 'corrective' || wo.type === 'emergency').reduce((s: number, wo: any) => s + (wo.actualHours || 0), 0);
              const plannedHours = allWOs.filter((wo: any) => wo.type === 'preventive').reduce((s: number, wo: any) => s + (wo.actualHours || 0), 0);
              const inspectionHours = allWOs.filter((wo: any) => wo.type === 'inspection').reduce((s: number, wo: any) => s + (wo.actualHours || 0), 0);
              const reworkHours = allWOs.filter((wo: any) => (wo.notes && reworkPattern.test(wo.notes)) || (wo.completionNotes && reworkPattern.test(wo.completionNotes))).reduce((s: number, wo: any) => s + (wo.actualHours || 0), 0);
              const totalLossHours = unplannedHours + plannedHours + inspectionHours + reworkHours || 1;
              const speedLossHours = totalLossHours > 0 ? totalLossHours * ((100 - performance) / 100) * 0.5 : 0;
              const minorStopHours = totalLossHours > 0 ? totalLossHours * 0.08 : 0;
              const grandTotal = unplannedHours + plannedHours + speedLossHours + reworkHours + inspectionHours + minorStopHours || 1;

              const losses = [
                { type: 'Unplanned Downtime', hours: Math.round(unplannedHours * 10) / 10, pct: Math.round((unplannedHours / grandTotal) * 100), color: 'bg-red-500' },
                { type: 'Speed Loss', hours: Math.round(speedLossHours * 10) / 10, pct: Math.round((speedLossHours / grandTotal) * 100), color: 'bg-amber-500' },
                { type: 'Planned Downtime', hours: Math.round(plannedHours * 10) / 10, pct: Math.round((plannedHours / grandTotal) * 100), color: 'bg-sky-500' },
                { type: 'Quality Rejects', hours: Math.round(reworkHours * 10) / 10, pct: Math.round((reworkHours / grandTotal) * 100), color: 'bg-orange-500' },
                { type: 'Setup / Changeover', hours: Math.round(inspectionHours * 10) / 10, pct: Math.round((inspectionHours / grandTotal) * 100), color: 'bg-violet-500' },
                { type: 'Minor Stops', hours: Math.round(minorStopHours * 10) / 10, pct: Math.round((minorStopHours / grandTotal) * 100), color: 'bg-teal-500' },
              ].filter(l => l.hours > 0).sort((a, b) => b.hours - a.hours);

              return losses.length > 0 ? losses.map(loss => (
                <div key={loss.type} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${loss.color} shrink-0`} />
                  <span className="text-sm flex-1 truncate">{loss.type}</span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{loss.hours}h</span>
                  <div className="w-20 bg-muted rounded-full h-2"><div className={`h-full rounded-full ${loss.color}`} style={{ width: `${loss.pct}%` }} /></div>
                  <span className="text-xs font-semibold w-10 text-right">{loss.pct}%</span>
                </div>
              )) : (
                <div className="text-sm text-muted-foreground text-center py-6">No loss data available from work orders</div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Asset-level OEE */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Asset OEE Scores</CardTitle><CardDescription>Estimated OEE per asset based on condition and status</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Condition</TableHead>
                  <TableHead>Est. OEE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.slice(0, 15).map((a: any) => {
                  let estOee = 0;
                  if (a.status === 'operational' && (a.condition === 'good' || a.condition === 'new')) estOee = 90;
                  else if (a.status === 'operational' && a.condition === 'fair') estOee = 70;
                  else if (a.status === 'operational' && a.condition === 'poor') estOee = 50;
                  else if (a.status === 'standby') estOee = 40;
                  else if (a.status === 'under_maintenance') estOee = 15;
                  else estOee = 0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.name || a.assetTag}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{typeof a.category === 'object' && a.category ? (a.category.name || a.category.code || '-') : (a.category || '-')}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[11px] capitalize">{a.status?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell"><Badge variant="outline" className="text-[11px] capitalize">{a.condition}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2"><div className={`h-full rounded-full ${estOee >= 85 ? 'bg-emerald-500' : estOee >= 65 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, estOee)}%` }} /></div>
                          <span className={`text-sm font-semibold ${gaugeColor(estOee)}`}>{estOee}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export function AnalyticsDowntimePage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<WorkOrder[]>('/api/work-orders').then(res => {
      if (res.success && res.data) setWorkOrders(res.data);
      setLoading(false);
    });
  }, []);

  const downtimeEvents = workOrders.filter(wo => wo.type === 'corrective' || wo.type === 'emergency');
  const totalEvents = downtimeEvents.length;
  const completedDowntime = downtimeEvents.filter(wo => wo.status === 'completed' || wo.status === 'verified' || wo.status === 'closed');
  const avgResolutionTime = completedDowntime.length > 0 ? (completedDowntime.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) / completedDowntime.length).toFixed(1) : '0.0';
  const costImpact = downtimeEvents.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);

  const assetFreq: Record<string, number> = {};
  downtimeEvents.forEach(wo => {
    const name = wo.assetName || 'Unknown';
    assetFreq[name] = (assetFreq[name] || 0) + 1;
  });
  const mostAffected = Object.entries(assetFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const sortedEvents = [...downtimeEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const kpis = [
    { label: 'Downtime Events', value: totalEvents, icon: TrendingDown, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Avg Resolution (Hrs)', value: avgResolutionTime, icon: Timer, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Most Affected', value: mostAffected.length > 0 ? mostAffected[0][0] : '-', icon: AlertTriangle, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: 'Cost Impact', value: `$${costImpact.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Downtime Analysis</h1><p className="text-muted-foreground mt-1">Track and analyze equipment downtime events, causes, and patterns</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{typeof k.value === 'string' && k.value.length > 14 ? k.value.slice(0, 14) + '...' : k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        {mostAffected.length > 0 && (
          <Card className="border"><CardHeader><CardTitle className="text-base">Most Affected Assets</CardTitle><CardDescription className="text-xs">Top assets by downtime frequency</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {mostAffected.map(([name, count], i) => {
                const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-6">#{i + 1}</span>
                    <span className="text-sm font-medium flex-1 truncate">{name}</span>
                    <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{count} events</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        )}
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Title</TableHead><TableHead className="hidden md:table-cell">Asset</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell text-right">Hours</TableHead><TableHead className="hidden lg:table-cell text-right">Cost</TableHead><TableHead className="hidden xl:table-cell">Created</TableHead></TableRow></TableHeader><TableBody>
          {sortedEvents.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="h-48"><EmptyState icon={TrendingDown} title="No downtime events" description="Corrective and emergency work orders will appear here." /></TableCell></TableRow>
          ) : sortedEvents.map(wo => (
            <TableRow key={wo.id} className="hover:bg-muted/30">
              <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
              <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
              <TableCell className="text-sm hidden md:table-cell">{wo.assetName || '-'}</TableCell>
              <TableCell><Badge variant="outline" className={wo.type === 'emergency' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>{wo.type.toUpperCase()}</Badge></TableCell>
              <TableCell><PriorityBadge priority={wo.priority} /></TableCell>
              <TableCell><StatusBadge status={wo.status} /></TableCell>
              <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{wo.actualHours || '-'}</TableCell>
              <TableCell className="text-right font-medium hidden lg:table-cell">${(wo.totalCost || 0).toLocaleString()}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden xl:table-cell">{formatDate(wo.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
export function AnalyticsEnergyPage() {
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/meter-readings?limit=9999');
        if (res.success && res.data) setReadings(Array.isArray(res.data) ? res.data : []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  // Energy data from meter readings
  const UNIT_COST_RATE = 0.60;
  const totalConsumption = readings.reduce((sum: number, r: any) => sum + (r.consumption || 0), 0);
  const totalCost = Math.round(totalConsumption * UNIT_COST_RATE);
  const uniqueDays = new Set(readings.map((r: any) => {
    const d = new Date(r.readingDate);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })).size;
  const avgDailyConsumption = uniqueDays > 0 ? Math.round(totalConsumption / uniqueDays) : 0;
  const efficiencyScore = totalConsumption > 0 ? Math.min(95, Math.max(40, 100 - Math.round((readings.filter((r: any) => r.consumption && r.consumption > 0 && r.previousValue && r.previousValue > 0 && ((r.value - r.previousValue) / r.previousValue) > 0.15).length / Math.max(1, readings.filter((r: any) => r.consumption && r.consumption > 0).length)) * 30))) : 0;

  const summaryCards = [
    { label: 'Total Consumption', value: totalConsumption > 0 ? `${(totalConsumption / 1000).toFixed(1)} MWh` : '0 MWh', icon: Zap, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Total Cost', value: totalCost > 0 ? `$${(totalCost / 1000).toFixed(1)}k` : '$0', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Avg Daily', value: `${avgDailyConsumption} kWh`, icon: BarChart3, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Efficiency Score', value: `${efficiencyScore}%`, icon: Target, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  // Monthly consumption trend — group real readings by month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap: Record<string, number> = {};
  readings.forEach((r: any) => {
    if (!r.readingDate) return;
    const d = new Date(r.readingDate);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + (r.consumption || 0);
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, kwh]) => {
      const parts = key.split('-');
      return { month: monthNames[parseInt(parts[1], 10)] || key, kwh: Math.round(kwh), cost: Math.round(kwh * UNIT_COST_RATE) };
    });
  const maxKwh = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.kwh)) : 1;

  // Real meter readings for the table (show readings with consumption)
  const meterReadings = readings.filter((r: any) => r.consumption && r.consumption > 0).slice(0, 20).map((r: any) => ({
    id: r.id,
    meter: r.meterName || r.readingNumber || '-',
    reading: String(r.value),
    date: r.readingDate ? new Date(r.readingDate).toISOString().split('T')[0] : '-',
    consumption: Math.round(r.consumption),
    cost: Math.round(r.consumption * UNIT_COST_RATE),
  }));

  // Top consumers — group consumption by meter name
  const meterConsumption: Record<string, number> = {};
  readings.forEach((r: any) => {
    if (r.meterName && r.consumption && r.consumption > 0) {
      meterConsumption[r.meterName] = (meterConsumption[r.meterName] || 0) + r.consumption;
    }
  });
  const topConsumers = Object.entries(meterConsumption)
    .map(([name, consumption]) => ({ name, consumption: Math.round(consumption) }))
    .sort((a, b) => b.consumption - a.consumption)
    .slice(0, 8);
  const maxConsumption = topConsumers.length > 0 ? topConsumers[0].consumption : 1;

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Energy Analytics</h1>
        <p className="text-muted-foreground mt-1">Monitor energy consumption patterns and optimize usage across assets</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`h-10 w-10 rounded-lg ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly consumption trend */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Consumption Trend</CardTitle><CardDescription>kWh per month from meter readings</CardDescription></CardHeader>
          <CardContent className="space-y-2.5">
            {monthlyData.map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs font-medium w-8 text-muted-foreground">{m.month}</span>
                <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${m.kwh >= 5000 ? 'bg-red-400' : m.kwh >= 4000 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${(m.kwh / maxKwh) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold w-16 text-right">{m.kwh.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-[10px] text-muted-foreground">&lt; 4,000 kWh</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-400" /><span className="text-[10px] text-muted-foreground">4,000-5,000</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-400" /><span className="text-[10px] text-muted-foreground">&gt; 5,000 kWh</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Top energy consumers */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Energy Consumers</CardTitle><CardDescription>Assets ranked by estimated consumption</CardDescription></CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {topConsumers.map((c: any, i: number) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                <span className="text-sm flex-1 truncate">{c.name}</span>
                <div className="w-24 bg-muted rounded-full h-2"><div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(c.consumption / maxConsumption) * 100}%` }} /></div>
                <span className="text-xs font-semibold w-16 text-right">{c.consumption.toLocaleString()} kWh</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Meter readings table */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Meter Readings</CardTitle><CardDescription>Latest meter readings and consumption data</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meter</TableHead>
                  <TableHead className="hidden md:table-cell">Reading</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Consumption (kWh)</TableHead>
                  <TableHead className="hidden md:table-cell">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meterReadings.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-sm font-mono">{m.meter}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{m.reading}</TableCell>
                    <TableCell className="text-sm hidden sm:table-cell">{m.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-muted rounded-full h-1.5"><div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, (m.consumption / 3500) * 100)}%` }} /></div>
                        <span className="text-sm font-semibold">{m.consumption.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">${m.cost.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// OPERATIONS SUBPAGES
// ============================================================================

