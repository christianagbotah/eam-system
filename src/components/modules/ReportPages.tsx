'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { exportPDF } from '@/lib/export-pdf';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Activity, AlertTriangle, Boxes, Building2, CheckCircle2, ClipboardCheck, ClipboardList,
  Database, GraduationCap, ShieldAlert, Target, XCircle,
  Wrench, Package, Factory, ShieldCheck, HardHat, TrendingUp,
  FileBarChart, FileSpreadsheet, Download, Plus, Search, Filter, Calendar,
  Eye, Printer, Share, BarChart3, DollarSign, RefreshCw, Clock, Settings,
  Loader2,
  ArrowUpDown, FileText, FileDown, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { format } from 'date-fns';
import { EmptyState, StatusBadge, PriorityBadge, formatDate, formatDateTime, LoadingSkeleton, formatCurrency } from '@/components/shared/helpers';

// Shared date range state hook
const useDateRange = () => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  return { startDate, setStartDate, endDate, setEndDate };
};

// Shared DateRangePicker sub-component
function DateRangePicker({ startDate, setStartDate, endDate, setEndDate }: {
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
}) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-sm font-medium flex items-center gap-1.5"><Calendar className="h-4 w-4 text-muted-foreground" />Date Range</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        </div>
      </CardContent>
    </Card>
  );
}

// Client-side date range filter helper
function filterByDateRange<T extends { createdAt?: string | null }>(items: T[], startDate: string, endDate: string): T[] {
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end = new Date(endDate + 'T23:59:59').getTime();
  return items.filter(item => {
    if (!item.createdAt) return false;
    const t = new Date(item.createdAt).getTime();
    return t >= start && t <= end;
  });
}

// Reusable CSV export helper
const exportCSV = (filename: string, headers: string[], rows: string[][]) => {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}.csv`);
};

export function ReportsAssetPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [filterCriticality, setFilterCriticality] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    api.get<any[]>('/api/assets').then(res => {
      if (res.success && res.data) setAssets(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = assets.filter(a => {
    if (filterCondition !== 'all' && a.condition !== filterCondition) return false;
    if (filterCriticality !== 'all' && a.criticality !== filterCriticality) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const byCondition: Record<string, number> = {};
  const byCriticality: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  assets.forEach(a => {
    const c = a.condition || 'Unknown'; byCondition[c] = (byCondition[c] || 0) + 1;
    const cr = a.criticality || 'Unknown'; byCriticality[cr] = (byCriticality[cr] || 0) + 1;
    const s = a.status || 'Unknown'; byStatus[s] = (byStatus[s] || 0) + 1;
  });

  const conditionColors: Record<string, string> = { excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200', good: 'bg-sky-100 text-sky-700 border-sky-200', fair: 'bg-amber-100 text-amber-700 border-amber-200', poor: 'bg-orange-100 text-orange-700 border-orange-200', critical: 'bg-red-100 text-red-700 border-red-200' };

  const summaryCards = [
    { label: 'Total Assets', value: assets.length, icon: Building2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Conditions', value: Object.keys(byCondition).length, icon: Activity, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Critical Assets', value: byCriticality['critical'] || 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Active Assets', value: byStatus['active'] || byStatus['operational'] || 0, icon: CheckCircle2, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Asset Reports</h1><p className="text-muted-foreground mt-1">Comprehensive reports on asset register, conditions, and lifecycle</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <div className="filter-row flex items-center gap-2 flex-wrap">
          <Select value={filterCondition} onValueChange={setFilterCondition}><SelectTrigger className="w-40"><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="all">All Conditions</SelectItem>{Object.keys(byCondition).map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent></Select>
          <Select value={filterCriticality} onValueChange={setFilterCriticality}><SelectTrigger className="w-40"><SelectValue placeholder="Criticality" /></SelectTrigger><SelectContent><SelectItem value="all">All Criticality</SelectItem>{Object.keys(byCriticality).map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent></Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{Object.keys(byStatus).map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select>
        </div>
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden sm:table-cell">Asset Tag</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead>Condition</TableHead><TableHead className="hidden sm:table-cell">Criticality</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Location</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={Building2} title="No assets found" description="Adjust your filters or add assets to see reports." /></TableCell></TableRow>
          ) : filtered.map(asset => (
            <TableRow key={asset.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{asset.name}</TableCell>
              <TableCell className="font-mono text-xs hidden sm:table-cell">{asset.assetTag || '-'}</TableCell>
              <TableCell className="text-sm hidden md:table-cell">{asset.category || '-'}</TableCell>
              <TableCell><Badge variant="outline" className={conditionColors[asset.condition] || 'bg-slate-100 text-slate-700 border-slate-200'}>{(asset.condition || 'N/A').toUpperCase()}</Badge></TableCell>
              <TableCell className="hidden sm:table-cell"><Badge variant="outline" className={asset.criticality === 'critical' ? 'bg-red-50 text-red-700 border-red-200' : asset.criticality === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>{(asset.criticality || 'N/A').toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={asset.status === 'active' || asset.status === 'operational' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : asset.status === 'inactive' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-red-50 text-red-700 border-red-200'}>{(asset.status || 'N/A').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{asset.location || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
export function ReportsMaintenancePage() {
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
  const avgCost = workOrders.length > 0 ? (workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0) / workOrders.length) : 0;
  const overdue = stats?.overdueWorkOrders || 0;

  const typeBreakdown = [
    { type: 'Preventive', count: stats?.preventiveWO || 0, color: 'bg-emerald-500' },
    { type: 'Corrective', count: stats?.correctiveWO || 0, color: 'bg-amber-500' },
    { type: 'Emergency', count: stats?.emergencyWO || 0, color: 'bg-red-500' },
    { type: 'Inspection', count: stats?.inspectionWO || 0, color: 'bg-sky-500' },
    { type: 'Predictive', count: stats?.predictiveWO || 0, color: 'bg-violet-500' },
  ];

  const priorityCounts = [
    { priority: 'Low', count: workOrders.filter(wo => wo.priority === 'low').length },
    { priority: 'Medium', count: workOrders.filter(wo => wo.priority === 'medium').length },
    { priority: 'High', count: workOrders.filter(wo => wo.priority === 'high').length },
    { priority: 'Critical/Emergency', count: workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'emergency').length },
  ];

  const recentMRs = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  const summaryCards = [
    { label: 'Total Work Orders', value: totalWOs, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Avg WO Cost', value: formatCurrency(avgCost), icon: DollarSign, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Maintenance Reports</h1><p className="text-muted-foreground mt-1">Reports on work orders, PM compliance, costs, and maintenance performance</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border"><CardHeader><CardTitle className="text-base">WO by Type</CardTitle><CardDescription className="text-xs">Work order type distribution</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {typeBreakdown.filter(t => t.count > 0).map(t => {
                const pct = totalWOs > 0 ? Math.round((t.count / totalWOs) * 100) : 0;
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-28">{t.type}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${t.color} rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
          <Card className="border"><CardHeader><CardTitle className="text-base">Priority Breakdown</CardTitle><CardDescription className="text-xs">Work orders by priority level</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {priorityCounts.map(p => {
                const pct = workOrders.length > 0 ? Math.round((p.count / workOrders.length) * 100) : 0;
                return (
                  <div key={p.priority} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-36">{p.priority}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${p.priority.includes('Critical') ? 'bg-red-500' : p.priority === 'High' ? 'bg-amber-500' : p.priority === 'Medium' ? 'bg-sky-500' : 'bg-slate-400'}`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{p.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        </div>
        <Card className="border"><CardHeader><CardTitle className="text-base">Recent Maintenance Requests</CardTitle><CardDescription className="text-xs">Latest submitted requests</CardDescription></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>Request #</TableHead><TableHead>Title</TableHead><TableHead className="hidden sm:table-cell">Asset</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Created</TableHead></TableRow></TableHeader><TableBody>
            {recentMRs.length === 0 ? (
              <TableRow><TableCell colSpan={6}><EmptyState icon={ClipboardList} title="No maintenance requests" description="Requests will appear here once submitted." /></TableCell></TableRow>
            ) : recentMRs.map(mr => (
              <TableRow key={mr.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{mr.requestNumber}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{mr.title}</TableCell>
                <TableCell className="text-sm hidden sm:table-cell">{mr.assetName || '-'}</TableCell>
                <TableCell><PriorityBadge priority={mr.priority} /></TableCell>
                <TableCell><StatusBadge status={mr.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(mr.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </CardContent></Card>
      </>)}
    </div>
  );
}
export function ReportsInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    api.get<any[]>('/api/inventory').then(res => {
      if (res.success && res.data) setItems(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = searchText.trim() ? items.filter(i => {
    const q = searchText.toLowerCase();
    return (i.name || '').toLowerCase().includes(q) || (i.itemCode || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
  }) : items;

  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.unitCost || 0)), 0);
  const lowStock = items.filter(i => i.currentStock > 0 && i.currentStock <= (i.minStockLevel || 0));
  const outOfStock = items.filter(i => i.currentStock <= 0);

  const summaryCards = [
    { label: 'Total Items', value: totalItems, icon: Package, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Total Value', value: formatCurrency(totalValue), icon: DollarSign, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Low Stock', value: lowStock.length, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Out of Stock', value: outOfStock.length, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Reports</h1><p className="text-muted-foreground mt-1">Reports on stock levels, movements, values, and procurement</p></div>
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="hidden sm:table-cell text-right">Min Stock</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="hidden lg:table-cell">Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={Package} title="No inventory items found" description="Items will appear here once inventory is populated." /></TableCell></TableRow>
          ) : filtered.map(item => {
            const isLow = item.currentStock > 0 && item.currentStock <= (item.minStockLevel || 0);
            const isOut = item.currentStock <= 0;
            const value = (item.currentStock || 0) * (item.unitCost || 0);
            return (
              <TableRow key={item.id} className={`hover:bg-muted/30 ${isOut ? 'bg-red-50/50 dark:bg-red-950/20' : isLow ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-sm hidden md:table-cell">{item.category || '-'}</TableCell>
                <TableCell className={`text-right font-medium ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : ''}`}>{item.currentStock || 0}</TableCell>
                <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{item.minStockLevel || 0}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(value)}</TableCell>
                <TableCell className="hidden lg:table-cell">{isOut ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">OUT OF STOCK</Badge> : isLow ? <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">LOW STOCK</Badge> : <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>}</TableCell>
              </TableRow>
            );
          })}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
export function ReportsProductionPage() {
  const { startDate, setStartDate, endDate, setEndDate } = useDateRange();
  const [orders, setOrders] = useState<any[]>([]);
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/api/production-orders?limit=9999'),
      api.get<any>('/api/production-orders/kpi'),
    ]).then(([ordersRes, kpiRes]) => {
      if (ordersRes.success && Array.isArray(ordersRes.data)) {
        // Filter by date range client-side
        const filtered = filterByDateRange(ordersRes.data, startDate, endDate);
        setOrders(filtered);
      }
      if (kpiRes.success && kpiRes.data) setKpi(kpiRes.data);
      setLoading(false);
    });
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Status breakdown chart data
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { const s = o.status || 'unknown'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), count }));
  }, [orders]);

  const statusColors: Record<string, string> = { planned: 'bg-sky-500', released: 'bg-violet-500', in_progress: 'bg-amber-500', completed: 'bg-emerald-500', cancelled: 'bg-red-500' };

  // Monthly grouping
  const monthlyMap: Record<string, { completed: number; total: number; value: number }> = {};
  orders.forEach(o => {
    const dateStr = o.actualEnd || o.updatedAt || o.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { completed: 0, total: 0, value: 0 };
    monthlyMap[key].total += 1;
    if (o.status === 'completed') monthlyMap[key].completed += 1;
    monthlyMap[key].value += (o.quantity || 0) * (o.unitCost || 0);
  });

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      return { month: label, monthKey: key, total: data.total, completed: data.completed, value: data.value, completionRate };
    });

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const maxMonthly = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.total), 1) : 1;

  const summaryCards = [
    { label: 'Total Orders', value: totalOrders.toString(), icon: Factory, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Completion Rate', value: kpi ? `${kpi.completionRate}%` : (totalOrders > 0 ? `${Math.round((completedOrders / totalOrders) * 100)}%` : '0%'), icon: Target, color: 'bg-sky-50 text-sky-600' },
    { label: 'On-Time Delivery', value: kpi ? `${kpi.onTimeDeliveryRate}%` : '—', icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Avg Yield', value: kpi ? `${kpi.avgYield}%` : '—', icon: TrendingUp, color: 'bg-red-50 text-red-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Production Reports</h1><p className="text-muted-foreground mt-1">Production orders status breakdown, completion rates, on-time delivery, and yield from real production data</p></div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
        <Button variant="outline" size="sm" onClick={() => exportCSV('production-orders', ['Order Number', 'Product', 'Status', 'Priority', 'Start Date', 'End Date'], orders.map(o => [o.orderNumber || '', o.title || '', o.status || '', o.priority || '', o.scheduledStart ? new Date(o.scheduledStart).toISOString().slice(0, 10) : '', o.scheduledEnd ? new Date(o.scheduledEnd).toISOString().slice(0, 10) : '']))}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportPDF({
          title: 'Production Reports',
          subtitle: `Date Range: ${startDate} to ${endDate}`,
          filename: 'production-orders',
          headers: ['Order Number', 'Product', 'Status', 'Priority', 'Start Date', 'End Date'],
          rows: orders.map(o => [o.orderNumber || '', o.title || '', o.status || '', o.priority || '', o.scheduledStart ? new Date(o.scheduledStart).toISOString().slice(0, 10) : '', o.scheduledEnd ? new Date(o.scheduledEnd).toISOString().slice(0, 10) : '']),
          summary: summaryCards.map(k => ({ label: k.label, value: String(k.value) })),
        })}>
          <FileDown className="h-4 w-4 mr-1.5" />Export PDF
        </Button>
      </div>
      {totalOrders === 0 ? (
        <EmptyState icon={Factory} title="No production data available for this date range" description="Create production orders to see production trends, completion rates, and yield metrics." />
      ) : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
              </div>
            </div>
          ); })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Production Orders</CardTitle><CardDescription className="text-xs">Orders by month in selected range</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-48">
                {monthlyData.map(d => (
                  <div key={d.monthKey} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{d.total}</span>
                    <div className="w-full bg-emerald-100 rounded-t-md" style={{ height: `${(d.total / maxMonthly) * 140}px` }}>
                      <div className="w-full h-full bg-emerald-500 rounded-t-md opacity-80" />
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center">{d.month.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Status Breakdown</CardTitle><CardDescription className="text-xs">Orders by status</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusBreakdown.map(s => {
                  const maxStatus = statusBreakdown.length > 0 ? Math.max(...statusBreakdown.map(x => x.count)) : 1;
                  return (
                    <div key={s.status} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-28">{s.status}</span>
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${statusColors[s.status.toLowerCase().replace(/ /g, '_')] || 'bg-slate-400'} rounded-full transition-all`} style={{ width: `${(s.count / maxStatus) * 100}%` }} /></div>
                      <span className="text-sm font-semibold w-16 text-right">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total Orders</TableHead><TableHead className="text-right">Completed</TableHead><TableHead className="hidden sm:table-cell text-right">Completion Rate</TableHead><TableHead className="hidden md:table-cell text-right">Value</TableHead></TableRow></TableHeader><TableBody>
            {monthlyData.map(d => (
              <TableRow key={d.monthKey} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className="text-right font-medium">{d.total}</TableCell>
                <TableCell className="text-right text-emerald-600">{d.completed}</TableCell>
                <TableCell className={`text-right font-medium hidden sm:table-cell ${d.completionRate >= 90 ? 'text-emerald-600' : d.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{d.completionRate}%</TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.value > 0 ? `$${d.value.toLocaleString()}` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
export function ReportsQualityPage() {
  const { startDate, setStartDate, endDate, setEndDate } = useDateRange();
  const [inspections, setInspections] = useState<any[]>([]);
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [inspKpis, setInspKpis] = useState<any>(null);
  const [ncrKpis, setNcrKpis] = useState<any>(null);
  const [auditKpis, setAuditKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/api/quality-inspections?limit=9999'),
      api.get<any>('/api/quality-ncr?limit=9999'),
      api.get<any>('/api/quality-audits?limit=9999'),
    ]).then(([inspRes, ncrRes, auditRes]) => {
      const inspData = inspRes.success && Array.isArray(inspRes.data) ? filterByDateRange(inspRes.data, startDate, endDate) : [];
      const ncrData = ncrRes.success && Array.isArray(ncrRes.data) ? filterByDateRange(ncrRes.data, startDate, endDate) : [];
      const auditData = auditRes.success && Array.isArray(auditRes.data) ? filterByDateRange(auditRes.data, startDate, endDate) : [];
      setInspections(inspData);
      setNcrs(ncrData);
      setAudits(auditData);
      if (inspRes.kpis) setInspKpis(inspRes.kpis);
      if (ncrRes.kpis) setNcrKpis(ncrRes.kpis);
      if (auditRes.kpis) setAuditKpis(auditRes.kpis);
      setLoading(false);
    });
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Inspection pass/fail
  const inspPassed = inspections.filter(i => i.status === 'passed').length;
  const inspFailed = inspections.filter(i => i.status === 'failed').length;
  const inspPending = inspections.filter(i => i.status === 'pending' || i.status === 'in_progress').length;
  const inspPassRate = inspections.length > 0 ? Math.round((inspPassed / inspections.length) * 100) : 0;

  // NCR status breakdown
  const ncrStatusMap: Record<string, number> = {};
  ncrs.forEach(n => { const s = n.status || 'unknown'; ncrStatusMap[s] = (ncrStatusMap[s] || 0) + 1; });
  const ncrStatusBreakdown = Object.entries(ncrStatusMap).map(([status, count]) => ({
    status: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), count,
  }));
  const ncrColors: Record<string, string> = { open: 'bg-red-500', investigating: 'bg-amber-500', closed: 'bg-emerald-500' };

  // Audit completion rates
  const auditsCompleted = audits.filter(a => a.status === 'completed').length;
  const auditsInProgress = audits.filter(a => a.status === 'in_progress').length;
  const auditsPlanned = audits.filter(a => a.status === 'planned').length;
  const auditCompletionRate = audits.length > 0 ? Math.round((auditsCompleted / audits.length) * 100) : 0;

  // Monthly trend for inspections
  const monthlyMap: Record<string, { total: number; passed: number; failed: number }> = {};
  inspections.forEach(i => {
    const dateStr = i.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { total: 0, passed: 0, failed: 0 };
    monthlyMap[key].total += 1;
    if (i.status === 'passed') monthlyMap[key].passed += 1;
    else if (i.status === 'failed') monthlyMap[key].failed += 1;
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      const passRate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
      return { month: label, monthKey: key, total: data.total, passed: data.passed, failed: data.failed, passRate };
    });

  const summaryCards = [
    { label: 'Inspections', value: inspections.length.toString(), icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pass Rate', value: `${inspPassRate}%`, icon: ShieldCheck, color: 'bg-sky-50 text-sky-600' },
    { label: 'Open NCRs', value: ncrs.filter(n => n.status === 'open' || n.status === 'investigating').length.toString(), icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Audit Completion', value: `${auditCompletionRate}%`, icon: CheckCircle2, color: 'bg-red-50 text-red-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Reports</h1><p className="text-muted-foreground mt-1">Inspection pass/fail rates, NCR status breakdown, and audit completion from real quality data</p></div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
        <Button variant="outline" size="sm" onClick={() => exportCSV('quality-inspections', ['ID', 'Type', 'Status', 'Result', 'Date', 'Inspector'], inspections.map(i => [i.inspectionNumber || i.id || '', i.type || '', i.status || '', i.result || i.status || '', i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : '', i.inspector || '']))}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportPDF({
          title: 'Quality Reports',
          subtitle: `Date Range: ${startDate} to ${endDate}`,
          filename: 'quality-inspections',
          headers: ['ID', 'Type', 'Status', 'Result', 'Date', 'Inspector'],
          rows: inspections.map(i => [i.inspectionNumber || i.id || '', i.type || '', i.status || '', i.result || i.status || '', i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : '', i.inspector || '']),
          summary: summaryCards.map(k => ({ label: k.label, value: String(k.value) })),
        })}>
          <FileDown className="h-4 w-4 mr-1.5" />Export PDF
        </Button>
      </div>
      {inspections.length === 0 && ncrs.length === 0 && audits.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No quality data available for this date range" description="Create inspections, NCRs, or audits to see quality metrics." />
      ) : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
              </div>
            </div>
          ); })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Inspection Pass/Fail Rates</CardTitle><CardDescription className="text-xs">Inspection outcomes in date range</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Passed</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${inspections.length > 0 ? (inspPassed / inspections.length) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{inspPassed}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Failed</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${inspections.length > 0 ? (inspFailed / inspections.length) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{inspFailed}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Pending</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${inspections.length > 0 ? (inspPending / inspections.length) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{inspPending}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">NCR Status Breakdown</CardTitle><CardDescription className="text-xs">Non-conformance reports by status</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ncrStatusBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No NCRs in date range.</p>}
                {ncrStatusBreakdown.map(cat => {
                  const maxNcr = ncrStatusBreakdown.length > 0 ? Math.max(...ncrStatusBreakdown.map(c => c.count)) : 1;
                  return (
                    <div key={cat.status} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-28">{cat.status}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className={`h-full ${ncrColors[cat.status.toLowerCase().replace(/ /g, '_')] || 'bg-slate-400'} rounded-full`} style={{ width: `${(cat.count / maxNcr) * 100}%` }} /></div>
                      <span className="text-sm font-semibold w-16 text-right">{cat.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Audit Completion</CardTitle><CardDescription className="text-xs">{audits.length} audits in range</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Completed</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${auditCompletionRate}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{auditsCompleted}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">In Progress</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${audits.length > 0 ? (auditsInProgress / audits.length) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{auditsInProgress}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Planned</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-sky-500 rounded-full" style={{ width: `${audits.length > 0 ? (auditsPlanned / audits.length) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{auditsPlanned}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Inspection Trend</CardTitle><CardDescription className="text-xs">Inspections by month</CardDescription></CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? <p className="text-sm text-muted-foreground">No inspection data for chart.</p> : (
                <div className="flex items-end gap-3 h-40">
                  {monthlyData.map(d => {
                    const maxM = Math.max(...monthlyData.map(x => x.total), 1);
                    return (
                      <div key={d.monthKey} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium">{d.passed}/{d.total}</span>
                        <div className="w-full bg-emerald-100 rounded-t-md" style={{ height: `${(d.total / maxM) * 100}px` }}>
                          <div className="w-full h-full bg-emerald-500 rounded-t-md opacity-80" />
                        </div>
                        <span className="text-[10px] text-muted-foreground text-center">{d.month.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="hidden sm:table-cell text-right">Passed</TableHead><TableHead className="hidden sm:table-cell text-right">Failed</TableHead><TableHead className="text-right">Pass Rate</TableHead></TableRow></TableHeader><TableBody>
            {monthlyData.length === 0 ? (
              <TableRow><TableCell colSpan={5}><EmptyState icon={ClipboardCheck} title="No monthly data" description="Inspection data will appear by month." /></TableCell></TableRow>
            ) : monthlyData.map(d => (
              <TableRow key={d.monthKey} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className="text-right">{d.total}</TableCell>
                <TableCell className="text-right text-emerald-600 hidden sm:table-cell">{d.passed}</TableCell>
                <TableCell className="text-right text-red-600 hidden sm:table-cell">{d.failed}</TableCell>
                <TableCell className={`text-right font-medium ${d.passRate >= 95 ? 'text-emerald-600' : d.passRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{d.passRate}%</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
export function ReportsSafetyPage() {
  const { startDate, setStartDate, endDate, setEndDate } = useDateRange();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [training, setTraining] = useState<any[]>([]);
  const [incidentKpis, setIncidentKpis] = useState<any>(null);
  const [inspKpis, setInspKpis] = useState<any>(null);
  const [trainingKpis, setTrainingKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/api/safety-incidents?limit=9999'),
      api.get<any>('/api/safety-inspections?limit=9999'),
      api.get<any>('/api/safety-training?limit=9999'),
    ]).then(([incRes, inspRes, trainRes]) => {
      const incData = incRes.success && Array.isArray(incRes.data) ? filterByDateRange(incRes.data, startDate, endDate) : [];
      const inspData = inspRes.success && Array.isArray(inspRes.data) ? filterByDateRange(inspRes.data, startDate, endDate) : [];
      const trainData = trainRes.success && Array.isArray(trainRes.data) ? filterByDateRange(trainRes.data, startDate, endDate) : [];
      setIncidents(incData);
      setInspections(inspData);
      setTraining(trainData);
      if (incRes.kpis) setIncidentKpis(incRes.kpis);
      if (inspRes.kpis) setInspKpis(inspRes.kpis);
      if (trainRes.kpis) setTrainingKpis(trainRes.kpis);
      setLoading(false);
    });
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Severity breakdown
  const severityMap: Record<string, number> = {};
  incidents.forEach(i => { const s = i.severity || 'unknown'; severityMap[s] = (severityMap[s] || 0) + 1; });
  const severityBreakdown = Object.entries(severityMap).map(([sev, count]) => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1), count,
  }));
  const sevColors: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-emerald-500', minor: 'bg-sky-500' };

  // Incident status
  const openIncidents = incidents.filter(i => i.status === 'open').length;
  const investigatingIncidents = incidents.filter(i => i.status === 'investigating').length;
  const closedIncidents = incidents.filter(i => i.status === 'closed').length;

  // Inspection completion
  const inspCompleted = inspections.filter(i => i.status === 'completed').length;
  const inspScheduled = inspections.filter(i => i.status === 'scheduled').length;
  const inspFailed = inspections.filter(i => i.status === 'failed').length;
  const inspCompletionRate = inspections.length > 0 ? Math.round((inspCompleted / inspections.length) * 100) : 0;

  // Training compliance
  const trainCompleted = training.filter(t => t.status === 'completed').length;
  const trainPlanned = training.filter(t => t.status === 'planned').length;
  const trainInProgress = training.filter(t => t.status === 'in_progress').length;
  const trainingCompliance = training.length > 0 ? Math.round((trainCompleted / training.length) * 100) : 0;

  // Total training hours
  const totalTrainingHrs = training.reduce((sum, t) => sum + (t.durationHours || 0), 0);

  // Monthly incident trend
  const monthlyMap: Record<string, { incidents: number; closed: number; inspections: number; trainingHrs: number }> = {};
  incidents.forEach(i => {
    const dateStr = i.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { incidents: 0, closed: 0, inspections: 0, trainingHrs: 0 };
    monthlyMap[key].incidents += 1;
    if (i.status === 'closed') monthlyMap[key].closed += 1;
  });
  inspections.forEach(i => {
    const dateStr = i.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { incidents: 0, closed: 0, inspections: 0, trainingHrs: 0 };
    monthlyMap[key].inspections += 1;
  });
  training.forEach(t => {
    const dateStr = t.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { incidents: 0, closed: 0, inspections: 0, trainingHrs: 0 };
    monthlyMap[key].trainingHrs += t.durationHours || 0;
  });

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      return { month: label, monthKey: key, ...data };
    });

  const totalIncidents = incidents.length;
  const daysSinceLast = incidentKpis?.daysSinceLast ?? '—';

  const summaryCards = [
    { label: 'Total Incidents', value: totalIncidents.toString(), icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
    { label: 'Open Cases', value: (openIncidents + investigatingIncidents).toString(), icon: ShieldAlert, color: 'bg-amber-50 text-amber-600' },
    { label: 'Inspections Done', value: `${inspCompletionRate}%`, icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Training Compliance', value: `${trainingCompliance}%`, icon: GraduationCap, color: 'bg-sky-50 text-sky-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Safety Reports</h1><p className="text-muted-foreground mt-1">Incident trends, severity breakdown, inspection completion, and training compliance from real safety data</p></div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
        <Button variant="outline" size="sm" onClick={() => exportCSV('safety-incidents', ['ID', 'Title', 'Severity', 'Status', 'Date', 'Reported By'], incidents.map(i => [i.incidentNumber || i.id || '', i.title || '', i.severity || '', i.status || '', i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : '', i.reportedBy || '']))}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportPDF({
          title: 'Safety Reports',
          subtitle: `Date Range: ${startDate} to ${endDate}`,
          filename: 'safety-incidents',
          headers: ['ID', 'Title', 'Severity', 'Status', 'Date', 'Reported By'],
          rows: incidents.map(i => [i.incidentNumber || i.id || '', i.title || '', i.severity || '', i.status || '', i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : '', i.reportedBy || '']),
          summary: summaryCards.map(k => ({ label: k.label, value: String(k.value) })),
        })}>
          <FileDown className="h-4 w-4 mr-1.5" />Export PDF
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      {totalIncidents === 0 && inspections.length === 0 && training.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No safety data available for this date range" description="Record incidents, inspections, or training to see safety metrics." />
      ) : (<>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Severity Breakdown</CardTitle><CardDescription className="text-xs">Incidents by severity level</CardDescription></CardHeader>
            <CardContent>
              {severityBreakdown.length === 0 ? <p className="text-sm text-muted-foreground">No incidents in date range.</p> : (
                <div className="space-y-3">
                  {severityBreakdown.map(s => {
                    const maxSev = Math.max(...severityBreakdown.map(x => x.count), 1);
                    return (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-24">{s.name}</span>
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${sevColors[s.name.toLowerCase()] || 'bg-slate-400'} rounded-full transition-all`} style={{ width: `${(s.count / maxSev) * 100}%` }} /></div>
                        <span className="text-sm font-semibold w-16 text-right">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Inspection & Training</CardTitle><CardDescription className="text-xs">{inspections.length} inspections, {training.length} training sessions</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Completed</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${inspCompletionRate}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{inspCompleted}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Scheduled</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-sky-500 rounded-full" style={{ width: `${inspections.length > 0 ? (inspScheduled / inspections.length) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{inspScheduled}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Failed</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${inspections.length > 0 ? (inspFailed / inspections.length) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{inspFailed}</span>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28">Training Done</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${trainingCompliance}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{trainCompleted}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Training Hours</span>
                  <span className="font-semibold">{totalTrainingHrs} hrs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Safety Trend</CardTitle><CardDescription className="text-xs">Incidents, inspections, and training by month</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {monthlyData.map(d => {
                const maxM = Math.max(...monthlyData.map(x => x.inspections + x.incidents), 1);
                return (
                  <div key={d.monthKey} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{d.incidents}/{d.inspections}</span>
                    <div className="w-full bg-amber-100 rounded-t-md" style={{ height: `${((d.inspections + d.incidents) / maxM) * 100}px` }}>
                      <div className="w-full h-full bg-amber-500 rounded-t-md opacity-80" />
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center">{d.month.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Incidents</TableHead><TableHead className="hidden sm:table-cell text-right">Closed</TableHead><TableHead className="text-right">Inspections</TableHead><TableHead className="hidden md:table-cell text-right">Training Hrs</TableHead></TableRow></TableHeader><TableBody>
            {monthlyData.length === 0 ? (
              <TableRow><TableCell colSpan={5}><EmptyState icon={Calendar} title="No monthly data" description="Safety data will appear by month." /></TableCell></TableRow>
            ) : monthlyData.map(d => (
              <TableRow key={d.monthKey} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className={`text-right font-medium ${d.incidents > 0 ? 'text-red-600' : 'text-foreground'}`}>{d.incidents}</TableCell>
                <TableCell className="text-right text-emerald-600 hidden sm:table-cell">{d.closed}</TableCell>
                <TableCell className="text-right">{d.inspections}</TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.trainingHrs} hrs</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
export function ReportsFinancialPage() {
  const { startDate, setStartDate, endDate, setEndDate } = useDateRange();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [inventoryKpi, setInventoryKpi] = useState<any>(null);
  const [prodKpi, setProdKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/api/work-orders?limit=9999'),
      api.get<any>('/api/assets?limit=9999'),
      api.get<any>('/api/inventory?limit=9999'),
      api.get<any>('/api/inventory/kpi'),
      api.get<any>('/api/production-orders/kpi'),
    ]).then(([woRes, assetRes, invRes, invKpiRes, prodKpiRes]) => {
      // Filter WOs by date range client-side
      const woData = woRes.success && Array.isArray(woRes.data) ? filterByDateRange(woRes.data, startDate, endDate) : [];
      setWorkOrders(woData);
      if (assetRes.success && Array.isArray(assetRes.data)) setAssets(assetRes.data);
      if (invRes.success && Array.isArray(invRes.data)) setInventory(invRes.data);
      if (invKpiRes.success && invKpiRes.data) setInventoryKpi(invKpiRes.data);
      if (prodKpiRes.success && prodKpiRes.data) setProdKpi(prodKpiRes.data);
      setLoading(false);
    });
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalCost = workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);
  const materialCost = workOrders.reduce((sum, wo) => sum + (wo.materialCost || 0), 0);
  const laborCost = workOrders.reduce((sum, wo) => sum + (wo.laborCost || 0), 0);
  const avgCost = workOrders.length > 0 ? totalCost / workOrders.length : 0;

  // Asset values
  const totalAssetPurchaseCost = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
  const totalAssetCurrentValue = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);

  // Inventory value
  const totalInventoryValue = inventoryKpi ? (inventoryKpi.totalValue || 0) : inventory.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.unitCost || 0)), 0);

  // Production value from KPI
  const productionValue = prodKpi ? (prodKpi.completedValue || 0) : 0;

  const costByType: Record<string, { cost: number; count: number }> = {};
  workOrders.forEach(wo => {
    const t = wo.type || 'other';
    if (!costByType[t]) costByType[t] = { cost: 0, count: 0 };
    costByType[t].cost += wo.totalCost || 0;
    costByType[t].count += 1;
  });
  const typeEntries = Object.entries(costByType).sort((a, b) => b[1].cost - a[1].cost);

  // Monthly cost trends from filtered WOs
  const monthlyCostMap: Record<string, { totalCost: number; laborCost: number; materialCost: number; count: number }> = {};
  workOrders.forEach(wo => {
    const dateStr = wo.actualEnd || wo.updatedAt || wo.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyCostMap[key]) monthlyCostMap[key] = { totalCost: 0, laborCost: 0, materialCost: 0, count: 0 };
    monthlyCostMap[key].totalCost += wo.totalCost || 0;
    monthlyCostMap[key].laborCost += wo.laborCost || 0;
    monthlyCostMap[key].materialCost += wo.materialCost || 0;
    monthlyCostMap[key].count += 1;
  });

  const monthlyCostData = Object.entries(monthlyCostMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      return { month: label, monthKey: key, ...data };
    });

  const maxMonthlyCost = monthlyCostData.length > 0 ? Math.max(...monthlyCostData.map(d => d.totalCost), 1) : 1;

  const highCostWOs = [...workOrders].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0)).slice(0, 15);

  const typeColors: Record<string, string> = { preventive: 'bg-emerald-500', corrective: 'bg-amber-500', emergency: 'bg-red-500', inspection: 'bg-sky-500', predictive: 'bg-violet-500', project: 'bg-teal-500' };

  const summaryCards = [
    { label: 'Maintenance Cost', value: `$${totalCost.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Inventory Value', value: `$${Math.round(totalInventoryValue).toLocaleString()}`, icon: Boxes, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Production Value', value: `$${productionValue.toLocaleString()}`, icon: Factory, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Avg WO Cost', value: `$${avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1><p className="text-muted-foreground mt-1">Maintenance cost breakdown, inventory value, production value, and budget trends from real financial data</p></div>
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
        <Button variant="outline" size="sm" onClick={() => exportCSV('financial-work-orders', ['WO Number', 'Title', 'Type', 'Priority', 'Cost', 'Status'], workOrders.map(wo => [wo.woNumber || '', wo.title || '', wo.type || '', wo.priority || '', (wo.totalCost || 0).toString(), wo.status || '']))}>
          <Download className="h-4 w-4 mr-1.5" />Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportPDF({
          title: 'Financial Reports',
          subtitle: `Date Range: ${startDate} to ${endDate}`,
          filename: 'financial-work-orders',
          headers: ['WO Number', 'Title', 'Type', 'Priority', 'Cost', 'Status'],
          rows: workOrders.map(wo => [wo.woNumber || '', wo.title || '', wo.type || '', wo.priority || '', `$${(wo.totalCost || 0).toLocaleString()}`, wo.status || '']),
          summary: summaryCards.map(k => ({ label: k.label, value: String(k.value) })),
        })}>
          <FileDown className="h-4 w-4 mr-1.5" />Export PDF
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      {monthlyCostData.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Cost Trends</CardTitle><CardDescription className="text-xs">Maintenance expenditure by month (filtered by date range)</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {monthlyCostData.map(d => (
                <div key={d.monthKey} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">${d.totalCost.toLocaleString()}</span>
                  <div className="w-full bg-emerald-100 rounded-t-md" style={{ height: `${(d.totalCost / maxMonthlyCost) * 140}px` }}>
                    <div className="w-full h-full bg-emerald-500 rounded-t-md opacity-80" />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center">{d.month.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border"><CardHeader><CardTitle className="text-base">Cost by WO Type</CardTitle><CardDescription className="text-xs">Maintenance expenditure breakdown by type</CardDescription></CardHeader><CardContent>
          <div className="space-y-3">
            {typeEntries.map(([type, data]) => {
              const pct = totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28 capitalize">{type.replace('_', ' ')}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${typeColors[type] || 'bg-slate-400'} rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>
                  <span className="text-sm font-semibold w-28 text-right">${data.cost.toLocaleString()} ({pct}%)</span>
                </div>
              );
            })}
            {typeEntries.length === 0 && <p className="text-sm text-muted-foreground">No cost data available for date range.</p>}
          </div>
        </CardContent></Card>
        <Card className="border"><CardHeader><CardTitle className="text-base">Portfolio Value</CardTitle><CardDescription className="text-xs">Asset, inventory, and production value summary</CardDescription></CardHeader><CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Assets</span>
              <span className="text-sm font-semibold">{assets.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Asset Purchase Cost</span>
              <span className="text-sm font-semibold">${totalAssetPurchaseCost.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Asset Current Value</span>
              <span className="text-sm font-semibold">${totalAssetCurrentValue.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Inventory Value</span>
              <span className="text-sm font-semibold">${Math.round(totalInventoryValue).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Production Value (completed)</span>
              <span className="text-sm font-semibold">${productionValue.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Portfolio Value</span>
              <span className="text-lg font-bold">${(totalAssetCurrentValue + Math.round(totalInventoryValue) + productionValue).toLocaleString()}</span>
            </div>
          </div>
        </CardContent></Card>
      </div>
      <Card className="border"><CardHeader><CardTitle className="text-base">High-Cost Work Orders</CardTitle><CardDescription className="text-xs">Top work orders by total cost (filtered by date range)</CardDescription></CardHeader><CardContent>
        <div className="max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Title</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Priority</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Material</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>
            {highCostWOs.length === 0 ? (
              <TableRow><TableCell colSpan={8}><EmptyState icon={DollarSign} title="No cost data" description="Cost data will appear once work orders have costs assigned." /></TableCell></TableRow>
            ) : highCostWOs.map(wo => (
              <TableRow key={wo.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                <TableCell className="text-xs capitalize hidden sm:table-cell">{(wo.type || '').replace('_', ' ')}</TableCell>
                <TableCell className="hidden md:table-cell"><PriorityBadge priority={wo.priority} /></TableCell>
                <TableCell><StatusBadge status={wo.status} /></TableCell>
                <TableCell className="text-right text-muted-foreground">${(wo.materialCost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">${(wo.laborCost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">${(wo.totalCost || 0).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
    </div>
  );
}
export function ReportsCustomPage() {
  const [dataSource, setDataSource] = useState<'work_orders' | 'assets' | 'inventory' | 'maintenance_requests'>('work_orders');
  const [metric, setMetric] = useState('count');
  const [loading, setLoading] = useState(true);
  const [summaryRows, setSummaryRows] = useState<{ key: string; label: string; value: string | number }[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const dataSourceLabels: Record<string, string> = {
    work_orders: 'Work Orders',
    assets: 'Assets',
    inventory: 'Inventory Items',
    maintenance_requests: 'Maintenance Requests',
  };

  const metricLabels: Record<string, string> = {
    count: 'Count by Status',
    cost: 'Cost Breakdown',
    hours: 'Hours Analysis',
    priority: 'Priority Distribution',
  };

  useEffect(() => {
    let endpoint = '';
    if (dataSource === 'work_orders') endpoint = '/api/work-orders?limit=9999';
    else if (dataSource === 'assets') endpoint = '/api/assets?limit=9999';
    else if (dataSource === 'inventory') endpoint = '/api/inventory?limit=9999';
    else if (dataSource === 'maintenance_requests') endpoint = '/api/maintenance-requests?limit=9999';

    api.get(endpoint).then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      setTotalCount(data.length);

      const rows: { key: string; label: string; value: string | number }[] = [];

      if (dataSource === 'work_orders') {
        const wos = data as WorkOrder[];
        if (metric === 'count') {
          const statusMap: Record<string, number> = {};
          wos.forEach(wo => { const s = wo.status || 'unknown'; statusMap[s] = (statusMap[s] || 0) + 1; });
          Object.entries(statusMap).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => rows.push({ key: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: c }));
        } else if (metric === 'cost') {
          const totalCost = wos.reduce((s, wo) => s + (wo.totalCost || 0), 0);
          rows.push({ key: 'total', label: 'Total Cost', value: `$${totalCost.toLocaleString()}` });
          rows.push({ key: 'labor', label: 'Total Labor Cost', value: `$${wos.reduce((s, wo) => s + (wo.laborCost || 0), 0).toLocaleString()}` });
          rows.push({ key: 'material', label: 'Total Material Cost', value: `$${wos.reduce((s, wo) => s + (wo.materialCost || 0), 0).toLocaleString()}` });
          rows.push({ key: 'avg', label: 'Avg Cost per WO', value: wos.length > 0 ? `₵${Math.round(totalCost / wos.length).toLocaleString()}` : '₵0' });
        } else if (metric === 'hours') {
          const totalActual = wos.reduce((s, wo) => s + (wo.actualHours || 0), 0);
          const totalEst = wos.reduce((s, wo) => s + (wo.estimatedHours || 0), 0);
          rows.push({ key: 'totalActual', label: 'Total Actual Hours', value: `${totalActual.toFixed(1)} hrs` });
          rows.push({ key: 'totalEst', label: 'Total Estimated Hours', value: `${totalEst.toFixed(1)} hrs` });
          rows.push({ key: 'avg', label: 'Avg Actual per WO', value: wos.length > 0 ? `${(totalActual / wos.length).toFixed(1)} hrs` : '0 hrs' });
        } else if (metric === 'priority') {
          const prioMap: Record<string, number> = {};
          wos.forEach(wo => { const p = wo.priority || 'unknown'; prioMap[p] = (prioMap[p] || 0) + 1; });
          Object.entries(prioMap).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => rows.push({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1), value: c }));
        }
      } else if (dataSource === 'assets') {
        const items = data as Asset[];
        if (metric === 'count') {
          const statusMap: Record<string, number> = {};
          items.forEach(a => { const s = a.status || 'unknown'; statusMap[s] = (statusMap[s] || 0) + 1; });
          Object.entries(statusMap).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => rows.push({ key: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: c }));
        } else if (metric === 'cost') {
          const totalPurchase = items.reduce((s, a) => s + (a.purchaseCost || 0), 0);
          const totalCurrent = items.reduce((s, a) => s + (a.currentValue || 0), 0);
          rows.push({ key: 'purchase', label: 'Total Purchase Cost', value: `$${totalPurchase.toLocaleString()}` });
          rows.push({ key: 'current', label: 'Total Current Value', value: `$${totalCurrent.toLocaleString()}` });
          rows.push({ key: 'avg', label: 'Avg per Asset', value: items.length > 0 ? `₵${Math.round(totalCurrent / items.length).toLocaleString()}` : '₵0' });
        } else if (metric === 'priority') {
          const condMap: Record<string, number> = {};
          items.forEach(a => { const c = a.condition || 'unknown'; condMap[c] = (condMap[c] || 0) + 1; });
          Object.entries(condMap).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => rows.push({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1), value: n }));
        } else {
          rows.push({ key: 'total', label: 'Total Assets', value: items.length });
        }
      } else if (dataSource === 'inventory') {
        const items = data as InventoryItem[];
        if (metric === 'count') {
          const catMap: Record<string, number> = {};
          items.forEach(i => { const c = i.category || 'unknown'; catMap[c] = (catMap[c] || 0) + 1; });
          Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => rows.push({ key: c, label: c, value: n }));
        } else if (metric === 'cost') {
          const totalValue = items.reduce((s, i) => s + ((i.currentStock || 0) * (i.unitCost || 0)), 0);
          const lowStock = items.filter(i => i.currentStock <= i.minStockLevel).length;
          rows.push({ key: 'totalValue', label: 'Total Inventory Value', value: `$${totalValue.toLocaleString()}` });
          rows.push({ key: 'lowStock', label: 'Low Stock Items', value: lowStock });
          rows.push({ key: 'avg', label: 'Avg Value per Item', value: items.length > 0 ? `₵${Math.round(totalValue / items.length).toLocaleString()}` : '₵0' });
        } else {
          rows.push({ key: 'total', label: 'Total Items', value: items.length });
          rows.push({ key: 'totalStock', label: 'Total Stock Units', value: items.reduce((s, i) => s + (i.currentStock || 0), 0) });
          rows.push({ key: 'lowStock', label: 'Low Stock Count', value: items.filter(i => i.currentStock <= i.minStockLevel).length });
        }
      } else if (dataSource === 'maintenance_requests') {
        const items = data as MaintenanceRequest[];
        if (metric === 'count') {
          const statusMap: Record<string, number> = {};
          items.forEach(mr => { const s = mr.status || 'unknown'; statusMap[s] = (statusMap[s] || 0) + 1; });
          Object.entries(statusMap).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => rows.push({ key: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: c }));
        } else if (metric === 'priority') {
          const prioMap: Record<string, number> = {};
          items.forEach(mr => { const p = mr.priority || 'unknown'; prioMap[p] = (prioMap[p] || 0) + 1; });
          Object.entries(prioMap).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => rows.push({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1), value: c }));
        } else {
          rows.push({ key: 'total', label: 'Total MRs', value: items.length });
          rows.push({ key: 'pending', label: 'Pending', value: items.filter(mr => mr.status === 'pending').length });
          rows.push({ key: 'approved', label: 'Approved', value: items.filter(mr => mr.status === 'approved').length });
        }
      }

      setSummaryRows(rows);
      setLoading(false);
    });
  }, [dataSource, metric]);

  const kpis = [
    { label: 'Data Source', value: dataSourceLabels[dataSource], icon: Database, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Metric', value: metricLabels[metric], icon: BarChart3, color: 'bg-sky-50 text-sky-600' },
    { label: 'Total Records', value: totalCount.toString(), icon: FileSpreadsheet, color: 'bg-amber-50 text-amber-600' },
    { label: 'Summary Rows', value: summaryRows.length.toString(), icon: CheckCircle2, color: 'bg-violet-50 text-violet-600' },
  ];

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Custom Reports</h1><p className="text-muted-foreground mt-1">Build custom reports by selecting a data source and metric — results are generated in real time</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <Card className="border border-border/60 shadow-sm">
        <CardHeader><CardTitle className="text-base">Report Builder</CardTitle><CardDescription className="text-xs">Select data source and metric to generate a report</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={(v: any) => setDataSource(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="work_orders">Work Orders</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="maintenance_requests">Maintenance Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count by Status</SelectItem>
                  <SelectItem value="cost">Cost Breakdown</SelectItem>
                  <SelectItem value="hours">Hours Analysis</SelectItem>
                  <SelectItem value="priority">Priority Distribution</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Metric / Category</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3}><div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />Loading data...</div></TableCell></TableRow>
                ) : summaryRows.length === 0 ? (
                  <TableRow><TableCell colSpan={3}><EmptyState icon={FileSpreadsheet} title="No data available" description="No data found for the selected source and metric." /></TableCell></TableRow>
                ) : summaryRows.map((row, idx) => (
                  <TableRow key={row.key} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right font-semibold">{typeof row.value === 'number' ? row.value.toLocaleString() : row.value}</TableCell>
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
// SETTINGS SUBPAGES
// ============================================================================

