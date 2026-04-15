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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  TriangleAlert, Search, ShieldCheck, HardHat, GraduationCap, FileCheck,
  Plus, MoreHorizontal, Pencil, Trash2, AlertCircle, AlertTriangle, CheckCircle2,
  XCircle, Eye, Clock, Users, Filter, MapPin, Calendar, ShieldAlert,
  ClipboardCheck, ArrowUpDown, Activity, X, Send,
  BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AsyncSearchableSelect } from '@/components/ui/searchable-select';
import { EmptyState, StatusBadge, PriorityBadge, getInitials, formatDate, formatDateTime, timeAgo, LoadingSkeleton } from '@/components/shared/helpers';

export function SafetyIncidentsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, open: 0, investigating: 0, closed: 0, daysSinceLast: 0 });
  const [form, setForm] = useState({ title: '', description: '', type: 'near_miss', severity: 'medium', location: '', date: '' });
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  const { hasPermission, isAdmin } = useAuthStore();

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-incidents');
      if (res.success) {
        setIncidents(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const severityBadge: Record<string, string> = {
    low: 'bg-sky-50 text-sky-700 border-sky-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
  };
  const statusColors: Record<string, string> = {
    open: 'bg-sky-50 text-sky-700 border-sky-200',
    investigating: 'bg-amber-50 text-amber-700 border-amber-200',
    closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const typeLabel: Record<string, string> = { injury: 'Injury', near_miss: 'Near Miss', property_damage: 'Property Damage', environmental: 'Environmental', fire: 'Fire', chemical_spill: 'Chemical Spill' };
  const severityLabel: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

  const filtered = useMemo(() => incidents.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.incidentNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  }), [incidents, search, typeFilter, statusFilter]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => { counts[i.severity || 'medium'] = (counts[i.severity || 'medium'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: severityLabel[name] || name, value, fill: name === 'low' ? '#3b82f6' : name === 'medium' ? '#f59e0b' : name === 'high' ? '#f97316' : '#ef4444' }));
  }, [incidents]);
  const severityConfig = useMemo(() => Object.fromEntries(severityCounts.map((s: any) => [s.name, { label: s.name, color: s.fill }])) as any, [severityCounts]);

  const kpiCards = [
    { label: 'Total Incidents', value: kpis.total, icon: TriangleAlert, color: 'from-red-500 to-orange-500' },
    { label: 'Open', value: kpis.open, icon: AlertCircle, color: 'from-sky-500 to-blue-500' },
    { label: 'Under Investigation', value: kpis.investigating, icon: Search, color: 'from-amber-500 to-yellow-500' },
    { label: 'Closed', value: kpis.closed, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Days Since Last Incident', value: kpis.daysSinceLast, icon: ShieldCheck, color: 'from-teal-500 to-emerald-500' },
  ];

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.date) { toast.error('Incident date is required'); return; }
    try {
      const res = await api.post('/api/safety-incidents', {
        title: form.title, description: form.description, type: form.type,
        severity: form.severity, location: form.location || null, incidentDate: form.date,
      });
      if (res.success) {
        toast.success(`Incident "${form.title}" reported successfully`);
        setDialogOpen(false);
        setForm({ title: '', description: '', type: 'near_miss', severity: 'medium', location: '', date: '' });
        fetchData();
      } else { toast.error(res.error || 'Failed to create incident'); }
    } catch { toast.error('Failed to create incident'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-incidents/${id}`);
      if (res.success) { toast.success('Incident deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      setEditLoading(true);
      const res = await api.put(`/api/safety-incidents/${editItem.id}`, editForm);
      if (res.success) {
        toast.success('Incident updated successfully');
        setEditItem(null); setEditForm({}); fetchData();
      } else { toast.error(res.error || 'Failed to update incident'); }
    } catch { toast.error('Failed to update incident'); }
    finally { setEditLoading(false); }
  };

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Incidents</h1>
          <p className="text-muted-foreground mt-1">Report, investigate, and track safety incidents and near-misses</p>
        </div>
        {(hasPermission('safety.create') || isAdmin()) && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />Report Incident</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Report New Incident</DialogTitle>
              <DialogDescription>Fill in the details of the safety incident</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Title</Label><Input placeholder="Brief description of incident" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Detailed description..." rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="injury">Injury</SelectItem><SelectItem value="property_damage">Property Damage</SelectItem><SelectItem value="environmental">Environmental</SelectItem><SelectItem value="fire">Fire</SelectItem><SelectItem value="chemical_spill">Chemical Spill</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Severity</Label>
                    <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Location</Label><Input placeholder="e.g. Warehouse B" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Submit Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
      </div>

      {loading ? <LoadingSkeleton /> : <>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map(k => { const Icon = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
        ); })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Severity Breakdown</CardTitle><CardDescription className="text-xs">By severity level</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={severityConfig} className="h-[240px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={severityCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" strokeWidth={2} stroke="hsl(var(--background))">
                  {severityCounts.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {severityCounts.map((s: any) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.fill }} />
                  <span className="text-muted-foreground">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm lg:col-span-3">
          <CardContent className="p-4 sm:p-6">
            <div className="filter-row mb-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search incidents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="injury">Injury</SelectItem><SelectItem value="property_damage">Property Damage</SelectItem><SelectItem value="environmental">Environmental</SelectItem><SelectItem value="fire">Fire</SelectItem><SelectItem value="chemical_spill">Chemical Spill</SelectItem></SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
            </div>
            <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader sticky><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Title</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Severity</TableHead><TableHead className="font-semibold">Location</TableHead><TableHead className="font-semibold">Date</TableHead><TableHead className="font-semibold">Reported By</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold">Root Cause</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? <TableRow><TableCell colSpan={10}><EmptyState icon={TriangleAlert} title="No incidents found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(i => (
                    <TableRow key={i.id} className="cursor-pointer hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold">{i.incidentNumber}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{i.title}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{typeLabel[i.type] || i.type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={severityBadge[i.severity] || ''}>{severityLabel[i.severity] || i.severity}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate max-w-[120px]">{i.location}</span></div></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(i.incidentDate)}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(i.reportedBy?.fullName || '')}</AvatarFallback></Avatar><span className="text-sm whitespace-nowrap">{i.reportedBy?.fullName || ''}</span></div></TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[i.status] || ''}>{i.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{i.rootCause || '—'}</TableCell>
                      <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer" onClick={() => setViewItem(i)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('safety.update') || isAdmin()) && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditItem(i); setEditForm({...i}); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('safety.delete') || isAdmin()) && <><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Showing {filtered.length} of {incidents.length} incidents</span>
            </div>
          </CardContent>
        </Card>
      </div>
      </>}

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Incident Details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Title</Label><p className="text-sm font-medium">{viewItem?.title || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm font-medium">{viewItem?.type?.replace(/_/g, ' ') || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Severity</Label><p className="text-sm font-medium capitalize">{viewItem?.severity || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Status</Label><p className="text-sm font-medium capitalize">{viewItem?.status || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Reported By</Label><p className="text-sm font-medium">{viewItem?.reportedBy?.fullName || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Location</Label><p className="text-sm font-medium">{viewItem?.location || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Occurred At</Label><p className="text-sm font-medium">{viewItem?.incidentDate ? formatDate(viewItem.incidentDate) : viewItem?.occurredAt || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Root Cause</Label><p className="text-sm font-medium">{viewItem?.rootCause || '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm font-medium">{viewItem?.description || '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Corrective Action</Label><p className="text-sm font-medium">{viewItem?.correctiveAction || '-'}</p></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Incident</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={editForm.type || 'near_miss'} onValueChange={v => setEditForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="injury">Injury</SelectItem><SelectItem value="property_damage">Property Damage</SelectItem><SelectItem value="environmental">Environmental</SelectItem><SelectItem value="fire">Fire</SelectItem><SelectItem value="chemical_spill">Chemical Spill</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Severity</Label>
                <Select value={editForm.severity || 'medium'} onValueChange={v => setEditForm(p => ({ ...p, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Status</Label>
                <Select value={editForm.status || 'open'} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Root Cause</Label><Input value={editForm.rootCause || ''} onChange={e => setEditForm(p => ({ ...p, rootCause: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Corrective Action</Label><Input value={editForm.correctiveAction || ''} onChange={e => setEditForm(p => ({ ...p, correctiveAction: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SafetyInspectionsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState(['', '']);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, completed: 0, failed: 0, scheduled: 0, inProgress: 0 });
  const [form, setForm] = useState({ title: '', type: 'routine', area: '', inspector: '', scheduledDate: '' });
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  const { hasPermission, isAdmin } = useAuthStore();

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-inspections');
      if (res.success) {
        setInspections(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const statusColors: Record<string, string> = { completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', failed: 'bg-red-50 text-red-700 border-red-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', scheduled: 'bg-sky-50 text-sky-700 border-sky-200' };
  const typeColors: Record<string, string> = { routine: 'bg-slate-100 text-slate-600 border-slate-200', special: 'bg-violet-50 text-violet-700 border-violet-200', follow_up: 'bg-orange-50 text-orange-700 border-orange-200' };

  const filtered = useMemo(() => inspections.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.inspectionNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  }), [inspections, search, typeFilter, statusFilter]);

  const parseFindings = (f: string) => { try { return JSON.parse(f || '[]'); } catch { return []; } };

  const kpiCards = [
    { label: 'Total Inspections', value: kpis.total, icon: ClipboardCheck, color: 'from-emerald-500 to-teal-500' },
    { label: 'Passed', value: kpis.completed, icon: CheckCircle2, color: 'from-emerald-500 to-green-500' },
    { label: 'Failed', value: kpis.failed, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Scheduled', value: kpis.scheduled, icon: Calendar, color: 'from-sky-500 to-blue-500' },
  ];

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.scheduledDate) { toast.error('Scheduled date is required'); return; }
    try {
      const findings = checklistItems.filter(c => c.trim());
      const res = await api.post('/api/safety-inspections', {
        title: form.title, type: form.type, status: 'scheduled',
        scheduledDate: form.scheduledDate, location: form.area || null,
        inspectorId: form.inspector || null, findings: JSON.stringify(findings),
      });
      if (res.success) {
        toast.success(`Inspection "${form.title}" created successfully`);
        setDialogOpen(false);
        setForm({ title: '', type: 'routine', area: '', inspector: '', scheduledDate: '' });
        setChecklistItems(['', '']);
        fetchData();
      } else { toast.error(res.error || 'Failed to create inspection'); }
    } catch { toast.error('Failed to create inspection'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-inspections/${id}`);
      if (res.success) { toast.success('Inspection deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      setEditLoading(true);
      const res = await api.put(`/api/safety-inspections/${editItem.id}`, editForm);
      if (res.success) {
        toast.success('Inspection updated successfully');
        setEditItem(null); setEditForm({}); fetchData();
      } else { toast.error(res.error || 'Failed to update inspection'); }
    } catch { toast.error('Failed to update inspection'); }
    finally { setEditLoading(false); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Inspections</h1>
          <p className="text-muted-foreground mt-1">Schedule and conduct safety inspections and workplace audits</p>
        </div>
        {(hasPermission('safety.create') || isAdmin()) && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />New Inspection</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Create Inspection</DialogTitle><DialogDescription>Schedule a new safety inspection with checklist items</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Title</Label><Input placeholder="Inspection title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="special">Special</SelectItem><SelectItem value="follow_up">Follow Up</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Area</Label><Input placeholder="e.g. Building A" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Inspector</Label><AsyncSearchableSelect value={form.inspector} onValueChange={v => setForm(p => ({ ...p, inspector: v }))} placeholder="Select inspector..." fetchOptions={async () => { const res = await api.get('/api/users?limit=999'); if (res.success && res.data) return res.data.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.username || ''})` })); return []; }} /></div>
                  <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Checklist Items</Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs cursor-pointer" onClick={() => setChecklistItems([...checklistItems, ''])}><Plus className="h-3 w-3 mr-1" />Add</Button>
                  </div>
                  <div className="space-y-2">
                    {checklistItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input placeholder={`Checklist item ${idx + 1}`} value={item} onChange={e => { const updated = [...checklistItems]; updated[idx] = e.target.value; setChecklistItems(updated); }} />
                        {checklistItems.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 cursor-pointer" onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
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
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inspections..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="routine">Routine</SelectItem><SelectItem value="special">Special</SelectItem><SelectItem value="follow_up">Follow Up</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Passed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Title</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Area</TableHead><TableHead className="font-semibold">Date</TableHead><TableHead className="font-semibold">Findings</TableHead><TableHead className="font-semibold">Score</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={9}><EmptyState icon={ClipboardCheck} title="No inspections found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(i => {
                  const findings = parseFindings(i.findings);
                  const scorePct = i.maxScore ? Math.round((i.score / i.maxScore) * 100) : (i.score || 0);
                  return (
                  <TableRow key={i.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{i.inspectionNumber}</TableCell>
                    <TableCell className="font-medium max-w-[220px] truncate">{i.title}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[i.type] || ''}>{i.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[120px]">{i.location}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(i.scheduledDate)}</TableCell>
                    <TableCell className="text-sm font-medium">{Array.isArray(findings) ? findings.length : 0}</TableCell>
                    <TableCell>
                      {scorePct > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${scorePct >= 80 ? 'bg-emerald-500' : scorePct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${scorePct}%` }} /></div>
                          <span className={`text-sm font-semibold ${scorePct >= 80 ? 'text-emerald-600' : scorePct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{scorePct}%</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[i.status] || ''}>{i.status?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer" onClick={() => setViewItem(i)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('safety.update') || isAdmin()) && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditItem(i); setEditForm({...i}); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('safety.delete') || isAdmin()) && <><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {inspections.length} inspections</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Inspection Details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Title</Label><p className="text-sm font-medium">{viewItem?.title || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm font-medium">{viewItem?.type?.replace(/_/g, ' ') || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Status</Label><p className="text-sm font-medium">{viewItem?.status?.replace(/_/g, ' ') || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Inspector</Label><p className="text-sm font-medium">{viewItem?.inspector?.fullName || viewItem?.inspectorId || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Location</Label><p className="text-sm font-medium">{viewItem?.location || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Scheduled Date</Label><p className="text-sm font-medium">{viewItem?.scheduledDate ? formatDate(viewItem.scheduledDate) : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Completed Date</Label><p className="text-sm font-medium">{viewItem?.completedDate ? formatDate(viewItem.completedDate) : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Score</Label><p className="text-sm font-medium">{viewItem?.score != null ? viewItem.score : '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm font-medium">{viewItem?.description || '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Findings</Label><p className="text-sm font-medium">{viewItem?.findings || '-'}</p></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Inspection</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={editForm.type || 'routine'} onValueChange={v => setEditForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="special">Special</SelectItem><SelectItem value="follow_up">Follow Up</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={editForm.status || 'scheduled'} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Score</Label><Input type="number" value={editForm.score ?? ''} onChange={e => setEditForm(p => ({ ...p, score: e.target.value ? Number(e.target.value) : null }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={editForm.scheduledDate ? String(editForm.scheduledDate).slice(0, 10) : ''} onChange={e => setEditForm(p => ({ ...p, scheduledDate: e.target.value || null }))} /></div>
              <div className="space-y-2"><Label>Completed Date</Label><Input type="date" value={editForm.completedDate ? String(editForm.completedDate).slice(0, 10) : ''} onChange={e => setEditForm(p => ({ ...p, completedDate: e.target.value || null }))} /></div>
            </div>
            <div className="space-y-2"><Label>Findings</Label><Textarea rows={2} value={editForm.findings || ''} onChange={e => setEditForm(p => ({ ...p, findings: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SafetyTrainingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, completed: 0, inProgress: 0, overdue: 0, planned: 0 });
  const [form, setForm] = useState({ title: '', type: 'induction', trainer: '', durationHours: '', scheduledDate: '', location: '' });
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-training');
      if (res.success) {
        setTrainings(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const statusColors: Record<string, string> = { completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', cancelled: 'bg-red-50 text-red-700 border-red-200', planned: 'bg-slate-100 text-slate-500 border-slate-200' };
  const typeColors: Record<string, string> = { induction: 'bg-red-50 text-red-600 border-red-200', refresher: 'bg-amber-50 text-amber-700 border-amber-200', specialized: 'bg-violet-50 text-violet-700 border-violet-200' };

  const filtered = useMemo(() => trainings.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.trainer || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  }), [trainings, search, statusFilter]);

  const completedCount = kpis.completed || 0;
  const complianceRate = kpis.total ? Math.round((completedCount / kpis.total) * 100) : 0;

  const kpiCards = [
    { label: 'Total Courses', value: kpis.total, icon: GraduationCap, color: 'from-emerald-500 to-teal-500' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'from-sky-500 to-blue-500' },
    { label: 'Overdue', value: kpis.overdue, icon: AlertTriangle, color: 'from-red-500 to-orange-500' },
    { label: 'Compliance Rate', value: `${complianceRate}%`, icon: ShieldCheck, color: 'from-amber-500 to-yellow-500' },
  ];

  const handleCreate = async () => {
    if (!form.title) { toast.error('Course name is required'); return; }
    try {
      const res = await api.post('/api/safety-training', {
        title: form.title, type: form.type, trainer: form.trainer || null,
        durationHours: form.durationHours ? parseFloat(form.durationHours) : null,
        scheduledDate: form.scheduledDate || null, location: form.location || null,
        status: 'planned',
      });
      if (res.success) {
        toast.success(`Training "${form.title}" created successfully`);
        setDialogOpen(false);
        setForm({ title: '', type: 'induction', trainer: '', durationHours: '', scheduledDate: '', location: '' });
        fetchData();
      } else { toast.error(res.error || 'Failed to create training'); }
    } catch { toast.error('Failed to create training'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-training/${id}`);
      if (res.success) { toast.success('Training deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      setEditLoading(true);
      const res = await api.put(`/api/safety-training/${editItem.id}`, editForm);
      if (res.success) {
        toast.success('Training updated successfully');
        setEditItem(null); setEditForm({}); fetchData();
      } else { toast.error(res.error || 'Failed to update training'); }
    } catch { toast.error('Failed to update training'); }
    finally { setEditLoading(false); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Training</h1>
          <p className="text-muted-foreground mt-1">Manage safety training programs, certifications, and compliance</p>
        </div>
        {(hasPermission('safety.create') || isAdmin()) && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />New Training</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Create Training Record</DialogTitle><DialogDescription>Add a new safety training course or session</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Course Name</Label><Input placeholder="e.g. Fire Safety Training" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="induction">Induction</SelectItem><SelectItem value="refresher">Refresher</SelectItem><SelectItem value="specialized">Specialized</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Duration (hours)</Label><Input type="number" placeholder="e.g. 4" value={form.durationHours} onChange={e => setForm(p => ({ ...p, durationHours: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Trainer</Label><Input placeholder="Trainer name" value={form.trainer} onChange={e => setForm(p => ({ ...p, trainer: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input placeholder="e.g. Training Room A" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
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
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search courses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky><TableRow className="bg-muted/50"><TableHead className="font-semibold">Course Name</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Trainer</TableHead><TableHead className="font-semibold">Duration</TableHead><TableHead className="font-semibold">Location</TableHead><TableHead className="font-semibold">Scheduled Date</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={GraduationCap} title="No courses found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(t => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-medium max-w-[220px] truncate">{t.title}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[t.type] || ''}>{t.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.trainer || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.durationHours ? `${t.durationHours}h` : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.location || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(t.scheduledDate)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[t.status] || ''}>{t.status?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer" onClick={() => setViewItem(t)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('safety.update') || isAdmin()) && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditItem(t); setEditForm({...t}); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('safety.delete') || isAdmin()) && <><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {trainings.length} courses</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Training Details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Title</Label><p className="text-sm font-medium">{viewItem?.title || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm font-medium">{viewItem?.type?.replace(/_/g, ' ') || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Status</Label><p className="text-sm font-medium">{viewItem?.status?.replace(/_/g, ' ') || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Trainer</Label><p className="text-sm font-medium">{viewItem?.trainer || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Location</Label><p className="text-sm font-medium">{viewItem?.location || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Duration</Label><p className="text-sm font-medium">{viewItem?.durationHours ? `${viewItem.durationHours} hours` : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Scheduled Date</Label><p className="text-sm font-medium">{viewItem?.scheduledDate ? formatDate(viewItem.scheduledDate) : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Completed Date</Label><p className="text-sm font-medium">{viewItem?.completedDate ? formatDate(viewItem.completedDate) : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Attendees</Label><p className="text-sm font-medium">{viewItem?.attendees || '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm font-medium">{viewItem?.description || '-'}</p></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Training</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={editForm.type || 'induction'} onValueChange={v => setEditForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="induction">Induction</SelectItem><SelectItem value="refresher">Refresher</SelectItem><SelectItem value="specialized">Specialized</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={editForm.status || 'planned'} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Trainer</Label><Input value={editForm.trainer || ''} onChange={e => setEditForm(p => ({ ...p, trainer: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Duration (hours)</Label><Input type="number" value={editForm.durationHours ?? ''} onChange={e => setEditForm(p => ({ ...p, durationHours: e.target.value ? Number(e.target.value) : null }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Attendees</Label><Input value={editForm.attendees || ''} onChange={e => setEditForm(p => ({ ...p, attendees: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={editForm.scheduledDate ? String(editForm.scheduledDate).slice(0, 10) : ''} onChange={e => setEditForm(p => ({ ...p, scheduledDate: e.target.value || null }))} /></div>
              <div className="space-y-2"><Label>Completed Date</Label><Input type="date" value={editForm.completedDate ? String(editForm.completedDate).slice(0, 10) : ''} onChange={e => setEditForm(p => ({ ...p, completedDate: e.target.value || null }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SafetyEquipmentPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, available: 0, inUse: 0, expired: 0, disposed: 0, dueInspection: 0 });
  const [form, setForm] = useState({ name: '', type: 'ppe', location: '', lastInspection: '', nextInspection: '' });
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-equipment');
      if (res.success) {
        setEquipment(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getDisplayStatus = (eq: any) => {
    if (eq.status === 'expired' || (eq.expiryDate && new Date(eq.expiryDate) < new Date())) return 'expired';
    if (eq.status === 'disposed') return 'disposed';
    if (eq.nextInspection && new Date(eq.nextInspection) < new Date(Date.now() + 30 * 86400000)) return 'expiring';
    if (!eq.nextInspection && !eq.lastInspected) return 'not_inspected';
    return 'valid';
  };

  const statusColors: Record<string, string> = {
    valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expiring: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    not_inspected: 'bg-slate-100 text-slate-500 border-slate-200',
    disposed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    in_use: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  const typeColors: Record<string, string> = {
    ppe: 'bg-sky-50 text-sky-700 border-sky-200',
    fire_extinguisher: 'bg-red-50 text-red-600 border-red-200',
    first_aid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    gas_detector: 'bg-violet-50 text-violet-700 border-violet-200',
    spill_kit: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const filtered = useMemo(() => equipment.filter(eq => {
    if (search && !eq.name.toLowerCase().includes(search.toLowerCase()) && !(eq.code || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && eq.type !== typeFilter) return false;
    if (statusFilter !== 'all' && getDisplayStatus(eq) !== statusFilter) return false;
    return true;
  }), [equipment, search, typeFilter, statusFilter]);

  const kpiCards = [
    { label: 'Total Equipment', value: kpis.total, icon: HardHat, color: 'from-emerald-500 to-teal-500' },
    { label: 'Available', value: kpis.available, icon: CheckCircle2, color: 'from-sky-500 to-blue-500' },
    { label: 'Expired', value: kpis.expired, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Due for Inspection', value: kpis.dueInspection, icon: AlertTriangle, color: 'from-amber-500 to-yellow-500' },
  ];

  const handleCreate = async () => {
    if (!form.name) { toast.error('Equipment name is required'); return; }
    try {
      const res = await api.post('/api/safety-equipment', {
        name: form.name, type: form.type, location: form.location || null,
        lastInspected: form.lastInspection || null, nextInspection: form.nextInspection || null,
      });
      if (res.success) {
        toast.success(`Equipment "${form.name}" registered successfully`);
        setDialogOpen(false);
        setForm({ name: '', type: 'ppe', location: '', lastInspection: '', nextInspection: '' });
        fetchData();
      } else { toast.error(res.error || 'Failed to register equipment'); }
    } catch { toast.error('Failed to register equipment'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-equipment/${id}`);
      if (res.success) { toast.success('Equipment deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      setEditLoading(true);
      const res = await api.put(`/api/safety-equipment/${editItem.id}`, editForm);
      if (res.success) {
        toast.success('Equipment updated successfully');
        setEditItem(null); setEditForm({}); fetchData();
      } else { toast.error(res.error || 'Failed to update equipment'); }
    } catch { toast.error('Failed to update equipment'); }
    finally { setEditLoading(false); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Equipment</h1>
          <p className="text-muted-foreground mt-1">Track PPE, safety devices, and emergency equipment inventory</p>
        </div>
        {(hasPermission('safety.create') || isAdmin()) && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />Register Equipment</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Register Equipment</DialogTitle><DialogDescription>Add a new safety equipment item</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Equipment Name</Label><Input placeholder="e.g. Safety Helmet" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ppe">PPE</SelectItem><SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="gas_detector">Gas Detector</SelectItem><SelectItem value="spill_kit">Spill Kit</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input placeholder="Storage location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Last Inspection</Label><Input type="date" value={form.lastInspection} onChange={e => setForm(p => ({ ...p, lastInspection: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Next Inspection</Label><Input type="date" value={form.nextInspection} onChange={e => setForm(p => ({ ...p, nextInspection: e.target.value }))} /></div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Register</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
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
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search equipment..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="ppe">PPE</SelectItem><SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="gas_detector">Gas Detector</SelectItem><SelectItem value="spill_kit">Spill Kit</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="valid">Valid</SelectItem><SelectItem value="expiring">Expiring</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="not_inspected">Not Inspected</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Equipment Name</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Location</TableHead><TableHead className="font-semibold">Last Inspection</TableHead><TableHead className="font-semibold">Next Inspection</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={HardHat} title="No equipment found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(eq => {
                  const dStatus = getDisplayStatus(eq);
                  return (
                  <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{eq.code}</TableCell>
                    <TableCell className="font-medium max-w-[220px] truncate">{eq.name}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[eq.type] || ''}>{eq.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[140px]">{eq.location}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(eq.lastInspected)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap"><span className={dStatus === 'expired' ? 'text-red-600 font-medium' : dStatus === 'expiring' ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>{formatDate(eq.nextInspection)}</span></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[dStatus] || ''}>{dStatus?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer" onClick={() => setViewItem(eq)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('safety.update') || isAdmin()) && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditItem(eq); setEditForm({...eq}); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('safety.delete') || isAdmin()) && <><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(eq.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {equipment.length} items</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Equipment Details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Name</Label><p className="text-sm font-medium">{viewItem?.name || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm font-medium">{viewItem?.type?.replace(/_/g, ' ') || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Status</Label><p className="text-sm font-medium">{viewItem?.status?.replace(/_/g, ' ') || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Condition</Label><p className="text-sm font-medium">{viewItem?.condition || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Location</Label><p className="text-sm font-medium">{viewItem?.location || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Serial Number</Label><p className="text-sm font-medium">{viewItem?.serialNumber || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Last Inspected</Label><p className="text-sm font-medium">{viewItem?.lastInspected ? formatDate(viewItem.lastInspected) : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Next Inspection</Label><p className="text-sm font-medium">{viewItem?.nextInspection ? formatDate(viewItem.nextInspection) : '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm font-medium">{viewItem?.description || '-'}</p></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Equipment</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={editForm.type || 'ppe'} onValueChange={v => setEditForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ppe">PPE</SelectItem><SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="gas_detector">Gas Detector</SelectItem><SelectItem value="spill_kit">Spill Kit</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Condition</Label><Input value={editForm.condition || ''} onChange={e => setEditForm(p => ({ ...p, condition: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Serial Number</Label><Input value={editForm.serialNumber || ''} onChange={e => setEditForm(p => ({ ...p, serialNumber: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Last Inspected</Label><Input type="date" value={editForm.lastInspected ? String(editForm.lastInspected).slice(0, 10) : ''} onChange={e => setEditForm(p => ({ ...p, lastInspected: e.target.value || null }))} /></div>
              <div className="space-y-2"><Label>Next Inspection</Label><Input type="date" value={editForm.nextInspection ? String(editForm.nextInspection).slice(0, 10) : ''} onChange={e => setEditForm(p => ({ ...p, nextInspection: e.target.value || null }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SafetyPermitsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permits, setPermits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, active: 0, pending: 0, expired: 0, completed: 0, cancelled: 0 });
  const [safetyMeasures, setSafetyMeasures] = useState(['', '', '']);
  const [form, setForm] = useState({ type: 'hot_work', title: '', description: '', area: '', validFrom: '', validUntil: '' });
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { hasPermission, isAdmin } = useAuthStore();

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-permits');
      if (res.success) {
        setPermits(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const statusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', pending: 'bg-amber-50 text-amber-700 border-amber-200', expired: 'bg-red-50 text-red-700 border-red-200', cancelled: 'bg-slate-100 text-slate-500 border-slate-300', completed: 'bg-sky-50 text-sky-700 border-sky-200', approved: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  const typeColors: Record<string, string> = { hot_work: 'bg-red-50 text-red-600 border-red-200', confined_space: 'bg-orange-50 text-orange-700 border-orange-200', elevated_work: 'bg-sky-50 text-sky-700 border-sky-200', electrical: 'bg-violet-50 text-violet-700 border-violet-200', excavation: 'bg-amber-50 text-amber-700 border-amber-200' };

  const filtered = useMemo(() => permits.filter(p => {
    if (search && !p.description.toLowerCase().includes(search.toLowerCase()) && !(p.permitNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  }), [permits, search, typeFilter, statusFilter]);

  const kpiCards = [
    { label: 'Active Permits', value: kpis.active, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Expired', value: kpis.expired, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Pending Approval', value: kpis.pending, icon: Clock, color: 'from-amber-500 to-yellow-500' },
    { label: 'Cancelled', value: kpis.cancelled, icon: ShieldAlert, color: 'from-slate-500 to-slate-600' },
  ];

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.validFrom || !form.validUntil) { toast.error('Valid from and valid until dates are required'); return; }
    try {
      const precautions = safetyMeasures.filter(m => m.trim());
      const res = await api.post('/api/safety-permits', {
        title: form.title, type: form.type, description: form.description || '',
        location: form.area || null, startDate: form.validFrom, endDate: form.validUntil,
        precautions: JSON.stringify(precautions),
      });
      if (res.success) {
        toast.success(`Permit for "${form.type.replace(/_/g, ' ')}" submitted successfully`);
        setDialogOpen(false);
        setForm({ type: 'hot_work', title: '', description: '', area: '', validFrom: '', validUntil: '' });
        setSafetyMeasures(['', '', '']);
        fetchData();
      } else { toast.error(res.error || 'Failed to create permit'); }
    } catch { toast.error('Failed to create permit'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-permits/${id}`);
      if (res.success) { toast.success('Permit deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      setEditLoading(true);
      const res = await api.put(`/api/safety-permits/${editItem.id}`, editForm);
      if (res.success) {
        toast.success('Permit updated successfully');
        setEditItem(null); setEditForm({}); fetchData();
      } else { toast.error(res.error || 'Failed to update permit'); }
    } catch { toast.error('Failed to update permit'); }
    finally { setEditLoading(false); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Permits</h1>
          <p className="text-muted-foreground mt-1">Manage work permits including hot work, confined space, and electrical permits</p>
        </div>
        {(hasPermission('safety.create') || isAdmin()) && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />Request Permit</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Request Work Permit</DialogTitle><DialogDescription>Submit a new safety work permit request</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Permit Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hot_work">Hot Work</SelectItem><SelectItem value="confined_space">Confined Space</SelectItem><SelectItem value="elevated_work">Working at Height</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="excavation">Excavation</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Title</Label><Input placeholder="Permit title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe the work activity..." rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Area</Label><Input placeholder="Work location" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valid From</Label><Input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} /></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Safety Measures Checklist</Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs cursor-pointer" onClick={() => setSafetyMeasures([...safetyMeasures, ''])}><Plus className="h-3 w-3 mr-1" />Add</Button>
                  </div>
                  <div className="space-y-2">
                    {safetyMeasures.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input type="checkbox" checked={item.length > 0} readOnly className="rounded accent-emerald-600" />
                        <Input placeholder={`Safety measure ${idx + 1}`} value={item} onChange={e => { const updated = [...safetyMeasures]; updated[idx] = e.target.value; setSafetyMeasures(updated); }} />
                        {safetyMeasures.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 cursor-pointer" onClick={() => setSafetyMeasures(safetyMeasures.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
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
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search permits..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="hot_work">Hot Work</SelectItem><SelectItem value="confined_space">Confined Space</SelectItem><SelectItem value="elevated_work">Working at Height</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="excavation">Excavation</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky><TableRow className="bg-muted/50"><TableHead className="font-semibold">Permit #</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Description</TableHead><TableHead className="font-semibold">Area</TableHead><TableHead className="font-semibold">Requested By</TableHead><TableHead className="font-semibold">Valid From</TableHead><TableHead className="font-semibold">Valid Until</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={9}><EmptyState icon={FileCheck} title="No permits found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{p.permitNumber}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[p.type] || ''}>{p.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.description || p.title}</TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[120px]">{p.location}</span></div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(p.requestedBy?.fullName || '')}</AvatarFallback></Avatar><span className="text-sm whitespace-nowrap">{p.requestedBy?.fullName || ''}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(p.startDate)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap"><span className={p.status === 'expired' || p.status === 'cancelled' ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{formatDate(p.endDate)}</span></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[p.status] || ''}>{p.status?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer" onClick={() => setViewItem(p)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>{(hasPermission('safety.update') || isAdmin()) && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditItem(p); setEditForm({...p}); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}{(hasPermission('safety.delete') || isAdmin()) && <><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {permits.length} permits</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Permit Details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Title</Label><p className="text-sm font-medium">{viewItem?.title || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm font-medium">{viewItem?.type?.replace(/_/g, ' ') || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Status</Label><p className="text-sm font-medium capitalize">{viewItem?.status || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Requested By</Label><p className="text-sm font-medium">{viewItem?.requestedBy?.fullName || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Location</Label><p className="text-sm font-medium">{viewItem?.location || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Start Date</Label><p className="text-sm font-medium">{viewItem?.startDate ? formatDate(viewItem.startDate) : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">End Date</Label><p className="text-sm font-medium">{viewItem?.endDate ? formatDate(viewItem.endDate) : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Hazards</Label><p className="text-sm font-medium">{viewItem?.hazards || '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm font-medium">{viewItem?.description || '-'}</p></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Permit</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={editForm.type || 'hot_work'} onValueChange={v => setEditForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="hot_work">Hot Work</SelectItem><SelectItem value="confined_space">Confined Space</SelectItem><SelectItem value="elevated_work">Working at Height</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="excavation">Excavation</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={editForm.status || 'pending'} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Hazards</Label><Input value={editForm.hazards || ''} onChange={e => setEditForm(p => ({ ...p, hazards: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={editForm.startDate ? String(editForm.startDate).slice(0, 10) : ''} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value || null }))} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={editForm.endDate ? String(editForm.endDate).slice(0, 10) : ''} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value || null }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// REPORTS SUBPAGES
// ============================================================================

