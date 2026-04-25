'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AsyncSearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';;
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Smartphone, Monitor, Radio, Wifi, Plus, Search, MoreHorizontal,
  Pencil, Trash2, AlertTriangle, AlertCircle, CheckCircle2, XCircle, Activity, ClipboardList, Gauge, Play, Pause,
  Loader2,
  Cpu, Settings2,
  Thermometer, Droplets, Zap, Settings, RefreshCw, Filter, Bell, BellRing, Eye,
  Info, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { EmptyState, StatusBadge, formatDate, formatDateTime, timeAgo, LoadingSkeleton } from '@/components/shared/helpers';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function IotDevicesPage() {
  const { hasPermission, isAdmin } = useAuthStore();
  const [devices, setDevices] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({ total: 0, online: 0, offline: 0, warning: 0, error: 0, alerting: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProtocol, setFilterProtocol] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<any>(null);
  const [detailReadings, setDetailReadings] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: 'sensor', location: '', protocol: 'MQTT', parameter: '', unit: '', groupId: '' });
  const [editDevice, setEditDevice] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  const fetchDevices = useCallback(() => {
    api.get('/api/iot/devices').then(res => {
      if (res.success) {
        setDevices(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const filtered = useMemo(() => devices.filter(d => {
    const q = searchText.toLowerCase();
    if (q && !d.name.toLowerCase().includes(q) && !(d.deviceCode || '').toLowerCase().includes(q) && !(d.location || '').toLowerCase().includes(q)) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterProtocol !== 'all' && d.protocol !== filterProtocol.toLowerCase()) return false;
    return true;
  }), [devices, searchText, filterType, filterStatus, filterProtocol]);

  const handleCreate = async () => {
    if (!newDevice.name.trim()) { toast.error('Device name is required'); return; }
    if (!newDevice.parameter.trim()) { toast.error('Parameter is required'); return; }
    if (!newDevice.unit.trim()) { toast.error('Unit is required'); return; }
    setCreating(true);
    const res = await api.post('/api/iot/devices', newDevice);
    setCreating(false);
    if (res.success) {
      toast.success('Device registered successfully');
      setCreateOpen(false);
      setNewDevice({ name: '', type: 'sensor', location: '', protocol: 'MQTT', parameter: '', unit: '', groupId: '' });
      fetchDevices();
    } else {
      toast.error(res.error || 'Failed to register device');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/iot/devices/${id}`);
    if (res.success) {
      toast.success('Device removed');
      setDevices(p => p.filter(d => d.id !== id));
      if (detailDevice?.id === id) setDetailDevice(null);
    } else {
      toast.error(res.error || 'Failed to remove device');
    }
  };

  const handleEditSave = async () => {
    if (!editForm.name?.trim()) { toast.error('Device name is required'); return; }
    setEditLoading(true);
    const res = await api.put(`/api/iot/devices/${editDevice.id}`, {
      name: editForm.name,
      type: editForm.type,
      status: editForm.status,
      location: editForm.location,
      protocol: editForm.protocol,
      pollingInterval: editForm.pollingInterval ? Number(editForm.pollingInterval) : null,
      thresholdMin: editForm.thresholdMin != '' ? Number(editForm.thresholdMin) : null,
      thresholdMax: editForm.thresholdMax != '' ? Number(editForm.thresholdMax) : null,
      description: editForm.description,
    });
    setEditLoading(false);
    if (res.success) {
      toast.success('Device updated successfully');
      setEditDevice(null);
      setEditForm({});
      fetchDevices();
    } else {
      toast.error(res.error || 'Failed to update device');
    }
  };

  const handleEditOpen = (d: any) => {
    setEditDevice(d);
    setEditForm({
      name: d.name || '',
      type: d.type || 'sensor',
      status: d.status || 'online',
      location: d.location || '',
      protocol: d.protocol || 'mqtt',
      pollingInterval: d.pollingInterval ?? '',
      thresholdMin: d.thresholdMin ?? '',
      thresholdMax: d.thresholdMax ?? '',
      description: d.description || '',
    });
  };

  const handleViewDetail = async (d: any) => {
    setDetailDevice(d);
    setDetailLoading(true);
    const res = await api.get(`/api/iot/devices/${d.id}`);
    if (res.success && res.data) {
      setDetailDevice(res.data);
      setDetailReadings(res.data.readings || []);
    }
    setDetailLoading(false);
  };

  const statusColor: Record<string, string> = { online: 'bg-emerald-50 text-emerald-700 border-emerald-200', offline: 'bg-slate-100 text-slate-500 border-slate-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', error: 'bg-red-50 text-red-700 border-red-200', maintenance: 'bg-sky-50 text-sky-700 border-sky-200' };
  const statusDot: Record<string, string> = { online: 'bg-emerald-500', offline: 'bg-slate-400', warning: 'bg-amber-500', error: 'bg-red-500', maintenance: 'bg-sky-500' };
  const typeIcon: Record<string, any> = { sensor: Thermometer, gateway: Wifi, actuator: Cpu, controller: Settings2 };

  const signalLabel = (s: number | null | undefined) => s == null ? 'N/A' : s >= 80 ? 'Strong' : s >= 60 ? 'Good' : s >= 40 ? 'Medium' : 'Weak';

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">IoT Devices</h1><p className="text-muted-foreground text-sm mt-1">Register and manage IoT sensors, gateways, and connected devices</p></div>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
          {(hasPermission('iot.create') || isAdmin()) && <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />Add Device</Button>}
          
            <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">Register New Device</h2><p className="text-sm text-muted-foreground">Add a new IoT device to the registry.</p></div>
            <div className="grid gap-4 py-2">
              <div className="space-y-2"><Label>Device Name *</Label><Input placeholder="Temperature Sensor - Room X" value={newDevice.name} onChange={e => setNewDevice({ ...newDevice, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Type *</Label><Select value={newDevice.type} onValueChange={v => setNewDevice({ ...newDevice, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sensor">Sensor</SelectItem><SelectItem value="gateway">Gateway</SelectItem><SelectItem value="controller">Controller</SelectItem><SelectItem value="actuator">Actuator</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Protocol *</Label><Select value={newDevice.protocol} onValueChange={v => setNewDevice({ ...newDevice, protocol: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MQTT">MQTT</SelectItem><SelectItem value="HTTP">HTTP</SelectItem><SelectItem value="Modbus">Modbus</SelectItem><SelectItem value="OPC-UA">OPC-UA</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input placeholder="Building A, Room 101" value={newDevice.location} onChange={e => setNewDevice({ ...newDevice, location: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Parameter *</Label><Input placeholder="Temperature" value={newDevice.parameter} onChange={e => setNewDevice({ ...newDevice, parameter: e.target.value })} /></div>
                <div className="space-y-2"><Label>Unit *</Label><Input placeholder="°C" value={newDevice.unit} onChange={e => setNewDevice({ ...newDevice, unit: e.target.value })} /></div>
                <div className="space-y-2"><Label>Group</Label><Input placeholder="Environmental" value={newDevice.groupId} onChange={e => setNewDevice({ ...newDevice, groupId: e.target.value })} /></div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Registering...' : 'Register Device'}</Button></div>
          
        </ResponsiveDialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Devices', value: kpis.total, icon: Smartphone, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-400' },
          { label: 'Online', value: kpis.online, icon: Wifi, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Offline', value: kpis.offline, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
          { label: 'Alerting', value: kpis.alerting, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      <div className="filter-row flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search devices..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="sensor">Sensor</SelectItem><SelectItem value="gateway">Gateway</SelectItem><SelectItem value="controller">Controller</SelectItem><SelectItem value="actuator">Actuator</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="error">Error</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select>
        <Select value={filterProtocol} onValueChange={setFilterProtocol}><SelectTrigger className="w-36"><SelectValue placeholder="Protocol" /></SelectTrigger><SelectContent><SelectItem value="all">All Protocols</SelectItem><SelectItem value="MQTT">MQTT</SelectItem><SelectItem value="HTTP">HTTP</SelectItem><SelectItem value="Modbus">Modbus</SelectItem><SelectItem value="OPC-UA">OPC-UA</SelectItem></SelectContent></Select>
      </div>

      <Card className="border-0 shadow-sm">
        <Table><TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Device</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Location</TableHead><TableHead className="hidden md:table-cell">Protocol</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Last Seen</TableHead><TableHead className="hidden xl:table-cell">Battery</TableHead><TableHead className="hidden xl:table-cell">Signal</TableHead><TableHead className="w-12"></TableHead>
        </TableRow></TableHeader><TableBody>
          {loading && <TableRow><TableCell colSpan={9}><div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></TableCell></TableRow>}
          {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={9}><EmptyState icon={Smartphone} title="No devices found" description="Try adjusting your search or filters, or register a new device." /></TableCell></TableRow>}
          {!loading && filtered.map(d => { const TI = typeIcon[d.type] || Smartphone; const sig = signalLabel(d.signalStrength); return (
            <TableRow key={d.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => handleViewDetail(d)}>
              <TableCell><div className="flex items-center gap-2"><TI className="h-4 w-4 text-muted-foreground shrink-0" /><div><p className="font-medium text-sm">{d.name}</p><p className="text-xs text-muted-foreground font-mono">{d.deviceCode || d.id}</p></div></div></TableCell>
              <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{d.type}</Badge></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{d.location || '-'}</TableCell>
              <TableCell className="hidden md:table-cell"><Badge variant="secondary" className="font-mono text-xs uppercase">{d.protocol}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`${statusColor[d.status] || ''} capitalize`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot[d.status] || 'bg-slate-400'} mr-1`} />{d.status}</Badge></TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{d.lastSeen ? timeAgo(d.lastSeen) : 'Never'}</TableCell>
              <TableCell className="hidden xl:table-cell">{d.batteryLevel != null ? <div className="flex items-center gap-2"><div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${d.batteryLevel <= 20 ? 'bg-red-500' : d.batteryLevel <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${d.batteryLevel}%` }} /></div><span className="text-xs font-medium">{d.batteryLevel}%</span></div> : <span className="text-xs text-muted-foreground">Wired</span>}</TableCell>
              <TableCell className="hidden xl:table-cell"><Badge variant="outline" className={`text-xs ${sig === 'Strong' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : sig === 'Good' || sig === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : sig === 'Weak' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{sig}</Badge></TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={e => { e.stopPropagation(); handleViewDetail(d); }}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem><DropdownMenuItem onClick={e => { e.stopPropagation(); handleEditOpen(d); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={e => { e.stopPropagation(); handleDelete(d.id); }}><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ); })}
        </TableBody></Table>
      </Card>

      <ResponsiveDialog open={!!detailDevice} onOpenChange={() => setDetailDevice(null)}>
        
          {detailDevice && (<>
            <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight" className="flex items-center gap-2">{detailDevice.name}<Badge variant="outline" className={`${statusColor[detailDevice.status] || ''} capitalize ml-2`}>{detailDevice.status}</Badge></h2><p className="text-sm text-muted-foreground" className="font-mono text-xs">{detailDevice.deviceCode || detailDevice.id}</p></div>
            {detailLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (<>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[['Type', detailDevice.type], ['Protocol', detailDevice.protocol?.toUpperCase()], ['Location', detailDevice.location || '-'], ['Asset', detailDevice.asset?.name || '-'], ['Group', detailDevice.groupId || '-'], ['Last Seen', detailDevice.lastSeen ? timeAgo(detailDevice.lastSeen) : 'Never'], ['Battery', detailDevice.batteryLevel != null ? `${detailDevice.batteryLevel}%` : 'Wired'], ['Signal', signalLabel(detailDevice.signalStrength)], ['Parameter', detailDevice.parameter], ['Last Reading', detailDevice.lastReading != null ? `${detailDevice.lastReading} ${detailDevice.unit}` : 'No data'], ['Threshold', (detailDevice.thresholdMin != null || detailDevice.thresholdMax != null) ? `${detailDevice.thresholdMin ?? '—'} ~ ${detailDevice.thresholdMax ?? '—'} ${detailDevice.unit}` : '-'], ['Readings', `${detailDevice._count?.readings ?? 0}`], ['Alerts', `${detailDevice._count?.alerts ?? 0}`]].map(([label, val]) => (
                <div key={label} className="flex justify-between p-2 rounded-lg bg-muted/30"><span className="text-muted-foreground">{label as string}</span><span className="font-medium">{label === 'Type' ? <span className="capitalize">{val as string}</span> : val as string}</span></div>
              ))}
            </div>
            {detailReadings.length > 0 && (<div className="mt-2">
              <p className="text-sm font-medium mb-2">Recent Readings</p>
              <ChartContainer config={{ value: { label: detailDevice.parameter, color: '#10b981' } }} className="h-[200px] w-full">
                <AreaChart data={[...detailReadings].reverse().map((r: any) => ({ hour: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: r.value }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(detailReadings.length / 6) - 1)} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </div>)}
            </>)}
            <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">{(hasPermission('iot.delete') || isAdmin()) && <Button variant="outline" onClick={() => handleDelete(detailDevice.id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4 mr-1.5" />Remove Device</Button>}<Button variant="outline" onClick={() => setDetailDevice(null)}>Close</Button></div>
          </>)}
        
      </ResponsiveDialog>

      {/* Edit Device Dialog */}
      <ResponsiveDialog open={!!editDevice} onOpenChange={(open) => { if (!open) { setEditDevice(null); setEditForm({}); } }}>
        
          {editDevice && (<>
            <div className="space-y-1.5 mb-4">
              <h2 className="text-lg font-semibold leading-none tracking-tight">Edit Device</h2>
              <p className="text-sm text-muted-foreground" className="font-mono text-xs">{editDevice.deviceCode || editDevice.id}</p>
            </div>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Device Name *</Label>
                <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Device name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editForm.type || 'sensor'} onValueChange={v => setEditForm({ ...editForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sensor">Sensor</SelectItem>
                      <SelectItem value="actuator">Actuator</SelectItem>
                      <SelectItem value="gateway">Gateway</SelectItem>
                      <SelectItem value="controller">Controller</SelectItem>
                      <SelectItem value="plc">PLC</SelectItem>
                      <SelectItem value="scada">SCADA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status || 'online'} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editForm.location || ''} onChange={e => setEditForm({ ...editForm, location: e.target.value })} placeholder="Building A, Room 101" />
              </div>
              <div className="space-y-2">
                <Label>Protocol</Label>
                <Select value={editForm.protocol || 'mqtt'} onValueChange={v => setEditForm({ ...editForm, protocol: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modbus">Modbus</SelectItem>
                    <SelectItem value="opcua">OPC-UA</SelectItem>
                    <SelectItem value="mqtt">MQTT</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="bacnet">BACnet</SelectItem>
                    <SelectItem value="snmp">SNMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Polling Interval (seconds)</Label>
                <Input type="number" min={1} value={editForm.pollingInterval ?? ''} onChange={e => setEditForm({ ...editForm, pollingInterval: e.target.value })} placeholder="e.g. 30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Threshold Min</Label>
                  <Input type="number" value={editForm.thresholdMin ?? ''} onChange={e => setEditForm({ ...editForm, thresholdMin: e.target.value })} placeholder="Min value" />
                </div>
                <div className="space-y-2">
                  <Label>Threshold Max</Label>
                  <Input type="number" value={editForm.thresholdMax ?? ''} onChange={e => setEditForm({ ...editForm, thresholdMax: e.target.value })} placeholder="Max value" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optional device description..." rows={3} />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => { setEditDevice(null); setEditForm({}); }}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>)}
        
      </ResponsiveDialog>
    </div>
  );
}

export function IotMonitoringPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const fetchSummary = useCallback(() => {
    api.get('/api/iot/monitoring/summary').then(res => {
      if (res.success && res.data) {
        setSummary(res.data);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    api.get('/api/iot/alerts').then(res => {
      if (res.success) setAlerts(res.data || []);
      setAlertsLoading(false);
    });
  }, []);

  const handleAlertAction = async (id: string, status: 'acknowledged' | 'resolved') => {
    const res = await api.put(`/api/iot/alerts/${id}`, { status });
    if (res.success) {
      toast.success(`Alert ${status}`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } else {
      toast.error(res.error || 'Action failed');
    }
  };

  const devicesWithReadings = summary?.devicesWithReadings || [];
  const recentAlerts = summary?.alerts?.recent || [];

  // Build chart data from actual readings grouped by parameter
  const chartData = useMemo(() => {
    if (!devicesWithReadings.length) return [];
    const paramMap: Record<string, { hour: string } & Record<string, number>>[] = [];
    const allTimestamps = new Set<string>();

    devicesWithReadings.forEach((d: any) => {
      (d.readings || []).forEach((r: any) => {
        allTimestamps.add(new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      });
    });

    const sortedHours = [...allTimestamps].sort();
    const paramColors: Record<string, string> = { Temperature: '#ef4444', Pressure: '#f59e0b', Humidity: '#06b6d4', Current: '#a855f7', Vibration: '#f97316', pH: '#14b8a6' };

    return sortedHours.map(hour => {
      const point: Record<string, string | number> = { hour };
      devicesWithReadings.forEach((d: any) => {
        const reading = (d.readings || []).find((r: any) => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) === hour);
        if (reading && d.parameter) {
          point[d.parameter] = reading.value;
        }
      });
      return point;
    });
  }, [devicesWithReadings]);

  const uniqueParams = useMemo(() => {
    const params = new Set<string>();
    devicesWithReadings.forEach((d: any) => { if (d.parameter) params.add(d.parameter); });
    return [...params];
  }, [devicesWithReadings]);

  const activityConfig = useMemo(() => {
    const colors: Record<string, string> = { Temperature: '#ef4444', Pressure: '#f59e0b', Humidity: '#06b6d4', Current: '#a855f7', Vibration: '#f97316', pH: '#14b8a6' };
    const cfg: Record<string, { label: string; color: string }> = {};
    uniqueParams.forEach(p => { cfg[p] = { label: p, color: colors[p] || '#10b981' }; });
    return cfg;
  }, [uniqueParams]);

  const severityStyle: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 border-red-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', info: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  const severityIcon: Record<string, any> = { critical: AlertCircle, warning: AlertTriangle, info: Info };

  const operatorSymbol: Record<string, string> = { gt: '>', lt: '<', gte: '≥', lte: '≤', eq: '=' };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">IoT Monitoring</h1><p className="text-muted-foreground text-sm mt-1">Real-time monitoring dashboard for all connected IoT devices and sensor data</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Active Sensors', value: summary?.devices?.activeSensors ?? 0, icon: Radio, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Active Alerts', value: summary?.alerts?.active ?? 0, icon: BellRing, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
          { label: 'Data Points', value: summary?.readingsToday ?? 0, icon: Activity, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Active Rules', value: summary?.activeRules ?? 0, icon: Gauge, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      {chartData.length > 0 && (<Card className="border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"><Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><CardTitle className="text-base font-semibold">Sensor Activity</CardTitle><CardDescription className="text-xs mt-0.5">Multi-parameter trend across connected sensors</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={activityConfig} className="h-[300px] w-full">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(chartData.length / 8) - 1)} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {uniqueParams.map((p, i) => {
                const colors: Record<string, string> = { Temperature: '#ef4444', Pressure: '#f59e0b', Humidity: '#06b6d4', Current: '#a855f7', Vibration: '#f97316', pH: '#14b8a6' };
                return <Area key={p} type="monotone" dataKey={p} stroke={colors[p] || '#10b981'} fill={colors[p] || '#10b981'} fillOpacity={0.08} strokeWidth={2} connectNulls />;
              })}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>)}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Live Sensor Readings</h2>
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {devicesWithReadings.length === 0 && <div className="col-span-full"><EmptyState icon={Radio} title="No sensor data" description="Register devices and submit readings to see live data here." /></div>}
            {devicesWithReadings.map((d: any) => {
              const readings = d.readings || [];
              const lastVal = readings[0]?.value;
              const prevVal = readings[1]?.value;
              const threshold = d.rules?.[0]?.threshold ?? d.thresholdMax;
              const isOver = threshold != null && lastVal != null && lastVal >= threshold;
              const hasTrend = lastVal != null && prevVal != null;
              const trend = hasTrend ? (lastVal > prevVal ? 'up' : lastVal < prevVal ? 'down' : 'stable') : 'stable';
              const TrendI = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
              const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-500' : 'text-slate-400';
              const sparkline = readings.slice(0, 10).reverse().map((r: any) => r.value);
              return (
                <Card key={d.id} className={`border ${isOver ? 'border-red-200 bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">{d.name}</p>
                      <TrendI className={`h-3.5 w-3.5 ${trendColor}`} />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-bold ${isOver ? 'text-red-600' : ''}`}>{lastVal != null ? lastVal : '—'}</span>
                      <span className="text-xs text-muted-foreground">{d.unit}</span>
                    </div>
                    {sparkline.length > 1 && <div className="mt-2 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkline.map((v, i) => ({ i, v }))}>
                          <Area type="monotone" dataKey="v" stroke={isOver ? '#ef4444' : '#10b981'} fill={isOver ? '#ef4444' : '#10b981'} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>}
                    <p className="text-[10px] text-muted-foreground">Threshold: {threshold != null ? `${threshold} ${d.unit}` : 'Not set'}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Alerts</h2>
          <Card className="border">
            <CardContent className="p-4">
              {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {recentAlerts.length === 0 && <EmptyState icon={BellRing} title="No active alerts" description="Alerts will appear here when sensor thresholds are breached." />}
                {recentAlerts.map((a: any) => {
                  const SI = severityIcon[a.severity] || Info;
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`h-7 w-7 rounded-lg ${severityStyle[a.severity] || ''} flex items-center justify-center shrink-0 mt-0.5`}><SI className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5"><span className="font-medium text-xs truncate">{a.device?.name || 'Unknown'}</span><Badge variant="outline" className={`text-[10px] capitalize ${severityStyle[a.severity] || ''}`}>{a.severity}</Badge></div>
                        <p className="text-[11px] text-muted-foreground">{a.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert Management */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alert Management
        </h2>
        {alertsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <EmptyState icon={Bell} title="No alerts" description="Alerts will appear here when sensor thresholds are breached." />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.map((alert: any) => {
              const SI = severityIcon[alert.severity] || Info;
              const statusColor: Record<string, string> = {
                new: 'bg-sky-50 text-sky-700 border-sky-200',
                acknowledged: 'bg-amber-50 text-amber-700 border-amber-200',
                resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              };
              return (
                <Card key={alert.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`h-8 w-8 rounded-lg ${severityStyle[alert.severity] || 'bg-slate-100 text-slate-500'} flex items-center justify-center shrink-0 mt-0.5`}>
                          <SI className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-medium text-sm truncate">{alert.device?.name || 'Unknown Device'}</span>
                            <Badge variant="outline" className={`text-[10px] capitalize ${severityStyle[alert.severity] || ''}`}>{alert.severity}</Badge>
                            <Badge variant="outline" className={`text-[10px] capitalize ${statusColor[alert.status] || 'bg-slate-100 text-slate-500'}`}>{alert.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.createdAt ? formatDateTime(alert.createdAt) : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {alert.status === 'new' && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleAlertAction(alert.id, 'acknowledged')}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Acknowledge
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button size="sm" variant="outline" className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleAlertAction(alert.id, 'resolved')}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function IotRulesPage() {
  const { hasPermission, isAdmin } = useAuthStore();
  const [rules, setRules] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', deviceId: '', parameter: '', operator: 'gt' as string, threshold: '', severity: 'warning' as string, cooldownMinutes: '5' });

  const fetchRules = useCallback(() => {
    Promise.all([
      api.get('/api/iot/rules'),
      api.get('/api/iot/devices?limit=100'),
    ]).then(([rulesRes, devicesRes]) => {
      if (rulesRes.success) setRules(rulesRes.data || []);
      if (devicesRes.success) setDevices(devicesRes.data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const stats = useMemo(() => ({
    total: rules.length, active: rules.filter(r => r.isActive).length,
    paused: rules.filter(r => !r.isActive).length, triggersToday: rules.reduce((s: number, r: any) => s + (r._count?.alerts ?? 0), 0),
  }), [rules]);

  const operatorSymbol: Record<string, string> = { gt: '>', lt: '<', gte: '≥', lte: '≤', eq: '=' };

  const handleCreate = async () => {
    if (!newRule.name.trim()) { toast.error('Rule name is required'); return; }
    if (!newRule.deviceId) { toast.error('Device is required'); return; }
    if (!newRule.threshold) { toast.error('Threshold is required'); return; }
    setCreating(true);
    const device = devices.find((d: any) => d.id === newRule.deviceId);
    const res = await api.post('/api/iot/rules', {
      name: newRule.name,
      deviceId: newRule.deviceId,
      parameter: newRule.parameter || device?.parameter || 'N/A',
      operator: newRule.operator,
      threshold: newRule.threshold,
      severity: newRule.severity,
      cooldownMinutes: newRule.cooldownMinutes,
    });
    setCreating(false);
    if (res.success) {
      toast.success('Rule created successfully');
      setCreateOpen(false);
      setNewRule({ name: '', deviceId: '', parameter: '', operator: 'gt', threshold: '', severity: 'warning', cooldownMinutes: '5' });
      fetchRules();
    } else {
      toast.error(res.error || 'Failed to create rule');
    }
  };

  const toggleRule = async (id: string) => {
    const rule = rules.find((r: any) => r.id === id);
    if (!rule) return;
    const newActive = !rule.isActive;
    const res = await api.put(`/api/iot/rules/${id}`, { toggleActive: newActive });
    if (res.success) {
      toast.success(`${rule.name} ${newActive ? 'activated' : 'paused'}`);
      fetchRules();
    } else {
      toast.error(res.error || 'Failed to toggle rule');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/iot/rules/${id}`);
    if (res.success) {
      toast.success('Rule deleted');
      setRules(p => p.filter(r => r.id !== id));
    } else {
      toast.error(res.error || 'Failed to delete rule');
    }
  };

  const severityColor: Record<string, string> = { warning: 'bg-amber-50 text-amber-700 border-amber-200', critical: 'bg-red-50 text-red-700 border-red-200', info: 'bg-sky-50 text-sky-700 border-sky-200' };
  const severityIcon: Record<string, any> = { warning: AlertTriangle, critical: AlertCircle, info: Info };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">IoT Rules</h1><p className="text-muted-foreground text-sm mt-1">Configure automation rules and alert thresholds for IoT sensor data</p></div>
        <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen}>
          {(hasPermission('iot.create') || isAdmin()) && <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />Create Rule</Button>}
          
            <div className="space-y-1.5 mb-4"><h2 className="text-lg font-semibold leading-none tracking-tight">Create Automation Rule</h2><p className="text-sm text-muted-foreground">Define conditions and actions for automated alerts.</p></div>
            <div className="grid gap-4 py-2">
              <div className="space-y-2"><Label>Rule Name *</Label><Input placeholder="High Temperature Alert" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Device *</Label>
                <AsyncSearchableSelect value={newRule.deviceId} onValueChange={v => { const dev = devices.find((d: any) => d.id === v); setNewRule({ ...newRule, deviceId: v, parameter: dev?.parameter || newRule.parameter }); }} placeholder="Select device..." searchPlaceholder="Search devices..." fetchOptions={async () => { const res = await api.get('/api/iot/devices?limit=999'); if (res.success && res.data) return res.data.map((d: any) => ({ value: d.id, label: `${d.name} (${d.deviceCode})` })); return []; }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Parameter</Label><Input placeholder="Temperature" value={newRule.parameter} onChange={e => setNewRule({ ...newRule, parameter: e.target.value })} /></div>
                <div className="space-y-2"><Label>Severity</Label><Select value={newRule.severity} onValueChange={v => setNewRule({ ...newRule, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Operator</Label><Select value={newRule.operator} onValueChange={v => setNewRule({ ...newRule, operator: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[['gt', '>'], ['lt', '<'], ['gte', '≥'], ['lte', '≤'], ['eq', '=']].map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Threshold *</Label><Input type="number" placeholder="85" value={newRule.threshold} onChange={e => setNewRule({ ...newRule, threshold: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cooldown (min)</Label><Input type="number" placeholder="5" value={newRule.cooldownMinutes} onChange={e => setNewRule({ ...newRule, cooldownMinutes: e.target.value })} /></div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Creating...' : 'Create Rule'}</Button></div>
          
        </ResponsiveDialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: stats.total, icon: ClipboardList, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-400' },
          { label: 'Active', value: stats.active, icon: Play, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Paused', value: stats.paused, icon: Pause, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Total Alerts', value: stats.triggersToday, icon: Zap, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (<div className="space-y-3">
        {rules.map((rule: any) => {
          const SI = severityIcon[rule.severity] || AlertTriangle;
          return (
            <Card key={rule.id} className={`border ${!rule.isActive ? 'opacity-70' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`h-9 w-9 rounded-lg ${severityColor[rule.severity] || severityColor.warning} flex items-center justify-center shrink-0 mt-0.5`}><SI className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{rule.name}</p>
                        <Badge variant="outline" className={rule.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>{rule.isActive ? 'Active' : 'Paused'}</Badge>
                        <Badge variant="outline" className={`text-[10px] capitalize ${severityColor[rule.severity] || ''}`}>{rule.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rule.device?.name || 'Unknown Device'} &mdash; When <span className="font-medium text-foreground">{rule.parameter}</span> {operatorSymbol[rule.operator] || rule.operator} <span className="font-semibold text-foreground">{rule.threshold} {rule.device?.unit || ''}</span></p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                        <span>Alerts: <span className="font-medium text-foreground">{rule._count?.alerts ?? 0}</span></span>
                        <span className="hidden sm:inline">Cooldown: <span className="font-medium text-foreground">{rule.cooldownMinutes}m</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.isActive} onCheckedChange={() => toggleRule(rule.id)} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleRule(rule.id)}>{rule.isActive ? <><Pause className="h-4 w-4 mr-2" />Pause</> : <><Play className="h-4 w-4 mr-2" />Activate</>}</DropdownMenuItem>
                        {(hasPermission('iot.delete') || isAdmin()) && <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rules.length === 0 && <EmptyState icon={Radio} title="No automation rules" description="Create rules to automate responses to IoT sensor data." />}
      </div>)}
    </div>
  );
}

// ============================================================================
// ANALYTICS SUBPAGES
// ============================================================================

