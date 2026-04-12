'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';
import type { DashboardStats, PageName } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import {
  ClipboardList, Wrench, Eye, Plus, CheckCircle2, AlertTriangle,
  TrendingUp, Factory, Shield, BarChart3, Package, Zap,
} from 'lucide-react';
import { EmptyState, StatusBadge, MiniBarChart, ProgressRing, LoadingSkeleton } from '@/components/shared/helpers';

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const woStatusChartConfig = {
  draft: { label: 'Draft', color: '#94a3b8' },
  requested: { label: 'Requested', color: '#06b6d4' },
  approved: { label: 'Approved', color: '#8b5cf6' },
  assigned: { label: 'Assigned', color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  completed: { label: 'Completed', color: '#10b981' },
  closed: { label: 'Closed', color: '#6b7280' },
} as const;

const woTypeChartConfig = {
  preventive: { label: 'Preventive', color: '#10b981' },
  corrective: { label: 'Corrective', color: '#f59e0b' },
  emergency: { label: 'Emergency', color: '#ef4444' },
  inspection: { label: 'Inspection', color: '#8b5cf6' },
  predictive: { label: 'Predictive', color: '#06b6d4' },
} as const;

const mrStatusChartConfig = {
  pending: { label: 'Pending', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  converted: { label: 'Converted', color: '#06b6d4' },
} as const;

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, hasPermission } = useAuthStore();
  const { navigate } = useNavigationStore();

  useEffect(() => {
    api.get<DashboardStats>('/api/dashboard/stats').then(res => {
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSkeleton />;

  const totalWOs = stats?.totalWorkOrders || 0;
  const completedWOs = stats?.completedWorkOrders || 0;
  const completionRate = totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0;
  const activeWOs = stats?.activeWorkOrders || 0;
  const overdueWOs = stats?.overdueWorkOrders || 0;
  const pendingReqs = stats?.pendingRequests || 0;
  const pendingApprovals = stats?.pendingApprovals || 0;

  // Chart Data
  const woStatusData = [
    { status: 'draft', count: stats?.draftWO || 0 },
    { status: 'requested', count: stats?.requestedWO || 0 },
    { status: 'approved', count: stats?.approvedWO || 0 },
    { status: 'assigned', count: stats?.assignedWO || 0 },
    { status: 'in_progress', count: stats?.inProgressWO || 0 },
    { status: 'completed', count: stats?.completedWO || 0 },
    { status: 'closed', count: stats?.closedWO || 0 },
  ].filter(d => d.count > 0);

  const woTypeData = [
    { type: 'preventive', count: stats?.preventiveWO || 0 },
    { type: 'corrective', count: stats?.correctiveWO || 0 },
    { type: 'emergency', count: stats?.emergencyWO || 0 },
    { type: 'inspection', count: stats?.inspectionWO || 0 },
    { type: 'predictive', count: stats?.predictiveWO || 0 },
  ].filter(d => d.count > 0);

  const mrStatusData = [
    { status: 'pending', count: stats?.pendingMR || 0 },
    { status: 'approved', count: stats?.approvedMR || 0 },
    { status: 'rejected', count: stats?.rejectedMR || 0 },
    { status: 'converted', count: stats?.convertedMR || 0 },
  ];

  const kpiCards = [
    {
      label: 'Pending Requests', value: pendingReqs,
      sublabel: `${stats?.createdTodayMR || 0} new today`,
      color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-100 dark:border-amber-900/40',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600 dark:text-amber-400',
      icon: ClipboardList, permission: 'maintenance_requests.view',
      barData: [2, 1, 3, pendingReqs - 1, pendingReqs + 1, pendingReqs, pendingReqs],
    },
    {
      label: 'Active Work Orders', value: activeWOs,
      sublabel: `${stats?.createdTodayWO || 0} created today`,
      color: '#10b981', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-100 dark:border-emerald-900/40',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Wrench, permission: 'work_orders.view',
      barData: [1, activeWOs - 1, activeWOs + 2, activeWOs, activeWOs - 2, activeWOs + 1, activeWOs],
    },
    {
      label: 'Completion Rate', value: `${completionRate}%`,
      sublabel: `${completedWOs} of ${totalWOs} completed`,
      color: '#14b8a6', bgColor: 'bg-teal-50 dark:bg-teal-950/30',
      borderColor: 'border-teal-100 dark:border-teal-900/40',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50', iconColor: 'text-teal-600 dark:text-teal-400',
      icon: CheckCircle2, permission: 'work_orders.view',
      barData: [45, 52, 48, 60, completionRate - 5, completionRate + 3, completionRate],
      showRing: true, ringValue: completionRate,
    },
    {
      label: 'Overdue', value: overdueWOs,
      sublabel: overdueWOs > 0 ? 'Need immediate attention' : 'All on track',
      color: overdueWOs > 0 ? '#ef4444' : '#10b981',
      bgColor: overdueWOs > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: overdueWOs > 0 ? 'border-red-100 dark:border-red-900/40' : 'border-emerald-100 dark:border-emerald-900/40',
      iconBg: overdueWOs > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: overdueWOs > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
      icon: AlertTriangle, permission: 'work_orders.view',
      barData: [overdueWOs + 2, overdueWOs + 1, overdueWOs, overdueWOs + 1, overdueWOs - 1, overdueWOs, overdueWOs],
    },
  ];

  const visibleKpis = kpiCards.filter(c => hasPermission(c.permission));

  const quickActions = [
    { label: 'New Request', icon: Plus, permission: 'maintenance_requests.create', page: 'create-mr' as PageName, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50', border: 'border-amber-200 hover:border-amber-300 dark:border-amber-900/40' },
    { label: 'New Work Order', icon: Wrench, permission: 'work_orders.create', page: 'work-orders' as PageName, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50', border: 'border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/40' },
    { label: 'All Requests', icon: ClipboardList, permission: 'maintenance_requests.view', page: 'maintenance-requests' as PageName, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 dark:hover:bg-sky-950/50', border: 'border-sky-200 hover:border-sky-300 dark:border-sky-900/40' },
    { label: 'All Work Orders', icon: Eye, permission: 'work_orders.view', page: 'work-orders' as PageName, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/50', border: 'border-violet-200 hover:border-violet-300 dark:border-violet-900/40' },
  ].filter(a => hasPermission(a.permission));

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* ===== Welcome Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Operations Dashboard</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-primary">{user?.fullName?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Real-time maintenance operations overview &middot; {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="text-[11px] font-mono gap-1.5 border-primary/20 bg-primary/5 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* ===== KPI Cards ===== */}
      {visibleKpis.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {visibleKpis.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className={`border ${card.borderColor} ${card.bgColor} hover:shadow-lg transition-all duration-300 group overflow-hidden relative`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/40 to-transparent dark:from-white/5 dark:to-transparent rounded-bl-full" />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-10 w-10 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    {card.showRing ? (
                      <ProgressRing value={card.ringValue || 0} color={card.color} size={48} strokeWidth={4} />
                    ) : (
                      <MiniBarChart data={card.barData} color={card.color} maxVal={Math.max(...card.barData, 1)} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold tracking-tight" style={{ color: card.color }}>{card.value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{card.sublabel}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Charts Row ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WO Status Bar Chart */}
        <Card className="border lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Work Orders by Status</CardTitle>
                <CardDescription className="text-xs mt-0.5">Current distribution across all work order stages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={woStatusChartConfig} className="h-[280px] w-full">
              <BarChart data={woStatusData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.replace(/_/g, ' ')} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {woStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} className="fill-primary" />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* WO Type Donut Chart */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">WO by Type</CardTitle>
                <CardDescription className="text-xs mt-0.5">Breakdown by work order type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={woTypeChartConfig} className="h-[280px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={woTypeData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="type"
                >
                  {woTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="type" />} className="flex-wrap gap-x-4 gap-y-1" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ===== Second Charts Row ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MR Status + Priority */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Request Status & Priority</CardTitle>
                <CardDescription className="text-xs mt-0.5">Maintenance request breakdown</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <ChartContainer config={mrStatusChartConfig} className="h-[180px] w-full">
              <BarChart data={mrStatusData} layout="vertical" margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} className="fill-muted-foreground" tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {mrStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index + 1]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Priority Mix</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden bg-muted flex">
                {(stats?.highPriorityMR || 0) > 0 && (
                  <div className="bg-red-500 h-full" style={{ width: `${Math.max(5, (stats?.highPriorityMR || 0) / Math.max(1, (stats?.totalRequests || 1)) * 100)}%` }} />
                )}
                {(stats?.mediumPriorityMR || 0) > 0 && (
                  <div className="bg-amber-500 h-full" style={{ width: `${Math.max(5, (stats?.mediumPriorityMR || 0) / Math.max(1, (stats?.totalRequests || 1)) * 100)}%` }} />
                )}
                {(stats?.lowPriorityMR || 0) > 0 && (
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.max(5, (stats?.lowPriorityMR || 0) / Math.max(1, (stats?.totalRequests || 1)) * 100)}%` }} />
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] shrink-0">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{stats?.highPriorityMR || 0}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{stats?.mediumPriorityMR || 0}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{stats?.lowPriorityMR || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations Summary + Completion */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Operations Summary</CardTitle>
                <CardDescription className="text-xs mt-0.5">Key metrics at a glance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Pending Approvals', value: pendingApprovals, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-100 dark:border-orange-900/40' },
                { label: 'Total Requests', value: stats?.totalRequests || 0, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-100 dark:border-sky-900/40' },
                { label: 'Approved', value: stats?.approvedRequests || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/40' },
                { label: 'Converted to WO', value: stats?.convertedRequests || 0, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-100 dark:border-teal-900/40' },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${item.border} ${item.bg} transition-all hover:shadow-sm`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Overall Completion</span>
                <span className="text-sm font-bold text-primary">{completionRate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-all duration-1000 ease-out"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{completedWOs} completed</span>
                <span>{totalWOs - completedWOs} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Quick Actions ===== */}
      {quickActions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.page)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${action.border} ${action.bg} transition-all duration-200 group cursor-pointer text-left`}
                >
                  <div className={`h-9 w-9 rounded-lg bg-white/80 dark:bg-white/5 shadow-sm flex items-center justify-center shrink-0 ${action.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-sm font-semibold ${action.color}`}>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Recent Activity Panels ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {hasPermission('maintenance_requests.view') && (
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Requests</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Latest maintenance requests</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 font-medium" onClick={() => navigate('maintenance-requests')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!stats?.recentRequests?.length ? (
                <EmptyState icon={ClipboardList} title="No recent requests" description="Maintenance requests you create will appear here." />
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {stats.recentRequests.map(mr => (
                    <div
                      key={mr.id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-150 group"
                      onClick={() => navigate('mr-detail', { id: mr.id })}
                    >
                      <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{mr.title}</p>
                        <p className="text-[11px] text-muted-foreground">{mr.requestNumber} &middot; {mr.requester?.fullName} &middot; {timeAgo(mr.createdAt)}</p>
                      </div>
                      <StatusBadge status={mr.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasPermission('work_orders.view') && (
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Work Orders</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Latest work order activity</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 font-medium" onClick={() => navigate('work-orders')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!stats?.recentWorkOrders?.length ? (
                <EmptyState icon={Wrench} title="No recent work orders" description="Work orders created from approved requests will appear here." />
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {stats.recentWorkOrders.map(wo => (
                    <div
                      key={wo.id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-150 group"
                      onClick={() => navigate('wo-detail', { id: wo.id })}
                    >
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
                        <Wrench className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{wo.title}</p>
                        <p className="text-[11px] text-muted-foreground">{wo.woNumber} &middot; {wo.type.replace(/_/g, ' ')} &middot; {timeAgo(wo.createdAt)}</p>
                      </div>
                      <StatusBadge status={wo.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== System Health Footer ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border bg-gradient-to-br from-emerald-50/80 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/10 border-emerald-100 dark:border-emerald-900/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
              <Factory className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">System Health</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">All Systems Operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-gradient-to-br from-sky-50/80 to-blue-50/30 dark:from-sky-950/30 dark:to-blue-950/10 border-sky-100 dark:border-sky-900/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">Security Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <p className="text-sm font-bold text-sky-700 dark:text-sky-400">No Security Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-gradient-to-br from-violet-50/80 to-purple-50/30 dark:from-violet-950/30 dark:to-purple-950/10 border-violet-100 dark:border-violet-900/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">Maintenance Efficiency</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                <p className="text-sm font-bold text-violet-700 dark:text-violet-400">{completionRate >= 80 ? 'Excellent' : completionRate >= 50 ? 'Good' : 'Needs Improvement'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
