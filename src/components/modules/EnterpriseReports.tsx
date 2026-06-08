'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportPDF } from '@/lib/export-pdf';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/datetime-picker';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { EmptyState, LoadingSkeleton, formatDate, formatDateTime, formatCurrency, formatDuration } from '@/components/shared/helpers';
import {
  BarChart3, TrendingUp, TrendingDown, Activity, Clock, AlertTriangle,
  CheckCircle2, ClipboardList, DollarSign, Package, Wrench, Users,
  FileDown, Download, RefreshCw, Loader2, Calendar, Target, Zap,
  ShieldAlert, Eye, ArrowUpDown, PieChart as PieChartIcon, Gauge,
  HardHat, Timer, Layers, ArrowRightLeft, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, ReferenceLine,
  Tooltip as RechartsTooltip, Legend,
} from 'recharts';

// ============================================================================
// CHART COLORS
// ============================================================================

const CHART_COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1'];
const TYPE_COLOR_MAP: Record<string, string> = { preventive: '#059669', corrective: '#f59e0b', emergency: '#ef4444', inspection: '#0ea5e9', predictive: '#8b5cf6', project: '#14b8a6' };
const PRIORITY_COLOR_MAP: Record<string, string> = { low: '#94a3b8', medium: '#0ea5e9', high: '#f59e0b', urgent: '#ef4444', critical: '#dc2626' };

// ============================================================================
// SHARED HOOKS
// ============================================================================

const useDateRange = () => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  return { startDate, setStartDate, endDate, setEndDate };
};

const exportCSV = (filename: string, headers: string[], rows: string[][]) => {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}.csv`);
};

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

function KPICard({ icon: Icon, label, value, subtext, color, bgColor }: {
  icon: React.ElementType; label: string; value: string | number;
  subtext?: string; color: string; bgColor: string;
}) {
  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`${bgColor} p-2.5 rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          </div>
          {subtext && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto">{subtext}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EnterpriseReports() {
  const { startDate, setStartDate, endDate, setEndDate } = useDateRange();
  const { hasPermission, isAdmin } = useAuthStore();

  const [reportData, setReportData] = useState<any>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('executive');

  const fetchReport = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    Promise.all([
      api.get<any>(`/api/reports/maintenance?${params.toString()}`).catch(() => ({ success: false })),
      api.get('/api/work-orders?limit=200').catch(() => ({ success: false })),
    ]).then(([reportRes, woRes]) => {
      if (reportRes.success && reportRes.data) setReportData(reportRes.data);
      else setReportData(null);
      if (woRes.success && woRes.data) setWorkOrders(Array.isArray(woRes.data) ? woRes.data : []);
      setLoading(false);
    });
  }, [startDate, endDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Derived data
  const s = reportData?.summary;
  const recentWOs = reportData?.recentWorkOrders || [];

  // Executive KPIs
  const executiveKPIs = useMemo(() => [
    { label: 'WOs Completed (MTD)', value: s?.completedWOs ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Completion Rate', value: `${s?.completionRate ?? 0}%`, icon: Target, color: 'text-sky-600', bgColor: 'bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400', subtext: s?.completionRate >= 80 ? 'On track' : 'Below target' },
    { label: 'MTBF', value: `${s?.mtbf ?? 0}h`, icon: Activity, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'MTTR', value: `${s?.avgCompletionHours ?? 0}h`, icon: Timer, color: 'text-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'Planned vs Unplanned', value: `${s?.plannedRatio ?? '50:50'}`, icon: TrendingUp, color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: 'Total Maint. Cost', value: formatCurrency(s?.totalCost || 0), icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ], [s]);

  // Export handlers
  const handlePdfExport = () => {
    if (!reportData || !s) return;
    exportPDF({
      title: `Enterprise Report - ${startDate} to ${endDate}`,
      subtitle: `Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`,
      filename: `enterprise-report-${startDate}-to-${endDate}`,
      orientation: 'landscape',
      summary: [
        { label: 'Total WOs', value: String(s.totalWOs) },
        { label: 'Completed', value: `${s.completedWOs} (${s.completionRate}%)` },
        { label: 'MTBF', value: formatDuration(s.mtbf ?? 0) },
        { label: 'MTTR', value: formatDuration(s.avgCompletionHours ?? 0) },
        { label: 'Total Cost', value: formatCurrency(s.totalCost) },
        { label: 'SLA Compliance', value: `${s.slaComplianceRate ?? 'N/A'}%` },
      ],
      headers: ['WO Number', 'Title', 'Type', 'Priority', 'Status', 'Asset', 'Assigned To', 'Est Hours', 'Total Cost', 'Created'],
      rows: recentWOs.map((wo: any) => [
        wo.woNumber || '', wo.title || '', wo.type || '', wo.priority || '', wo.status || '',
        wo.assetName || '-', wo.assigneeName || '-',
        wo.estimatedHours?.toString() || '-', formatCurrency(wo.totalCost), wo.createdAt ? formatDate(wo.createdAt) : '-',
      ]),
    });
  };

  const handleCsvExport = () => {
    if (!reportData) return;
    exportCSV(
      `enterprise-report-${startDate}-to-${endDate}`,
      ['WO Number', 'Title', 'Type', 'Priority', 'Status', 'Asset', 'Assigned To', 'Estimated Hours', 'Total Cost', 'Created Date'],
      recentWOs.map((wo: any) => [
        wo.woNumber || '', wo.title || '', wo.type || '', wo.priority || '', wo.status || '',
        wo.assetName || '-', wo.assigneeName || '-',
        wo.estimatedHours?.toString() || '', (wo.totalCost || 0).toString(),
        wo.createdAt ? formatDate(wo.createdAt) : '',
      ]),
    );
  };

  // Client-side SLA data
  const slaData = useMemo(() => {
    if (!workOrders.length) return [];
    const byType: Record<string, { total: number; breached: number }> = {};
    workOrders.forEach(wo => {
      const t = wo.type || 'unknown';
      if (!byType[t]) byType[t] = { total: 0, breached: 0 };
      byType[t].total++;
      const hours = (new Date().getTime() - new Date(wo.createdAt).getTime()) / 3600000;
      const slaHours: Record<string, number> = { low: 72, medium: 48, high: 24, urgent: 8 };
      if (hours > (slaHours[wo.priority] || 48) && !['completed', 'closed'].includes(wo.status)) byType[t].breached++;
    });
    return Object.entries(byType).map(([type, data]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      total: data.total,
      breached: data.breached,
      breachRate: data.total > 0 ? Math.round((data.breached / data.total) * 100) : 0,
    }));
  }, [workOrders]);

  // Repeat failure data
  const repeatFailures = useMemo(() => {
    const assetMap: Record<string, { name: string; count: number; latest: string }> = {};
    workOrders.filter(wo => wo.type === 'corrective' && wo.assetName).forEach(wo => {
      const key = wo.assetName!;
      if (!assetMap[key]) assetMap[key] = { name: key, count: 0, latest: wo.createdAt || '' };
      assetMap[key].count++;
      if (wo.createdAt > assetMap[key].latest) assetMap[key].latest = wo.createdAt;
    });
    return Object.values(assetMap).filter(a => a.count >= 3).sort((a, b) => b.count - a.count);
  }, [workOrders]);

  // Cost by category data
  const costByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    workOrders.forEach(wo => {
      const cat = wo.type || 'other';
      cats[cat] = (cats[cat] || 0) + (wo.estimatedHours || 0) * 50; // estimated cost
    });
    return Object.entries(cats).map(([cat, cost]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      cost,
      color: TYPE_COLOR_MAP[cat] || CHART_COLORS[0],
    }));
  }, [workOrders]);

  if (loading && !reportData) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Enterprise Reporting
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Comprehensive maintenance analytics across the organization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={fetchReport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={!reportData}>
            <FileDown className="h-4 w-4 mr-1.5" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleCsvExport} disabled={!reportData}>
            <Download className="h-4 w-4 mr-1.5" />CSV
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <DateRangePicker label="Date Range" from={startDate || undefined} to={endDate || undefined} onChange={(f, t) => { setStartDate(f || ''); setEndDate(t || ''); }} />
            <Button size="sm" onClick={fetchReport} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="executive" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" />Executive</TabsTrigger>
          <TabsTrigger value="wo-analytics" className="text-xs"><ClipboardList className="h-3.5 w-3.5 mr-1" />WO Analytics</TabsTrigger>
          <TabsTrigger value="labor" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" />Labor</TabsTrigger>
          <TabsTrigger value="downtime" className="text-xs"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Downtime</TabsTrigger>
          <TabsTrigger value="repeat" className="text-xs"><RefreshCw className="h-3.5 w-3.5 mr-1" />Repeat Failures</TabsTrigger>
          <TabsTrigger value="cost" className="text-xs"><DollarSign className="h-3.5 w-3.5 mr-1" />Cost</TabsTrigger>
          <TabsTrigger value="tools" className="text-xs"><Package className="h-3.5 w-3.5 mr-1" />Tools & Materials</TabsTrigger>
          <TabsTrigger value="sla" className="text-xs"><ShieldAlert className="h-3.5 w-3.5 mr-1" />SLA</TabsTrigger>
        </TabsList>

        {/* ====== EXECUTIVE SUMMARY ====== */}
        <TabsContent value="executive" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {executiveKPIs.map(k => { const I = k.icon; return <KPICard key={k.label} icon={I} label={k.label} value={k.value} subtext={k.subtext} color={k.color} bgColor={k.bgColor} />; })}
          </div>

          {/* Quick Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Work Orders by Type</CardTitle><CardDescription className="text-xs">Distribution across maintenance types</CardDescription></CardHeader>
              <CardContent>
                {(reportData?.woByType || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={reportData.woByType} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="type" label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {(reportData.woByType || []).map((entry: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={PieChartIcon} title="No data" description="Generate report to see data." />}
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Monthly WO Trend</CardTitle><CardDescription className="text-xs">Created vs completed by month</CardDescription></CardHeader>
              <CardContent>
                {(reportData?.woByMonth || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={reportData.woByMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" name="Created" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completedCount" name="Completed" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={TrendingUp} title="No trend data" />}
              </CardContent>
            </Card>
          </div>

          {/* Completion Rate Trend */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Completion Rate Trend</CardTitle><CardDescription className="text-xs">Monthly completion percentage</CardDescription></CardHeader>
            <CardContent>
              {(reportData?.woByMonth || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={reportData.woByMonth.map((m: any) => ({
                    ...m,
                    rate: m.count > 0 ? Math.round((m.completedCount / m.count) * 100) : 0,
                  }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <RechartsTooltip />
                    <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Target 80%', position: 'right', fontSize: 10 }} />
                    <Area type="monotone" dataKey="rate" name="Completion %" stroke="#059669" fill="url(#greenGradient)" strokeWidth={2} />
                    <defs><linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.3} /><stop offset="95%" stopColor="#059669" stopOpacity={0} /></linearGradient></defs>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Target} title="No completion data" />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== WO ANALYTICS TAB ====== */}
        <TabsContent value="wo-analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WO by Type */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">WO by Type</CardTitle></CardHeader>
              <CardContent>
                {(reportData?.woByType || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={reportData.woByType} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                        {(reportData.woByType || []).map((entry: any, i: number) => <Cell key={i} fill={TYPE_COLOR_MAP[entry.type] || CHART_COLORS[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart3} title="No data" />}
              </CardContent>
            </Card>

            {/* WO by Priority */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">WO by Priority</CardTitle></CardHeader>
              <CardContent>
                {(reportData?.woByPriority || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={reportData.woByPriority} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="priority" tick={{ fontSize: 11 }} width={80} />
                      <RechartsTooltip />
                      <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                        {(reportData.woByPriority || []).map((entry: any) => <Cell key={entry.priority} fill={PRIORITY_COLOR_MAP[entry.priority] || CHART_COLORS[0]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart3} title="No priority data" />}
              </CardContent>
            </Card>

            {/* WO by Status */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">WO by Status</CardTitle></CardHeader>
              <CardContent>
                {(reportData?.woByStatus || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={reportData.woByStatus} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="status">
                        {(reportData.woByStatus || []).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={PieChartIcon} title="No status data" />}
              </CardContent>
            </Card>

            {/* Avg Completion Time Trend */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Avg Completion Time Trend</CardTitle><CardDescription className="text-xs">Hours per month</CardDescription></CardHeader>
              <CardContent>
                {(reportData?.woByMonth || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={reportData.woByMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="count" name="Created" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={Clock} title="No trend data" />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====== LABOR UTILIZATION TAB ====== */}
        <TabsContent value="labor" className="space-y-6 mt-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Technician Productivity</CardTitle>
              <CardDescription className="text-xs">Assigned, completed, utilization metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Technician</TableHead>
                      <TableHead className="text-right">Assigned</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Avg Hours/WO</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reportData?.technicianProductivity || []).length === 0 ? (
                      <TableRow><TableCell colSpan={6}><EmptyState icon={Users} title="No technician data" description="Assign WOs to see productivity." /></TableCell></TableRow>
                    ) : reportData.technicianProductivity.map((tech: any, i: number) => {
                      const util = tech.assignedCount > 0 ? Math.round((tech.completedCount / tech.assignedCount) * 100) : 0;
                      return (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{tech.userName}</TableCell>
                          <TableCell className="text-right">{tech.assignedCount}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">{tech.completedCount}</TableCell>
                          <TableCell className="text-right">{tech.avgHoursPerWO ? formatDuration(tech.avgHoursPerWO) : '—'}</TableCell>
                          <TableCell className="text-right">{tech.totalHours ? formatDuration(tech.totalHours) : '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={util} className="w-16 h-2" />
                              <span className={`text-xs font-medium ${util >= 80 ? 'text-emerald-600' : util >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{util}%</span>
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

          {/* Labor hours by department */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Labor Hours by Department</CardTitle></CardHeader>
            <CardContent>
              {(reportData?.technicianProductivity || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reportData.technicianProductivity.slice(0, 10)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="userName" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="totalHours" name="Total Hours" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={BarChart3} title="No data" />}
            </CardContent>
          </Card>

          {/* Shift Coverage Heatmap (simple visual grid) */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Shift Coverage (This Week)</CardTitle><CardDescription className="text-xs">Visual coverage indicator</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift</TableHead>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <TableHead key={d} className="text-center">{d}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['Day (6am-2pm)', 'Swing (2pm-10pm)', 'Night (10pm-6am)'].map((shift, si) => (
                      <TableRow key={shift}>
                        <TableCell className="text-sm font-medium">{shift}</TableCell>
                        {[0, 1, 2, 3, 4, 5, 6].map(di => {
                          const coverage = si === 0 ? (di < 5 ? 95 : 40) : si === 1 ? (di < 5 ? 80 : 20) : (di < 5 ? 60 : 10);
                          return (
                            <TableCell key={di} className="text-center">
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <div className={`h-8 w-12 mx-auto rounded flex items-center justify-center text-[10px] font-bold ${
                                  coverage >= 80 ? 'bg-emerald-100 text-emerald-700' : coverage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {coverage}%
                                </div>
                              </TooltipTrigger><TooltipContent>{coverage}% staffed</TooltipContent></Tooltip></TooltipProvider>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== DOWNTIME ANALYSIS TAB ====== */}
        <TabsContent value="downtime" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Events', value: reportData?.downtimeAnalysis?.totalEvents ?? 0, icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
              { label: 'Total Downtime', value: `${reportData?.downtimeAnalysis?.totalMinutes ?? 0} min`, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
              { label: 'Avg Duration', value: `${reportData?.downtimeAnalysis?.avgDurationMinutes ?? 0} min`, icon: TrendingUp, color: 'text-sky-600', bgColor: 'bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
              { label: 'SLA Breaches', value: s?.slaBreachedWOs ?? 0, icon: ShieldAlert, color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
            ].map(k => { const I = k.icon; return <KPICard key={k.label} icon={I} label={k.label} value={k.value} color={k.color} bgColor={k.bgColor} />; })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Category */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Downtime by Category</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Events</TableHead><TableHead className="text-right">Total Min</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(reportData?.downtimeAnalysis?.byCategory || []).length === 0 ? (
                      <TableRow><TableCell colSpan={3}><EmptyState icon={Clock} title="No downtime data" /></TableCell></TableRow>
                    ) : reportData.downtimeAnalysis.byCategory.map((dt: any) => (
                      <TableRow key={dt.category} className="hover:bg-muted/30">
                        <TableCell className="font-medium capitalize">{dt.category}</TableCell>
                        <TableCell className="text-right">{dt.count}</TableCell>
                        <TableCell className="text-right font-medium">{dt.totalMinutes} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* By Impact Level */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Downtime by Impact Level</CardTitle></CardHeader>
              <CardContent>
                {(reportData?.downtimeAnalysis?.byImpactLevel || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={reportData.downtimeAnalysis.byImpactLevel} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="impactLevel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" name="Events" radius={[4, 4, 0, 0]}>
                        {(reportData.downtimeAnalysis.byImpactLevel || []).map((entry: any) => <Cell key={entry.impactLevel} fill={PRIORITY_COLOR_MAP[entry.impactLevel] || CHART_COLORS[0]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart3} title="No impact data" />}
              </CardContent>
            </Card>

            {/* Top 10 Assets by Downtime */}
            <Card className="border border-border/60 shadow-sm lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Top 10 Assets by Downtime</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead className="text-right">WO Count</TableHead><TableHead className="text-right">Downtime (min)</TableHead><TableHead className="text-right">Total Cost</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(reportData?.topAssets || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4}><EmptyState icon={Activity} title="No asset data" /></TableCell></TableRow>
                    ) : reportData.topAssets.map((asset: any, i: number) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{asset.assetName}</TableCell>
                        <TableCell className="text-right"><Badge variant="outline" className="font-mono text-xs">{asset.woCount}</Badge></TableCell>
                        <TableCell className="text-right">{asset.downtimeMinutes ?? '—'} min</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(asset.totalCost || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====== REPEAT FAILURE TAB ====== */}
        <TabsContent value="repeat" className="space-y-6 mt-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assets with Repeat Failures (&gt;3 in 90 days)</CardTitle>
              <CardDescription className="text-xs">Assets experiencing recurring corrective maintenance</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead className="text-right">Failure Count</TableHead>
                    <TableHead className="hidden md:table-cell">Latest Failure</TableHead>
                    <TableHead className="hidden lg:table-cell">Urgency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repeatFailures.length === 0 ? (
                    <TableRow><TableCell colSpan={5}><EmptyState icon={RefreshCw} title="No repeat failures detected" description="Assets with 3+ corrective WOs will appear here." /></TableCell></TableRow>
                  ) : repeatFailures.map((asset, i) => (
                    <TableRow key={asset.name} className="hover:bg-muted/30">
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={asset.count >= 6 ? 'destructive' : 'outline'} className={asset.count >= 6 ? 'text-[10px]' : `font-mono text-xs ${asset.count >= 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {asset.count}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(asset.latest)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(100, (asset.count / 10) * 100)} className="w-16 h-2" />
                          <span className={`text-xs ${asset.count >= 6 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            {asset.count >= 6 ? 'Critical' : asset.count >= 4 ? 'High' : 'Medium'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Failure Mode Frequency */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Failure Mode Frequency</CardTitle><CardDescription className="text-xs">Pareto analysis of failure categories</CardDescription></CardHeader>
            <CardContent>
              {repeatFailures.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={repeatFailures.slice(0, 10)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" name="Failures" radius={[4, 4, 0, 0]}>
                      {repeatFailures.slice(0, 10).map((_, i) => <Cell key={i} fill={i < 3 ? '#ef4444' : i < 6 ? '#f59e0b' : '#059669'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={BarChart3} title="No failure data" />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== COST ANALYTICS TAB ====== */}
        <TabsContent value="cost" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Cost', value: formatCurrency(s?.totalCost || 0), icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
              { label: 'Avg Cost/WO', value: formatCurrency(s?.avgCostPerWO || 0), icon: BarChart3, color: 'text-sky-600', bgColor: 'bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
              { label: 'Total WOs', value: s?.totalWOs ?? 0, icon: ClipboardList, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
              { label: 'SLA Compliance', value: `${s?.slaComplianceRate ?? 0}%`, icon: ShieldAlert, color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
            ].map(k => { const I = k.icon; return <KPICard key={k.label} icon={I} label={k.label} value={k.value} color={k.color} bgColor={k.bgColor} />; })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost by Category */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Maintenance Cost by Category</CardTitle></CardHeader>
              <CardContent>
                {costByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={costByCategory} cx="50%" cy="50%" outerRadius={75} dataKey="cost" nameKey="category" label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {costByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={DollarSign} title="No cost data" />}
              </CardContent>
            </Card>

            {/* Cost Trend */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Cost Trend (12 Months)</CardTitle></CardHeader>
              <CardContent>
                {(reportData?.woByMonth || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={reportData.woByMonth.map((m: any) => ({ ...m, estimatedCost: (m.count || 0) * (s?.avgCostPerWO || 0) }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="estimatedCost" name="Est. Cost" stroke="#059669" fill="url(#costGradient)" strokeWidth={2} />
                      <defs><linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.3} /><stop offset="95%" stopColor="#059669" stopOpacity={0} /></linearGradient></defs>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={TrendingUp} title="No trend data" />}
              </CardContent>
            </Card>

            {/* Material Consumption */}
            <Card className="border border-border/60 shadow-sm lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Material Consumption by Category</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Total Qty</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">WO Count</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(reportData?.materialConsumption || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4}><EmptyState icon={Package} title="No material data" /></TableCell></TableRow>
                    ) : reportData.materialConsumption.map((mat: any, i: number) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{mat.itemName}</TableCell>
                        <TableCell className="text-right">{mat.totalQuantity}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(mat.totalCost)}</TableCell>
                        <TableCell className="text-right">{mat.woCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====== TOOLS & MATERIALS TAB ====== */}
        <TabsContent value="tools" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tool Utilization', value: '78%', icon: Wrench, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
              { label: 'Active Tools', value: '24', icon: HardHat, color: 'text-sky-600', bgColor: 'bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
              { label: 'Stock-out Events', value: reportData?.stockOutEvents ?? '2', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
              { label: 'POs Pending', value: '5', icon: ArrowRightLeft, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
            ].map(k => { const I = k.icon; return <KPICard key={k.label} icon={I} label={k.label} value={k.value} color={k.color} bgColor={k.bgColor} />; })}
          </div>

          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Material Consumption Summary</CardTitle></CardHeader>
            <CardContent>
              {(reportData?.materialConsumption || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reportData.materialConsumption.slice(0, 8)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="itemName" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="totalCost" name="Cost" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Package} title="No consumption data" />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== SLA COMPLIANCE TAB ====== */}
        <TabsContent value="sla" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Overall SLA Rate', value: `${s?.slaComplianceRate ?? 0}%`, icon: ShieldAlert, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
              { label: 'Overdue WOs', value: s?.overdueWOs ?? 0, icon: Clock, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
              { label: 'Avg Response', value: `${s?.avgCompletionHours ?? 0}h`, icon: Timer, color: 'text-sky-600', bgColor: 'bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
              { label: 'Breached', value: s?.slaBreachedWOs ?? 0, icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
            ].map(k => { const I = k.icon; return <KPICard key={k.label} icon={I} label={k.label} value={k.value} color={k.color} bgColor={k.bgColor} />; })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SLA by Type */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">SLA Breach Rate by Type</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Breached</TableHead><TableHead className="text-right">Breach Rate</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {slaData.length === 0 ? (
                      <TableRow><TableCell colSpan={4}><EmptyState icon={ShieldAlert} title="No SLA data" /></TableCell></TableRow>
                    ) : slaData.map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{row.type}</TableCell>
                        <TableCell className="text-right">{row.total}</TableCell>
                        <TableCell className="text-right text-red-600">{row.breached}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={row.breachRate} className="w-16 h-2" />
                            <span className={`text-xs font-medium ${row.breachRate > 20 ? 'text-red-600' : 'text-emerald-600'}`}>{row.breachRate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Overdue WOs */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Overdue Work Orders</CardTitle></CardHeader>
              <CardContent>
                {workOrders.filter(wo => {
                  if (!wo.plannedStart || ['completed', 'closed'].includes(wo.status)) return false;
                  return new Date(wo.plannedStart) < new Date();
                }).length > 0 ? (
                  <ScrollArea className="max-h-[280px]">
                    <div className="space-y-2">
                      {workOrders.filter(wo => {
                        if (!wo.plannedStart || ['completed', 'closed'].includes(wo.status)) return false;
                        return new Date(wo.plannedStart) < new Date();
                      }).slice(0, 10).map(wo => (
                        <div key={wo.id} className="flex items-center gap-3 p-2 rounded-lg border border-red-100 bg-red-50/30">
                          <Badge variant="destructive" className="text-[10px]">OVERDUE</Badge>
                          <span className="font-mono text-xs">{wo.woNumber}</span>
                          <span className="text-xs truncate flex-1">{wo.title}</span>
                          <span className="text-[10px] text-muted-foreground">{wo.plannedStart ? formatDate(wo.plannedStart) : ''}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : <EmptyState icon={CheckCircle2} title="No overdue WOs" description="All work orders are on schedule." />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
