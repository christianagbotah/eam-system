'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import type { InventoryItem } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  Package, Plus, Search, Pencil, Trash2, MoreHorizontal, AlertTriangle,
  TrendingUp, ArrowUpDown, History, X, ShoppingCart, Building, FolderOpen,
  ChevronRight,
  MapPin, ArrowRightLeft, FileText, Truck, Download, RefreshCw, Eye,
  CheckCircle2, Check, ClipboardCheck, ClipboardList, Clock, Filter, DollarSign, Box, Star,
  XCircle, Loader2,
} from 'lucide-react';
import { EmptyState, StatusBadge, PriorityBadge, getInitials, formatDate, formatDateTime, timeAgo, LoadingSkeleton } from '@/components/shared/helpers';

export function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [plantList, setPlantList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Stock movement
  const [movementOpen, setMovementOpen] = useState(false);
  const [movType, setMovType] = useState('in');
  const [movItemId, setMovItemId] = useState('');
  const [movQty, setMovQty] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movLoading, setMovLoading] = useState(false);
  // Stock movements list
  const [selectedMovItemId, setSelectedMovItemId] = useState<string | null>(null);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  // KPI data from API
  const [kpi, setKpi] = useState<{
    total: number;
    byCategory: Record<string, number>;
    lowStock: number;
    totalValue: number;
    avgUnitCost: number;
    pendingRequests: number;
    pendingAdjustments: number;
    movements: { thisMonth: number; lastMonth: number; trendPercent: number };
    stockSummary: { totalQuantity: number; totalMinLevels: number; totalMaxCapacity: number };
  } | null>(null);

  const emptyForm = { itemCode: '', name: '', description: '', category: 'spare_part', unitOfMeasure: 'each', currentStock: '', minStockLevel: '', maxStockLevel: '', reorderQuantity: '', unitCost: '', supplier: '', location: '', binLocation: '', plantId: '' };
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(() => {
    Promise.all([api.get<any[]>('/api/inventory'), api.get<any[]>('/api/plants')]).then(([iRes, pRes]) => {
      if (iRes.success && iRes.data) setItems(Array.isArray(iRes.data) ? iRes.data : []);
      if (pRes.success && pRes.data) setPlantList(Array.isArray(pRes.data) ? pRes.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get('/api/inventory/kpi').then((res: any) => {
      if (res.success && res.data) setKpi(res.data);
    });
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      if (searchText) { const q = searchText.toLowerCase(); if (!i.name.toLowerCase().includes(q) && !i.itemCode.toLowerCase().includes(q)) return false; }
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (lowStockOnly && i.currentStock > i.minStockLevel) return false;
      return true;
    });
  }, [items, searchText, categoryFilter, lowStockOnly]);

  const stats = useMemo(() => {
    const lowStock = items.filter(i => i.currentStock <= i.minStockLevel).length;
    const totalValue = items.reduce((sum, i) => sum + (i.currentStock * (i.unitCost || 0)), 0);
    return { total: items.length, lowStock, totalValue };
  }, [items]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (i: any) => { setEditId(i.id); setForm({ itemCode: i.itemCode, name: i.name, description: i.description || '', category: i.category || 'spare_part', unitOfMeasure: i.unitOfMeasure || 'each', currentStock: i.currentStock?.toString() || '', minStockLevel: i.minStockLevel?.toString() || '', maxStockLevel: i.maxStockLevel?.toString() || '', reorderQuantity: i.reorderQuantity?.toString() || '', unitCost: i.unitCost?.toString() || '', supplier: i.supplier || '', location: i.location || '', binLocation: i.binLocation || '', plantId: i.plantId || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.itemCode) { toast.error('Name and item code required'); return; }
    setSaving(true);
    const payload: any = { ...form, currentStock: form.currentStock ? parseFloat(form.currentStock) : 0, minStockLevel: form.minStockLevel ? parseFloat(form.minStockLevel) : 0, maxStockLevel: form.maxStockLevel ? parseFloat(form.maxStockLevel) : undefined, reorderQuantity: form.reorderQuantity ? parseFloat(form.reorderQuantity) : undefined, unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined };
    const res = editId ? await api.put(`/api/inventory/${editId}`, payload) : await api.post('/api/inventory', payload);
    if (res.success) { toast.success(editId ? 'Item updated' : 'Item created'); setDialogOpen(false); loadData(); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await api.delete(`/api/inventory/${deleteId}`);
    if (res.success) { toast.success('Item deleted'); setDeleteId(null); loadData(); }
    else { toast.error(res.error || 'Failed to delete'); }
  };

  const handleStockMovement = async () => {
    if (!movItemId || !movQty) { toast.error('Item and quantity required'); return; }
    setMovLoading(true);
    const res = await api.post(`/api/inventory/${movItemId}/stock-movements`, { type: movType, quantity: parseFloat(movQty), reason: movReason || undefined });
    if (res.success) { toast.success('Stock movement recorded'); setMovementOpen(false); setMovQty(''); setMovReason(''); loadData(); }
    else { toast.error(res.error || 'Failed'); }
    setMovLoading(false);
  };

  const loadMovements = useCallback((itemId: string) => {
    setSelectedMovItemId(itemId);
    api.get<any[]>(`/api/inventory/${itemId}/stock-movements`).then(res => {
      if (res.success && res.data) setStockMovements(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage spare parts, consumables, and supplies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setMovItemId(''); setMovQty(''); setMovReason(''); setMovType('in'); setMovementOpen(true); }} className="gap-1.5"><ArrowUpDown className="h-4 w-4" />Stock Movement</Button>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Add Item</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi?.total ?? stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi?.byCategory ? `${Object.keys(kpi.byCategory).length} categories` : 'across all categories'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(kpi?.totalValue ?? stats.totalValue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi?.avgUnitCost != null ? `Avg $${kpi.avgUnitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/unit` : 'total inventory value'}
            </p>
          </CardContent>
        </Card>
        <Card className={"border-0 shadow-sm" + ((kpi?.lowStock ?? stats.lowStock) > 0 ? ' border-l-4 border-l-amber-400' : '')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${(kpi?.lowStock ?? stats.lowStock) > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(kpi?.lowStock ?? stats.lowStock) > 0 ? 'text-amber-600' : ''}`}>{kpi?.lowStock ?? stats.lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(kpi?.lowStock ?? stats.lowStock) > 0 ? 'items below min level' : 'all items in stock'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi?.pendingRequests ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi?.pendingRequests != null ? 'awaiting approval' : 'pending requests'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Movements This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi?.movements?.thisMonth ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi?.movements?.trendPercent != null
                ? (kpi.movements.trendPercent >= 0 ? '+' : '') + kpi.movements.trendPercent.toFixed(1) + '% vs last month'
                : 'stock movements'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Adjustments</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi?.pendingAdjustments ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi?.pendingAdjustments != null ? 'awaiting review' : 'pending adjustments'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="filter-row flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search inventory..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="spare_part">Spare Part</SelectItem><SelectItem value="consumable">Consumable</SelectItem><SelectItem value="tool">Tool</SelectItem><SelectItem value="material">Material</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
        </Select>
        <label className="filter-row-checkbox flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="rounded" />
          <span>Low Stock Only</span>
        </label>
      </div>

      <Card className="border-0 shadow-sm dark:bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead className="hidden md:table-cell">Unit Cost</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={Package} title="No items found" description="Try adjusting your filters." /></TableCell></TableRow>
              ) : filteredItems.map(i => {
                const isLow = i.currentStock <= i.minStockLevel;
                const max = i.maxStockLevel || Math.max(i.minStockLevel * 2, i.currentStock, 100);
                const pct = Math.min(100, (i.currentStock / max) * 100);
                return (
                  <TableRow key={i.id} className={isLow ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                    <TableCell className="font-mono text-xs">{i.itemCode}</TableCell>
                    <TableCell className="font-medium text-sm">{i.name}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell capitalize">{i.category?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5"><span>{i.currentStock}</span><span>{i.maxStockLevel || '—'}</span></div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Min: {i.minStockLevel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{i.unitCost ? `$${i.unitCost.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{i.location || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(i)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadMovements(i.id)}><History className="h-3.5 w-3.5 mr-2" />Movements</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(i.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle><DialogDescription>{editId ? 'Update inventory item.' : 'Add a new item to inventory.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Item Code *</Label><Input value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="spare_part">Spare Part</SelectItem><SelectItem value="consumable">Consumable</SelectItem><SelectItem value="tool">Tool</SelectItem><SelectItem value="material">Material</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Unit of Measure</Label>
                <Select value={form.unitOfMeasure} onValueChange={v => setForm(f => ({ ...f, unitOfMeasure: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="each">Each</SelectItem><SelectItem value="kg">Kg</SelectItem><SelectItem value="liter">Liter</SelectItem><SelectItem value="meter">Meter</SelectItem><SelectItem value="set">Set</SelectItem><SelectItem value="box">Box</SelectItem><SelectItem value="roll">Roll</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Plant</Label>
                <Select value={form.plantId} onValueChange={v => setForm(f => ({ ...f, plantId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{plantList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5"><Label>Current Stock</Label><Input type="number" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Min Stock Level</Label><Input type="number" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Max Stock Level</Label><Input type="number" value={form.maxStockLevel} onChange={e => setForm(f => ({ ...f, maxStockLevel: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Reorder Qty</Label><Input type="number" value={form.reorderQuantity} onChange={e => setForm(f => ({ ...f, reorderQuantity: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Unit Cost ($)</Label><Input type="number" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Bin Location</Label><Input value={form.binLocation} onChange={e => setForm(f => ({ ...f, binLocation: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}{editId ? 'Save Changes' : 'Add Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Inventory Item</DialogTitle><DialogDescription>Are you sure? This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Stock Movement</DialogTitle><DialogDescription>Record a stock movement.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Movement Type</Label>
              <Select value={movType} onValueChange={setMovType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="in">Stock In</SelectItem><SelectItem value="out">Stock Out</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Item *</Label>
              <Select value={movItemId} onValueChange={setMovItemId}>
                <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                <SelectContent>{items.map(it => <SelectItem key={it.id} value={it.id}>{it.name} ({it.itemCode})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" value={movQty} onChange={e => setMovQty(e.target.value)} placeholder="Enter quantity" /></div>
            <div className="space-y-1.5"><Label>Reason</Label><Textarea value={movReason} onChange={e => setMovReason(e.target.value)} placeholder="Optional reason..." rows={2} /></div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={movLoading} onClick={handleStockMovement}>
              {movLoading ? 'Recording...' : 'Record Movement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Movements Section */}
      {selectedMovItemId && (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-base">Stock Movements</CardTitle><CardDescription className="text-xs">For item: {items.find(it => it.id === selectedMovItemId)?.name || selectedMovItemId}</CardDescription></div>
            <Button size="sm" variant="ghost" onClick={() => { setSelectedMovItemId(null); setStockMovements([]); }}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {stockMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock movements found for this item.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="hidden sm:table-cell">Previous</TableHead>
                      <TableHead className="hidden sm:table-cell">New</TableHead>
                      <TableHead className="hidden md:table-cell">Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.map(m => (
                      <TableRow key={m.id}>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${m.type === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : m.type === 'out' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{m.type === 'in' ? 'Stock In' : m.type === 'out' ? 'Stock Out' : 'Adjustment'}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{m.type === 'out' ? '-' : '+'}{m.quantity}</TableCell>
                        <TableCell className="hidden sm:table-cell">{m.previousStock ?? '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell font-medium">{m.newStock ?? '-'}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{m.reason || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
// --- InventoryItemsPage separator ---
export function InventoryItemsPage() {
  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Inventory Items</h1><p className="text-muted-foreground mt-1">Manage spare parts, consumables, and supply inventory</p></div>
      <InventoryPage />
    </div>
  );
}

export function InventoryCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: '', code: '', description: '', parentId: '' });
  const [searchText, setSearchText] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/asset-categories');
      if (res.data) setCategories(res.data.categories || res.data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getChildren = (parentId: string | null) => categories.filter(c => (parentId ? c.parentId === parentId : !c.parentId));

  const countDescendants = (id: string): number => {
    let count = 0;
    categories.filter(c => c.parentId === id).forEach(c => { count += 1 + countDescendants(c.id); });
    return count;
  };

  const renderTree = (parentId: string | null, depth: number = 0) => {
    const children = getChildren(parentId);
    const q = searchText.toLowerCase();
    const filtered = q ? children.filter((c: any) => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)) : children;
    return filtered.map((cat: any) => {
      const hasChildren = categories.some(c => c.parentId === cat.id);
      const isExpanded = expandedIds.has(cat.id);
      return (
        <div key={cat.id}>
          <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
            {hasChildren ? (
              <button onClick={() => toggleExpand(cat.id)} className="p-0.5 rounded hover:bg-muted">
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <div className="w-5" />
            )}
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{cat.name}</span>
              {cat.code && <span className="text-[10px] text-muted-foreground ml-2 font-mono">{cat.code}</span>}
            </div>
            <Badge variant="secondary" className="text-[10px] h-5">{cat._count?.assets ?? 0} items</Badge>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => { setSelectedCat(cat); setForm({ name: cat.name, code: cat.code || '', description: cat.description || '', parentId: cat.parentId || '' }); setEditOpen(true); }} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
              <button onClick={async () => { if (confirm('Delete this category?')) { const r = await api.delete(`/api/asset-categories/${cat.id}`); if (r.success) { toast.success('Category deleted'); fetchCategories(); } else toast.error(r.error || 'Failed to delete'); } }} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
            </div>
          </div>
          {hasChildren && isExpanded && renderTree(cat.id, depth + 1)}
        </div>
      );
    });
  };

  const handleCreate = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    const res = await api.post('/api/asset-categories', { name: form.name, code: form.code, description: form.description, parentId: form.parentId || null, isActive: true });
    if (res.success) { toast.success('Category created'); setCreateOpen(false); setForm({ name: '', code: '', description: '', parentId: '' }); fetchCategories(); }
    else toast.error(res.error || 'Failed to create category');
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!selectedCat) return;
    setSaving(true);
    const res = await api.put(`/api/asset-categories/${selectedCat.id}`, { name: form.name, code: form.code, description: form.description, parentId: form.parentId || null });
    if (res.success) { toast.success('Category updated'); setEditOpen(false); setSelectedCat(null); fetchCategories(); }
    else toast.error(res.error || 'Failed to update category');
    setSaving(false);
  };

  const rootCategories = getChildren(null);
  const totalItems = categories.reduce((sum: number, c: any) => sum + (c._count?.assets ?? 0), 0);

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">{categories.length} categories · {totalItems} total items</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search categories..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Category</Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-2">
          {rootCategories.length === 0 ? (
            <EmptyState icon={FolderOpen} title="No categories yet" description="Create your first category to start organizing inventory items." />
          ) : (
            renderTree(null)
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Category</DialogTitle><DialogDescription>Add a new inventory category to the hierarchy.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Category Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Electrical Components" /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g., ELEC" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Category description..." rows={2} /></div>
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                <SelectTrigger><SelectValue placeholder="None (root category)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root category)</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Creating...' : 'Create Category'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle><DialogDescription>Update category details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Category Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                <SelectTrigger><SelectValue placeholder="None (root)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root category)</SelectItem>
                  {categories.filter((c: any) => c.id !== selectedCat?.id).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function InventoryLocationsPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [form, setForm] = useState({ code: '', name: '', type: '', zone: '', capacity: '', address: '' });

  const locationTypes = ['warehouse', 'staging', 'production', 'picking', 'receiving'];

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/inventory/locations');
      if (res.success) {
        setLocations(res.data || []);
        setKpis(res.kpis || {});
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const filtered = locations.filter((l: any) => {
    const matchSearch = l.code.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase()) || (l.address || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || l.type === filterType;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? l.isActive : !l.isActive);
    return matchSearch && matchType && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Locations', value: kpis.total || 0, icon: MapPin, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Active', value: kpis.active || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Inactive', value: kpis.inactive || 0, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Empty', value: locations.filter((l: any) => (l._count?.items || 0) === 0).length, icon: Box, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.type) { toast.error('Please fill in all required fields'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/inventory/locations', { name: form.name, code: form.code, type: form.type, address: form.address || null });
      if (res.success) { toast.success(`Location ${form.code} created successfully`); setCreateOpen(false); setForm({ code: '', name: '', type: '', zone: '', capacity: '', address: '' }); fetchLocations(); }
      else toast.error(res.error || 'Failed to create location');
    } catch { toast.error('Failed to create location'); } finally { setCreating(false); }
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Locations</h1>
          <p className="text-muted-foreground mt-1">Manage warehouse locations, bins, and storage areas</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />Add Location</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>{locationTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Address</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell text-right">Items</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-48"><EmptyState icon={MapPin} title="No locations found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((l: any) => (
              <TableRow key={l.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{l.code}</TableCell>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{(l.type || '').replace('_', ' ')}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{l.address || '-'}</TableCell>
                <TableCell><Badge variant="outline" className={l.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>{l.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-right font-medium">{l._count?.items || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Add New Location</DialogTitle><DialogDescription>Create a new storage location in the warehouse.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Code *</Label><Input placeholder="WH-A1" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
              <div className="space-y-2"><Label>Name *</Label><Input placeholder="Warehouse A - Zone 1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type *</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{locationTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Zone</Label><Input placeholder="Zone A" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Capacity</Label><Input type="number" placeholder="500" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address</Label><Input placeholder="Building A, Floor 1" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function InventoryTransactionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    api.get<any[]>('/api/inventory').then(res => {
      if (res.success && res.data) setItems(res.data);
      setLoading(false);
    });
  }, []);

  const allTransactions = items.flatMap(item =>
    (item.stockMovements || []).map((m: any) => ({ ...m, itemName: item.name, itemCode: item.itemCode }))
  ).sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());

  const filtered = filterType === 'all' ? allTransactions : allTransactions.filter(t => t.type === filterType);
  const totalTransactions = allTransactions.length;
  const received = allTransactions.filter(t => t.type === 'received' || t.type === 'in').length;
  const issued = allTransactions.filter(t => t.type === 'issued' || t.type === 'out').length;
  const adjustments = allTransactions.filter(t => t.type === 'adjustment').length;

  const summaryCards = [
    { label: 'Total Transactions', value: totalTransactions, icon: ArrowRightLeft, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Items Received', value: received, icon: Download, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Items Issued', value: issued, icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Adjustments', value: adjustments, icon: ArrowUpDown, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Transactions</h1><p className="text-muted-foreground mt-1">View complete transaction history for all inventory movements</p></div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="hidden sm:table-cell">Code</TableHead><TableHead>Type</TableHead><TableHead>Quantity</TableHead><TableHead className="hidden md:table-cell">Reference</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-48"><EmptyState icon={ArrowRightLeft} title="No transactions found" description="Transactions will appear once inventory movements are recorded." /></TableCell></TableRow>
          ) : filtered.slice(0, 50).map((t, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="font-medium">{t.itemName}</TableCell>
              <TableCell className="font-mono text-xs hidden sm:table-cell">{t.itemCode}</TableCell>
              <TableCell><Badge variant="outline" className={t.type === 'received' || t.type === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : t.type === 'issued' || t.type === 'out' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-sky-50 text-sky-700 border-sky-200'}>{(t.type || 'N/A').toUpperCase()}</Badge></TableCell>
              <TableCell className={t.type === 'issued' || t.type === 'out' ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>{t.type === 'issued' || t.type === 'out' ? '-' : '+'}{Math.abs(t.quantity || 0)}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{t.reference || '-'}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(t.createdAt || t.date)}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
export function InventoryAdjustmentsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ item: '', location: '', type: '', quantityBefore: '', quantityAfter: '', reason: '' });

  const adjTypes = ['gain', 'loss', 'correction', 'write_off', 'damage', 'return'];

  const fetchAdjustments = useCallback(async () => {
    try {
      const [adjRes, itemRes] = await Promise.all([
        api.get<any>('/api/inventory/adjustments'),
        api.get<any>('/api/inventory'),
      ]);
      if (adjRes.success) { setAdjustments(adjRes.data || []); setKpis(adjRes.kpis || {}); }
      if (itemRes.success) setInventoryItems(itemRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

  const adjStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

  const filtered = adjustments.filter((a: any) => {
    const matchSearch = a.adjustmentNumber.toLowerCase().includes(search.toLowerCase()) || (a.item?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Adjustments', value: kpis.total || 0, icon: ArrowUpDown, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending Approval', value: kpis.pending || 0, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: kpis.approved || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Rejected', value: kpis.rejected || 0, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const handleCreate = async () => {
    if (!form.item || !form.type || !form.reason) { toast.error('Please fill in all required fields'); return; }
    setCreating(true);
    try {
      const selectedItem = inventoryItems.find((i: any) => i.id === form.item);
      const quantity = form.type === 'gain' || form.type === 'return'
        ? Math.abs(parseFloat(form.quantityAfter || '0') - parseFloat(form.quantityBefore || '0'))
        : Math.abs(parseFloat(form.quantityBefore || '0') - parseFloat(form.quantityAfter || '0'));
      const res = await api.post('/api/inventory/adjustments', {
        itemId: form.item,
        type: form.type === 'write_off' ? 'loss' : form.type === 'damage' ? 'loss' : form.type,
        quantity: quantity || 1,
        reason: form.reason,
        notes: form.location || null,
      });
      if (res.success) { toast.success('Adjustment created successfully'); setCreateOpen(false); setForm({ item: '', location: '', type: '', quantityBefore: '', quantityAfter: '', reason: '' }); fetchAdjustments(); }
      else toast.error(res.error || 'Failed to create adjustment');
    } catch { toast.error('Failed to create adjustment'); } finally { setCreating(false); }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await api.put(`/api/inventory/adjustments/${id}`, { action, type: action === 'approve' ? 'gain' : 'loss' });
      if (res.success) { toast.success(`Adjustment ${action}d`); fetchAdjustments(); }
      else toast.error(res.error || `Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Adjustments</h1><p className="text-muted-foreground mt-1">Record stock adjustments, write-offs, and corrections</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New Adjustment</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search adjustments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Adj #</TableHead><TableHead>Item</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden sm:table-cell">Qty Change</TableHead><TableHead className="hidden md:table-cell">Reason</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Created By</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={ArrowUpDown} title="No adjustments found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(a => (
              <TableRow key={a.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{a.adjustmentNumber}</TableCell>
                <TableCell className="font-medium">{a.item?.name || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{a.type?.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell font-medium">{a.type === 'gain' ? '+' : '-'}{a.quantity}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{a.reason}</TableCell>
                <TableCell><Badge variant="outline" className={adjStatusColors[a.status]}>{a.status?.replace('_', ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{a.createdBy?.fullName || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Inventory Adjustment</DialogTitle><DialogDescription>Record a stock adjustment for an inventory item.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Item *</Label><Input placeholder="Ball Bearing 6205" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></div>
              <div className="space-y-2"><Label>Location *</Label><Input placeholder="WH-A1" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Adjustment Type *</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{adjTypes.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity Before</Label><Input type="number" placeholder="100" value={form.quantityBefore} onChange={e => setForm({ ...form, quantityBefore: e.target.value })} /></div>
              <div className="space-y-2"><Label>Quantity After</Label><Input type="number" placeholder="95" value={form.quantityAfter} onChange={e => setForm({ ...form, quantityAfter: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Reason *</Label><Textarea placeholder="Describe the reason for this adjustment..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Submit Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function InventoryRequestsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [form, setForm] = useState({ item: '', quantity: '', priority: '', description: '', notes: '' });

  const fetchRequests = useCallback(async () => {
    try {
      const [reqRes, itemRes] = await Promise.all([
        api.get<any>('/api/inventory/requests'),
        api.get<any>('/api/inventory'),
      ]);
      if (reqRes.success) { setRequests(reqRes.data || []); setKpis(reqRes.kpis || {}); }
      if (itemRes.success) setInventoryItems(itemRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const reqStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', partially_fulfilled: 'bg-sky-50 text-sky-700 border-sky-200', fulfilled: 'bg-teal-50 text-teal-700 border-teal-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

  const filtered = requests.filter((r: any) => {
    const matchSearch = r.requestNumber?.toLowerCase().includes(search.toLowerCase()) || r.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchPriority = filterPriority === 'all' || r.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const kpiCards = [
    { label: 'Total Requests', value: kpis.total || 0, icon: FileText, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending', value: kpis.pending || 0, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: kpis.approved || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Fulfilled', value: kpis.fulfilled || 0, icon: Check, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const handleCreate = async () => {
    if (!form.item || !form.quantity || !form.priority) { toast.error('Please fill in all required fields'); return; }
    setCreating(true);
    try {
      const selectedItem = inventoryItems.find((i: any) => i.id === form.item);
      const res = await api.post('/api/inventory/requests', {
        title: selectedItem?.name || form.item,
        description: form.description || null,
        priority: form.priority,
        items: [{ itemId: form.item, quantity: parseFloat(form.quantity) || 1 }],
        notes: form.notes || null,
      });
      if (res.success) { toast.success('Request created successfully'); setCreateOpen(false); setForm({ item: '', quantity: '', priority: '', description: '', notes: '' }); fetchRequests(); }
      else toast.error(res.error || 'Failed to create request');
    } catch { toast.error('Failed to create request'); } finally { setCreating(false); }
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Requests</h1><p className="text-muted-foreground mt-1">Submit and track material requisitions from work orders</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New Request</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="partially_fulfilled">Partial</SelectItem><SelectItem value="fulfilled">Fulfilled</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Req #</TableHead><TableHead>Title</TableHead><TableHead className="hidden sm:table-cell">Items</TableHead><TableHead className="hidden sm:table-cell">Requested By</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={7} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={FileText} title="No requests found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{r.requestNumber}</TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell className="hidden sm:table-cell">{r.items?.length || 0}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{r.requestedBy?.fullName || '-'}</TableCell>
                <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                <TableCell><Badge variant="outline" className={reqStatusColors[r.status]}>{r.status?.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Inventory Request</DialogTitle><DialogDescription>Submit a material requisition for inventory items.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Item *</Label><Select value={form.item} onValueChange={v => setForm({ ...form, item: v })}><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{inventoryItems.filter((i: any) => i.isActive).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.itemCode})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Priority *</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Purpose or description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Creating...' : 'Submit Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function InventoryTransfersPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [form, setForm] = useState({ item: '', quantity: '', fromLocation: '', toLocation: '', notes: '' });

  const transferStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', in_transit: 'bg-sky-50 text-sky-700 border-sky-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', cancelled: 'bg-slate-100 text-slate-600 border-slate-200' };

  const fetchTransfers = useCallback(async () => {
    try {
      const [txRes, itemRes, locRes] = await Promise.all([
        api.get<any>('/api/inventory/transfers'),
        api.get<any>('/api/inventory'),
        api.get<any>('/api/inventory/locations'),
      ]);
      if (txRes.success) { setTransfers(txRes.data || []); setKpis(txRes.kpis || {}); }
      if (itemRes.success) setInventoryItems(itemRes.data || []);
      if (locRes.success) setLocations(locRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const filtered = transfers.filter((t: any) => {
    const matchSearch = t.transferNumber?.toLowerCase().includes(search.toLowerCase()) || t.item?.name?.toLowerCase().includes(search.toLowerCase()) || t.fromLocation?.name?.toLowerCase().includes(search.toLowerCase()) || t.toLocation?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Transfers', value: kpis.total || 0, icon: Truck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending', value: (kpis.pending || 0) + (kpis.inTransit || 0), icon: ArrowRightLeft, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Completed', value: kpis.completed || 0, icon: CheckCircle2, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'Cancelled', value: kpis.cancelled || 0, icon: XCircle, color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' },
  ];

  const handleCreate = async () => {
    if (!form.item || !form.quantity || !form.fromLocation || !form.toLocation) { toast.error('Please fill in all required fields'); return; }
    if (form.fromLocation === form.toLocation) { toast.error('From and To locations cannot be the same'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/inventory/transfers', {
        itemId: form.item,
        quantity: parseFloat(form.quantity),
        fromLocationId: form.fromLocation,
        toLocationId: form.toLocation,
        notes: form.notes || null,
      });
      if (res.success) { toast.success('Transfer created successfully'); setCreateOpen(false); setForm({ item: '', quantity: '', fromLocation: '', toLocation: '', notes: '' }); fetchTransfers(); }
      else toast.error(res.error || 'Failed to create transfer');
    } catch { toast.error('Failed to create transfer'); } finally { setCreating(false); }
  };

  const handleAction = async (id: string, action: 'approve' | 'complete' | 'cancel') => {
    try {
      const res = await api.put(`/api/inventory/transfers/${id}`, { action });
      if (res.success) { toast.success(`Transfer ${action}d`); fetchTransfers(); }
      else toast.error(res.error || `Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Transfers</h1><p className="text-muted-foreground mt-1">Transfer inventory items between locations</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New Transfer</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search transfers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Transfer #</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="hidden sm:table-cell">From</TableHead><TableHead className="hidden sm:table-cell">To</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead className="hidden lg:table-cell">Actions</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Truck} title="No transfers found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((t: any) => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{t.transferNumber}</TableCell>
                <TableCell className="font-medium">{t.item?.name || '-'}</TableCell>
                <TableCell className="font-medium">{t.quantity}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{t.fromLocation?.code || '-'}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{t.toLocation?.code || '-'}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={transferStatusColors[t.status]}>{t.status?.replace('_', ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {t.status === 'pending' && <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => handleAction(t.id, 'approve')}>Approve</Button>}
                  {t.status === 'in_transit' && <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => handleAction(t.id, 'complete')}>Complete</Button>}
                  {(t.status === 'pending' || t.status === 'in_transit') && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => handleAction(t.id, 'cancel')}>Cancel</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Inventory Transfer</DialogTitle><DialogDescription>Create a transfer request to move items between locations.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Item *</Label><Select value={form.item} onValueChange={v => setForm({ ...form, item: v })}><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{inventoryItems.filter((i: any) => i.isActive).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.itemCode})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>From Location *</Label><Select value={form.fromLocation} onValueChange={v => setForm({ ...form, fromLocation: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{locations.filter((l: any) => l.isActive).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>To Location *</Label><Select value={form.toLocation} onValueChange={v => setForm({ ...form, toLocation: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{locations.filter((l: any) => l.isActive).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Creating...' : 'Create Transfer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function InventorySuppliersPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [form, setForm] = useState({ name: '', code: '', contactPerson: '', email: '', phone: '', address: '', city: '', country: '', website: '', rating: '' });

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/suppliers');
      if (res.success) { setSuppliers(res.data || []); setKpis(res.kpis || {}); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const supplierStatusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', on_hold: 'bg-amber-50 text-amber-700 border-amber-200', inactive: 'bg-slate-100 text-slate-600 border-slate-200' };

  const filtered = suppliers.filter((s: any) => {
    const matchSearch = s.code?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase()) || s.contactPerson?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? s.isActive : !s.isActive);
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Suppliers', value: kpis.total || 0, icon: Building, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Active', value: kpis.active || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Inactive', value: kpis.inactive || 0, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Top Rated', value: suppliers.filter((s: any) => s.rating >= 4).length, icon: Star, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const handleCreate = async () => {
    if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/suppliers', {
        name: form.name,
        code: form.code,
        contactPerson: form.contactPerson || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        website: form.website || null,
        rating: form.rating ? parseInt(form.rating) : null,
      });
      if (res.success) { toast.success(`Supplier ${form.name} added successfully`); setCreateOpen(false); setForm({ name: '', code: '', contactPerson: '', email: '', phone: '', address: '', city: '', country: '', website: '', rating: '' }); fetchSuppliers(); }
      else toast.error(res.error || 'Failed to add supplier');
    } catch { toast.error('Failed to add supplier'); } finally { setCreating(false); }
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Suppliers</h1><p className="text-muted-foreground mt-1">Manage supplier information, contacts, and performance metrics</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Company</TableHead><TableHead className="hidden sm:table-cell">Contact</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead className="hidden lg:table-cell">Rating</TableHead><TableHead>Status</TableHead><TableHead className="hidden xl:table-cell text-right">Items</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Building} title="No suppliers found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((s: any) => (
              <TableRow key={s.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{s.code}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{s.contactPerson || '-'}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.email || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell"><span className="text-amber-500">{'★'.repeat(s.rating || 0)}</span><span className="text-muted/30">{'★'.repeat(5 - (s.rating || 0))}</span></TableCell>
                <TableCell><Badge variant="outline" className={s.isActive ? supplierStatusColors.active : supplierStatusColors.inactive}>{s.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></TableCell>
                <TableCell className="hidden xl:table-cell text-right font-medium">{s._count?.items || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle><DialogDescription>Register a new supplier in the system.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Company Name *</Label><Input placeholder="SKF Industries" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Code *</Label><Input placeholder="SUP-0001" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contact Person</Label><Input placeholder="John Smith" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="john@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="+1-555-0100" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Rating (1-5)</Label><Input type="number" min="1" max="5" placeholder="4" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input placeholder="Full address..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>City</Label><Input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-2"><Label>Country</Label><Input placeholder="Country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Adding...' : 'Add Supplier'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function InventoryPurchaseOrdersPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [form, setForm] = useState({ supplier: '', priority: '', expectedDate: '', notes: '' });

  const fetchOrders = useCallback(async () => {
    try {
      const [poRes, supRes, itemRes] = await Promise.all([
        api.get<any>('/api/purchase-orders'),
        api.get<any>('/api/suppliers'),
        api.get<any>('/api/inventory'),
      ]);
      if (poRes.success) { setOrders(poRes.data || []); setKpis(poRes.kpis || {}); }
      if (supRes.success) setSuppliers(supRes.data || []);
      if (itemRes.success) setInventoryItems(itemRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const poStatusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600 border-slate-200', pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', partially_received: 'bg-sky-50 text-sky-700 border-sky-200', received: 'bg-teal-50 text-teal-700 border-teal-200', cancelled: 'bg-red-50 text-red-600 border-red-200' };

  const filtered = orders.filter((po: any) => {
    const matchSearch = po.poNumber?.toLowerCase().includes(search.toLowerCase()) || po.supplier?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || po.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total POs', value: kpis.total || 0, icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending', value: kpis.pending || 0, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: kpis.approved || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Received', value: kpis.received || 0, icon: Check, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const handleCreate = async () => {
    if (!form.supplier || !form.priority) { toast.error('Supplier and priority are required'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/purchase-orders', {
        supplierId: form.supplier,
        priority: form.priority,
        expectedDelivery: form.expectedDate || null,
        notes: form.notes || null,
        items: [],
      });
      if (res.success) { toast.success('Purchase order created successfully'); setCreateOpen(false); setForm({ supplier: '', priority: '', expectedDate: '', notes: '' }); fetchOrders(); }
      else toast.error(res.error || 'Failed to create PO');
    } catch { toast.error('Failed to create PO'); } finally { setCreating(false); }
  };

  const handleAction = async (id: string, action: 'approve') => {
    try {
      const res = await api.post(`/api/purchase-orders/${id}/${action}`, {});
      if (res.success) { toast.success(`PO ${action}d`); fetchOrders(); }
      else toast.error(res.error || `Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1><p className="text-muted-foreground mt-1">Create and manage purchase orders for inventory replenishment</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New PO</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search purchase orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="partially_received">Partial</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead className="hidden sm:table-cell">Items</TableHead><TableHead className="hidden sm:table-cell">Amount</TableHead><TableHead className="hidden md:table-cell">Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead><TableHead className="hidden lg:table-cell">Actions</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={ShoppingCart} title="No purchase orders found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((po: any) => (
              <TableRow key={po.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{po.poNumber}</TableCell>
                <TableCell className="font-medium">{po.supplier?.name || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">{po.items?.length || 0}</TableCell>
                <TableCell className="hidden sm:table-cell font-medium">${(po.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="hidden md:table-cell"><PriorityBadge priority={po.priority} /></TableCell>
                <TableCell><Badge variant="outline" className={poStatusColors[po.status]}>{po.status?.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(po.createdAt)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {po.status === 'draft' && <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => handleAction(po.id, 'approve')}>Approve</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle><DialogDescription>Create a new purchase order for inventory items.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Supplier *</Label><Select value={form.supplier} onValueChange={v => setForm({ ...form, supplier: v })}><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{suppliers.filter((s: any) => s.isActive).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Priority *</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Expected Date</Label><Input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Creating...' : 'Create PO'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function InventoryReceivingPage() {
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ purchaseOrder: '', itemId: '', quantity: '', condition: 'good', notes: '' });

  const fetchRecords = useCallback(async () => {
    try {
      const [recRes, poRes] = await Promise.all([
        api.get<any>('/api/receiving-records'),
        api.get<any>('/api/purchase-orders'),
      ]);
      if (recRes.success) { setRecords(recRes.data || []); setKpis(recRes.kpis || {}); }
      if (poRes.success) setPurchaseOrders(poRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const conditionColors: Record<string, string> = { good: 'bg-emerald-50 text-emerald-700 border-emerald-200', damaged: 'bg-amber-50 text-amber-700 border-amber-200', defective: 'bg-red-50 text-red-700 border-red-200' };

  const filtered = records.filter((r: any) => {
    const matchSearch = r.po?.poNumber?.toLowerCase().includes(search.toLowerCase()) || r.item?.name?.toLowerCase().includes(search.toLowerCase()) || r.item?.itemCode?.toLowerCase().includes(search.toLowerCase());
    const matchCondition = filterCondition === 'all' || r.condition === filterCondition;
    return matchSearch && matchCondition;
  });

  const kpiCards = [
    { label: 'Total GRNs', value: kpis.total || 0, icon: Download, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Good', value: kpis.good || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Damaged', value: kpis.pending || 0, icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Defective', value: kpis.rejected || 0, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const handleCreate = async () => {
    if (!form.purchaseOrder || !form.itemId || !form.quantity) { toast.error('PO, item, and quantity are required'); return; }
    setCreating(true);
    try {
      const res = await api.post(`/api/purchase-orders/${form.purchaseOrder}/receive`, {
        itemId: form.itemId,
        quantityReceived: parseFloat(form.quantity),
        condition: form.condition,
        notes: form.notes || null,
      });
      if (res.success) { toast.success('Items received successfully'); setCreateOpen(false); setForm({ purchaseOrder: '', itemId: '', quantity: '', condition: 'good', notes: '' }); fetchRecords(); }
      else toast.error(res.error || 'Failed to receive items');
    } catch { toast.error('Failed to receive items'); } finally { setCreating(false); }
  };

  // Get available PO items (approved/partially_received) for the create form
  const availablePOItems = purchaseOrders.filter((po: any) => ['approved', 'partially_received'].includes(po.status)).flatMap((po: any) =>
    (po.items || []).map((pi: any) => ({
      ...pi,
      poId: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier?.name || '',
      remaining: (pi.quantity || 0) - (pi.quantityReceived || 0),
    }))
  ).filter((pi: any) => pi.remaining > 0);

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Receiving</h1><p className="text-muted-foreground mt-1">Receive delivered items and update inventory stock levels</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New GRN</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterCondition} onValueChange={setFilterCondition}><SelectTrigger className="w-44"><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="all">All Conditions</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="damaged">Damaged</SelectItem><SelectItem value="defective">Defective</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>PO #</TableHead><TableHead className="hidden sm:table-cell">Supplier</TableHead><TableHead>Item</TableHead><TableHead className="hidden sm:table-cell">Qty</TableHead><TableHead>Condition</TableHead><TableHead className="hidden md:table-cell">Received By</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Download} title="No receiving records found" description="Records will appear once items are received against purchase orders." /></TableCell></TableRow>
            ) : filtered.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell><Badge variant="outline" className="font-mono text-xs">{r.po?.poNumber || '-'}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell font-medium">{r.po?.supplier?.name || '-'}</TableCell>
                <TableCell className="font-medium">{r.item?.name || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell font-medium">{r.quantityReceived}</TableCell>
                <TableCell><Badge variant="outline" className={conditionColors[r.condition]}>{r.condition?.toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.receivedBy?.fullName || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Goods Receipt Note</DialogTitle><DialogDescription>Record received items against a purchase order.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>PO Item *</Label><Select value={form.purchaseOrder ? `${form.purchaseOrder}-${form.itemId}` : ''} onValueChange={v => { const [poId, itemId] = v.split('-'); setForm({ ...form, purchaseOrder: poId, itemId }); }}><SelectTrigger><SelectValue placeholder="Select PO item" /></SelectTrigger><SelectContent>
              {purchaseOrders.filter((po: any) => ['approved', 'partially_received'].includes(po.status)).map((po: any) => (
                <SelectItem key={po.id} value={`${po.id}`} className="font-mono text-xs">{po.poNumber} — {po.supplier?.name}</SelectItem>
              ))}
            </SelectContent></Select></div>
            {form.purchaseOrder && form.itemId && <div className="text-xs text-muted-foreground bg-muted rounded-md p-2">Item: {availablePOItems.find((pi: any) => pi.id === form.itemId && pi.poId === form.purchaseOrder)?.item?.name || 'Select an item'} — Remaining: {availablePOItems.find((pi: any) => pi.id === form.itemId && pi.poId === form.purchaseOrder)?.remaining || 0}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Condition</Label><Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="good">Good</SelectItem><SelectItem value="damaged">Damaged</SelectItem><SelectItem value="defective">Defective</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Any observations, discrepancies, or special instructions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Receiving...' : 'Receive Items'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// IoT SUBPAGES
// ============================================================================

