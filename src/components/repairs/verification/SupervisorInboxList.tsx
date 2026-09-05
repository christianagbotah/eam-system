'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { differenceInHours } from 'date-fns';
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
  Search, ShieldCheck, AlertTriangle, Timer, RotateCcw, Filter, Inbox,
} from 'lucide-react';
import { EmptyState, LoadingSkeleton, formatDate, PriorityBadge } from '@/components/shared/helpers';

interface SupervisorInboxItem {
  id: string;
  woNumber: string;
  title: string;
  assetName: string;
  assetCode?: string;
  priority: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
  teamName?: string;
  isRework?: boolean;
  reworkCount?: number;
  slaHours?: number;
}

interface SupervisorInboxListProps {
  onSelectWO: (workOrderId: string) => void;
}

function SLARiskBadge({ createdAt, priority, completedAt }: { createdAt: string; priority: string; completedAt?: string | null }) {
  const slaMap: Record<string, number> = { low: 72, medium: 48, high: 24, critical: 8 };
  const sla = slaMap[priority] || 48;
  const refDate = completedAt || new Date().toISOString();
  const hoursRemaining = sla - differenceInHours(new Date(refDate), new Date(createdAt));

  if (hoursRemaining <= 0) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          BREACHED
        </span>
      </TooltipTrigger><TooltipContent>Breached SLA by {Math.abs(hoursRemaining)}h</TooltipContent></Tooltip></TooltipProvider>
    );
  }
  if (hoursRemaining <= 8) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
          <AlertTriangle className="h-3 w-3" /> {hoursRemaining}h left
        </span>
      </TooltipTrigger><TooltipContent>{hoursRemaining}h remaining of {sla}h SLA</TooltipContent></Tooltip></TooltipProvider>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-600">
      <Timer className="h-3 w-3" /> {hoursRemaining}h left
    </span>
  );
}

export function SupervisorInboxList({ onSelectWO }: SupervisorInboxListProps) {
  const abortRef = useAbortRef();
  const [items, setItems] = useState<SupervisorInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get<SupervisorInboxItem[]>('/api/work-orders/supervisor-inbox', {
        signal: abortRef.current.signal,
      });
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
      } else {
        toast.error(res.error || 'Failed to load supervisor inbox');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast.error('Failed to load supervisor inbox');
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
    if (a.isRework && !b.isRework) return -1;
    if (!a.isRework && b.isRework) return 1;
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime();
  });

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Verification Inbox</h2>
            <p className="text-xs text-muted-foreground">{items.length} work order{items.length !== 1 ? 's' : ''} awaiting verification</p>
          </div>
        </div>
        {items.filter(w => w.isRework).length > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            {items.filter(w => w.isRework).length} rework job{items.filter(w => w.isRework).length !== 1 ? 's' : ''}
          </Badge>
        )}
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
          title="No work orders to verify"
          description={search || filterPriority !== 'all' ? 'Try adjusting your filters.' : 'All completed work orders have been verified.'}
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
                  <TableHead className="w-[100px]">SLA</TableHead>
                  <TableHead className="w-[120px]">Completed</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((wo) => (
                  <TableRow
                    key={wo.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${wo.isRework ? 'bg-red-50/40' : ''}`}
                    onClick={() => onSelectWO(wo.id)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        {wo.isRework && <RotateCcw className="h-3 w-3 text-red-500" />}
                        {wo.woNumber}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm">{wo.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{wo.assetName}</TableCell>
                    <TableCell><PriorityBadge priority={wo.priority} /></TableCell>
                    <TableCell><SLARiskBadge createdAt={wo.createdAt} priority={wo.priority} completedAt={wo.completedAt} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(wo.completedAt ?? undefined)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden divide-y">
            {sorted.map((wo) => (
              <button
                key={wo.id}
                className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${wo.isRework ? 'bg-red-50/40' : ''}`}
                onClick={() => onSelectWO(wo.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {wo.isRework && <RotateCcw className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <span className="font-mono text-sm font-medium truncate">{wo.woNumber}</span>
                  </div>
                  <PriorityBadge priority={wo.priority} />
                </div>
                <p className="text-sm mt-1 truncate">{wo.title}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{wo.assetName}</span>
                  <span>·</span>
                  <SLARiskBadge createdAt={wo.createdAt} priority={wo.priority} completedAt={wo.completedAt} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
