'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import { AsyncSearchableSelect } from '@/components/ui/searchable-select';
import { EmptyState, LoadingSkeleton, formatDate } from '@/components/shared/helpers';
import {
  FolderOpen, Plus, Pencil, Eye, Search, Trash2, MoreHorizontal,
  RefreshCw, ChevronRight, Power, PowerOff,
} from 'lucide-react';

// ============================================================================
// ASSET CATEGORIES PAGE
// ============================================================================

interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; name: string; code?: string } | null;
  children?: AssetCategory[];
  _count?: { children?: number; assets?: number };
}

const emptyForm = { name: '', code: '', description: '', parentId: '', isActive: true };

export default function AssetCategoriesPage() {
  const { hasPermission, isAdmin } = useAuthStore();
  const canManage = hasPermission('assets.update') || isAdmin();

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Data fetching ──
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/asset-categories');
      if (res.success && res.data) {
        const data = Array.isArray(res.data) ? res.data : (res.data.categories || []);
        setCategories(data);
      }
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Tree helpers ──
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getChildren = (parentId: string | null) =>
    categories.filter(c => (parentId ? c.parentId === parentId : !c.parentId));

  // ── Filtering ──
  const filteredRoots = useMemo(() => {
    const roots = getChildren(null);
    if (!searchText.trim()) return roots;
    const q = searchText.toLowerCase();
    const matchIds = new Set<string>();
    categories.forEach(c => {
      if (c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)) {
        matchIds.add(c.id);
        // Also include all ancestors so the tree shows the path
        let current = c;
        while (current.parentId) {
          matchIds.add(current.parentId);
          current = categories.find(cat => cat.id === current.parentId)!;
        }
      }
    });
    return roots.filter(r => matchIds.has(r.id));
  }, [categories, searchText]);

  const totalCategories = categories.length;
  const totalAssets = categories.reduce((sum, c) => sum + (c._count?.assets ?? 0), 0);
  const activeCount = categories.filter(c => c.isActive).length;

  // ── Dialog handlers ──
  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (cat: AssetCategory) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      code: cat.code || '',
      description: cat.description || '',
      parentId: cat.parentId || '',
      isActive: cat.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.code.trim()) { toast.error('Code is required'); return; }
    setSaving(true);

    const payload: any = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      parentId: form.parentId || null,
      isActive: form.isActive,
    };

    const res = editId
      ? await api.put(`/api/asset-categories/${editId}`, payload)
      : await api.post('/api/asset-categories', payload);

    if (res.success) {
      toast.success(editId ? 'Category updated' : 'Category created');
      setDialogOpen(false);
      fetchCategories();
    } else {
      toast.error(res.error || 'Failed to save category');
    }
    setSaving(false);
  };

  const handleToggleActive = async (cat: AssetCategory) => {
    const newStatus = !cat.isActive;
    const res = await api.put(`/api/asset-categories/${cat.id}`, { isActive: newStatus });
    if (res.success) {
      toast.success(`Category ${newStatus ? 'activated' : 'deactivated'}`);
      fetchCategories();
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  const handleDelete = async (cat: AssetCategory) => {
    if ((cat._count?.children ?? 0) > 0) {
      toast.error('Cannot delete category with sub-categories');
      return;
    }
    if (!confirm(`Delete "${cat.name}"? This will deactivate it.`)) return;
    const res = await api.delete(`/api/asset-categories/${cat.id}`);
    if (res.success) {
      toast.success('Category deleted');
      fetchCategories();
    } else {
      toast.error(res.error || 'Failed to delete category');
    }
  };

  // ── Tree renderer ──
  const renderTreeRows = (parentId: string | null, depth: number = 0): React.ReactNode[] => {
    const children = getChildren(parentId);
    if (!searchText.trim()) {
      // No filtering — show all
    } else {
      // Already handled at root level; show all children of matched nodes
    }
    const rows: React.ReactNode[] = [];
    children.forEach(cat => {
      const hasChildren = categories.some(c => c.parentId === cat.id);
      const isExpanded = expandedIds.has(cat.id);
      const indent = depth * 24 + 12;

      rows.push(
        <TableRow key={cat.id} className="hover:bg-muted/30">
          {/* Name with tree indentation */}
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <button onClick={() => toggleExpand(cat.id)} className="p-0.5 rounded hover:bg-muted shrink-0">
                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <div className="w-4.5 shrink-0" />
              )}
              <FolderOpen className={`h-4 w-4 shrink-0 ${cat.isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span className={`font-medium text-sm truncate ${!cat.isActive ? 'text-muted-foreground line-through' : ''}`}>{cat.name}</span>
            </div>
          </TableCell>
          {/* Code */}
          <TableCell className="font-mono text-xs">{cat.code || '-'}</TableCell>
          {/* Description (truncated) */}
          <TableCell className="hidden md:table-cell">
            <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
              {cat.description || '-'}
            </span>
          </TableCell>
          {/* Parent */}
          <TableCell className="hidden lg:table-cell">
            {cat.parent ? (
              <Badge variant="outline" className="text-[10px]">{cat.parent.name}</Badge>
            ) : '-'}
          </TableCell>
          {/* Status */}
          <TableCell>
            <Badge
              variant="outline"
              className={`text-[10px] font-medium ${
                cat.isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700'
              }`}
            >
              {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </TableCell>
          {/* Assets count */}
          <TableCell className="hidden sm:table-cell text-right">
            <Badge variant="secondary" className="text-[10px] tabular-nums">
              {cat._count?.assets ?? 0}
            </Badge>
          </TableCell>
          {/* Created date */}
          <TableCell className="hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(cat.createdAt)}
          </TableCell>
          {/* Actions */}
          <TableCell>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(cat)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleActive(cat)}>
                    {cat.isActive ? (
                      <><PowerOff className="h-3.5 w-3.5 mr-2" />Deactivate</>
                    ) : (
                      <><Power className="h-3.5 w-3.5 mr-2" />Activate</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => handleDelete(cat)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TableCell>
        </TableRow>
      );

      // Recurse into children if expanded
      if (hasChildren && isExpanded) {
        rows.push(...renderTreeRows(cat.id, depth + 1));
      }
    });

    return rows;
  };

  // ── Loading ──
  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Asset Categories</h1>
            <Badge variant="secondary" className="text-xs tabular-nums">{totalCategories}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} active &middot; {totalAssets} total assets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          {canManage && (
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" />Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden dark:bg-card mt-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="hidden lg:table-cell">Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Assets</TableHead>
                <TableHead className="hidden xl:table-cell">Created</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48">
                    <EmptyState
                      icon={FolderOpen}
                      title="No categories found"
                      description={searchText ? 'Try adjusting your search.' : 'Create your first asset category to start organizing assets.'}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                renderTreeRows(null)
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="space-y-1.5 mb-4">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {editId ? 'Edit Category' : 'Create Category'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {editId ? 'Update asset category details.' : 'Add a new asset category to the hierarchy.'}
          </p>
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Rotating Equipment"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g., ROT-EQ"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Category description..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Parent Category</Label>
            <AsyncSearchableSelect
              value={form.parentId}
              onValueChange={v => setForm(f => ({ ...f, parentId: v }))}
              fetchOptions={async () => {
                const res = await api.get('/api/asset-categories');
                if (res.success && res.data) {
                  const cats = Array.isArray(res.data) ? res.data : (res.data.categories || []);
                  return cats
                    .filter((c: any) => c.id !== editId)
                    .map((c: any) => ({
                      value: c.id,
                      label: c.name + (c.code ? ` (${c.code})` : ''),
                    }));
                }
                return [];
              }}
              deps={[editId]}
              placeholder="None (root category)"
              searchPlaceholder="Search categories..."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Active Status</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.isActive ? 'Category is active and available for assets' : 'Category is deactivated and hidden from selectors'}
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}
            {editId ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
