'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/datetime-picker';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent
} from '@/components/ui/chart';
import {
  Activity, AlertTriangle, Clock, Wrench, Package, Timer, TrendingDown,
  FileBarChart, Download, RefreshCw, BarChart3, DollarSign, Zap,
  ShieldAlert, Factory, HardHat, Users, Boxes, Loader2,
  Hammer, CircleStop, Gauge, ChartPie, ArrowDownUp, Pause, Construction
} from 'lucide-react';
import { EmptyState, LoadingSkeleton, formatCurrency } from '@/components/shared/helpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1'];

const TRADE_COLORS: Record<string, string> = {
  mechanical: '#059669', electrical: '#0ea5e9', civil: '#f59e0b',
  facility: '#8b5cf6', workshop: '#f97316', other: '#6b7280', unspecified: '#94a3b8',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8', medium: '#0ea5e9', high: '#f59e0b', critical: '#ef4444',
};

type ReportData = {
  summary: any;
  downtime: any;
  responseTime: any;
  breakdowns: any;
  manHours: any;
  materials: any;
  failureRate: any;
  stoppages: any;
  cost: any;
  distribution: any;
};

// ============================================================================
// HOOKS
// ============================================================================

const useDateRange = () => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  return { startDate, setStartDate, endDate, setEndDate };
};

// ============================================================================
// HELPERS
// ============================================================================

const exportCSV = (filename: string, headers: string[], rows: string[][]) => {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}.csv`);
};

function formatHours(h: number | null | undefined): string {
  if (h == null || isNaN(h)) return '-';
  return `${h.toFixed(1)}h`;
}

function formatRate(r: number | null | undefined): string {
  if (r == null || isNaN(r)) return '-';
  return `${r.toFixed(1)}%`;
}

function getColorForKey(key: string, fallback: string): string {
  return TRADE_COLORS[key] || PRIORITY_COLORS[key] || fallback;
}

// ============================================================================
// KPICard
// ============================================================================

function KPICard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold truncate">{value}</p>
            <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WOReportsPage() {
  const { startDate, setStartDate, endDate, setEndDate } = useDateRange();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [tradeFilter, setTradeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Fetch report data
  const fetchReport = useCallback(() => {
    setLoading(true);
    api
      .get<ReportData>(
        `/api/work-orders/reports?from=${startDate}&to=${endDate}&trade=${tradeFilter || ''}&priority=${priorityFilter || ''}&department=${deptFilter || ''}`
      )
      .then((res) => {
        if (res.success && res.data) setReportData(res.data);
        else setReportData(null);
        setLoading(false);
      })
      .catch(() => {
        setReportData(null);
        setLoading(false);
        toast.error('Failed to load report data');
      });
  }, [startDate, endDate, tradeFilter, priorityFilter, deptFilter]);

  // Auto-fetch on mount
  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const s = reportData?.summary;

  // ============================================================================
  // CSV EXPORT
  // ============================================================================

  const handleExportCSV = useCallback(() => {
    if (!reportData) return;
    const tab = activeTab;
    let filename = `wo-report-${startDate}-to-${endDate}`;
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (tab) {
      case 'overview': {
        filename += '-distribution';
        headers = ['Type', 'Count'];
        rows = (reportData.distribution?.byType || []).map((d: any) => [d.type, String(d.count)]);
        (reportData.distribution?.byStatus || []).forEach((d: any) => rows.push(['Status: ' + d.status, String(d.count)]));
        (reportData.distribution?.byPriority || []).forEach((d: any) => rows.push(['Priority: ' + d.priority, String(d.count)]));
        (reportData.distribution?.byTrade || []).forEach((d: any) => rows.push(['Trade: ' + d.trade, String(d.count)]));
        break;
      }
      case 'downtime': {
        filename += '-downtime';
        headers = ['Trade', 'Total Hours', 'Events', 'Production Loss'];
        rows = (reportData.downtime?.byTrade || []).map((d: any) => [
          d.trade, String(d.totalHours), String(d.events), String(d.productionLoss || 0),
        ]);
        break;
      }
      case 'response-time': {
        filename += '-response-time';
        headers = ['Group', 'Avg Hours', 'Min Hours', 'Max Hours', 'Count'];
        (reportData.responseTime?.byPriority || []).forEach((d: any) =>
          rows.push(['Priority: ' + d.priority, String(d.avgHours), String(d.minHours), String(d.maxHours), String(d.count)])
        );
        (reportData.responseTime?.byTrade || []).forEach((d: any) =>
          rows.push(['Trade: ' + d.trade, String(d.avgHours), '-', '-', String(d.count)])
        );
        break;
      }
      case 'breakdowns': {
        filename += '-breakdowns';
        headers = ['Group', 'Count'];
        (reportData.breakdowns?.byType || []).forEach((d: any) => rows.push(['Type: ' + d.type, String(d.count)]));
        (reportData.breakdowns?.byTrade || []).forEach((d: any) => rows.push(['Trade: ' + d.trade, String(d.count)]));
        (reportData.breakdowns?.byPriority || []).forEach((d: any) => rows.push(['Priority: ' + d.priority, String(d.count)]));
        break;
      }
      case 'man-hours': {
        filename += '-man-hours';
        headers = ['Technician', 'Total Hours', 'WO Count', 'Avg Hours/WO'];
        rows = (reportData.manHours?.byTechnician || []).map((d: any) => [
          d.name, String(d.totalHours), String(d.woCount), String(d.avgHoursPerWO),
        ]);
        break;
      }
      case 'materials': {
        filename += '-materials';
        headers = ['Item', 'Total Qty', 'Total Cost', 'WO Count'];
        rows = (reportData.materials?.topItems || []).map((d: any) => [
          d.name, String(d.totalQty), String(d.totalCost), String(d.woCount),
        ]);
        break;
      }
      case 'failure-rate': {
        filename += '-failure-rate';
        headers = ['Asset', 'Total WOs', 'Failures', 'Failure Rate'];
        rows = (reportData.failureRate?.byAsset || []).map((d: any) => [
          d.assetName || d.assetId, String(d.totalWOs), String(d.failures), String(d.failureRate),
        ]);
        break;
      }
      case 'stoppages-cost': {
        filename += '-stoppages-cost';
        headers = ['Trade', 'Labor Cost', 'Parts Cost', 'Contractor Cost', 'Total Cost'];
        rows = (reportData.cost?.byTrade || []).map((d: any) => [
          d.trade, String(d.laborCost), String(d.partsCost), String(d.contractorCost), String(d.totalCost),
        ]);
        break;
      }
      default: {
        headers = ['Metric', 'Value'];
        rows = [
          ['Total WOs', String(s?.totalWOs ?? 0)],
          ['Completed', String(s?.completedWOs ?? 0)],
          ['Completion Rate', String(s?.completionRate ?? 0)],
        ];
      }
    }

    exportCSV(filename, headers, rows);
  }, [reportData, activeTab, startDate, endDate]);

  // ============================================================================
  // KPI CARDS
  // ============================================================================

  const kpiCards = useMemo(() => {
    if (!s) return [];
    return [
      { label: 'Total Work Orders', value: s.totalWOs ?? 0, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
      { label: 'Completion Rate', value: `${s.completionRate ?? 0}%`, icon: Activity, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
      { label: 'Breakdown Rate', value: `${s.breakdownRate ?? 0}%`, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
      { label: 'Avg Response Time', value: formatHours(s.avgResponseTime), icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
      { label: 'Total Man Hours', value: formatHours(s.totalManHours), icon: HardHat, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
      { label: 'Material Cost', value: formatCurrency(s.totalMaterialCost), icon: Package, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
      { label: 'Total Downtime', value: formatHours(s.totalDowntimeHours), icon: CircleStop, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400' },
      { label: 'Rework Rate', value: formatRate(s.reworkRate), icon: TrendingDown, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400' },
    ];
  }, [s]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && !reportData) {
    return (
      <div className="page-content">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* ================================================================= */}
      {/* HEADER                                                             */}
      {/* ================================================================= */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Order Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive analytics on work orders, downtime, response time, materials, and costs
          </p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* FILTER CONTROLS                                                    */}
      {/* ================================================================= */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Date Range</Label>
              <DateRangePicker
                from={startDate || undefined}
                to={endDate || undefined}
                onChange={(f, t) => {
                  setStartDate(f || '');
                  setEndDate(t || '');
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Trade</Label>
              <Select value={tradeFilter} onValueChange={setTradeFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trades</SelectItem>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="facility">Facility</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Department</Label>
              <Input
                placeholder="All Departments"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={fetchReport} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Generate Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!reportData || loading}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* LOADING OVERLAY                                                    */}
      {/* ================================================================= */}
      {loading && reportData && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing report data...
        </div>
      )}

      {!reportData && !loading && (
        <EmptyState
          icon={FileBarChart}
          title="No report data available"
          description="Click 'Generate Report' to load work order analytics for the selected date range."
        />
      )}

      {/* ================================================================= */}
      {/* REPORT CONTENT                                                     */}
      {/* ================================================================= */}
      {reportData && !loading && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((k) => (
              <KPICard key={k.label} {...k} />
            ))}
          </div>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="text-xs">
                <BarChart3 className="h-3.5 w-3.5 mr-1" />Overview
              </TabsTrigger>
              <TabsTrigger value="downtime" className="text-xs">
                <CircleStop className="h-3.5 w-3.5 mr-1" />Downtime
              </TabsTrigger>
              <TabsTrigger value="response-time" className="text-xs">
                <Timer className="h-3.5 w-3.5 mr-1" />Response Time
              </TabsTrigger>
              <TabsTrigger value="breakdowns" className="text-xs">
                <Zap className="h-3.5 w-3.5 mr-1" />Breakdowns
              </TabsTrigger>
              <TabsTrigger value="man-hours" className="text-xs">
                <HardHat className="h-3.5 w-3.5 mr-1" />Man Hours
              </TabsTrigger>
              <TabsTrigger value="materials" className="text-xs">
                <Boxes className="h-3.5 w-3.5 mr-1" />Materials
              </TabsTrigger>
              <TabsTrigger value="failure-rate" className="text-xs">
                <Gauge className="h-3.5 w-3.5 mr-1" />Failure Rate
              </TabsTrigger>
              <TabsTrigger value="stoppages-cost" className="text-xs">
                <DollarSign className="h-3.5 w-3.5 mr-1" />Stoppages & Cost
              </TabsTrigger>
            </TabsList>

            {/* ============================================================= */}
            {/* TAB 1: OVERVIEW                                               */}
            {/* ============================================================= */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* WO Distribution by Type (PieChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">WO Distribution by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.distribution?.byType || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.distribution.byType}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              dataKey="count"
                              nameKey="type"
                              paddingAngle={2}
                            >
                              {(reportData.distribution.byType || []).map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={ChartPie} title="No type data" description="Work order type distribution will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* WO by Status (horizontal BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">WO by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.distribution?.byStatus || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={reportData.distribution.byStatus}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={90} />
                            <Tooltip />
                            <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                              {(reportData.distribution.byStatus || []).map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={BarChart3} title="No status data" description="Status distribution will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* WO by Trade (BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">WO by Trade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.distribution?.byTrade || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.distribution.byTrade} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                              {(reportData.distribution.byTrade || []).map((entry: any) => (
                                <Cell key={entry.trade} fill={getColorForKey(entry.trade, CHART_COLORS[0])} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={BarChart3} title="No trade data" description="Trade distribution will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Cost Trend by Month (LineChart with Area) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Cost Trend by Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.cost?.byMonth || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={reportData.cost.byMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Legend />
                            <Area type="monotone" dataKey="laborCost" stackId="1" stroke="#059669" fill="#05966933" name="Labor" />
                            <Area type="monotone" dataKey="partsCost" stackId="1" stroke="#0ea5e9" fill="#0ea5e933" name="Parts" />
                            <Area type="monotone" dataKey="totalCost" stackId="2" stroke="#f59e0b" fill="#f59e0b33" name="Total" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={DollarSign} title="No cost trend data" description="Monthly cost trends will appear here." />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 2: DOWNTIME                                               */}
            {/* ============================================================= */}
            <TabsContent value="downtime" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Downtime by Trade (BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Downtime by Trade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.downtime?.byTrade || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.downtime.byTrade} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="totalHours" name="Hours" radius={[4, 4, 0, 0]}>
                              {(reportData.downtime.byTrade || []).map((entry: any) => (
                                <Cell key={entry.trade} fill={getColorForKey(entry.trade, CHART_COLORS[0])} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={CircleStop} title="No downtime data" description="Downtime events will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Downtime by Category (PieChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Downtime by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.downtime?.byCategory || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.downtime.byCategory}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              dataKey="totalHours"
                              nameKey="category"
                              paddingAngle={2}
                            >
                              {(reportData.downtime.byCategory || []).map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={ChartPie} title="No category data" description="Category distribution will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Downtime Trend by Month (AreaChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Downtime Trend by Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.downtime?.byMonth || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={reportData.downtime.byMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="totalHours" stroke="#ef4444" fill="#ef444433" name="Hours" />
                            <Area type="monotone" dataKey="events" stroke="#f59e0b" fill="#f59e0b33" name="Events" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={TrendingDown} title="No trend data" description="Monthly downtime trends will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Downtime Table */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Downtime Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Trade</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Events</TableHead>
                            <TableHead className="text-right">Production Loss</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(reportData.downtime?.byTrade || []).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <EmptyState icon={CircleStop} title="No downtime data" description="Downtime events will appear here." />
                              </TableCell>
                            </TableRow>
                          ) : (
                            (reportData.downtime.byTrade || []).map((d: any) => (
                              <TableRow key={d.trade} className="even:bg-muted/30">
                                <TableCell className="font-medium capitalize">{d.trade}</TableCell>
                                <TableCell className="text-right">{formatHours(d.totalHours)}</TableCell>
                                <TableCell className="text-right">{d.events}</TableCell>
                                <TableCell className="text-right">{formatCurrency(d.productionLoss)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 3: RESPONSE TIME                                          */}
            {/* ============================================================= */}
            <TabsContent value="response-time" className="space-y-6 mt-6">
              {/* Overall Avg KPI */}
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Timer className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{formatHours(reportData.responseTime?.overall?.avgHours)}</p>
                      <p className="text-sm text-muted-foreground">
                        Overall Average Response Time
                        <span className="ml-2 text-xs text-muted-foreground">
                          (based on {reportData.responseTime?.overall?.sampleSize ?? 0} samples)
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Response Time by Priority (BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Response Time by Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.responseTime?.byPriority || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.responseTime.byPriority} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="avgHours" name="Avg Hours" radius={[4, 4, 0, 0]}>
                              {(reportData.responseTime.byPriority || []).map((entry: any) => (
                                <Cell key={entry.priority} fill={getColorForKey(entry.priority, CHART_COLORS[0])} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={Timer} title="No response time data" description="Response time by priority will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Response Time by Trade (BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Response Time by Trade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.responseTime?.byTrade || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.responseTime.byTrade} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="avgHours" name="Avg Hours" radius={[4, 4, 0, 0]}>
                              {(reportData.responseTime.byTrade || []).map((entry: any) => (
                                <Cell key={entry.trade} fill={getColorForKey(entry.trade, CHART_COLORS[0])} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={Timer} title="No trade response data" description="Response time by trade will appear here." />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Response Time Table */}
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Response Time Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Group</TableHead>
                          <TableHead className="text-right">Avg Hours</TableHead>
                          <TableHead className="text-right">Min Hours</TableHead>
                          <TableHead className="text-right">Max Hours</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reportData.responseTime?.byPriority || []).length === 0 && (reportData.responseTime?.byTrade || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <EmptyState icon={Timer} title="No response time data" description="Response time data will appear here." />
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={5} className="font-semibold text-xs uppercase text-muted-foreground">By Priority</TableCell>
                            </TableRow>
                            {(reportData.responseTime.byPriority || []).map((d: any) => (
                              <TableRow key={`p-${d.priority}`} className="even:bg-muted/30">
                                <TableCell className="font-medium capitalize">{d.priority}</TableCell>
                                <TableCell className="text-right">{formatHours(d.avgHours)}</TableCell>
                                <TableCell className="text-right">{formatHours(d.minHours)}</TableCell>
                                <TableCell className="text-right">{formatHours(d.maxHours)}</TableCell>
                                <TableCell className="text-right">{d.count}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={5} className="font-semibold text-xs uppercase text-muted-foreground">By Trade</TableCell>
                            </TableRow>
                            {(reportData.responseTime.byTrade || []).map((d: any) => (
                              <TableRow key={`t-${d.trade}`} className="even:bg-muted/30">
                                <TableCell className="font-medium capitalize">{d.trade}</TableCell>
                                <TableCell className="text-right">{formatHours(d.avgHours)}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">{d.count}</TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 4: BREAKDOWNS                                             */}
            {/* ============================================================= */}
            <TabsContent value="breakdowns" className="space-y-6 mt-6">
              {/* Total Breakdowns KPI */}
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center shrink-0">
                      <Zap className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{reportData.breakdowns?.total ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Total Breakdown Work Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Breakdowns by Type (PieChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Breakdowns by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.breakdowns?.byType || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.breakdowns.byType}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              dataKey="count"
                              nameKey="type"
                              paddingAngle={2}
                            >
                              {(reportData.breakdowns.byType || []).map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={ChartPie} title="No breakdown type data" description="Breakdown type data will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Breakdowns by Trade (BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Breakdowns by Trade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.breakdowns?.byTrade || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.breakdowns.byTrade} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                              {(reportData.breakdowns.byTrade || []).map((entry: any) => (
                                <Cell key={entry.trade} fill={getColorForKey(entry.trade, CHART_COLORS[0])} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={BarChart3} title="No trade breakdown data" description="Trade breakdown data will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Breakdowns Trend by Month (LineChart) */}
                <Card className="border border-border/60 shadow-sm lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Breakdown Trend by Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.breakdowns?.byMonth || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={reportData.breakdowns.byMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} name="Breakdowns" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={Zap} title="No monthly breakdown data" description="Monthly breakdown trends will appear here." />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown Table */}
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Breakdown Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead>Trade</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Math.max((reportData.breakdowns?.byType || []).length, (reportData.breakdowns?.byTrade || []).length) === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <EmptyState icon={Zap} title="No breakdown data" description="Breakdown data will appear here." />
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={4} className="font-semibold text-xs uppercase text-muted-foreground">By Type</TableCell>
                            </TableRow>
                            {(reportData.breakdowns.byType || []).map((d: any) => (
                              <TableRow key={`bt-${d.type}`} className="even:bg-muted/30">
                                <TableCell className="font-medium capitalize">{d.type}</TableCell>
                                <TableCell className="text-right">{d.count}</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={4} className="font-semibold text-xs uppercase text-muted-foreground">By Trade</TableCell>
                            </TableRow>
                            {(reportData.breakdowns.byTrade || []).map((d: any) => (
                              <TableRow key={`bd-${d.trade}`} className="even:bg-muted/30">
                                <TableCell className="font-medium">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="font-medium capitalize">{d.trade}</TableCell>
                                <TableCell className="text-right">{d.count}</TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 5: MAN HOURS                                              */}
            {/* ============================================================= */}
            <TabsContent value="man-hours" className="space-y-6 mt-6">
              {/* Grand Total KPI */}
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400 flex items-center justify-center shrink-0">
                      <HardHat className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{formatHours(reportData.manHours?.grandTotal)}</p>
                      <p className="text-sm text-muted-foreground">Grand Total Man Hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Man Hours by Trade (BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Man Hours by Trade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.manHours?.byTrade || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.manHours.byTrade} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="totalHours" name="Hours" radius={[4, 4, 0, 0]}>
                              {(reportData.manHours.byTrade || []).map((entry: any) => (
                                <Cell key={entry.trade} fill={getColorForKey(entry.trade, CHART_COLORS[0])} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={BarChart3} title="No trade hours data" description="Man hours by trade will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Man Hours by Technician (horizontal BarChart, top 10) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Top 10 Technicians by Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {((reportData.manHours?.byTechnician || []).slice(0, 10)).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={(reportData.manHours.byTechnician || []).slice(0, 10)}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                            <Tooltip />
                            <Bar dataKey="totalHours" name="Hours" radius={[0, 4, 4, 0]}>
                              {(reportData.manHours.byTechnician || []).slice(0, 10).map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={Users} title="No technician data" description="Technician hours will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Man Hours by Activity (PieChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Man Hours by Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.manHours?.byActivity || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.manHours.byActivity}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              dataKey="totalHours"
                              nameKey="activity"
                              paddingAngle={2}
                            >
                              {(reportData.manHours.byActivity || []).map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={ChartPie} title="No activity data" description="Activity hours will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Man Hours by Month (AreaChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Man Hours Trend by Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.manHours?.byMonth || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={reportData.manHours.byMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="totalHours" stroke="#8b5cf6" fill="#8b5cf633" name="Hours" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={HardHat} title="No monthly data" description="Monthly man hours will appear here." />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Technician Hours Table */}
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Technician Hours Detail</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Technician</TableHead>
                          <TableHead className="text-right">Total Hours</TableHead>
                          <TableHead className="text-right">WO Count</TableHead>
                          <TableHead className="text-right">Avg Hours/WO</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reportData.manHours?.byTechnician || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <EmptyState icon={Users} title="No technician data" description="Technician hours will appear here." />
                            </TableCell>
                          </TableRow>
                        ) : (
                          (reportData.manHours.byTechnician || []).map((d: any) => (
                            <TableRow key={d.name} className="even:bg-muted/30">
                              <TableCell className="font-medium">{d.name}</TableCell>
                              <TableCell className="text-right font-medium">{formatHours(d.totalHours)}</TableCell>
                              <TableCell className="text-right">{d.woCount}</TableCell>
                              <TableCell className="text-right">{formatHours(d.avgHoursPerWO)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 6: MATERIALS                                              */}
            {/* ============================================================= */}
            <TabsContent value="materials" className="space-y-6 mt-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Total Material Cost"
                  value={formatCurrency(reportData.materials?.totalCost)}
                  icon={Package}
                  color="text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400"
                />
                <KPICard
                  label="Total Material Qty"
                  value={String(reportData.materials?.totalQty ?? 0)}
                  icon={Boxes}
                  color="text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400"
                />
                <KPICard
                  label="Top Item Cost"
                  value={formatCurrency(reportData.materials?.topItems?.[0]?.totalCost)}
                  icon={TrendingDown}
                  color="text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400"
                />
                <KPICard
                  label="WO Types Used"
                  value={String((reportData.materials?.byType || []).length)}
                  icon={Wrench}
                  color="text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Materials by WO Type (BarChart stacked) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Materials by WO Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.materials?.byType || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.materials.byType} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: any, name: any) => name === 'totalQty' ? `${value} qty` : formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="totalQty" name="Qty" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="totalCost" name="Cost" fill="#059669" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={Boxes} title="No material type data" description="Material usage by WO type will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Material Cost Trend by Month (LineChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Material Cost Trend by Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.materials?.costByMonth || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={reportData.materials.costByMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Line type="monotone" dataKey="totalCost" stroke="#059669" strokeWidth={2} name="Cost" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={Package} title="No monthly cost data" description="Monthly material cost trends will appear here." />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top 10 Materials Table */}
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Top 10 Materials</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead className="text-right">Total Qty</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                          <TableHead className="text-right">WO Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reportData.materials?.topItems || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <EmptyState icon={Boxes} title="No material data" description="Material usage data will appear here." />
                            </TableCell>
                          </TableRow>
                        ) : (
                          (reportData.materials.topItems || []).slice(0, 10).map((d: any, i: number) => (
                            <TableRow key={i} className="even:bg-muted/30">
                              <TableCell className="font-medium">{d.name}</TableCell>
                              <TableCell className="text-right">{d.totalQty}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(d.totalCost)}</TableCell>
                              <TableCell className="text-right">{d.woCount}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 7: FAILURE RATE                                           */}
            {/* ============================================================= */}
            <TabsContent value="failure-rate" className="space-y-6 mt-6">
              {/* Rework Rate KPI */}
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <TrendingDown className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {formatRate(reportData.failureRate?.reworkRate)}
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({reportData.failureRate?.reworkWOs ?? 0} WOs)
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">Rework Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Failure Rate by Asset (horizontal BarChart, top 10) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Top 10 Assets by Failure Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {((reportData.failureRate?.byAsset || []).slice(0, 10)).length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={(reportData.failureRate.byAsset || []).slice(0, 10)}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                            <YAxis type="category" dataKey="assetName" tick={{ fontSize: 10 }} width={110} />
                            <Tooltip formatter={(value: any) => `${value}%`} />
                            <Bar dataKey="failureRate" name="Failure Rate" radius={[0, 4, 4, 0]}>
                              {(reportData.failureRate.byAsset || []).slice(0, 10).map((entry: any, i: number) => (
                                <Cell key={i} fill={entry.failureRate > 50 ? '#ef4444' : entry.failureRate > 25 ? '#f59e0b' : '#059669'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={Gauge} title="No failure rate data" description="Asset failure rates will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Failure Rate by Type (BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Failure Rate by WO Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.failureRate?.byType || []).length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.failureRate.byType} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} unit="%" />
                            <Tooltip formatter={(value: any) => `${value}%`} />
                            <Bar dataKey="failureRate" name="Failure Rate" radius={[4, 4, 0, 0]}>
                              {(reportData.failureRate.byType || []).map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={BarChart3} title="No type failure data" description="Failure rate by type will appear here." />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* MTBF Analysis Table */}
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">MTBF Analysis (Mean Time Between Failures)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead className="text-right">MTBF (Days)</TableHead>
                          <TableHead className="text-right">MTBF (Hours)</TableHead>
                          <TableHead className="text-right">Failures</TableHead>
                          <TableHead className="text-right">Operating Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reportData.failureRate?.mtbf || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <EmptyState icon={Gauge} title="No MTBF data" description="MTBF analysis requires assets with 2+ failures." />
                            </TableCell>
                          </TableRow>
                        ) : (
                          (reportData.failureRate.mtbf || []).map((d: any) => (
                            <TableRow key={d.assetId} className="even:bg-muted/30">
                              <TableCell className="font-medium">{d.assetName || d.assetId}</TableCell>
                              <TableCell className="text-right font-medium">{d.mtbfDays}</TableCell>
                              <TableCell className="text-right">{d.mtbfHours}</TableCell>
                              <TableCell className="text-right">{d.failureCount}</TableCell>
                              <TableCell className="text-right">{d.operatingDays}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 8: STOPPAGES & COST                                        */}
            {/* ============================================================= */}
            <TabsContent value="stoppages-cost" className="space-y-6 mt-6">
              {/* Total Stoppages KPI */}
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <Pause className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{reportData.stoppages?.total ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Total Production Stoppages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-border/60 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.cost?.grandLabor)}</p>
                    <p className="text-xs text-muted-foreground">Total Labor Cost</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/60 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-sky-600">{formatCurrency(reportData.cost?.grandParts)}</p>
                    <p className="text-xs text-muted-foreground">Total Parts Cost</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/60 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-violet-600">{formatCurrency(reportData.cost?.grandContractor)}</p>
                    <p className="text-xs text-muted-foreground">Total Contractor Cost</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stoppages by Impact (PieChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Stoppages by Impact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.stoppages?.byImpact || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.stoppages.byImpact}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              dataKey="count"
                              nameKey="impact"
                              paddingAngle={2}
                            >
                              {(reportData.stoppages.byImpact || []).map((entry: any) => (
                                <Cell key={entry.impact} fill={getColorForKey(entry.impact, CHART_COLORS[0])} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={ChartPie} title="No impact data" description="Stoppage impact data will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Stoppages by Reason (BarChart) */}
                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Stoppages by Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.stoppages?.byReason || []).length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.stoppages.byReason} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="reason" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]} fill="#f97316">
                              {(reportData.stoppages.byReason || []).map((_: any, i: number) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={Construction} title="No reason data" description="Stoppage reason data will appear here." />
                    )}
                  </CardContent>
                </Card>

                {/* Cost by Trade (stacked BarChart) */}
                <Card className="border border-border/60 shadow-sm lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Cost by Trade (Labor + Parts + Contractor)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reportData.cost?.byTrade || []).length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.cost.byTrade} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="laborCost" stackId="a" fill="#059669" name="Labor" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="partsCost" stackId="a" fill="#0ea5e9" name="Parts" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="contractorCost" stackId="a" fill="#f59e0b" name="Contractor" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState icon={DollarSign} title="No cost data" description="Cost breakdown by trade will appear here." />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Grand Total Cost Card */}
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <DollarSign className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{formatCurrency(reportData.cost?.grandTotal)}</p>
                      <p className="text-sm text-muted-foreground">Grand Total Cost (Labor + Parts + Contractor)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Extra icon import used in KPI cards
import { ClipboardList } from 'lucide-react';
