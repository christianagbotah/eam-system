'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package, Wrench, ArrowRightLeft, Clock, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, FileText, MoreHorizontal, Plus,
  Search, Filter, Eye, RotateCcw, Send, ShieldCheck, Warehouse,
  Timer, Activity, Ban, ChevronDown, ClipboardList, BarChart3,
  ArrowLeftRight, PackageCheck, PackageOpen, User, CircleDot,
  Handshake, Truck, DollarSign, RefreshCw, X, Info,
} from 'lucide-react';
import { EmptyState, LoadingSkeleton, formatCurrency } from '@/components/shared/helpers';
import { AsyncSearchableSelect } from '@/components/ui/searchable-select';

// ============================================================================
// SHARED HELPERS
// ============================================================================

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  supervisor_approved: 'bg-blue-100 text-blue-800',
  storekeeper_approved: 'bg-indigo-100 text-indigo-800',
  issued: 'bg-green-100 text-green-800',
  partially_returned: 'bg-teal-100 text-teal-800',
  fully_returned: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
  transferred: 'bg-emerald-100 text-emerald-800',
  pending_review: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rework_requested: 'bg-red-100 text-red-800',
  pending_closure: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-700',
  planned: 'bg-purple-100 text-purple-800',
  unplanned: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant="outline" className={statusColors[status] || 'bg-gray-100 text-gray-800'}>{label}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = { low: 'bg-slate-100 text-slate-700', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
  return <Badge variant="outline" className={colors[priority] || 'bg-gray-100'}>{priority?.toUpperCase()}</Badge>;
}

// ============================================================================
// SHARED SUB-COMPONENTS
// ============================================================================

const URGENCY_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-700 border-slate-300', dotColor: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-300', dotColor: 'bg-amber-500' },
  high: { label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-300', dotColor: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'bg-red-50 text-red-700 border-red-300', dotColor: 'bg-red-500' },
};

function UrgencyBadge({ urgency }: { urgency: string }) {
  const cfg = URGENCY_CONFIG[urgency];
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1.5 text-xs font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </Badge>
  );
}

type PipelineStage = { key: string; label: string; icon: React.ElementType };

function MiniPipeline({ stages, currentStatus, rejected }: { stages: PipelineStage[]; currentStatus: string; rejected?: boolean }) {
  const currentIndex = stages.findIndex(s => s.key === currentStatus);
  if (rejected) {
    return (
      <div className="flex items-center gap-0.5">
        {stages.map((s, i) => (
          <TooltipProvider key={s.key} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`h-2 w-2 rounded-full ${i === currentIndex ? 'bg-red-500' : i < currentIndex ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{s.label}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      {stages.map((s, i) => (
        <TooltipProvider key={s.key} delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`h-2 w-2 rounded-full transition-colors ${i <= currentIndex ? 'bg-teal-500' : 'bg-gray-200'}`} />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{s.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

function AvatarPlaceholder({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const sz = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function OverduePulse({ isOverdue, date }: { isOverdue: boolean; date: string }) {
  const timeAgo = formatDistanceToNow(new Date(date), { addSuffix: true });
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {isOverdue && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>}
      {timeAgo}
    </div>
  );
}

function StatsCard({ icon: Icon, count, label, color, bgColor, subtext }: {
  icon: React.ElementType; count: number | string; label: string;
  color: string; bgColor: string; subtext?: string;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`${bgColor} p-2.5 rounded-lg`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold tracking-tight">{count}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
          </div>
          {subtext && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{subtext}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ClearFiltersButton({ onClick, count }: { onClick: () => void; count: number }) {
  if (count === 0) return null;
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="h-9 text-muted-foreground hover:text-foreground gap-1.5">
      <X className="h-3.5 w-3.5" /> Clear <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">{count}</Badge>
    </Button>
  );
}

function RejectDialog({ open, onClose, onConfirm, title }: {
  open: boolean; onClose: () => void; onConfirm: (reason: string) => void; title: string;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (!open) setReason(''); }, [open]);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Please provide a reason (minimum 10 characters).</DialogDescription></DialogHeader>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection..." rows={3} />
        {reason.length > 0 && reason.length < 10 && <p className="text-xs text-amber-600">{10 - reason.length} more characters needed</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={reason.trim().length < 10} onClick={() => { onConfirm(reason); onClose(); }}>Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuantityDialog({ open, onClose, onConfirm, title, description, max, fieldLabel }: {
  open: boolean; onClose: () => void; onConfirm: (qty: number) => void;
  title: string; description: string; max: number; fieldLabel: string;
}) {
  const [value, setValue] = useState('');
  useEffect(() => { if (!open) setValue(''); }, [open]);
  const q = parseFloat(value);
  const valid = !isNaN(q) && q > 0 && q <= max;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="space-y-2">
          <Label>{fieldLabel}</Label>
          <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="Enter quantity" min={1} max={max} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Max available: {max}</span>
            {valid && <span className="text-emerald-600 font-medium">{formatCurrency(q * 0)} estimated</span>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!valid} onClick={() => { onConfirm(q); onClose(); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConditionSelectDialog({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void; onConfirm: (condition: string) => void;
}) {
  const [condition, setCondition] = useState('good');
  const options = [
    { value: 'excellent', label: 'Excellent', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'good', label: 'Good', color: 'bg-teal-100 text-teal-800' },
    { value: 'fair', label: 'Fair', color: 'bg-amber-100 text-amber-800' },
    { value: 'poor', label: 'Poor', color: 'bg-orange-100 text-orange-800' },
    { value: 'damaged', label: 'Damaged', color: 'bg-red-100 text-red-800' },
  ];
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Select Tool Condition</DialogTitle><DialogDescription>Assess the current condition of the tool.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {options.map(o => (
            <button key={o.value} onClick={() => setCondition(o.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${condition === o.value ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${o.color} mb-1`}>{o.label}</span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { onConfirm(condition); onClose(); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailTimeline({ events }: { events: Array<{ label: string; date?: string; user?: string; notes?: string; status?: string }> }) {
  return (
    <div className="space-y-0">
      {events.map((ev, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`h-3 w-3 rounded-full border-2 ${ev.status === 'rejected' ? 'bg-red-400 border-red-300' : ev.date ? 'bg-teal-500 border-teal-300' : 'bg-gray-200 border-gray-300'}`} />
            {i < events.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
          </div>
          <div className="pb-4 min-w-0">
            <p className="text-sm font-medium">{ev.label}</p>
            {ev.date && <p className="text-xs text-muted-foreground">{format(new Date(ev.date), 'MMM d, yyyy h:mm a')}</p>}
            {ev.user && <p className="text-xs text-muted-foreground">by {ev.user}</p>}
            {ev.notes && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">{ev.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MATERIAL REQUEST PIPELINE CONFIG
// ============================================================================

const MATERIAL_STAGES: PipelineStage[] = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'supervisor_approved', label: 'Supervisor Review', icon: ShieldCheck },
  { key: 'storekeeper_approved', label: 'Store Review', icon: Warehouse },
  { key: 'issued', label: 'Issued', icon: PackageCheck },
  { key: 'fully_returned', label: 'Returned', icon: RotateCcw },
];

const TOOL_STAGES: PipelineStage[] = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'supervisor_approved', label: 'Supervisor Review', icon: ShieldCheck },
  { key: 'storekeeper_approved', label: 'Store Review', icon: Warehouse },
  { key: 'issued', label: 'Issued', icon: Wrench },
  { key: 'returned', label: 'Returned', icon: RotateCcw },
];

const TRANSFER_STAGES: PipelineStage[] = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'storekeeper_approved', label: 'Storekeeper Review', icon: ShieldCheck },
  { key: 'awaiting_handover', label: 'Handover', icon: Handshake },
  { key: 'transferred', label: 'Transferred', icon: ArrowRightLeft },
];

// ============================================================================
// PAGE 1: REPAIR MATERIAL REQUESTS
// ============================================================================

export function RepairMaterialRequestsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; action: string } | null>(null);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [qtyTarget, setQtyTarget] = useState<{ id: string; action: string; max: number; field: string } | null>(null);
  const [createForm, setCreateForm] = useState({ workOrderId: '', itemName: '', itemId: '', quantityRequested: '', unit: 'each', unitCost: '', reason: '', notes: '', urgency: 'medium' });

  const activeFilters = useMemo(() => {
    let c = 0;
    if (filterStatus !== 'all') c++;
    if (filterUrgency !== 'all') c++;
    if (searchText) c++;
    return c;
  }, [filterStatus, filterUrgency, searchText]);

  const clearFilters = () => { setFilterStatus('all'); setFilterUrgency('all'); setSearchText(''); setPage(1); };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterUrgency !== 'all') params.set('urgency', filterUrgency);
    params.set('page', String(page));
    params.set('limit', '20');
    const [listRes, statsRes] = await Promise.all([
      api.get(`/api/repairs/material-requests?${params}`),
      api.get('/api/repairs/material-requests?stats=true'),
    ]);
    if (listRes.success) setRequests(listRes.data || []);
    else toast.error(listRes.error || 'Failed to load');
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, filterUrgency, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreate = async () => {
    if (!createForm.workOrderId || !createForm.itemName || !createForm.quantityRequested || !createForm.reason || createForm.reason.length < 5) {
      toast.error('Work Order, Item Name, Quantity, and Reason (min 5 chars) are required');
      return;
    }
    setSubmitting(true);
    const res = await api.post('/api/repairs/material-requests', {
      workOrderId: createForm.workOrderId, itemId: createForm.itemId || undefined,
      itemName: createForm.itemName, quantityRequested: parseFloat(createForm.quantityRequested),
      unit: createForm.unit, unitCost: createForm.unitCost ? parseFloat(createForm.unitCost) : undefined,
      reason: createForm.reason, notes: createForm.notes || undefined, urgency: createForm.urgency,
    });
    if (res.success) {
      toast.success('Material request created'); setCreateOpen(false);
      setCreateForm({ workOrderId: '', itemName: '', itemId: '', quantityRequested: '', unit: 'each', unitCost: '', reason: '', notes: '', urgency: 'medium' });
      fetchRequests();
    } else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const handleAction = async (id: string, action: string, extra?: Record<string, any>) => {
    setSubmitting(true);
    const res = await api.post(`/api/repairs/material-requests/${id}`, { action, ...extra });
    if (res.success) { toast.success('Action completed'); fetchRequests(); if (detailOpen && detailItem?.id === id) setDetailOpen(false); }
    else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    const res = await api.delete(`/api/repairs/material-requests/${id}`);
    if (res.success) { toast.success('Request cancelled'); fetchRequests(); } else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const filtered = useMemo(() => requests.filter(r =>
    !searchText || r.itemName?.toLowerCase().includes(searchText.toLowerCase()) || r.workOrder?.woNumber?.toLowerCase().includes(searchText.toLowerCase())
  ), [requests, searchText]);

  const estimatedCost = useMemo(() => {
    const qty = parseFloat(createForm.quantityRequested) || 0;
    const cost = parseFloat(createForm.unitCost) || 0;
    return qty * cost;
  }, [createForm.quantityRequested, createForm.unitCost]);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl"><Package className="h-6 w-6 text-amber-700" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Material Requests</h2>
              <Badge variant="secondary" className="font-mono">{requests.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Request and track materials &amp; spare parts for repair work orders</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard icon={Clock} count={stats?.byStatus?.pending ?? requests.filter(r => r.status === 'pending').length} label="Pending" color="text-yellow-600" bgColor="bg-yellow-50" />
        <StatsCard icon={ShieldCheck} count={((stats?.byStatus?.supervisor_approved || 0) + (stats?.byStatus?.storekeeper_approved || 0)) || requests.filter(r => ['supervisor_approved', 'storekeeper_approved'].includes(r.status)).length} label="Awaiting Approval" color="text-sky-600" bgColor="bg-sky-50" />
        <StatsCard icon={PackageCheck} count={stats?.byStatus?.issued ?? requests.filter(r => r.status === 'issued').length} label="Issued" color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatsCard icon={AlertTriangle} count={stats?.overdueCount ?? requests.filter(r => r.isOverdue).length} label="Overdue" color="text-red-600" bgColor="bg-red-50" subtext="!" />
        <StatsCard icon={DollarSign} count={formatCurrency(stats?.totalCost || 0)} label="Total Cost" color="text-teal-600" bgColor="bg-teal-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items or WO#..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="supervisor_approved">Supervisor Approved</SelectItem>
            <SelectItem value="storekeeper_approved">Store Approved</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUrgency} onValueChange={(v) => { setFilterUrgency(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <ClearFiltersButton onClick={clearFilters} count={activeFilters} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={Package} title="No material requests found" description="Create a new request to get started">
              <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[220px]">Item</TableHead>
                    <TableHead className="w-[90px]">WO #</TableHead>
                    <TableHead className="w-[60px]">Urgency</TableHead>
                    <TableHead className="w-[120px]">Quantity</TableHead>
                    <TableHead className="w-[180px]">Status</TableHead>
                    <TableHead className="w-[130px]">Requested By</TableHead>
                    <TableHead className="w-[110px]">Time</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, idx) => (
                    <TableRow key={r.id} className={`cursor-pointer hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                      onClick={() => { setDetailItem(r); setDetailOpen(true); }}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.itemName}</div>
                        <div className="text-xs text-muted-foreground">{r.unit} · {formatCurrency(r.unitCost || 0)}/unit</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{r.workOrder?.woNumber}</Badge></TableCell>
                      <TableCell>{r.urgency && <UrgencyBadge urgency={r.urgency} />}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.quantityRequested}</div>
                        <div className="text-[11px] text-muted-foreground">App: {r.quantityApproved ?? '—'} · Iss: {r.quantityIssued ?? '—'} · Ret: {r.quantityReturned ?? '—'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={r.status} />
                          <MiniPipeline stages={MATERIAL_STAGES} currentStatus={r.status} rejected={r.status === 'rejected'} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AvatarPlaceholder name={r.requestedBy?.fullName || ''} />
                          <span className="text-sm truncate max-w-[80px]">{r.requestedBy?.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell><OverduePulse isOverdue={r.isOverdue} date={r.createdAt} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {r.status === 'pending' && (
                            <>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleAction(r.id, 'supervisor_approve')}><CheckCircle2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Approve</TooltipContent></Tooltip></TooltipProvider>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget({ id: r.id, action: 'supervisor_reject' }); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                            </>
                          )}
                          {r.status === 'supervisor_approved' && (
                            <>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => handleAction(r.id, 'storekeeper_approve')}><Warehouse className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Store Approve</TooltipContent></Tooltip></TooltipProvider>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget({ id: r.id, action: 'storekeeper_reject' }); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                            </>
                          )}
                          {r.status === 'storekeeper_approved' && (
                            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setQtyTarget({ id: r.id, action: 'issue', max: r.quantityApproved, field: 'quantityToIssue' }); setQtyOpen(true); }}>
                              <PackageCheck className="h-3.5 w-3.5" /> Issue
                            </Button>
                          )}
                          {r.status === 'issued' && (
                            <Button size="sm" variant="outline" className="h-7 gap-1 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => { setQtyTarget({ id: r.id, action: 'record_return', max: r.quantityIssued, field: 'quantityToReturn' }); setQtyOpen(true); }}>
                              <RotateCcw className="h-3.5 w-3.5" /> Return
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setDetailItem(r); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                              {r.status === 'pending' && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Ban className="h-4 w-4 mr-2" /> Cancel</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-amber-600" /> {detailItem.itemName}</SheetTitle>
                <SheetDescription>Material Request — {detailItem.workOrder?.woNumber}</SheetDescription>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList className="w-full"><TabsTrigger value="details" className="flex-1">Details</TabsTrigger><TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger></TabsList>
                <TabsContent value="details" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={detailItem.status} /></div></div>
                    <div><Label className="text-xs text-muted-foreground">Urgency</Label><div className="mt-1">{detailItem.urgency ? <UrgencyBadge urgency={detailItem.urgency} /> : '—'}</div></div>
                    <div><Label className="text-xs text-muted-foreground">Unit</Label><p className="text-sm mt-1">{detailItem.unit}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Unit Cost</Label><p className="text-sm mt-1">{formatCurrency(detailItem.unitCost || 0)}</p></div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Quantity Breakdown</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Requested', val: detailItem.quantityRequested, color: 'text-foreground' },
                        { label: 'Approved', val: detailItem.quantityApproved ?? '—', color: 'text-sky-600' },
                        { label: 'Issued', val: detailItem.quantityIssued ?? '—', color: 'text-emerald-600' },
                        { label: 'Returned', val: detailItem.quantityReturned ?? '—', color: 'text-amber-600' },
                      ].map(q => (
                        <div key={q.label} className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className={`text-lg font-bold ${q.color}`}>{q.val}</p><p className="text-[10px] text-muted-foreground">{q.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Requested By</Label>
                    <div className="flex items-center gap-2"><AvatarPlaceholder name={detailItem.requestedBy?.fullName || ''} /><span className="text-sm">{detailItem.requestedBy?.fullName}</span></div>
                  </div>
                  <div><Label className="text-xs text-muted-foreground">Reason</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.reason}</p></div>
                  {detailItem.notes && <div><Label className="text-xs text-muted-foreground">Notes</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.notes}</p></div>}
                  {(detailItem.status === 'pending' || detailItem.status === 'supervisor_approved' || detailItem.status === 'storekeeper_approved' || detailItem.status === 'issued') && (
                    <>
                      <Separator />
                      <div className="flex flex-wrap gap-2">
                        {detailItem.status === 'pending' && (
                          <>
                            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(detailItem.id, 'supervisor_approve')} disabled={submitting}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setRejectTarget({ id: detailItem.id, action: 'supervisor_reject' }); setRejectOpen(true); }} disabled={submitting}>Reject</Button>
                          </>
                        )}
                        {detailItem.status === 'supervisor_approved' && (
                          <>
                            <Button size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => handleAction(detailItem.id, 'storekeeper_approve')} disabled={submitting}><Warehouse className="h-3.5 w-3.5" /> Store Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setRejectTarget({ id: detailItem.id, action: 'storekeeper_reject' }); setRejectOpen(true); }} disabled={submitting}>Reject</Button>
                          </>
                        )}
                        {detailItem.status === 'storekeeper_approved' && (
                          <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setQtyTarget({ id: detailItem.id, action: 'issue', max: detailItem.quantityApproved, field: 'quantityToIssue' }); setQtyOpen(true); }} disabled={submitting}><PackageCheck className="h-3.5 w-3.5" /> Issue</Button>
                        )}
                        {detailItem.status === 'issued' && (
                          <Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700" onClick={() => { setQtyTarget({ id: detailItem.id, action: 'record_return', max: detailItem.quantityIssued, field: 'quantityToReturn' }); setQtyOpen(true); }} disabled={submitting}><RotateCcw className="h-3.5 w-3.5" /> Return</Button>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>
                <TabsContent value="timeline" className="mt-4">
                  <DetailTimeline events={[
                    { label: 'Request Created', date: detailItem.createdAt, user: detailItem.requestedBy?.fullName, status: 'active' },
                    { label: 'Supervisor Approval', date: detailItem.supervisorApprovedAt, user: detailItem.supervisorApprovedBy?.fullName, status: detailItem.status },
                    { label: 'Store Approval', date: detailItem.storekeeperApprovedAt, user: detailItem.storekeeperApprovedBy?.fullName, status: detailItem.status },
                    { label: 'Material Issued', date: detailItem.issuedAt, user: detailItem.issuedBy?.fullName },
                    { label: 'Material Returned', date: detailItem.returnedAt, user: detailItem.returnedBy?.fullName },
                  ].filter(e => e.date || e.status === 'active')} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Material Request</DialogTitle><DialogDescription>Request materials/spare parts for a work order</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Work Order *</Label><AsyncSearchableSelect value={createForm.workOrderId} onValueChange={(v) => setCreateForm(f => ({ ...f, workOrderId: v }))} placeholder="Select work order..." searchPlaceholder="Search work orders..." fetchOptions={async () => { const res = await api.get('/api/work-orders?limit=999'); if (res.success && res.data) return res.data.map((w: any) => ({ value: w.id, label: `${w.woNumber} — ${w.title}` })); return []; }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Item Name *</Label><Input value={createForm.itemName} onChange={(e) => setCreateForm({ ...createForm, itemName: e.target.value })} placeholder="e.g. Bearing 6205" /></div>
              <div><Label>Inventory Item</Label><AsyncSearchableSelect value={createForm.itemId} onValueChange={(v) => setCreateForm(f => ({ ...f, itemId: v }))} placeholder="Link to inventory..." searchPlaceholder="Search inventory..." fetchOptions={async () => { const res = await api.get('/api/inventory?limit=999'); if (res.success && res.data) return res.data.map((i: any) => ({ value: i.id, label: `${i.name} (${i.itemCode})` })); return []; }} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Quantity *</Label><Input type="number" value={createForm.quantityRequested} onChange={(e) => setCreateForm({ ...createForm, quantityRequested: e.target.value })} /></div>
              <div><Label>Unit</Label><Select value={createForm.unit} onValueChange={(v) => setCreateForm({ ...createForm, unit: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="each">Each</SelectItem><SelectItem value="kg">Kg</SelectItem><SelectItem value="meter">Meter</SelectItem><SelectItem value="set">Set</SelectItem><SelectItem value="liter">Liter</SelectItem></SelectContent></Select></div>
              <div><Label>Unit Cost</Label><Input type="number" step="0.01" value={createForm.unitCost} onChange={(e) => setCreateForm({ ...createForm, unitCost: e.target.value })} /></div>
            </div>
            {estimatedCost > 0 && <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-teal-600" /><span className="text-sm font-medium text-teal-700">Estimated cost: {formatCurrency(estimatedCost)}</span></div>}
            <div><Label>Urgency</Label><div className="flex gap-2 mt-1">{Object.entries(URGENCY_CONFIG).map(([key, cfg]) => (<button key={key} onClick={() => setCreateForm(f => ({ ...f, urgency: key }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${createForm.urgency === key ? cfg.color + ' ring-2 ring-offset-1 ring-gray-300' : 'border-gray-200 text-muted-foreground hover:border-gray-300'}`}><span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />{cfg.label}</button>))}</div></div>
            <div><Label>Reason * <span className="text-xs text-muted-foreground">(min 5 chars)</span></Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} placeholder="Why is this material needed?" rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Additional information..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={submitting} className="gap-2"><Send className="h-4 w-4" /> Submit Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectDialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectTarget(null); }} onConfirm={(reason) => { if (rejectTarget) handleAction(rejectTarget.id, rejectTarget.action, { notes: reason }); }} title="Reject Material Request" />
      <QuantityDialog open={qtyOpen} onClose={() => { setQtyOpen(false); setQtyTarget(null); }} onConfirm={(qty) => { if (qtyTarget) handleAction(qtyTarget.id, qtyTarget.action, { [qtyTarget.field]: qty }); }} title={qtyTarget?.action === 'issue' ? 'Issue Quantity' : 'Return Quantity'} description={qtyTarget?.action === 'issue' ? `Enter quantity to issue (max ${qtyTarget?.max || 0})` : `Enter quantity to return (max ${qtyTarget?.max || 0})`} max={qtyTarget?.max || 0} fieldLabel={qtyTarget?.action === 'issue' ? 'Quantity to Issue' : 'Quantity to Return'} />
    </div>
  );
}

// ============================================================================
// PAGE 2: REPAIR TOOL REQUESTS
// ============================================================================

export function RepairToolRequestsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; action: string } | null>(null);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [conditionTarget, setConditionTarget] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ workOrderId: '', toolId: '', toolName: '', reason: '', notes: '', urgency: 'medium' });

  const activeFilters = useMemo(() => {
    let c = 0; if (filterStatus !== 'all') c++; if (filterUrgency !== 'all') c++; if (searchText) c++; return c;
  }, [filterStatus, filterUrgency, searchText]);
  const clearFilters = () => { setFilterStatus('all'); setFilterUrgency('all'); setSearchText(''); };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterUrgency !== 'all') params.set('urgency', filterUrgency);
    params.set('limit', '50');
    const [listRes, statsRes] = await Promise.all([
      api.get(`/api/repairs/tool-requests?${params}`),
      api.get('/api/repairs/tool-requests?stats=true'),
    ]);
    if (listRes.success) setRequests(listRes.data || []); else toast.error(listRes.error || 'Failed');
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, filterUrgency]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreate = async () => {
    if (!createForm.workOrderId || !createForm.toolName || !createForm.reason || createForm.reason.length < 5) {
      toast.error('Work Order, Tool Name, and Reason (min 5 chars) are required'); return;
    }
    setSubmitting(true);
    const res = await api.post('/api/repairs/tool-requests', { ...createForm, toolId: createForm.toolId || undefined });
    if (res.success) { toast.success('Tool request created'); setCreateOpen(false); setCreateForm({ workOrderId: '', toolId: '', toolName: '', reason: '', notes: '', urgency: 'medium' }); fetchRequests(); }
    else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const handleAction = async (id: string, action: string, extra?: Record<string, any>) => {
    setSubmitting(true);
    const res = await api.post(`/api/repairs/tool-requests/${id}`, { action, ...extra });
    if (res.success) { toast.success('Action completed'); fetchRequests(); if (detailOpen && detailItem?.id === id) setDetailOpen(false); }
    else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const filtered = useMemo(() => requests.filter(r =>
    !searchText || r.toolName?.toLowerCase().includes(searchText.toLowerCase()) || r.workOrder?.woNumber?.toLowerCase().includes(searchText.toLowerCase())
  ), [requests, searchText]);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl"><Wrench className="h-6 w-6 text-orange-700" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Tool Requests</h2>
              <Badge variant="secondary" className="font-mono">{requests.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Request and track tools for repair work orders</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Clock} count={stats?.byStatus?.pending ?? requests.filter(r => r.status === 'pending').length} label="Pending" color="text-yellow-600" bgColor="bg-yellow-50" />
        <StatsCard icon={ShieldCheck} count={((stats?.byStatus?.supervisor_approved || 0) + (stats?.byStatus?.storekeeper_approved || 0)) || requests.filter(r => ['supervisor_approved', 'storekeeper_approved'].includes(r.status)).length} label="Awaiting Approval" color="text-sky-600" bgColor="bg-sky-50" />
        <StatsCard icon={Wrench} count={stats?.byStatus?.issued ?? requests.filter(r => r.status === 'issued').length} label="Issued / Out" color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatsCard icon={AlertTriangle} count={stats?.overdueCount ?? requests.filter(r => r.isOverdue).length} label="Overdue" color="text-red-600" bgColor="bg-red-50" subtext="!" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tools or WO#..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="supervisor_approved">Supervisor Approved</SelectItem><SelectItem value="storekeeper_approved">Store Approved</SelectItem><SelectItem value="issued">Issued</SelectItem><SelectItem value="returned">Returned</SelectItem></SelectContent>
        </Select>
        <Select value={filterUrgency} onValueChange={setFilterUrgency}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Urgency</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
        </Select>
        <ClearFiltersButton onClick={clearFilters} count={activeFilters} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={Wrench} title="No tool requests found" description="Create a new tool request to get started">
              <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="w-[200px]">Tool</TableHead>
                  <TableHead className="w-[90px]">WO #</TableHead>
                  <TableHead className="w-[70px]">Urgency</TableHead>
                  <TableHead className="w-[170px]">Status</TableHead>
                  <TableHead className="w-[130px]">Requested By</TableHead>
                  <TableHead className="w-[110px]">Time</TableHead>
                  <TableHead className="w-[130px] text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r, idx) => (
                    <TableRow key={r.id} className={`cursor-pointer hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                      onClick={() => { setDetailItem(r); setDetailOpen(true); }}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.toolName}</div>
                        <div className="text-xs text-muted-foreground">{r.tool?.toolCode || ''}{r.tool?.category ? ` · ${r.tool.category}` : ''}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{r.workOrder?.woNumber}</Badge></TableCell>
                      <TableCell>{r.urgency && <UrgencyBadge urgency={r.urgency} />}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={r.status} />
                          <MiniPipeline stages={TOOL_STAGES} currentStatus={r.status} rejected={r.status === 'rejected'} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AvatarPlaceholder name={r.requestedBy?.fullName || ''} />
                          <span className="text-sm truncate max-w-[80px]">{r.requestedBy?.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell><OverduePulse isOverdue={r.isOverdue} date={r.createdAt} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {r.status === 'pending' && (<>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleAction(r.id, 'supervisor_approve')}><CheckCircle2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Approve</TooltipContent></Tooltip></TooltipProvider>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget({ id: r.id, action: 'supervisor_reject' }); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                          </>)}
                          {r.status === 'supervisor_approved' && (<>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => handleAction(r.id, 'storekeeper_approve')}><Warehouse className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Store Approve</TooltipContent></Tooltip></TooltipProvider>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget({ id: r.id, action: 'storekeeper_reject' }); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                          </>)}
                          {r.status === 'storekeeper_approved' && (
                            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(r.id, 'issue')}><Wrench className="h-3.5 w-3.5" /> Issue</Button>
                          )}
                          {r.status === 'issued' && (
                            <Button size="sm" variant="outline" className="h-7 gap-1 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => { setConditionTarget(r.id); setConditionOpen(true); }}><RotateCcw className="h-3.5 w-3.5" /> Return</Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setDetailItem(r); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detailItem && (<>
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-orange-600" /> {detailItem.toolName}</SheetTitle>
              <SheetDescription>Tool Request — {detailItem.workOrder?.woNumber}</SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="details">
              <TabsList className="w-full"><TabsTrigger value="details" className="flex-1">Details</TabsTrigger><TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger></TabsList>
              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={detailItem.status} /></div></div>
                  <div><Label className="text-xs text-muted-foreground">Urgency</Label><div className="mt-1">{detailItem.urgency ? <UrgencyBadge urgency={detailItem.urgency} /> : '—'}</div></div>
                  {detailItem.tool?.toolCode && <div><Label className="text-xs text-muted-foreground">Tool Code</Label><p className="text-sm mt-1 font-mono">{detailItem.tool.toolCode}</p></div>}
                  {detailItem.tool?.category && <div><Label className="text-xs text-muted-foreground">Category</Label><p className="text-sm mt-1">{detailItem.tool.category}</p></div>}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Requested By</Label>
                  <div className="flex items-center gap-2"><AvatarPlaceholder name={detailItem.requestedBy?.fullName || ''} /><span className="text-sm">{detailItem.requestedBy?.fullName}</span></div>
                </div>
                <div><Label className="text-xs text-muted-foreground">Reason</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.reason}</p></div>
                {detailItem.toolConditionAtReturn && <div><Label className="text-xs text-muted-foreground">Return Condition</Label><p className="text-sm mt-1"><StatusBadge status={detailItem.toolConditionAtReturn} /></p></div>}
                {(detailItem.status === 'pending' || detailItem.status === 'supervisor_approved' || detailItem.status === 'storekeeper_approved' || detailItem.status === 'issued') && (<>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {detailItem.status === 'pending' && (<><Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(detailItem.id, 'supervisor_approve')} disabled={submitting}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button><Button size="sm" variant="destructive" onClick={() => { setRejectTarget({ id: detailItem.id, action: 'supervisor_reject' }); setRejectOpen(true); }} disabled={submitting}>Reject</Button></>)}
                    {detailItem.status === 'supervisor_approved' && (<><Button size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => handleAction(detailItem.id, 'storekeeper_approve')} disabled={submitting}><Warehouse className="h-3.5 w-3.5" /> Store Approve</Button><Button size="sm" variant="destructive" onClick={() => { setRejectTarget({ id: detailItem.id, action: 'storekeeper_reject' }); setRejectOpen(true); }} disabled={submitting}>Reject</Button></>)}
                    {detailItem.status === 'storekeeper_approved' && (<Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(detailItem.id, 'issue')} disabled={submitting}><Wrench className="h-3.5 w-3.5" /> Issue Tool</Button>)}
                    {detailItem.status === 'issued' && (<Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700" onClick={() => { setConditionTarget(detailItem.id); setConditionOpen(true); }} disabled={submitting}><RotateCcw className="h-3.5 w-3.5" /> Return Tool</Button>)}
                  </div>
                </>)}
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <DetailTimeline events={[
                  { label: 'Request Created', date: detailItem.createdAt, user: detailItem.requestedBy?.fullName, status: 'active' },
                  { label: 'Supervisor Approval', date: detailItem.supervisorApprovedAt, user: detailItem.supervisorApprovedBy?.fullName, status: detailItem.status },
                  { label: 'Store Approval', date: detailItem.storekeeperApprovedAt, user: detailItem.storekeeperApprovedBy?.fullName, status: detailItem.status },
                  { label: 'Tool Issued', date: detailItem.issuedAt, user: detailItem.issuedBy?.fullName },
                  { label: 'Tool Returned', date: detailItem.returnedAt, user: detailItem.returnedBy?.fullName },
                ].filter(e => e.date || e.status === 'active')} />
              </TabsContent>
            </Tabs>
          </>)}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Tool Request</DialogTitle><DialogDescription>Request tools for a repair work order</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Work Order *</Label><AsyncSearchableSelect value={createForm.workOrderId} onValueChange={(v) => setCreateForm(f => ({ ...f, workOrderId: v }))} placeholder="Select work order..." searchPlaceholder="Search work orders..." fetchOptions={async () => { const res = await api.get('/api/work-orders?limit=999'); if (res.success && res.data) return res.data.map((w: any) => ({ value: w.id, label: `${w.woNumber} — ${w.title}` })); return []; }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tool Name *</Label><Input value={createForm.toolName} onChange={(e) => setCreateForm({ ...createForm, toolName: e.target.value })} placeholder="e.g. Torque Wrench" /></div>
              <div><Label>Tool ID</Label><AsyncSearchableSelect value={createForm.toolId} onValueChange={(v) => setCreateForm(f => ({ ...f, toolId: v }))} placeholder="Link to tool..." searchPlaceholder="Search tools..." fetchOptions={async () => { const res = await api.get('/api/tools?limit=999'); if (res.success && res.data) return res.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.toolCode})` })); return []; }} /></div>
            </div>
            <div><Label>Urgency</Label><div className="flex gap-2 mt-1">{Object.entries(URGENCY_CONFIG).map(([key, cfg]) => (<button key={key} onClick={() => setCreateForm(f => ({ ...f, urgency: key }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${createForm.urgency === key ? cfg.color + ' ring-2 ring-offset-1 ring-gray-300' : 'border-gray-200 text-muted-foreground hover:border-gray-300'}`}><span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />{cfg.label}</button>))}</div></div>
            <div><Label>Reason * <span className="text-xs text-muted-foreground">(min 5 chars)</span></Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} placeholder="Why is this tool needed?" rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Additional information..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={submitting} className="gap-2"><Send className="h-4 w-4" /> Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectDialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectTarget(null); }} onConfirm={(reason) => { if (rejectTarget) handleAction(rejectTarget.id, rejectTarget.action, { notes: reason }); }} title="Reject Tool Request" />
      <ConditionSelectDialog open={conditionOpen} onClose={() => { setConditionOpen(false); setConditionTarget(null); }} onConfirm={(condition) => { if (conditionTarget) handleAction(conditionTarget, 'return', { toolConditionAtReturn: condition }); }} />
    </div>
  );
}

// ============================================================================
// PAGE 3: TOOL TRANSFER REQUESTS
// ============================================================================

export function RepairToolTransfersPage() {
  const { user } = useAuthStore();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [conditionTarget, setConditionTarget] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ toolId: '', fromUserId: '', toUserId: '', reason: '', notes: '' });

  const activeFilters = useMemo(() => { let c = 0; if (filterStatus !== 'all') c++; if (searchText) c++; return c; }, [filterStatus, searchText]);
  const clearFilters = () => { setFilterStatus('all'); setSearchText(''); };

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (searchText) params.set('search', searchText);
    params.set('limit', '50');
    const [listRes, statsRes] = await Promise.all([
      api.get(`/api/repairs/tool-transfers?${params}`),
      api.get('/api/repairs/tool-transfers?stats=true'),
    ]);
    if (listRes.success) setTransfers(listRes.data || []); else toast.error(listRes.error || 'Failed');
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, searchText]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const handleCreate = async () => {
    if (!createForm.toolId || !createForm.fromUserId || !createForm.toUserId || !createForm.reason || createForm.reason.length < 5) {
      toast.error('All fields required. Reason must be at least 5 characters.'); return;
    }
    if (createForm.fromUserId === createForm.toUserId) { toast.error('From and To users must be different'); return; }
    setSubmitting(true);
    const res = await api.post('/api/repairs/tool-transfers', createForm);
    if (res.success) { toast.success('Transfer request submitted'); setCreateOpen(false); setCreateForm({ toolId: '', fromUserId: '', toUserId: '', reason: '', notes: '' }); fetchTransfers(); }
    else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const handleAction = async (id: string, action: string, extra?: Record<string, any>) => {
    setSubmitting(true);
    const res = await api.post(`/api/repairs/tool-transfers/${id}`, { action, ...extra });
    if (res.success) { toast.success('Action completed'); fetchTransfers(); if (detailOpen && detailItem?.id === id) setDetailOpen(false); }
    else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const filtered = useMemo(() => transfers.filter(t =>
    !searchText || t.tool?.name?.toLowerCase().includes(searchText.toLowerCase()) || t.fromUser?.fullName?.toLowerCase().includes(searchText.toLowerCase()) || t.toUser?.fullName?.toLowerCase().includes(searchText.toLowerCase())
  ), [transfers, searchText]);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-xl"><ArrowRightLeft className="h-6 w-6 text-teal-700" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Tool Transfers</h2>
              <Badge variant="secondary" className="font-mono">{transfers.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Manage tool custody transfers between technicians</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Transfer</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Clock} count={stats?.byStatus?.pending ?? transfers.filter(t => t.status === 'pending').length} label="Pending Review" color="text-yellow-600" bgColor="bg-yellow-50" />
        <StatsCard icon={Handshake} count={stats?.byStatus?.storekeeper_approved ?? transfers.filter(t => t.status === 'storekeeper_approved').length} label="Awaiting Handover" color="text-sky-600" bgColor="bg-sky-50" />
        <StatsCard icon={CheckCircle2} count={stats?.byStatus?.transferred ?? transfers.filter(t => t.status === 'transferred').length} label="Completed" color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatsCard icon={XCircle} count={stats?.byStatus?.rejected ?? transfers.filter(t => t.status === 'rejected').length} label="Rejected" color="text-red-600" bgColor="bg-red-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tools, users..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="storekeeper_approved">Awaiting Handover</SelectItem><SelectItem value="transferred">Transferred</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
        </Select>
        <ClearFiltersButton onClick={clearFilters} count={activeFilters} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={ArrowRightLeft} title="No transfer requests found" description="Create a new transfer request to get started">
              <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Transfer</Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="w-[180px]">Tool</TableHead>
                  <TableHead className="w-[100px]">From</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[100px]">To</TableHead>
                  <TableHead className="w-[160px]">Status</TableHead>
                  <TableHead className="w-[110px]">Time</TableHead>
                  <TableHead className="w-[130px] text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((t, idx) => (
                    <TableRow key={t.id} className={`cursor-pointer hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                      onClick={() => { setDetailItem(t); setDetailOpen(true); }}>
                      <TableCell>
                        <div className="font-medium text-sm">{t.tool?.name || 'Unknown Tool'}</div>
                        <div className="text-xs text-muted-foreground">{t.tool?.toolCode || ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AvatarPlaceholder name={t.fromUser?.fullName || ''} />
                          <span className="text-sm truncate max-w-[70px]">{t.fromUser?.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center"><ArrowRightLeft className="h-4 w-4 text-muted-foreground" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AvatarPlaceholder name={t.toUser?.fullName || ''} />
                          <span className="text-sm truncate max-w-[70px]">{t.toUser?.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={t.status} />
                          <MiniPipeline stages={TRANSFER_STAGES} currentStatus={t.status} rejected={t.status === 'rejected'} />
                        </div>
                      </TableCell>
                      <TableCell><OverduePulse isOverdue={t.isOverdue} date={t.createdAt} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {t.status === 'pending' && (<>
                            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setConditionTarget(t.id); setConditionOpen(true); }}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget(t.id); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                          </>)}
                          {t.status === 'storekeeper_approved' && (
                            <Button size="sm" className="h-7 gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => handleAction(t.id, 'from_user_accept')}><Handshake className="h-3.5 w-3.5" /> Confirm Handover</Button>
                          )}
                          {t.status === 'awaiting_handover' && (
                            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(t.id, 'to_user_accept')}><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Receipt</Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setDetailItem(t); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                              {t.status === 'storekeeper_approved' && <DropdownMenuItem onClick={() => handleAction(t.id, 'to_user_accept')}><CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Receipt</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detailItem && (<>
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-teal-600" /> Transfer: {detailItem.tool?.name}</SheetTitle>
              <SheetDescription>{detailItem.tool?.toolCode || ''}</SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="details">
              <TabsList className="w-full"><TabsTrigger value="details" className="flex-1">Details</TabsTrigger><TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger></TabsList>
              <TabsContent value="details" className="mt-4 space-y-4">
                <div><Label className="text-xs text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={detailItem.status} /></div></div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><AvatarPlaceholder name={detailItem.fromUser?.fullName || ''} size="md" /><div><p className="text-sm font-medium">{detailItem.fromUser?.fullName}</p><p className="text-xs text-muted-foreground">From</p></div></div>
                    <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                    <div className="flex items-center gap-2"><div className="text-right"><p className="text-sm font-medium">{detailItem.toUser?.fullName}</p><p className="text-xs text-muted-foreground">To</p></div><AvatarPlaceholder name={detailItem.toUser?.fullName || ''} size="md" /></div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Handover Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-lg p-3 text-center ${detailItem.fromUserConfirmedAt ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted/50'}`}>
                      <p className="text-xs text-muted-foreground">From User</p>
                      <p className={`text-sm font-medium ${detailItem.fromUserConfirmedAt ? 'text-emerald-600' : ''}`}>{detailItem.fromUserConfirmedAt ? 'Confirmed' : 'Pending'}</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${detailItem.toUserConfirmedAt ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted/50'}`}>
                      <p className="text-xs text-muted-foreground">To User</p>
                      <p className={`text-sm font-medium ${detailItem.toUserConfirmedAt ? 'text-emerald-600' : ''}`}>{detailItem.toUserConfirmedAt ? 'Confirmed' : 'Pending'}</p>
                    </div>
                  </div>
                </div>
                {detailItem.toolConditionAtTransfer && <div><Label className="text-xs text-muted-foreground">Condition at Transfer</Label><p className="mt-1"><StatusBadge status={detailItem.toolConditionAtTransfer} /></p></div>}
                <div><Label className="text-xs text-muted-foreground">Reason</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.reason}</p></div>
                {detailItem.notes && <div><Label className="text-xs text-muted-foreground">Notes</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.notes}</p></div>}
                {(detailItem.status === 'pending' || detailItem.status === 'storekeeper_approved' || detailItem.status === 'awaiting_handover') && (<>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {detailItem.status === 'pending' && (<>
                      <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setConditionTarget(detailItem.id); setConditionOpen(true); }} disabled={submitting}><CheckCircle2 className="h-3.5 w-3.5" /> Approve Transfer</Button>
                      <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(detailItem.id); setRejectOpen(true); }} disabled={submitting}>Reject</Button>
                    </>)}
                    {detailItem.status === 'storekeeper_approved' && (<>
                      <Button size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => handleAction(detailItem.id, 'from_user_accept')} disabled={submitting}><Handshake className="h-3.5 w-3.5" /> Confirm Handover</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(detailItem.id, 'to_user_accept')} disabled={submitting}>Confirm Receipt</Button>
                    </>)}
                    {detailItem.status === 'awaiting_handover' && (
                      <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(detailItem.id, 'to_user_accept')} disabled={submitting}><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Receipt</Button>
                    )}
                  </div>
                </>)}
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <DetailTimeline events={[
                  { label: 'Transfer Requested', date: detailItem.createdAt, user: detailItem.requestedBy?.fullName, status: 'active' },
                  { label: 'Storekeeper Approved', date: detailItem.storekeeperApprovedAt, user: detailItem.storekeeperApprovedBy?.fullName, status: detailItem.status },
                  { label: 'From User Confirmed', date: detailItem.fromUserConfirmedAt, user: detailItem.fromUser?.fullName },
                  { label: 'To User Confirmed', date: detailItem.toUserConfirmedAt, user: detailItem.toUser?.fullName },
                  { label: 'Transfer Complete', date: detailItem.transferredAt },
                ].filter(e => e.date || e.status === 'active')} />
              </TabsContent>
            </Tabs>
          </>)}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Tool Transfer Request</DialogTitle><DialogDescription>Request transfer of a tool to another technician</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Tool *</Label><AsyncSearchableSelect value={createForm.toolId} onValueChange={(v) => setCreateForm(f => ({ ...f, toolId: v }))} placeholder="Select tool..." searchPlaceholder="Search tools..." fetchOptions={async () => { const res = await api.get('/api/tools?limit=999'); if (res.success && res.data) return res.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.toolCode})` })); return []; }} /></div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>From User *</Label><AsyncSearchableSelect value={createForm.fromUserId} onValueChange={(v) => setCreateForm(f => ({ ...f, fromUserId: v }))} placeholder="Current holder..." searchPlaceholder="Search users..." fetchOptions={async () => { const res = await api.get('/api/users?limit=999'); if (res.success && res.data) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username})` })); return []; }} /></div>
                <div><Label>To User *</Label><AsyncSearchableSelect value={createForm.toUserId} onValueChange={(v) => setCreateForm(f => ({ ...f, toUserId: v }))} placeholder="New holder..." searchPlaceholder="Search users..." fetchOptions={async () => { const res = await api.get('/api/users?limit=999'); if (res.success && res.data) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username})` })); return []; }} /></div>
              </div>
              {createForm.fromUserId && createForm.toUserId && createForm.fromUserId === createForm.toUserId && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> From and To users must be different</p>
              )}
            </div>
            <div><Label>Reason * <span className="text-xs text-muted-foreground">(min 5 chars)</span></Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} placeholder="Why is this transfer needed?" rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Additional information..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={submitting} className="gap-2"><Send className="h-4 w-4" /> Submit Transfer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectDialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectTarget(null); }} onConfirm={(reason) => { if (rejectTarget) handleAction(rejectTarget, 'storekeeper_reject', { notes: reason }); }} title="Reject Transfer Request" />
      <ConditionSelectDialog open={conditionOpen} onClose={() => { setConditionOpen(false); setConditionTarget(null); }} onConfirm={(condition) => { if (conditionTarget) handleAction(conditionTarget, 'storekeeper_approve', { toolConditionAtTransfer: condition }); }} />
    </div>
  );
}

// ============================================================================
// PAGE 4: DOWNTIME TRACKING
// ============================================================================

export function RepairDowntimePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ workOrderId: '', assetName: '', assetId: '', downtimeStart: '', downtimeEnd: '', reason: '', category: 'unplanned', impactLevel: 'medium', productionLoss: '', notes: '' });
  // End downtime dialog
  const [endDowntimeTarget, setEndDowntimeTarget] = useState<string | null>(null);
  const [endDowntimeTime, setEndDowntimeTime] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/repairs/downtime?limit=50');
    if (res.success) setRecords(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleCreate = async () => {
    if (!createForm.workOrderId || !createForm.assetName || !createForm.downtimeStart || !createForm.reason) { toast.error('Required fields missing'); return; }
    const res = await api.post('/api/repairs/downtime', {
      ...createForm,
      downtimeEnd: createForm.downtimeEnd || undefined,
      productionLoss: createForm.productionLoss ? parseFloat(createForm.productionLoss) : undefined,
    });
    if (res.success) { toast.success('Downtime recorded'); setCreateOpen(false); setCreateForm({ workOrderId: '', assetName: '', assetId: '', downtimeStart: '', downtimeEnd: '', reason: '', category: 'unplanned', impactLevel: 'medium', productionLoss: '', notes: '' }); fetchRecords(); }
    else toast.error(res.error || 'Failed');
  };

  const handleEndDowntime = async (recordId: string) => {
    setEndDowntimeTarget(recordId);
    setEndDowntimeTime(new Date().toISOString().slice(0, 16));
  };

  const handleEndDowntimeConfirm = async () => {
    if (!endDowntimeTarget || !endDowntimeTime) return;
    const res = await api.put(`/api/repairs/downtime/${endDowntimeTarget}`, { downtimeEnd: endDowntimeTime });
    if (res.success) { toast.success('Downtime ended'); fetchRecords(); }
    else toast.error(res.error || 'Failed');
    setEndDowntimeTarget(null);
  };

  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/repairs/downtime/${id}`);
    if (res.success) { toast.success('Deleted'); fetchRecords(); }
    else toast.error(res.error || 'Failed');
  };

  const totalMinutes = records.reduce((sum: number, r: any) => sum + (r.durationMinutes || 0), 0);

  return (
    <div className="page-content">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Timer className="h-6 w-6 text-red-600" /> Downtime Tracking</h2>
          <p className="text-muted-foreground">Track equipment downtime related to repair work orders</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Log Downtime</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Events</p><p className="text-2xl font-bold">{records.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Downtime</p><p className="text-2xl font-bold">{(totalMinutes / 60).toFixed(1)}h</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Unplanned</p><p className="text-2xl font-bold text-red-600">{records.filter((r: any) => r.category === 'unplanned').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Avg per Event</p><p className="text-2xl font-bold">{records.length > 0 ? (totalMinutes / records.length).toFixed(0) : 0}m</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : records.length === 0 ? (
            <EmptyState icon={Timer} title="No downtime records" />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>WO #</TableHead><TableHead>Category</TableHead><TableHead>Impact</TableHead><TableHead>Duration</TableHead><TableHead>Reason</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
              <TableBody>
                {records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.assetName}</TableCell>
                    <TableCell><Badge variant="outline">{r.workOrder?.woNumber}</Badge></TableCell>
                    <TableCell><StatusBadge status={r.category} /></TableCell>
                    <TableCell><PriorityBadge priority={r.impactLevel} /></TableCell>
                    <TableCell>
                      <div className="font-medium">{r.durationMinutes ? `${r.durationMinutes.toFixed(0)} min` : 'Ongoing'}</div>
                      <div className="text-xs text-muted-foreground">{r.downtimeStart ? format(new Date(r.downtimeStart), 'MMM d HH:mm') : ''}</div>
                    </TableCell>
                    <TableCell className="text-sm max-w-48 truncate">{r.reason}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!r.downtimeEnd && (<DropdownMenuItem onClick={() => handleEndDowntime(r.id)}><Timer className="h-4 w-4 mr-2" /> End Downtime</DropdownMenuItem>)}
                          <DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-red-600"><Ban className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Downtime</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Work Order ID *</Label><AsyncSearchableSelect
                value={createForm.workOrderId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, workOrderId: v }))}
                placeholder="Select work order..."
                searchPlaceholder="Search work orders..."
                fetchOptions={async () => {
                  const res = await api.get('/api/work-orders?limit=999');
                  if (res.success && res.data) return res.data.map((w: any) => ({ value: w.id, label: `${w.woNumber} — ${w.title}` }));
                  return [];
                }}
              /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Asset Name *</Label><Input value={createForm.assetName} onChange={(e) => setCreateForm({ ...createForm, assetName: e.target.value })} /></div>
              <div><Label>Asset ID</Label><AsyncSearchableSelect
                value={createForm.assetId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, assetId: v }))}
                placeholder="Select asset..."
                searchPlaceholder="Search assets..."
                fetchOptions={async () => {
                  const res = await api.get('/api/assets?limit=999');
                  if (res.success && res.data) return res.data.map((a: any) => ({ value: a.id, label: `${a.name} (${a.assetTag})` }));
                  return [];
                }}
              /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time *</Label><Input type="datetime-local" value={createForm.downtimeStart} onChange={(e) => setCreateForm({ ...createForm, downtimeStart: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="datetime-local" value={createForm.downtimeEnd} onChange={(e) => setCreateForm({ ...createForm, downtimeEnd: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={createForm.category} onValueChange={(v) => setCreateForm({ ...createForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="unplanned">Unplanned</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Impact Level</Label>
                <Select value={createForm.impactLevel} onValueChange={(v) => setCreateForm({ ...createForm, impactLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Production Loss (₵)</Label><Input type="number" step="0.01" value={createForm.productionLoss} onChange={(e) => setCreateForm({ ...createForm, productionLoss: e.target.value })} /></div>
            <div><Label>Reason *</Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Downtime Dialog */}
      <Dialog open={!!endDowntimeTarget} onOpenChange={(open) => { if (!open) setEndDowntimeTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>End Downtime</DialogTitle><DialogDescription>Set the end time for this downtime event.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>End Time *</Label><Input type="datetime-local" value={endDowntimeTime} onChange={e => setEndDowntimeTime(e.target.value)} /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEndDowntimeTarget(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleEndDowntimeConfirm}>End Downtime</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PAGE 5: REPAIR COMPLETION & CLOSURE
// ============================================================================

export function RepairCompletionPage() {
  const [woId, setWoId] = useState('');
  const [completion, setCompletion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ completionNotes: '', findings: '', rootCause: '', correctiveAction: '', totalLaborHours: '', totalMaterialCost: '', totalToolCost: '', totalDowntimeMinutes: '', closureNotes: '' });
  // Rework reason dialog
  const [reworkDialogOpen, setReworkDialogOpen] = useState(false);
  const [reworkReasonValue, setReworkReasonValue] = useState('');

  const fetchCompletion = async () => {
    if (!woId) return;
    setLoading(true);
    const res = await api.get(`/api/repairs/completion/${woId}`);
    if (res.success) setCompletion(res.data);
    else setCompletion(null);
    setLoading(false);
  };

  const handleSubmit = async (action: string) => {
    if (!woId) return;
    setSubmitting(true);
    const res = await api.post(`/api/repairs/completion/${woId}`, {
      action,
      completionNotes: form.completionNotes || undefined,
      findings: form.findings || undefined,
      rootCause: form.rootCause || undefined,
      correctiveAction: form.correctiveAction || undefined,
      totalLaborHours: form.totalLaborHours ? parseFloat(form.totalLaborHours) : undefined,
      totalMaterialCost: form.totalMaterialCost ? parseFloat(form.totalMaterialCost) : undefined,
      totalToolCost: form.totalToolCost ? parseFloat(form.totalToolCost) : undefined,
      totalDowntimeMinutes: form.totalDowntimeMinutes ? parseFloat(form.totalDowntimeMinutes) : undefined,
      closureNotes: form.closureNotes || undefined,
      ...(action === 'supervisor_request_rework' ? { reworkReason: reworkReasonValue } : {}),
      ...(action === 'supervisor_approve' ? { supervisorReviewNotes: form.completionNotes } : {}),
    });
    if (res.success) {
      toast.success('Action completed');
      fetchCompletion();
    } else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  return (
    <div className="page-content">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-green-600" /> Work Order Completion & Closure</h2>
        <p className="text-muted-foreground">Submit completion, supervisor review, and planner final closure</p>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-3">
          <Input placeholder="Enter Work Order ID..." value={woId} onChange={(e) => setWoId(e.target.value)} className="flex-1" />
          <Button onClick={fetchCompletion} disabled={!woId || loading}>Load</Button>
        </CardContent>
      </Card>

      {loading && <LoadingSkeleton />}

      {completion && (
        <div className="grid gap-6">
          {/* WO Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2">{completion.workOrder?.woNumber} — {completion.workOrder?.title}</CardTitle><CardDescription>Status: {completion.workOrder?.status}</CardDescription></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div><Label className="text-muted-foreground">Supervisor Status</Label><div className="mt-1"><StatusBadge status={completion.supervisorStatus} /></div></div>
                {completion.supervisorApprovedAt && <div><Label className="text-muted-foreground">Approved By</Label><div className="mt-1 text-sm">{completion.supervisorApprovedBy?.fullName} — {formatDistanceToNow(new Date(completion.supervisorApprovedAt), { addSuffix: true })}</div></div>}
                {completion.reworkCount > 0 && <div className="text-orange-600"><AlertTriangle className="h-4 w-4 inline mr-1" /> Rework Count: {completion.reworkCount}</div>}
                {completion.reworkReason && <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700"><strong>Rework Reason:</strong> {completion.reworkReason}</div>}
              </div>
              <div className="space-y-3">
                <div><Label className="text-muted-foreground">Planner Status</Label><div className="mt-1"><StatusBadge status={completion.plannerStatus} /></div></div>
                {completion.plannerClosedAt && <div><Label className="text-muted-foreground">Closed By</Label><div className="mt-1 text-sm">{completion.plannerClosedBy?.fullName} — {formatDistanceToNow(new Date(completion.plannerClosedAt), { addSuffix: true })}</div></div>}
              </div>
            </CardContent>
          </Card>

          {/* Completion Form */}
          <Card>
            <CardHeader><CardTitle>Completion Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Completion Notes</Label><Textarea value={form.completionNotes} onChange={(e) => setForm({ ...form, completionNotes: e.target.value })} placeholder="Describe work completed..." rows={3} /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Findings</Label><Textarea value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} /></div>
                <div><Label>Root Cause</Label><Textarea value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} /></div>
              </div>
              <div><Label>Corrective Action</Label><Textarea value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} /></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Labor Hours</Label><Input type="number" step="0.5" value={form.totalLaborHours} onChange={(e) => setForm({ ...form, totalLaborHours: e.target.value })} placeholder={String(completion.totalLaborHours || 0)} /></div>
                <div><Label>Material Cost (₵)</Label><Input type="number" step="0.01" value={form.totalMaterialCost} onChange={(e) => setForm({ ...form, totalMaterialCost: e.target.value })} placeholder={String(completion.totalMaterialCost || 0)} /></div>
                <div><Label>Tool Cost (₵)</Label><Input type="number" step="0.01" value={form.totalToolCost} onChange={(e) => setForm({ ...form, totalToolCost: e.target.value })} placeholder={String(completion.totalToolCost || 0)} /></div>
                <div><Label>Downtime (min)</Label><Input type="number" value={form.totalDowntimeMinutes} onChange={(e) => setForm({ ...form, totalDowntimeMinutes: e.target.value })} placeholder={String(completion.totalDowntimeMinutes || 0)} /></div>
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-3">
                {(completion.supervisorStatus === 'pending_review' || completion.supervisorStatus === 'rework_requested') && (
                  <Button onClick={() => handleSubmit('submit')} disabled={submitting}><CheckCircle2 className="h-4 w-4 mr-2" /> {completion.supervisorStatus === 'rework_requested' ? 'Resubmit Completion' : 'Submit Completion'}</Button>
                )}
                {completion.supervisorStatus === 'pending_review' && (
                  <Button variant="destructive" onClick={() => { setReworkDialogOpen(true); }} disabled={submitting}><RotateCcw className="h-4 w-4 mr-2" /> Request Rework</Button>
                )}
                {completion.supervisorStatus === 'pending_review' && (
                  <Button variant="outline" className="border-green-600 text-green-600" onClick={() => handleSubmit('supervisor_approve')} disabled={submitting}><ShieldCheck className="h-4 w-4 mr-2" /> Supervisor Approve</Button>
                )}
                {completion.supervisorStatus === 'approved' && completion.plannerStatus === 'pending_closure' && (
                  <>
                    <div><Label>Closure Notes</Label><Textarea value={form.closureNotes} onChange={(e) => setForm({ ...form, closureNotes: e.target.value })} /></div>
                    <Button className="bg-gray-800" onClick={() => handleSubmit('planner_close')} disabled={submitting}><CheckCircle2 className="h-4 w-4 mr-2" /> Planner Close WO</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {woId && !loading && !completion && (
        <EmptyState icon={ClipboardList} title="No completion record found" description="Enter a valid Work Order ID to load completion data" />
      )}

      {/* Rework Reason Dialog */}
      <Dialog open={reworkDialogOpen} onOpenChange={setReworkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Request Rework</DialogTitle><DialogDescription>Please provide a reason for requesting rework.</DialogDescription></DialogHeader>
          <Textarea value={reworkReasonValue} onChange={e => setReworkReasonValue(e.target.value)} placeholder="Rework reason..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReworkDialogOpen(false); setReworkReasonValue(''); }}>Cancel</Button>
            <Button variant="destructive" disabled={!reworkReasonValue.trim() || submitting} onClick={() => { setReworkDialogOpen(false); handleSubmit('supervisor_request_rework'); }}>Request Rework</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PAGE 6: REPAIR ANALYTICS KPIs
// ============================================================================

export function RepairAnalyticsPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.get('/api/repairs/kpi');
      if (res.success) setKpi(res.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-blue-600" /> Repairs Analytics</h2>
        <p className="text-muted-foreground">Key performance indicators for the repairs module</p>
      </div>

      {!kpi ? (
        <EmptyState icon={BarChart3} title="No data available" />
      ) : (
        <>
          {/* Work Order KPIs */}
          <Card>
            <CardHeader><CardTitle>Work Order Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-3xl font-bold text-blue-700">{kpi.workOrders?.total}</p><p className="text-xs text-muted-foreground">Total WOs</p></div>
                <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-3xl font-bold text-green-700">{kpi.workOrders?.completionRate}%</p><p className="text-xs text-muted-foreground">Completion Rate</p></div>
                <div className="text-center p-3 bg-orange-50 rounded-lg"><p className="text-3xl font-bold text-orange-700">{kpi.workOrders?.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
                <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-3xl font-bold text-red-700">{kpi.workOrders?.overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
                <div className="text-center p-3 bg-purple-50 rounded-lg"><p className="text-3xl font-bold text-purple-700">{kpi.workOrders?.avgEstimatedHours || 0}h</p><p className="text-xs text-muted-foreground">Avg Hours</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Material & Tool KPIs */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Material Requests</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-sm text-muted-foreground">Total Requests</p><p className="text-xl font-bold">{kpi.materialRequests?.total}</p></div>
                  <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold text-yellow-600">{kpi.materialRequests?.pending}</p></div>
                  <div><p className="text-sm text-muted-foreground">Approved</p><p className="text-xl font-bold text-blue-600">{kpi.materialRequests?.approved}</p></div>
                  <div><p className="text-sm text-muted-foreground">Issued</p><p className="text-xl font-bold text-green-600">{kpi.materialRequests?.issued}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Tool Requests</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-sm text-muted-foreground">Total Requests</p><p className="text-xl font-bold">{kpi.toolRequests?.total}</p></div>
                  <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold text-yellow-600">{kpi.toolRequests?.pending}</p></div>
                  <div><p className="text-sm text-muted-foreground">Issued</p><p className="text-xl font-bold text-green-600">{kpi.toolRequests?.issued}</p></div>
                  <div><p className="text-sm text-muted-foreground">Transfers</p><p className="text-xl font-bold text-purple-600">{kpi.toolTransfers?.transferred}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Downtime & Rework */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Downtime Analysis</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-sm text-muted-foreground">Total Downtime</p><p className="text-xl font-bold text-red-600">{kpi.downtime?.totalHours || 0}h</p></div>
                  <div><p className="text-sm text-muted-foreground">Avg per WO</p><p className="text-xl font-bold">{kpi.downtime?.avgMinutesPerWo || 0} min</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Rework Analysis</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-sm text-muted-foreground">Rework Rate</p><p className="text-xl font-bold text-orange-600">{kpi.rework?.reworkRate || 0}%</p></div>
                  <div><p className="text-sm text-muted-foreground">Total Reworks</p><p className="text-xl font-bold">{kpi.rework?.totalReworks || 0}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Completions */}
          {kpi.recentCompletions && kpi.recentCompletions.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recent Completions</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Title</TableHead><TableHead>Priority</TableHead><TableHead>Approved</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {kpi.recentCompletions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell><Badge variant="outline">{c.workOrder?.woNumber}</Badge></TableCell>
                        <TableCell className="font-medium">{c.workOrder?.title}</TableCell>
                        <TableCell><PriorityBadge priority={c.workOrder?.priority} /></TableCell>
                        <TableCell className="text-sm">{c.supervisorApprovedAt ? formatDistanceToNow(new Date(c.supervisorApprovedAt), { addSuffix: true }) : 'Pending'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
