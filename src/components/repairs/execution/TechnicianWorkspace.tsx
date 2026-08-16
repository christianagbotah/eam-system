'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, Clock, Users,
  Wrench, Package, Camera, MessageSquare, Handshake, AlertTriangle,
  ChevronDown, ChevronUp, FileText, Timer, ShieldCheck, ClipboardCheck,
  Send, Loader2, Info, Eye, Pencil, X, Upload, Mic, Gauge,
  MapPin, Building2, Cpu, Layers, AlertCircle, CircleDot, BadgeCheck,
  ArrowRight, UserPlus, Factory, StopCircle, Hourglass, HardHat,
  Search, ChevronRight, Tag,
} from 'lucide-react';

import { useWorkOrderExecution, type WODetail, type WOTask, type ReadinessItem } from './hooks/useWorkOrderExecution';
import { useElapsedTime } from './hooks/useElapsedTime';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TechnicianWorkspaceProps {
  workOrderId: string;
  userId: string;
  userRoles: string[];
  onBack?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WO_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  requested: 'bg-sky-50 text-sky-700 border-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  planned: 'bg-violet-50 text-violet-700 border-violet-200',
  assigned: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  on_hold: 'bg-purple-50 text-purple-700 border-purple-200',
  waiting_parts: 'bg-orange-50 text-orange-700 border-orange-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  verified: 'bg-teal-50 text-teal-700 border-teal-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-sky-50 text-sky-700 border-sky-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  emergency: 'bg-red-100 text-red-800 border-red-300',
};

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy HH:mm'); } catch { return d; }
}

function fmtShort(d?: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, HH:mm'); } catch { return d; }
}

function fmtDurationHrs(h: number | null | undefined): string {
  if (h == null || isNaN(h)) return '0h 0m';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

function truncate(str: string | null | undefined, len = 80): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function isExecutionRole(roles: string[]): boolean {
  return roles.some(r =>
    ['maintenance_technician', 'team_leader', 'execution_lead', 'maintenance_supervisor', 'maintenance_manager', 'admin'].includes(r)
  );
}

function isLeadRole(roles: string[]): boolean {
  return roles.some(r =>
    ['team_leader', 'execution_lead', 'maintenance_supervisor', 'maintenance_manager', 'admin'].includes(r)
  );
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

function CollapsibleSection({ title, children, defaultOpen = false, icon: Icon }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; icon?: React.ElementType;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors min-h-[44px]"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-3 pt-1">{children}</div>}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TechnicianWorkspace({
  workOrderId,
  userId,
  userRoles,
  onBack,
}: TechnicianWorkspaceProps) {
  const {
    workOrder: wo,
    tasks,
    timeLogSummary,
    downtimes,
    readiness,
    isLoading,
    isActionLoading,
    error,
    refetch,
    startWork,
    pauseWork,
    resumeWork,
    submitCompletion,
    addComment,
    logTime,
    createDowntime,
    toggleTask,
    fetchReadiness,
  } = useWorkOrderExecution(workOrderId);

  // Elapsed time
  const isRunning = wo?.status === 'in_progress';
  const pausedMs = 0; // Would need to calculate from pause logs in production
  const elapsed = useElapsedTime(wo?.actualStart ?? null, isRunning, pausedMs);

  // Local state
  const [activeTab, setActiveTab] = useState('overview');
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    findings: '', rootCause: '', correctiveAction: '', completionNotes: '',
  });
  const [commentInput, setCommentInput] = useState('');
  const [downtimeForm, setDowntimeForm] = useState({
    reason: '', category: 'unplanned', impactLevel: 'medium', notes: '',
  });
  const [assistanceForm, setAssistanceForm] = useState({
    reason: '', tradeSkill: '',
  });

  // Derived
  const canStart = wo && ['assigned', 'planned'].includes(wo.status) && isExecutionRole(userRoles);
  const canPause = wo && wo.status === 'in_progress' && isExecutionRole(userRoles);
  const canResume = wo && wo.status === 'on_hold' && isExecutionRole(userRoles);
  const canComplete = wo && wo.status === 'in_progress' && isExecutionRole(userRoles);
  const isTeamLeader = isLeadRole(userRoles);

  const completedTaskCount = tasks.filter(t => t.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? (completedTaskCount / tasks.length) * 100 : 0;

  const toolsPendingReturn = wo?.repairToolRequests?.filter(tr => {
    if (tr.status !== 'issued') return false;
    return tr.items?.some(item => (item.pendingReturnQty ?? 0) > 0);
  }).length ?? 0;

  // SLA indicator
  const slaStatus = useMemo(() => {
    if (!wo?.plannedEnd || !wo?.actualStart) return null;
    const now = Date.now();
    const planned = new Date(wo.plannedEnd).getTime();
    const started = new Date(wo.actualStart).getTime();
    const elapsedMs = now - started;
    const totalMs = planned - started;
    if (totalMs <= 0) return 'exceeded';
    const pct = (elapsedMs / totalMs) * 100;
    if (pct >= 100) return 'exceeded';
    if (pct >= 80) return 'warning';
    return 'ok';
  }, [wo?.plannedEnd, wo?.actualStart]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    await startWork({ reason: 'Technician started work', notes: '' });
  }, [startWork]);

  const handlePause = useCallback(async () => {
    if (!pauseReason.trim()) return;
    const ok = await pauseWork(pauseReason);
    if (ok) {
      setPauseDialogOpen(false);
      setPauseReason('');
    }
  }, [pauseWork, pauseReason]);

  const handleResume = useCallback(async () => {
    await resumeWork('Resumed work');
  }, [resumeWork]);

  const handleCompletion = useCallback(async () => {
    const ok = await submitCompletion(completionForm);
    if (ok) {
      setCompletionDialogOpen(false);
      setCompletionForm({ findings: '', rootCause: '', correctiveAction: '', completionNotes: '' });
    }
  }, [submitCompletion, completionForm]);

  const handleAddComment = useCallback(async () => {
    if (!commentInput.trim()) return;
    const ok = await addComment(commentInput);
    if (ok) setCommentInput('');
  }, [commentInput, addComment]);

  const handleCreateDowntime = useCallback(async () => {
    if (!downtimeForm.reason.trim()) return;
    const ok = await createDowntime(downtimeForm);
    if (ok) setDowntimeForm({ reason: '', category: 'unplanned', impactLevel: 'medium', notes: '' });
  }, [downtimeForm, createDowntime]);

  const handleRequestAssistance = useCallback(async () => {
    if (!assistanceForm.reason.trim()) return;
    try {
      const { api } = await import('@/lib/api');
      const res = await api.post(`/api/work-orders/${workOrderId}/team-member-requests`, {
        reason: assistanceForm.reason,
        requestedUserId: null,
        tradeSkill: assistanceForm.tradeSkill,
      });
      if (res.success) {
        toast.success('Assistance request submitted');
        setAssistanceForm({ reason: '', tradeSkill: '' });
        await refetch();
      } else {
        toast.error(res.error || 'Failed to request assistance');
      }
    } catch {
      toast.error('Failed to request assistance');
    }
  }, [assistanceForm, workOrderId, refetch]);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (isLoading && !wo) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error && !wo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Failed to load work order</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
        <Button variant="outline" className="mt-4" onClick={refetch}>
          <RotateCcw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  if (!wo) return null;

  // ─── SLA Badge ─────────────────────────────────────────────────────────────
  const SLA_BADGE: Record<string, { label: string; color: string }> = {
    ok: { label: 'SLA OK', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    warning: { label: 'SLA At Risk', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    exceeded: { label: 'SLA Exceeded', color: 'bg-red-50 text-red-700 border-red-200' },
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ═══════════════════ STICKY HEADER ═══════════════════ */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-4 py-3">
          {/* Top row: back, WO number, badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {onBack && (
                <Button
                  variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0"
                  onClick={onBack}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold truncate sm:text-lg">{wo.woNumber}</h1>
                  <Badge variant="outline" className={WO_STATUS_COLORS[wo.status] || 'bg-gray-100'}>
                    {wo.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={PRIORITY_COLORS[wo.priority] || 'bg-gray-100'}>
                    {wo.priority?.toUpperCase()}
                  </Badge>
                  {slaStatus && SLA_BADGE[slaStatus] && (
                    <Badge variant="outline" className={SLA_BADGE[slaStatus].color}>
                      {slaStatus === 'exceeded' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {SLA_BADGE[slaStatus].label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {wo.title || truncate(wo.description)}
                </p>
              </div>
            </div>
            {/* Elapsed timer (desktop) */}
            {isRunning && (
              <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 flex-shrink-0">
                <Timer className="h-4 w-4 animate-pulse" />
                <span className="font-mono font-semibold text-sm">{elapsed}</span>
              </div>
            )}
          </div>

          {/* Location breadcrumb */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground flex-wrap">
            {wo.plantId && <span className="flex items-center gap-1"><Factory className="h-3 w-3" /> Plant</span>}
            {wo.departmentId && <><ChevronRight className="h-3 w-3" /><Building2 className="h-3 w-3" /> Dept</>}
            {wo.assetName && <><ChevronRight className="h-3 w-3" /><MapPin className="h-3 w-3" />{wo.assetName}</>}
            {wo.workOrderComponents?.[0]?.componentRegistry?.name && (
              <><ChevronRight className="h-3 w-3" /><Cpu className="h-3 w-3" />{wo.workOrderComponents[0].componentRegistry.name}</>
            )}
          </div>

          {/* Team & dates row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
            {wo.teamLeader && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <HardHat className="h-3 w-3" />
                <span className="font-medium">TL:</span> {wo.teamLeader.fullName}
              </span>
            )}
            {wo.teamMembers && wo.teamMembers.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
                onClick={() => setShowTeamMembers(v => !v)}
              >
                <Users className="h-3 w-3" />
                <span className="font-medium">{wo.teamMembers.length}</span> member{wo.teamMembers.length !== 1 ? 's' : ''}
                {showTeamMembers ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {wo.plannedStart && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> Plan: {fmtShort(wo.plannedStart)}
              </span>
            )}
            {wo.actualStart && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CircleDot className="h-3 w-3 text-amber-600" /> Started: {fmtShort(wo.actualStart)}
              </span>
            )}
          </div>

          {/* Team members collapsible */}
          {showTeamMembers && wo.teamMembers && wo.teamMembers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {wo.teamMembers.map(m => (
                <Badge key={m.id} variant="secondary" className="text-xs gap-1">
                  <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    {m.user?.fullName?.[0] || '?'}
                  </span>
                  {m.user?.fullName}
                  {m.role === 'team_leader' && <Tag className="h-2.5 w-2.5" />}
                </Badge>
              ))}
            </div>
          )}

          {/* Mobile elapsed timer */}
          {isRunning && (
            <div className="sm:hidden flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 mt-2 w-fit">
              <Timer className="h-4 w-4 animate-pulse" />
              <span className="font-mono font-semibold text-sm">{elapsed}</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ TABS ═══════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-2 pt-2 border-b bg-background">
          <ScrollArea className="w-full">
            <TabsList className="w-full justify-start inline-flex h-auto p-0.5 bg-transparent gap-0.5 min-w-max">
              <TabTrigger value="overview" icon={FileText} label="Overview" />
              <TabTrigger value="tasks" icon={ClipboardCheck} label={`Tasks${completedTaskCount > 0 ? ` (${completedTaskCount}/${tasks.length})` : ''}`} />
              <TabTrigger value="time" icon={Clock} label="Time" />
              <TabTrigger value="tools" icon={Wrench} label={`Tools${toolsPendingReturn > 0 ? ` (${toolsPendingReturn})` : ''}`} />
              <TabTrigger value="materials" icon={Package} label="Materials" />
              <TabTrigger value="assistance" icon={UserPlus} label="Assist" />
              <TabTrigger value="downtime" icon={AlertTriangle} label="Downtime" />
              <TabTrigger value="evidence" icon={Camera} label="Evidence" />
              <TabTrigger value="handover" icon={Handshake} label="Handover" />
              {isTeamLeader && (
                <TabTrigger value="completion" icon={BadgeCheck} label="Complete" />
              )}
            </TabsList>
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* ─── OVERVIEW TAB ─── */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            <InfoCard title="Problem / Request" icon={AlertCircle}>
              <p className="text-sm whitespace-pre-wrap">{wo.maintenanceRequest?.description || wo.description || 'No description provided'}</p>
              {wo.maintenanceRequest && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>MR: {wo.maintenanceRequest.requestNumber}</span>
                  <span>·</span>
                  <span>Category: {wo.maintenanceRequest.category || 'N/A'}</span>
                  {wo.maintenanceRequest.machineDownStatus && (
                    <Badge variant="outline" className="text-[10px]">
                      Machine {wo.maintenanceRequest.machineDownStatus}
                    </Badge>
                  )}
                </div>
              )}
            </InfoCard>

            <InfoCard title="Asset Information" icon={MapPin}>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Asset:</span> <span className="font-medium">{wo.assetName || 'N/A'}</span></div>
                {wo.maintenanceRequest?.asset && (
                  <>
                    <div><span className="text-muted-foreground">Tag:</span> {wo.maintenanceRequest.asset.assetTag || '—'}</div>
                    <div><span className="text-muted-foreground">Serial:</span> {wo.maintenanceRequest.asset.serialNumber || '—'}</div>
                  </>
                )}
              </div>
              {wo.workOrderComponents && wo.workOrderComponents.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">Components:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {wo.workOrderComponents.map(c => (
                      <Badge key={c.id} variant="secondary" className="text-xs">
                        {c.componentRegistry.componentCode && <span className="mr-1">{c.componentRegistry.componentCode}</span>}
                        {c.componentRegistry.name}
                        {c.componentRegistry.criticality && (
                          <span className="ml-1 text-[10px] opacity-70">({c.componentRegistry.criticality})</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </InfoCard>

            <InfoCard title="Planner Instructions" icon={FileText}>
              <p className="text-sm whitespace-pre-wrap">{wo.technicalDescription || 'No planner instructions'}</p>
            </InfoCard>

            {wo.safetyNotes && (
              <InfoCard title="Safety & PPE" icon={ShieldCheck} warning>
                <p className="text-sm whitespace-pre-wrap">{wo.safetyNotes}</p>
                {wo.ppeRequired && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-amber-700">PPE Required:</span>
                    <p className="text-sm mt-0.5">{wo.ppeRequired}</p>
                  </div>
                )}
              </InfoCard>
            )}

            {wo.notes && (
              <InfoCard title="Work Order Notes" icon={MessageSquare}>
                <p className="text-sm whitespace-pre-wrap">{wo.notes}</p>
              </InfoCard>
            )}

            <InfoCard title="Planned Schedule" icon={Clock}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Planned Start</span>
                  <p className="font-medium">{fmtDate(wo.plannedStart)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Planned End</span>
                  <p className="font-medium">{fmtDate(wo.plannedEnd)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Estimated Hours</span>
                  <p className="font-medium">{wo.estimatedHours != null ? `${wo.estimatedHours}h` : 'N/A'}</p>
                </div>
              </div>
            </InfoCard>
          </TabsContent>

          {/* ─── TASKS TAB ─── */}
          <TabsContent value="tasks" className="mt-0 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Task Checklist</h3>
                <span className="text-xs text-muted-foreground">
                  {completedTaskCount}/{tasks.length} completed
                </span>
              </div>
              <Progress value={taskProgress} className="h-2" />
            </div>

            {tasks.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="No tasks yet" description="Tasks will appear here when added or generated from a PM template." />
            ) : (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      task.status === 'completed' ? 'bg-emerald-50/50 border-emerald-200/50' : 'bg-card'
                    }`}
                  >
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={(checked) => toggleTask(task.id, !!checked)}
                      className="mt-0.5 h-5 w-5"
                      disabled={isActionLoading}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        <span className="font-medium text-muted-foreground mr-1.5">#{task.taskNumber}</span>
                        {task.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{task.taskType}</Badge>
                        {task.estimatedMinutes && <span>{task.estimatedMinutes}min</span>}
                        {task.completedAt && (
                          <span>✓ {fmtShort(task.completedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── TIME TAB ─── */}
          <TabsContent value="time" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Time Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {isRunning && (
                    <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-lg border border-amber-200">
                      <Timer className="h-5 w-5 animate-pulse" />
                      <span className="font-mono font-bold text-lg">{elapsed}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {canStart && (
                    <Button onClick={handleStart} disabled={isActionLoading} size="lg" className="min-h-[44px]">
                      {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      Start
                    </Button>
                  )}
                  {canPause && (
                    <Button variant="outline" onClick={() => setPauseDialogOpen(true)} disabled={isActionLoading} size="lg" className="min-h-[44px]">
                      <Pause className="h-4 w-4 mr-2" /> Pause
                    </Button>
                  )}
                  {canResume && (
                    <Button onClick={handleResume} disabled={isActionLoading} size="lg" className="min-h-[44px]">
                      {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                      Resume
                    </Button>
                  )}
                </div>

                <Separator />

                <div className="text-sm">
                  <span className="text-muted-foreground">Total Logged:</span>{' '}
                  <span className="font-semibold">{fmtDurationHrs(timeLogSummary?.summary?.totalHours ?? wo?.actualHours ?? null)}</span>
                  {timeLogSummary?.summary?.totalBreakMinutes ? (
                    <span className="text-muted-foreground"> (incl. {timeLogSummary.summary.totalBreakMinutes}m break)</span>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Time log history */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Time History</CardTitle>
                <CardDescription className="text-xs">All time entries for this work order</CardDescription>
              </CardHeader>
              <CardContent>
                {!timeLogSummary?.timeLogs?.length ? (
                  <p className="text-sm text-muted-foreground">No time entries yet.</p>
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Action</TableHead>
                          <TableHead className="text-xs">User</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">Activity</TableHead>
                          <TableHead className="text-xs">Duration</TableHead>
                          <TableHead className="text-xs">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeLogSummary.timeLogs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  log.action === 'start' ? 'bg-emerald-50 text-emerald-700' :
                                  log.action === 'pause' ? 'bg-amber-50 text-amber-700' :
                                  log.action === 'resume' ? 'bg-sky-50 text-sky-700' :
                                  'bg-teal-50 text-teal-700'
                                }
                              >
                                {log.action.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{log.user?.fullName || '—'}</TableCell>
                            <TableCell className="text-xs hidden sm:table-cell">{log.activityType || '—'}</TableCell>
                            <TableCell className="text-xs font-mono">
                              {log.duration != null ? fmtDurationHrs(log.duration) : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fmtShort(log.timestamp)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Labor contribution summary */}
                {timeLogSummary?.summary?.byUser && Object.keys(timeLogSummary.summary.byUser).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Labor Contribution</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(timeLogSummary.summary.byUser).map(([uid, info]) => (
                        <div key={uid} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                          <span className="truncate">{info.fullName}</span>
                          <span className="font-mono font-medium ml-2">{fmtDurationHrs(info.hours)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TOOLS TAB ─── */}
          <TabsContent value="tools" className="mt-0 space-y-4">
            {!wo.repairToolRequests?.length ? (
              <EmptyState icon={Wrench} title="No tool requests" description="Tools will appear here when requested by the planner or technician." />
            ) : (
              <div className="space-y-3">
                {wo.repairToolRequests.map(tr => {
                  const statusColor: Record<string, string> = {
                    pending: 'bg-amber-50 text-amber-700 border-amber-200',
                    supervisor_approved: 'bg-sky-50 text-sky-700 border-sky-200',
                    storekeeper_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    issued: 'bg-teal-50 text-teal-700 border-teal-200',
                    rejected: 'bg-red-50 text-red-700 border-red-200',
                    returned: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  return (
                    <Card key={tr.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {tr.tool?.name || tr.toolName || 'Unknown Tool'}
                            </p>
                            {tr.tool?.toolCode && (
                              <p className="text-xs text-muted-foreground">{tr.tool.toolCode}</p>
                            )}
                            {tr.tool?.category && (
                              <p className="text-xs text-muted-foreground">{tr.tool.category}</p>
                            )}
                          </div>
                          <Badge variant="outline" className={statusColor[tr.status] || 'bg-gray-100'}>
                            {tr.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </div>
                        {tr.items && tr.items.length > 0 && (
                          <div className="mt-3 border-t pt-2 space-y-1.5">
                            {tr.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-xs">
                                <span>{item.tool?.name || item.toolName} × {item.quantity}</span>
                                <span className="text-muted-foreground">
                                  {(item.pendingReturnQty ?? 0) > 0
                                    ? <span className="text-amber-600 font-medium">{item.pendingReturnQty} to return</span>
                                    : item.condition || '—'
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {tr.reason && (
                          <p className="mt-2 text-xs text-muted-foreground italic">{tr.reason}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── MATERIALS TAB ─── */}
          <TabsContent value="materials" className="mt-0 space-y-4">
            {!wo.repairMaterialRequests?.length ? (
              <EmptyState icon={Package} title="No material requests" description="Materials will appear here when requested by the planner or technician." />
            ) : (
              <div className="space-y-3">
                {wo.repairMaterialRequests.map(mr => {
                  const matStatusColor: Record<string, string> = {
                    pending: 'bg-amber-50 text-amber-700 border-amber-200',
                    supervisor_approved: 'bg-sky-50 text-sky-700 border-sky-200',
                    storekeeper_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    picking: 'bg-violet-50 text-violet-700 border-violet-200',
                    issued: 'bg-teal-50 text-teal-700 border-teal-200',
                    rejected: 'bg-red-50 text-red-700 border-red-200',
                    partially_returned: 'bg-orange-50 text-orange-700 border-orange-200',
                    returned: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  return (
                    <Card key={mr.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {mr.item?.name || mr.itemName || 'Unknown'}
                            </p>
                            {mr.item?.itemCode && (
                              <p className="text-xs text-muted-foreground">{mr.item?.itemCode}</p>
                            )}
                          </div>
                          <Badge variant="outline" className={matStatusColor[mr.status] || 'bg-gray-100'}>
                            {mr.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                          <div><span className="text-muted-foreground">Requested:</span> {mr.quantityRequested} {mr.unit || ''}</div>
                          <div><span className="text-muted-foreground">Issued:</span> {mr.quantityIssued} {mr.unit || ''}</div>
                          <div><span className="text-muted-foreground">Consumed:</span> {mr.consumedQty ?? '—'}</div>
                          <div><span className="text-muted-foreground">Returned:</span> {mr.quantityReturned || '—'}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── ASSISTANCE TAB ─── */}
          <TabsContent value="assistance" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Request Assistance</CardTitle>
                <CardDescription className="text-xs">Request additional team members or specialized trades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Textarea
                    value={assistanceForm.reason}
                    onChange={e => setAssistanceForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Why do you need assistance?"
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Trade / Skill Needed</Label>
                  <Input
                    value={assistanceForm.tradeSkill}
                    onChange={e => setAssistanceForm(f => ({ ...f, tradeSkill: e.target.value }))}
                    placeholder="e.g. Electrician, Welder, Instrument Tech"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleRequestAssistance} className="w-full min-h-[44px]" disabled={!assistanceForm.reason.trim()}>
                  <Send className="h-4 w-4 mr-2" /> Submit Request
                </Button>
              </CardContent>
            </Card>

            {/* Existing requests */}
            {wo.teamMemberRequests && wo.teamMemberRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Assistance Requests</h3>
                {wo.teamMemberRequests.map(req => (
                  <Card key={req.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{req.reason || 'No reason provided'}</p>
                        <p className="text-xs text-muted-foreground">
                          By: {req.requestedByUser?.fullName || '—'}
                          {req.requestedUser?.fullName && <> · For: {req.requestedUser.fullName}</>}
                        </p>
                      </div>
                      <Badge variant="outline" className={
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        req.status === 'rejected' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }>
                        {req.status.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── DOWNTIME TAB ─── */}
          <TabsContent value="downtime" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Log Equipment Downtime</CardTitle>
                <CardDescription className="text-xs">Record production impact and equipment unavailability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Reason *</Label>
                  <Textarea
                    value={downtimeForm.reason}
                    onChange={e => setDowntimeForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Describe the downtime reason"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={downtimeForm.category} onValueChange={v => setDowntimeForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unplanned">Unplanned</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="breakdown">Breakdown</SelectItem>
                        <SelectItem value="setup">Setup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Impact Level</Label>
                    <Select value={downtimeForm.impactLevel} onValueChange={v => setDowntimeForm(f => ({ ...f, impactLevel: v }))}>
                      <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={downtimeForm.notes}
                    onChange={e => setDowntimeForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleCreateDowntime} className="w-full min-h-[44px]" disabled={!downtimeForm.reason.trim()}>
                  <AlertTriangle className="h-4 w-4 mr-2" /> Record Downtime
                </Button>
              </CardContent>
            </Card>

            {downtimes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Downtime Records</h3>
                {downtimes.map(dt => (
                  <Card key={dt.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{dt.reason}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{fmtShort(dt.downtimeStart)}</span>
                            {dt.downtimeEnd && <span>→ {fmtShort(dt.downtimeEnd)}</span>}
                            <span className="font-mono">{Math.round(dt.durationMinutes)}m</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={`text-[10px] ${
                            dt.impactLevel === 'critical' || dt.impactLevel === 'high'
                              ? 'bg-red-50 text-red-700'
                              : dt.impactLevel === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100'
                          }`}>
                            {dt.impactLevel?.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{dt.category}</span>
                        </div>
                      </div>
                      {dt.productionLoss != null && dt.productionLoss > 0 && (
                        <p className="text-xs text-red-600 mt-1">Production loss: {dt.productionLoss}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── EVIDENCE TAB ─── */}
          <TabsContent value="evidence" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Photo Evidence</CardTitle>
                <CardDescription className="text-xs">Upload photos, attachments, and readings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer min-h-[120px] flex flex-col items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Tap to upload photos</p>
                  <p className="text-xs text-muted-foreground mt-1">Camera or file picker</p>
                </div>
              </CardContent>
            </Card>

            {/* Voice Note Metadata placeholder */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mic className="h-4 w-4" /> Voice Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Voice note recording will be available in a future update.</p>
              </CardContent>
            </Card>

            {/* Readings placeholder */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4" /> Readings / Measurements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Equipment readings and measurements can be recorded here.</p>
              </CardContent>
            </Card>

            {/* Comments / Thread */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Comments ({wo.comments?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="Add a comment…"
                    className="min-h-[44px]"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  />
                  <Button onClick={handleAddComment} size="icon" className="flex-shrink-0 h-11 w-11" disabled={!commentInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {wo.comments?.length ? wo.comments.map(c => (
                      <div key={c.id} className="flex gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.user?.fullName?.[0] || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{c.user?.fullName || 'Unknown'}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── HANDOVER TAB ─── */}
          <TabsContent value="handover" className="mt-0 space-y-4">
            <InfoCard title="Current Progress" icon={ClipboardCheck}>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Tasks</span>
                  <span className="font-medium">{completedTaskCount}/{tasks.length}</span>
                </div>
                <Progress value={taskProgress} className="h-2" />
              </div>
            </InfoCard>

            <InfoCard title="Pending Work" icon={AlertCircle} warning>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {tasks.filter(t => t.status !== 'completed').length > 0 ? (
                  tasks.filter(t => t.status !== 'completed').map(t => (
                    <li key={t.id} className="text-amber-700">#{t.taskNumber} {t.description}</li>
                  ))
                ) : (
                  <li className="text-muted-foreground">All tasks completed</li>
                )}
              </ul>
            </InfoCard>

            <InfoCard title="Resources in Custody" icon={Wrench}>
              {toolsPendingReturn > 0 ? (
                <p className="text-sm text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  {toolsPendingReturn} tool request(s) have items pending return
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No tools pending return</p>
              )}
              {wo.repairMaterialRequests?.some(mr =>
                (mr.status === 'issued' || mr.status === 'picking') &&
                ((mr.consumedQty ?? 0) + (mr.wastedQty ?? 0)) < mr.quantityIssued
              ) && (
                <p className="text-sm text-amber-700 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  Some issued materials have not been fully consumed/wasted
                </p>
              )}
            </InfoCard>

            <InfoCard title="Safety & Permit State" icon={ShieldCheck}>
              {wo.safetyNotes ? (
                <p className="text-sm">{wo.safetyNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No special safety requirements noted</p>
              )}
            </InfoCard>

            <InfoCard title="Handover Acknowledgement" icon={CheckCircle2}>
              <p className="text-sm text-muted-foreground">
                The receiving technician should review all sections above before accepting the handover.
                Ensure all tools are returned, materials are reconciled, and safety permits are transferred.
              </p>
            </InfoCard>
          </TabsContent>

          {/* ─── COMPLETION TAB (Team Leader Only) ─── */}
          {isTeamLeader && (
            <TabsContent value="completion" className="mt-0 space-y-4">
              {/* Readiness blockers */}
              {readiness && !readiness.ready && readiness.blockers.length > 0 && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" /> Completion Blocked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {readiness.blockers.map((b: ReadinessItem, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                          <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>{b.message}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {readiness?.warnings && readiness.warnings.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                      <Info className="h-4 w-4" /> Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {readiness.warnings.map((w: ReadinessItem, i: number) => (
                        <li key={i} className="text-sm text-amber-700">• {w.message}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Submit Completion</CardTitle>
                  <CardDescription className="text-xs">Provide details about the work performed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Failure Description</Label>
                    <Textarea
                      value={completionForm.findings}
                      onChange={e => setCompletionForm(f => ({ ...f, findings: e.target.value }))}
                      placeholder="What was found?"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Root Cause</Label>
                    <Textarea
                      value={completionForm.rootCause}
                      onChange={e => setCompletionForm(f => ({ ...f, rootCause: e.target.value }))}
                      placeholder="What caused the failure?"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Corrective Action / Remedy</Label>
                    <Textarea
                      value={completionForm.correctiveAction}
                      onChange={e => setCompletionForm(f => ({ ...f, correctiveAction: e.target.value }))}
                      placeholder="What was done to fix it?"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Completion Notes</Label>
                    <Textarea
                      value={completionForm.completionNotes}
                      onChange={e => setCompletionForm(f => ({ ...f, completionNotes: e.target.value }))}
                      placeholder="Any additional notes for the supervisor"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => setCompletionDialogOpen(true)}
                    className="w-full min-h-[44px]"
                    disabled={isActionLoading}
                    size="lg"
                  >
                    {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />}
                    Submit for Supervisor Review
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* ═══════════════════ STICKY BOTTOM ACTION BAR ═══════════════════ */}
      <div className="sticky bottom-0 z-10 bg-background border-t px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-2">
          {canStart && (
            <Button onClick={handleStart} disabled={isActionLoading} size="lg" className="flex-1 min-h-[48px] text-base">
              {isActionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
              Start Work
            </Button>
          )}
          {canPause && (
            <Button variant="outline" onClick={() => setPauseDialogOpen(true)} disabled={isActionLoading} size="lg" className="flex-1 min-h-[48px]">
              <Pause className="h-5 w-5 mr-2" /> Pause
            </Button>
          )}
          {canResume && (
            <Button onClick={handleResume} disabled={isActionLoading} size="lg" className="flex-1 min-h-[48px]">
              {isActionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <RotateCcw className="h-5 w-5 mr-2" />}
              Resume Work
            </Button>
          )}
          {canComplete && isTeamLeader && (
            <Button
              variant="default"
              onClick={() => { fetchReadiness(); setActiveTab('completion'); }}
              disabled={isActionLoading}
              size="lg"
              className="flex-1 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-base"
            >
              <BadgeCheck className="h-5 w-5 mr-2" /> Complete
            </Button>
          )}
          {canComplete && !isTeamLeader && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1 min-h-[48px]"
              disabled
            >
              <Info className="h-4 w-4 mr-2" /> Only team leader can complete
            </Button>
          )}
          {(wo.status === 'completed' || wo.status === 'verified' || wo.status === 'closed') && (
            <div className="flex-1 text-center text-sm text-muted-foreground py-2">
              <CheckCircle2 className="h-5 w-5 inline mr-1.5 text-emerald-500" />
              {wo.status.replace(/_/g, ' ').toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Pause Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pause Work</DialogTitle>
            <DialogDescription>Provide a reason for pausing this work order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={pauseReason}
                onChange={e => setPauseReason(e.target.value)}
                placeholder="Why are you pausing?"
                rows={3}
                className="mt-1"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePause} disabled={!pauseReason.trim() || isActionLoading}>
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Confirmation Dialog */}
      <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Completion Submission</DialogTitle>
            <DialogDescription>
              This will submit the completion report for supervisor review. The work order status will change to &quot;Completed&quot;.
            </DialogDescription>
          </DialogHeader>
          {readiness && !readiness.ready && readiness.blockers.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-700 mb-1">Cannot complete — blockers:</p>
              <ul className="space-y-0.5">
                {readiness.blockers.map((b: ReadinessItem, i: number) => (
                  <li key={i} className="text-xs text-red-700">• {b.message}</li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCompletion}
              disabled={isActionLoading || (readiness && !readiness.ready)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />}
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function TabTrigger({ value, icon: Icon, label }: { value: string; icon: React.ElementType; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="flex items-center gap-1.5 px-3 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md min-h-[36px] whitespace-nowrap"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </TabsTrigger>
  );
}

function InfoCard({ title, icon: Icon, warning, children }: {
  title: string; icon: React.ElementType; warning?: boolean; children: React.ReactNode;
}) {
  return (
    <Card className={warning ? 'border-amber-200 bg-amber-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm flex items-center gap-2 ${warning ? 'text-amber-700' : ''}`}>
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">{description}</p>
    </div>
  );
}
