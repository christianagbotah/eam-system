'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
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
  Building2, Wrench, Package, Factory, ShieldCheck, HardHat, TrendingUp,
  FileBarChart, FileSpreadsheet, Download, Plus, Search, Filter, Calendar,
  Eye, Printer, Share, BarChart3, DollarSign, RefreshCw, Clock, Settings,
  Loader2,
  ArrowUpDown, FileText, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { EmptyState, StatusBadge, PriorityBadge, formatDate, formatDateTime, LoadingSkeleton } from '@/components/shared/helpers';

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
    { label: 'Avg WO Cost', value: `$${avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
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
    { label: 'Total Value', value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
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
                <TableCell className="text-right font-medium">${value.toLocaleString()}</TableCell>
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
  const [monthFilter, setMonthFilter] = useState('all');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<WorkOrder[]>('/api/work-orders?limit=9999'),
      api.get<Asset[]>('/api/assets?limit=9999'),
    ]).then(([woRes, assetRes]) => {
      if (woRes.success && Array.isArray(woRes.data)) setWorkOrders(woRes.data);
      if (assetRes.success && Array.isArray(assetRes.data)) setAssets(assetRes.data);
      setLoading(false);
    });
  }, []);

  const completedWOs = workOrders.filter(wo => wo.status === 'completed' || wo.status === 'closed' || wo.status === 'verified');

  // Group completed WOs by month
  const monthlyMap: Record<string, { completed: number; plannedHrs: number; actualHrs: number }> = {};
  completedWOs.forEach(wo => {
    const dateStr = wo.actualEnd || wo.updatedAt || wo.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = format(d, 'MMM yyyy');
    if (!monthlyMap[key]) monthlyMap[key] = { completed: 0, plannedHrs: 0, actualHrs: 0 };
    monthlyMap[key].completed += 1;
    monthlyMap[key].plannedHrs += wo.estimatedHours || 0;
    monthlyMap[key].actualHrs += wo.actualHours || 0;
  });

  // Assets under maintenance for downtime count
  const underMaintenanceCount = assets.filter(a => a.status === 'under_maintenance').length;

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      const efficiency = data.plannedHrs > 0 ? Math.min(100, Math.round((data.plannedHrs / (data.plannedHrs + Math.max(0, data.actualHrs - data.plannedHrs))) * 100 * 10) / 10) : data.actualHrs > 0 ? 100 : 0;
      return { month: label, monthKey: key, completed: data.completed, plannedHrs: Math.round(data.plannedHrs), actualHrs: Math.round(data.actualHrs), efficiency, downtime: underMaintenanceCount };
    });

  const months = monthlyData.map(d => d.month);
  const filtered = monthFilter === 'all' ? monthlyData : monthlyData.filter(d => d.month.includes(monthFilter));
  const totalOutput = monthlyData.reduce((s, d) => s + d.completed, 0);
  const avgEfficiency = monthlyData.length > 0 ? (monthlyData.reduce((s, d) => s + d.efficiency, 0) / monthlyData.length).toFixed(1) : '0.0';
  const avgDowntime = monthlyData.length > 0 ? (monthlyData.reduce((s, d) => s + d.actualHrs, 0) / monthlyData.length).toFixed(1) : '0.0';
  const avgWaste = totalOutput > 0 ? ((monthlyData.reduce((s, d) => s + Math.max(0, d.actualHrs - d.plannedHrs), 0) / monthlyData.reduce((s, d) => s + d.plannedHrs || 1, 0)) * 100).toFixed(1) : '0.0';
  const maxActual = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.completed), 1) : 1;
  const summaryCards = [
    { label: 'Completed WOs', value: totalOutput.toString(), icon: Factory, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Efficiency', value: `${avgEfficiency}%`, icon: Target, color: 'bg-sky-50 text-sky-600' },
    { label: 'Avg Actual Hours', value: `${avgDowntime} hrs/mo`, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Over-hours Rate', value: `${avgWaste}%`, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Production Reports</h1><p className="text-muted-foreground mt-1">Work order output, planned vs actual hours, and efficiency trends derived from completed work orders</p></div>
        <div className="w-full sm:w-auto">
          <Select value={monthFilter} onValueChange={setMonthFilter}><SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Filter month" /></SelectTrigger><SelectContent><SelectItem value="all">All Months</SelectItem>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      {completedWOs.length === 0 ? (
        <EmptyState icon={Factory} title="No production data available yet" description="Complete work orders to see production trends, efficiency metrics, and planned vs actual hours." />
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
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Completed Work Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {monthlyData.map(d => (
                <div key={d.monthKey} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{d.completed}</span>
                  <div className="w-full bg-emerald-100 rounded-t-md" style={{ height: `${(d.completed / maxActual) * 140}px` }}>
                    <div className="w-full h-full bg-emerald-500 rounded-t-md opacity-80" />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center">{d.month.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Completed WOs</TableHead><TableHead className="text-right">Planned Hrs</TableHead><TableHead className="text-right">Actual Hrs</TableHead><TableHead className="hidden sm:table-cell text-right">Efficiency</TableHead><TableHead className="hidden md:table-cell text-right">Assets in Maint.</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(d => (
              <TableRow key={d.monthKey} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className="text-right font-medium">{d.completed}</TableCell>
                <TableCell className="text-right text-muted-foreground">{d.plannedHrs.toLocaleString()}</TableCell>
                <TableCell className="text-right">{d.actualHrs.toLocaleString()}</TableCell>
                <TableCell className={`text-right font-medium hidden sm:table-cell ${d.efficiency >= 90 ? 'text-emerald-600' : d.efficiency >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{d.efficiency}%</TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.downtime}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
export function ReportsQualityPage() {
  const [monthFilter, setMonthFilter] = useState('all');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<WorkOrder[]>('/api/work-orders?limit=9999').then(res => {
      if (res.success && Array.isArray(res.data)) setWorkOrders(res.data);
      setLoading(false);
    });
  }, []);

  // Group WOs by type
  const typeMap: Record<string, { total: number; completed: number; totalActualHrs: number; totalEstHrs: number }> = {};
  workOrders.forEach(wo => {
    const t = wo.type || 'other';
    if (!typeMap[t]) typeMap[t] = { total: 0, completed: 0, totalActualHrs: 0, totalEstHrs: 0 };
    typeMap[t].total += 1;
    if (wo.status === 'completed' || wo.status === 'closed' || wo.status === 'verified') typeMap[t].completed += 1;
    typeMap[t].totalActualHrs += wo.actualHours || 0;
    typeMap[t].totalEstHrs += wo.estimatedHours || 0;
  });

  const typeColors: Record<string, string> = { preventive: 'bg-emerald-500', corrective: 'bg-amber-500', emergency: 'bg-red-500', inspection: 'bg-sky-500', predictive: 'bg-violet-500', project: 'bg-teal-500', other: 'bg-slate-400' };
  const ncrCategories = Object.entries(typeMap)
    .map(([type, data]) => ({
      name: type.replace('_', ' '),
      count: data.total,
      color: typeColors[type] || 'bg-slate-400',
      completed: data.completed,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      avgHours: data.completed > 0 ? Math.round((data.totalActualHrs / data.completed) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const totalNCRs = ncrCategories.reduce((s, c) => s + c.count, 0);
  const totalCompleted = ncrCategories.reduce((s, c) => s + c.completed, 0);
  const avgPassRate = totalNCRs > 0 ? ((totalCompleted / totalNCRs) * 100).toFixed(1) : '0.0';

  // Group completed WOs by month
  const monthlyMap: Record<string, { completed: number; total: number }> = {};
  workOrders.forEach(wo => {
    const dateStr = wo.actualEnd || wo.updatedAt || wo.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { completed: 0, total: 0 };
    monthlyMap[key].total += 1;
    if (wo.status === 'completed' || wo.status === 'closed' || wo.status === 'verified') monthlyMap[key].completed += 1;
  });

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      const passRate = data.total > 0 ? Math.round((data.completed / data.total) * 1000) / 10 : 0;
      return { month: label, monthKey: key, inspections: data.total, passed: data.completed, failed: data.total - data.completed, passRate, ncrs: data.total - data.completed };
    });

  const months = monthlyData.map(d => d.month);
  const filtered = monthFilter === 'all' ? monthlyData : monthlyData.filter(d => d.month.includes(monthFilter));
  const totalInspections = workOrders.length;
  const summaryCards = [
    { label: 'Total Work Orders', value: totalInspections.toString(), icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Completion Rate', value: `${avgPassRate}%`, icon: ShieldCheck, color: 'bg-sky-50 text-sky-600' },
    { label: 'Incomplete WOs', value: (totalNCRs - totalCompleted).toString(), icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'WO Types', value: ncrCategories.length.toString(), icon: Clock, color: 'bg-red-50 text-red-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Reports</h1><p className="text-muted-foreground mt-1">Work order completion rates, type analysis, and quality KPIs derived from real work order data</p></div>
        <Select value={monthFilter} onValueChange={setMonthFilter}><SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Filter month" /></SelectTrigger><SelectContent><SelectItem value="all">All Months</SelectItem>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
      </div>
      {workOrders.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No quality data available yet" description="Create work orders to see completion rates and type analysis." />
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
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Work Orders by Type</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ncrCategories.map(cat => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28 capitalize">{cat.name}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className={`h-full ${cat.color} rounded-full`} style={{ width: `${totalNCRs > 0 ? (cat.count / Math.max(...ncrCategories.map(c => c.count))) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-36 text-right">{cat.count} ({cat.completionRate}% done)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total WOs</TableHead><TableHead className="hidden sm:table-cell text-right">Completed</TableHead><TableHead className="hidden sm:table-cell text-right">Incomplete</TableHead><TableHead className="text-right">Completion Rate</TableHead><TableHead className="hidden md:table-cell text-right">Avg Hrs/WO</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(d => (
              <TableRow key={d.monthKey} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className="text-right">{d.inspections}</TableCell>
                <TableCell className="text-right text-emerald-600 hidden sm:table-cell">{d.passed}</TableCell>
                <TableCell className="text-right text-red-600 hidden sm:table-cell">{d.failed}</TableCell>
                <TableCell className={`text-right font-medium ${d.passRate >= 95 ? 'text-emerald-600' : d.passRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{d.passRate}%</TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">—</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
export function ReportsSafetyPage() {
  const [yearFilter, setYearFilter] = useState('2025');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mrs, setMrs] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<WorkOrder[]>('/api/work-orders?limit=9999'),
      api.get<Asset[]>('/api/assets?limit=9999'),
      api.get<MaintenanceRequest[]>('/api/maintenance-requests?limit=9999'),
    ]).then(([woRes, assetRes, mrRes]) => {
      if (woRes.success && Array.isArray(woRes.data)) setWorkOrders(woRes.data);
      if (assetRes.success && Array.isArray(assetRes.data)) setAssets(assetRes.data);
      if (mrRes.success && Array.isArray(mrRes.data)) setMrs(mrRes.data);
      setLoading(false);
    });
  }, []);

  // Safety-related: critical/urgent priority WOs
  const safetyWOs = workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'urgent' || wo.priority === 'emergency');
  const criticalWOs = workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'emergency');
  const urgentWOs = workOrders.filter(wo => wo.priority === 'urgent');

  // At-risk assets: poor condition or out of service
  const atRiskAssets = assets.filter(a => a.condition === 'poor' || a.status === 'out_of_service');
  const poorConditionAssets = assets.filter(a => a.condition === 'poor');
  const outOfServiceAssets = assets.filter(a => a.status === 'out_of_service');

  // Overdue MRs: pending for more than 7 days
  const now = Date.now();
  const overdueMrs = mrs.filter(mr => mr.status === 'pending' && (now - new Date(mr.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000);
  const pendingMrs = mrs.filter(mr => mr.status === 'pending');

  // Priority breakdown for chart
  const incidentTypes = [
    { name: 'Critical', count: criticalWOs.length, color: 'bg-red-500' },
    { name: 'Urgent', count: urgentWOs.length, color: 'bg-amber-500' },
    { name: 'Poor Assets', count: poorConditionAssets.length, color: 'bg-orange-500' },
    { name: 'Out of Service', count: outOfServiceAssets.length, color: 'bg-sky-500' },
    { name: 'Overdue MRs', count: overdueMrs.length, color: 'bg-emerald-500' },
  ].filter(t => t.count > 0);
  const maxCount = incidentTypes.length > 0 ? Math.max(...incidentTypes.map(t => t.count)) : 1;

  // Group by month
  const monthlyMap: Record<string, { critical: number; urgent: number; atRiskAssets: number; overdueMRs: number }> = {};
  const addMonth = (dateStr: string, key: string, value: number) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    const mk = `${d.getFullYear()}`;
    if (!monthlyMap[mk]) monthlyMap[mk] = { critical: 0, urgent: 0, atRiskAssets: 0, overdueMRs: 0 };
    (monthlyMap[mk] as any)[key] = (monthlyMap[mk] as any)[key] || 0;
    (monthlyMap[mk] as any)[key] += value;
  };
  criticalWOs.forEach(wo => addMonth(wo.createdAt || '', 'critical', 1));
  urgentWOs.forEach(wo => addMonth(wo.createdAt || '', 'urgent', 1));
  overdueMrs.forEach(mr => addMonth(mr.createdAt || '', 'overdueMRs', 1));

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, data]) => ({
      month: year,
      incidents: data.critical,
      nearMisses: data.urgent,
      trir: (data.critical + data.urgent) > 0 ? Math.round(((data.critical * 2 + data.urgent) / (data.critical + data.urgent)) * 10) / 10 : 0,
      trainingHrs: 0,
      inspections: atRiskAssets.length,
      actionsClosed: workOrders.filter(wo => (wo.status === 'completed' || wo.status === 'closed') && (wo.createdAt || '').startsWith(year)).length,
    }));

  const filtered = monthlyData.filter(d => d.month.includes(yearFilter));
  const totalIncidents = criticalWOs.length + urgentWOs.length;
  const avgTRIR = totalIncidents > 0 ? (monthlyData.length > 0 ? (monthlyData.reduce((s, d) => s + d.trir, 0) / monthlyData.length).toFixed(1) : '0.0') : '0.0';
  const summaryCards = [
    { label: 'Critical WOs', value: criticalWOs.length.toString(), icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
    { label: 'Urgent WOs', value: urgentWOs.length.toString(), icon: ShieldAlert, color: 'bg-amber-50 text-amber-600' },
    { label: 'At-Risk Assets', value: atRiskAssets.length.toString(), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Overdue MRs', value: overdueMrs.length.toString(), icon: GraduationCap, color: 'bg-sky-50 text-sky-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Safety Reports</h1><p className="text-muted-foreground mt-1">Critical/urgent work orders, at-risk assets, and overdue maintenance requests</p></div>
        <Select value={yearFilter} onValueChange={setYearFilter}><SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent></Select>
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
      {safetyWOs.length === 0 && atRiskAssets.length === 0 && overdueMrs.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No safety concerns detected" description="No critical/urgent work orders, at-risk assets, or overdue maintenance requests found." />
      ) : (<>
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Safety Risk Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 h-40">
              {incidentTypes.map(t => (
                <div key={t.name} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{t.count}</span>
                  <div className="w-full rounded-t-md" style={{ height: `${(t.count / maxCount) * 100}px` }}>
                    <div className={`w-full h-full ${t.color} rounded-t-md opacity-80`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center">{t.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Year</TableHead><TableHead className="text-right">Critical WOs</TableHead><TableHead className="hidden sm:table-cell text-right">Urgent WOs</TableHead><TableHead className="text-right">Risk Score</TableHead><TableHead className="hidden md:table-cell text-right">At-Risk Assets</TableHead><TableHead className="hidden lg:table-cell text-right">Actions Closed</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(d => (
              <TableRow key={d.month} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className={`text-right font-medium ${d.incidents > 0 ? 'text-red-600' : 'text-foreground'}`}>{d.incidents}</TableCell>
                <TableCell className="text-right text-amber-600 hidden sm:table-cell">{d.nearMisses}</TableCell>
                <TableCell className={`text-right font-medium ${d.trir > 1.0 ? 'text-red-600' : d.trir > 0.5 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.trir}</TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.inspections}</TableCell>
                <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{d.actionsClosed}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6}><EmptyState icon={Calendar} title={`No data for ${yearFilter}`} description="Select a different year or create work orders to see safety data." /></TableCell></TableRow>
            )}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
export function ReportsFinancialPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<WorkOrder[]>('/api/work-orders?limit=9999'),
      api.get<Asset[]>('/api/assets?limit=9999'),
      api.get<InventoryItem[]>('/api/inventory?limit=9999'),
    ]).then(([woRes, assetRes, invRes]) => {
      if (woRes.success && Array.isArray(woRes.data)) setWorkOrders(woRes.data);
      if (assetRes.success && Array.isArray(assetRes.data)) setAssets(assetRes.data);
      if (invRes.success && Array.isArray(invRes.data)) setInventory(invRes.data);
      setLoading(false);
    });
  }, []);

  const totalCost = workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);
  const materialCost = workOrders.reduce((sum, wo) => sum + (wo.materialCost || 0), 0);
  const laborCost = workOrders.reduce((sum, wo) => sum + (wo.laborCost || 0), 0);
  const avgCost = workOrders.length > 0 ? totalCost / workOrders.length : 0;

  // Asset values
  const totalAssetPurchaseCost = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
  const totalAssetCurrentValue = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);

  // Inventory value
  const totalInventoryValue = inventory.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.unitCost || 0)), 0);

  const costByType: Record<string, { cost: number; count: number }> = {};
  workOrders.forEach(wo => {
    const t = wo.type || 'other';
    if (!costByType[t]) costByType[t] = { cost: 0, count: 0 };
    costByType[t].cost += wo.totalCost || 0;
    costByType[t].count += 1;
  });
  const typeEntries = Object.entries(costByType).sort((a, b) => b[1].cost - a[1].cost);

  // Monthly cost trends from completed WOs
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
    { label: 'Total Maintenance Cost', value: `$${totalCost.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Asset Value (Current)', value: `$${totalAssetCurrentValue.toLocaleString()}`, icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Inventory Value', value: `$${totalInventoryValue.toLocaleString()}`, icon: Boxes, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Avg WO Cost', value: `$${avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1><p className="text-muted-foreground mt-1">Financial reports on maintenance costs, asset values, inventory value, and budget trends</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      {monthlyCostData.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Cost Trends</CardTitle><CardDescription className="text-xs">Maintenance expenditure by month</CardDescription></CardHeader>
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
            {typeEntries.length === 0 && <p className="text-sm text-muted-foreground">No cost data available.</p>}
          </div>
        </CardContent></Card>
        <Card className="border"><CardHeader><CardTitle className="text-base">Asset Value Distribution</CardTitle><CardDescription className="text-xs">Purchase cost vs current value</CardDescription></CardHeader><CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Assets</span>
              <span className="text-sm font-semibold">{assets.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Purchase Cost</span>
              <span className="text-sm font-semibold">${totalAssetPurchaseCost.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Value</span>
              <span className="text-sm font-semibold">${totalAssetCurrentValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Inventory Value</span>
              <span className="text-sm font-semibold">${totalInventoryValue.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Portfolio Value</span>
              <span className="text-lg font-bold">${(totalAssetCurrentValue + totalInventoryValue).toLocaleString()}</span>
            </div>
          </div>
        </CardContent></Card>
      </div>
      <Card className="border"><CardHeader><CardTitle className="text-base">High-Cost Work Orders</CardTitle><CardDescription className="text-xs">Top work orders by total cost</CardDescription></CardHeader><CardContent>
        <div className="max-h-96 overflow-y-auto">
          <Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Title</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Priority</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Material</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>
            {highCostWOs.length === 0 ? (
              <TableRow><TableCell colSpan={8}><EmptyState icon={DollarSign} title="No cost data" description="Cost data will appear once work orders have costs assigned." /></TableCell></TableRow>
            ) : highCostWOs.map(wo => (
              <TableRow key={wo.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                <TableCell className="text-xs capitalize hidden sm:table-cell">{wo.type.replace('_', ' ')}</TableCell>
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
          rows.push({ key: 'avg', label: 'Avg Cost per WO', value: wos.length > 0 ? `$${Math.round(totalCost / wos.length).toLocaleString()}` : '$0' });
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
          rows.push({ key: 'avg', label: 'Avg per Asset', value: items.length > 0 ? `$${Math.round(totalCurrent / items.length).toLocaleString()}` : '$0' });
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
          rows.push({ key: 'avg', label: 'Avg Value per Item', value: items.length > 0 ? `$${Math.round(totalValue / items.length).toLocaleString()}` : '$0' });
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

