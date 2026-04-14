'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api';

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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package, Wrench, ArrowRightLeft, Clock, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, FileText, MoreHorizontal, Plus,
  Search, Filter, Eye, RotateCcw, Send, ShieldCheck, Warehouse,
  Timer, Activity, Ban, ChevronDown, ClipboardList, BarChart3,
  ArrowLeftRight, PackageCheck, PackageOpen,
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
// PAGE 1: REPAIR MATERIAL REQUESTS
// ============================================================================

export function RepairMaterialRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [createForm, setCreateForm] = useState({ workOrderId: '', itemName: '', itemId: '', quantityRequested: '', unit: 'each', unitCost: '', reason: '', notes: '' });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    params.set('page', String(page));
    params.set('limit', '20');
    const res = await api.get(`/api/repairs/material-requests?${params}`);
    if (res.success) setRequests(res.data || []);
    else toast.error(res.error || 'Failed to load requests');
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreate = async () => {
    if (!createForm.workOrderId || !createForm.itemName || !createForm.quantityRequested || !createForm.reason) {
      toast.error('Work Order, Item Name, Quantity, and Reason are required');
      return;
    }
    const res = await api.post('/api/repairs/material-requests', {
      workOrderId: createForm.workOrderId,
      itemId: createForm.itemId || undefined,
      itemName: createForm.itemName,
      quantityRequested: parseFloat(createForm.quantityRequested),
      unit: createForm.unit,
      unitCost: createForm.unitCost ? parseFloat(createForm.unitCost) : undefined,
      reason: createForm.reason,
      notes: createForm.notes || undefined,
    });
    if (res.success) {
      toast.success('Material request created');
      setCreateOpen(false);
      setCreateForm({ workOrderId: '', itemName: '', itemId: '', quantityRequested: '', unit: 'each', unitCost: '', reason: '', notes: '' });
      fetchRequests();
    } else toast.error(res.error || 'Failed to create');
  };

  const handleAction = async (id: string, action: string, extra?: Record<string, any>) => {
    const res = await api.post(`/api/repairs/material-requests/${id}`, { action, ...extra });
    if (res.success) {
      toast.success(`Action "${action}" completed`);
      fetchRequests();
    } else toast.error(res.error || 'Action failed');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel this material request?')) return;
    const res = await api.delete(`/api/repairs/material-requests/${id}`);
    if (res.success) { toast.success('Request cancelled'); fetchRequests(); }
    else toast.error(res.error || 'Failed to cancel');
  };

  const filtered = requests.filter((r) => !searchText || r.itemName?.toLowerCase().includes(searchText.toLowerCase()) || r.workOrder?.woNumber?.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-blue-600" /> Material Requests</h2>
          <p className="text-muted-foreground">Request and track materials/spare parts for repair work orders</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Request</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: requests.filter((r) => r.status === 'pending').length, color: 'text-yellow-600', icon: Clock },
          { label: 'Awaiting Approval', count: requests.filter((r) => ['supervisor_approved', 'storekeeper_approved'].includes(r.status)).length, color: 'text-blue-600', icon: ShieldCheck },
          { label: 'Issued', count: requests.filter((r) => r.status === 'issued').length, color: 'text-green-600', icon: PackageCheck },
          { label: 'Rejected', count: requests.filter((r) => r.status === 'rejected').length, color: 'text-red-600', icon: Ban },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div><p className="text-2xl font-bold">{s.count}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by item or WO..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-64" />
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="supervisor_approved">Supervisor Approved</SelectItem>
            <SelectItem value="storekeeper_approved">Store Approved</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={Package} title="No material requests found" description="Create a new request to get started" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>WO #</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.unit} | {formatCurrency(r.unitCost || 0)}/unit</div></TableCell>
                    <TableCell><Badge variant="outline">{r.workOrder?.woNumber}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium">{r.quantityRequested}</div>
                      <div className="text-xs text-muted-foreground">Approved: {r.quantityApproved} | Issued: {r.quantityIssued}</div>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm">{r.requestedBy?.fullName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction(r.id, 'supervisor_approve')}><ShieldCheck className="h-4 w-4 mr-2" /> Supervisor Approve</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { const n = prompt('Rejection reason:'); if (n) handleAction(r.id, 'supervisor_reject', { notes: n }); }} className="text-red-600"><XCircle className="h-4 w-4 mr-2" /> Supervisor Reject</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-red-600"><Ban className="h-4 w-4 mr-2" /> Cancel</DropdownMenuItem>
                            </>
                          )}
                          {r.status === 'supervisor_approved' && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction(r.id, 'storekeeper_approve')}><Warehouse className="h-4 w-4 mr-2" /> Store Approve</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { const n = prompt('Rejection reason:'); if (n) handleAction(r.id, 'storekeeper_reject', { notes: n }); }} className="text-red-600"><XCircle className="h-4 w-4 mr-2" /> Store Reject</DropdownMenuItem>
                            </>
                          )}
                          {r.status === 'storekeeper_approved' && (
                            <DropdownMenuItem onClick={() => { const q = prompt(`Issue quantity (max ${r.quantityApproved}):`, String(r.quantityApproved)); if (q) handleAction(r.id, 'issue', { quantityApproved: parseFloat(q) }); }}><PackageCheck className="h-4 w-4 mr-2" /> Issue Material</DropdownMenuItem>
                          )}
                          {r.status === 'issued' && (
                            <DropdownMenuItem onClick={() => { const q = prompt('Return quantity:', String(r.quantityIssued)); if (q) handleAction(r.id, 'record_return', { quantityApproved: parseFloat(q) }); }}><RotateCcw className="h-4 w-4 mr-2" /> Record Return</DropdownMenuItem>
                          )}
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Material Request</DialogTitle><DialogDescription>Request materials/spare parts for a work order</DialogDescription></DialogHeader>
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
              <div><Label>Item Name *</Label><Input value={createForm.itemName} onChange={(e) => setCreateForm({ ...createForm, itemName: e.target.value })} placeholder="e.g. Bearing 6205" /></div>
              <div><Label>Inventory Item ID</Label><AsyncSearchableSelect
                value={createForm.itemId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, itemId: v }))}
                placeholder="Select inventory item..."
                searchPlaceholder="Search inventory..."
                fetchOptions={async () => {
                  const res = await api.get('/api/inventory?limit=999');
                  if (res.success && res.data) return res.data.map((i: any) => ({ value: i.id, label: `${i.name} (${i.itemCode})` }));
                  return [];
                }}
              /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Quantity *</Label><Input type="number" value={createForm.quantityRequested} onChange={(e) => setCreateForm({ ...createForm, quantityRequested: e.target.value })} /></div>
              <div><Label>Unit</Label>
                <Select value={createForm.unit} onValueChange={(v) => setCreateForm({ ...createForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="liter">Liter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Unit Cost (₵)</Label><Input type="number" step="0.01" value={createForm.unitCost} onChange={(e) => setCreateForm({ ...createForm, unitCost: e.target.value })} /></div>
            </div>
            <div><Label>Reason *</Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} placeholder="Why is this material needed?" /></div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Send className="h-4 w-4 mr-2" /> Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PAGE 2: REPAIR TOOL REQUESTS
// ============================================================================

export function RepairToolRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ workOrderId: '', toolId: '', toolName: '', reason: '', notes: '' });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    params.set('limit', '50');
    const res = await api.get(`/api/repairs/tool-requests?${params}`);
    if (res.success) setRequests(res.data || []);
    else toast.error(res.error || 'Failed to load');
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreate = async () => {
    if (!createForm.workOrderId || !createForm.toolName || !createForm.reason) { toast.error('All required fields must be filled'); return; }
    const res = await api.post('/api/repairs/tool-requests', { ...createForm, toolId: createForm.toolId || undefined });
    if (res.success) { toast.success('Tool request created'); setCreateOpen(false); setCreateForm({ workOrderId: '', toolId: '', toolName: '', reason: '', notes: '' }); fetchRequests(); }
    else toast.error(res.error || 'Failed');
  };

  const handleAction = async (id: string, action: string, extra?: Record<string, any>) => {
    const res = await api.post(`/api/repairs/tool-requests/${id}`, { action, ...extra });
    if (res.success) { toast.success(`Action completed`); fetchRequests(); }
    else toast.error(res.error || 'Failed');
  };

  const filtered = requests.filter((r) => !searchText || r.toolName?.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-orange-600" /> Tool Requests</h2>
          <p className="text-muted-foreground">Request tools for repair work orders with multi-level approval</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Request</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: requests.filter((r) => r.status === 'pending').length, icon: Clock, color: 'text-yellow-600' },
          { label: 'In Approval', count: requests.filter((r) => ['supervisor_approved', 'storekeeper_approved'].includes(r.status)).length, icon: ShieldCheck, color: 'text-blue-600' },
          { label: 'Issued', count: requests.filter((r) => r.status === 'issued').length, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Returned', count: requests.filter((r) => r.status === 'returned').length, icon: RotateCcw, color: 'text-gray-600' },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-8 w-8 ${s.color}`} /><div><p className="text-2xl font-bold">{s.count}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search tools..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-64" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="supervisor_approved">Supervisor Approved</SelectItem>
            <SelectItem value="storekeeper_approved">Store Approved</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={Wrench} title="No tool requests" description="Create a new request" />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Tool</TableHead><TableHead>WO #</TableHead><TableHead>Status</TableHead><TableHead>Requested By</TableHead><TableHead>Date</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><div className="font-medium">{r.toolName}</div><div className="text-xs text-muted-foreground">{r.tool?.toolCode} | {r.tool?.category}</div></TableCell>
                    <TableCell><Badge variant="outline">{r.workOrder?.woNumber}</Badge></TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm">{r.requestedBy?.fullName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status === 'pending' && (<><DropdownMenuItem onClick={() => handleAction(r.id, 'supervisor_approve')}><ShieldCheck className="h-4 w-4 mr-2" /> Approve</DropdownMenuItem><DropdownMenuItem onClick={() => { const n = prompt('Rejection reason:'); if (n) handleAction(r.id, 'supervisor_reject', { notes: n }); }} className="text-red-600"><XCircle className="h-4 w-4 mr-2" /> Reject</DropdownMenuItem></>)}
                          {r.status === 'supervisor_approved' && (<><DropdownMenuItem onClick={() => handleAction(r.id, 'storekeeper_approve')}><Warehouse className="h-4 w-4 mr-2" /> Store Approve</DropdownMenuItem><DropdownMenuItem onClick={() => { const n = prompt('Reason:'); if (n) handleAction(r.id, 'storekeeper_reject', { notes: n }); }} className="text-red-600"><XCircle className="h-4 w-4 mr-2" /> Store Reject</DropdownMenuItem></>)}
                          {r.status === 'storekeeper_approved' && (<DropdownMenuItem onClick={() => handleAction(r.id, 'issue')}><Wrench className="h-4 w-4 mr-2" /> Issue Tool</DropdownMenuItem>)}
                          {r.status === 'issued' && (<DropdownMenuItem onClick={() => handleAction(r.id, 'return')}><RotateCcw className="h-4 w-4 mr-2" /> Return Tool</DropdownMenuItem>)}
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
          <DialogHeader><DialogTitle>New Tool Request</DialogTitle></DialogHeader>
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
              <div><Label>Tool Name *</Label><Input value={createForm.toolName} onChange={(e) => setCreateForm({ ...createForm, toolName: e.target.value })} placeholder="e.g. Torque Wrench" /></div>
              <div><Label>Tool ID</Label><AsyncSearchableSelect
                value={createForm.toolId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, toolId: v }))}
                placeholder="Select tool..."
                searchPlaceholder="Search tools..."
                fetchOptions={async () => {
                  const res = await api.get('/api/tools?limit=999');
                  if (res.success && res.data) return res.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.toolCode})` }));
                  return [];
                }}
              /></div>
            </div>
            <div><Label>Reason *</Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate}><Send className="h-4 w-4 mr-2" /> Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PAGE 3: TOOL TRANSFER REQUESTS
// ============================================================================

export function RepairToolTransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ toolId: '', fromUserId: '', toUserId: '', reason: '', notes: '' });

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    params.set('limit', '50');
    const res = await api.get(`/api/repairs/tool-transfers?${params}`);
    if (res.success) setTransfers(res.data || []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const handleCreate = async () => {
    if (!createForm.toolId || !createForm.fromUserId || !createForm.toUserId || !createForm.reason) { toast.error('All fields required'); return; }
    const res = await api.post('/api/repairs/tool-transfers', createForm);
    if (res.success) { toast.success('Transfer request submitted'); setCreateOpen(false); setCreateForm({ toolId: '', fromUserId: '', toUserId: '', reason: '', notes: '' }); fetchTransfers(); }
    else toast.error(res.error || 'Failed');
  };

  const handleAction = async (id: string, action: string, extra?: Record<string, any>) => {
    const res = await api.post(`/api/repairs/tool-transfers/${id}`, { action, ...extra });
    if (res.success) { toast.success('Done'); fetchTransfers(); }
    else toast.error(res.error || 'Failed');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ArrowRightLeft className="h-6 w-6 text-purple-600" /> Tool Transfers</h2>
          <p className="text-muted-foreground">Request and approve tool custody transfers between technicians</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Transfer</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', count: transfers.filter((t) => t.status === 'pending').length, icon: Clock, color: 'text-yellow-600' },
          { label: 'Transferred', count: transfers.filter((t) => t.status === 'transferred').length, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Rejected', count: transfers.filter((t) => t.status === 'rejected').length, icon: XCircle, color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-8 w-8 ${s.color}`} /><div><p className="text-2xl font-bold">{s.count}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="transferred">Transferred</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingSkeleton /> : transfers.length === 0 ? (
            <EmptyState icon={ArrowRightLeft} title="No transfer requests" />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Tool</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead>Requested By</TableHead><TableHead>Date</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><div className="font-medium">{t.tool?.name}</div><div className="text-xs text-muted-foreground">{t.tool?.toolCode}</div></TableCell>
                    <TableCell className="text-sm">{t.fromUser?.fullName}</TableCell>
                    <TableCell className="text-sm">{t.toUser?.fullName}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-sm">{t.requestedBy?.fullName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</TableCell>
                    <TableCell>
                      {t.status === 'pending' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAction(t.id, 'storekeeper_approve')}><CheckCircle2 className="h-4 w-4 mr-2" /> Approve Transfer</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const n = prompt('Rejection reason:'); if (n) handleAction(t.id, 'storekeeper_reject', { notes: n }); }} className="text-red-600"><XCircle className="h-4 w-4 mr-2" /> Reject</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
          <DialogHeader><DialogTitle>New Tool Transfer Request</DialogTitle><DialogDescription>Request transfer of a tool to another technician</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Tool ID *</Label><AsyncSearchableSelect
                value={createForm.toolId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, toolId: v }))}
                placeholder="Select tool..."
                searchPlaceholder="Search tools..."
                fetchOptions={async () => {
                  const res = await api.get('/api/tools?limit=999');
                  if (res.success && res.data) return res.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.toolCode})` }));
                  return [];
                }}
              /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From User ID *</Label><AsyncSearchableSelect
                value={createForm.fromUserId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, fromUserId: v }))}
                placeholder="Select from user..."
                searchPlaceholder="Search users..."
                fetchOptions={async () => {
                  const res = await api.get('/api/users?limit=999');
                  if (res.success && res.data) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username})` }));
                  return [];
                }}
              /></div>
              <div><Label>To User ID *</Label><AsyncSearchableSelect
                value={createForm.toUserId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, toUserId: v }))}
                placeholder="Select to user..."
                searchPlaceholder="Search users..."
                fetchOptions={async () => {
                  const res = await api.get('/api/users?limit=999');
                  if (res.success && res.data) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username})` }));
                  return [];
                }}
              /></div>
            </div>
            <div><Label>Reason *</Label><Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate}>Submit Transfer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
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

  const handleEndDowntime = async (id: string) => {
    const endTime = prompt('Enter end time (YYYY-MM-DD HH:mm):', new Date().toISOString().slice(0, 16));
    if (!endTime) return;
    const res = await api.put(`/api/repairs/downtime/${id}`, { downtimeEnd: endTime });
    if (res.success) { toast.success('Downtime ended'); fetchRecords(); }
    else toast.error(res.error || 'Failed');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this downtime record?')) return;
    const res = await api.delete(`/api/repairs/downtime/${id}`);
    if (res.success) { toast.success('Deleted'); fetchRecords(); }
    else toast.error(res.error || 'Failed');
  };

  const totalMinutes = records.reduce((sum: number, r: any) => sum + (r.durationMinutes || 0), 0);

  return (
    <div className="space-y-6">
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
      ...(action === 'supervisor_request_rework' ? { reworkReason: prompt('Enter rework reason:') } : {}),
      ...(action === 'supervisor_approve' ? { supervisorReviewNotes: form.completionNotes } : {}),
    });
    if (res.success) {
      toast.success('Action completed');
      fetchCompletion();
    } else toast.error(res.error || 'Failed');
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
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
                  <Button variant="destructive" onClick={() => handleSubmit('supervisor_request_rework')} disabled={submitting}><RotateCcw className="h-4 w-4 mr-2" /> Request Rework</Button>
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
    <div className="space-y-6">
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
