'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';
import type { MaintenanceRequest, WorkOrder, WOTeamMember, PersonalTool, User, PageName } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect, AsyncSearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList, Wrench, Plus, Search, ArrowLeft, CheckCircle2, XCircle,
  Clock, AlertTriangle, RefreshCw, Play, Pause, Check, Lock, Eye, Pencil,
  Trash2, MessageSquare, Users, MoreHorizontal, BarChart3, Target,
  TrendingUp, TrendingDown, Calendar, AlertCircle, Crosshair, TriangleAlert, Ruler,
  Wrench as WrenchIcon, Settings, Zap, Activity, Send, CircleDot, X,
  Loader2,
  Building2,
  ArrowRightLeft, FileText, CheckSquare, Filter, ArrowUpDown, BookOpen, ShieldAlert,
  PieChart as PieChartIcon, Gauge, ListChecks, Shield, ShieldCheck, HardHat, MapPin,
  Crown, Timer, Hourglass, UserPlus, Workflow, ChevronRight, ExternalLink, Hammer,
  PackageSearch, ClipboardCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { EmptyState, StatusBadge, PriorityBadge, getInitials, formatDate, formatDateTime, timeAgo, LoadingSkeleton } from '@/components/shared/helpers';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import { MobileStepperSheet } from '@/components/shared/MobileStepperSheet';
import { useIsMobile } from '@/components/shared/ResponsiveDialog';
import { FileUpload } from '@/components/shared/FileUpload';
import { WorkerAssignmentSelector } from '@/components/shared/WorkerAssignmentSelector';
// WorkerAssignmentPicker still used by WO Detail page
import { WorkerAssignmentPicker, type SelectedWorker } from '@/components/shared/WorkerAssignmentPicker';
export function MaintenanceRequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasPermission } = useAuthStore();

  const filteredRequests = useMemo(() => {
    if (!searchText.trim()) return requests;
    const q = searchText.toLowerCase();
    return requests.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.requestNumber.toLowerCase().includes(q) ||
      (r.assetName || (r as any).asset?.name || '').toLowerCase().includes(q) ||
      (r.requester?.fullName || '').toLowerCase().includes(q)
    );
  }, [requests, searchText]);

  const statusCounts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    converted: requests.filter(r => r.status === 'converted').length,
  }), [requests]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterPriority !== 'all') params.set('priority', filterPriority);
    api.get<MaintenanceRequest[]>(`/api/maintenance-requests?${params}`).then(res => {
      if (active) {
        if (res.success && res.data) setRequests(res.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [filterStatus, filterPriority, refreshKey]);

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  if (detailId) {
    return <MRDetailPage id={detailId} onBack={() => setDetailId(null)} onUpdate={handleRefresh} />;
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track all maintenance requests</p>
        </div>
        {hasPermission('maintenance_requests.create') && (
          <>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Request</Button>
          <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen} title="Create Maintenance Request" footer={<Button type="submit" form="create-mr-form" className="bg-emerald-600 hover:bg-emerald-700 text-white">Submit Request</Button>}>
            <CreateMRForm onSuccess={() => { setCreateOpen(false); handleRefresh(); }} />
          </ResponsiveDialog>
          </>
        )}
      </div>

      {/* Stats Bar - Pill style */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Total', value: statusCounts.total, className: 'bg-slate-100 text-slate-700 border-slate-200' },
          { label: 'Pending', value: statusCounts.pending, className: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Approved', value: statusCounts.approved, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Rejected', value: statusCounts.rejected, className: 'bg-red-50 text-red-700 border-red-200' },
          { label: 'Converted', value: statusCounts.converted, className: 'bg-teal-50 text-teal-700 border-teal-200' },
        ].map(s => (
          <div key={s.label} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${s.className} transition-colors`}>
            {s.value} {s.label}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingSkeleton /> : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Requested By</TableHead>
                <TableHead className="hidden xl:table-cell">Asset</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-48">
                  <EmptyState icon={ClipboardList} title="No maintenance requests found" description="Try adjusting your filters or create a new request." />
                </TableCell></TableRow>
              ) : filteredRequests.map(mr => (
                <TableRow key={mr.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(mr.id)}>
                  <TableCell className="font-mono text-xs">{mr.requestNumber}</TableCell>
                  <TableCell className="font-medium max-w-[250px] truncate">{mr.title}</TableCell>
                  <TableCell className="hidden md:table-cell"><PriorityBadge priority={mr.priority} /></TableCell>
                  <TableCell><StatusBadge status={mr.status} /></TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">{mr.requester?.fullName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate hidden xl:table-cell">{(mr as any).asset?.name || mr.assetName || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(mr.createdAt)}</TableCell>
                  <TableCell>
                    {mr.machineDownStatus && <Badge variant="destructive" className="text-[10px]">DOWN</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// CREATE MR FORM
// ============================================================================

export function CreateMRForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assetId, setAssetId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [category, setCategory] = useState('');
  const [machineDown, setMachineDown] = useState(false);
  const [itemType, setItemType] = useState<'machine' | 'manual'>('machine');
  const [manualAssetName, setManualAssetName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload: any = { title, description, priority, departmentId, category, machineDownStatus: machineDown, itemType, location };
    if (itemType === 'machine' && assetId) payload.assetId = assetId;
    if (itemType === 'manual' && manualAssetName) payload.assetName = manualAssetName;
    const res = await api.post('/api/maintenance-requests', payload);
    if (res.success) {
      toast.success('Maintenance request created');
      onSuccess();
    } else {
      toast.error(res.error || 'Failed to create request');
    }
    setLoading(false);
  };

  return (
    <form id="create-mr-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the issue" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of the issue, including any relevant observations" rows={3} />
      </div>

      {/* Item Type Toggle — matches source: Select Machine / Enter Manually */}
      <div className="space-y-2">
        <Label>Item Type *</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setItemType('machine')}
            className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              itemType === 'machine'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-1.5" />
            Select Machine
          </button>
          <button
            type="button"
            onClick={() => setItemType('manual')}
            className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              itemType === 'manual'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            <Pencil className="h-4 w-4 inline mr-1.5" />
            Enter Manually
          </button>
        </div>
      </div>

      {itemType === 'machine' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Machine / Asset *</Label>
            <AsyncSearchableSelect
              value={assetId}
              onValueChange={setAssetId}
              fetchOptions={async () => {
                const res = await api.get('/api/assets');
                if (res.success && res.data) {
                  return (Array.isArray(res.data) ? res.data : []).map((a: any) => ({
                    value: a.id,
                    label: `${a.name} [${a.assetTag}]`,
                    badge: a.status,
                  }));
                }
                return [];
              }}
              placeholder="Select machine..."
              searchPlaceholder="Search machines by name or tag..."
            />
          </div>
          <div className="space-y-2">
            <Label>Machine Down?</Label>
            <Select value={machineDown ? 'Yes' : 'No'} onValueChange={v => setMachineDown(v === 'Yes')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No — Machine Running</SelectItem>
                <SelectItem value="Yes">Yes — Machine Down</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Asset Name *</Label>
            <Input value={manualAssetName} onChange={e => setManualAssetName(e.target.value)} placeholder="Enter asset/item name" required />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location of the item" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Department</Label>
          <AsyncSearchableSelect
            value={departmentId}
            onValueChange={setDepartmentId}
            fetchOptions={async () => {
              const res = await api.get('/api/departments');
              if (res.success && res.data) {
                return (Array.isArray(res.data) ? res.data : []).map((d: any) => ({
                  value: d.id,
                  label: d.name,
                }));
              }
              return [];
            }}
            placeholder="Select department..."
            searchPlaceholder="Search departments..."
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mechanical">Mechanical</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="hydraulic">Hydraulic</SelectItem>
              <SelectItem value="pneumatic">Pneumatic</SelectItem>
              <SelectItem value="instrumentation">Instrumentation</SelectItem>
              <SelectItem value="structural">Structural</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {itemType === 'machine' && !machineDown && (
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location of the machine" />
          </div>
        )}
      </div>

    </form>
  );
}

// ============================================================================
// MR DETAIL PAGE — Enhanced with Workflow Timeline, SLA Timer, Assign Planner, Convert to WO
// ============================================================================

// --- SLA Timer Sub-component ---
function SLATimerDisplay({ slaHours, slaStartedAt, status }: { slaHours?: number; slaStartedAt?: string; status: string }) {
  const [remaining, setRemaining] = useState<{ hours: number; minutes: number; seconds: number; breached: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!slaHours || !slaStartedAt || status === 'converted' || status === 'rejected') {
      setRemaining(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const calc = () => {
      const deadline = new Date(slaStartedAt).getTime() + slaHours * 3600 * 1000;
      const now = Date.now();
      const diff = deadline - now;
      if (diff <= 0) {
        setRemaining({ hours: 0, minutes: 0, seconds: 0, breached: true });
      } else {
        setRemaining({ hours: Math.floor(diff / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), breached: false });
      }
    };
    calc();
    timerRef.current = setInterval(calc, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slaHours, slaStartedAt, status]);

  if (!remaining) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Card className={`border-0 shadow-sm ${remaining.breached ? 'border-l-4 border-l-red-500 bg-red-50/50' : 'border-l-4 border-l-amber-500 bg-amber-50/50'}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${remaining.breached ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          <Hourglass className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SLA Timer</p>
          <p className={`text-lg font-bold font-mono ${remaining.breached ? 'text-red-600' : 'text-amber-700'}`}>
            {remaining.breached ? 'BREACHED' : `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{remaining.breached ? 'Time exceeded' : 'Time remaining'}</p>
          <p className="text-xs text-muted-foreground">{slaHours}h SLA window</p>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Workflow Timeline Sub-component ---
function MRWorkflowTimeline({ mr }: { mr: MaintenanceRequest }) {
  const steps = [
    { key: 'submitted', label: 'Submitted', icon: <Send className="h-4 w-4" />, info: mr.requester?.fullName, time: mr.createdAt, isComplete: true },
    { key: 'supervisor_review', label: 'Supervisor Review', icon: <ClipboardCheck className="h-4 w-4" />, info: mr.supervisor?.fullName, isComplete: ['supervisor_review', 'approved', 'assigned_to_planner', 'work_order_created'].includes(mr.workflowStatus) || mr.status === 'converted', isCurrent: mr.status === 'pending' && !mr.workflowStatus },
    { key: 'approved', label: 'Approved', icon: <CheckCircle2 className="h-4 w-4" />, info: mr.approver?.fullName || mr.supervisor?.fullName, time: mr.approvedAt, isComplete: ['approved', 'assigned_to_planner', 'work_order_created'].includes(mr.workflowStatus) || mr.status === 'converted', isCurrent: mr.status === 'approved' && !mr.assignedPlannerId },
    { key: 'assigned_to_planner', label: 'Assigned to Planner', icon: <UserPlus className="h-4 w-4" />, info: mr.assignedPlanner?.fullName, isComplete: ['assigned_to_planner', 'work_order_created'].includes(mr.workflowStatus) || mr.status === 'converted', isCurrent: mr.status === 'approved' && !!mr.assignedPlannerId },
    { key: 'work_order_created', label: 'Work Order Created', icon: <ClipboardList className="h-4 w-4" />, info: mr.workOrder?.woNumber, isComplete: mr.status === 'converted', isCurrent: false },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Workflow className="h-4 w-4 text-emerald-600" />Workflow Progress</CardTitle></CardHeader>
      <CardContent>
        <div className="relative">
          {steps.map((step, i) => {
            const dotColor = step.isComplete ? 'bg-emerald-500 text-emerald-500 ring-emerald-100' : step.isCurrent ? 'bg-amber-500 text-amber-500 ring-amber-100' : 'bg-slate-300 text-slate-300 ring-slate-100';
            const lineColor = step.isComplete ? 'bg-emerald-300' : 'bg-slate-200';
            return (
              <div key={step.key} className="flex items-start gap-4 relative">
                {/* Connector Line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[19px] top-[40px] w-0.5 h-[calc(100%-8px)] z-0" style={{ backgroundColor: lineColor.replace('bg-', '#') === lineColor ? undefined : undefined }}>
                    <div className={`w-0.5 h-full ${lineColor}`} />
                  </div>
                )}
                {/* Dot */}
                <div className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 ring-4 ${dotColor} ${step.isCurrent ? 'animate-pulse' : ''}`}>
                  <div className={step.isComplete ? 'text-white' : step.isCurrent ? 'text-white' : 'text-slate-400'}>
                    {step.isComplete ? <Check className="h-4 w-4 text-white" /> : step.icon}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 pb-6 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${step.isComplete ? 'text-emerald-700' : step.isCurrent ? 'text-amber-700' : 'text-slate-400'}`}>{step.label}</p>
                    {step.isCurrent && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 animate-pulse">Current</Badge>}
                    {step.isComplete && !step.isCurrent && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Done</Badge>}
                  </div>
                  {step.info && <p className="text-xs text-muted-foreground mt-0.5">{step.info}</p>}
                  {step.time && <p className="text-[10px] text-muted-foreground">{formatDateTime(step.time)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function MRDetailPage({ id, onBack, onUpdate }: { id: string; onBack: () => void; onUpdate: () => void }) {
  const [mr, setMr] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const { hasPermission, user } = useAuthStore();
  const isMobile = useIsMobile();

  // Assign to Planner dialog
  const [assignPlannerOpen, setAssignPlannerOpen] = useState(false);
  const [plannerId, setPlannerId] = useState('');
  const [plannerType, setPlannerType] = useState('engineering');
  const [plannerNotes, setPlannerNotes] = useState('');
  const [plannerLoading, setPlannerLoading] = useState(false);

  // Enhanced Convert to WO dialog
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({
    // Section 2: WO Details
    workOrderType: 'corrective' as string,
    priority: 'medium' as string,
    tradeActivity: 'mechanical' as string,
    technicalDescription: '',
    scheduledDate: '',
    deliveryDate: '',
    estimatedHours: '',
    estimatedHoursDisplay: '',
    // Section 3: Resource Assignment
    departmentIds: [] as string[],
    assignType: 'technician' as 'technician' | 'supervisor',
    selectedWorkerIds: [] as string[],
    teamLeaderId: '',
    requiredParts: [] as string[],
    requiredTools: [] as string[],
    // Section 4: Safety
    safetyNotes: '',
    ppeRequired: '',
    notes: '',
  });
  const [convertLoading, setConvertLoading] = useState(false);
  // Data for dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [toolsData, setToolsData] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    api.get<MaintenanceRequest>(`/api/maintenance-requests/${id}`).then(res => {
      if (active) {
        if (res.success && res.data) setMr(res.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [id]);

  const handleRefresh = useCallback(() => {
    api.get<MaintenanceRequest>(`/api/maintenance-requests/${id}`).then(res => {
      if (res.success && res.data) setMr(res.data);
    });
  }, [id]);

  const handleAction = async (action: string, notes?: string) => {
    setActionLoading(true);
    let res;
    if (action === 'approve') {
      res = await api.post(`/api/maintenance-requests/${id}/approve`, { notes: notes || '' });
    } else if (action === 'reject') {
      res = await api.post(`/api/maintenance-requests/${id}/reject`, { reason: notes || '' });
    } else {
      res = await api.put(`/api/maintenance-requests/${id}`, { action, notes: notes });
    }
    if (res.success) {
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      handleRefresh();
      onUpdate();
      setRejectDialogOpen(false);
      setApproveDialogOpen(false);
      setRejectNotes('');
    } else {
      toast.error(res.error || 'Action failed');
    }
    setActionLoading(false);
  };

  const handleAssignPlanner = async () => {
    if (!plannerId) { toast.error('Please select a planner'); return; }
    setPlannerLoading(true);
    const res = await api.post(`/api/maintenance-requests/${id}/assign-planner`, { plannerId, plannerType, notes: plannerNotes });
    if (res.success) {
      toast.success('Planner assigned successfully');
      setAssignPlannerOpen(false);
      setPlannerId('');
      setPlannerNotes('');
      handleRefresh();
    } else {
      toast.error(res.error || 'Failed to assign planner');
    }
    setPlannerLoading(false);
  };

  const openConvertDialog = async () => {
    if (!mr) return;
    setConvertForm({
      workOrderType: 'corrective',
      priority: mr.priority === 'urgent' ? 'high' : mr.priority,
      tradeActivity: 'mechanical',
      technicalDescription: mr.title,
      scheduledDate: '',
      deliveryDate: '',
      estimatedHours: '',
      estimatedHoursDisplay: '',
      departmentIds: mr.departmentId ? [mr.departmentId] : [],
      assignType: 'technician',
      selectedWorkerIds: [],
      teamLeaderId: '',
      requiredParts: [],
      requiredTools: [],
      safetyNotes: '',
      ppeRequired: '',
      notes: '',
    });
    // Load dropdown data
    try {
      const [deptsRes, invRes, toolsRes, usersRes] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/inventory'),
        api.get('/api/tools'),
        api.get('/api/users'),
      ]);
      if (deptsRes.success && deptsRes.data) setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
      if (invRes.success && invRes.data) setInventoryItems(Array.isArray(invRes.data) ? invRes.data : []);
      if (toolsRes.success && toolsRes.data) setToolsData(Array.isArray(toolsRes.data) ? toolsRes.data : []);
      if (usersRes.success && usersRes.data) {
        const users = Array.isArray(usersRes.data) ? usersRes.data : [];
        const map: Record<string, string> = {};
        users.forEach((u: any) => { map[u.id] = `${u.fullName} (${u.username})`; });
        setUsersMap(map);
      }
    } catch (_e) {
      // Silently handle - dropdowns will just be empty
    }
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!mr) return;
    setConvertLoading(true);
    const payload: any = {
      title: mr.title,
      priority: convertForm.priority,
      workOrderType: convertForm.workOrderType,
      tradeActivity: convertForm.tradeActivity,
      technicalDescription: convertForm.technicalDescription || undefined,
      assignmentType: convertForm.assignType === 'technician' ? 'direct' : 'via_supervisor',
      estimatedHours: convertForm.estimatedHours ? parseFloat(convertForm.estimatedHours) : undefined,
      plannedStart: convertForm.scheduledDate || undefined,
      deliveryDateRequired: convertForm.deliveryDate || undefined,
      safetyNotes: convertForm.safetyNotes || undefined,
      ppeRequired: convertForm.ppeRequired || undefined,
      notes: convertForm.notes || undefined,
      requiredParts: convertForm.requiredParts.length > 0 ? convertForm.requiredParts : undefined,
      requiredTools: convertForm.requiredTools.length > 0 ? convertForm.requiredTools : undefined,
    };
    // Build team members from selected workers
    if (convertForm.selectedWorkerIds.length > 0) {
      const teamMembers = convertForm.selectedWorkerIds.map(workerId => ({
        userId: workerId,
        role: workerId === convertForm.teamLeaderId ? 'team_leader' : 'assistant',
      }));
      payload.teamMembers = teamMembers;
      payload.assignedTo = convertForm.selectedWorkerIds[0];
      payload.teamLeaderId = convertForm.teamLeaderId || null;
    }
    if (convertForm.assignType === 'supervisor') {
      if (convertForm.teamLeaderId) {
        payload.assignedSupervisorId = convertForm.teamLeaderId;
      }
    }
    const res = await api.post(`/api/maintenance-requests/${id}/convert`, payload);
    if (res.success) {
      toast.success('Converted to Work Order');
      setConvertOpen(false);
      handleRefresh();
      onUpdate();
    } else {
      toast.error(res.error || 'Conversion failed');
    }
    setConvertLoading(false);
  };

  // Helper: handle estimated hours format conversion ("2:30" → "2.5", "2.5" → "2.5")
  const handleEstHoursChange = (val: string) => {
    let displayVal = val;
    let decimalVal = val;
    if (val.includes(':')) {
      const [h, m] = val.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        decimalVal = String(h + m / 60);
      }
    }
    setConvertForm(f => ({ ...f, estimatedHours: decimalVal, estimatedHoursDisplay: displayVal }));
  };

  // Helper: add/remove items from multi-select arrays
  const addToArray = (field: 'departmentIds' | 'requiredParts' | 'requiredTools', id: string) => {
    setConvertForm(f => {
      const arr = [...f[field]] as string[];
      if (!arr.includes(id)) arr.push(id);
      return { ...f, [field]: arr };
    });
  };

  const removeFromArray = (field: 'departmentIds' | 'requiredParts' | 'requiredTools', id: string) => {
    setConvertForm(f => ({
      ...f,
      [field]: (f[field] as string[]).filter(x => x !== id),
    }));
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    const res = await api.post(`/api/maintenance-requests/${id}/comments`, { content: comment });
    if (res.success) {
      toast.success('Comment added');
      setComment('');
      handleRefresh();
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (!mr) return <div className="p-6">Request not found</div>;

  const canAssignPlanner = mr.status === 'approved' && hasPermission('maintenance_requests.assign_planner') && !mr.assignedPlannerId;
  const canConvert = mr.status === 'approved' && hasPermission('maintenance_requests.convert_to_wo') && (mr.assignedPlannerId === user?.id || !mr.assignedPlannerId);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{mr.requestNumber}</span>
            <StatusBadge status={mr.status} />
            <PriorityBadge priority={mr.priority} />
            {mr.machineDownStatus && <Badge variant="destructive" className="text-[10px]">MACHINE DOWN</Badge>}
          </div>
          <h1 className="text-xl font-bold mt-1">{mr.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {mr.status === 'pending' && hasPermission('maintenance_requests.reject') && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setRejectDialogOpen(true)}>
              <XCircle className="h-4 w-4 mr-1" />Reject
            </Button>
          )}
          {mr.status === 'pending' && hasPermission('maintenance_requests.approve') && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={() => setApproveDialogOpen(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Approve
            </Button>
          )}
          {canAssignPlanner && (
            <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => setAssignPlannerOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />Assign to Planner
            </Button>
          )}
          {canConvert && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={openConvertDialog}>
              <RefreshCw className="h-4 w-4 mr-1" />Convert to WO
            </Button>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <ResponsiveDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen} title="Reject Request" description="Please provide a reason for rejection." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button><Button variant="destructive" disabled={actionLoading} onClick={() => handleAction('reject', rejectNotes)}>{actionLoading ? 'Rejecting...' : 'Reject Request'}</Button></div>}>
        <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Reason for rejection..." rows={3} />
      </ResponsiveDialog>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title="Approve Maintenance Request"
        description="Are you sure you want to approve this maintenance request? This will allow it to be assigned to a planner for work order creation."
        confirmLabel="Yes, Approve"
        loading={actionLoading}
        onConfirm={() => handleAction('approve', '')}
      />

      {/* Assign to Planner Dialog */}
      <ResponsiveDialog open={assignPlannerOpen} onOpenChange={setAssignPlannerOpen} title="Assign to Planner" description="Select a planner type and planner to handle this maintenance request." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setAssignPlannerOpen(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700 text-white" disabled={plannerLoading || !plannerId} onClick={handleAssignPlanner}>{plannerLoading ? 'Assigning...' : 'Assign Planner'}</Button></div>}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Planner Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlannerType('engineering')}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    plannerType === 'engineering'
                      ? 'border-violet-600 bg-violet-50 text-violet-800'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Settings className="h-4 w-4 inline mr-1.5" />
                  Engineering Planner
                </button>
                <button
                  type="button"
                  onClick={() => setPlannerType('production')}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    plannerType === 'production'
                      ? 'border-violet-600 bg-violet-50 text-violet-800'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Target className="h-4 w-4 inline mr-1.5" />
                  Production Planner
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select Planner *</Label>
              <AsyncSearchableSelect
                value={plannerId}
                onValueChange={setPlannerId}
                fetchOptions={async () => {
                  const params = new URLSearchParams();
                  params.set('role', 'planner');
                  const res = await api.get(`/api/users?${params.toString()}`);
                  if (res.success && res.data) {
                    const users = Array.isArray(res.data) ? res.data : [];
                    return users.map((u: any) => ({
                      value: u.id,
                      label: `${u.fullName} (${u.username})`,
                    }));
                  }
                  return [];
                }}
                placeholder="Search for a planner..."
                searchPlaceholder="Search planners by name..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={plannerNotes} onChange={e => setPlannerNotes(e.target.value)} placeholder="Any notes for the planner..." rows={2} />
            </div>
          </div>
      </ResponsiveDialog>

      {/* Enhanced Convert to WO Dialog — Mobile Stepper / Desktop 4-Section Layout */}
      {!isMobile ? (
      <ResponsiveDialog open={convertOpen} onOpenChange={setConvertOpen} large desktopMaxWidth="sm:max-w-4xl" title={<span className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-emerald-600" />Convert to Work Order</span>} description="Create a comprehensive work order from this maintenance request." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={convertLoading} onClick={handleConvert}>{convertLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Converting...</> : <><RefreshCw className="h-4 w-4 mr-1" />Create Work Order</>}</Button></div>}>
          <div className="grid gap-5 py-2">

            {/* ============================================================ */}
            {/* SECTION 1: Request Information (Read-only, blue background) */}
            {/* ============================================================ */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4" />Request Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-[11px] text-blue-600 font-medium uppercase">Request Number</p>
                  <p className="text-sm font-semibold">{mr.requestNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] text-blue-600 font-medium uppercase">Machine / Asset</p>
                  <p className="text-sm font-semibold">{mr.asset?.name || mr.assetName || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-blue-600 font-medium uppercase">Location</p>
                  <p className="text-sm font-semibold">{mr.location || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-blue-600 font-medium uppercase">Breakdown</p>
                  <Badge variant={mr.machineDownStatus ? 'destructive' : 'secondary'} className="text-xs">
                    {mr.machineDownStatus ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="text-[11px] text-blue-600 font-medium uppercase">Problem Description</p>
                  <p className="text-sm text-blue-900 mt-0.5 whitespace-pre-wrap bg-white/60 rounded-lg p-3 border border-blue-100 max-h-28 overflow-y-auto">{mr.description || 'No description provided.'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-blue-600 font-medium uppercase">Requested By</p>
                  <p className="text-sm font-semibold">{mr.requester?.fullName || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-blue-600 font-medium uppercase">Date Sent</p>
                  <p className="text-sm font-semibold">{formatDateTime(mr.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 2: Work Order Details (purple background) */}
            {/* ============================================================ */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                <ClipboardCheck className="h-4 w-4" />Work Order Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Work Order Type</Label>
                  <Select value={convertForm.workOrderType} onValueChange={v => setConvertForm(f => ({ ...f, workOrderType: v }))}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakdown">Breakdown</SelectItem>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select value={convertForm.priority} onValueChange={v => setConvertForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trade Activity</Label>
                  <Select value={convertForm.tradeActivity} onValueChange={v => setConvertForm(f => ({ ...f, tradeActivity: v }))}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mechanical">Mechanical</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="civil">Civil</SelectItem>
                      <SelectItem value="facility">Facility</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Est. Hours</Label>
                  <Input
                    className="min-h-[44px]"
                    value={convertForm.estimatedHoursDisplay || convertForm.estimatedHours}
                    onChange={e => handleEstHoursChange(e.target.value)}
                    placeholder="2.5 or 2:30"
                  />
                  <p className="text-[10px] text-muted-foreground">Supports 2.5 or 2:30 format</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                  <Label className="text-xs">Technical Description</Label>
                  <Textarea
                    value={convertForm.technicalDescription}
                    onChange={e => setConvertForm(f => ({ ...f, technicalDescription: e.target.value }))}
                    placeholder="Detailed technical description of the work to be performed..."
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Scheduled Date</Label>
                  <Input
                    className="min-h-[44px]"
                    type="datetime-local"
                    value={convertForm.scheduledDate}
                    onChange={e => setConvertForm(f => ({ ...f, scheduledDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Date</Label>
                  <Input
                    className="min-h-[44px]"
                    type="date"
                    value={convertForm.deliveryDate}
                    onChange={e => setConvertForm(f => ({ ...f, deliveryDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 3: Resource Assignment (green background) */}
            {/* ============================================================ */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
              <div className="grid gap-4">
                <WorkerAssignmentSelector
                  selectedWorkerIds={convertForm.selectedWorkerIds}
                  teamLeaderId={convertForm.teamLeaderId}
                  onSelectedWorkersChange={(ids) => setConvertForm(f => ({ ...f, selectedWorkerIds: ids }))}
                  onTeamLeaderChange={(id) => setConvertForm(f => ({ ...f, teamLeaderId: id }))}
                  departments={departments.map(d => ({ id: d.id, name: d.name, code: d.code }))}
                  selectedDepartmentIds={convertForm.departmentIds}
                  onDepartmentsChange={(ids) => setConvertForm(f => ({ ...f, departmentIds: ids }))}
                  assignType={convertForm.assignType}
                  onAssignTypeChange={(type) => setConvertForm(f => ({ ...f, assignType: type }))}
                  label="Resource Assignment"
                />

                {/* Required Spare Parts */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><PackageSearch className="h-3.5 w-3.5" />Required Spare Parts</Label>
                  <div className="flex flex-wrap gap-1.5 min-h-[44px] p-2 border rounded-md bg-white">
                    {convertForm.requiredParts.length === 0 && <span className="text-sm text-muted-foreground">Select spare parts from inventory...</span>}
                    {convertForm.requiredParts.map(partId => {
                      const item = inventoryItems.find(i => i.id === partId);
                      return item ? (
                        <Badge key={partId} variant="secondary" className="gap-1">
                          {item.itemName || item.name}
                          <button onClick={() => removeFromArray('requiredParts', partId)} className="ml-0.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-red-600"><X className="h-3 w-3" /></button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <Select onValueChange={v => addToArray('requiredParts', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Add spare part..." /></SelectTrigger>
                    <SelectContent>
                      {inventoryItems.filter(i => !convertForm.requiredParts.includes(i.id)).slice(0, 50).map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.itemName || i.name}{i.itemCode ? ` [${i.itemCode}]` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Required Tools */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Hammer className="h-3.5 w-3.5" />Required Tools</Label>
                  <div className="flex flex-wrap gap-1.5 min-h-[44px] p-2 border rounded-md bg-white">
                    {convertForm.requiredTools.length === 0 && <span className="text-sm text-muted-foreground">Select tools...</span>}
                    {convertForm.requiredTools.map(toolId => {
                      const tool = toolsData.find(t => t.id === toolId);
                      return tool ? (
                        <Badge key={toolId} variant="secondary" className="gap-1">
                          {tool.toolName || tool.name}
                          <button onClick={() => removeFromArray('requiredTools', toolId)} className="ml-0.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-red-600"><X className="h-3 w-3" /></button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <Select onValueChange={v => addToArray('requiredTools', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Add tool..." /></SelectTrigger>
                    <SelectContent>
                      {toolsData.filter(t => !convertForm.requiredTools.includes(t.id)).slice(0, 50).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.toolName || t.name}{t.toolCode ? ` [${t.toolCode}]` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 4: Safety Notes (amber background) */}
            {/* ============================================================ */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                <ShieldAlert className="h-4 w-4" />Safety Notes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Safety Notes</Label>
                  <Textarea
                    value={convertForm.safetyNotes}
                    onChange={e => setConvertForm(f => ({ ...f, safetyNotes: e.target.value }))}
                    placeholder="Any safety hazards, precautions, or lockout/tagout requirements..."
                    rows={3}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><HardHat className="h-3.5 w-3.5" />PPE Required</Label>
                  <Input
                    className="min-h-[44px]"
                    value={convertForm.ppeRequired}
                    onChange={e => setConvertForm(f => ({ ...f, ppeRequired: e.target.value }))}
                    placeholder="e.g. Safety glasses, gloves, helmet, hearing protection"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">General Notes</Label>
                  <Textarea
                    value={convertForm.notes}
                    onChange={e => setConvertForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional notes or special instructions..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

          </div>
      </ResponsiveDialog>
      ) : (
      /* ==================== MOBILE: Stepper bottom sheet ==================== */
      <MobileStepperSheet
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert to Work Order"
        description="Create a work order from this maintenance request."
        steps={[
          { key: 'info', label: 'Request', icon: FileText },
          { key: 'details', label: 'Details', icon: ClipboardCheck },
          { key: 'resources', label: 'Resources', icon: Users },
          { key: 'safety', label: 'Safety', icon: ShieldAlert },
        ]}
        actionLabel="Create Work Order"
        actionLoading={convertLoading}
        onAction={handleConvert}
      >
        {(stepKey) => stepKey === 'info' ? (
          /* === MOBILE STEP 1: Request Info — compact card layout === */
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-blue-500 tracking-wider">Request #</p>
                  <p className="text-sm font-bold text-blue-900 mt-0.5">{mr.requestNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-blue-500 tracking-wider">Machine</p>
                  <p className="text-sm font-bold text-blue-900 mt-0.5 truncate">{mr.asset?.name || mr.assetName || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-blue-500 tracking-wider">Location</p>
                  <p className="text-sm font-bold text-blue-900 mt-0.5">{mr.location || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-blue-500 tracking-wider">Breakdown</p>
                  <Badge variant={mr.machineDownStatus ? 'destructive' : 'secondary'} className="text-xs">
                    {mr.machineDownStatus ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-blue-500 tracking-wider mb-1.5">Problem Description</p>
              <div className="bg-muted/50 rounded-xl p-3 text-sm text-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                {mr.description || 'No description provided.'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Requested By</p>
                <p className="text-sm font-medium mt-0.5">{mr.requester?.fullName || '-'}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Date Sent</p>
                <p className="text-sm font-medium mt-0.5">{formatDateTime(mr.createdAt)}</p>
              </div>
            </div>
          </div>
        ) : stepKey === 'details' ? (
          /* === MOBILE STEP 2: WO Details — full-width stacked form === */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Work Order Type</Label>
              <Select value={convertForm.workOrderType} onValueChange={v => setConvertForm(f => ({ ...f, workOrderType: v }))}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakdown">Breakdown</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Priority</Label>
                <Select value={convertForm.priority} onValueChange={v => setConvertForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Trade</Label>
                <Select value={convertForm.tradeActivity} onValueChange={v => setConvertForm(f => ({ ...f, tradeActivity: v }))}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mechanical">Mechanical</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="civil">Civil</SelectItem>
                    <SelectItem value="facility">Facility</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Est. Hours</Label>
                <Input
                  className="h-12 rounded-xl"
                  value={convertForm.estimatedHoursDisplay || convertForm.estimatedHours}
                  onChange={e => handleEstHoursChange(e.target.value)}
                  placeholder="2.5 or 2:30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Scheduled</Label>
                <Input
                  className="h-12 rounded-xl"
                  type="datetime-local"
                  value={convertForm.scheduledDate}
                  onChange={e => setConvertForm(f => ({ ...f, scheduledDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Delivery Date</Label>
              <Input
                className="h-12 rounded-xl"
                type="date"
                value={convertForm.deliveryDate}
                onChange={e => setConvertForm(f => ({ ...f, deliveryDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Technical Description</Label>
              <Textarea
                className="rounded-xl min-h-[100px]"
                value={convertForm.technicalDescription}
                onChange={e => setConvertForm(f => ({ ...f, technicalDescription: e.target.value }))}
                placeholder="Detailed technical description..."
                rows={4}
              />
            </div>
          </div>
        ) : stepKey === 'resources' ? (
          /* === MOBILE STEP 3: Resource Assignment === */
          <div className="space-y-4">
            {/* Assign To toggle — segmented control style */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Assign To</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={() => setConvertForm(f => ({ ...f, assignType: 'technician' }))}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    convertForm.assignType === 'technician'
                      ? 'bg-background shadow-sm text-emerald-700'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Wrench className="h-4 w-4" />Technicians
                </button>
                <button
                  type="button"
                  onClick={() => setConvertForm(f => ({ ...f, assignType: 'supervisor' }))}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    convertForm.assignType === 'supervisor'
                      ? 'bg-background shadow-sm text-violet-700'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Shield className="h-4 w-4" />Supervisors
                </button>
              </div>
            </div>

            {/* Worker Assignment Selector — mobile */}
            <WorkerAssignmentSelector
              selectedWorkerIds={convertForm.selectedWorkerIds}
              teamLeaderId={convertForm.teamLeaderId}
              onSelectedWorkersChange={(ids) => setConvertForm(f => ({ ...f, selectedWorkerIds: ids }))}
              onTeamLeaderChange={(id) => setConvertForm(f => ({ ...f, teamLeaderId: id }))}
              departments={departments.map(d => ({ id: d.id, name: d.name, code: d.code }))}
              selectedDepartmentIds={convertForm.departmentIds}
              onDepartmentsChange={(ids) => setConvertForm(f => ({ ...f, departmentIds: ids }))}
              assignType={convertForm.assignType}
              onAssignTypeChange={(type) => setConvertForm(f => ({ ...f, assignType: type }))}
              label="Resource Assignment"
            />

            {/* Parts & Tools in collapsible sections */}
            <Accordion type="multiple" className="space-y-2">
              <AccordionItem value="parts" className="border rounded-xl px-1">
                <AccordionTrigger className="text-xs font-medium py-3 px-2">
                  <span className="flex items-center gap-1.5"><PackageSearch className="h-3.5 w-3.5" />Spare Parts {convertForm.requiredParts.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5">{convertForm.requiredParts.length}</Badge>}</span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3 space-y-2">
                  {convertForm.requiredParts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {convertForm.requiredParts.map(partId => {
                        const item = inventoryItems.find(i => i.id === partId);
                        return item ? (
                          <Badge key={partId} variant="secondary" className="gap-1">
                            {item.itemName || item.name}
                            <button onClick={() => removeFromArray('requiredParts', partId)} className="ml-0.5 h-5 w-5 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600"><X className="h-3 w-3" /></button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <Select onValueChange={v => addToArray('requiredParts', v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="+ Add spare part..." /></SelectTrigger>
                    <SelectContent>
                      {inventoryItems.filter(i => !convertForm.requiredParts.includes(i.id)).slice(0, 50).map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.itemName || i.name}{i.itemCode ? ` [${i.itemCode}]` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tools" className="border rounded-xl px-1">
                <AccordionTrigger className="text-xs font-medium py-3 px-2">
                  <span className="flex items-center gap-1.5"><Hammer className="h-3.5 w-3.5" />Tools {convertForm.requiredTools.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5">{convertForm.requiredTools.length}</Badge>}</span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3 space-y-2">
                  {convertForm.requiredTools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {convertForm.requiredTools.map(toolId => {
                        const tool = toolsData.find(t => t.id === toolId);
                        return tool ? (
                          <Badge key={toolId} variant="secondary" className="gap-1">
                            {tool.toolName || tool.name}
                            <button onClick={() => removeFromArray('requiredTools', toolId)} className="ml-0.5 h-5 w-5 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600"><X className="h-3 w-3" /></button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <Select onValueChange={v => addToArray('requiredTools', v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="+ Add tool..." /></SelectTrigger>
                    <SelectContent>
                      {toolsData.filter(t => !convertForm.requiredTools.includes(t.id)).slice(0, 50).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.toolName || t.name}{t.toolCode ? ` [${t.toolCode}]` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : stepKey === 'safety' ? (
          /* === MOBILE STEP 4: Safety Notes === */
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-3">
                <ShieldAlert className="h-4 w-4" />Safety Information
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Safety Notes</Label>
                  <Textarea
                    className="rounded-xl min-h-[100px]"
                    value={convertForm.safetyNotes}
                    onChange={e => setConvertForm(f => ({ ...f, safetyNotes: e.target.value }))}
                    placeholder="Hazards, precautions, lockout/tagout..."
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1"><HardHat className="h-3.5 w-3.5" />PPE Required</Label>
                  <Input
                    className="h-12 rounded-xl"
                    value={convertForm.ppeRequired}
                    onChange={e => setConvertForm(f => ({ ...f, ppeRequired: e.target.value }))}
                    placeholder="Safety glasses, gloves, helmet..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">General Notes</Label>
                  <Textarea
                    className="rounded-xl min-h-[80px]"
                    value={convertForm.notes}
                    onChange={e => setConvertForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes or instructions..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </MobileStepperSheet>
      )}

      {/* SLA Timer */}
      <SLATimerDisplay slaHours={(mr as any).slaHours} slaStartedAt={(mr as any).slaStartedAt} status={mr.status} />

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Timeline */}
          <MRWorkflowTimeline mr={mr} />

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mr.description || 'No description provided.'}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Comments ({mr.comments?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." onKeyDown={e => e.key === 'Enter' && handleComment()} />
                <Button size="icon" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleComment}><MessageSquare className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="max-h-64">
                {mr.comments?.map(c => (
                  <div key={c.id} className="flex gap-3 py-2 border-b last:border-0">
                    <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[10px]">{getInitials(c.user?.fullName || 'U')}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs"><span className="font-medium">{c.user?.fullName || 'Unknown'}</span> <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span></p>
                      <p className="text-sm mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
              {(!mr.comments || mr.comments.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>}
            </CardContent>
          </Card>

          {/* Attachments */}
          <FileUpload entityType="maintenance_request" entityId={id} />

          {/* Status History */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mr.statusHistory?.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <div className="relative flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-emerald-300'}`} />
                      {i < (mr.statusHistory?.length || 0) - 1 && <div className="w-0.5 h-6 bg-emerald-200" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{h.toStatus.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground"> — by {h.changedBy?.fullName || 'System'}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{formatDateTime(h.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium capitalize">{mr.category || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{mr.location || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Asset</span><span className="font-medium">{mr.asset?.name || mr.assetName || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Requested By</span><span className="font-medium">{mr.requester?.fullName}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{formatDateTime(mr.createdAt)}</span></div>
              {mr.approvedAt && (
                <>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span className="font-medium">{formatDateTime(mr.approvedAt)}</span></div>
                </>
              )}
              {mr.assignedPlannerId && (
                <>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Planner</span><span className="font-medium">{mr.assignedPlanner?.fullName || 'Assigned'}</span></div>
                </>
              )}
              {mr.notes && (
                <>
                  <Separator />
                  <div><span className="text-muted-foreground">Review Notes</span><p className="mt-1 text-xs">{mr.notes}</p></div>
                </>
              )}
            </CardContent>
          </Card>

          {mr.workOrder && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">Linked Work Order</p>
                <p className="font-semibold">{mr.workOrder.woNumber}</p>
                <p className="text-sm text-muted-foreground">{mr.workOrder.title}</p>
                <StatusBadge status={mr.workOrder.status} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WORK ORDERS - LIST
// ============================================================================

export function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasPermission } = useAuthStore();

  // WO KPI state
  const [woKpi, setWoKpi] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    overdue: number;
    completionMetrics: { avgHours: number; completedCount: number };
    trend: { thisMonth: number; lastMonth: number; changePercent: number };
    openByAge: Record<string, number>;
  } | null>(null);

  const filteredWOs = useMemo(() => {
    if (!searchText.trim()) return workOrders;
    const q = searchText.toLowerCase();
    return workOrders.filter(wo =>
      wo.title.toLowerCase().includes(q) ||
      wo.woNumber.toLowerCase().includes(q) ||
      (wo.assetName || '').toLowerCase().includes(q) ||
      (wo.assignedToName || '').toLowerCase().includes(q)
    );
  }, [workOrders, searchText]);

  const statusCounts = useMemo(() => ({
    total: workOrders.length,
    inProgress: workOrders.filter(w => w.status === 'in_progress').length,
    completed: workOrders.filter(w => w.status === 'completed').length,
    assigned: workOrders.filter(w => w.status === 'assigned' || w.status === 'draft').length,
    overdue: workOrders.filter(w => w.slaBreached).length,
  }), [workOrders]);

  // Fetch WO KPI data
  useEffect(() => {
    let active = true;
    api.get('/api/work-orders/kpi').then(res => {
      if (active && res.success && res.data) setWoKpi(res.data as typeof woKpi);
    });
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterPriority !== 'all') params.set('priority', filterPriority);
    api.get<WorkOrder[]>(`/api/work-orders?${params}`).then(res => {
      if (active) {
        if (res.success && res.data) setWorkOrders(res.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [filterStatus, filterPriority, refreshKey]);

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Derived KPI values
  const openWOs = useMemo(() => {
    if (!woKpi) return 0;
    const closedStatuses = ['completed', 'verified', 'closed', 'cancelled'];
    return Object.entries(woKpi.byStatus).reduce((sum, [status, count]) => {
      return closedStatuses.includes(status) ? sum : sum + count;
    }, 0);
  }, [woKpi]);

  if (detailId) {
    return <WODetailPage id={detailId} onBack={() => setDetailId(null)} onUpdate={handleRefresh} />;
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and execute all maintenance work orders</p>
        </div>
        {hasPermission('work_orders.create') && (
          <>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Work Order</Button>
          <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen} title="Create Work Order" footer={<Button type="submit" form="create-wo-form" className="bg-emerald-600 hover:bg-emerald-700 text-white">Create WO</Button>}>
            <CreateWOForm onSuccess={() => { setCreateOpen(false); handleRefresh(); }} />
          </ResponsiveDialog>
          </>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total WOs</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{woKpi?.total ?? '-'}</div>
            {woKpi && woKpi.trend.changePercent !== 0 && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {woKpi.trend.changePercent > 0 ? (
                  <><TrendingUp className="h-3 w-3 text-emerald-500" /><span className="text-emerald-600">+{woKpi.trend.changePercent}%</span></>
                ) : (
                  <><TrendingDown className="h-3 w-3 text-red-500" /><span className="text-red-600">{woKpi.trend.changePercent}%</span></>
                )}
                <span>vs last month</span>
              </p>
            )}
            {!woKpi && <p className="text-xs text-muted-foreground mt-1">vs last month</p>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open WOs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{woKpi ? openWOs : '-'}</div>
            <p className="text-xs text-muted-foreground mt-1">active work orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${woKpi && woKpi.overdue > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${woKpi && woKpi.overdue > 0 ? 'text-red-600' : ''}`}>{woKpi?.overdue ?? '-'}</div>
            <p className="text-xs text-muted-foreground mt-1">past due date</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Completion Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{woKpi?.completionMetrics.avgHours != null ? `${woKpi.completionMetrics.avgHours}h` : '-'}</div>
            <p className="text-xs text-muted-foreground mt-1">{woKpi ? `${woKpi.completionMetrics.completedCount} completed` : 'per work order'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Bar - Pill style */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Total', value: statusCounts.total, className: 'bg-slate-100 text-slate-700 border-slate-200' },
          { label: 'In Progress', value: statusCounts.inProgress, className: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Completed', value: statusCounts.completed, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Pending', value: statusCounts.assigned, className: 'bg-sky-50 text-sky-700 border-sky-200' },
          { label: 'Overdue', value: statusCounts.overdue, className: 'bg-red-50 text-red-700 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${s.className} transition-colors`}>
            {s.value} {s.label}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search work orders..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingSkeleton /> : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WO #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden sm:table-cell">Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWOs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-48">
                  <EmptyState icon={Wrench} title="No work orders found" description="Try adjusting your filters or create a new work order." />
                </TableCell></TableRow>
              ) : filteredWOs.map(wo => (
                <TableRow key={wo.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(wo.id)}>
                  <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
                  <TableCell className="font-medium max-w-[250px] truncate">{wo.title}</TableCell>
                  <TableCell className="text-xs capitalize hidden md:table-cell">{wo.type.replace('_', ' ')}</TableCell>
                  <TableCell className="hidden sm:table-cell"><PriorityBadge priority={wo.priority} /></TableCell>
                  <TableCell><StatusBadge status={wo.status} /></TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">{wo.assignedToName || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(wo.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// CREATE WO FORM
// ============================================================================

export function CreateWOForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('corrective');
  const [priority, setPriority] = useState('medium');
  const [assetId, setAssetId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.post('/api/work-orders', {
      title, description, type, priority, assetId, departmentId, assignedToId,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
    });
    if (res.success) {
      toast.success('Work order created');
      onSuccess();
    } else {
      toast.error(res.error || 'Failed');
    }
    setLoading(false);
  };

  return (
    <form id="create-wo-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Work order title" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of work to be done" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="preventive">Preventive</SelectItem>
              <SelectItem value="predictive">Predictive</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="project">Project</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Asset / Machine</Label>
          <AsyncSearchableSelect
            value={assetId}
            onValueChange={setAssetId}
            fetchOptions={async () => {
              const res = await api.get('/api/assets');
              if (res.success && res.data) {
                return (Array.isArray(res.data) ? res.data : []).map((a: any) => ({
                  value: a.id,
                  label: `${a.name} [${a.assetTag}]`,
                  badge: a.status,
                }));
              }
              return [];
            }}
            placeholder="Select asset..."
            searchPlaceholder="Search assets by name or tag..."
          />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <AsyncSearchableSelect
            value={departmentId}
            onValueChange={setDepartmentId}
            fetchOptions={async () => {
              const res = await api.get('/api/departments');
              if (res.success && res.data) {
                return (Array.isArray(res.data) ? res.data : []).map((d: any) => ({
                  value: d.id,
                  label: d.name,
                }));
              }
              return [];
            }}
            placeholder="Select department..."
            searchPlaceholder="Search departments..."
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Assigned To</Label>
          <AsyncSearchableSelect
            value={assignedToId}
            onValueChange={setAssignedToId}
            fetchOptions={async () => {
              const res = await api.get('/api/users');
              if (res.success && res.data) {
                return (Array.isArray(res.data) ? res.data : []).map((u: any) => ({
                  value: u.id,
                  label: `${u.fullName} (${u.username})`,
                }));
              }
              return [];
            }}
            placeholder="Select technician..."
            searchPlaceholder="Search technicians..."
          />
        </div>
        <div className="space-y-2">
          <Label>Est. Hours</Label>
          <Input type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} placeholder="0" />
        </div>
      </div>
    </form>
  );
}

// ============================================================================
// WORK ORDER DETAIL PAGE — Enhanced with Team Management, Personal Tools, Role-Based UI
// ============================================================================

export function WODetailPage({ id, onBack, onUpdate }: { id: string; onBack: () => void; onUpdate: () => void }) {
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [woConfirmAction, setWoConfirmAction] = useState<{ action: string; label: string; variant?: 'default' | 'destructive'; description: string } | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const { hasPermission, user, isAdmin } = useAuthStore();
  // Edit WO
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  // Time log
  const [timeLogOpen, setTimeLogOpen] = useState(false);
  const [tlAction, setTlAction] = useState('start');
  const [tlHours, setTlHours] = useState('');
  const [tlNotes, setTlNotes] = useState('');
  const [tlLoading, setTlLoading] = useState(false);
  // Material
  const [materialOpen, setMaterialOpen] = useState(false);
  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('');
  const [matCost, setMatCost] = useState('');
  const [matUnit, setMatUnit] = useState('each');
  const [matLoading, setMatLoading] = useState(false);
  // Available transitions from state machine
  const [availableTransitions, setAvailableTransitions] = useState<Array<{
    toStatus: string; requiresReason: boolean;
  }>>([]);
  // Status history
  const [statusHistory, setStatusHistory] = useState<Array<{
    fromStatus: string | null; toStatus: string;
    performedBy: { fullName: string } | null;
    notes: string | null; createdAt: string;
  }>>([]);
  // Personal tools
  const [personalTools, setPersonalTools] = useState<PersonalTool[]>([]);
  const [ptOpen, setPtOpen] = useState(false);
  const [ptLoading, setPtLoading] = useState(false);
  const [ptForm, setPtForm] = useState({ toolName: '', toolCode: '', condition: 'good' as PersonalTool['condition'], notes: '' });
  // Add team member dialog
  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('assistant');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  // Enhanced complete dialog fields
  const [completeRootCause, setCompleteRootCause] = useState('');
  const [completeFindings, setCompleteFindings] = useState('');
  const [completeCorrectiveAction, setCompleteCorrectiveAction] = useState('');
  const [completeRequestReview, setCompleteRequestReview] = useState(true);
  // Live session timer
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWO = useCallback(async () => {
    const res = await api.get<WorkOrder>(`/api/work-orders/${id}`);
    if (res.success && res.data) setWo(res.data);
    setLoading(false);
  }, [id]);

  const fetchPersonalTools = useCallback(async () => {
    const res = await api.get<PersonalTool[]>(`/api/work-orders/${id}/personal-tools`);
    if (res.success && res.data) setPersonalTools(res.data);
  }, [id]);

  useEffect(() => {
    let active = true;
    api.get<WorkOrder>(`/api/work-orders/${id}`).then(res => {
      if (active) {
        if (res.success && res.data) setWo(res.data);
        setLoading(false);
      }
    });
    // Fetch available transitions from state machine
    api.get(`/api/work-orders/${id}/transitions`).then(res => {
      if (active && res.success && res.data) setAvailableTransitions(res.data);
    });
    // Fetch status history
    api.get(`/api/work-orders/${id}/status-history`).then(res => {
      if (active && res.success && res.data) setStatusHistory(res.data);
    });
    // Fetch personal tools
    api.get<PersonalTool[]>(`/api/work-orders/${id}/personal-tools`).then(res => {
      if (active && res.success && res.data) setPersonalTools(res.data);
    });
    return () => { active = false; };
  }, [id]);

  // Role-based access check
  const fullAccess = useMemo(() => {
    if (!wo || !user) return false;
    if (isAdmin()) return true;
    if (wo.teamLeaderId === user.id) return true;
    return false;
  }, [wo, user]);

  const isReadOnly = useMemo(() => {
    if (!wo || !user) return false;
    if (fullAccess) return false;
    return wo.teamMembers?.some(tm => tm.userId === user.id && tm.accessLevel === 'read_only') || false;
  }, [wo, user, fullAccess]);

  // Live session timer: find unmatched start/resume without pause
  useEffect(() => {
    if (!wo?.timeLogs || wo.timeLogs.length === 0) {
      setSessionDuration(null);
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      return;
    }
    const sorted = [...wo.timeLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const lastStart = [...sorted].reverse().find(t => t.action === 'start' || t.action === 'resume');
    if (!lastStart?.startTime) { setSessionDuration(null); return; }
    const startTime = new Date(lastStart.startTime).getTime();
    const calc = () => setSessionDuration((Date.now() - startTime) / 1000);
    calc();
    sessionTimerRef.current = setInterval(calc, 1000);
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [wo?.timeLogs]);

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(true);
    let res;
    switch (action) {
      case 'assign':
        res = await api.post(`/api/work-orders/${id}/assign`, { assignedTo: extra?.assignedToId, ...extra });
        break;
      case 'start':
        res = await api.post(`/api/work-orders/${id}/start`, { notes: extra?.notes });
        break;
      case 'complete':
        res = await api.post(`/api/work-orders/${id}/complete`, { notes: extra?.completionNotes, ...extra });
        break;
      case 'verify':
        res = await api.post(`/api/work-orders/${id}/verify`, { notes: extra?.notes });
        break;
      case 'close':
        res = await api.post(`/api/work-orders/${id}/close`, { notes: extra?.notes });
        break;
      case 'approve':
        res = await api.post(`/api/work-orders/${id}/approve`, { notes: extra?.notes, ...extra });
        break;
      case 'plan':
        res = await api.post(`/api/work-orders/${id}/plan`, { notes: extra?.notes, ...extra });
        break;
      case 'hold':
        res = await api.post(`/api/work-orders/${id}/hold`, { notes: extra?.notes, ...extra });
        break;
      case 'resume':
        res = await api.post(`/api/work-orders/${id}/resume`, { notes: extra?.notes, ...extra });
        break;
      case 'cancel':
        res = await api.post(`/api/work-orders/${id}/cancel`, { notes: extra?.notes, ...extra });
        break;
      case 'request':
        res = await api.post(`/api/work-orders/${id}/request`, { notes: extra?.notes, ...extra });
        break;
      case 'wait-parts':
        res = await api.post(`/api/work-orders/${id}/wait-parts`, { notes: extra?.notes, ...extra });
        break;
      default:
        res = await api.put(`/api/work-orders/${id}`, { ...extra });
    }
    if (res.success) {
      toast.success(`Work order ${action}d`);
      fetchWO();
      onUpdate();
      setActionDialog(null);
    } else {
      toast.error(res.error || 'Action failed');
    }
    setActionLoading(false);
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    const res = await api.post(`/api/work-orders/${id}/comments`, { content: comment });
    if (res.success) { toast.success('Comment added'); setComment(''); fetchWO(); }
  };

  const openEditWO = () => {
    if (!wo) return;
    setEditForm({
      title: wo.title, description: wo.description || '', type: wo.type,
      priority: wo.priority, estimatedHours: wo.estimatedHours?.toString() || '',
      assetId: (wo as any).assetId || '',
      departmentId: (wo as any).departmentId || '',
      assignedToId: (wo as any).assignedToId || '',
      plannedStart: wo.plannedStart ? wo.plannedStart.slice(0, 16) : '',
      plannedEnd: wo.plannedEnd ? wo.plannedEnd.slice(0, 16) : '',
      failureDescription: wo.failureDescription || '',
      causeDescription: wo.causeDescription || '',
      actionDescription: wo.actionDescription || '',
    });
    setEditOpen(true);
  };

  const handleEditWO = async () => {
    if (!editForm.title) { toast.error('Title is required'); return; }
    setActionLoading(true);
    const payload: any = {};
    if (editForm.title) payload.title = editForm.title;
    if (editForm.description !== undefined) payload.description = editForm.description;
    if (editForm.type) payload.type = editForm.type;
    if (editForm.priority) payload.priority = editForm.priority;
    if (editForm.estimatedHours) payload.estimatedHours = parseFloat(editForm.estimatedHours);
    if (editForm.plannedStart) payload.plannedStart = editForm.plannedStart;
    if (editForm.plannedEnd) payload.plannedEnd = editForm.plannedEnd;
    if (editForm.failureDescription !== undefined) payload.failureDescription = editForm.failureDescription;
    if (editForm.causeDescription !== undefined) payload.causeDescription = editForm.causeDescription;
    if (editForm.actionDescription !== undefined) payload.actionDescription = editForm.actionDescription;
    if (editForm.assetId) payload.assetId = editForm.assetId;
    if (editForm.departmentId) payload.departmentId = editForm.departmentId;
    if (editForm.assignedToId) payload.assignedToId = editForm.assignedToId;
    const res = await api.put(`/api/work-orders/${id}`, payload);
    if (res.success) { toast.success('Work order updated'); setEditOpen(false); fetchWO(); }
    else { toast.error(res.error || 'Update failed'); }
    setActionLoading(false);
  };

  const handleTimeLog = async () => {
    setTlLoading(true);
    const body: any = { action: tlAction };
    if (tlNotes) body.notes = tlNotes;
    if (tlHours && (tlAction === 'start' || tlAction === 'resume')) body.hoursWorked = parseFloat(tlHours);
    const res = await api.post(`/api/work-orders/${id}/time-logs`, body);
    if (res.success) { toast.success('Time log recorded'); setTimeLogOpen(false); setTlHours(''); setTlNotes(''); fetchWO(); }
    else { toast.error(res.error || 'Failed to log time'); }
    setTlLoading(false);
  };

  const handleAddMaterial = async () => {
    if (!matName) { toast.error('Item name is required'); return; }
    setMatLoading(true);
    const body: any = { itemName: matName };
    if (matQty) body.quantity = parseFloat(matQty);
    if (matCost) body.unitCost = parseFloat(matCost);
    if (matUnit) body.unit = matUnit;
    const res = await api.post(`/api/work-orders/${id}/materials`, body);
    if (res.success) { toast.success('Material added'); setMaterialOpen(false); setMatName(''); setMatQty(''); setMatCost(''); fetchWO(); }
    else { toast.error(res.error || 'Failed to add material'); }
    setMatLoading(false);
  };

  // Personal tools handlers
  const handleAddPersonalTool = async () => {
    if (!ptForm.toolName) { toast.error('Tool name is required'); return; }
    setPtLoading(true);
    const res = await api.post(`/api/work-orders/${id}/personal-tools`, ptForm);
    if (res.success) { toast.success('Tool added'); setPtOpen(false); setPtForm({ toolName: '', toolCode: '', condition: 'good', notes: '' }); fetchPersonalTools(); }
    else { toast.error(res.error || 'Failed to add tool'); }
    setPtLoading(false);
  };

  const handleRemovePersonalTool = async (idx: number) => {
    const tool = personalTools[idx];
    if (!tool?.id) return;
    setPtLoading(true);
    const res = await api.delete(`/api/work-orders/${id}/personal-tools/${tool.id}`);
    if (res.success) { toast.success('Tool removed'); fetchPersonalTools(); }
    else { toast.error(res.error || 'Failed to remove tool'); }
    setPtLoading(false);
  };

  // Add team member handler
  const handleAddTeamMember = async () => {
    if (!newMemberUserId) { toast.error('Please select a user'); return; }
    setAddMemberLoading(true);
    const res = await api.post(`/api/work-orders/${id}/team-members`, { userId: newMemberUserId, role: newMemberRole });
    if (res.success) { toast.success('Team member added'); setAddTeamMemberOpen(false); setNewMemberUserId(''); setNewMemberRole('assistant'); fetchWO(); }
    else { toast.error(res.error || 'Failed to add team member'); }
    setAddMemberLoading(false);
  };

  if (loading) return <LoadingSkeleton />;
  if (!wo) return <div className="p-6">Work order not found</div>;

  // Map transitions to action handlers — each status maps to a dedicated API endpoint
  const statusToAction: Record<string, string> = {
    'approved': 'approve', 'requested': 'request', 'planned': 'plan',
    'assigned': 'assign', 'in_progress': 'start', 'completed': 'complete',
    'verified': 'verify', 'closed': 'close', 'on_hold': 'hold',
    'cancelled': 'cancel', 'waiting_parts': 'wait-parts',
  };

  // Build transition actions from state machine
  const transitionActions = availableTransitions.map(t => ({
    toStatus: t.toStatus,
    actionName: statusToAction[t.toStatus] || t.toStatus,
    label: t.toStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    requiresReason: t.requiresReason,
  }));

  // Special actions that need dialogs
  const needsDialog = new Set(['assign', 'complete']);

  // Confirm dialog descriptions for WO actions
  const woActionDescriptions: Record<string, { description: string; label: string; variant?: 'default' | 'destructive' }> = {
    'approve': { description: 'Are you sure you want to approve this work order? This will allow it to be planned and assigned.', label: 'Yes, Approve' },
    'request': { description: 'Are you sure you want to submit this work order for approval?', label: 'Yes, Submit' },
    'plan': { description: 'Are you sure you want to mark this work order as planned?', label: 'Yes, Plan' },
    'start': { description: 'Are you sure you want to start work on this work order? This will change the status to In Progress.', label: 'Yes, Start Work' },
    'verify': { description: 'Are you sure you want to verify this completed work order?', label: 'Yes, Verify' },
    'close': { description: 'Are you sure you want to close this work order? This action cannot be easily reversed.', label: 'Yes, Close', variant: 'destructive' },
    'hold': { description: 'Are you sure you want to put this work order on hold?', label: 'Yes, Put On Hold' },
    'resume': { description: 'Are you sure you want to resume this work order?', label: 'Yes, Resume' },
    'cancel': { description: 'Are you sure you want to cancel this work order? This will stop all work and cannot be easily reversed.', label: 'Yes, Cancel', variant: 'destructive' },
    'wait-parts': { description: 'Are you sure you want to set this work order to Waiting for Parts?', label: 'Yes, Wait for Parts' },
  };

  const canEdit = !['closed', 'cancelled'].includes(wo.status);
  const readOnlyDisabled = isReadOnly;

  // Format session duration
  const formatSessionDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="page-content">
      {/* Read-Only Banner */}
      {isReadOnly && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
          <Eye className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Read-Only Access</p>
            <p className="text-xs text-amber-700">You have read-only access to this work order. Action buttons are disabled.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{wo.woNumber}</span>
            <StatusBadge status={wo.status} />
            <PriorityBadge priority={wo.priority} />
            <Badge variant="outline" className="capitalize">{wo.type.replace('_', ' ')}</Badge>
            {wo.isLocked && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
            {wo.slaBreached && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />SLA BREACHED</Badge>}
          </div>
          <h1 className="text-xl font-bold mt-1">{wo.title}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={readOnlyDisabled}><CheckCircle2 className="h-4 w-4 mr-1" />Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && !isReadOnly && <DropdownMenuItem onClick={openEditWO}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
            {canEdit && !isReadOnly && <DropdownMenuSeparator />}
            {transitionActions.map(ta => (
              <DropdownMenuItem key={ta.toStatus} disabled={isReadOnly} onClick={() => {
                if (needsDialog.has(ta.actionName)) {
                  setActionDialog(ta.actionName);
                } else if (ta.requiresReason) {
                  setActionDialog(`reason:${ta.actionName}`);
                } else if (woActionDescriptions[ta.actionName]) {
                  // Show confirmation dialog for sensitive actions
                  const desc = woActionDescriptions[ta.actionName];
                  setWoConfirmAction({
                    action: ta.actionName,
                    label: desc.label,
                    variant: desc.variant || 'default',
                    description: desc.description,
                  });
                } else {
                  handleAction(ta.actionName);
                }
              }}>{ta.label}</DropdownMenuItem>
            ))}
            {transitionActions.length === 0 && canEdit && (
              <DropdownMenuItem disabled>No transitions available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Assign Dialog */}
      <ResponsiveDialog open={actionDialog === 'assign'} onOpenChange={() => setActionDialog(null)} title="Assign Work Order" description="Select a technician to assign this work order.">
          <AsyncSearchableSelect
            value=""
            onValueChange={(val) => handleAction('assign', { assignedToId: val, assignedToName: val })}
            fetchOptions={async () => {
              const res = await api.get('/api/users');
              if (res.success && res.data) {
                return (Array.isArray(res.data) ? res.data : []).map((u: any) => ({
                  value: u.id,
                  label: `${u.fullName} (${u.username})`,
                }));
              }
              return [];
            }}
            placeholder="Select technician..."
            searchPlaceholder="Search technicians..."
          />
      </ResponsiveDialog>

      {/* Complete Dialog — Enhanced */}
      <ResponsiveDialog open={actionDialog === 'complete'} onOpenChange={() => setActionDialog(null)} large title="Complete Work Order" description="Mark this work order as completed with full details." footer={<Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading || !completionNotes.trim()} onClick={() => handleAction('complete', { completionNotes, rootCause: completeRootCause, findings: completeFindings, correctiveAction: completeCorrectiveAction, requestSupervisorReview: completeRequestReview })}>{actionLoading ? 'Completing...' : 'Mark as Completed'}</Button>}>
          <div className="grid gap-4 py-2">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Total Time</p>
                <p className="text-lg font-bold">{wo.actualHours || 0}h</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Materials Used</p>
                <p className="text-lg font-bold">{wo.materials?.length || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-lg font-bold">GHS {wo.totalCost.toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Completion Notes *</Label>
              <Textarea value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="What was done?" rows={3} />
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Failure Analysis</p>
            <div className="space-y-2"><Label>Root Cause</Label><Textarea value={completeRootCause} onChange={e => setCompleteRootCause(e.target.value)} placeholder="What caused the failure..." rows={2} /></div>
            <div className="space-y-2"><Label>Findings</Label><Textarea value={completeFindings} onChange={e => setCompleteFindings(e.target.value)} placeholder="What was discovered during the repair..." rows={2} /></div>
            <div className="space-y-2"><Label>Corrective Action</Label><Textarea value={completeCorrectiveAction} onChange={e => setCompleteCorrectiveAction(e.target.value)} placeholder="Actions taken to prevent recurrence..." rows={2} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={completeRequestReview} onCheckedChange={v => setCompleteRequestReview(!!v)} id="request-review" />
              <Label htmlFor="request-review" className="text-sm cursor-pointer">Request Supervisor Review</Label>
            </div>
          </div>
      </ResponsiveDialog>

      {/* Edit WO Dialog */}
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen} large title="Edit Work Order" description="Update work order details." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEditWO} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{actionLoading ? 'Saving...' : 'Save Changes'}</Button></div>}>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="predictive">Predictive</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Asset / Machine</Label>
                <AsyncSearchableSelect
                  value={editForm.assetId || ''}
                  onValueChange={v => setEditForm(f => ({ ...f, assetId: v }))}
                  fetchOptions={async () => {
                    const res = await api.get('/api/assets');
                    if (res.success && res.data) {
                      return (Array.isArray(res.data) ? res.data : []).map((a: any) => ({
                        value: a.id,
                        label: `${a.name} [${a.assetTag}]`,
                        badge: a.status,
                      }));
                    }
                    return [];
                  }}
                  placeholder="Select asset..."
                  searchPlaceholder="Search assets by name or tag..."
                />
              </div>
              <div className="space-y-1.5"><Label>Department</Label>
                <AsyncSearchableSelect
                  value={editForm.departmentId || ''}
                  onValueChange={v => setEditForm(f => ({ ...f, departmentId: v }))}
                  fetchOptions={async () => {
                    const res = await api.get('/api/departments');
                    if (res.success && res.data) {
                      return (Array.isArray(res.data) ? res.data : []).map((d: any) => ({
                        value: d.id,
                        label: d.name,
                      }));
                    }
                    return [];
                  }}
                  placeholder="Select department..."
                  searchPlaceholder="Search departments..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Assigned To</Label>
                <AsyncSearchableSelect
                  value={editForm.assignedToId || ''}
                  onValueChange={v => setEditForm(f => ({ ...f, assignedToId: v }))}
                  fetchOptions={async () => {
                    const res = await api.get('/api/users');
                    if (res.success && res.data) {
                      return (Array.isArray(res.data) ? res.data : []).map((u: any) => ({
                        value: u.id,
                        label: `${u.fullName} (${u.username})`,
                      }));
                    }
                    return [];
                  }}
                  placeholder="Select technician..."
                  searchPlaceholder="Search technicians..."
                />
              </div>
              <div className="space-y-1.5"><Label>Est. Hours</Label><Input type="number" value={editForm.estimatedHours || ''} onChange={e => setEditForm(f => ({ ...f, estimatedHours: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Planned Start</Label><Input type="datetime-local" value={editForm.plannedStart || ''} onChange={e => setEditForm(f => ({ ...f, plannedStart: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Planned End</Label><Input type="datetime-local" value={editForm.plannedEnd || ''} onChange={e => setEditForm(f => ({ ...f, plannedEnd: e.target.value }))} /></div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Failure Analysis</p>
            <div className="space-y-1.5"><Label>Failure Description</Label><Textarea value={editForm.failureDescription || ''} onChange={e => setEditForm(f => ({ ...f, failureDescription: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Cause Description</Label><Textarea value={editForm.causeDescription || ''} onChange={e => setEditForm(f => ({ ...f, causeDescription: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Action Description</Label><Textarea value={editForm.actionDescription || ''} onChange={e => setEditForm(f => ({ ...f, actionDescription: e.target.value }))} rows={2} /></div>
          </div>
      </ResponsiveDialog>

      {/* Time Log Dialog */}
      <ResponsiveDialog open={timeLogOpen} onOpenChange={setTimeLogOpen} title="Log Time" description="Record time spent on this work order." footer={<Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={tlLoading} onClick={handleTimeLog}>{tlLoading ? 'Logging...' : 'Log Time'}</Button>}>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Action</Label>
              <Select value={tlAction} onValueChange={setTlAction}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="start">Start</SelectItem><SelectItem value="pause">Pause</SelectItem><SelectItem value="resume">Resume</SelectItem><SelectItem value="complete">Complete</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Hours Worked</Label><Input className="min-h-[44px]" type="number" step="0.25" value={tlHours} onChange={e => setTlHours(e.target.value)} placeholder="e.g. 2.5" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={tlNotes} onChange={e => setTlNotes(e.target.value)} placeholder="Optional notes..." rows={2} /></div>
          </div>
      </ResponsiveDialog>

      {/* Add Material Dialog */}
      <ResponsiveDialog open={materialOpen} onOpenChange={setMaterialOpen} title="Add Material" description="Add a material or part to this work order." footer={<Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={matLoading} onClick={handleAddMaterial}>{matLoading ? 'Adding...' : 'Add Material'}</Button>}>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Item Name *</Label><Input className="min-h-[44px]" value={matName} onChange={e => setMatName(e.target.value)} placeholder="e.g. Bearing 6205" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Quantity</Label><Input className="min-h-[44px]" type="number" value={matQty} onChange={e => setMatQty(e.target.value)} placeholder="1" /></div>
              <div className="space-y-1.5"><Label>Unit Cost</Label><Input className="min-h-[44px]" type="number" step="0.01" value={matCost} onChange={e => setMatCost(e.target.value)} placeholder="0.00" /></div>
              <div className="space-y-1.5"><Label>Unit</Label>
                <Select value={matUnit} onValueChange={setMatUnit}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="each">Each</SelectItem><SelectItem value="kg">Kg</SelectItem><SelectItem value="meter">Meter</SelectItem><SelectItem value="set">Set</SelectItem><SelectItem value="box">Box</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
      </ResponsiveDialog>

      {/* Reason Dialog (for transitions requiring a reason like cancel, hold) */}
      <ResponsiveDialog open={actionDialog?.startsWith('reason:') || false} onOpenChange={() => setActionDialog(null)} title="Confirm Action" description="Please provide a reason for this action.">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea id="transition-reason" placeholder="Enter reason..." rows={3} />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={() => {
              const reason = (document.getElementById('transition-reason') as HTMLTextAreaElement)?.value;
              if (!reason?.trim()) { toast.error('Reason is required'); return; }
              const actionName = actionDialog?.replace('reason:', '') || '';
              handleAction(actionName, { notes: reason });
            }}>
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
      </ResponsiveDialog>

      {/* WO Action Confirmation Dialog */}
      <ConfirmDialog
        open={!!woConfirmAction}
        onOpenChange={(open) => { if (!open) setWoConfirmAction(null); }}
        title={`Confirm Work Order Action`}
        description={woConfirmAction?.description || 'Are you sure you want to proceed with this action?'}
        confirmLabel={woConfirmAction?.label || 'Confirm'}
        variant={woConfirmAction?.variant || 'default'}
        loading={actionLoading}
        onConfirm={() => {
          if (woConfirmAction) {
            handleAction(woConfirmAction.action);
            setWoConfirmAction(null);
          }
        }}
      />

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{wo.description || 'No description'}</p></CardContent>
          </Card>

          {/* Comments */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Comments ({wo.comments?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add comment..." onKeyDown={e => e.key === 'Enter' && handleComment()} />
                <Button size="icon" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleComment}><MessageSquare className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="max-h-64">
                {wo.comments?.map(c => (
                  <div key={c.id} className="flex gap-3 py-2 border-b last:border-0">
                    <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[10px]">{getInitials(c.userName || 'U')}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs"><span className="font-medium">{c.userName || 'Unknown'}</span> <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span></p>
                      <p className="text-sm mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Attachments */}
          <FileUpload entityType="work_order" entityId={id} />

          {/* Time Logs — Enhanced with Summary Bar */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-base">Time Logs</CardTitle><CardDescription className="text-xs">{wo.timeLogs?.length || 0} entries · {wo.actualHours || 0}h total</CardDescription></div>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={readOnlyDisabled} onClick={() => { setTlAction('start'); setTlHours(''); setTlNotes(''); setTimeLogOpen(true); }}><Clock className="h-3.5 w-3.5" />Log Time</Button>
            </CardHeader>
            <CardContent>
              {/* Time Summary Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Clock className="h-4 w-4" /></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Total Logged</p><p className="text-sm font-bold">{wo.actualHours || 0}h</p></div>
                </div>
                {wo.actualStart && (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center"><Play className="h-4 w-4" /></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase">Started At</p><p className="text-sm font-bold">{formatDateTime(wo.actualStart)}</p></div>
                  </div>
                )}
                {sessionDuration !== null && (
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center animate-pulse"><Timer className="h-4 w-4" /></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase">Current Session</p><p className="text-sm font-bold font-mono text-amber-700">{formatSessionDuration(sessionDuration)}</p></div>
                  </div>
                )}
              </div>
              {(!wo.timeLogs || wo.timeLogs.length === 0) ? (
                <p className="text-sm text-muted-foreground">No time logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {wo.timeLogs.map(tl => (
                    <div key={tl.id} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${tl.action === 'start' ? 'bg-emerald-100 text-emerald-700' : tl.action === 'pause' ? 'bg-amber-100 text-amber-700' : tl.action === 'resume' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                        {tl.action === 'start' ? <Play className="h-3.5 w-3.5" /> : tl.action === 'pause' ? <Pause className="h-3.5 w-3.5" /> : tl.action === 'resume' ? <Play className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">{tl.action}</p>
                        <p className="text-xs text-muted-foreground">{tl.userName || 'Unknown'} · {formatDateTime(tl.createdAt)}</p>
                        {tl.note && <p className="text-xs text-muted-foreground mt-0.5">{tl.note}</p>}
                      </div>
                      {tl.duration != null && tl.duration > 0 && (
                        <Badge variant="outline" className="text-[10px] shrink-0">{tl.duration}h</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Materials */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-base">Materials & Parts</CardTitle><CardDescription className="text-xs">{wo.materials?.length || 0} items</CardDescription></div>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={readOnlyDisabled} onClick={() => { setMatName(''); setMatQty(''); setMatCost(''); setMaterialOpen(true); }}><Plus className="h-3.5 w-3.5" />Add Material</Button>
            </CardHeader>
            <CardContent>
              {(!wo.materials || wo.materials.length === 0) ? (
                <p className="text-sm text-muted-foreground">No materials added yet.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Unit Cost</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wo.materials.map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium text-sm">{m.itemName || '-'}</TableCell>
                            <TableCell className="text-right text-sm">{m.quantity || 0} {m.unit || ''}</TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell">${(m.unitCost || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell font-medium">${(m.totalCost || (m.quantity || 0) * (m.unitCost || 0)).toFixed(2)}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${m.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : m.status === 'issued' ? 'bg-sky-50 text-sky-700 border-sky-200' : m.status === 'returned' ? 'bg-slate-50 text-slate-500 border-slate-200' : ''}`}>{m.status || 'requested'}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {m.status === 'requested' && (
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 border-emerald-200" onClick={async () => { const r = await api.put(`/api/work-orders/${id}/materials/${m.id}`, { status: 'approved' }); if (r.success) { toast.success('Material approved'); fetchWO(); } else toast.error(r.error || 'Failed'); }}>Approve</Button>
                                )}
                                {m.status === 'approved' && (
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-sky-600 hover:text-sky-700 border-sky-200" onClick={async () => { const r = await api.put(`/api/work-orders/${id}/materials/${m.id}`, { status: 'issued' }); if (r.success) { toast.success('Material issued'); fetchWO(); } else toast.error(r.error || 'Failed'); }}>Issue</Button>
                                )}
                                {(m.status === 'issued') && (
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-slate-600 hover:text-slate-700" onClick={async () => { const r = await api.put(`/api/work-orders/${id}/materials/${m.id}`, { status: 'returned' }); if (r.success) { toast.success('Material returned'); fetchWO(); } else toast.error(r.error || 'Failed'); }}>Return</Button>
                                )}
                                {m.status === 'requested' && (
                                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1.5 text-red-500 hover:text-red-600" onClick={async () => { if (!confirm('Delete this material?')) return; const r = await api.delete(`/api/work-orders/${id}/materials/${m.id}`); if (r.success) { toast.success('Material removed'); fetchWO(); } else toast.error(r.error || 'Failed'); }}><Trash2 className="h-3 w-3" /></Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end mt-3 pt-3 border-t">
                    <div className="text-sm font-semibold">
                      Total: ${wo.materials.reduce((sum, m) => sum + (m.totalCost || (m.quantity || 0) * (m.unitCost || 0)), 0).toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Personal Tools On-Site */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-base flex items-center gap-2"><Hammer className="h-4 w-4 text-orange-600" />Personal Tools On-Site</CardTitle><CardDescription className="text-xs">{personalTools.length} tools</CardDescription></div>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={readOnlyDisabled} onClick={() => setPtOpen(true)}><Plus className="h-3.5 w-3.5" />Add Tool</Button>
            </CardHeader>
            <CardContent>
              {personalTools.length === 0 ? (
                <p className="text-sm text-muted-foreground">No personal tools recorded on-site.</p>
              ) : (
                <div className="grid gap-2">
                  {personalTools.map((tool, idx) => (
                    <div key={tool.id || idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="h-9 w-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0"><Hammer className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{tool.toolName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {tool.toolCode && <span className="font-mono">{tool.toolCode}</span>}
                          <Badge variant="outline" className={`text-[10px] ${tool.condition === 'new' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : tool.condition === 'good' ? 'bg-sky-50 text-sky-700 border-sky-200' : tool.condition === 'fair' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{tool.condition}</Badge>
                        </div>
                        {tool.notes && <p className="text-xs text-muted-foreground mt-0.5">{tool.notes}</p>}
                      </div>
                      {!readOnlyDisabled && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 shrink-0" disabled={ptLoading} onClick={() => handleRemovePersonalTool(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Tool Add Dialog */}
          <ResponsiveDialog open={ptOpen} onOpenChange={setPtOpen} title="Add Personal Tool" description="Record a personal tool brought on-site." footer={<Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={ptLoading} onClick={handleAddPersonalTool}>{ptLoading ? 'Adding...' : 'Add Tool'}</Button>}>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Tool Name *</Label><Input className="min-h-[44px]" value={ptForm.toolName} onChange={e => setPtForm(f => ({ ...f, toolName: e.target.value }))} placeholder="e.g. Digital Multimeter" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Tool Code</Label><Input className="min-h-[44px]" value={ptForm.toolCode} onChange={e => setPtForm(f => ({ ...f, toolCode: e.target.value }))} placeholder="e.g. DM-001" /></div>
                  <div className="space-y-1.5"><Label>Condition</Label>
                    <Select value={ptForm.condition} onValueChange={v => setPtForm(f => ({ ...f, condition: v as PersonalTool['condition'] }))}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5"><Label>Notes</Label><Textarea value={ptForm.notes} onChange={e => setPtForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." rows={2} /></div>
              </div>
          </ResponsiveDialog>

          {/* Add Team Member Dialog */}
          <ResponsiveDialog open={addTeamMemberOpen} onOpenChange={setAddTeamMemberOpen} title="Add Team Member" description="Add a new member to this work order team." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setAddTeamMemberOpen(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={addMemberLoading || !newMemberUserId} onClick={handleAddTeamMember}>{addMemberLoading ? 'Adding...' : 'Add Member'}</Button></div>}>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>User *</Label>
                  <AsyncSearchableSelect
                    value={newMemberUserId}
                    onValueChange={setNewMemberUserId}
                    fetchOptions={async () => {
                      const res = await api.get('/api/users');
                      if (res.success && res.data) return (Array.isArray(res.data) ? res.data : []).map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username})` }));
                      return [];
                    }}
                    placeholder="Search users..."
                    searchPlaceholder="Search by name..."
                  />
                </div>
                <div className="space-y-1.5"><Label>Role</Label>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="assistant">Assistant</SelectItem><SelectItem value="specialist">Specialist</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
          </ResponsiveDialog>

          {/* Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wo.statusHistory?.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <div className="relative flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-emerald-300'}`} />
                      {i < (wo.statusHistory?.length || 0) - 1 && <div className="w-0.5 h-6 bg-emerald-200" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{h.toStatus.replace(/_/g, ' ')}</span>
                        {h.reason && <span className="text-muted-foreground"> — {h.reason}</span>}
                      </div>
                      <span className="text-muted-foreground text-xs">{formatDateTime(h.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{wo.type.replace('_', ' ')}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Asset</span><span className="font-medium">{wo.assetName || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Assigned To</span><span className="font-medium">{wo.assignedToName || 'Unassigned'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Est. Hours</span><span className="font-medium">{wo.estimatedHours || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Actual Hours</span><span className="font-medium">{wo.actualHours || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Created By</span><span className="font-medium">{wo.creator?.fullName || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{formatDateTime(wo.createdAt)}</span></div>
              {wo.plannedStart && (
                <><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Planned Start</span><span className="font-medium">{formatDateTime(wo.plannedStart)}</span></div></>
              )}
              {wo.actualStart && (
                <><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Actual Start</span><span className="font-medium">{formatDateTime(wo.actualStart)}</span></div></>
              )}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Cost Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Material</span><span className="font-medium">GHS {wo.materialCost.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Labor</span><span className="font-medium">GHS {wo.laborCost.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between font-semibold"><span>Total</span><span>GHS {wo.totalCost.toFixed(2)}</span></div>
            </CardContent>
          </Card>

          {/* Source Request */}
          {wo.request && (
            <Card className="border-teal-200 bg-teal-50/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-teal-700 uppercase tracking-wider mb-1">Source Request</p>
                <p className="font-semibold">{wo.request.requestNumber}</p>
                <p className="text-sm text-muted-foreground">{wo.request.title}</p>
                {wo.request.requester && <p className="text-xs text-muted-foreground mt-1">by {wo.request.requester.fullName}</p>}
              </CardContent>
            </Card>
          )}

          {/* Team Members — Enhanced */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Team</CardTitle>
              {(fullAccess || isAdmin()) && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddTeamMemberOpen(true)}><UserPlus className="h-3.5 w-3.5" />Add Member</Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {(!wo.teamMembers || wo.teamMembers.length === 0) ? (
                <p className="text-sm text-muted-foreground">No team members assigned.</p>
              ) : (
                wo.teamMembers.map(tm => {
                  const isTeamLeader = tm.userId === wo.teamLeaderId;
                  const isReadOnlyMember = tm.accessLevel === 'read_only';
                  return (
                    <div key={tm.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-[10px]">{getInitials(tm.userName || tm.user?.fullName || 'U')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{tm.userName || tm.user?.fullName || 'Unknown'}</span>
                          {isTeamLeader && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{tm.role}</Badge>
                          {isTeamLeader && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Full Access</Badge>}
                          {isReadOnlyMember && <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">Read Only</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
// --- PmSchedulesPage separator ---
export function PmSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [dueSoonFilter, setDueSoonFilter] = useState(false);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useAuthStore();

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAssetId, setFormAssetId] = useState('');
  const [formFreqType, setFormFreqType] = useState('monthly');
  const [formFreqValue, setFormFreqValue] = useState('1');
  const [formPriority, setFormPriority] = useState('medium');
  const [formEstDuration, setFormEstDuration] = useState('');
  const [formAssignedToId, setFormAssignedToId] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formAutoGenWO, setFormAutoGenWO] = useState(true);
  const [formLeadDays, setFormLeadDays] = useState('3');
  const [formNextDueDate, setFormNextDueDate] = useState('');

  const [pmAnalytics, setPmAnalytics] = useState<any>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dueSoonFilter) params.set('dueSoon', 'true');
      const res = await api.get(`/api/pm-schedules?${params.toString()}`);
      if (res.success) setSchedules(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [dueSoonFilter]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  useEffect(() => {
    api.get('/api/pm-analytics').then(res => {
      if (res.success && res.data) setPmAnalytics(res.data);
    });
  }, []);

  // Background PM check: fire-and-forget trigger on page load
  useEffect(() => {
    const token = localStorage.getItem('eam_token');
    fetch('/api/pm-schedules/check-due', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    }).catch(() => { /* silent — background task */ });
  }, []);

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormAssetId('');
    setFormFreqType('monthly'); setFormFreqValue('1');
    setFormPriority('medium'); setFormEstDuration('');
    setFormAssignedToId(''); setFormDepartmentId(''); setFormAutoGenWO(true);
    setFormLeadDays('3'); setFormNextDueDate('');
  };

  const openCreate = () => { resetForm(); setCreateOpen(true); };
  const openEdit = (item: any) => {
    setFormTitle(item.title || '');
    setFormDesc(item.description || '');
    setFormAssetId(item.assetId || '');
    setFormFreqType(item.frequencyType || 'monthly');
    setFormFreqValue(String(item.frequencyValue || 1));
    setFormPriority(item.priority || 'medium');
    setFormEstDuration(item.estimatedDuration ? String(item.estimatedDuration) : '');
    setFormAssignedToId(item.assignedToId || '');
    setFormDepartmentId(item.departmentId || '');
    setFormAutoGenWO(item.autoGenerateWO !== false);
    setFormLeadDays(String(item.leadDays || 3));
    setFormNextDueDate(item.nextDueDate ? item.nextDueDate.split('T')[0] : '');
    setEditItem(item);
  };

  const handleSave = async () => {
    if (!formTitle || !formAssetId) { toast.error('Title and asset are required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: formTitle, description: formDesc || null,
        assetId: formAssetId, frequencyType: formFreqType,
        frequencyValue: parseInt(formFreqValue, 10) || 1,
        priority: formPriority,
        estimatedDuration: formEstDuration ? parseFloat(formEstDuration) : null,
        assignedToId: formAssignedToId || null,
        departmentId: formDepartmentId || null,
        autoGenerateWO: formAutoGenWO,
        leadDays: parseInt(formLeadDays, 10) || 3,
        nextDueDate: formNextDueDate || null,
      };

      if (editItem) {
        const res = await api.put(`/api/pm-schedules/${editItem.id}`, payload);
        if (res.success) { toast.success('Schedule updated'); setEditItem(null); fetchSchedules(); }
        else toast.error(res.error || 'Update failed');
      } else {
        const res = await api.post('/api/pm-schedules', payload);
        if (res.success) { toast.success('Schedule created'); setCreateOpen(false); resetForm(); fetchSchedules(); }
        else toast.error(res.error || 'Create failed');
      }
    } catch { toast.error('Operation failed'); }
    setSaving(false);
  };

  const handleDeactivate = async (id: string) => {
    try {
      const res = await api.delete(`/api/pm-schedules/${id}`);
      if (res.success) { toast.success('Schedule deactivated'); fetchSchedules(); }
      else toast.error(res.error || 'Failed');
    } catch { toast.error('Failed'); }
  };

  const freqLabel = (type: string, val: number) => {
    const map: Record<string, string> = {
      daily: `Every ${val} day${val > 1 ? 's' : ''}`,
      weekly: `Every ${val} week${val > 1 ? 's' : ''}`,
      biweekly: `Every ${val * 2} weeks`,
      monthly: `Every ${val} month${val > 1 ? 's' : ''}`,
      quarterly: `Every ${val * 3} months`,
      semiannual: `Every ${val * 6} months`,
      annual: `Every ${val} year${val > 1 ? 's' : ''}`,
      custom_hours: `Every ${val} hours`,
      custom_days: `Every ${val} days`,
      meter_based: `Every ${val} units`,
    };
    return map[type] || `${type}/${val}`;
  };

  const isDueSoon = (d?: string) => {
    if (!d) return false;
    const due = new Date(d);
    const week = new Date(Date.now() + 7 * 86400000);
    return due <= week;
  };

  const isOverdue = (d?: string) => {
    if (!d) return false;
    return new Date(d) < new Date();
  };

  const activeSchedules = schedules.filter(s => s.isActive);
  const dueSoonCount = activeSchedules.filter(s => isDueSoon(s.nextDueDate)).length;
  const overdueCount = activeSchedules.filter(s => isOverdue(s.nextDueDate)).length;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Preventive Maintenance</p>
          <h1 className="text-2xl font-bold tracking-tight">PM Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage preventive maintenance schedules for your assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setDueSoonFilter(!dueSoonFilter); }}
            className={dueSoonFilter ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40' : ''}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Due Soon
          </Button>
          {hasPermission('work_orders.create') && (
            <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Schedule
            </Button>
          )}
        </div>
      </div>

      {/* PM Analytics KPI Banner */}
      {pmAnalytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Schedules', value: pmAnalytics.totalSchedules ?? 0, icon: ClipboardList, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
            { label: 'Compliance Rate', value: `${pmAnalytics.complianceRate ?? 0}%`, icon: Target, color: pmAnalytics.complianceRate >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : pmAnalytics.complianceRate >= 50 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
            { label: 'Overdue', value: pmAnalytics.overdueCount ?? 0, icon: AlertTriangle, color: pmAnalytics.overdueCount > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' : 'bg-slate-50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400' },
            { label: 'Upcoming (7 days)', value: pmAnalytics.upcomingCount ?? 0, icon: Calendar, color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400' },
            { label: 'PM WOs Generated', value: pmAnalytics.totalGenerated ?? 0, icon: Wrench, color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400' },
            { label: 'Avg Completion Days', value: pmAnalytics.avgCompletionDays ?? '—', icon: Gauge, color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Department Compliance Table */}
      {pmAnalytics?.byDepartment && pmAnalytics.byDepartment.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Department Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Department</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Schedules</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Completed WOs</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pmAnalytics.byDepartment.map((dept: any) => (
                  <TableRow key={dept.departmentName}>
                    <TableCell className="text-sm font-medium">{dept.departmentName}</TableCell>
                    <TableCell className="text-sm text-right">{dept.scheduleCount}</TableCell>
                    <TableCell className="text-sm text-right">{dept.completedWos}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={
                        dept.complianceRate == null ? 'bg-slate-100 text-slate-500 border-slate-200' :
                        dept.complianceRate >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        dept.complianceRate >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }>
                        {dept.complianceRate != null ? `${dept.complianceRate}%` : 'N/A'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Schedules', value: schedules.length, icon: Clock, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
          { label: 'Active', value: activeSchedules.length, icon: Activity, color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400' },
          { label: 'Due Soon', value: dueSoonCount, icon: AlertCircle, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">Schedule</TableHead>
                <TableHead className="text-xs font-semibold">Asset</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Frequency</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
                <TableHead className="text-xs font-semibold">Next Due</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Assigned To</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )) : schedules.length === 0 ? (
                <TableRow><TableCell colSpan={8}>
                  <EmptyState icon={Clock} title="No schedules found" description={dueSoonFilter ? "No schedules due in the next 7 days" : "Create your first PM schedule to get started"} />
                </TableCell></TableRow>
              ) : schedules.map(s => (
                <TableRow key={s.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{s.title}</p>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{s.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{s.asset?.name || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{s.asset?.assetTag || ''}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {freqLabel(s.frequencyType, s.frequencyValue)}
                    </Badge>
                  </TableCell>
                  <TableCell><PriorityBadge priority={s.priority} /></TableCell>
                  <TableCell>
                    <div>
                      <p className={`text-xs font-medium ${isOverdue(s.nextDueDate) ? 'text-red-600 dark:text-red-400' : isDueSoon(s.nextDueDate) ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                        {s.nextDueDate ? formatDate(s.nextDueDate) : '—'}
                      </p>
                      {isOverdue(s.nextDueDate) && <p className="text-[10px] text-red-500">OVERDUE</p>}
                      {isDueSoon(s.nextDueDate) && !isOverdue(s.nextDueDate) && <p className="text-[10px] text-amber-500">DUE SOON</p>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <p className="text-xs">{s.assignedTo?.fullName || 'Unassigned'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.isActive && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          {hasPermission('roles.update') && (
                            <DropdownMenuItem onClick={() => handleDeactivate(s.id)} className="text-red-600">
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <ResponsiveDialog open={createOpen || !!editItem} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditItem(null); } }} title={editItem ? 'Edit PM Schedule' : 'New PM Schedule'} description={editItem ? 'Update preventive maintenance schedule' : 'Define a new preventive maintenance schedule for an asset'} footer={<div className="flex gap-2"><Button variant="outline" onClick={() => { setCreateOpen(false); setEditItem(null); }}>Cancel</Button><Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}{editItem ? 'Update Schedule' : 'Create Schedule'}</Button></div>}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Title *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g., Monthly Motor Inspection" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Describe the maintenance tasks..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Asset *</Label>
              <AsyncSearchableSelect
                value={formAssetId}
                onValueChange={setFormAssetId}
                fetchOptions={async () => {
                  const res = await api.get('/api/assets');
                  if (res.success && res.data) {
                    return (Array.isArray(res.data) ? res.data : []).map((a: any) => ({
                      value: a.id,
                      label: `${a.name} [${a.assetTag}]`,
                      badge: a.status,
                    }));
                  }
                  return [];
                }}
                placeholder="Select asset..."
                searchPlaceholder="Search assets by name or tag..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Frequency Type *</Label>
                <Select value={formFreqType} onValueChange={setFormFreqType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom_hours', 'custom_days', 'meter_based'].map(f => (
                      <SelectItem key={f} value={f}>{f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Frequency Value *</Label>
                <Input type="number" min="1" value={formFreqValue} onChange={e => setFormFreqValue(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high', 'critical'].map(p => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Est. Duration (hrs)</Label>
                <Input type="number" min="0" step="0.5" value={formEstDuration} onChange={e => setFormEstDuration(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assigned To</Label>
              <AsyncSearchableSelect
                value={formAssignedToId}
                onValueChange={setFormAssignedToId}
                fetchOptions={async () => {
                  const res = await api.get('/api/users');
                  if (res.success && res.data) {
                    return (Array.isArray(res.data) ? res.data : []).map((u: any) => ({
                      value: u.id,
                      label: u.fullName,
                    }));
                  }
                  return [];
                }}
                placeholder="Select technician..."
                searchPlaceholder="Search technicians..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Department</Label>
              <AsyncSearchableSelect
                value={formDepartmentId}
                onValueChange={setFormDepartmentId}
                fetchOptions={async () => {
                  const res = await api.get('/api/departments');
                  if (res.success && res.data) {
                    return (Array.isArray(res.data) ? res.data : []).map((d: any) => ({
                      value: d.id,
                      label: d.name,
                    }));
                  }
                  return [];
                }}
                placeholder="Select department..."
                searchPlaceholder="Search departments..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Next Due Date</Label>
              <Input type="date" value={formNextDueDate} onChange={e => setFormNextDueDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Auto-generate Work Order</p>
                <p className="text-[11px] text-muted-foreground">Automatically create WO when schedule is due</p>
              </div>
              <Switch checked={formAutoGenWO} onCheckedChange={setFormAutoGenWO} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Lead Days</Label>
              <Input type="number" min="0" value={formLeadDays} onChange={e => setFormLeadDays(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Days before due date to generate WO</p>
            </div>
          </div>
      </ResponsiveDialog>
    </div>
  );
}

// ============================================================================
// ANALYTICS PAGE
// ============================================================================

// --- MaintenanceWorkOrdersPage separator ---
export function MaintenanceWorkOrdersPage() {
  return <WorkOrdersPage />;
}

export function MaintenanceDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { const res = await api.get('/api/dashboard/stats'); if (res.data) setStats(res.data); } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);
  const kpis = [
    { label: 'Active WOs', value: stats?.activeWorkOrders ?? '-', icon: Wrench, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Completed', value: stats?.completedWorkOrders ?? '-', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Overdue', value: stats?.overdueWorkOrders ?? '-', icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Created Today', value: stats?.createdTodayWO ?? '-', icon: Plus, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
  ];
  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Maintenance Dashboard</h1><p className="text-muted-foreground mt-1">Maintenance operations overview and KPIs</p></div>
      {loading ? <LoadingSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
      )}
    </div>
  );
}

export function MaintenanceAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<WorkOrder[]>('/api/work-orders'),
    ]).then(([statsRes, woRes]) => {
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (woRes.success && woRes.data) setWorkOrders(woRes.data);
      setLoading(false);
    });
  }, []);

  const completedWOs = workOrders.filter(wo => wo.status === 'completed' || wo.status === 'verified' || wo.status === 'closed');
  const mttr = completedWOs.length > 0 ? (completedWOs.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) / completedWOs.length).toFixed(1) : '0.0';
  const totalHours = completedWOs.reduce((sum, wo) => sum + (wo.actualHours || 0), 0);
  const mtbf = completedWOs.length > 1 ? (totalHours / Math.max(completedWOs.length - 1, 1)).toFixed(1) : totalHours.toFixed(1);
  const totalWOs = stats?.totalWorkOrders || 0;
  const preventiveWOs = stats?.preventiveWO || 0;
  const pmCompliance = totalWOs > 0 ? Math.round((preventiveWOs / totalWOs) * 100) : 0;
  const totalCost = workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);

  const typeBreakdown = [
    { type: 'Preventive', count: stats?.preventiveWO || 0, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { type: 'Corrective', count: stats?.correctiveWO || 0, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    { type: 'Emergency', count: stats?.emergencyWO || 0, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    { type: 'Inspection', count: stats?.inspectionWO || 0, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
    { type: 'Predictive', count: stats?.predictiveWO || 0, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  ];

  const priorityBreakdown = [
    { priority: 'Low', count: workOrders.filter(wo => wo.priority === 'low').length },
    { priority: 'Medium', count: workOrders.filter(wo => wo.priority === 'medium').length },
    { priority: 'High', count: workOrders.filter(wo => wo.priority === 'high').length },
    { priority: 'Critical', count: workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'emergency').length },
  ];

  const kpis = [
    { label: 'MTTR (Hours)', value: mttr, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'MTBF (Hours)', value: mtbf, icon: Activity, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'PM Compliance', value: `${pmCompliance}%`, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Total Maintenance Cost', value: `$${totalCost.toLocaleString()}`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Maintenance Analytics</h1><p className="text-muted-foreground mt-1">Advanced analytics for maintenance operations including MTTR, MTBF, and cost trends</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border"><CardHeader><CardTitle className="text-base">WO Type Distribution</CardTitle><CardDescription className="text-xs">Breakdown by work order type</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {typeBreakdown.map(t => {
                const pct = totalWOs > 0 ? Math.round((t.count / totalWOs) * 100) : 0;
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-24">{t.type}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{t.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
          <Card className="border"><CardHeader><CardTitle className="text-base">Priority Breakdown</CardTitle><CardDescription className="text-xs">Work orders by priority level</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {priorityBreakdown.map(p => {
                const pct = workOrders.length > 0 ? Math.round((p.count / workOrders.length) * 100) : 0;
                return (
                  <div key={p.priority} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-24">{p.priority}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${p.priority === 'Critical' ? 'bg-red-500' : p.priority === 'High' ? 'bg-amber-500' : p.priority === 'Medium' ? 'bg-sky-500' : 'bg-slate-400'}`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{p.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        </div>
        <Card className="border"><CardHeader><CardTitle className="text-base">Recent Cost Summary</CardTitle><CardDescription className="text-xs">Latest completed work orders by cost</CardDescription></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">Material</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="hidden md:table-cell">Actual Hours</TableHead></TableRow></TableHeader><TableBody>
            {completedWOs.sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0)).slice(0, 10).map(wo => (
              <TableRow key={wo.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                <TableCell className="text-xs capitalize">{wo.type.replace('_', ' ')}</TableCell>
                <TableCell className="text-right font-semibold">${(wo.totalCost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">${(wo.materialCost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">${(wo.laborCost || 0).toLocaleString()}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{wo.actualHours || '-'}</TableCell>
              </TableRow>
            ))}
            {completedWOs.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState icon={BarChart3} title="No completed work orders" description="Cost data will appear once work orders are completed." /></TableCell></TableRow>}
          </TableBody></Table>
        </CardContent></Card>
      </>)}
    </div>
  );
}
export function MaintenanceCalibrationPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ instrument: '', serialNumber: '', type: '', lastCalibration: '', nextDue: '', technician: '', certificates: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calibrations, setCalibrations] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ total: 0, calibrated: 0, dueSoon: 0, overdue: 0 });

  const loadCalibrations = async () => {
    try {
      const res = await api.get('/api/calibrations');
      if (res.success && res.data) {
        setCalibrations(Array.isArray(res.data) ? res.data : []);
        if (res.kpis) setKpis(res.kpis as any);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/calibrations');
        if (res.success && res.data) {
          setCalibrations(Array.isArray(res.data) ? res.data : []);
          if (res.kpis) setKpis(res.kpis as any);
        }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  const calStatusColors: Record<string, string> = {
    calibrated: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    out_of_calibration: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    due: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  };

  const kpiCards = [
    { label: 'Total Instruments', value: kpis.total, icon: Crosshair, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'Calibrated', value: kpis.calibrated, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Due Soon', value: kpis.dueSoon, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Overdue', value: kpis.overdue, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const mapStatus = (s: string) => {
    if (s === 'out_of_calibration') return 'overdue';
    if (s === 'due') return 'due_soon';
    return s;
  };

  const filtered = calibrations.filter(c => {
    const ms = mapStatus(c.status || '');
    const matchSearch = !search || (c.instrumentName || c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.serialNumber || '').toLowerCase().includes(search.toLowerCase()) || (c.calibrationNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || ms === statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await api.post('/api/calibrations', {
        title: `Calibration - ${form.instrument}`,
        instrumentName: form.instrument,
        serialNumber: form.serialNumber || undefined,
        calibrationDate: form.lastCalibration || undefined,
        nextDueDate: form.nextDue || undefined,
        standardUsed: form.certificates || undefined,
      });
      if (res.success) {
        toast.success('Calibration record created successfully');
        setCreateOpen(false);
        setForm({ instrument: '', serialNumber: '', type: '', lastCalibration: '', nextDue: '', technician: '', certificates: '' });
        loadCalibrations();
      } else {
        toast.error(res.error || 'Failed to create calibration record');
      }
    } catch { toast.error('Failed to create calibration record'); }
    setSaving(false);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Calibration</h1><p className="text-muted-foreground mt-1">Manage instrument calibration schedules, records, and compliance tracking</p></div>
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><CardTitle className="text-base">Calibration Records</CardTitle><CardDescription className="text-xs">Track all instrument calibrations and due dates</CardDescription></div>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" />New Record</Button>
            <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen} title="New Calibration Record" description="Add a new instrument calibration record" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.instrument}>{saving ? 'Creating...' : 'Create Record'}</Button></div>}>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2"><Label className="text-xs">Instrument</Label><Input placeholder="e.g. Digital Pressure Gauge" value={form.instrument} onChange={e => setForm({ ...form, instrument: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Serial Number</Label><Input placeholder="e.g. DPG-2024-001" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
                    <div className="grid gap-2"><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="pressure">Pressure</SelectItem><SelectItem value="temperature">Temperature</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="dimensional">Dimensional</SelectItem><SelectItem value="flow">Flow</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Last Calibration</Label><Input type="date" value={form.lastCalibration} onChange={e => setForm({ ...form, lastCalibration: e.target.value })} /></div>
                    <div className="grid gap-2"><Label className="text-xs">Next Due</Label><Input type="date" value={form.nextDue} onChange={e => setForm({ ...form, nextDue: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Technician</Label><Input placeholder="e.g. James Miller" value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} /></div>
                    <div className="grid gap-2"><Label className="text-xs">Certificates</Label><Input placeholder="e.g. CERT-2024-001" value={form.certificates} onChange={e => setForm({ ...form, certificates: e.target.value })} /></div>
                  </div>
                </div>
            </ResponsiveDialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search instruments, serial numbers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="calibrated">Calibrated</SelectItem><SelectItem value="out_of_calibration">Overdue</SelectItem><SelectItem value="due">Due Soon</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">ID</TableHead><TableHead className="text-xs">Instrument</TableHead><TableHead className="text-xs hidden md:table-cell">Serial #</TableHead><TableHead className="text-xs hidden lg:table-cell">Type</TableHead><TableHead className="text-xs hidden lg:table-cell">Last Calibration</TableHead><TableHead className="text-xs">Next Due</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Result</TableHead></TableRow></TableHeader><TableBody>
              {filtered.map(c => {
                const displayStatus = mapStatus(c.status || '');
                const isOverdue = displayStatus === 'overdue';
                return (
                <TableRow key={c.id} className={`hover:bg-muted/30 ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <TableCell className="font-mono text-xs">{c.calibrationNumber}</TableCell>
                  <TableCell className="font-medium text-sm">{c.instrumentName || c.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{c.serialNumber || '-'}</TableCell>
                  <TableCell className="text-xs capitalize hidden lg:table-cell">{c.standardUsed || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(c.calibrationDate)}</TableCell>
                  <TableCell className="text-xs">{c.nextDueDate ? formatDate(c.nextDueDate) : '-'}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${calStatusColors[c.status] || ''}`}>{(displayStatus || c.status).replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{c.result || '-'}</TableCell>
                </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8}><EmptyState icon={Crosshair} title="No calibration records found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
      </>}
    </div>
  );
}

export function MaintenanceRiskAssessmentPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ asset: '', category: '', likelihood: '', consequence: '', mitigationPlan: '', assessor: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', type: 'operational', status: 'open', assessor: '', department: '', assessmentDate: '', riskLevel: 'medium', hazards: '', mitigations: '' });
  const [editLoading, setEditLoading] = useState(false);

  const loadAssessments = async () => {
    try {
      const res = await api.get('/api/risk-assessments');
      if (res.success && res.data) {
        setAssessments(Array.isArray(res.data) ? res.data : []);
        if (res.kpis) setKpis(res.kpis as any);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/risk-assessments');
        if (res.success && res.data) {
          setAssessments(Array.isArray(res.data) ? res.data : []);
          if (res.kpis) setKpis(res.kpis as any);
        }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  const riskLevelColors: Record<string, string> = {
    extreme: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    high: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  };

  const riskScoreColor = (score: number) => score >= 15 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' : score >= 9 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';

  const kpiCards = [
    { label: 'Total Assessments', value: kpis.total, icon: ClipboardList, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'High Risk', value: kpis.critical, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400' },
    { label: 'Medium Risk', value: kpis.medium, icon: ShieldAlert, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Low Risk', value: kpis.low, icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ];

  const mapRiskLevel = (level: string) => {
    if (level === 'extreme') return 'critical';
    return level;
  };

  const filtered = assessments.filter(a => {
    const ml = mapRiskLevel(a.riskLevel || '');
    const matchSearch = !search || (a.title || '').toLowerCase().includes(search.toLowerCase()) || (a.assessmentNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || ml === levelFilter || a.riskLevel === levelFilter;
    return matchSearch && matchLevel;
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const hazards = form.category ? [{ category: form.category }] : [];
      const controls = form.mitigationPlan ? [{ plan: form.mitigationPlan }] : [];
      const res = await api.post('/api/risk-assessments', {
        title: `Risk Assessment - ${form.asset}`,
        assetId: form.asset || undefined,
        likelihood: form.likelihood ? parseInt(form.likelihood) : undefined,
        consequence: form.consequence ? parseInt(form.consequence) : undefined,
        hazards,
        controls,
      });
      if (res.success) {
        toast.success('Risk assessment created successfully');
        setCreateOpen(false);
        setForm({ asset: '', category: '', likelihood: '', consequence: '', mitigationPlan: '', assessor: '' });
        loadAssessments();
      } else {
        toast.error(res.error || 'Failed to create risk assessment');
      }
    } catch { toast.error('Failed to create risk assessment'); }
    setSaving(false);
  };
  const parseJsonArr = (jsonStr: string | null): string => {
    if (!jsonStr) return '-';
    try {
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr)) return arr.map((item: any) => item.category || item.plan || item.task || item.text || JSON.stringify(item)).join(', ');
      return String(arr);
    } catch { return jsonStr; }
  };
  const handleEditOpen = (item: any) => {
    setEditItem(item);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      type: item.type || 'operational',
      status: item.status || 'open',
      assessor: item.assessor || '',
      department: item.department || '',
      assessmentDate: item.assessmentDate || '',
      riskLevel: item.riskLevel || 'medium',
      hazards: parseJsonArr(item.hazards),
      mitigations: parseJsonArr(item.controls),
    });
  };
  const handleEditSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const hazards = editForm.hazards ? [{ category: editForm.hazards }] : [];
      const controls = editForm.mitigations ? [{ plan: editForm.mitigations }] : [];
      const res = await api.put(`/api/risk-assessments/${editItem.id}`, {
        title: editForm.title,
        description: editForm.description || undefined,
        type: editForm.type,
        status: editForm.status,
        assessor: editForm.assessor || undefined,
        department: editForm.department || undefined,
        assessmentDate: editForm.assessmentDate || undefined,
        riskLevel: editForm.riskLevel,
        hazards,
        controls,
      });
      if (res.success) {
        toast.success('Risk assessment updated successfully');
        setAssessments(prev => prev.map(a => a.id === editItem.id ? { ...a, ...res.data } : a));
        setEditItem(null);
        loadAssessments();
      } else {
        toast.error(res.error || 'Failed to update risk assessment');
      }
    } catch { toast.error('Failed to update risk assessment'); }
    setEditLoading(false);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Risk Assessment</h1><p className="text-muted-foreground mt-1">Evaluate and manage risks associated with asset failures and maintenance activities</p></div>
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><CardTitle className="text-base">Risk Assessments</CardTitle><CardDescription className="text-xs">Risk matrix with likelihood and consequence scoring</CardDescription></div>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" />New Assessment</Button>
            <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen} title="New Risk Assessment" description="Evaluate risk for an asset" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.asset || !form.likelihood || !form.consequence}>{saving ? 'Creating...' : 'Create Assessment'}</Button></div>}>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2"><Label className="text-xs">Asset</Label><Input placeholder="e.g. CNC Lathe #3" value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent><SelectItem value="mechanical">Mechanical</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="environmental">Environmental</SelectItem><SelectItem value="operational">Operational</SelectItem></SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Likelihood (1-5)</Label><Select value={form.likelihood} onValueChange={v => setForm({ ...form, likelihood: v })}><SelectTrigger><SelectValue placeholder="1-5" /></SelectTrigger><SelectContent><SelectItem value="1">1 - Rare</SelectItem><SelectItem value="2">2 - Unlikely</SelectItem><SelectItem value="3">3 - Possible</SelectItem><SelectItem value="4">4 - Likely</SelectItem><SelectItem value="5">5 - Almost Certain</SelectItem></SelectContent></Select></div>
                    <div className="grid gap-2"><Label className="text-xs">Consequence (1-5)</Label><Select value={form.consequence} onValueChange={v => setForm({ ...form, consequence: v })}><SelectTrigger><SelectValue placeholder="1-5" /></SelectTrigger><SelectContent><SelectItem value="1">1 - Negligible</SelectItem><SelectItem value="2">2 - Minor</SelectItem><SelectItem value="3">3 - Moderate</SelectItem><SelectItem value="4">4 - Major</SelectItem><SelectItem value="5">5 - Catastrophic</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid gap-2"><Label className="text-xs">Mitigation Plan</Label><Textarea placeholder="Describe mitigation measures..." value={form.mitigationPlan} onChange={e => setForm({ ...form, mitigationPlan: e.target.value })} rows={3} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Assessor</Label><Input placeholder="e.g. Sarah Chen" value={form.assessor} onChange={e => setForm({ ...form, assessor: e.target.value })} /></div>
                </div>
            </ResponsiveDialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search assets, assessment IDs..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={levelFilter} onValueChange={setLevelFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Risk Level" /></SelectTrigger><SelectContent><SelectItem value="all">All Levels</SelectItem><SelectItem value="extreme">Extreme</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">ID</TableHead><TableHead className="text-xs">Asset</TableHead><TableHead className="text-xs hidden md:table-cell">Description</TableHead><TableHead className="text-xs text-center">L</TableHead><TableHead className="text-xs text-center">C</TableHead><TableHead className="text-xs text-center">Risk Score</TableHead><TableHead className="text-xs">Level</TableHead><TableHead className="text-xs hidden lg:table-cell">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Date</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader><TableBody>
              {filtered.map(a => {
                const rs = (a.likelihood || 0) * (a.consequence || 0);
                const dl = mapRiskLevel(a.riskLevel || '');
                return (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{a.assessmentNumber}</TableCell>
                  <TableCell className="font-medium text-sm">{a.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{a.description || '-'}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{a.likelihood ?? '-'}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{a.consequence ?? '-'}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className={`text-[10px] font-bold ${riskScoreColor(rs)}`}>{rs || '-'}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${riskLevelColors[a.riskLevel] || riskLevelColors[dl] || ''}`}>{dl || a.riskLevel || '-'}</Badge></TableCell>
                  <TableCell className="text-xs capitalize hidden lg:table-cell"><Badge variant="outline" className="text-[10px]">{(a.status || 'open').replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(a.assessmentDate)}</TableCell>
                  <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setViewItem(a)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem onClick={() => handleEditOpen(a)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={10}><EmptyState icon={TriangleAlert} title="No assessments found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
      </>}
      <ResponsiveDialog open={!!viewItem} onOpenChange={open => { if (!open) setViewItem(null); }} title="Risk Assessment Details" description="View assessment information" footer={<Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>}>
          {viewItem && <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2"><span className="text-muted-foreground">Title</span><p className="font-medium">{viewItem.title || '-'}</p></div>
            <div><span className="text-muted-foreground">Type</span><p className="font-medium capitalize">{viewItem.type || '-'}</p></div>
            <div><span className="text-muted-foreground">Status</span><p className="font-medium capitalize">{(viewItem.status || 'open').replace(/_/g, ' ')}</p></div>
            <div><span className="text-muted-foreground">Assessor</span><p className="font-medium">{viewItem.assessor || '-'}</p></div>
            <div><span className="text-muted-foreground">Department</span><p className="font-medium">{viewItem.department || '-'}</p></div>
            <div><span className="text-muted-foreground">Assessment Date</span><p className="font-medium">{formatDate(viewItem.assessmentDate)}</p></div>
            <div><span className="text-muted-foreground">Risk Level</span><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${riskLevelColors[viewItem.riskLevel] || ''}`}>{mapRiskLevel(viewItem.riskLevel || '') || '-'}</Badge></div>
            <div><span className="text-muted-foreground">Likelihood</span><p className="font-medium">{viewItem.likelihood ?? '-'}</p></div>
            <div><span className="text-muted-foreground">Consequence</span><p className="font-medium">{viewItem.consequence ?? '-'}</p></div>
            <div className="col-span-2"><span className="text-muted-foreground">Description</span><p className="font-medium">{viewItem.description || '-'}</p></div>
            <div className="col-span-2"><span className="text-muted-foreground">Hazards</span><p className="font-medium">{parseJsonArr(viewItem.hazards)}</p></div>
            <div className="col-span-2"><span className="text-muted-foreground">Mitigations</span><p className="font-medium">{parseJsonArr(viewItem.controls)}</p></div>
          </div>}
      </ResponsiveDialog>
      <ResponsiveDialog open={!!editItem} onOpenChange={open => { if (!open) setEditItem(null); }} title="Edit Risk Assessment" description="Update assessment details" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button><Button onClick={handleEditSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button></div>}>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mechanical">Mechanical</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="environmental">Environmental</SelectItem><SelectItem value="operational">Operational</SelectItem></SelectContent></Select></div>
              <div><Label>Status</Label><Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assessor</Label><Input value={editForm.assessor} onChange={e => setEditForm(f => ({ ...f, assessor: e.target.value }))} /></div>
              <div><Label>Department</Label><Input value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assessment Date</Label><Input type="date" value={editForm.assessmentDate} onChange={e => setEditForm(f => ({ ...f, assessmentDate: e.target.value }))} /></div>
              <div><Label>Risk Level</Label><Select value={editForm.riskLevel} onValueChange={v => setEditForm(f => ({ ...f, riskLevel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="extreme">Extreme</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div><Label>Hazards</Label><Textarea value={editForm.hazards} onChange={e => setEditForm(f => ({ ...f, hazards: e.target.value }))} rows={2} placeholder="Describe hazards..." /></div>
            <div><Label>Mitigations</Label><Textarea value={editForm.mitigations} onChange={e => setEditForm(f => ({ ...f, mitigations: e.target.value }))} rows={2} placeholder="Describe mitigation measures..." /></div>
          </div>
      </ResponsiveDialog>
    </div>
  );
}

export function MaintenanceToolsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', location: '', serialNumber: '', condition: '', plantId: '', assignedToId: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ total: 0, available: 0, checkedOut: 0, inRepair: 0, retired: 0 });

  const loadTools = async () => {
    try {
      const res = await api.get('/api/tools');
      if (res.success && res.data) {
        setTools(Array.isArray(res.data) ? res.data : []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/tools');
        if (res.success && res.data) {
          setTools(Array.isArray(res.data) ? res.data : []);
          if (res.kpis) setKpis(res.kpis);
        }
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const toolStatusColors: Record<string, string> = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    checked_out: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
    in_repair: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    transferred: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
    retired: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800',
  };

  const kpiCards = [
    { label: 'Total Tools', value: kpis.total, icon: WrenchIcon, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'Available', value: kpis.available, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Checked Out', value: kpis.checkedOut, icon: ArrowRightLeft, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Needs Repair', value: kpis.inRepair, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  const filtered = tools.filter((t: any) => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.toolCode?.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!form.name || !form.category) { toast.error('Tool name and category are required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/api/tools', { ...form });
      if (res.success) {
        toast.success('Tool added successfully');
        setCreateOpen(false);
        setForm({ name: '', category: '', location: '', serialNumber: '', condition: '', plantId: '', assignedToId: '' });
        loadTools();
      } else {
        toast.error(res.error || 'Failed to add tool');
      }
    } catch { toast.error('Failed to add tool'); }
    setSaving(false);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Tools</h1><p className="text-muted-foreground mt-1">Manage maintenance tool inventory, assignments, and condition tracking</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><CardTitle className="text-base">Tool Inventory</CardTitle><CardDescription className="text-xs">Track tool availability, assignments, and condition</CardDescription></div>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" />Add Tool</Button>
            <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen} title="Add New Tool" description="Register a new tool in the inventory" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Adding...' : 'Add Tool'}</Button></div>}>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2"><Label className="text-xs">Tool Name</Label><Input placeholder="e.g. Torque Wrench 1/2 inch" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Category</Label>
                      <SearchableSelect
                        value={form.category}
                        onValueChange={v => setForm({ ...form, category: v })}
                        options={[
                          { value: 'Hand Tool', label: 'Hand Tool', group: 'Tool Types' },
                          { value: 'Power Tool', label: 'Power Tool', group: 'Tool Types' },
                          { value: 'Measurement', label: 'Measurement', group: 'Tool Types' },
                          { value: 'Safety', label: 'Safety', group: 'Tool Types' },
                          { value: 'Cutting', label: 'Cutting', group: 'Tool Types' },
                          { value: 'Welding', label: 'Welding', group: 'Tool Types' },
                          { value: 'Lifting', label: 'Lifting', group: 'Tool Types' },
                          { value: 'Pneumatic', label: 'Pneumatic', group: 'Tool Types' },
                          { value: 'Electrical', label: 'Electrical', group: 'Tool Types' },
                        ]}
                        placeholder="Select category..."
                        searchPlaceholder="Search categories..."
                        groupBy={false}
                      />
                    </div>
                    <div className="grid gap-2"><Label className="text-xs">Condition</Label><Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid gap-2"><Label className="text-xs">Location</Label><Input placeholder="e.g. Tool Room A-1" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Serial Number</Label><Input placeholder="e.g. SN-2024-001" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Plant</Label>
                    <AsyncSearchableSelect
                      value={form.plantId}
                      onValueChange={v => setForm({ ...form, plantId: v })}
                      fetchOptions={async () => {
                        const res = await api.get('/api/plants');
                        if (res.success && res.data) {
                          return (Array.isArray(res.data) ? res.data : []).map((p: any) => ({
                            value: p.id,
                            label: p.name,
                            group: p.city || p.location || undefined,
                          }));
                        }
                        return [];
                      }}
                      placeholder="Select plant..."
                      searchPlaceholder="Search plants..."
                    />
                  </div>
                  <div className="grid gap-2"><Label className="text-xs">Assigned To</Label>
                    <AsyncSearchableSelect
                      value={form.assignedToId}
                      onValueChange={v => setForm({ ...form, assignedToId: v })}
                      fetchOptions={async () => {
                        const res = await api.get('/api/users');
                        if (res.success && res.data) {
                          return (Array.isArray(res.data) ? res.data : []).map((u: any) => ({
                            value: u.id,
                            label: `${u.fullName || u.username} (${u.username || ''})`,
                          }));
                        }
                        return [];
                      }}
                      placeholder="Select user..."
                      searchPlaceholder="Search users..."
                    />
                  </div>
                </div>
            </ResponsiveDialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search tools, locations..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="checked_out">Checked Out</SelectItem><SelectItem value="in_repair">In Repair</SelectItem><SelectItem value="retired">Retired</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">Code</TableHead><TableHead className="text-xs">Tool Name</TableHead><TableHead className="text-xs hidden md:table-cell">Category</TableHead><TableHead className="text-xs hidden lg:table-cell">Location</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Assigned To</TableHead><TableHead className="text-xs hidden lg:table-cell">Checked Out</TableHead></TableRow></TableHeader><TableBody>
              {loading && <TableRow><TableCell colSpan={7}><div className="flex items-center justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></TableCell></TableRow>}
              {!loading && filtered.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{t.toolCode}</TableCell>
                  <TableCell className="font-medium text-sm">{t.name}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{t.category?.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-xs hidden lg:table-cell"><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{t.location || '-'}</div></TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${toolStatusColors[t.status] || ''}`}>{t.status?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{t.assignedTo?.fullName || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(t.checkedOutAt)}</TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState icon={WrenchIcon} title="No tools found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// INVENTORY SUBPAGES
// ============================================================================

