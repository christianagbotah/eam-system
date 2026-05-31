'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';

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
} from '@/components/ui/dialog'
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';;
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
  Handshake, Truck, DollarSign, RefreshCw, X, Info, Pencil, Trash2,
} from 'lucide-react';
import { EmptyState, LoadingSkeleton, formatCurrency } from '@/components/shared/helpers';
import { DateTimePicker, DateRangePicker } from '@/components/ui/datetime-picker';
import { AsyncSearchableSelect } from '@/components/ui/searchable-select';

// ============================================================================
// SHARED HELPERS
// ============================================================================

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  supervisor_approved: 'bg-blue-100 text-blue-800',
  storekeeper_approved: 'bg-indigo-100 text-indigo-800',
  store_approved: 'bg-indigo-100 text-indigo-800',
  picking: 'bg-violet-100 text-violet-800',
  issued: 'bg-green-100 text-green-800',
  partially_returned: 'bg-teal-100 text-teal-800',
  fully_returned: 'bg-gray-100 text-gray-800',
  returned: 'bg-gray-100 text-gray-800',
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
    <ResponsiveDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      
        <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2><p className="text-sm text-muted-foreground">Please provide a reason (minimum 10 characters).</p></div>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection..." rows={3} />
        {reason.length > 0 && reason.length < 10 && <p className="text-xs text-amber-600">{10 - reason.length} more characters needed</p>}
        <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={reason.trim().length < 10} onClick={() => { onConfirm(reason); onClose(); }}>Reject</Button>
        </div>
      
    </ResponsiveDialog>
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
    <ResponsiveDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      
        <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>
        <div className="space-y-2">
          <Label>{fieldLabel}</Label>
          <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="Enter quantity" min={1} max={max} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Max available: {max}</span>
            {valid && <span className="text-emerald-600 font-medium">{formatCurrency(q * 0)} estimated</span>}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!valid} onClick={() => { onConfirm(q); onClose(); }}>Confirm</Button>
        </div>
      
    </ResponsiveDialog>
  );
}

function ConditionSelectDialog({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void; onConfirm: (condition: string) => void;
}) {
  const [condition, setCondition] = useState('good');
  const options = [
    { value: 'new', label: 'New/Excellent', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'good', label: 'Good', color: 'bg-teal-100 text-teal-800' },
    { value: 'fair', label: 'Fair', color: 'bg-amber-100 text-amber-800' },
    { value: 'poor', label: 'Poor', color: 'bg-orange-100 text-orange-800' },
    { value: 'damaged', label: 'Damaged', color: 'bg-red-100 text-red-800' },
  ];
  return (
    <ResponsiveDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      
        <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">Select Tool Condition</h2><p className="text-sm text-muted-foreground">Assess the current condition of the tool.</p></div>
        <div className="grid grid-cols-2 gap-2">
          {options.map(o => (
            <button key={o.value} onClick={() => setCondition(o.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${condition === o.value ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${o.color} mb-1`}>{o.label}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { onConfirm(condition); onClose(); }}>Confirm</Button>
        </div>
      
    </ResponsiveDialog>
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
  { key: 'picking', label: 'Picking', icon: PackageOpen },
  { key: 'issued', label: 'Issued', icon: PackageCheck },
  { key: 'closed', label: 'Reconciled', icon: ClipboardList },
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
// SHARED ROLE HELPERS
// ============================================================================

function isSupervisorOrAdmin(user: any): boolean {
  if (!user?.roles) return false;
  const slugs = (user.roles || []).map((r: any) => r.slug);
  return slugs.includes('admin') || slugs.includes('store_keeper') || slugs.includes('store_manager');
}

function isStoreOrAdmin(user: any): boolean {
  if (!user?.roles) return false;
  const slugs = (user.roles || []).map((r: any) => r.slug);
  return slugs.includes('admin') || slugs.includes('store_keeper') || slugs.includes('store_manager');
}

// ============================================================================
// PAGE 1: REPAIR MATERIAL REQUESTS
// ============================================================================

export function RepairMaterialRequestsPage() {
  const { user, hasPermission, isAdmin } = useAuthStore();
  const { pageParams } = useNavigationStore();
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
  const [workOrderIdFilter, setWorkOrderIdFilter] = useState('');
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [createForm, setCreateForm] = useState({ workOrderId: '', itemName: '', itemId: '', quantityRequested: '', unit: 'each', unitCost: '', reason: '', notes: '', urgency: 'medium' });
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileTarget, setReconcileTarget] = useState<any>(null);
  const [reconcileForm, setReconcileForm] = useState({ consumedQty: '', wastedQty: '', notes: '' });

  useEffect(() => {
    if (pageParams?.workOrderId) {
      setWorkOrderIdFilter(pageParams.workOrderId);
    }
  }, []);

  const activeFilters = useMemo(() => {
    let c = 0;
    if (filterStatus !== 'all') c++;
    if (filterUrgency !== 'all') c++;
    if (searchText) c++;
    return c;
  }, [filterStatus, filterUrgency, searchText]);

  const clearFilters = () => { setFilterStatus('all'); setFilterUrgency('all'); setSearchText(''); setPage(1); setWorkOrderIdFilter(''); };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterUrgency !== 'all') params.set('urgency', filterUrgency);
    if (workOrderIdFilter) params.set('workOrderId', workOrderIdFilter);
    params.set('page', String(page));
    params.set('limit', '20');
    const [listRes, statsRes] = await Promise.all([
      api.get(`/api/repairs/material-requests?${params}`),
      api.get('/api/repairs/material-requests?stats=true'),
    ]);
    if (listRes.success) setRequests(listRes.data || []);
    if (listRes.pagination) setPagination(listRes.pagination);
    else toast.error(listRes.error || 'Failed to load');
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, filterUrgency, page, workOrderIdFilter]);

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

  const handlePick = async (id: string) => {
    setSubmitting(true);
    const res = await api.post('/api/repairs/material-requests/pick', { id });
    if (res.success) { toast.success('Items being picked'); fetchRequests(); if (detailOpen && detailItem?.id === id) setDetailOpen(false); }
    else toast.error(res.error || 'Failed to pick');
    setSubmitting(false);
  };

  const handleReconcile = async () => {
    if (!reconcileTarget) return;
    const consumed = parseFloat(reconcileForm.consumedQty);
    const wasted = parseFloat(reconcileForm.wastedQty) || 0;
    if (isNaN(consumed) || consumed < 0) { toast.error('Enter a valid consumed quantity'); return; }
    if (isNaN(wasted) || wasted < 0) { toast.error('Enter a valid wasted quantity'); return; }
    if (consumed + wasted > reconcileTarget.quantityIssued) {
      toast.error(`Consumed + wasted (${consumed + wasted}) cannot exceed issued (${reconcileTarget.quantityIssued})`);
      return;
    }
    setSubmitting(true);
    const res = await api.post('/api/repairs/material-requests/reconcile', {
      id: reconcileTarget.id,
      consumedQty: consumed,
      wastedQty: wasted > 0 ? wasted : undefined,
      notes: reconcileForm.notes || undefined,
    });
    if (res.success) {
      toast.success(res.data?.reconciliation
        ? `Reconciled: ${res.data.reconciliation.consumedQty} consumed, ${res.data.reconciliation.wastedQty} wasted, ${res.data.reconciliation.returnedQty} returned`
        : 'Reconciliation completed');
      setReconcileOpen(false);
      setReconcileTarget(null);
      setReconcileForm({ consumedQty: '', wastedQty: '', notes: '' });
      fetchRequests();
      if (detailOpen) setDetailOpen(false);
    } else toast.error(res.error || 'Failed to reconcile');
    setSubmitting(false);
  };

  const filtered = useMemo(() => requests.filter(r =>
    !searchText || r.itemName?.toLowerCase().includes(searchText.toLowerCase()) || r.workOrder?.woNumber?.toLowerCase().includes(searchText.toLowerCase())
  ), [requests, searchText]);

  // Cache for inventory item lookup (used by AsyncSearchableSelect)
  const inventoryItemsCache = useRef<any[]>([]);
  const fetchInventoryItems = useCallback(async () => {
    const res = await api.get('/api/inventory?limit=500');
    if (res.success && Array.isArray(res.data)) {
      inventoryItemsCache.current = res.data;
      return res.data.map((i: any) => ({ value: i.id, label: i.name + (i.itemCode ? ` (${i.itemCode})` : '') }));
    }
    return [];
  }, []);

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
        {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>}
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
            <SelectItem value="picking">Picking</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
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
              {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>}
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
                          {r.status === 'pending' && isSupervisorOrAdmin(user) && (
                            <>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleAction(r.id, 'supervisor_approve')}><CheckCircle2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Approve</TooltipContent></Tooltip></TooltipProvider>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget({ id: r.id, action: 'supervisor_reject' }); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                            </>
                          )}
                          {r.status === 'supervisor_approved' && isStoreOrAdmin(user) && (
                            <>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => handleAction(r.id, 'storekeeper_approve')}><Warehouse className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Store Approve</TooltipContent></Tooltip></TooltipProvider>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget({ id: r.id, action: 'storekeeper_reject' }); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                            </>
                          )}
                          {r.status === 'storekeeper_approved' && isStoreOrAdmin(user) && (
                            <Button size="sm" className="h-7 gap-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={(e) => { e.stopPropagation(); handlePick(r.id); }} disabled={submitting}>
                              <PackageOpen className="h-3.5 w-3.5" /> Pick
                            </Button>
                          )}
                          {r.status === 'picking' && isStoreOrAdmin(user) && (
                            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); setQtyTarget({ id: r.id, action: 'issue', max: r.quantityApproved, field: 'quantityToIssue' }); setQtyOpen(true); }}>
                              <PackageCheck className="h-3.5 w-3.5" /> Issue
                            </Button>
                          )}
                          {r.status === 'issued' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 gap-1 border-violet-400 text-violet-700 hover:bg-violet-50" onClick={(e) => { e.stopPropagation(); setReconcileTarget(r); setReconcileForm({ consumedQty: '', wastedQty: '', notes: '' }); setReconcileOpen(true); }}>
                                <ClipboardList className="h-3.5 w-3.5" /> Reconcile
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 gap-1 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); setQtyTarget({ id: r.id, action: 'record_return', max: r.quantityIssued, field: 'quantityToReturn' }); setQtyOpen(true); }}>
                                <RotateCcw className="h-3.5 w-3.5" /> Return
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setDetailItem(r); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                              {(hasPermission('work_orders.update') || isAdmin()) && r.status === 'pending' && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Ban className="h-4 w-4 mr-2" /> Cancel</DropdownMenuItem>}
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-amber-600" /> {detailItem.itemName}</SheetTitle>
                <SheetDescription>Material Request — {detailItem.workOrder?.woNumber}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
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
                    {/* Reconciliation Status for issued/closed items */}
                    {(detailItem.status === 'issued' || detailItem.status === 'closed' || detailItem.status === 'picking') && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {[
                          { label: 'Consumed', val: detailItem.consumedQty ?? '—', color: 'text-teal-600', bg: 'bg-teal-50' },
                          { label: 'Wasted', val: detailItem.wastedQty ?? '—', color: 'text-red-500', bg: 'bg-red-50' },
                          { label: 'Variance', val: detailItem.consumedQty != null ? Math.max(0, (detailItem.quantityIssued || 0) - (detailItem.consumedQty || 0) - (detailItem.wastedQty || 0)) : '—', color: 'text-orange-600', bg: 'bg-orange-50' },
                        ].map(q => (
                          <div key={q.label} className={`${q.bg} rounded-lg p-2 text-center`}>
                            <p className={`text-lg font-bold ${q.color}`}>{q.val}</p><p className="text-[10px] text-muted-foreground">{q.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Requested By</Label>
                    <div className="flex items-center gap-2"><AvatarPlaceholder name={detailItem.requestedBy?.fullName || ''} /><span className="text-sm">{detailItem.requestedBy?.fullName}</span></div>
                  </div>
                  <div><Label className="text-xs text-muted-foreground">Reason</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.reason}</p></div>
                  {detailItem.notes && <div><Label className="text-xs text-muted-foreground">Notes</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.notes}</p></div>}
                  {((detailItem.status === 'pending' && isSupervisorOrAdmin(user)) || (detailItem.status === 'supervisor_approved' && isStoreOrAdmin(user)) || (detailItem.status === 'storekeeper_approved' && isStoreOrAdmin(user)) || (detailItem.status === 'picking' && isStoreOrAdmin(user)) || detailItem.status === 'issued') && (
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
                          <Button size="sm" className="gap-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => handlePick(detailItem.id)} disabled={submitting}><PackageOpen className="h-3.5 w-3.5" /> Pick Items</Button>
                        )}
                        {detailItem.status === 'picking' && (
                          <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setQtyTarget({ id: detailItem.id, action: 'issue', max: detailItem.quantityApproved, field: 'quantityToIssue' }); setQtyOpen(true); }} disabled={submitting}><PackageCheck className="h-3.5 w-3.5" /> Issue</Button>
                        )}
                        {detailItem.status === 'issued' && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1 border-violet-400 text-violet-700" onClick={() => { setReconcileTarget(detailItem); setReconcileForm({ consumedQty: '', wastedQty: '', notes: '' }); setReconcileOpen(true); }} disabled={submitting}><ClipboardList className="h-3.5 w-3.5" /> Reconcile</Button>
                            <Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700" onClick={() => { setQtyTarget({ id: detailItem.id, action: 'record_return', max: detailItem.quantityIssued, field: 'quantityToReturn' }); setQtyOpen(true); }} disabled={submitting}><RotateCcw className="h-3.5 w-3.5" /> Return</Button>
                          </>
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
                    { label: 'Items Picked', date: detailItem.pickedAt, user: detailItem.pickedByUser?.fullName },
                    { label: 'Material Issued', date: detailItem.issuedAt, user: detailItem.issuedBy?.fullName },
                    { label: 'Reconciliation', date: detailItem.consumedQty != null ? detailItem.updatedAt : undefined, notes: detailItem.consumedQty != null ? `Consumed: ${detailItem.consumedQty}, Wasted: ${detailItem.wastedQty ?? 0}` : undefined },
                    { label: 'Material Returned', date: detailItem.returnedAt, user: detailItem.returnedBy?.fullName },
                  ].filter(e => e.date || e.status === 'active' || e.notes)} />
                </TabsContent>
              </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
        
          <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">New Material Request</h2><p className="text-sm text-muted-foreground">Request materials/spare parts for a work order</p></div>
          <div className="space-y-4">
            <div><Label>Work Order *</Label><AsyncSearchableSelect value={createForm.workOrderId} onValueChange={(v) => setCreateForm(f => ({ ...f, workOrderId: v }))} placeholder="Select work order..." searchPlaceholder="Search work orders..." fetchOptions={async () => { const res = await api.get('/api/work-orders?limit=999'); if (res.success && Array.isArray(res.data)) return res.data.map((w: any) => ({ value: w.id, label: `${w.woNumber} — ${w.title}` })); return []; }} /></div>
            <div><Label>Item Name *</Label><AsyncSearchableSelect value={createForm.itemId} onValueChange={(v) => { const item = inventoryItemsCache.current.find((i: any) => i.id === v); setCreateForm(f => ({ ...f, itemId: v, itemName: item ? (item.name + (item.itemCode ? ` (${item.itemCode})` : '')) : '' })); }} placeholder="Search inventory items..." searchPlaceholder="Search by name or code..." fetchOptions={fetchInventoryItems} /></div>
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
          <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={submitting} className="gap-2"><Send className="h-4 w-4" /> Submit Request</Button></div>
        
      </ResponsiveDialog>

      <RejectDialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectTarget(null); }} onConfirm={(reason) => { if (rejectTarget) handleAction(rejectTarget.id, rejectTarget.action, { notes: reason }); }} title="Reject Material Request" />
      <QuantityDialog open={qtyOpen} onClose={() => { setQtyOpen(false); setQtyTarget(null); }} onConfirm={(qty) => { if (qtyTarget) handleAction(qtyTarget.id, qtyTarget.action, { [qtyTarget.field]: qty }); }} title={qtyTarget?.action === 'issue' ? 'Issue Quantity' : 'Return Quantity'} description={qtyTarget?.action === 'issue' ? `Enter quantity to issue (max ${qtyTarget?.max || 0})` : `Enter quantity to return (max ${qtyTarget?.max || 0})`} max={qtyTarget?.max || 0} fieldLabel={qtyTarget?.action === 'issue' ? 'Quantity to Issue' : 'Quantity to Return'} />

      {/* Reconciliation Dialog */}
      <ResponsiveDialog open={reconcileOpen} onOpenChange={(v) => { if (!v) { setReconcileOpen(false); setReconcileTarget(null); setReconcileForm({ consumedQty: '', wastedQty: '', notes: '' }); } }}>
        
          <div className="space-y-1.5 mb-4">
            <h2 className="text-lg font-semibold leading-none tracking-tight">Material Reconciliation</h2>
            <p className="text-sm text-muted-foreground">Record actual consumption for {reconcileTarget?.itemName} — Issued: {reconcileTarget?.quantityIssued} {reconcileTarget?.unit}</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Consumed Quantity *</Label>
                <Input type="number" value={reconcileForm.consumedQty} onChange={e => setReconcileForm(f => ({ ...f, consumedQty: e.target.value }))} placeholder="Amount consumed" min={0} max={reconcileTarget?.quantityIssued || 0} />
                <p className="text-[11px] text-muted-foreground mt-1">Material actually used in the repair</p>
              </div>
              <div>
                <Label>Wasted Quantity</Label>
                <Input type="number" value={reconcileForm.wastedQty} onChange={e => setReconcileForm(f => ({ ...f, wastedQty: e.target.value }))} placeholder="Amount discarded" min={0} />
                <p className="text-[11px] text-muted-foreground mt-1">Material discarded/damaged</p>
              </div>
            </div>
            {/* Live reconciliation preview */}
            {reconcileForm.consumedQty && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Reconciliation Preview</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-teal-600">{parseFloat(reconcileForm.consumedQty) || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Consumed</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-500">{parseFloat(reconcileForm.wastedQty) || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Wasted</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-600">{Math.max(0, (reconcileTarget?.quantityIssued || 0) - (parseFloat(reconcileForm.consumedQty) || 0) - (parseFloat(reconcileForm.wastedQty) || 0))}</p>
                    <p className="text-[10px] text-muted-foreground">To Return</p>
                  </div>
                </div>
                {(parseFloat(reconcileForm.consumedQty) || 0) + (parseFloat(reconcileForm.wastedQty) || 0) > (reconcileTarget?.quantityIssued || 0) && (
                  <p className="text-xs text-red-600 mt-1">⚠ Total exceeds issued quantity</p>
                )}
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={reconcileForm.notes} onChange={e => setReconcileForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes about consumption..." rows={2} />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => { setReconcileOpen(false); setReconcileTarget(null); setReconcileForm({ consumedQty: '', wastedQty: '', notes: '' }); }}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={handleReconcile} disabled={submitting || !reconcileForm.consumedQty}>
              <ClipboardList className="h-4 w-4" /> Submit Reconciliation
            </Button>
          </div>
        
      </ResponsiveDialog>
    </div>
  );
}

// ============================================================================
// PAGE 2: REPAIR TOOL REQUESTS
// ============================================================================

export function RepairToolRequestsPage() {
  const { user, hasPermission, isAdmin } = useAuthStore();
  const { pageParams } = useNavigationStore();
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
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({ toolId: '', toolName: '', urgency: 'medium', reason: '', notes: '' });
  const [page, setPage] = useState(1);
  const [workOrderIdFilter, setWorkOrderIdFilter] = useState('');
  const [pagination, setPagination] = useState<any>(null);

  // Cache for tool lookup (used by AsyncSearchableSelect)
  const toolsCache = useRef<any[]>([]);
  const fetchTools = useCallback(async () => {
    const res = await api.get('/api/tools?limit=500');
    if (res.success && Array.isArray(res.data)) {
      toolsCache.current = res.data;
      return res.data.map((t: any) => ({ value: t.id, label: t.name + (t.serialNumber ? ` (${t.serialNumber})` : '') }));
    }
    return [];
  }, []);

  const [createForm, setCreateForm] = useState({ workOrderId: '', toolId: '', toolName: '', reason: '', notes: '', urgency: 'medium' });

  useEffect(() => {
    if (pageParams?.workOrderId) {
      setWorkOrderIdFilter(pageParams.workOrderId);
    }
  }, []);

  const activeFilters = useMemo(() => {
    let c = 0; if (filterStatus !== 'all') c++; if (filterUrgency !== 'all') c++; if (searchText) c++; if (workOrderIdFilter) c++; return c;
  }, [filterStatus, filterUrgency, searchText, workOrderIdFilter]);
  const clearFilters = () => { setFilterStatus('all'); setFilterUrgency('all'); setSearchText(''); setWorkOrderIdFilter(''); setPage(1); };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterUrgency !== 'all') params.set('urgency', filterUrgency);
    if (workOrderIdFilter) params.set('workOrderId', workOrderIdFilter);
    params.set('page', String(page));
    params.set('limit', '50');
    const [listRes, statsRes] = await Promise.all([
      api.get(`/api/repairs/tool-requests?${params}`),
      api.get('/api/repairs/tool-requests?stats=true'),
    ]);
    if (listRes.success) setRequests(listRes.data || []); else toast.error(listRes.error || 'Failed');
    if (listRes.pagination) setPagination(listRes.pagination);
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, filterUrgency, page, workOrderIdFilter]);

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

  const openEditForm = () => {
    if (!detailItem) return;
    setEditForm({
      toolId: detailItem.toolId || '',
      toolName: detailItem.toolName || '',
      urgency: detailItem.urgency || 'medium',
      reason: detailItem.reason || '',
      notes: detailItem.notes || '',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.toolName || !editForm.reason || editForm.reason.length < 5) {
      toast.error('Tool Name and Reason (min 5 chars) are required');
      return;
    }
    setSubmitting(true);
    const res = await api.put(`/api/repairs/tool-requests/${detailItem.id}`, {
      toolId: editForm.toolId || undefined,
      toolName: editForm.toolName,
      urgency: editForm.urgency,
      reason: editForm.reason,
      notes: editForm.notes,
    });
    if (res.success) {
      toast.success('Tool request updated');
      setEditOpen(false);
      // Re-fetch the full detail (with relations) to keep the side sheet in sync
      const detailRes = await api.get(`/api/repairs/tool-requests/${detailItem.id}`);
      if (detailRes.success) setDetailItem(detailRes.data);
      fetchRequests();
    } else {
      toast.error(res.error || 'Failed to update');
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    setSubmitting(true);
    const res = await api.delete(`/api/repairs/tool-requests/${detailItem.id}`);
    if (res.success) {
      toast.success('Tool request deleted');
      setDeleteOpen(false);
      setDetailOpen(false);
      setDetailItem(null);
      fetchRequests();
    } else {
      toast.error(res.error || 'Failed to delete');
    }
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
        {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>}
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
              {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>}
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
                          {r.status === 'pending' && isSupervisorOrAdmin(user) && (<>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleAction(r.id, 'supervisor_approve')}><CheckCircle2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Approve</TooltipContent></Tooltip></TooltipProvider>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget({ id: r.id, action: 'supervisor_reject' }); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                          </>)}
                          {r.status === 'supervisor_approved' && isStoreOrAdmin(user) && (<>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => handleAction(r.id, 'storekeeper_approve')}><Warehouse className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Store Approve</TooltipContent></Tooltip></TooltipProvider>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setRejectTarget({ id: r.id, action: 'storekeeper_reject' }); setRejectOpen(true); }}><XCircle className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Reject</TooltipContent></Tooltip></TooltipProvider>
                          </>)}
                          {r.status === 'storekeeper_approved' && isStoreOrAdmin(user) && (
                            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(r.id, 'issue')}><Wrench className="h-3.5 w-3.5" /> Issue</Button>
                          )}
                          {r.status === 'issued' && (
                            <Button size="sm" variant="outline" className="h-7 gap-1 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => { setConditionTarget(r.id); setConditionOpen(true); }}><RotateCcw className="h-3.5 w-3.5" /> Return</Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setDetailItem(r); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                              {r.status === 'pending' && (r.requestedById === user?.id || isAdmin()) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailItem(r); openEditForm(); }}><Pencil className="h-4 w-4 mr-2" /> Edit Request</DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setDetailItem(r); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 mr-2" /> Delete Request</DropdownMenuItem>
                                </>
                              )}
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detailItem && (<>
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-orange-600" /> {detailItem.toolName}</SheetTitle>
              <SheetDescription>Tool Request — {detailItem.workOrder?.woNumber}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
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
                {((detailItem.status === 'pending' && isSupervisorOrAdmin(user)) || (detailItem.status === 'supervisor_approved' && isStoreOrAdmin(user)) || (detailItem.status === 'storekeeper_approved' && isStoreOrAdmin(user)) || detailItem.status === 'issued') && (<>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {detailItem.status === 'pending' && isSupervisorOrAdmin(user) && (<><Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(detailItem.id, 'supervisor_approve')} disabled={submitting}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button><Button size="sm" variant="destructive" onClick={() => { setRejectTarget({ id: detailItem.id, action: 'supervisor_reject' }); setRejectOpen(true); }} disabled={submitting}>Reject</Button></>)}
                    {detailItem.status === 'supervisor_approved' && isStoreOrAdmin(user) && (<><Button size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => handleAction(detailItem.id, 'storekeeper_approve')} disabled={submitting}><Warehouse className="h-3.5 w-3.5" /> Store Approve</Button><Button size="sm" variant="destructive" onClick={() => { setRejectTarget({ id: detailItem.id, action: 'storekeeper_reject' }); setRejectOpen(true); }} disabled={submitting}>Reject</Button></>)}
                    {detailItem.status === 'storekeeper_approved' && isStoreOrAdmin(user) && (<Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(detailItem.id, 'issue')} disabled={submitting}><Wrench className="h-3.5 w-3.5" /> Issue Tool</Button>)}
                    {detailItem.status === 'issued' && (<Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700" onClick={() => { setConditionTarget(detailItem.id); setConditionOpen(true); }} disabled={submitting}><RotateCcw className="h-3.5 w-3.5" /> Return Tool</Button>)}
                  </div>
                </>)}
                {detailItem.status === 'pending' && (detailItem.requestedById === user?.id || isAdmin()) && (<>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1 border-sky-400 text-sky-700 hover:bg-sky-50" onClick={openEditForm} disabled={submitting}><Pencil className="h-3.5 w-3.5" /> Edit Request</Button>
                    <Button size="sm" variant="outline" className="gap-1 border-red-400 text-red-600 hover:bg-red-50" onClick={() => setDeleteOpen(true)} disabled={submitting}><Trash2 className="h-3.5 w-3.5" /> Delete Request</Button>
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
            </div>
          </>)}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
        
          <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">New Tool Request</h2><p className="text-sm text-muted-foreground">Request tools for a repair work order</p></div>
          <div className="space-y-4">
            <div><Label>Work Order *</Label><AsyncSearchableSelect value={createForm.workOrderId} onValueChange={(v) => setCreateForm(f => ({ ...f, workOrderId: v }))} placeholder="Select work order..." searchPlaceholder="Search work orders..." fetchOptions={async () => { const res = await api.get('/api/work-orders?limit=999'); if (res.success && Array.isArray(res.data)) return res.data.map((w: any) => ({ value: w.id, label: `${w.woNumber} — ${w.title}` })); return []; }} /></div>
            <div><Label>Tool Name *</Label><AsyncSearchableSelect value={createForm.toolId} onValueChange={(v) => { const tool = toolsCache.current.find((t: any) => t.id === v); setCreateForm(f => ({ ...f, toolId: v, toolName: tool ? (tool.name + (tool.serialNumber ? ` (${tool.serialNumber})` : '')) : '' })); }} placeholder="Search tools..." searchPlaceholder="Search by name or serial number..." fetchOptions={fetchTools} /></div>
            <div><Label>Urgency</Label><div className="flex gap-2 mt-1">{Object.entries(URGENCY_CONFIG).map(([key, cfg]) => (<button key={key} onClick={() => setCreateForm(f => ({ ...f, urgency: key }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${createForm.urgency === key ? cfg.color + ' ring-2 ring-offset-1 ring-gray-300' : 'border-gray-200 text-muted-foreground hover:border-gray-300'}`}><span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />{cfg.label}</button>))}</div></div>
            <div><Label>Reason * <span className="text-xs text-muted-foreground">(min 5 chars)</span></Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} placeholder="Why is this tool needed?" rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Additional information..." rows={2} /></div>
          </div>
          <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={submitting} className="gap-2"><Send className="h-4 w-4" /> Submit</Button></div>
        
      </ResponsiveDialog>

      <RejectDialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectTarget(null); }} onConfirm={(reason) => { if (rejectTarget) handleAction(rejectTarget.id, rejectTarget.action, { notes: reason }); }} title="Reject Tool Request" />
      <ConditionSelectDialog open={conditionOpen} onClose={() => { setConditionOpen(false); setConditionTarget(null); }} onConfirm={(condition) => { if (conditionTarget) handleAction(conditionTarget, 'return', { toolConditionAtReturn: condition }); }} />

      {/* Edit Dialog */}
      <ResponsiveDialog open={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false); }}>
        
          <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">Edit Tool Request</h2><p className="text-sm text-muted-foreground">Modify your pending tool request</p></div>
          <div className="space-y-4">
            <div><Label>Tool Name *</Label><AsyncSearchableSelect value={editForm.toolId} onValueChange={(v) => { const tool = toolsCache.current.find((t: any) => t.id === v); setEditForm(f => ({ ...f, toolId: v, toolName: tool ? (tool.name + (tool.serialNumber ? ` (${tool.serialNumber})` : '')) : '' })); }} placeholder="Search tools..." searchPlaceholder="Search by name or serial number..." fetchOptions={fetchTools} /></div>
            <div><Label>Urgency</Label><div className="flex gap-2 mt-1">{Object.entries(URGENCY_CONFIG).map(([key, cfg]) => (<button key={key} onClick={() => setEditForm(f => ({ ...f, urgency: key }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${editForm.urgency === key ? cfg.color + ' ring-2 ring-offset-1 ring-gray-300' : 'border-gray-200 text-muted-foreground hover:border-gray-300'}`}><span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />{cfg.label}</button>))}</div></div>
            <div><Label>Reason * <span className="text-xs text-muted-foreground">(min 5 chars)</span></Label><Textarea value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} placeholder="Why is this tool needed?" rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Additional information..." rows={2} /></div>
          </div>
          <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEdit} disabled={submitting} className="gap-2"><Send className="h-4 w-4" /> Save Changes</Button></div>
        
      </ResponsiveDialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tool Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tool request for "{detailItem?.toolName}"? This action cannot be undone. The tool will be released back to available if it was reserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className="gap-2"><Trash2 className="h-4 w-4" /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PAGE 3: TOOL TRANSFER REQUESTS
// ============================================================================

export function RepairToolTransfersPage() {
  const { user, hasPermission, isAdmin } = useAuthStore();
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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [createForm, setCreateForm] = useState({ toolId: '', fromUserId: '', toUserId: '', reason: '', notes: '' });

  const activeFilters = useMemo(() => { let c = 0; if (filterStatus !== 'all') c++; if (searchText) c++; return c; }, [filterStatus, searchText]);
  const clearFilters = () => { setFilterStatus('all'); setSearchText(''); setPage(1); };

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (searchText) params.set('search', searchText);
    params.set('page', String(page));
    params.set('limit', '50');
    const [listRes, statsRes] = await Promise.all([
      api.get(`/api/repairs/tool-transfers?${params}`),
      api.get('/api/repairs/tool-transfers?stats=true'),
    ]);
    if (listRes.success) setTransfers(listRes.data || []); else toast.error(listRes.error || 'Failed');
    if (listRes.pagination) setPagination(listRes.pagination);
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, searchText, page]);

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
        {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Transfer</Button>}
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
              {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Transfer</Button>}
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
                          {(hasPermission('work_orders.update') || isAdmin()) && <>
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
                          </>}
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detailItem && (<>
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-teal-600" /> Transfer: {detailItem.tool?.name}</SheetTitle>
              <SheetDescription>{detailItem.tool?.toolCode || ''}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
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
                    <div className={`rounded-lg p-3 text-center ${detailItem.fromUserAcceptedAt ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted/50'}`}>
                      <p className="text-xs text-muted-foreground">From User</p>
                      <p className={`text-sm font-medium ${detailItem.fromUserAcceptedAt ? 'text-emerald-600' : ''}`}>{detailItem.fromUserAcceptedAt ? 'Confirmed' : 'Pending'}</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${detailItem.toUserAcceptedAt ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted/50'}`}>
                      <p className="text-xs text-muted-foreground">To User</p>
                      <p className={`text-sm font-medium ${detailItem.toUserAcceptedAt ? 'text-emerald-600' : ''}`}>{detailItem.toUserAcceptedAt ? 'Confirmed' : 'Pending'}</p>
                    </div>
                  </div>
                </div>
                {detailItem.toolConditionAtTransfer && <div><Label className="text-xs text-muted-foreground">Condition at Transfer</Label><p className="mt-1"><StatusBadge status={detailItem.toolConditionAtTransfer} /></p></div>}
                <div><Label className="text-xs text-muted-foreground">Reason</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.reason}</p></div>
                {detailItem.notes && <div><Label className="text-xs text-muted-foreground">Notes</Label><p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{detailItem.notes}</p></div>}
                {(detailItem.status === 'pending' || detailItem.status === 'storekeeper_approved' || detailItem.status === 'awaiting_handover') && (hasPermission('work_orders.update') || isAdmin()) && (<>
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
                  { label: 'From User Confirmed', date: detailItem.fromUserAcceptedAt, user: detailItem.fromUser?.fullName },
                  { label: 'To User Confirmed', date: detailItem.toUserAcceptedAt, user: detailItem.toUser?.fullName },
                  { label: 'Transfer Complete', date: detailItem.transferredAt },
                ].filter(e => e.date || e.status === 'active')} />
              </TabsContent>
            </Tabs>
            </div>
          </>)}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
        
          <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">New Tool Transfer Request</h2><p className="text-sm text-muted-foreground">Request transfer of a tool to another technician</p></div>
          <div className="space-y-4">
            <div><Label>Tool *</Label><AsyncSearchableSelect value={createForm.toolId} onValueChange={(v) => setCreateForm(f => ({ ...f, toolId: v }))} placeholder="Select tool..." searchPlaceholder="Search tools..." fetchOptions={async () => { const res = await api.get('/api/tools?limit=999'); if (res.success && Array.isArray(res.data)) return res.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.toolCode})` })); return []; }} /></div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>From User *</Label><AsyncSearchableSelect value={createForm.fromUserId} onValueChange={(v) => setCreateForm(f => ({ ...f, fromUserId: v }))} placeholder="Current holder..." searchPlaceholder="Search technicians..." fetchOptions={async () => { const res = await api.get('/api/workers?role=technician'); if (res.success && Array.isArray(res.data)) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username})` })); return []; }} /></div>
                <div><Label>To User *</Label><AsyncSearchableSelect value={createForm.toUserId} onValueChange={(v) => setCreateForm(f => ({ ...f, toUserId: v }))} placeholder="New holder..." searchPlaceholder="Search technicians..." fetchOptions={async () => { const res = await api.get('/api/workers?role=technician'); if (res.success && Array.isArray(res.data)) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username})` })); return []; }} /></div>
              </div>
              {createForm.fromUserId && createForm.toUserId && createForm.fromUserId === createForm.toUserId && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> From and To users must be different</p>
              )}
            </div>
            <div><Label>Reason * <span className="text-xs text-muted-foreground">(min 5 chars)</span></Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} placeholder="Why is this transfer needed?" rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Additional information..." rows={2} /></div>
          </div>
          <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={submitting} className="gap-2"><Send className="h-4 w-4" /> Submit Transfer</Button></div>
        
      </ResponsiveDialog>

      <RejectDialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectTarget(null); }} onConfirm={(reason) => { if (rejectTarget) handleAction(rejectTarget, 'storekeeper_reject', { notes: reason }); }} title="Reject Transfer Request" />
      <ConditionSelectDialog open={conditionOpen} onClose={() => { setConditionOpen(false); setConditionTarget(null); }} onConfirm={(condition) => { if (conditionTarget) handleAction(conditionTarget, 'storekeeper_approve', { toolConditionAtTransfer: condition }); }} />
    </div>
  );
}

// ============================================================================
// PAGE 4: DOWNTIME TRACKING
// ============================================================================

export function RepairDowntimePage() {
  const { user, hasPermission, isAdmin } = useAuthStore();
  const { pageParams } = useNavigationStore();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Cache for asset lookup (used by AsyncSearchableSelect)
  const assetsCache = useRef<any[]>([]);
  const fetchAssets = useCallback(async () => {
    const res = await api.get('/api/assets?limit=500');
    if (res.success && Array.isArray(res.data)) {
      assetsCache.current = res.data;
      return res.data.map((a: any) => ({ value: a.id, label: a.name || a.assetTag }));
    }
    return [];
  }, []);

  const [createForm, setCreateForm] = useState({ workOrderId: '', assetName: '', assetId: '', downtimeStart: '', downtimeEnd: '', reason: '', category: 'unplanned', impactLevel: 'medium', productionLoss: '', notes: '' });
  // End downtime dialog
  const [endDowntimeTarget, setEndDowntimeTarget] = useState<string | null>(null);
  const [endDowntimeTime, setEndDowntimeTime] = useState('');
  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterImpact, setFilterImpact] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [workOrderIdFilter, setWorkOrderIdFilter] = useState('');
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null);

  // Auto-filter from WO detail
  useEffect(() => {
    if (pageParams?.workOrderId) {
      setWorkOrderIdFilter(pageParams.workOrderId);
    }
  }, []);

  const activeFilters = useMemo(() => {
    let c = 0;
    if (filterCategory !== 'all') c++;
    if (filterImpact !== 'all') c++;
    if (filterStatus !== 'all') c++;
    if (searchText) c++;
    return c;
  }, [filterCategory, filterImpact, filterStatus, searchText]);

  const clearFilters = () => { setFilterCategory('all'); setFilterImpact('all'); setFilterStatus('all'); setSearchText(''); setWorkOrderIdFilter(''); setPage(1); };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategory !== 'all') params.set('category', filterCategory);
    if (filterImpact !== 'all') params.set('impactLevel', filterImpact);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (workOrderIdFilter) params.set('workOrderId', workOrderIdFilter);
    if (searchText) params.set('search', searchText);
    params.set('page', String(page));
    params.set('limit', '20');
    const res = await api.get(`/api/repairs/downtime?${params}`);
    if (res.success) {
      setRecords(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } else {
      toast.error(res.error || 'Failed to load');
    }
    setLoading(false);
  }, [filterCategory, filterImpact, filterStatus, page, workOrderIdFilter, searchText]);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl"><Timer className="h-6 w-6 text-red-600" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Downtime Tracking</h2>
              <Badge variant="secondary" className="font-mono">{pagination?.total ?? records.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Track equipment downtime related to repair work orders</p>
          </div>
        </div>
        {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Log Downtime</Button>}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Activity} count={records.filter((r: any) => !r.downtimeEnd).length} label="Ongoing" color="text-red-600" bgColor="bg-red-50" />
        <StatsCard icon={CheckCircle2} count={records.filter((r: any) => !!r.downtimeEnd).length} label="Completed" color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatsCard icon={AlertTriangle} count={records.filter((r: any) => r.category === 'unplanned').length} label="Unplanned" color="text-orange-600" bgColor="bg-orange-50" />
        <StatsCard icon={Clock} count={totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(1)}h` : '0h'} label="Total Downtime" color="text-blue-600" bgColor="bg-blue-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search asset name or WO#..." value={searchText} onChange={(e) => { setSearchText(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="unplanned">Unplanned</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterImpact} onValueChange={(v) => { setFilterImpact(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Impact" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Impact</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <ClearFiltersButton onClick={clearFilters} count={activeFilters} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : records.length === 0 ? (
            <EmptyState icon={Timer} title="No downtime records" description="Log downtime events for repair work orders">
              {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Log Downtime</Button>}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Asset</TableHead>
                    <TableHead>WO #</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r: any, idx: number) => (
                    <TableRow key={r.id} className={`${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.assetName}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{r.workOrder?.woNumber}</Badge></TableCell>
                      <TableCell><StatusBadge status={r.category} /></TableCell>
                      <TableCell><PriorityBadge priority={r.impactLevel} /></TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.durationMinutes ? `${r.durationMinutes.toFixed(0)} min` : <span className="text-red-600">Ongoing</span>}</div>
                        <div className="text-xs text-muted-foreground">{r.downtimeStart ? format(new Date(r.downtimeStart), 'MMM d HH:mm') : ''}</div>
                      </TableCell>
                      <TableCell className="text-sm max-w-48 truncate">{r.reason}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!r.downtimeEnd && (<DropdownMenuItem onClick={() => handleEndDowntime(r.id)}><Timer className="h-4 w-4 mr-2" /> End Downtime</DropdownMenuItem>)}
                            {(hasPermission('work_orders.update') || isAdmin()) && <DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-red-600"><Ban className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
        
          <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">Log Downtime</h2></div>
          <div className="space-y-4">
            <div><Label>Work Order ID *</Label><AsyncSearchableSelect
                value={createForm.workOrderId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, workOrderId: v }))}
                placeholder="Select work order..."
                searchPlaceholder="Search work orders..."
                fetchOptions={async () => {
                  const res = await api.get('/api/work-orders?limit=999');
                  if (res.success && Array.isArray(res.data)) return res.data.map((w: any) => ({ value: w.id, label: `${w.woNumber} — ${w.title}` }));
                  return [];
                }}
              /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Asset Name *</Label><AsyncSearchableSelect value={createForm.assetId} onValueChange={(v) => { const asset = assetsCache.current.find((a: any) => a.id === v); setCreateForm(f => ({ ...f, assetId: v, assetName: asset ? (asset.name || asset.assetTag) : '' })); }} placeholder="Search assets..." searchPlaceholder="Search by name or tag..." fetchOptions={fetchAssets} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateTimePicker label="Start Time *" value={createForm.downtimeStart || undefined} onChange={v => setCreateForm(f => ({ ...f, downtimeStart: v || '' }))} />
              <DateTimePicker label="End Time" value={createForm.downtimeEnd || undefined} onChange={v => setCreateForm(f => ({ ...f, downtimeEnd: v || '' }))} />
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
          <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate}>Save</Button></div>
        
      </ResponsiveDialog>

      {/* End Downtime Dialog */}
      <ResponsiveDialog open={!!endDowntimeTarget} onOpenChange={(open) => { if (!open) setEndDowntimeTarget(null); }}>
        
          <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">End Downtime</h2><p className="text-sm text-muted-foreground">Set the end time for this downtime event.</p></div>
          <div className="space-y-4">
            <DateTimePicker label="End Time *" value={endDowntimeTime || undefined} onChange={v => setEndDowntimeTime(v || '')} />
            <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEndDowntimeTarget(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleEndDowntimeConfirm}>End Downtime</Button>
            </div>
          </div>
        
      </ResponsiveDialog>
    </div>
  );
}

// ============================================================================
// PAGE 5: REPAIR COMPLETION & CLOSURE
// ============================================================================

export function RepairCompletionPage() {
  const { user, hasPermission, isAdmin } = useAuthStore();
  const { pageParams } = useNavigationStore();
  const [woId, setWoId] = useState('');
  const [completion, setCompletion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ completionNotes: '', findings: '', rootCause: '', correctiveAction: '', totalLaborHours: '', totalMaterialCost: '', totalToolCost: '', totalDowntimeMinutes: '', closureNotes: '' });
  // Rework reason dialog
  const [reworkDialogOpen, setReworkDialogOpen] = useState(false);
  const [reworkReasonValue, setReworkReasonValue] = useState('');

  // Auto-load WO from pageParams (e.g. navigating from WO detail)
  useEffect(() => {
    if (pageParams?.workOrderId && !woId) {
      setWoId(pageParams.workOrderId);
    }
  }, []);

  const fetchCompletion = useCallback(async () => {
    if (!woId) return;
    setLoading(true);
    const res = await api.get(`/api/repairs/completion/${woId}`);
    if (res.success) setCompletion(res.data);
    else setCompletion(null);
    setLoading(false);
  }, [woId]);

  // Auto-fetch when woId changes (handles both manual selection and pageParams auto-load)
  useEffect(() => {
    if (woId) fetchCompletion();
  }, [woId, fetchCompletion]);

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
          <div className="flex-1">
            <AsyncSearchableSelect
              value={woId}
              onValueChange={setWoId}
              placeholder="Search work orders..."
              searchPlaceholder="Search by WO number or title..."
              fetchOptions={async () => {
                const res = await api.get('/api/work-orders?limit=999');
                if (res.success && res.data) {
                  return res.data.map((w: any) => ({
                    value: w.id,
                    label: `${w.woNumber} — ${w.title}`,
                  }));
                }
                return [];
              }}
            />
          </div>
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
                {(completion.supervisorStatus === 'pending_review' || completion.supervisorStatus === 'rework_requested') && (hasPermission('work_orders.update') || isAdmin()) && (
                  <Button onClick={() => handleSubmit('submit')} disabled={submitting}><CheckCircle2 className="h-4 w-4 mr-2" /> {completion.supervisorStatus === 'rework_requested' ? 'Resubmit Completion' : 'Submit Completion'}</Button>
                )}
                {completion.supervisorStatus === 'pending_review' && (hasPermission('work_orders.update') || isAdmin()) && (
                  <Button variant="destructive" onClick={() => { setReworkDialogOpen(true); }} disabled={submitting}><RotateCcw className="h-4 w-4 mr-2" /> Request Rework</Button>
                )}
                {completion.supervisorStatus === 'pending_review' && (hasPermission('work_orders.update') || isAdmin()) && (
                  <Button variant="outline" className="border-green-600 text-green-600" onClick={() => handleSubmit('supervisor_approve')} disabled={submitting}><ShieldCheck className="h-4 w-4 mr-2" /> Supervisor Approve</Button>
                )}
                {completion.supervisorStatus === 'approved' && completion.plannerStatus === 'pending_closure' && (hasPermission('work_orders.update') || isAdmin()) && (                  <>
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
      <ResponsiveDialog open={reworkDialogOpen} onOpenChange={setReworkDialogOpen}>
        
          <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">Request Rework</h2><p className="text-sm text-muted-foreground">Please provide a reason for requesting rework.</p></div>
          <Textarea value={reworkReasonValue} onChange={e => setReworkReasonValue(e.target.value)} placeholder="Rework reason..." rows={3} />
          <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => { setReworkDialogOpen(false); setReworkReasonValue(''); }}>Cancel</Button>
            <Button variant="destructive" disabled={!reworkReasonValue.trim() || submitting} onClick={() => { setReworkDialogOpen(false); handleSubmit('supervisor_request_rework'); }}>Request Rework</Button>
          </div>
        
      </ResponsiveDialog>
    </div>
  );
}

// ============================================================================
// PAGE 6: REPAIR ANALYTICS KPIs
// ============================================================================

export function RepairAnalyticsPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reconReport, setReconReport] = useState<any>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconPage, setReconPage] = useState(1);

  // New report state
  const [enterpriseReport, setEnterpriseReport] = useState<any>(null);
  const [enterpriseLoading, setEnterpriseLoading] = useState(false);
  const [downtimeReport, setDowntimeReport] = useState<any>(null);
  const [downtimeLoading, setDowntimeLoading] = useState(false);
  const [repeatReport, setRepeatReport] = useState<any>(null);
  const [repeatLoading, setRepeatLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    (async () => {
      const res = await api.get('/api/repairs/kpi');
      if (res.success) setKpi(res.data);
      setLoading(false);
    })();
  }, []);

  const fetchReconReport = useCallback(async (p: number = 1) => {
    setReconLoading(true);
    const res = await api.get(`/api/repairs/material-requests/reconciliation-report?page=${p}&limit=10`);
    if (res.success) {
      setReconReport(res.data);
      setReconPage(p);
    } else {
      toast.error(res.error || 'Failed to load reconciliation report');
    }
    setReconLoading(false);
  }, []);

  const fetchEnterpriseReport = useCallback(async () => {
    setEnterpriseLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const res = await api.get(`/api/reports/enterprise?${params}`);
    if (res.success) setEnterpriseReport(res.data);
    else toast.error(res.error || 'Failed to load enterprise report');
    setEnterpriseLoading(false);
  }, [dateFrom, dateTo]);

  const fetchDowntimeReport = useCallback(async () => {
    setDowntimeLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const res = await api.get(`/api/reports/downtime?${params}`);
    if (res.success) setDowntimeReport(res.data);
    else toast.error(res.error || 'Failed to load downtime report');
    setDowntimeLoading(false);
  }, [dateFrom, dateTo]);

  const fetchRepeatReport = useCallback(async () => {
    setRepeatLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const res = await api.get(`/api/reports/repeat-failures?${params}`);
    if (res.success) setRepeatReport(res.data);
    else toast.error(res.error || 'Failed to load repeat failure report');
    setRepeatLoading(false);
  }, [dateFrom, dateTo]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-blue-600" /> Repairs Analytics</h2>
          <p className="text-muted-foreground">Key performance indicators and enterprise reports for the repairs module</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker from={dateFrom || undefined} to={dateTo || undefined} onChange={(f, t) => { setDateFrom(f || ''); setDateTo(t || ''); }} />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }} className="h-9"><X className="h-3.5 w-3.5" /></Button>
          )}
        </div>
      </div>

      {!kpi ? (
        <EmptyState icon={BarChart3} title="No data available" />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="backlog" className="gap-1"><Clock className="h-3.5 w-3.5" /> Backlog</TabsTrigger>
            <TabsTrigger value="downtime-deep" className="gap-1"><Timer className="h-3.5 w-3.5" /> Downtime</TabsTrigger>
            <TabsTrigger value="repeat-failures" className="gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Repeat Failures</TabsTrigger>
            <TabsTrigger value="reconciliation" className="gap-1"><ClipboardList className="h-3.5 w-3.5" /> Reconciliation</TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Work Order Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-3xl font-bold text-blue-700">{kpi.workOrders?.total}</p><p className="text-xs text-muted-foreground">Total WOs</p></div>
                <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-3xl font-bold text-green-700">{kpi.workOrders?.completionRate}%</p><p className="text-xs text-muted-foreground">Completion Rate</p></div>
                <div className="text-center p-3 bg-orange-50 rounded-lg"><p className="text-3xl font-bold text-orange-700">{kpi.workOrders?.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
                <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-3xl font-bold text-red-700">{kpi.workOrders?.overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
                <div className="text-center p-3 bg-purple-50 rounded-lg"><p className="text-3xl font-bold text-purple-700">{kpi.workOrders?.avgLaborHours || 0}h</p><p className="text-xs text-muted-foreground">Avg Hours</p></div>
              </div>
            </CardContent>
          </Card>

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
          </TabsContent>

          {/* ===== BACKLOG ANALYSIS TAB ===== */}
          <TabsContent value="backlog" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Backlog Analysis</h3>
                <p className="text-sm text-muted-foreground">Open work orders by age bracket, priority, and department</p>
              </div>
              <Button onClick={fetchEnterpriseReport} disabled={enterpriseLoading} className="gap-2"><RefreshCw className={`h-4 w-4 ${enterpriseLoading ? 'animate-spin' : ''}`} /> Load Report</Button>
            </div>

            {enterpriseLoading && !enterpriseReport ? <LoadingSkeleton /> : enterpriseReport ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard icon={Clock} count={enterpriseReport.backlogAnalytics?.totalOpen || 0} label="Total Open WOs" color="text-amber-600" bgColor="bg-amber-50" />
                  <StatsCard icon={BarChart3} count={enterpriseReport.summary?.completionRate || 0} label="Completion Rate" color="text-emerald-600" bgColor="bg-emerald-50" />
                  <StatsCard icon={DollarSign} count={formatCurrency(enterpriseReport.summary?.totalMaintenanceCost || 0)} label="Total Maint. Cost" color="text-teal-600" bgColor="bg-teal-50" />
                  <StatsCard icon={TrendingUp} count={enterpriseReport.summary?.avgCostPerWO || 0} label="Avg Cost/WO" color="text-sky-600" bgColor="bg-sky-50" />
                </div>

                {/* Backlog by Age */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-600" /> Backlog by Age Bracket</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {enterpriseReport.backlogAnalytics?.byAgeBracket?.map((bracket: any) => {
                        const total = enterpriseReport.backlogAnalytics.totalOpen || 1;
                        const pct = Math.round((bracket.count / total) * 100);
                        const color = bracket.ageBracket.includes('60+') ? 'bg-red-500' : bracket.ageBracket.includes('31') ? 'bg-orange-500' : bracket.ageBracket.includes('15') ? 'bg-amber-500' : 'bg-teal-500';
                        return (
                          <div key={bracket.ageBracket} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{bracket.ageBracket}</span>
                              <span className="text-muted-foreground">{bracket.count} WOs ({pct}%)</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Backlog by Priority */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle>By Priority</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {enterpriseReport.backlogAnalytics?.byPriority?.map((p: any) => (
                            <TableRow key={p.priority}>
                              <TableCell><PriorityBadge priority={p.priority} /></TableCell>
                              <TableCell className="text-right font-medium">{p.count}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{enterpriseReport.backlogAnalytics.totalOpen > 0 ? Math.round(p.count / enterpriseReport.backlogAnalytics.totalOpen * 100) : 0}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Cost Analytics */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-teal-600" /> Cost Breakdown</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[
                          { label: 'Labor', value: enterpriseReport.costAnalytics?.labor || 0, color: 'text-blue-600' },
                          { label: 'Parts', value: enterpriseReport.costAnalytics?.parts || 0, color: 'text-amber-600' },
                          { label: 'Contractor', value: enterpriseReport.costAnalytics?.contractor || 0, color: 'text-purple-600' },
                        ].map(item => (
                          <div key={item.label} className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            <span className={`font-semibold ${item.color}`}>{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between items-center font-bold">
                          <span>Total</span>
                          <span className="text-teal-700">{formatCurrency(enterpriseReport.costAnalytics?.total || 0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* SLA Compliance */}
                {enterpriseReport.slaComplianceByPriority && enterpriseReport.slaComplianceByPriority.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>SLA Compliance by Priority</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead className="text-right">Within SLA</TableHead><TableHead className="text-right">Breached</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Compliance</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {enterpriseReport.slaComplianceByPriority.map((s: any) => (
                            <TableRow key={s.priority}>
                              <TableCell><PriorityBadge priority={s.priority} /></TableCell>
                              <TableCell className="text-right text-emerald-600">{s.withinSLA}</TableCell>
                              <TableCell className="text-right text-red-500">{s.breached}</TableCell>
                              <TableCell className="text-right">{s.total}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className={s.compliancePercent >= 90 ? 'bg-emerald-100 text-emerald-700' : s.compliancePercent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                                  {s.compliancePercent}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card><CardContent className="py-12"><EmptyState icon={Clock} title="No backlog data" description="Click 'Load Report' to generate the backlog analysis" /></CardContent></Card>
            )}
          </TabsContent>

          {/* ===== DOWNTIME DEEP DIVE TAB ===== */}
          <TabsContent value="downtime-deep" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Downtime Deep Dive</h3>
                <p className="text-sm text-muted-foreground">Detailed downtime analysis with MTBF, MTTR, and availability metrics</p>
              </div>
              <Button onClick={fetchDowntimeReport} disabled={downtimeLoading} className="gap-2"><RefreshCw className={`h-4 w-4 ${downtimeLoading ? 'animate-spin' : ''}`} /> Load Report</Button>
            </div>

            {downtimeLoading && !downtimeReport ? <LoadingSkeleton /> : downtimeReport ? (
              <>
                {/* KPI Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatsCard icon={Timer} count={`${downtimeReport.metrics?.totalDowntimeHours || 0}h`} label="Total Downtime" color="text-red-600" bgColor="bg-red-50" />
                  <StatsCard icon={Activity} count={`${downtimeReport.metrics?.mtbfHours || 0}h`} label="MTBF" color="text-blue-600" bgColor="bg-blue-50" />
                  <StatsCard icon={Wrench} count={`${downtimeReport.metrics?.mttrHours || 0}h`} label="MTTR" color="text-orange-600" bgColor="bg-orange-50" />
                  <StatsCard icon={TrendingUp} count={`${downtimeReport.metrics?.availabilityPercent || 100}%`} label="Availability" color="text-emerald-600" bgColor="bg-emerald-50" />
                  <StatsCard icon={AlertTriangle} count={downtimeReport.metrics?.totalEvents || 0} label="Downtime Events" color="text-amber-600" bgColor="bg-amber-50" />
                </div>

                {/* Top 10 Assets by Downtime */}
                {downtimeReport.top10Assets && downtimeReport.top10Assets.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Top 10 Assets by Downtime</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead className="text-right">Events</TableHead><TableHead className="text-right">Total Hours</TableHead><TableHead className="text-right">Planned (h)</TableHead><TableHead className="text-right">Unplanned (h)</TableHead><TableHead className="text-right">Prod. Loss</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {downtimeReport.top10Assets.map((a: any, idx: number) => (
                              <TableRow key={a.assetName}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-5">#{idx + 1}</span>
                                    <span className="font-medium text-sm">{a.assetName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{a.events}</TableCell>
                                <TableCell className="text-right font-semibold text-red-600">{a.totalHours}</TableCell>
                                <TableCell className="text-right text-blue-600">{a.plannedHours}</TableCell>
                                <TableCell className="text-right text-red-500">{a.unplannedHours}</TableCell>
                                <TableCell className="text-right text-amber-600">{a.productionLoss > 0 ? formatCurrency(a.productionLoss) : '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {/* By Category */}
                  {downtimeReport.breakdownByCategory && downtimeReport.breakdownByCategory.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Events</TableHead><TableHead className="text-right">Hours</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {downtimeReport.breakdownByCategory.map((c: any) => (
                              <TableRow key={c.category}>
                                <TableCell><StatusBadge status={c.category} /></TableCell>
                                <TableCell className="text-right">{c.events}</TableCell>
                                <TableCell className="text-right font-medium">{c.totalHours}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cost Impact */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-teal-600" /> Cost Impact</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Production Loss</span><span className="font-semibold text-red-600">{formatCurrency(downtimeReport.costImpact?.totalProductionLoss || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Related WO Cost</span><span className="font-semibold">{formatCurrency(downtimeReport.costImpact?.relatedWOCost || 0)}</span></div>
                        <Separator />
                        <div className="flex justify-between items-center font-bold text-lg"><span>Est. Total Impact</span><span className="text-red-700">{formatCurrency(downtimeReport.costImpact?.estimatedTotalImpact || 0)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Trend */}
                {downtimeReport.trending?.data && downtimeReport.trending.data.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Downtime Trend ({downtimeReport.trending.grouping})</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {downtimeReport.trending.data.map((t: any) => {
                          const maxHours = Math.max(...downtimeReport.trending.data.map((d: any) => d.totalHours), 1);
                          const pct = Math.round((t.totalHours / maxHours) * 100);
                          return (
                            <div key={t.period} className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{t.period}</span>
                              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${pct}%` }} /></div>
                              <span className="text-xs font-medium w-16 text-right">{t.totalHours}h</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card><CardContent className="py-12"><EmptyState icon={Timer} title="No downtime data" description="Click 'Load Report' to generate the downtime analysis" /></CardContent></Card>
            )}
          </TabsContent>

          {/* ===== REPEAT FAILURES TAB ===== */}
          <TabsContent value="repeat-failures" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Repeat Failure Analysis</h3>
                <p className="text-sm text-muted-foreground">Assets with recurring failures requiring investigation</p>
              </div>
              <Button onClick={fetchRepeatReport} disabled={repeatLoading} className="gap-2"><RefreshCw className={`h-4 w-4 ${repeatLoading ? 'animate-spin' : ''}`} /> Load Report</Button>
            </div>

            {repeatLoading && !repeatReport ? <LoadingSkeleton /> : repeatReport ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatsCard icon={AlertTriangle} count={repeatReport.problematicAssets?.length || 0} label="Problematic Assets" color="text-red-600" bgColor="bg-red-50" />
                  <StatsCard icon={FileText} count={repeatReport.totalFailureRecords || 0} label="Total Failure Records" color="text-slate-600" bgColor="bg-slate-50" />
                  <StatsCard icon={Info} count={repeatReport.recommendedActions?.length || 0} label="Recommended Actions" color="text-amber-600" bgColor="bg-amber-50" />
                </div>

                {/* Problematic Assets Table */}
                {repeatReport.problematicAssets && repeatReport.problematicAssets.length > 0 ? (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Problematic Assets (3+ Failures)</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Asset</TableHead>
                              <TableHead className="text-center">Failures</TableHead>
                              <TableHead>Failure Modes</TableHead>
                              <TableHead className="text-right">Downtime</TableHead>
                              <TableHead className="text-right">Cost</TableHead>
                              <TableHead className="text-right">Freq/Month</TableHead>
                              <TableHead>Last Failure</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {repeatReport.problematicAssets.map((a: any) => (
                              <TableRow key={a.assetId}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{a.assetName}</p>
                                    {a.assetCode && <p className="text-xs text-muted-foreground">{a.assetCode}</p>}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={a.failureCount >= 5 ? 'bg-red-100 text-red-700' : a.failureCount >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}>
                                    {a.failureCount}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {a.failureModes?.map((fm: string) => (
                                      <Badge key={fm} variant="secondary" className="text-[10px]">{fm}</Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-red-600">{a.totalDowntimeHours}h</TableCell>
                                <TableCell className="text-right">{formatCurrency(a.totalRepairCost)}</TableCell>
                                <TableCell className="text-right font-medium text-orange-600">{a.frequencyPerMonth}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {a.lastFailureDate ? formatDistanceToNow(new Date(a.lastFailureDate), { addSuffix: true }) : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card><CardContent className="py-8"><EmptyState icon={CheckCircle2} title="No problematic assets found" description="All assets are within acceptable failure thresholds" /></CardContent></Card>
                )}

                {/* Recommended Actions */}
                {repeatReport.recommendedActions && repeatReport.recommendedActions.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-amber-500" /> Recommended Actions</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {repeatReport.recommendedActions.map((action: any, idx: number) => {
                          const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
                            pm_schedule_review: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                            component_replacement: { icon: Wrench, color: 'text-red-600', bg: 'bg-red-50' },
                            rca: { icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
                            replacement_analysis: { icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
                          };
                          const cfg = typeConfig[action.type] || { icon: Info, color: 'text-slate-600', bg: 'bg-slate-50' };
                          const IconComp = cfg.icon;
                          return (
                            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${action.priority === 'high' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/30'}`}>
                              <div className={`${cfg.bg} p-2 rounded-lg flex-shrink-0 mt-0.5`}><IconComp className={`h-4 w-4 ${cfg.color}`} /></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{action.action}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                              </div>
                              <Badge variant="outline" className={action.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                                {action.priority}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Root Cause Frequency */}
                {repeatReport.rootCauseFrequency && repeatReport.rootCauseFrequency.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Top Root Causes</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead>Root Cause</TableHead><TableHead className="text-right">Occurrences</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {repeatReport.rootCauseFrequency.map((rc: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm max-w-md truncate">{rc.rootCause}</TableCell>
                              <TableCell className="text-right"><Badge variant="secondary">{rc.count}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card><CardContent className="py-12"><EmptyState icon={AlertTriangle} title="No repeat failure data" description="Click 'Load Report' to generate the repeat failure analysis" /></CardContent></Card>
            )}
          </TabsContent>

          {/* ===== RECONCILIATION TAB ===== */}
          <TabsContent value="reconciliation" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Material Reconciliation Report</h3>
                <p className="text-sm text-muted-foreground">Track consumed, wasted, and returned materials across all repair work orders</p>
              </div>
              <Button onClick={() => fetchReconReport(1)} disabled={reconLoading} className="gap-2"><RefreshCw className={`h-4 w-4 ${reconLoading ? 'animate-spin' : ''}`} /> Load Report</Button>
            </div>

            {reconReport ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-violet-700">{reconReport.summary.totalRecords}</p>
                    <p className="text-xs text-muted-foreground">Total Issued</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-teal-700">{reconReport.summary.overallReconciliationRate}%</p>
                    <p className="text-xs text-muted-foreground">Reconciliation Rate</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{reconReport.summary.overallWasteRate}%</p>
                    <p className="text-xs text-muted-foreground">Waste Rate</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-700">{reconReport.summary.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">Reported</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <StatsCard icon={PackageOpen} count={reconReport.summary.totalRequested} label="Total Requested" color="text-slate-600" bgColor="bg-slate-50" />
                  <StatsCard icon={PackageCheck} count={reconReport.summary.totalIssued} label="Total Issued" color="text-emerald-600" bgColor="bg-emerald-50" />
                  <StatsCard icon={ClipboardList} count={reconReport.summary.totalConsumed} label="Total Consumed" color="text-teal-600" bgColor="bg-teal-50" />
                  <StatsCard icon={AlertTriangle} count={reconReport.summary.totalWasted} label="Total Wasted" color="text-red-600" bgColor="bg-red-50" />
                  <StatsCard icon={RotateCcw} count={reconReport.summary.totalReturned} label="Total Returned" color="text-amber-600" bgColor="bg-amber-50" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <StatsCard icon={DollarSign} count={formatCurrency(reconReport.summary.totalCost)} label="Total Issued Cost" color="text-sky-600" bgColor="bg-sky-50" />
                  <StatsCard icon={DollarSign} count={formatCurrency(reconReport.summary.totalWastedCost)} label="Total Waste Cost" color="text-red-600" bgColor="bg-red-50" />
                  <StatsCard icon={TrendingUp} count={formatCurrency(reconReport.summary.savingsFromReturns)} label="Savings from Returns" color="text-emerald-600" bgColor="bg-emerald-50" />
                </div>

                {reconReport.itemBreakdown && reconReport.itemBreakdown.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Top Wasteful Items</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Total Issued</TableHead><TableHead className="text-right">Wasted</TableHead><TableHead className="text-right">Waste Rate</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {reconReport.itemBreakdown.slice(0, 5).map((item: any) => (
                            <TableRow key={item.itemName}>
                              <TableCell className="font-medium">{item.itemName}</TableCell>
                              <TableCell className="text-right">{item.totalIssued}</TableCell>
                              <TableCell className="text-right text-red-600">{item.totalWasted}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className={item.wasteRate > 20 ? 'bg-red-100 text-red-700' : item.wasteRate > 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                                  {item.wasteRate}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader><CardTitle>Reconciliation Details</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>WO #</TableHead><TableHead className="text-right">Issued</TableHead><TableHead className="text-right">Consumed</TableHead><TableHead className="text-right">Wasted</TableHead><TableHead className="text-right">Returned</TableHead><TableHead className="text-right">Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {reconReport.details.map((d: any) => (
                            <TableRow key={d.id}>
                              <TableCell className="font-medium text-sm">{d.itemName}</TableCell>
                              <TableCell><Badge variant="outline" className="font-mono text-xs">{d.woNumber}</Badge></TableCell>
                              <TableCell className="text-right">{d.issuedQty}</TableCell>
                              <TableCell className="text-right text-teal-600">{d.consumedQty}</TableCell>
                              <TableCell className="text-right text-red-500">{d.wastedQty}</TableCell>
                              <TableCell className="text-right text-amber-600">{d.returnedQty}</TableCell>
                              <TableCell className="text-right">
                                {d.reconciliationRate !== null ? (
                                  <Badge variant="outline" className={d.reconciliationRate >= 90 ? 'bg-emerald-100 text-emerald-700' : d.reconciliationRate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                                    {d.reconciliationRate}%
                                  </Badge>
                                ) : <span className="text-xs text-muted-foreground">Pending</span>}
                              </TableCell>
                              <TableCell>{d.isReconciled ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Clock className="h-4 w-4 text-amber-500" />}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {reconReport.pagination && reconReport.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Page {reconReport.pagination.page} of {reconReport.pagination.totalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={reconPage <= 1} onClick={() => fetchReconReport(reconPage - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={reconPage >= reconReport.pagination.totalPages} onClick={() => fetchReconReport(reconPage + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <EmptyState icon={ClipboardList} title="No reconciliation data loaded" description="Click 'Load Report' to generate the reconciliation report" />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ============================================================================
// PAGE 8: SPARE PART RETURNS (Reusable Parts Refurbishment)
// ============================================================================

const SPARE_RETURN_STAGES: PipelineStage[] = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'inspected', label: 'Inspected', icon: Eye },
  { key: 'refurbishing', label: 'Refurbishing', icon: Wrench },
  { key: 'refurbished', label: 'Refurbished', icon: CheckCircle2 },
  { key: 'returned_to_store', label: 'In Store', icon: Warehouse },
  { key: 'disposed', label: 'Disposed', icon: Ban },
];

export function SparePartReturnsPage() {
  const { user, hasPermission, isAdmin } = useAuthStore();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    workOrderId: '', itemId: '', itemName: '', partSerialNumber: '', quantity: '1',
    conditionOnReturn: 'used', damageDescription: '', refurbishmentNeeded: false,
    refurbishmentNotes: '', estimatedRefurbCost: '', notes: '',
  });
  const [actionOpen, setActionOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: string; action: string } | null>(null);
  const [actionForm, setActionForm] = useState({ notes: '', refurbishmentNeeded: true, estimatedCost: '', disposalReason: '' });

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    params.set('page', String(page));
    params.set('limit', '20');
    const [listRes, statsRes] = await Promise.all([
      api.get(`/api/repairs/spare-part-returns?${params}`),
      api.get('/api/repairs/spare-part-returns?stats=true'),
    ]);
    if (listRes.success) { setReturns(listRes.data || []); if (listRes.pagination) setPagination(listRes.pagination); }
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const handleCreate = async () => {
    if (!createForm.workOrderId || !createForm.itemName) { toast.error('Work Order and Item Name are required'); return; }
    setSubmitting(true);
    const res = await api.post('/api/repairs/spare-part-returns', {
      workOrderId: createForm.workOrderId, itemId: createForm.itemId || undefined,
      itemName: createForm.itemName, partSerialNumber: createForm.partSerialNumber || undefined,
      quantity: parseFloat(createForm.quantity) || 1, conditionOnReturn: createForm.conditionOnReturn,
      damageDescription: createForm.damageDescription || undefined,
      refurbishmentNeeded: createForm.refurbishmentNeeded,
      refurbishmentNotes: createForm.refurbishmentNotes || undefined,
      estimatedRefurbCost: createForm.estimatedRefurbCost ? parseFloat(createForm.estimatedRefurbCost) : undefined,
      notes: createForm.notes || undefined,
    });
    if (res.success) {
      toast.success('Spare part return created'); setCreateOpen(false);
      setCreateForm({ workOrderId: '', itemId: '', itemName: '', partSerialNumber: '', quantity: '1', conditionOnReturn: 'used', damageDescription: '', refurbishmentNeeded: false, refurbishmentNotes: '', estimatedRefurbCost: '', notes: '' });
      fetchReturns();
    } else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const handleAction = async (id: string, action: string, extra?: Record<string, any>) => {
    setSubmitting(true);
    const res = await api.post(`/api/repairs/spare-part-returns/${id}`, { action, ...extra });
    if (res.success) { toast.success('Action completed'); fetchReturns(); if (detailOpen && detailItem?.id === id) { setDetailOpen(false); } setActionOpen(false); }
    else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const filtered = useMemo(() => returns.filter(r =>
    !searchText || r.itemName?.toLowerCase().includes(searchText.toLowerCase()) || r.returnNumber?.toLowerCase().includes(searchText.toLowerCase())
  ), [returns, searchText]);

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-xl"><RefreshCw className="h-6 w-6 text-teal-700" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Spare Part Returns</h2>
              <Badge variant="secondary" className="font-mono">{returns.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Track reusable parts returned from machines for refurbishment</p>
          </div>
        </div>
        {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Return</Button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Clock} count={stats?.byStatus?.pending ?? 0} label="Pending Inspection" color="text-yellow-600" bgColor="bg-yellow-50" />
        <StatsCard icon={Wrench} count={stats?.byStatus?.refurbishing ?? 0} label="Being Refurbished" color="text-blue-600" bgColor="bg-blue-50" />
        <StatsCard icon={CheckCircle2} count={stats?.byStatus?.refurbished ?? 0} label="Refurbished" color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatsCard icon={Warehouse} count={stats?.byStatus?.returned_to_store ?? 0} label="Back in Store" color="text-teal-600" bgColor="bg-teal-50" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search parts..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inspected">Inspected</SelectItem>
            <SelectItem value="refurbishing">Refurbishing</SelectItem>
            <SelectItem value="refurbished">Refurbished</SelectItem>
            <SelectItem value="returned_to_store">Returned to Store</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={RefreshCw} title="No spare part returns" description="Return reusable parts from machines for refurbishment" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Return #</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>WO #</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setDetailItem(r); setDetailOpen(true); }}>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{r.returnNumber}</Badge></TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.itemName}</div>
                        {r.partSerialNumber && <div className="text-xs text-muted-foreground">SN: {r.partSerialNumber}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{r.workOrder?.woNumber}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={r.conditionOnReturn === 'good' || r.conditionOnReturn === 'new' ? 'bg-emerald-100 text-emerald-800' : r.conditionOnReturn === 'damaged' || r.conditionOnReturn === 'worn' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>
                          {r.conditionOnReturn?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="font-medium">{r.quantity}</span></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={r.status} />
                          <MiniPipeline stages={SPARE_RETURN_STAGES} currentStatus={r.status} />
                        </div>
                      </TableCell>
                      <TableCell><OverduePulse isOverdue={false} date={r.createdAt} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {r.status === 'pending' && (isAdmin() || hasPermission('inventory.update')) && (
                            <Button size="sm" className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setActionTarget({ id: r.id, action: 'inspect' }); setActionForm({ notes: '', refurbishmentNeeded: true, estimatedCost: '', disposalReason: '' }); setActionOpen(true); }}>
                              <Eye className="h-3.5 w-3.5" /> Inspect
                            </Button>
                          )}
                          {r.status === 'inspected' && r.refurbishmentNeeded && (isAdmin() || hasPermission('inventory.update')) && (
                            <Button size="sm" className="h-7 gap-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => handleAction(r.id, 'start_refurbishment')}>
                              <Wrench className="h-3.5 w-3.5" /> Start Refurb
                            </Button>
                          )}
                          {r.status === 'refurbishing' && (isAdmin() || hasPermission('inventory.update')) && (
                            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(r.id, 'complete_refurbishment')}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </Button>
                          )}
                          {r.status === 'refurbished' && isStoreOrAdmin(user) && (
                            <Button size="sm" className="h-7 gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => handleAction(r.id, 'return_to_store')}>
                              <Warehouse className="h-3.5 w-3.5" /> To Store
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setDetailItem(r); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                              {(isAdmin() || hasPermission('inventory.update')) && r.status !== 'disposed' && r.status !== 'returned_to_store' && r.status !== 'rejected' && (
                                <DropdownMenuItem className="text-red-600" onClick={() => handleAction(r.id, 'dispose', { disposalReason: 'Disposed as unusable' })}><Ban className="h-4 w-4 mr-2" /> Dispose</DropdownMenuItem>
                              )}
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

      {/* Inspect Dialog */}
      <ResponsiveDialog open={actionOpen} onOpenChange={setActionOpen}>
        {actionTarget?.action === 'inspect' && (
          <>
            <div className="space-y-1.5 mb-4">
              <h2 className="text-lg font-semibold">Inspect Spare Part Return</h2>
              <p className="text-sm text-muted-foreground">Assess condition and determine if refurbishment is needed.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <input type="checkbox" id="refurbNeeded" checked={actionForm.refurbishmentNeeded} onChange={e => setActionForm(p => ({ ...p, refurbishmentNeeded: e.target.checked }))} className="h-4 w-4" />
                <Label htmlFor="refurbNeeded">Refurbishment Needed</Label>
              </div>
              {actionForm.refurbishmentNeeded && (
                <div className="space-y-2">
                  <Label>Estimated Refurbishment Cost</Label>
                  <Input type="number" value={actionForm.estimatedCost} onChange={e => setActionForm(p => ({ ...p, estimatedCost: e.target.value }))} placeholder="0.00" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Inspection Notes</Label>
                <Textarea value={actionForm.notes} onChange={e => setActionForm(p => ({ ...p, notes: e.target.value }))} placeholder="Findings from inspection..." rows={3} />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={submitting} onClick={() => handleAction(actionTarget.id, 'inspect', {
                  refurbishmentNeeded: actionForm.refurbishmentNeeded,
                  estimatedRefurbCost: actionForm.estimatedCost ? parseFloat(actionForm.estimatedCost) : undefined,
                  inspectionNotes: actionForm.notes || undefined,
                })}>Submit Inspection</Button>
              </div>
            </div>
          </>
        )}
      </ResponsiveDialog>

      {/* Create Dialog */}
      <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
        <div className="space-y-1.5 mb-4">
          <h2 className="text-lg font-semibold">Return Spare Part</h2>
          <p className="text-sm text-muted-foreground">Register a reusable part returned from a machine during repair.</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Work Order *</Label>
            <AsyncSearchableSelect placeholder="Search work order..." fetchOptions={async (q) => {
              const res = await api.get(`/api/work-orders?search=${q}&status=in_progress,assigned,planned&limit=20`);
              if (res.success) return (res.data || []).map((wo: any) => ({ value: wo.id, label: `${wo.woNumber} - ${wo.title}` }));
              return [];
            }} value={createForm.workOrderId} onChange={v => setCreateForm(p => ({ ...p, workOrderId: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input value={createForm.itemName} onChange={e => setCreateForm(p => ({ ...p, itemName: e.target.value }))} placeholder="Part name" />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={createForm.quantity} onChange={e => setCreateForm(p => ({ ...p, quantity: e.target.value }))} min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input value={createForm.partSerialNumber} onChange={e => setCreateForm(p => ({ ...p, partSerialNumber: e.target.value }))} placeholder="If available" />
            </div>
            <div className="space-y-2">
              <Label>Condition on Return</Label>
              <Select value={createForm.conditionOnReturn} onValueChange={v => setCreateForm(p => ({ ...p, conditionOnReturn: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="worn">Worn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Damage/Wear Description</Label>
            <Textarea value={createForm.damageDescription} onChange={e => setCreateForm(p => ({ ...p, damageDescription: e.target.value }))} placeholder="Describe any damage or wear..." rows={2} />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <input type="checkbox" id="createRefurb" checked={createForm.refurbishmentNeeded} onChange={e => setCreateForm(p => ({ ...p, refurbishmentNeeded: e.target.checked }))} className="h-4 w-4" />
            <Label htmlFor="createRefurb">Needs Refurbishment</Label>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting} onClick={handleCreate}>Submit Return</Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-teal-600" /> {detailItem.returnNumber}</SheetTitle>
                <SheetDescription>{detailItem.itemName}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
              <Tabs defaultValue="details">
                <TabsList className="w-full"><TabsTrigger value="details" className="flex-1">Details</TabsTrigger><TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger></TabsList>
                <TabsContent value="details" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={detailItem.status} /></div></div>
                    <div><Label className="text-xs text-muted-foreground">Condition</Label><p className="text-sm mt-1 capitalize">{detailItem.conditionOnReturn?.replace('_', ' ')}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Quantity</Label><p className="text-sm mt-1 font-medium">{detailItem.quantity}</p></div>
                    <div><Label className="text-xs text-muted-foreground">WO #</Label><p className="text-sm mt-1 font-mono">{detailItem.workOrder?.woNumber}</p></div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Refurbishment</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-sm font-medium">{detailItem.refurbishmentNeeded ? 'Yes' : 'No'}</p>
                        <p className="text-[10px] text-muted-foreground">Needed</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-sm font-medium">{detailItem.estimatedRefurbCost ? formatCurrency(detailItem.estimatedRefurbCost) : '—'}</p>
                        <p className="text-[10px] text-muted-foreground">Est. Cost</p>
                      </div>
                    </div>
                  </div>
                  {detailItem.damageDescription && (
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Damage Description</Label><p className="text-sm bg-red-50 text-red-800 rounded-lg p-2">{detailItem.damageDescription}</p></div>
                  )}
                  {detailItem.inspectionNotes && (
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Inspection Notes</Label><p className="text-sm bg-blue-50 text-blue-800 rounded-lg p-2">{detailItem.inspectionNotes}</p></div>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div><Label className="text-xs text-muted-foreground">Returned By</Label><p className="text-sm mt-1">{detailItem.requestedBy?.fullName}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Created</Label><p className="text-sm mt-1">{format(new Date(detailItem.createdAt), 'MMM d, yyyy')}</p></div>
                  </div>
                </TabsContent>
                <TabsContent value="timeline" className="mt-4">
                  <DetailTimeline events={[
                    { label: 'Part Returned', date: detailItem.createdAt, user: detailItem.requestedBy?.fullName },
                    { label: 'Inspected', date: detailItem.inspectedAt, user: detailItem.inspectedBy?.fullName, notes: detailItem.inspectionNotes },
                    { label: 'Refurbishment Started', date: detailItem.refurbishmentStart, user: detailItem.refurbisher?.fullName },
                    { label: 'Refurbishment Completed', date: detailItem.refurbishmentEnd, user: detailItem.refurbisher?.fullName },
                    { label: 'Returned to Store', date: detailItem.returnedToStoreAt, user: detailItem.returnedToStore?.fullName },
                    { label: 'Disposed', date: detailItem.disposedAt, user: detailItem.disposedByUser?.fullName, notes: detailItem.disposalReason },
                  ].filter(e => e.date)} />
                </TabsContent>
              </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// PAGE 9: DAMAGED TOOL REPORTS
// ============================================================================

const DAMAGE_STAGES: PipelineStage[] = [
  { key: 'reported', label: 'Reported', icon: AlertTriangle },
  { key: 'assessed', label: 'Assessed', icon: Search },
  { key: 'repair_in_progress', label: 'Repairing', icon: Wrench },
  { key: 'repaired', label: 'Repaired', icon: CheckCircle2 },
  { key: 'written_off', label: 'Written Off', icon: Ban },
];

export function DamagedToolReportsPage() {
  const { user, hasPermission, isAdmin } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    toolId: '', workOrderId: '', damageType: 'broken', damageSeverity: 'medium',
    damageDescription: '', occurredAt: '', technicianId: '',
  });
  const [actionOpen, setActionOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: string; action: string } | null>(null);
  const [actionForm, setActionForm] = useState({ notes: '', estimatedCost: '', vendorName: '', reason: '' });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    params.set('page', String(page));
    params.set('limit', '20');
    const [listRes, statsRes] = await Promise.all([
      api.get(`/api/repairs/damaged-tools?${params}`),
      api.get('/api/repairs/damaged-tools?stats=true'),
    ]);
    if (listRes.success) { setReports(listRes.data || []); if (listRes.pagination) setPagination(listRes.pagination); }
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleCreate = async () => {
    if (!createForm.toolId || !createForm.damageDescription) { toast.error('Tool and damage description are required'); return; }
    setSubmitting(true);
    const res = await api.post('/api/repairs/damaged-tools', {
      toolId: createForm.toolId, workOrderId: createForm.workOrderId || undefined,
      damageType: createForm.damageType, damageSeverity: createForm.damageSeverity,
      damageDescription: createForm.damageDescription,
      occurredAt: createForm.occurredAt || undefined, technicianId: createForm.technicianId || undefined,
    });
    if (res.success) {
      toast.success('Damaged tool report created'); setCreateOpen(false);
      setCreateForm({ toolId: '', workOrderId: '', damageType: 'broken', damageSeverity: 'medium', damageDescription: '', occurredAt: '', technicianId: '' });
      fetchReports();
    } else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const handleAction = async (id: string, action: string, extra?: Record<string, any>) => {
    setSubmitting(true);
    const res = await api.post(`/api/repairs/damaged-tools/${id}`, { action, ...extra });
    if (res.success) { toast.success('Action completed'); fetchReports(); if (detailOpen && detailItem?.id === id) setDetailOpen(false); setActionOpen(false); }
    else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  const filtered = useMemo(() => reports.filter(r =>
    !searchText || r.tool?.name?.toLowerCase().includes(searchText.toLowerCase()) || r.reportNumber?.toLowerCase().includes(searchText.toLowerCase()) || r.damageDescription?.toLowerCase().includes(searchText.toLowerCase())
  ), [reports, searchText]);

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl"><AlertTriangle className="h-6 w-6 text-red-700" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Damaged Tool Reports</h2>
              <Badge variant="secondary" className="font-mono">{reports.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Report and track damaged tools with repair lifecycle</p>
          </div>
        </div>
        {(user && (hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin())) && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Report Damage</Button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={AlertTriangle} count={stats?.byStatus?.reported ?? 0} label="Reported" color="text-red-600" bgColor="bg-red-50" />
        <StatsCard icon={Wrench} count={stats?.byStatus?.repair_in_progress ?? 0} label="In Repair" color="text-blue-600" bgColor="bg-blue-50" />
        <StatsCard icon={CheckCircle2} count={stats?.byStatus?.repaired ?? 0} label="Repaired" color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatsCard icon={Ban} count={stats?.byStatus?.written_off ?? 0} label="Written Off" color="text-gray-600" bgColor="bg-gray-50" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tools, reports..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="assessed">Assessed</SelectItem>
            <SelectItem value="repair_quoted">Quoted</SelectItem>
            <SelectItem value="repair_in_progress">In Repair</SelectItem>
            <SelectItem value="repaired">Repaired</SelectItem>
            <SelectItem value="written_off">Written Off</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No damaged tool reports" description="Report tool damage to track repairs and replacements" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Report #</TableHead>
                    <TableHead>Tool</TableHead>
                    <TableHead>Damage</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>WO #</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setDetailItem(r); setDetailOpen(true); }}>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{r.reportNumber}</Badge></TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.tool?.name}</div>
                        <div className="text-xs text-muted-foreground">{r.tool?.toolCode}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{r.damageType?.replace('_', ' ')}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">{r.damageDescription}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={r.damageSeverity === 'critical' ? 'bg-red-100 text-red-800' : r.damageSeverity === 'high' ? 'bg-orange-100 text-orange-800' : r.damageSeverity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}>
                          {r.damageSeverity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={r.status} />
                          <MiniPipeline stages={DAMAGE_STAGES} currentStatus={r.status} />
                        </div>
                      </TableCell>
                      <TableCell>{r.workOrder?.woNumber ? <Badge variant="outline" className="font-mono text-xs">{r.workOrder.woNumber}</Badge> : '—'}</TableCell>
                      <TableCell><OverduePulse isOverdue={false} date={r.createdAt} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {r.status === 'reported' && (isAdmin() || hasPermission('tools.update')) && (
                            <Button size="sm" className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setActionTarget({ id: r.id, action: 'assess' }); setActionForm({ notes: '', estimatedCost: '', vendorName: '', reason: '' }); setActionOpen(true); }}>
                              <Search className="h-3.5 w-3.5" /> Assess
                            </Button>
                          )}
                          {r.status === 'assessed' && (isAdmin() || hasPermission('tools.update')) && (
                            <Button size="sm" className="h-7 gap-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => { setActionTarget({ id: r.id, action: 'start_repair' }); setActionForm({ notes: '', estimatedCost: '', vendorName: '', reason: '' }); setActionOpen(true); }}>
                              <Wrench className="h-3.5 w-3.5" /> Start Repair
                            </Button>
                          )}
                          {r.status === 'repair_in_progress' && (isAdmin() || hasPermission('tools.update')) && (
                            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(r.id, 'complete_repair')}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setDetailItem(r); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                              {(isAdmin() || hasPermission('tools.update')) && !['repaired', 'written_off', 'replaced'].includes(r.status) && (
                                <DropdownMenuItem className="text-red-600" onClick={() => { setActionTarget({ id: r.id, action: 'write_off' }); setActionForm({ notes: '', estimatedCost: '', vendorName: '', reason: '' }); setActionOpen(true); }}><Ban className="h-4 w-4 mr-2" /> Write Off</DropdownMenuItem>
                              )}
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

      {/* Action Dialog */}
      <ResponsiveDialog open={actionOpen} onOpenChange={setActionOpen}>
        {actionTarget?.action === 'assess' && (
          <>
            <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold">Assess Damage</h2><p className="text-sm text-muted-foreground">Evaluate damage and estimate repair cost.</p></div>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Estimated Repair Cost</Label><Input type="number" value={actionForm.estimatedCost} onChange={e => setActionForm(p => ({ ...p, estimatedCost: e.target.value }))} placeholder="0.00" /></div>
              <div className="space-y-2"><Label>Assessment Notes</Label><Textarea value={actionForm.notes} onChange={e => setActionForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={submitting} onClick={() => handleAction(actionTarget.id, 'assess', { assessmentNotes: actionForm.notes, estimatedRepairCost: actionForm.estimatedCost ? parseFloat(actionForm.estimatedCost) : undefined })}>Submit Assessment</Button>
              </div>
            </div>
          </>
        )}
        {actionTarget?.action === 'start_repair' && (
          <>
            <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold">Start Repair</h2><p className="text-sm text-muted-foreground">Begin the repair process.</p></div>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Repair Vendor</Label><Input value={actionForm.vendorName} onChange={e => setActionForm(p => ({ ...p, vendorName: e.target.value }))} placeholder="Vendor or in-house" /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={actionForm.notes} onChange={e => setActionForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white" disabled={submitting} onClick={() => handleAction(actionTarget.id, 'start_repair', { repairVendorName: actionForm.vendorName || undefined })}>Start Repair</Button>
              </div>
            </div>
          </>
        )}
        {actionTarget?.action === 'write_off' && (
          <>
            <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold text-red-600">Write Off Tool</h2><p className="text-sm text-muted-foreground">This will mark the tool as retired and unrepairable.</p></div>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Write-Off Reason *</Label><Textarea value={actionForm.reason} onChange={e => setActionForm(p => ({ ...p, reason: e.target.value }))} rows={3} /></div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
                <Button variant="destructive" disabled={submitting || !actionForm.reason} onClick={() => handleAction(actionTarget.id, 'write_off', { writeOffReason: actionForm.reason })}>Write Off</Button>
              </div>
            </div>
          </>
        )}
      </ResponsiveDialog>

      {/* Create Dialog */}
      <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
        <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold">Report Damaged Tool</h2><p className="text-sm text-muted-foreground">Document tool damage for tracking and repair.</p></div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Tool *</Label>
            <AsyncSearchableSelect placeholder="Search tool..." fetchOptions={async (q) => {
              const res = await api.get(`/api/tools?search=${q}&limit=20`);
              if (res.success) return (res.data || []).map((t: any) => ({ value: t.id, label: `${t.toolCode} - ${t.name}` }));
              return [];
            }} value={createForm.toolId} onChange={v => setCreateForm(p => ({ ...p, toolId: v }))} />
          </div>
          <div className="space-y-2">
            <Label>Work Order (if related)</Label>
            <AsyncSearchableSelect placeholder="Search work order..." fetchOptions={async (q) => {
              const res = await api.get(`/api/work-orders?search=${q}&limit=20`);
              if (res.success) return (res.data || []).map((wo: any) => ({ value: wo.id, label: `${wo.woNumber} - ${wo.title}` }));
              return [];
            }} value={createForm.workOrderId} onChange={v => setCreateForm(p => ({ ...p, workOrderId: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Damage Type *</Label>
              <Select value={createForm.damageType} onValueChange={v => setCreateForm(p => ({ ...p, damageType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="broken">Broken</SelectItem>
                  <SelectItem value="worn">Worn</SelectItem>
                  <SelectItem value="malfunctioning">Malfunctioning</SelectItem>
                  <SelectItem value="missing_parts">Missing Parts</SelectItem>
                  <SelectItem value="cosmetic">Cosmetic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select value={createForm.damageSeverity} onValueChange={v => setCreateForm(p => ({ ...p, damageSeverity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Damage Description *</Label>
            <Textarea value={createForm.damageDescription} onChange={e => setCreateForm(p => ({ ...p, damageDescription: e.target.value }))} placeholder="Describe the damage..." rows={3} />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={submitting} onClick={handleCreate}>Submit Report</Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /> {detailItem.reportNumber}</SheetTitle>
                <SheetDescription>{detailItem.tool?.name} — {detailItem.tool?.toolCode}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
              <Tabs defaultValue="details">
                <TabsList className="w-full"><TabsTrigger value="details" className="flex-1">Details</TabsTrigger><TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger></TabsList>
                <TabsContent value="details" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={detailItem.status} /></div></div>
                    <div><Label className="text-xs text-muted-foreground">Severity</Label><div className="mt-1"><Badge variant="outline" className={detailItem.damageSeverity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>{detailItem.damageSeverity}</Badge></div></div>
                    <div><Label className="text-xs text-muted-foreground">Damage Type</Label><p className="text-sm mt-1 capitalize">{detailItem.damageType?.replace('_', ' ')}</p></div>
                    <div><Label className="text-xs text-muted-foreground">WO #</Label><p className="text-sm mt-1 font-mono">{detailItem.workOrder?.woNumber || '—'}</p></div>
                  </div>
                  <Separator />
                  <div><Label className="text-xs text-muted-foreground">Damage Description</Label><p className="text-sm mt-1 bg-red-50 text-red-900 rounded-lg p-3">{detailItem.damageDescription}</p></div>
                  {detailItem.assessmentNotes && <div><Label className="text-xs text-muted-foreground">Assessment</Label><p className="text-sm mt-1 bg-blue-50 text-blue-900 rounded-lg p-3">{detailItem.assessmentNotes}</p></div>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-lg font-bold">{detailItem.estimatedRepairCost ? formatCurrency(detailItem.estimatedRepairCost) : '—'}</p><p className="text-[10px] text-muted-foreground">Est. Cost</p></div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-lg font-bold">{detailItem.actualRepairCost ? formatCurrency(detailItem.actualRepairCost) : '—'}</p><p className="text-[10px] text-muted-foreground">Actual Cost</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div><Label className="text-xs text-muted-foreground">Reported By</Label><p className="text-sm mt-1">{detailItem.reportedBy?.fullName}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Technician</Label><p className="text-sm mt-1">{detailItem.technician?.fullName || '—'}</p></div>
                  </div>
                </TabsContent>
                <TabsContent value="timeline" className="mt-4">
                  <DetailTimeline events={[
                    { label: 'Damage Reported', date: detailItem.createdAt, user: detailItem.reportedBy?.fullName },
                    { label: 'Assessed', date: detailItem.assessedAt, notes: detailItem.assessmentNotes },
                    { label: 'Repair Started', date: detailItem.repairStartedAt },
                    { label: 'Repair Completed', date: detailItem.repairCompletedAt },
                    { label: 'Written Off', date: detailItem.writtenOffAt, notes: detailItem.writeOffReason },
                  ].filter(e => e.date)} />
                </TabsContent>
              </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// PAGE 10: MAINTENANCE LIFECYCLE REPORTS
// ============================================================================

export function MaintenanceReportsPage() {
  const { user } = useAuthStore();
  const [reportType, setReportType] = useState('lifecycle');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportGenerated, setReportGenerated] = useState(false);

  const REPORT_TYPES = [
    { value: 'lifecycle', label: 'Full Lifecycle', icon: Activity, description: 'MR → WO end-to-end turnaround analysis' },
    { value: 'execution', label: 'WO Execution', icon: ClipboardList, description: 'Completion rates, actual vs estimated hours, rework' },
    { value: 'technician_performance', label: 'Technician Performance', icon: User, description: 'Per-technician WO completion, time accuracy, rework' },
    { value: 'materials', label: 'Materials & Parts', icon: Package, description: 'Material usage, reconciliation, spare part returns' },
    { value: 'downtime', label: 'Downtime Analysis', icon: Timer, description: 'Equipment downtime by asset, category, impact' },
    { value: 'tools', label: 'Tool Management', icon: Wrench, description: 'Damage rates, repair costs, transfers' },
  ];

  const generateReport = async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType });
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (plantFilter) params.set('plantId', plantFilter);
    const res = await api.get(`/api/repairs/reports?${params}`);
    if (res.success) { setReportData(res.data); setReportGenerated(true); }
    else toast.error(res.error || 'Failed to generate report');
    setLoading(false);
  };

  const exportCSV = () => {
    if (!reportData) return;
    const type = reportType;
    let csvContent = '';
    if (type === 'technician_performance' && reportData.technicians) {
      csvContent = 'Technician,WO Completed,Avg Hours/WO,Rework Rate,Total Hours\n' +
        reportData.technicians.map((t: any) =>
          `"${t.name}",${t.woCount},${t.avgHoursPerWo},${t.reworkRate}%,${t.totalHours}`
        ).join('\n');
    } else if (type === 'execution') {
      csvContent = 'Metric,Value\n' + Object.entries(reportData).map(([k, v]: [string, any]) =>
        `${k},${typeof v === 'object' ? JSON.stringify(v) : v}`
      ).join('\n');
    } else if (type === 'downtime' && reportData.byAsset) {
      csvContent = 'Asset,Total Downtime (min),Avg Duration,Incidents,Production Loss\n' +
        reportData.byAsset.map((a: any) =>
          `"${a.assetName}",${a.totalDowntime},${a.avgDuration},${a.incidentCount},${a.totalProductionLoss || 0}`
        ).join('\n');
    } else {
      csvContent = 'Key,Value\n' + Object.entries(reportData).map(([k, v]: [string, any]) =>
        `"${k}",${typeof v === 'object' ? JSON.stringify(v) : v}`
      ).join('\n');
    }
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `maintenance-report-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl"><BarChart3 className="h-6 w-6 text-emerald-700" /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Maintenance Reports</h2>
            <p className="text-sm text-muted-foreground">Enterprise-grade analytics from request to completion</p>
          </div>
        </div>
        {reportGenerated && reportData && (
          <Button variant="outline" onClick={exportCSV} className="gap-2"><DollarSign className="h-4 w-4" /> Export CSV</Button>
        )}
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_TYPES.map(rt => (
          <button key={rt.value} onClick={() => { setReportType(rt.value); setReportGenerated(false); }}
            className={`p-4 rounded-lg border-2 text-left transition-all ${reportType === rt.value ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-gray-300 hover:bg-muted/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <rt.icon className={`h-4 w-4 ${reportType === rt.value ? 'text-emerald-600' : 'text-gray-500'}`} />
              <span className="text-sm font-semibold">{rt.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{rt.description}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <DateRangePicker label="Date Range" from={dateFrom || undefined} to={dateTo || undefined} onChange={(f, t) => { setDateFrom(f || ''); setDateTo(t || ''); }} />
          <Button onClick={generateReport} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? <Activity className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            Generate Report
          </Button>
        </div>
      </Card>

      {/* Report Display */}
      {loading && <LoadingSkeleton />}
      {reportGenerated && reportData && (
        <div className="space-y-4">
          {/* Lifecycle Report */}
          {reportType === 'lifecycle' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard icon={Clock} count={reportData.totalRequests ?? 0} label="Total MRs" color="text-blue-600" bgColor="bg-blue-50" />
                <StatsCard icon={CheckCircle2} count={reportData.convertedToWO ?? 0} label="Converted to WO" color="text-emerald-600" bgColor="bg-emerald-50" />
                <StatsCard icon={Timer} count={`${reportData.avgTurnaroundHours ?? 0}h`} label="Avg Turnaround" color="text-teal-600" bgColor="bg-teal-50" />
                <StatsCard icon={TrendingUp} count={`${reportData.avgMrToWoHours ?? 0}h`} label="MR→WO Time" color="text-amber-600" bgColor="bg-amber-50" />
              </div>
              {reportData.stageBreakdown && (
                <Card><CardHeader><CardTitle className="text-base">Stage Breakdown</CardTitle></CardHeader><CardContent>
                  <div className="space-y-3">
                    {reportData.stageBreakdown.map((stage: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-40 text-sm font-medium truncate">{stage.name}</div>
                        <div className="flex-1"><Progress value={Math.min(100, (stage.avgHours / (reportData.avgTurnaroundHours || 1)) * 100)} className="h-3" /></div>
                        <div className="w-20 text-sm text-right text-muted-foreground">{stage.avgHours?.toFixed(1)}h avg</div>
                        <div className="w-16 text-sm text-right text-muted-foreground">{stage.count} items</div>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
              {reportData.priorityBreakdown && (
                <Card><CardHeader><CardTitle className="text-base">By Priority</CardTitle></CardHeader><CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(reportData.priorityBreakdown).map(([key, val]: [string, any]) => (
                      <div key={key} className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{val.count || 0}</p>
                        <p className="text-xs text-muted-foreground capitalize">{key} ({val.avgHours?.toFixed(1)}h avg)</p>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
            </div>
          )}

          {/* Execution Report */}
          {reportType === 'execution' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard icon={ClipboardList} count={reportData.totalWOs ?? 0} label="Total WOs" color="text-blue-600" bgColor="bg-blue-50" />
                <StatsCard icon={CheckCircle2} count={`${reportData.completionRate ?? 0}%`} label="Completion Rate" color="text-emerald-600" bgColor="bg-emerald-50" />
                <StatsCard icon={Timer} count={`${reportData.avgActualHours ?? 0}h`} label="Avg Actual Hours" color="text-teal-600" bgColor="bg-teal-50" />
                <StatsCard icon={AlertTriangle} count={`${reportData.reworkRate ?? 0}%`} label="Rework Rate" color="text-red-600" bgColor="bg-red-50" />
              </div>
              {reportData.byType && (
                <Card><CardHeader><CardTitle className="text-base">By Work Order Type</CardTitle></CardHeader><CardContent>
                  <div className="space-y-3">
                    {reportData.byType.map((t: any) => (
                      <div key={t.type} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium capitalize">{t.type?.replace('_', ' ')}</div>
                        <div className="flex-1"><Progress value={t.count ? (t.count / reportData.totalWOs) * 100 : 0} className="h-3" /></div>
                        <div className="w-20 text-sm text-right">{t.count} WOs</div>
                        <div className="w-24 text-sm text-right text-muted-foreground">{t.avgHours?.toFixed(1)}h avg</div>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
            </div>
          )}

          {/* Technician Performance Report */}
          {reportType === 'technician_performance' && (
            <div className="space-y-4">
              {reportData.technicians && reportData.technicians.length > 0 ? (
                <Card><CardHeader><CardTitle className="text-base">Technician Performance</CardTitle></CardHeader><CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Technician</TableHead>
                        <TableHead className="text-center">WOs Completed</TableHead>
                        <TableHead className="text-center">Avg Hours/WO</TableHead>
                        <TableHead className="text-center">Total Hours</TableHead>
                        <TableHead className="text-center">Rework Rate</TableHead>
                        <TableHead className="text-center">On-Time Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.technicians.map((t: any) => (
                        <TableRow key={t.userId}>
                          <TableCell><div className="flex items-center gap-2"><AvatarPlaceholder name={t.name} /><span className="font-medium text-sm">{t.name}</span></div></TableCell>
                          <TableCell className="text-center font-medium">{t.woCount}</TableCell>
                          <TableCell className="text-center">{t.avgHoursPerWo?.toFixed(1)}h</TableCell>
                          <TableCell className="text-center">{t.totalHours?.toFixed(1)}h</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={t.reworkRate > 10 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>{t.reworkRate}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={t.onTimeRate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>{t.onTimeRate}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              ) : (
                <Card><CardContent className="py-12"><EmptyState icon={User} title="No data" description="No technician performance data for the selected period" /></CardContent></Card>
              )}
            </div>
          )}

          {/* Materials Report */}
          {reportType === 'materials' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard icon={Package} count={reportData.totalMaterialCost ? formatCurrency(reportData.totalMaterialCost) : '₵0'} label="Total Material Cost" color="text-amber-600" bgColor="bg-amber-50" />
                <StatsCard icon={RefreshCw} count={reportData.sparePartReturns ?? 0} label="Parts Returned" color="text-teal-600" bgColor="bg-teal-50" />
                <StatsCard icon={AlertTriangle} count={`${reportData.wasteRate ?? 0}%`} label="Waste Rate" color="text-red-600" bgColor="bg-red-50" />
                <StatsCard icon={DollarSign} count={reportData.savingsFromReturns ? formatCurrency(reportData.savingsFromReturns) : '₵0'} label="Return Savings" color="text-emerald-600" bgColor="bg-emerald-50" />
              </div>
              {reportData.byItem && (
                <Card><CardHeader><CardTitle className="text-base">Top Materials by Usage</CardTitle></CardHeader><CardContent>
                  <div className="space-y-2">
                    {reportData.byItem.slice(0, 10).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <span className="flex-1 text-sm font-medium truncate">{item.itemName}</span>
                        <span className="text-sm">{item.totalQty}</span>
                        <span className="text-sm font-medium w-24 text-right">{formatCurrency(item.totalCost || 0)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
            </div>
          )}

          {/* Downtime Report */}
          {reportType === 'downtime' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard icon={Timer} count={`${reportData.totalDowntimeMinutes ?? 0}m`} label="Total Downtime" color="text-red-600" bgColor="bg-red-50" />
                <StatsCard icon={Activity} count={`${reportData.avgDurationMinutes ?? 0}m`} label="Avg Duration" color="text-amber-600" bgColor="bg-amber-50" />
                <StatsCard icon={DollarSign} count={reportData.totalProductionLoss ? formatCurrency(reportData.totalProductionLoss) : '₵0'} label="Production Loss" color="text-orange-600" bgColor="bg-orange-50" />
                <StatsCard icon={TrendingUp} count={reportData.incidentCount ?? 0} label="Incidents" color="text-blue-600" bgColor="bg-blue-50" />
              </div>
              {reportData.byAsset && (
                <Card><CardHeader><CardTitle className="text-base">Downtime by Asset</CardTitle></CardHeader><CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50">
                      <TableHead>Asset</TableHead><TableHead className="text-center">Incidents</TableHead><TableHead className="text-center">Total (min)</TableHead><TableHead className="text-center">Avg (min)</TableHead><TableHead className="text-right">Production Loss</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {reportData.byAsset.slice(0, 15).map((a: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{a.assetName}</TableCell>
                          <TableCell className="text-center">{a.incidentCount}</TableCell>
                          <TableCell className="text-center">{a.totalDowntime}</TableCell>
                          <TableCell className="text-center">{a.avgDuration?.toFixed(0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(a.totalProductionLoss || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              )}
            </div>
          )}

          {/* Tools Report */}
          {reportType === 'tools' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard icon={AlertTriangle} count={reportData.totalDamageReports ?? 0} label="Damage Reports" color="text-red-600" bgColor="bg-red-50" />
                <StatsCard icon={Wrench} count={reportData.totalRepairCost ? formatCurrency(reportData.totalRepairCost) : '₵0'} label="Total Repair Cost" color="text-amber-600" bgColor="bg-amber-50" />
                <StatsCard icon={ArrowRightLeft} count={reportData.totalTransfers ?? 0} label="Tool Transfers" color="text-blue-600" bgColor="bg-blue-50" />
                <StatsCard icon={Ban} count={reportData.totalWrittenOff ?? 0} label="Written Off" color="text-gray-600" bgColor="bg-gray-50" />
              </div>
              {reportData.byDamageType && (
                <Card><CardHeader><CardTitle className="text-base">By Damage Type</CardTitle></CardHeader><CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {reportData.byDamageType.map((d: any) => (
                      <div key={d.type} className="bg-muted/50 rounded-lg p-3">
                        <p className="text-lg font-bold capitalize">{d.type?.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{d.count} incidents</p>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
            </div>
          )}
        </div>
      )}

      {!reportGenerated && !loading && (
        <Card><CardContent className="py-16">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">Select a report type and generate</h3>
            <p className="text-sm text-muted-foreground mt-1">Choose from lifecycle, execution, technician, materials, downtime, or tools reports</p>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
