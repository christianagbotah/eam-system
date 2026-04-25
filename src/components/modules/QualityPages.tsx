'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, ShieldCheck, FileCheck, ShieldAlert, ScrollText, AlertCircle, Archive, BarChart3,
  HardHat, Plus, MoreHorizontal, Pencil, Trash2, AlertTriangle,
  CheckCircle2, XCircle, Eye, FlaskConical, Microscope, TestTubes,
  ClipboardCheck, ClipboardList, Filter, ArrowUpDown, Clock, Target, TrendingUp,
  Activity, X, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AsyncSearchableSelect } from '@/components/ui/searchable-select';
import { EmptyState, StatusBadge, PriorityBadge, getInitials, formatDate, formatDateTime, timeAgo, LoadingSkeleton } from '@/components/shared/helpers';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function QualityInspectionsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', type: 'incoming', scheduledDate: '' });
  const [inspData, setInspData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ total: 0, passed: 0, failed: 0, pending: 0 });
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();
  const inspStatusColors: Record<string, string> = { passed: 'bg-emerald-50 text-emerald-700 border-emerald-200', failed: 'bg-red-50 text-red-700 border-red-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', pending: 'bg-sky-50 text-sky-700 border-sky-200' };
  const loadInspections = async () => {
    const res = await api.get('/api/quality-inspections');
    if (res.success && Array.isArray(res.data)) setInspData(res.data);
    const kpiRes = await api.get('/api/quality-inspections?limit=1');
    if (kpiRes.success) setKpis((kpiRes as any).kpis || { total: 0, passed: 0, failed: 0, pending: 0 });
    setLoading(false);
  };
  useEffect(() => {
    (async () => {
      const res = await api.get('/api/quality-inspections');
      if (res.success && Array.isArray(res.data)) setInspData(res.data);
      const kpiRes = await api.get('/api/quality-inspections?limit=1');
      if (kpiRes.success) setKpis((kpiRes as any).kpis || { total: 0, passed: 0, failed: 0, pending: 0 });
      setLoading(false);
    })();
  }, []);
  const filtered = inspData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.inspectionNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    const res = await api.post('/api/quality-inspections', { title: form.title, description: form.description, type: form.type, scheduledDate: form.scheduledDate || undefined });
    if (res.success) { toast.success('Inspection created'); setCreateOpen(false); setForm({ title: '', description: '', type: 'incoming', scheduledDate: '' }); loadInspections(); }
    else toast.error(res.error || 'Failed to create inspection');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/quality-inspections/${id}`);
    if (res.success) { toast.success('Inspection deleted'); loadInspections(); } else toast.error(res.error || 'Failed to delete');
  };
  const handleView = (r: any) => { setViewItem(r); setViewOpen(true); };
  const handleEdit = (r: any) => { setEditItem(r); setEditForm({ title: r.title, type: r.type, status: r.status, result: r.result || '', inspector: r.inspectedBy?.fullName || '', asset: r.asset?.name || r.asset || '', scheduledDate: r.scheduledDate || '', completedDate: r.completedDate || '', findings: r.findings || '', notes: r.notes || '' }); setEditOpen(true); };
  const handleSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    const res = await api.put(`/api/quality-inspections/${editItem.id}`, editForm);
    setEditLoading(false);
    if (res.success) { toast.success('Inspection updated'); setEditOpen(false); loadInspections(); } else toast.error(res.error || 'Failed to update');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Inspections</h1><p className="text-muted-foreground text-sm mt-1">Schedule, conduct, and track quality inspections</p></div>
        {(hasPermission('quality.create') || isAdmin()) && <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Inspection</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total Inspections', value: kpis.total, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Passed', value: kpis.passed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Failed', value: kpis.failed, icon: XCircle, color: 'text-red-600 bg-red-50' },
            { label: 'Pending', value: kpis.pending, icon: Clock, color: 'text-sky-600 bg-sky-50' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inspections..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="passed">Passed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[100px]">ID</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Inspector</TableHead><TableHead className="w-[120px]">Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inspections found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.inspectionNumber}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={inspStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm">{r.inspectedBy?.fullName || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.scheduledDate)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleView(r)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('quality.update') || isAdmin()) && <DropdownMenuItem onClick={() => handleEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('quality.delete') || isAdmin()) && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <ResponsiveDialog open={viewOpen} onOpenChange={setViewOpen}   large>
<Separator className="my-2" /><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground text-xs">Title</p><p className="font-medium">{viewItem?.title}</p></div><div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium">{viewItem?.type?.replace(/_/g, ' ')}</p></div><div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={inspStatusColors[viewItem?.status] || ''}>{viewItem?.status?.replace(/_/g, ' ').toUpperCase()}</Badge></div><div><p className="text-muted-foreground text-xs">Result</p><p className="font-medium">{viewItem?.result || '-'}</p></div><div><p className="text-muted-foreground text-xs">Inspector</p><p className="font-medium">{viewItem?.inspectedBy?.fullName || '-'}</p></div><div><p className="text-muted-foreground text-xs">Asset</p><p className="font-medium">{viewItem?.asset?.name || viewItem?.asset || '-'}</p></div><div><p className="text-muted-foreground text-xs">Scheduled Date</p><p className="font-medium">{formatDate(viewItem?.scheduledDate)}</p></div><div><p className="text-muted-foreground text-xs">Completed Date</p><p className="font-medium">{formatDate(viewItem?.completedDate)}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Findings</p><p className="font-medium whitespace-pre-wrap">{viewItem?.findings || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Notes</p><p className="font-medium whitespace-pre-wrap">{viewItem?.notes || '-'}</p></div></div>
        </ResponsiveDialog>
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen}   large>
<div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div><div className="space-y-2"><Label>Type</Label><Select value={editForm.type || ''} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In Process</SelectItem><SelectItem value="final">Final</SelectItem><SelectItem value="source">Source</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="passed">Passed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Result</Label><Input value={editForm.result || ''} onChange={e => setEditForm(f => ({ ...f, result: e.target.value }))} /></div><div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={editForm.scheduledDate || ''} onChange={e => setEditForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div><div className="space-y-2"><Label>Completed Date</Label><Input type="date" value={editForm.completedDate || ''} onChange={e => setEditForm(f => ({ ...f, completedDate: e.target.value }))} /></div></div><div className="space-y-2"><Label>Findings</Label><Textarea value={editForm.findings || ''} onChange={e => setEditForm(f => ({ ...f, findings: e.target.value }))} rows={3} /></div><div className="space-y-2"><Label>Notes</Label><Textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </ResponsiveDialog>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}  >
<div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Inspection title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Inspection details..." rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In Process</SelectItem><SelectItem value="final">Final</SelectItem><SelectItem value="source">Source</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Inspection</Button>
          </div>
        </ResponsiveDialog>
    </div>
  );
}

export function QualityNcrPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', severity: 'minor', type: 'product' });
  const [ncrData, setNcrData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ncrKpis, setNcrKpis] = useState({ total: 0, open: 0, investigating: 0, closed: 0 });
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();
  const sevColors: Record<string, string> = { critical: 'bg-red-50 text-red-700 border-red-200', major: 'bg-orange-50 text-orange-700 border-orange-200', minor: 'bg-amber-50 text-amber-700 border-amber-200' };
  const ncrStatusColors: Record<string, string> = { open: 'bg-amber-50 text-amber-700 border-amber-200', investigating: 'bg-sky-50 text-sky-700 border-sky-200', root_cause_found: 'bg-violet-50 text-violet-700 border-violet-200', corrective_action: 'bg-indigo-50 text-indigo-700 border-indigo-200', closed: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const loadNcrs = async () => {
    const res = await api.get('/api/quality-ncr');
    if (res.success && Array.isArray(res.data)) setNcrData(res.data);
    const kpiRes = await api.get('/api/quality-ncr?limit=1');
    if (kpiRes.success) setNcrKpis((kpiRes as any).kpis || { total: 0, open: 0, investigating: 0, closed: 0 });
    setLoading(false);
  };
  useEffect(() => {
    (async () => {
      const res = await api.get('/api/quality-ncr');
      if (res.success && Array.isArray(res.data)) setNcrData(res.data);
      const kpiRes = await api.get('/api/quality-ncr?limit=1');
      if (kpiRes.success) setNcrKpis((kpiRes as any).kpis || { total: 0, open: 0, investigating: 0, closed: 0 });
      setLoading(false);
    })();
  }, []);
  const filtered = ncrData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.ncrNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.description) { toast.error('Description is required'); return; }
    const res = await api.post('/api/quality-ncr', { title: form.title, description: form.description, severity: form.severity, type: form.type });
    if (res.success) { toast.success('NCR created'); setCreateOpen(false); setForm({ title: '', description: '', severity: 'minor', type: 'product' }); loadNcrs(); }
    else toast.error(res.error || 'Failed to create NCR');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/quality-ncr/${id}`);
    if (res.success) { toast.success('NCR deleted'); loadNcrs(); } else toast.error(res.error || 'Failed to delete');
  };
  const handleView = (r: any) => { setViewItem(r); setViewOpen(true); };
  const handleEdit = (r: any) => { setEditItem(r); setEditForm({ title: r.title, description: r.description || '', type: r.type, severity: r.severity, status: r.status, reportedBy: r.raisedBy?.fullName || '', item: r.item || '', quantity: r.quantity || '', disposition: r.disposition || '', rootCause: r.rootCause || '' }); setEditOpen(true); };
  const handleSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    const res = await api.put(`/api/quality-ncr/${editItem.id}`, editForm);
    setEditLoading(false);
    if (res.success) { toast.success('NCR updated'); setEditOpen(false); loadNcrs(); } else toast.error(res.error || 'Failed to update');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Non-Conformance Reports</h1><p className="text-muted-foreground text-sm mt-1">Manage non-conformances, investigations, and dispositions</p></div>
        {(hasPermission('quality.create') || isAdmin()) && <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New NCR</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total NCRs', value: ncrKpis.total, icon: FileCheck, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Open', value: ncrKpis.open, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
            { label: 'Under Investigation', value: ncrKpis.investigating, icon: Search, color: 'text-sky-600 bg-sky-50' },
            { label: 'Closed', value: ncrKpis.closed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search NCRs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="root_cause_found">Root Cause Found</SelectItem><SelectItem value="corrective_action">Corrective Action</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[130px]">NCR #</TableHead><TableHead>Title</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Type</TableHead><TableHead>Reported By</TableHead><TableHead className="w-[110px]">Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No NCRs found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.ncrNumber}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="outline" className={sevColors[r.severity] || ''}>{r.severity.toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={ncrStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type}</Badge></TableCell>
              <TableCell className="text-sm">{r.raisedBy?.fullName || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleView(r)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('quality.update') || isAdmin()) && <DropdownMenuItem onClick={() => handleEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('quality.delete') || isAdmin()) && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <ResponsiveDialog open={viewOpen} onOpenChange={setViewOpen}   large>
<Separator className="my-2" /><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground text-xs">Title</p><p className="font-medium">{viewItem?.title}</p></div><div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium">{viewItem?.type}</p></div><div><p className="text-muted-foreground text-xs">Severity</p><Badge variant="outline" className={sevColors[viewItem?.severity] || ''}>{viewItem?.severity?.toUpperCase()}</Badge></div><div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={ncrStatusColors[viewItem?.status] || ''}>{viewItem?.status?.replace(/_/g, ' ').toUpperCase()}</Badge></div><div><p className="text-muted-foreground text-xs">Reported By</p><p className="font-medium">{viewItem?.raisedBy?.fullName || '-'}</p></div><div><p className="text-muted-foreground text-xs">Item</p><p className="font-medium">{viewItem?.item || '-'}</p></div><div><p className="text-muted-foreground text-xs">Quantity</p><p className="font-medium">{viewItem?.quantity || '-'}</p></div><div><p className="text-muted-foreground text-xs">Disposition</p><p className="font-medium">{viewItem?.disposition || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Description</p><p className="font-medium whitespace-pre-wrap">{viewItem?.description || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Root Cause</p><p className="font-medium whitespace-pre-wrap">{viewItem?.rootCause || '-'}</p></div></div>
        </ResponsiveDialog>
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen}   large>
<div className="space-y-4"><div className="space-y-2"><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div><div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Type</Label><Select value={editForm.type || ''} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="product">Product</SelectItem><SelectItem value="process">Process</SelectItem><SelectItem value="documentation">Documentation</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Severity</Label><Select value={editForm.severity || ''} onValueChange={v => setEditForm(f => ({ ...f, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minor">Minor</SelectItem><SelectItem value="major">Major</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="root_cause_found">Root Cause Found</SelectItem><SelectItem value="corrective_action">Corrective Action</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Disposition</Label><Input value={editForm.disposition || ''} onChange={e => setEditForm(f => ({ ...f, disposition: e.target.value }))} /></div></div><div className="space-y-2"><Label>Root Cause</Label><Textarea value={editForm.rootCause || ''} onChange={e => setEditForm(f => ({ ...f, rootCause: e.target.value }))} rows={3} /></div></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </ResponsiveDialog>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}  >
<div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="NCR title" /></div>
            <div className="space-y-2"><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the non-conformance..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minor">Minor</SelectItem><SelectItem value="major">Major</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="product">Product</SelectItem><SelectItem value="process">Process</SelectItem><SelectItem value="documentation">Documentation</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create NCR</Button>
          </div>
        </ResponsiveDialog>
    </div>
  );
}

export function QualityAuditsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', type: 'internal', scope: '', scheduledDate: '' });
  const [auditData, setAuditData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditKpis, setAuditKpis] = useState({ total: 0, planned: 0, inProgress: 0, completed: 0 });
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();
  const auditStatusColors: Record<string, string> = { planned: 'bg-sky-50 text-sky-700 border-sky-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: 'bg-slate-100 text-slate-500 border-slate-200' };
  const loadAudits = async () => {
    const res = await api.get('/api/quality-audits');
    if (res.success && Array.isArray(res.data)) setAuditData(res.data);
    const kpiRes = await api.get('/api/quality-audits?limit=1');
    if (kpiRes.success) setAuditKpis((kpiRes as any).kpis || { total: 0, planned: 0, inProgress: 0, completed: 0 });
    setLoading(false);
  };
  useEffect(() => {
    (async () => {
      const res = await api.get('/api/quality-audits');
      if (res.success && Array.isArray(res.data)) setAuditData(res.data);
      const kpiRes = await api.get('/api/quality-audits?limit=1');
      if (kpiRes.success) setAuditKpis((kpiRes as any).kpis || { total: 0, planned: 0, inProgress: 0, completed: 0 });
      setLoading(false);
    })();
  }, []);
  const filtered = auditData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.auditNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.scheduledDate) { toast.error('Scheduled date is required'); return; }
    const res = await api.post('/api/quality-audits', { title: form.title, type: form.type, scope: form.scope, scheduledDate: form.scheduledDate });
    if (res.success) { toast.success('Audit scheduled'); setCreateOpen(false); setForm({ title: '', type: 'internal', scope: '', scheduledDate: '' }); loadAudits(); }
    else toast.error(res.error || 'Failed to create audit');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/quality-audits/${id}`);
    if (res.success) { toast.success('Audit deleted'); loadAudits(); } else toast.error(res.error || 'Failed to delete');
  };
  const handleView = (r: any) => { setViewItem(r); setViewOpen(true); };
  const handleEdit = (r: any) => { setEditItem(r); setEditForm({ title: r.title, description: r.description || '', type: r.type, status: r.status, auditor: r.auditor || '', department: r.department || '', scheduledDate: r.scheduledDate || '', completedDate: r.completedDate || '', findings: r.findings || '', score: r.score?.toString() || '', nonConformities: r.nonConformities?.toString() || '' }); setEditOpen(true); };
  const handleSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    const res = await api.put(`/api/quality-audits/${editItem.id}`, { ...editForm, score: editForm.score ? parseFloat(editForm.score) : null, nonConformities: editForm.nonConformities ? parseInt(editForm.nonConformities) : null });
    setEditLoading(false);
    if (res.success) { toast.success('Audit updated'); setEditOpen(false); loadAudits(); } else toast.error(res.error || 'Failed to update');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Audits</h1><p className="text-muted-foreground text-sm mt-1">Plan and execute internal, external, and supplier audits</p></div>
        {(hasPermission('quality.create') || isAdmin()) && <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Audit</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total Audits', value: auditKpis.total, icon: ShieldAlert, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Planned', value: auditKpis.planned, icon: Calendar, color: 'text-sky-600 bg-sky-50' },
            { label: 'In Progress', value: auditKpis.inProgress, icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Completed', value: auditKpis.completed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search audits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[130px]">Audit #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Scope</TableHead><TableHead className="w-[110px]">Scheduled</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audits found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.auditNumber}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={auditStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.scope || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.scheduledDate)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleView(r)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('quality.update') || isAdmin()) && <DropdownMenuItem onClick={() => handleEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('quality.delete') || isAdmin()) && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <ResponsiveDialog open={viewOpen} onOpenChange={setViewOpen}   large>
<Separator className="my-2" /><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground text-xs">Title</p><p className="font-medium">{viewItem?.title}</p></div><div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium">{viewItem?.type}</p></div><div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={auditStatusColors[viewItem?.status] || ''}>{viewItem?.status?.replace(/_/g, ' ').toUpperCase()}</Badge></div><div><p className="text-muted-foreground text-xs">Auditor</p><p className="font-medium">{viewItem?.auditor || '-'}</p></div><div><p className="text-muted-foreground text-xs">Department</p><p className="font-medium">{viewItem?.department || '-'}</p></div><div><p className="text-muted-foreground text-xs">Score</p><p className="font-medium">{viewItem?.score ?? '-'}</p></div><div><p className="text-muted-foreground text-xs">Scheduled Date</p><p className="font-medium">{formatDate(viewItem?.scheduledDate)}</p></div><div><p className="text-muted-foreground text-xs">Completed Date</p><p className="font-medium">{formatDate(viewItem?.completedDate)}</p></div><div><p className="text-muted-foreground text-xs">Non-Conformities</p><p className="font-medium">{viewItem?.nonConformities ?? '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Description</p><p className="font-medium whitespace-pre-wrap">{viewItem?.description || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Findings</p><p className="font-medium whitespace-pre-wrap">{viewItem?.findings || '-'}</p></div></div>
        </ResponsiveDialog>
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen}   large>
<div className="space-y-4"><div className="space-y-2"><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div><div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Type</Label><Select value={editForm.type || ''} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="external">External</SelectItem><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="system">System</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Auditor</Label><AsyncSearchableSelect value={editForm.auditor || ''} onValueChange={v => setEditForm(f => ({ ...f, auditor: v }))} placeholder="Select auditor..." fetchOptions={async () => { const res = await api.get('/api/users?limit=999'); if (res.success && res.data) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username || ''})` })); return []; }} /></div><div className="space-y-2"><Label>Department</Label><Input value={editForm.department || ''} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} /></div><div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={editForm.scheduledDate || ''} onChange={e => setEditForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div><div className="space-y-2"><Label>Completed Date</Label><Input type="date" value={editForm.completedDate || ''} onChange={e => setEditForm(f => ({ ...f, completedDate: e.target.value }))} /></div><div className="space-y-2"><Label>Score</Label><Input type="number" value={editForm.score || ''} onChange={e => setEditForm(f => ({ ...f, score: e.target.value }))} /></div><div className="space-y-2"><Label>Non-Conformities</Label><Input type="number" value={editForm.nonConformities || ''} onChange={e => setEditForm(f => ({ ...f, nonConformities: e.target.value }))} /></div></div><div className="space-y-2"><Label>Findings</Label><Textarea value={editForm.findings || ''} onChange={e => setEditForm(f => ({ ...f, findings: e.target.value }))} rows={3} /></div></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </ResponsiveDialog>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}  >
<div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Audit title" /></div>
            <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="external">External</SelectItem><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="system">System</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Scope</Label><Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="Audit scope and objectives..." rows={3} /></div>
            <div className="space-y-2"><Label>Scheduled Date *</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Schedule Audit</Button>
          </div>
        </ResponsiveDialog>
    </div>
  );
}

export function QualityControlPlansPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ name: '', description: '', type: 'in_process', frequency: 'every_batch' });
  const [cpData, setCpData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cpKpis, setCpKpis] = useState({ total: 0, active: 0, inactive: 0 });
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();
  const cpStatusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', draft: 'bg-slate-100 text-slate-600 border-slate-200', under_review: 'bg-amber-50 text-amber-700 border-amber-200', archived: 'bg-slate-100 text-slate-500 border-slate-200' };
  const loadPlans = async () => {
    const res = await api.get('/api/quality-control-plans');
    if (res.success && Array.isArray(res.data)) setCpData(res.data);
    const kpiRes = await api.get('/api/quality-control-plans?limit=1');
    if (kpiRes.success) setCpKpis((kpiRes as any).kpis || { total: 0, active: 0, inactive: 0 });
    setLoading(false);
  };
  useEffect(() => {
    (async () => {
      const res = await api.get('/api/quality-control-plans');
      if (res.success && Array.isArray(res.data)) setCpData(res.data);
      const kpiRes = await api.get('/api/quality-control-plans?limit=1');
      if (kpiRes.success) setCpKpis((kpiRes as any).kpis || { total: 0, active: 0, inactive: 0 });
      setLoading(false);
    })();
  }, []);
  const filtered = cpData.filter((r: any) => {
    if (filterStatus !== 'all' && (filterStatus === 'active' ? !r.isActive : filterStatus === 'draft' ? r.isActive : false)) return false;
    if (filterStatus === 'all') { /* show all */ }
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.name) { toast.error('Plan name is required'); return; }
    const res = await api.post('/api/quality-control-plans', { name: form.name, description: form.description, type: form.type, frequency: form.frequency });
    if (res.success) { toast.success('Control plan created'); setCreateOpen(false); setForm({ name: '', description: '', type: 'in_process', frequency: 'every_batch' }); loadPlans(); }
    else toast.error(res.error || 'Failed to create control plan');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/quality-control-plans/${id}`);
    if (res.success) { toast.success('Control plan deleted'); loadPlans(); } else toast.error(res.error || 'Failed to delete');
  };
  const handleView = (r: any) => { setViewItem(r); setViewOpen(true); };
  const handleEdit = (r: any) => { setEditItem(r); setEditForm({ name: r.name, description: r.description || '', product: r.product || '', status: r.isActive ? 'active' : 'inactive', version: r.version?.toString() || '', frequency: r.frequency || '', sampleSize: r.sampleSize?.toString() || '', characteristics: r.characteristics || '' }); setEditOpen(true); };
  const handleSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    const res = await api.put(`/api/quality-control-plans/${editItem.id}`, { ...editForm, isActive: editForm.status === 'active', sampleSize: editForm.sampleSize ? parseInt(editForm.sampleSize) : null });
    setEditLoading(false);
    if (res.success) { toast.success('Control plan updated'); setEditOpen(false); loadPlans(); } else toast.error(res.error || 'Failed to update');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Control Plans</h1><p className="text-muted-foreground text-sm mt-1">Define and manage control plans for products and processes</p></div>
        {(hasPermission('quality.create') || isAdmin()) && <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Plan</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total Plans', value: cpKpis.total, icon: ScrollText, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Active', value: cpKpis.active, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Inactive', value: cpKpis.inactive, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
            { label: 'All Types', value: cpData.length, icon: Archive, color: 'text-slate-600 bg-slate-100' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search control plans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Inactive</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Frequency</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Sample Size</TableHead><TableHead className="w-[110px]">Created</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No control plans found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-sm">{r.name}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.frequency.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={r.isActive ? cpStatusColors.active : cpStatusColors.draft}>{r.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></TableCell>
              <TableCell className="text-center"><Badge variant="secondary" className="text-[11px]">{r.sampleSize || '-'}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleView(r)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('quality.update') || isAdmin()) && <DropdownMenuItem onClick={() => handleEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('quality.delete') || isAdmin()) && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <ResponsiveDialog open={viewOpen} onOpenChange={setViewOpen}   large>
<Separator className="my-2" /><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground text-xs">Name</p><p className="font-medium">{viewItem?.name}</p></div><div><p className="text-muted-foreground text-xs">Product</p><p className="font-medium">{viewItem?.product || '-'}</p></div><div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={viewItem?.isActive ? cpStatusColors.active : cpStatusColors.draft}>{viewItem?.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></div><div><p className="text-muted-foreground text-xs">Version</p><p className="font-medium">{viewItem?.version || '-'}</p></div><div><p className="text-muted-foreground text-xs">Frequency</p><p className="font-medium">{viewItem?.frequency?.replace(/_/g, ' ') || '-'}</p></div><div><p className="text-muted-foreground text-xs">Sample Size</p><p className="font-medium">{viewItem?.sampleSize || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Description</p><p className="font-medium whitespace-pre-wrap">{viewItem?.description || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Characteristics</p><p className="font-medium whitespace-pre-wrap">{viewItem?.characteristics || '-'}</p></div></div>
        </ResponsiveDialog>
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen}   large>
<div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Name</Label><Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div><div className="space-y-2"><Label>Product</Label><Input value={editForm.product || ''} onChange={e => setEditForm(f => ({ ...f, product: e.target.value }))} /></div><div className="space-y-2"><Label>Status</Label><Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Version</Label><Input value={editForm.version || ''} onChange={e => setEditForm(f => ({ ...f, version: e.target.value }))} /></div><div className="space-y-2"><Label>Frequency</Label><Select value={editForm.frequency || ''} onValueChange={v => setEditForm(f => ({ ...f, frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="every_lot">Every Lot</SelectItem><SelectItem value="every_batch">Every Batch</SelectItem><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Sample Size</Label><Input type="number" value={editForm.sampleSize || ''} onChange={e => setEditForm(f => ({ ...f, sampleSize: e.target.value }))} /></div></div><div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div><div className="space-y-2"><Label>Characteristics</Label><Textarea value={editForm.characteristics || ''} onChange={e => setEditForm(f => ({ ...f, characteristics: e.target.value }))} rows={2} /></div></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </ResponsiveDialog>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}  >
<div className="space-y-4">
            <div className="space-y-2"><Label>Plan Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Control plan name" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Plan description..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In Process</SelectItem><SelectItem value="final">Final</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Frequency</Label><Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="every_lot">Every Lot</SelectItem><SelectItem value="every_batch">Every Batch</SelectItem><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Plan</Button>
          </div>
        </ResponsiveDialog>
    </div>
  );
}

export function QualitySpcPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ process: '', characteristic: '', unit: '', usl: '', lsl: '', target: '', samples: '' });
  const [spcData, setSpcData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [spcKpis, setSpcKpis] = useState({ total: 0, active: 0, outOfControl: 0, inControl: 0, cpkGood: 0 });
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();
  const spcStatusColors: Record<string, string> = { in_control: 'bg-emerald-50 text-emerald-700 border-emerald-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', out_of_control: 'bg-red-50 text-red-700 border-red-200' };
  const cpkColor = (v: number) => v >= 1.33 ? 'text-emerald-600 font-semibold' : v >= 1.0 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold';
  const fetchSpcData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/spc-processes');
      if (res.success && Array.isArray(res.data)) setSpcData(res.data);
      const kpiRes = await api.get('/api/spc-processes?limit=1');
      if (kpiRes.success) setSpcKpis((kpiRes as any).kpis || { total: 0, active: 0, outOfControl: 0, inControl: 0, cpkGood: 0 });
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSpcData(); }, [fetchSpcData]);
  const filtered = spcData.filter((r: any) => {
    if (filterStatus !== 'all' && r.controlStatus !== filterStatus) return false;
    if (search && !r.processName.toLowerCase().includes(search.toLowerCase()) && !r.parameter.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Processes Monitored', value: spcKpis.total, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Control', value: spcKpis.inControl, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Out of Control', value: spcKpis.outOfControl, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Cp/Cpk ≥ 1.33', value: spcKpis.cpkGood, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = async () => {
    if (!form.process) { toast.error('Process name is required'); return; }
    if (!form.characteristic) { toast.error('Characteristic is required'); return; }
    let samplesArr: number[] = [];
    if (form.samples.trim()) {
      samplesArr = form.samples.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
    }
    const res = await api.post('/api/spc-processes', {
      processName: form.process,
      parameter: form.characteristic,
      unit: form.unit,
      specMax: form.usl ? parseFloat(form.usl) : null,
      specMin: form.lsl ? parseFloat(form.lsl) : null,
      target: form.target ? parseFloat(form.target) : null,
      samples: samplesArr,
    });
    if (res.success) { toast.success('SPC process added'); setCreateOpen(false); setForm({ process: '', characteristic: '', unit: '', usl: '', lsl: '', target: '', samples: '' }); fetchSpcData(); }
    else toast.error(res.error || 'Failed to add SPC process');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/spc-processes/${id}`);
    if (res.success) { toast.success('SPC process deleted'); fetchSpcData(); } else toast.error(res.error || 'Failed to delete');
  };
  const handleView = (r: any) => { setViewItem(r); setViewOpen(true); };
  const handleEdit = (r: any) => { setEditItem(r); setEditForm({ name: r.processName, description: r.description || '', parameter: r.parameter, specification: r.specification || '', upperLimit: r.specMax?.toString() ?? '', lowerLimit: r.specMin?.toString() ?? '', unit: r.unit || '', status: r.controlStatus || 'in_control' }); setEditOpen(true); };
  const handleSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    const res = await api.put(`/api/spc-processes/${editItem.id}`, { ...editForm, specMax: editForm.upperLimit ? parseFloat(editForm.upperLimit) : null, specMin: editForm.lowerLimit ? parseFloat(editForm.lowerLimit) : null });
    setEditLoading(false);
    if (res.success) { toast.success('SPC process updated'); setEditOpen(false); fetchSpcData(); } else toast.error(res.error || 'Failed to update');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Statistical Process Control</h1><p className="text-muted-foreground text-sm mt-1">Monitor process stability with SPC charts and capability indices</p></div>
        {(hasPermission('quality.create') || isAdmin()) && <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Add Process</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search processes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="in_control">In Control</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="out_of_control">Out of Control</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Process</TableHead><TableHead>Characteristic</TableHead><TableHead className="text-right">USL</TableHead><TableHead className="text-right">LSL</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Current Mean</TableHead><TableHead className="text-right">Cp</TableHead><TableHead className="text-right">Cpk</TableHead><TableHead>Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {loading ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No SPC processes found</TableCell></TableRow> : filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.processName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.parameter}{r.unit ? ` (${r.unit})` : ''}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.specMax ?? '-'}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.specMin ?? '-'}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.target ?? '-'}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.samples.length > 0 ? r.mean : '-'}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${cpkColor(r.cp)}`}>{r.samples.length > 1 ? r.cp.toFixed(2) : '-'}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${cpkColor(r.cpk)}`}>{r.samples.length > 1 ? r.cpk.toFixed(2) : '-'}</TableCell>
                <TableCell><Badge variant="outline" className={spcStatusColors[r.controlStatus] || ''}>{(r.controlStatus || 'in_control').replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleView(r)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('quality.update') || isAdmin()) && <DropdownMenuItem onClick={() => handleEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('quality.delete') || isAdmin()) && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <ResponsiveDialog open={viewOpen} onOpenChange={setViewOpen}   large>
<Separator className="my-2" /><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground text-xs">Name</p><p className="font-medium">{viewItem?.processName}</p></div><div><p className="text-muted-foreground text-xs">Parameter</p><p className="font-medium">{viewItem?.parameter}</p></div><div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={spcStatusColors[viewItem?.controlStatus] || ''}>{(viewItem?.controlStatus || 'in_control').replace(/_/g, ' ').toUpperCase()}</Badge></div><div><p className="text-muted-foreground text-xs">Unit</p><p className="font-medium">{viewItem?.unit || '-'}</p></div><div><p className="text-muted-foreground text-xs">Upper Limit (USL)</p><p className="font-medium font-mono">{viewItem?.specMax ?? '-'}</p></div><div><p className="text-muted-foreground text-xs">Lower Limit (LSL)</p><p className="font-medium font-mono">{viewItem?.specMin ?? '-'}</p></div><div><p className="text-muted-foreground text-xs">Target</p><p className="font-medium font-mono">{viewItem?.target ?? '-'}</p></div><div><p className="text-muted-foreground text-xs">Samples</p><p className="font-medium">{viewItem?.samples?.length || 0}</p></div><div><p className="text-muted-foreground text-xs">Cp</p><p className={`font-mono font-semibold ${viewItem?.samples?.length > 1 ? cpkColor(viewItem?.cp) : ''}`}>{viewItem?.samples?.length > 1 ? viewItem?.cp?.toFixed(2) : '-'}</p></div><div><p className="text-muted-foreground text-xs">Cpk</p><p className={`font-mono font-semibold ${viewItem?.samples?.length > 1 ? cpkColor(viewItem?.cpk) : ''}`}>{viewItem?.samples?.length > 1 ? viewItem?.cpk?.toFixed(2) : '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Description</p><p className="font-medium whitespace-pre-wrap">{viewItem?.description || '-'}</p></div></div>
        </ResponsiveDialog>
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen}   large>
<div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Name</Label><Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div><div className="space-y-2"><Label>Parameter</Label><Input value={editForm.parameter || ''} onChange={e => setEditForm(f => ({ ...f, parameter: e.target.value }))} /></div><div className="space-y-2"><Label>Unit</Label><Input value={editForm.unit || ''} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} /></div><div className="space-y-2"><Label>Status</Label><Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in_control">In Control</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="out_of_control">Out of Control</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Upper Limit</Label><Input type="number" step="any" value={editForm.upperLimit || ''} onChange={e => setEditForm(f => ({ ...f, upperLimit: e.target.value }))} /></div><div className="space-y-2"><Label>Lower Limit</Label><Input type="number" step="any" value={editForm.lowerLimit || ''} onChange={e => setEditForm(f => ({ ...f, lowerLimit: e.target.value }))} /></div></div><div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </ResponsiveDialog>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}  >
<div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Process *</Label><Input value={form.process} onChange={e => setForm(f => ({ ...f, process: e.target.value }))} placeholder="e.g., CNC Turning" /></div>
              <div className="space-y-2"><Label>Characteristic *</Label><Input value={form.characteristic} onChange={e => setForm(f => ({ ...f, characteristic: e.target.value }))} placeholder="e.g., Outer Diameter (mm)" /></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="mm, MPa, etc." /></div>
              <div className="space-y-2"><Label>USL</Label><Input type="number" step="any" value={form.usl} onChange={e => setForm(f => ({ ...f, usl: e.target.value }))} placeholder="Upper limit" /></div>
              <div className="space-y-2"><Label>LSL</Label><Input type="number" step="any" value={form.lsl} onChange={e => setForm(f => ({ ...f, lsl: e.target.value }))} placeholder="Lower limit" /></div>
              <div className="space-y-2"><Label>Target</Label><Input type="number" step="any" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="Target value" /></div>
            </div>
            <div className="space-y-2"><Label>Initial Samples (comma-separated)</Label><Input value={form.samples} onChange={e => setForm(f => ({ ...f, samples: e.target.value }))} placeholder="e.g., 50.01, 49.98, 50.02, 49.99, 50.00" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Process</Button>
          </div>
        </ResponsiveDialog>
    </div>
  );
}

export function QualityCapaPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', type: 'corrective', source: 'ncr', severity: 'medium', dueDate: '' });
  const [capaData, setCapaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [capaKpis, setCapaKpis] = useState({ total: 0, open: 0, inProgress: 0, verified: 0 });
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();
  const capaPriorityColors: Record<string, string> = { critical: 'bg-red-50 text-red-700 border-red-200', high: 'bg-orange-50 text-orange-700 border-orange-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', low: 'bg-slate-100 text-slate-600 border-slate-200' };
  const capaStatusColors: Record<string, string> = { open: 'bg-amber-50 text-amber-700 border-amber-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', implemented: 'bg-violet-50 text-violet-700 border-violet-200', verified: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: 'bg-slate-100 text-slate-500 border-slate-200' };
  const loadCapas = async () => {
    const res = await api.get('/api/corrective-actions');
    if (res.success && Array.isArray(res.data)) setCapaData(res.data);
    const kpiRes = await api.get('/api/corrective-actions?limit=1');
    if (kpiRes.success) setCapaKpis((kpiRes as any).kpis || { total: 0, open: 0, inProgress: 0, verified: 0 });
    setLoading(false);
  };
  useEffect(() => {
    (async () => {
      const res = await api.get('/api/corrective-actions');
      if (res.success && Array.isArray(res.data)) setCapaData(res.data);
      const kpiRes = await api.get('/api/corrective-actions?limit=1');
      if (kpiRes.success) setCapaKpis((kpiRes as any).kpis || { total: 0, open: 0, inProgress: 0, verified: 0 });
      setLoading(false);
    })();
  }, []);
  const filtered = capaData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.capaNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.description) { toast.error('Description is required'); return; }
    const res = await api.post('/api/corrective-actions', { title: form.title, description: form.description, type: form.type, source: form.source, severity: form.severity, dueDate: form.dueDate || undefined });
    if (res.success) { toast.success('CAPA created'); setCreateOpen(false); setForm({ title: '', description: '', type: 'corrective', source: 'ncr', severity: 'medium', dueDate: '' }); loadCapas(); }
    else toast.error(res.error || 'Failed to create CAPA');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/corrective-actions/${id}`);
    if (res.success) { toast.success('CAPA deleted'); loadCapas(); } else toast.error(res.error || 'Failed to delete');
  };
  const handleView = (r: any) => { setViewItem(r); setViewOpen(true); };
  const handleEdit = (r: any) => { setEditItem(r); setEditForm({ title: r.title, description: r.description || '', type: r.type, priority: r.severity, status: r.status, assignedTo: r.assignedTo || '', dueDate: r.dueDate || '', rootCause: r.rootCause || '', correctiveAction: r.correctiveAction || '', verification: r.verification || '' }); setEditOpen(true); };
  const handleSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    const res = await api.put(`/api/corrective-actions/${editItem.id}`, { ...editForm, severity: editForm.priority });
    setEditLoading(false);
    if (res.success) { toast.success('CAPA updated'); setEditOpen(false); loadCapas(); } else toast.error(res.error || 'Failed to update');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Corrective & Preventive Actions</h1><p className="text-muted-foreground text-sm mt-1">Manage CAPAs for continuous quality improvement</p></div>
        {(hasPermission('quality.create') || isAdmin()) && <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New CAPA</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total CAPAs', value: capaKpis.total, icon: HardHat, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Open', value: capaKpis.open, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
            { label: 'In Progress', value: capaKpis.inProgress, icon: Clock, color: 'text-sky-600 bg-sky-50' },
            { label: 'Verified', value: capaKpis.verified, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search CAPAs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[130px]">CAPA #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead className="w-[110px]">Due Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No CAPAs found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.capaNumber}</TableCell>
              <TableCell className="font-medium text-sm max-w-[250px] truncate">{r.title}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.source}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={capaPriorityColors[r.severity] || ''}>{r.severity.toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={capaStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleView(r)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('quality.update') || isAdmin()) && <DropdownMenuItem onClick={() => handleEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('quality.delete') || isAdmin()) && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
        </div>
      </CardContent></Card>
      <ResponsiveDialog open={viewOpen} onOpenChange={setViewOpen}   large>
<Separator className="my-2" /><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground text-xs">Title</p><p className="font-medium">{viewItem?.title}</p></div><div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium">{viewItem?.type}</p></div><div><p className="text-muted-foreground text-xs">Priority</p><Badge variant="outline" className={capaPriorityColors[viewItem?.severity] || ''}>{viewItem?.severity?.toUpperCase()}</Badge></div><div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={capaStatusColors[viewItem?.status] || ''}>{viewItem?.status?.replace(/_/g, ' ').toUpperCase()}</Badge></div><div><p className="text-muted-foreground text-xs">Assigned To</p><p className="font-medium">{viewItem?.assignedTo || '-'}</p></div><div><p className="text-muted-foreground text-xs">Due Date</p><p className="font-medium">{formatDate(viewItem?.dueDate)}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Description</p><p className="font-medium whitespace-pre-wrap">{viewItem?.description || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Root Cause</p><p className="font-medium whitespace-pre-wrap">{viewItem?.rootCause || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Corrective Action</p><p className="font-medium whitespace-pre-wrap">{viewItem?.correctiveAction || '-'}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs">Verification</p><p className="font-medium whitespace-pre-wrap">{viewItem?.verification || '-'}</p></div></div>
        </ResponsiveDialog>
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen}   large>
<div className="space-y-4"><div className="space-y-2"><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div><div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Type</Label><Select value={editForm.type || ''} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="preventive">Preventive</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Priority</Label><Select value={editForm.priority || ''} onValueChange={v => setEditForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Assigned To</Label><AsyncSearchableSelect value={editForm.assignedTo || ''} onValueChange={v => setEditForm(f => ({ ...f, assignedTo: v }))} placeholder="Select assignee..." fetchOptions={async () => { const res = await api.get('/api/users?limit=999'); if (res.success && res.data) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username || ''})` })); return []; }} /></div><div className="space-y-2"><Label>Due Date</Label><Input type="date" value={editForm.dueDate || ''} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} /></div></div><div className="space-y-2"><Label>Root Cause</Label><Textarea value={editForm.rootCause || ''} onChange={e => setEditForm(f => ({ ...f, rootCause: e.target.value }))} rows={3} /></div><div className="space-y-2"><Label>Corrective Action</Label><Textarea value={editForm.correctiveAction || ''} onChange={e => setEditForm(f => ({ ...f, correctiveAction: e.target.value }))} rows={3} /></div><div className="space-y-2"><Label>Verification</Label><Textarea value={editForm.verification || ''} onChange={e => setEditForm(f => ({ ...f, verification: e.target.value }))} rows={2} /></div></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </ResponsiveDialog>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}  >
<div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="CAPA title" /></div>
            <div className="space-y-2"><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue and planned actions..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="preventive">Preventive</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Source</Label><Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ncr">NCR</SelectItem><SelectItem value="audit">Audit</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="customer_complaint">Customer Complaint</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create CAPA</Button>
          </div>
        </ResponsiveDialog>
    </div>
  );
}

// ============================================================================
// CALIBRATIONS SUBPAGE
// ============================================================================

export function QualityCalibrationsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ instrumentName: '', serialNumber: '', title: '', description: '', calibrationDate: '', nextDueDate: '', status: 'calibrated', standardUsed: '', result: '', uncertainty: '', notes: '' });
  const [calData, setCalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calKpis, setCalKpis] = useState({ total: 0, calibrated: 0, dueSoon: 0, overdue: 0 });
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();

  const calStatusColors: Record<string, string> = {
    calibrated: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    out_of_calibration: 'bg-red-50 text-red-700 border-red-200',
    due: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const resultColors: Record<string, string> = {
    pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    fail: 'bg-red-50 text-red-700 border-red-200',
    adjusted: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const loadCalibrations = async () => {
    try {
      const res = await api.get('/api/calibrations');
      if (res.success && Array.isArray(res.data)) setCalData(res.data);
      const kpiRes = await api.get('/api/calibrations?limit=1');
      if (kpiRes.success) setCalKpis((kpiRes as any).kpis || { total: 0, calibrated: 0, dueSoon: 0, overdue: 0 });
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadCalibrations(); }, []);

  const filtered = useMemo(() => calData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !(r.calibrationNumber || '').toLowerCase().includes(search.toLowerCase()) && !(r.instrumentName || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [calData, search, filterStatus]);

  const handleCreate = async () => {
    if (!form.instrumentName) { toast.error('Instrument name is required'); return; }
    try {
      const res = await api.post('/api/calibrations', {
        instrumentName: form.instrumentName, serialNumber: form.serialNumber || undefined,
        title: form.title || undefined, description: form.description || undefined,
        calibrationDate: form.calibrationDate || undefined, nextDueDate: form.nextDueDate || undefined,
        status: form.status, standardUsed: form.standardUsed || undefined,
        result: form.result || undefined, uncertainty: form.uncertainty || undefined,
        notes: form.notes || undefined,
      });
      if (res.success) { toast.success('Calibration record created'); setCreateOpen(false); setForm({ instrumentName: '', serialNumber: '', title: '', description: '', calibrationDate: '', nextDueDate: '', status: 'calibrated', standardUsed: '', result: '', uncertainty: '', notes: '' }); loadCalibrations(); }
      else toast.error(res.error || 'Failed to create calibration record');
    } catch { toast.error('Failed to create calibration record'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await api.delete(`/api/calibrations/${deleteId}`);
      if (res.success) { toast.success('Calibration record deleted'); setDeleteId(null); loadCalibrations(); }
      else toast.error(res.error || 'Failed to delete');
    } catch { toast.error('Failed to delete'); }
  };

  const handleView = (r: any) => { setViewItem(r); setViewOpen(true); };

  const handleEdit = (r: any) => {
    setEditItem(r);
    setEditForm({
      instrumentName: r.instrumentName || '', serialNumber: r.serialNumber || '',
      title: r.title || '', description: r.description || '',
      calibrationDate: r.calibrationDate ? r.calibrationDate.split('T')[0] : '',
      nextDueDate: r.nextDueDate ? r.nextDueDate.split('T')[0] : '',
      status: r.status || 'calibrated', standardUsed: r.standardUsed || '',
      result: r.result || '', uncertainty: r.uncertainty?.toString() || '', notes: r.notes || '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const res = await api.put(`/api/calibrations/${editItem.id}`, editForm);
      if (res.success) { toast.success('Calibration record updated'); setEditOpen(false); loadCalibrations(); }
      else toast.error(res.error || 'Failed to update');
    } catch { toast.error('Failed to update'); }
    finally { setEditLoading(false); }
  };

  if (loading) return <LoadingSkeleton />;

  const kpiCards = [
    { label: 'Total Records', value: calKpis.total, icon: FlaskConical, color: 'from-emerald-500 to-teal-500' },
    { label: 'Calibrated', value: calKpis.calibrated, icon: CheckCircle2, color: 'from-emerald-500 to-green-500' },
    { label: 'Due Soon', value: calKpis.dueSoon, icon: AlertCircle, color: 'from-amber-500 to-yellow-500' },
    { label: 'Overdue', value: calKpis.overdue, icon: XCircle, color: 'from-red-500 to-orange-500' },
  ];

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calibrations</h1>
          <p className="text-muted-foreground mt-1">Track instrument calibrations, results, and due dates</p>
        </div>
        {(hasPermission('quality.create') || isAdmin()) && <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New Calibration</Button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const Icon = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
        ); })}
      </div>

      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="filter-row mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search calibrations..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="calibrated">Calibrated</SelectItem><SelectItem value="out_of_calibration">Out of Calibration</SelectItem><SelectItem value="due">Due</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Instrument</TableHead><TableHead className="font-semibold">Serial #</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold">Result</TableHead><TableHead className="font-semibold">Cal Date</TableHead><TableHead className="font-semibold">Next Due</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={FlaskConical} title="No calibration records found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{r.calibrationNumber}</TableCell>
                    <TableCell className="font-medium max-w-[180px] truncate">{r.instrumentName || r.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.serialNumber || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className={calStatusColors[r.status] || ''}>{(r.status || '').replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>{r.result ? <Badge variant="outline" className={resultColors[r.result] || ''}>{r.result.toUpperCase()}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(r.calibrationDate)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{r.nextDueDate ? formatDate(r.nextDueDate) : '-'}</TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleView(r)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('quality.update') || isAdmin()) && <DropdownMenuItem onClick={() => handleEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('quality.delete') || isAdmin()) && <><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {calData.length} records</span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Calibration Record</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this calibration record? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <ResponsiveDialog open={viewOpen} onOpenChange={setViewOpen}  large>
<div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Calibration #</Label><p className="text-sm font-medium font-mono">{viewItem?.calibrationNumber || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Instrument</Label><p className="text-sm font-medium">{viewItem?.instrumentName || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Serial Number</Label><p className="text-sm font-medium">{viewItem?.serialNumber || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Status</Label><Badge variant="outline" className={calStatusColors[viewItem?.status] || ''}>{(viewItem?.status || '').replace(/_/g, ' ')}</Badge></div>
            <div><Label className="text-xs text-muted-foreground">Result</Label>{viewItem?.result ? <Badge variant="outline" className={resultColors[viewItem?.result] || ''}>{viewItem.result.toUpperCase()}</Badge> : <span className="text-sm">—</span>}</div>
            <div><Label className="text-xs text-muted-foreground">Uncertainty</Label><p className="text-sm font-medium">{viewItem?.uncertainty ? `${viewItem.uncertainty}` : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Standard Used</Label><p className="text-sm font-medium">{viewItem?.standardUsed || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Calibration Date</Label><p className="text-sm font-medium">{formatDate(viewItem?.calibrationDate)}</p></div>
            <div><Label className="text-xs text-muted-foreground">Next Due Date</Label><p className="text-sm font-medium">{viewItem?.nextDueDate ? formatDate(viewItem.nextDueDate) : '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm font-medium whitespace-pre-wrap">{viewItem?.description || '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Notes</Label><p className="text-sm font-medium whitespace-pre-wrap">{viewItem?.notes || '-'}</p></div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}  >
<div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Instrument Name *</Label><Input placeholder="e.g. Pressure Gauge PG-001" value={form.instrumentName} onChange={e => setForm(f => ({ ...f, instrumentName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Serial Number</Label><Input placeholder="SN-XXXX" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Standard Used</Label><Input placeholder="Reference standard" value={form.standardUsed} onChange={e => setForm(f => ({ ...f, standardUsed: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Calibration Date</Label><Input type="date" value={form.calibrationDate} onChange={e => setForm(f => ({ ...f, calibrationDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Next Due Date</Label><Input type="date" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="calibrated">Calibrated</SelectItem><SelectItem value="out_of_calibration">Out of Calibration</SelectItem><SelectItem value="due">Due</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Result</Label>
                <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem><SelectItem value="adjusted">Adjusted</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Uncertainty</Label><Input type="number" step="0.01" placeholder="e.g. 0.05" value={form.uncertainty} onChange={e => setForm(f => ({ ...f, uncertainty: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={2} placeholder="Calibration details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} placeholder="Additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Record</Button>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen}  >
<div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Instrument Name</Label><Input value={editForm.instrumentName || ''} onChange={e => setEditForm(f => ({ ...f, instrumentName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Serial Number</Label><Input value={editForm.serialNumber || ''} onChange={e => setEditForm(f => ({ ...f, serialNumber: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Standard Used</Label><Input value={editForm.standardUsed || ''} onChange={e => setEditForm(f => ({ ...f, standardUsed: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Calibration Date</Label><Input type="date" value={editForm.calibrationDate || ''} onChange={e => setEditForm(f => ({ ...f, calibrationDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Next Due Date</Label><Input type="date" value={editForm.nextDueDate || ''} onChange={e => setEditForm(f => ({ ...f, nextDueDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Status</Label>
                <Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="calibrated">Calibrated</SelectItem><SelectItem value="out_of_calibration">Out of Calibration</SelectItem><SelectItem value="due">Due</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Result</Label>
                <Select value={editForm.result || ''} onValueChange={v => setEditForm(f => ({ ...f, result: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem><SelectItem value="adjusted">Adjusted</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Uncertainty</Label><Input type="number" step="0.01" value={editForm.uncertainty || ''} onChange={e => setEditForm(f => ({ ...f, uncertainty: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </ResponsiveDialog>
    </div>
  );
}

