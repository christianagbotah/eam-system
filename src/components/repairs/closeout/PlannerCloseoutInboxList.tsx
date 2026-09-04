'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api, useAbortRef } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Filter, Inbox, FileCheck, DollarSign,
} from 'lucide-react';
import { EmptyState, LoadingSkeleton, formatDate, formatCurrency, PriorityBadge } from '@/components/shared/helpers';

interface PlannerInboxItem {
  id: string;
  woNumber: string;
  title: string;
  assetName: string;
  assetCode?: string;
  priority: string;
  status: string;
  verifiedAt: string | null;
  verifiedBy?: string;
  totalCost: number;
  estimatedCost: number;
  laborCost: number;
  partsCost: number;
  contractorCost: number;
}

interface PlannerCloseoutInboxListProps {
  onSelectWO: (workOrderId: string) => void;
}

export function PlannerCloseoutInboxList({ onSelectWO }: PlannerCloseoutInboxListProps) {
  const abortRef = useAbortRef();
  const [items, setItems] = useState<PlannerInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get<PlannerInboxItem[]>('/api/work-orders/planner-inbox', {
        signal: abortRef.current.signal,
      });
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
      } else {
        toast.error(res.error || 'Failed to load planner inbox');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast.error('Failed to load planner inbox');
    } finally {
      setLoading(false);
    }
  }, [abortRef]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter((wo) => {
    if (filterPriority !== 'all' && wo.priority !== filterPriority) return false;
    if (search) {
      const s = search.toLowerCase();
      return wo.woNumber?.toLowerCase().includes(s)
        || wo.title?.toLowerCase().includes(s)
        || wo.assetName?.toLowerCase().includes(s);
    }
    return true;
  });

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...filtered].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(a.verifiedAt || 0).getTime() - new Date(b.verifiedAt || 0).getTime();
  });

  const totalCostSum = items.reduce((s, i) => s + (i.totalCost || 0), 0);
  const totalEstimate = items.reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const variance = totalEstimate - totalCostSum;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <FileCheck className="h-4 w-4 text-teal-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Closeout Inbox</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} work order{items.length !== 1 ? 's' : ''} ready for closure
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              <DollarSign className="h-3 w-3 mr-1" />
              Total: {formatCurrency(totalCostSum)}
            </Badge>
          </TooltipTrigger><TooltipContent>
            <div className="text-xs space-y-1">
              <p>Estimated: {formatCurrency(totalEstimate)}</p>
              <p className={variance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                Variance: {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
              </p>
            </div>
          </TooltipContent></Tooltip></TooltipProvider>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by WO#, title, or asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No work orders to close"
          description={search || filterPriority !== 'all' ? 'Try adjusting your filters.' : 'All verified work orders have been closed.'}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">WO Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[130px]">Cost</TableHead>
                  <TableHead className="w-[120px]">Verified</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((wo) => {
                  const costVariance = (wo.estimatedCost || 0) - (wo.totalCost || 0);
                  return (
                    <TableRow
                      key={wo.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onSelectWO(wo.id)}
                    >
                      <TableCell className="font-mono text-sm font-medium">{wo.woNumber}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm">{wo.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{wo.assetName}</TableCell>
                      <TableCell><PriorityBadge priority={wo.priority} /></TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{formatCurrency(wo.totalCost)}</div>
                        {wo.estimatedCost > 0 && (
                          <p className={`text-[11px] ${costVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {costVariance >= 0 ? 'Under' : 'Over'} by {formatCurrency(Math.abs(costVariance))}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(wo.verifiedAt ?? undefined)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <FileCheck className="h-4 w-4 text-teal-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden divide-y">
            {sorted.map((wo) => {
              const costVariance = (wo.estimatedCost || 0) - (wo.totalCost || 0);
              return (
                <button
                  key={wo.id}
                  className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                  onClick={() => onSelectWO(wo.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-sm font-medium truncate">{wo.woNumber}</span>
                    <PriorityBadge priority={wo.priority} />
                  </div>
                  <p className="text-sm mt-1 truncate">{wo.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{wo.assetName}</span>
                    <span>·</span>
                    <span className={costVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatCurrency(wo.totalCost)}
                      {wo.estimatedCost > 0 && (
                        <span className="ml-1">
                          ({costVariance >= 0 ? '−' : '+'}{formatCurrency(Math.abs(costVariance))})
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
