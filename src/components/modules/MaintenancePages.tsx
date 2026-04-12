'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';
import type { MaintenanceRequest, WorkOrder, User, PageName } from '@/types';

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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
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
  Trash2, Timer, MessageSquare, Users, MoreHorizontal, BarChart3, Target,
  TrendingUp, Calendar, AlertCircle, Crosshair, TriangleAlert, Ruler,
  Wrench as WrenchIcon, Settings, Zap, Activity, Send, CircleDot, X,
  Loader2,
  Building2,
  FileText, CheckSquare, Filter, ArrowUpDown, BookOpen, ShieldAlert,
  PieChart as PieChartIcon, Gauge, ListChecks, Shield, HardHat, MapPin,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { EmptyState, StatusBadge, PriorityBadge, getInitials, formatDate, formatDateTime, timeAgo, LoadingSkeleton } from '@/components/shared/helpers';

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
      (r.assetName || '').toLowerCase().includes(q) ||
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
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />New Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Maintenance Request</DialogTitle></DialogHeader>
              <CreateMRForm onSuccess={() => { setCreateOpen(false); handleRefresh(); }} />
            </DialogContent>
          </Dialog>
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
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate hidden xl:table-cell">{mr.assetName || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(mr.createdAt)}</TableCell>
                  <TableCell>
                    {mr.machineDown && <Badge variant="destructive" className="text-[10px]">DOWN</Badge>}
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
  const [assetName, setAssetName] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [machineDown, setMachineDown] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.post('/api/maintenance-requests', { title, description, priority, assetName, location, category, machineDown });
    if (res.success) {
      toast.success('Maintenance request created');
      onSuccess();
    } else {
      toast.error(res.error || 'Failed to create request');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the issue" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of the issue, including any relevant observations" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Asset / Machine</Label>
          <Input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Conveyor Belt B3" />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Production Line 2" />
        </div>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
        <Switch checked={machineDown} onCheckedChange={setMachineDown} />
        <div>
          <Label className="text-sm font-medium text-red-700">Machine is Down</Label>
          <p className="text-[11px] text-red-500">Enable if this issue has caused a machine shutdown</p>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
          {loading ? 'Creating...' : 'Submit Request'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============================================================================
// MR DETAIL PAGE
// ============================================================================

export function MRDetailPage({ id, onBack, onUpdate }: { id: string; onBack: () => void; onUpdate: () => void }) {
  const [mr, setMr] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const { hasPermission } = useAuthStore();

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
      res = await api.put(`/api/maintenance-requests/${id}`, { action, reviewNotes: notes });
    }
    if (res.success) {
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      handleRefresh();
      onUpdate();
      setRejectDialogOpen(false);
      setRejectNotes('');
    } else {
      toast.error(res.error || 'Action failed');
    }
    setActionLoading(false);
  };

  const handleConvert = async () => {
    setActionLoading(true);
    const res = await api.post(`/api/maintenance-requests/${id}/convert`, {
      title: mr?.title,
      priority: mr?.priority,
    });
    if (res.success) {
      toast.success('Converted to Work Order');
      handleRefresh();
      onUpdate();
    } else {
      toast.error(res.error || 'Conversion failed');
    }
    setActionLoading(false);
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
            {mr.machineDown && <Badge variant="destructive" className="text-[10px]">MACHINE DOWN</Badge>}
          </div>
          <h1 className="text-xl font-bold mt-1">{mr.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {mr.status === 'pending' && hasPermission('maintenance_requests.approve') && (
            <>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setRejectDialogOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" />Reject
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={() => handleAction('approve', '')}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Approve
              </Button>
            </>
          )}
          {mr.status === 'approved' && hasPermission('maintenance_requests.convert') && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={handleConvert}>
              <RefreshCw className="h-4 w-4 mr-1" />Convert to WO
            </Button>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle><DialogDescription>Please provide a reason for rejection.</DialogDescription></DialogHeader>
          <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Reason for rejection..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={() => handleAction('reject', rejectNotes)}>
              {actionLoading ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
              <div className="flex justify-between"><span className="text-muted-foreground">Asset</span><span className="font-medium">{mr.assetName || '-'}</span></div>
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
              {mr.reviewNotes && (
                <>
                  <Separator />
                  <div><span className="text-muted-foreground">Review Notes</span><p className="mt-1 text-xs">{mr.reviewNotes}</p></div>
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
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />New Work Order</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
              <CreateWOForm onSuccess={() => { setCreateOpen(false); handleRefresh(); }} />
            </DialogContent>
          </Dialog>
        )}
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
  const [assetName, setAssetName] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.post('/api/work-orders', {
      title, description, type, priority, assetName,
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <Input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Pump Station A" />
        </div>
        <div className="space-y-2">
          <Label>Est. Hours</Label>
          <Input type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} placeholder="0" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
          {loading ? 'Creating...' : 'Create WO'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============================================================================
// WORK ORDER DETAIL PAGE
// ============================================================================

export function WODetailPage({ id, onBack, onUpdate }: { id: string; onBack: () => void; onUpdate: () => void }) {
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const { hasPermission } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
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

  const fetchWO = useCallback(async () => {
    const res = await api.get<WorkOrder>(`/api/work-orders/${id}`);
    if (res.success && res.data) setWo(res.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let active = true;
    api.get<WorkOrder>(`/api/work-orders/${id}`).then(res => {
      if (active) {
        if (res.success && res.data) setWo(res.data);
        setLoading(false);
      }
    });
    api.get<User[]>('/api/users').then(res => { if (res.success && res.data) setUsers(res.data); });
    return () => { active = false; };
  }, [id]);

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
      case 'close':
        res = await api.post(`/api/work-orders/${id}/close`, { notes: extra?.notes });
        break;
      case 'approve':
        res = await api.put(`/api/work-orders/${id}`, { status: 'approved', ...extra });
        break;
      default:
        res = await api.put(`/api/work-orders/${id}`, { action, ...extra });
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

  if (loading) return <LoadingSkeleton />;
  if (!wo) return <div className="p-6">Work order not found</div>;

  const canApprove = hasPermission('work_orders.approve') && wo.status === 'draft';
  const canAssign = hasPermission('work_orders.assign') && ['draft', 'approved'].includes(wo.status);
  const canStart = hasPermission('work_orders.execute') && wo.status === 'assigned';
  const canComplete = hasPermission('work_orders.complete') && wo.status === 'in_progress';
  const canVerify = hasPermission('work_orders.verify') && wo.status === 'completed';
  const canClose = hasPermission('work_orders.close') && wo.status === 'verified';
  const canEdit = !['closed', 'cancelled'].includes(wo.status);

  return (
    <div className="page-content">
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
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="h-4 w-4 mr-1" />Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && <DropdownMenuItem onClick={openEditWO}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
            {canEdit && <DropdownMenuSeparator />}
            {canApprove && <DropdownMenuItem onClick={() => handleAction('approve')}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>}
            {canAssign && <DropdownMenuItem onClick={() => setActionDialog('assign')}><Users className="h-4 w-4 mr-2" />Assign</DropdownMenuItem>}
            {canStart && <DropdownMenuItem onClick={() => handleAction('start')}><Play className="h-4 w-4 mr-2" />Start Work</DropdownMenuItem>}
            {canComplete && <DropdownMenuItem onClick={() => setActionDialog('complete')}><Check className="h-4 w-4 mr-2" />Complete</DropdownMenuItem>}
            {canVerify && <DropdownMenuItem onClick={() => handleAction('verify')}><Eye className="h-4 w-4 mr-2" />Verify</DropdownMenuItem>}
            {canClose && <DropdownMenuItem onClick={() => handleAction('close')}><Lock className="h-4 w-4 mr-2" />Close</DropdownMenuItem>}
            {!canEdit && !canApprove && !canAssign && !canStart && !canComplete && !canVerify && !canClose && (
              <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Assign Dialog */}
      <Dialog open={actionDialog === 'assign'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Work Order</DialogTitle><DialogDescription>Select a technician to assign this work order.</DialogDescription></DialogHeader>
          <Select onValueChange={(val) => {
            const u = users.find(x => x.id === val);
            if (u) handleAction('assign', { assignedToId: u.id, assignedToName: u.fullName });
          }}>
            <SelectTrigger><SelectValue placeholder="Select technician..." /></SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.username})</SelectItem>)}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={actionDialog === 'complete'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Complete Work Order</DialogTitle><DialogDescription>Mark this work order as completed.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Completion Notes</Label>
              <Textarea value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="What was done?" rows={3} />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={() => handleAction('complete', { completionNotes })}>
              {actionLoading ? 'Completing...' : 'Mark as Completed'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit WO Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Work Order</DialogTitle><DialogDescription>Update work order details.</DialogDescription></DialogHeader>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Est. Hours</Label><Input type="number" value={editForm.estimatedHours || ''} onChange={e => setEditForm(f => ({ ...f, estimatedHours: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Planned Start</Label><Input type="datetime-local" value={editForm.plannedStart || ''} onChange={e => setEditForm(f => ({ ...f, plannedStart: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Planned End</Label><Input type="datetime-local" value={editForm.plannedEnd || ''} onChange={e => setEditForm(f => ({ ...f, plannedEnd: e.target.value }))} /></div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Failure Analysis</p>
            <div className="space-y-1.5"><Label>Failure Description</Label><Textarea value={editForm.failureDescription || ''} onChange={e => setEditForm(f => ({ ...f, failureDescription: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Cause Description</Label><Textarea value={editForm.causeDescription || ''} onChange={e => setEditForm(f => ({ ...f, causeDescription: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Action Description</Label><Textarea value={editForm.actionDescription || ''} onChange={e => setEditForm(f => ({ ...f, actionDescription: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditWO} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{actionLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Log Dialog */}
      <Dialog open={timeLogOpen} onOpenChange={setTimeLogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Time</DialogTitle><DialogDescription>Record time spent on this work order.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Action</Label>
              <Select value={tlAction} onValueChange={setTlAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="start">Start</SelectItem><SelectItem value="pause">Pause</SelectItem><SelectItem value="resume">Resume</SelectItem><SelectItem value="complete">Complete</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Hours Worked</Label><Input type="number" step="0.25" value={tlHours} onChange={e => setTlHours(e.target.value)} placeholder="e.g. 2.5" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={tlNotes} onChange={e => setTlNotes(e.target.value)} placeholder="Optional notes..." rows={2} /></div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={tlLoading} onClick={handleTimeLog}>
              {tlLoading ? 'Logging...' : 'Log Time'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Material</DialogTitle><DialogDescription>Add a material or part to this work order.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Item Name *</Label><Input value={matName} onChange={e => setMatName(e.target.value)} placeholder="e.g. Bearing 6205" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={matQty} onChange={e => setMatQty(e.target.value)} placeholder="1" /></div>
              <div className="space-y-1.5"><Label>Unit Cost</Label><Input type="number" step="0.01" value={matCost} onChange={e => setMatCost(e.target.value)} placeholder="0.00" /></div>
              <div className="space-y-1.5"><Label>Unit</Label>
                <Select value={matUnit} onValueChange={setMatUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="each">Each</SelectItem><SelectItem value="kg">Kg</SelectItem><SelectItem value="meter">Meter</SelectItem><SelectItem value="set">Set</SelectItem><SelectItem value="box">Box</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={matLoading} onClick={handleAddMaterial}>
              {matLoading ? 'Adding...' : 'Add Material'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

          {/* Time Logs */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-base">Time Logs</CardTitle><CardDescription className="text-xs">{wo.timeLogs?.length || 0} entries · {wo.actualHours || 0}h total</CardDescription></div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setTlAction('start'); setTlHours(''); setTlNotes(''); setTimeLogOpen(true); }}><Timer className="h-3.5 w-3.5" />Log Time</Button>
            </CardHeader>
            <CardContent>
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
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setMatName(''); setMatQty(''); setMatCost(''); setMaterialOpen(true); }}><Plus className="h-3.5 w-3.5" />Add Material</Button>
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

          {/* Team Members */}
          {wo.teamMembers && wo.teamMembers.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {wo.teamMembers.map(tm => (
                  <div key={tm.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{getInitials(tm.userName || 'U')}</AvatarFallback></Avatar>
                    <span className="font-medium">{tm.userName}</span>
                    <Badge variant="outline" className="text-[10px] capitalize ml-auto">{tm.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
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
  const [formAutoGenWO, setFormAutoGenWO] = useState(true);
  const [formLeadDays, setFormLeadDays] = useState('3');
  const [formNextDueDate, setFormNextDueDate] = useState('');

  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

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

  const fetchLookups = useCallback(async () => {
    try {
      const [assetRes, userRes] = await Promise.all([
        api.get('/api/assets?limit=200'),
        api.get('/api/users'),
      ]);
      if (assetRes.success) setAssets(assetRes.data || []);
      if (userRes.success) setUsers((userRes.data || []).filter((u: any) => u.status === 'active'));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);
  useEffect(() => { fetchLookups(); }, [fetchLookups]);

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
    setFormAssignedToId(''); setFormAutoGenWO(true);
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Schedules', value: schedules.length, icon: Timer, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
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
                  <EmptyState icon={Timer} title="No schedules found" description={dueSoonFilter ? "No schedules due in the next 7 days" : "Create your first PM schedule to get started"} />
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
      <Dialog open={createOpen || !!editItem} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit PM Schedule' : 'New PM Schedule'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Update preventive maintenance schedule' : 'Define a new preventive maintenance schedule for an asset'}
            </DialogDescription>
          </DialogHeader>
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
              <Select value={formAssetId} onValueChange={setFormAssetId}>
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.assetTag})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={formAssignedToId} onValueChange={setFormAssignedToId}>
                <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editItem ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// ANALYTICS PAGE
// ============================================================================

// --- MaintenanceWorkOrdersPage separator ---
export function MaintenanceWorkOrdersPage() {
  const { navigate } = useNavigationStore();
  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
        <p className="text-muted-foreground mt-1">Create, track, and manage all maintenance work orders</p>
      </div>
      <WorkOrdersPage />
    </div>
  );
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
    { label: 'MTTR (Hours)', value: mttr, icon: Timer, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
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
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Record</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Calibration Record</DialogTitle><DialogDescription>Add a new instrument calibration record</DialogDescription></DialogHeader>
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
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.instrument}>{saving ? 'Creating...' : 'Create Record'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
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
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Assessment</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Risk Assessment</DialogTitle><DialogDescription>Evaluate risk for an asset</DialogDescription></DialogHeader>
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
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.asset || !form.likelihood || !form.consequence}>{saving ? 'Creating...' : 'Create Assessment'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search assets, assessment IDs..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={levelFilter} onValueChange={setLevelFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Risk Level" /></SelectTrigger><SelectContent><SelectItem value="all">All Levels</SelectItem><SelectItem value="extreme">Extreme</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">ID</TableHead><TableHead className="text-xs">Asset</TableHead><TableHead className="text-xs hidden md:table-cell">Description</TableHead><TableHead className="text-xs text-center">L</TableHead><TableHead className="text-xs text-center">C</TableHead><TableHead className="text-xs text-center">Risk Score</TableHead><TableHead className="text-xs">Level</TableHead><TableHead className="text-xs hidden lg:table-cell">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
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
                </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9}><EmptyState icon={TriangleAlert} title="No assessments found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
      </>}
    </div>
  );
}

export function MaintenanceToolsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', location: '', serialNumber: '', condition: '' });
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
        setForm({ name: '', category: '', location: '', serialNumber: '', condition: '' });
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
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Tool</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Add New Tool</DialogTitle><DialogDescription>Register a new tool in the inventory</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2"><Label className="text-xs">Tool Name</Label><Input placeholder="e.g. Torque Wrench 1/2 inch" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="Hand Tool">Hand Tool</SelectItem><SelectItem value="Power Tool">Power Tool</SelectItem><SelectItem value="Measurement">Measurement</SelectItem><SelectItem value="Safety">Safety</SelectItem><SelectItem value="Specialty">Specialty</SelectItem></SelectContent></Select></div>
                    <div className="grid gap-2"><Label className="text-xs">Condition</Label><Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid gap-2"><Label className="text-xs">Location</Label><Input placeholder="e.g. Tool Room A-1" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Serial Number</Label><Input placeholder="e.g. SN-2024-001" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Adding...' : 'Add Tool'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
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

