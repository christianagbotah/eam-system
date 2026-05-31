'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  EmptyState,
  formatDate,
  timeAgo,
} from '@/components/shared/helpers';
import {
  History,
  Search,
  RefreshCw,
  ArrowLeft,
  BrainCircuit,
  Building2,
  Tag,
  Factory,
  AlertTriangle,
  Wrench,
  ClipboardList,
  CalendarClock,
  Package,
  CheckCircle2,
  Loader2,
  Eye,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AiHistoryItem {
  id: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  manufacturer?: string | null;
  plant?: string | null;
  criticality?: string | null;
  summary: {
    components?: number;
    pmTemplates?: number;
    spareParts?: number;
    subsystems?: number;
    bomEntries?: number;
    inventoryItems?: number;
    pmSchedules?: number;
  };
  createdAt: string;
  status: string;
}

// ============================================================================
// CRITICALITY BADGE
// ============================================================================

function CriticalityBadge({ criticality }: { criticality?: string | null }) {
  if (!criticality) return <span className="text-muted-foreground text-xs">—</span>;
  const colors: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    high: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    medium: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${colors[criticality] || 'bg-muted text-muted-foreground border-border'}`}>
      {criticality.toUpperCase()}
    </Badge>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    failed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    processing: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800',
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${colors[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </Badge>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function HistoryLoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      {/* Search bar */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-10" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border overflow-hidden">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export function AIHistoryPage() {
  const { navigate } = useNavigationStore();

  // Data states
  const [history, setHistory] = useState<AiHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Fetch history ──
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AiHistoryItem[]>('/api/ai/history');
      if (res.success && res.data) {
        setHistory(Array.isArray(res.data) ? res.data : []);
      } else {
        toast.error(res.error || 'Failed to load AI generation history');
      }
    } catch {
      toast.error('Failed to load AI generation history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  // ── Filtered history ──
  const filteredHistory = useMemo(() => {
    if (!searchText.trim()) return history;
    const q = searchText.toLowerCase();
    return history.filter(
      (item) =>
        item.assetName.toLowerCase().includes(q) ||
        item.assetTag.toLowerCase().includes(q) ||
        (item.manufacturer || '').toLowerCase().includes(q) ||
        (item.plant || '').toLowerCase().includes(q),
    );
  }, [history, searchText]);

  // ── Summary stats ──
  const stats = useMemo(() => {
    const totalGenerated = history.length;
    const totalComponents = history.reduce((sum, h) => sum + (h.summary?.components || 0), 0);
    const totalPmTemplates = history.reduce((sum, h) => sum + (h.summary?.pmTemplates || 0), 0);
    const totalSpareParts = history.reduce((sum, h) => sum + (h.summary?.spareParts || 0), 0);
    return { totalGenerated, totalComponents, totalPmTemplates, totalSpareParts };
  }, [history]);

  // ── Handle refresh ──
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Handle row click ──
  const handleRowClick = (item: AiHistoryItem) => {
    navigate('assets-machines', { id: item.assetId });
  };

  if (loading) return <HistoryLoadingSkeleton />;

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('ai-hub')}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors mt-0.5"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <History className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              AI Generation History
              <Badge variant="outline" className="text-xs font-mono">
                {history.length}
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View all assets generated by AI with their details and generation summaries
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="border-0 shadow-sm py-0">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <BrainCircuit className="h-4 w-4 text-violet-600" />
              <p className="text-2xl font-bold">{stats.totalGenerated}</p>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">Total Generated</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm py-0">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Wrench className="h-4 w-4 text-cyan-600" />
              <p className="text-2xl font-bold">{stats.totalComponents.toLocaleString()}</p>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">Total Components</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm py-0">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              <p className="text-2xl font-bold">{stats.totalPmTemplates.toLocaleString()}</p>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">Total PM Templates</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm py-0">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Package className="h-4 w-4 text-amber-600" />
              <p className="text-2xl font-bold">{stats.totalSpareParts.toLocaleString()}</p>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">Total Spare Parts</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search Bar ── */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by machine name, asset tag, manufacturer..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {searchText.trim() && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-9"
            onClick={() => setSearchText('')}
          >
            Clear
          </Button>
        )}
      </div>

      {/* ── Content ── */}
      {filteredHistory.length === 0 ? (
        <EmptyState
          icon={History}
          title={
            history.length === 0
              ? 'No AI generations yet'
              : 'No results match your search'
          }
          description={
            history.length === 0
              ? 'Generate your first AI asset from the AI Hub to see the generation history here.'
              : 'Try adjusting your search terms to find what you are looking for.'
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Machine Name</TableHead>
                  <TableHead className="text-xs font-semibold">Asset Tag</TableHead>
                  <TableHead className="text-xs font-semibold">Manufacturer</TableHead>
                  <TableHead className="text-xs font-semibold">Plant</TableHead>
                  <TableHead className="text-xs font-semibold">Criticality</TableHead>
                  <TableHead className="text-xs font-semibold">Components</TableHead>
                  <TableHead className="text-xs font-semibold">PM Templates</TableHead>
                  <TableHead className="text-xs font-semibold">Created At</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(item)}
                  >
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-violet-500 shrink-0" />
                        <span className="truncate">{item.assetName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.assetTag}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.manufacturer || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.plant || '—'}
                    </TableCell>
                    <TableCell>
                      <CriticalityBadge criticality={item.criticality} />
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {item.summary?.components || 0}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {item.summary?.pmTemplates || 0}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {formatDate(item.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border bg-card p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => handleRowClick(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-violet-500 shrink-0" />
                      <p className="text-sm font-semibold truncate">{item.assetName}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {item.assetTag}
                      </Badge>
                      {item.manufacturer && (
                        <span className="text-[10px] text-muted-foreground">{item.manufacturer}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center p-1.5 rounded-md bg-muted/50">
                    <p className="text-sm font-bold">{item.summary?.components || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Components</p>
                  </div>
                  <div className="text-center p-1.5 rounded-md bg-muted/50">
                    <p className="text-sm font-bold">{item.summary?.pmTemplates || 0}</p>
                    <p className="text-[9px] text-muted-foreground">PM Templates</p>
                  </div>
                  <div className="text-center p-1.5 rounded-md bg-muted/50">
                    <p className="text-sm font-bold">{item.summary?.spareParts || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Spare Parts</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                  {item.criticality && <CriticalityBadge criticality={item.criticality} />}
                  <div className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {timeAgo(item.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Count footer */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing {filteredHistory.length} of {history.length} generation{history.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}
