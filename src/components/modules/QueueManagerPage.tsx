'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { EmptyState, LoadingSkeleton } from '@/components/shared/helpers';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveDialog,
} from '@/components/shared/ResponsiveDialog';
import {
  Layers, Database, RefreshCw, Trash2, Play, RotateCcw,
  AlertCircle, CheckCircle2, Clock, Loader2, Zap, ArrowUpDown,
  Bell, Activity, FileBarChart, Building2, Mail, Calendar,
  TrendingUp, GitBranch, ScrollText,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface QueueStatus {
  name: string;
  label: string;
  total: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface QueueSummary {
  total: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface JobRecord {
  id: string;
  name: string;
  status: string;
  progress: number;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
}

interface QueueJobsData {
  queue: string;
  label: string;
  status: QueueStatus;
  jobs: JobRecord[];
}

interface RedisInfo {
  type: string;
  available: boolean;
  healthy: boolean;
  url: string;
  capabilities: string[];
  timestamp: string;
}

// ============================================================================
// Queue icon mapping
// ============================================================================

const queueIconMap: Record<string, React.ElementType> = {
  notifications: Bell,
  'telemetry-processing': Activity,
  'report-generation': FileBarChart,
  'asset-indexing': Building2,
  email: Mail,
  'maintenance-scheduling': Calendar,
  'predictive-analysis': TrendingUp,
  'cache-warming': Zap,
  'audit-logging': ScrollText,
  'workflow-orchestration': GitBranch,
};

const queueColorMap: Record<string, string> = {
  notifications: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40',
  'telemetry-processing': 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40',
  'report-generation': 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40',
  'asset-indexing': 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40',
  email: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950/40',
  'maintenance-scheduling': 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40',
  'predictive-analysis': 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/40',
  'cache-warming': 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/40',
  'audit-logging': 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-950/40',
  'workflow-orchestration': 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-950/40',
};

// ============================================================================
// Status helpers
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Completed</Badge>;
    case 'active':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[10px]"><Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />Active</Badge>;
    case 'waiting':
      return <Badge variant="secondary" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Waiting</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-1" />Failed</Badge>;
    case 'delayed':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Delayed</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function formatTime(iso?: string) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function QueueManagerPage() {
  const { isAdmin } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [queues, setQueues] = useState<QueueStatus[]>([]);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [redisInfo, setRedisInfo] = useState<RedisInfo | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [queueJobs, setQueueJobs] = useState<QueueJobsData | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  // Fetch data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [queueRes, redisRes] = await Promise.all([
      api.get<{ queues: QueueStatus[]; summary: QueueSummary }>('/api/queues'),
      api.get<RedisInfo>('/api/infra/redis'),
    ]);
    if (queueRes.success && queueRes.data) {
      setQueues(queueRes.data.queues || []);
      setSummary(queueRes.data.summary || null);
    }
    if (redisRes.success && redisRes.data) {
      setRedisInfo(redisRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Fetch jobs for a specific queue
  const fetchQueueJobs = useCallback(async (queueName: string) => {
    setLoadingJobs(true);
    setSelectedQueue(queueName);
    const res = await api.get<QueueJobsData>(`/api/queues?queue=${queueName}`);
    if (res.success && res.data) {
      setQueueJobs(res.data);
    }
    setLoadingJobs(false);
  }, []);

  // Actions
  const handleTestJob = async (queueName: string) => {
    const res = await api.post('/api/queues', { action: 'test', queueName });
    if (res.success) {
      toast.success(`Test job dispatched to ${queueName}`);
      fetchAll();
      if (selectedQueue === queueName) fetchQueueJobs(queueName);
    } else {
      toast.error(res.error || 'Failed to dispatch test job');
    }
  };

  const handleClearQueue = async (queueName: string) => {
    const res = await api.delete(`/api/queues?name=${queueName}`);
    if (res.success) {
      toast.success(`Queue ${queueName} cleared`);
      setConfirmClear(null);
      fetchAll();
      if (selectedQueue === queueName) fetchQueueJobs(queueName);
    } else {
      toast.error(res.error || 'Failed to clear queue');
    }
  };

  const handleRetryJob = async (queueName: string, jobId: string) => {
    const res = await api.post('/api/queues', { action: 'retry', queueName, jobId });
    if (res.success) {
      toast.success('Job queued for retry');
      if (selectedQueue === queueName) fetchQueueJobs(queueName);
      fetchAll();
    } else {
      toast.error(res.error || 'Failed to retry job');
    }
  };

  const handleRemoveJob = async (queueName: string, jobId: string) => {
    const res = await api.post('/api/queues', { action: 'remove', queueName, jobId });
    if (res.success) {
      toast.success('Job removed');
      if (selectedQueue === queueName) fetchQueueJobs(queueName);
      fetchAll();
    } else {
      toast.error(res.error || 'Failed to remove job');
    }
  };

  // Guard
  if (!isAdmin()) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-center min-h-[400px]">
          <EmptyState icon={Layers} title="Access Denied" description="Queue Manager is available to administrators only." />
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  const selectedQueueData = queues.find(q => q.name === selectedQueue);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Queue Manager</h1>
            <Badge variant="outline" className="text-[10px] font-mono">
              {summary ? `${summary.total} jobs` : '-'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Job queue monitoring and Redis cache status &middot; Auto-refreshes every 15s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="queues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queues" className="text-sm">
            <Layers className="h-4 w-4 mr-1.5" />Job Queues
          </TabsTrigger>
          <TabsTrigger value="redis" className="text-sm">
            <Database className="h-4 w-4 mr-1.5" />Redis / Cache
          </TabsTrigger>
        </TabsList>

        {/* =============== QUEUES TAB =============== */}
        <TabsContent value="queues" className="space-y-4">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total', value: summary.total, color: 'text-foreground' },
                { label: 'Waiting', value: summary.waiting, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Active', value: summary.active, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Completed', value: summary.completed, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Failed', value: summary.failed, color: 'text-red-600 dark:text-red-400' },
                { label: 'Delayed', value: summary.delayed, color: 'text-orange-600 dark:text-orange-400' },
              ].map(s => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
                    <p className={`text-2xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Queue List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Queue Cards */}
            <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
              {queues.map(queue => {
                const Icon = queueIconMap[queue.name] || Layers;
                const colorClasses = queueColorMap[queue.name] || 'text-muted-foreground bg-muted';
                const isSelected = selectedQueue === queue.name;
                return (
                  <Card
                    key={queue.name}
                    className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary/50 shadow-md' : ''
                    }`}
                    onClick={() => fetchQueueJobs(queue.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${colorClasses}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{queue.label}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{queue.name}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {queue.failed > 0 && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[9px] px-1.5">
                              {queue.failed} failed
                            </Badge>
                          )}
                          {queue.active > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[9px] px-1.5">
                              {queue.active} active
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Mini progress bar showing completion ratio */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{queue.total} jobs</span>
                          <span>{queue.total > 0 ? Math.round((queue.completed / queue.total) * 100) : 0}% done</span>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                          {queue.failed > 0 && (
                            <div className="bg-red-400" style={{ width: `${(queue.failed / Math.max(queue.total, 1)) * 100}%` }} />
                          )}
                          {queue.active > 0 && (
                            <div className="bg-blue-400" style={{ width: `${(queue.active / Math.max(queue.total, 1)) * 100}%` }} />
                          )}
                          {queue.waiting > 0 && (
                            <div className="bg-amber-400" style={{ width: `${(queue.waiting / Math.max(queue.total, 1)) * 100}%` }} />
                          )}
                          {queue.completed > 0 && (
                            <div className="bg-emerald-400" style={{ width: `${(queue.completed / Math.max(queue.total, 1)) * 100}%` }} />
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] px-2"
                          onClick={(e) => { e.stopPropagation(); handleTestJob(queue.name); }}
                        >
                          <Play className="h-3 w-3 mr-1" />Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={(e) => { e.stopPropagation(); setConfirmClear(queue.name); }}
                          disabled={queue.total === 0}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />Clear
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Job Details Panel */}
            <div className="lg:col-span-2">
              {loadingJobs ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : selectedQueue && queueJobs ? (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${queueColorMap[selectedQueue] || 'text-muted-foreground bg-muted'}`}>
                          {(() => { const Ic = queueIconMap[selectedQueue] || Layers; return <Ic className="h-4 w-4" />; })()}
                        </div>
                        <div>
                          <CardTitle className="text-base">{queueJobs.label}</CardTitle>
                          <p className="text-xs text-muted-foreground">{queueJobs.jobs.length} job(s) in queue</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {queueJobs.jobs.length === 0 ? (
                      <div className="py-12 text-center">
                        <EmptyState
                          icon={CheckCircle2}
                          title="Queue Empty"
                          description="No jobs in this queue. Click 'Test' to dispatch a test job."
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px]">Job ID</TableHead>
                              <TableHead className="text-[10px]">Name</TableHead>
                              <TableHead className="text-[10px]">Status</TableHead>
                              <TableHead className="text-[10px]">Attempts</TableHead>
                              <TableHead className="text-[10px]">Created</TableHead>
                              <TableHead className="text-[10px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queueJobs.jobs.map(job => (
                              <TableRow key={job.id}>
                                <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[100px] truncate">
                                  {job.id.split('-').slice(-2).join('-')}
                                </TableCell>
                                <TableCell className="text-xs font-medium">{job.name}</TableCell>
                                <TableCell><StatusBadge status={job.status} /></TableCell>
                                <TableCell className="text-xs tabular-nums">
                                  {job.attempts}/{job.maxAttempts}
                                </TableCell>
                                <TableCell className="text-[10px] text-muted-foreground tabular-nums">
                                  {formatTime(job.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {(job.status === 'failed') && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleRetryJob(selectedQueue, job.id)}
                                        title="Retry"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      onClick={() => handleRemoveJob(selectedQueue, job.id)}
                                      title="Remove"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-16 text-center">
                    <div className="h-12 w-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                      <Layers className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Select a queue to view jobs</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Click on any queue card to see its job details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* =============== REDIS TAB =============== */}
        <TabsContent value="redis" className="space-y-4">
          {redisInfo && (
            <>
              {/* Redis Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Backend Type</CardTitle>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${redisInfo.type === 'memory' ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-emerald-100 dark:bg-emerald-950/40'}`}>
                        <Database className={`h-4 w-4 ${redisInfo.type === 'memory' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-lg font-bold capitalize">{redisInfo.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {redisInfo.type === 'memory' ? 'In-memory fallback (no REDIS_URL set)' : 'Production Redis connected'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Health</CardTitle>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${redisInfo.healthy ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-red-100 dark:bg-red-950/40'}`}>
                        {redisInfo.healthy
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          : <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        }
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${redisInfo.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-lg font-bold">{redisInfo.healthy ? 'Healthy' : 'Unhealthy'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {redisInfo.available ? 'Client is available' : 'Client is unavailable'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Configuration</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm font-medium font-mono">{redisInfo.url}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Set REDIS_URL env var to enable production mode
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Capabilities</CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-lg font-bold tabular-nums">{redisInfo.capabilities.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Available Redis-like operations
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Capabilities Grid */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Supported Operations</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {redisInfo.capabilities.map(cap => (
                      <div
                        key={cap}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <code className="text-[11px] font-mono">{cap}</code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Architecture Info */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Architecture</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RedisLike Interface</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        A unified interface that both real Redis and the in-memory fallback implement. This allows seamless
                        switching between backends via the <code className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">REDIS_URL</code> environment variable.
                      </p>
                      <div className="space-y-1.5">
                        {['get / set with TTL', 'del / delByPrefix', 'exists / keys / incr', 'expire / publish / on', 'ping health check'].map(f => (
                          <div key={f} className="flex items-center gap-2 text-[11px]">
                            <div className="h-1 w-1 rounded-full bg-emerald-500" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Queue System</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        BullMQ-compatible abstraction with in-memory fallback. Supports 10 named queues with retry/backoff,
                        delayed execution, and pre-built processors for all EAM subsystems.
                      </p>
                      <div className="space-y-1.5">
                        {['10 domain-specific queues', 'Automatic retry with backoff', 'Delayed job scheduling', 'Queue/Job CRUD API', 'Admin-only management'].map(f => (
                          <div key={f} className="flex items-center gap-2 text-[11px]">
                            <div className="h-1 w-1 rounded-full bg-emerald-500" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Clear Dialog */}
      <ResponsiveDialog open={!!confirmClear} onOpenChange={() => setConfirmClear(null)}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-none">Clear Queue</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This will remove all jobs from <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{confirmClear}</code>
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. All waiting, active, completed, and failed jobs will be permanently removed.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirmClear(null)}>Cancel</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => { if (confirmClear) handleClearQueue(confirmClear); }}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />Clear All Jobs
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
