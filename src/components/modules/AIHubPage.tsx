'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AIAssetGenerator } from '@/components/shared/AIAssetGenerator';
import {
  EmptyState,
  formatDate,
  timeAgo,
} from '@/components/shared/helpers';
import {
  BrainCircuit,
  Sparkles,
  Settings,
  History,
  Layers,
  GitBranch,
  Cpu,
  Package,
  ClipboardList,
  Activity,
  Box,
  Image,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Zap,
  Wrench,
  Building2,
  CalendarClock,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AiConfigStatus {
  configured: boolean;
  provider: string;
  lastTestedAt?: string;
}

interface AiGenerationHistoryItem {
  id: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  machineName: string;
  summary: {
    components?: number;
    pmTemplates?: number;
    spareParts?: number;
    subsystems?: number;
    bomEntries?: number;
  };
  createdAt: string;
  status: string;
}

interface CapabilityCard {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const CAPABILITIES: CapabilityCard[] = [
  {
    icon: Layers,
    title: 'Asset Hierarchy',
    description: 'Generates complete asset structure with subsystems and components',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
  },
  {
    icon: GitBranch,
    title: 'Bill of Materials',
    description: 'Creates detailed BOM with part numbers, quantities, and specifications',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    icon: Cpu,
    title: 'Component Registry',
    description: 'Builds component entries with specs, operating params, and maintenance data',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
  },
  {
    icon: Package,
    title: 'Spare Parts Inventory',
    description: 'Populates spare parts with reorder levels, suppliers, and bin locations',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    icon: ClipboardList,
    title: 'PM Templates & Schedules',
    description: 'Generates preventive maintenance tasks, templates, and schedules',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
  },
  {
    icon: Activity,
    title: 'Digital Twin',
    description: 'Creates 3D digital twin configuration with scene data',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  {
    icon: Box,
    title: 'System Diagram',
    description: 'Builds interactive system diagrams with all component connections',
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    borderColor: 'border-fuchsia-200 dark:border-fuchsia-800',
  },
  {
    icon: Image,
    title: 'AI Machine Illustration',
    description: 'Generates machine images using AI image generation',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
];

// ============================================================================
// QUICK ACTION CARD
// ============================================================================

function QuickActionCard({
  icon: Icon,
  title,
  description,
  color,
  bgColor,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold truncate">{title}</h3>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// CAPABILITY CARD COMPONENT
// ============================================================================

function CapabilityCardItem({ item }: { item: CapabilityCard }) {
  const Icon = item.icon;
  return (
    <div className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4.5 w-4.5 ${item.color}`} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{item.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function HubLoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export function AIHubPage() {
  const { navigate } = useNavigationStore();

  // AI Generator dialog
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  // Data states
  const [configStatus, setConfigStatus] = useState<AiConfigStatus | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<AiGenerationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch config status and recent generations in parallel
      const [configRes, historyRes] = await Promise.allSettled([
        api.get<AiConfigStatus>('/api/ai/config'),
        api.get<AiGenerationHistoryItem[]>('/api/ai/history?limit=5'),
      ]);

      if (configRes.status === 'fulfilled' && configRes.value.success) {
        setConfigStatus(configRes.value.data || null);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.success && historyRes.value.data) {
        const items = Array.isArray(historyRes.value.data) ? historyRes.value.data : [];
        setRecentGenerations(items);
      }
    } catch {
      toast.error('Failed to load AI hub data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Summarize generation counts
  const getSummaryCounts = (item: AiGenerationHistoryItem) => {
    const s = item.summary || {};
    const parts: string[] = [];
    if (s.components) parts.push(`${s.components} components`);
    if (s.pmTemplates) parts.push(`${s.pmTemplates} PM templates`);
    if (s.spareParts) parts.push(`${s.spareParts} spare parts`);
    if (s.subsystems) parts.push(`${s.subsystems} subsystems`);
    return parts.join(' · ');
  };

  if (loading) return <HubLoadingSkeleton />;

  return (
    <div className="page-content">
      {/* ── AI Asset Generator Dialog (rendered conditionally) ── */}
      <AIAssetGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
        onSuccess={fetchData}
      />

      {/* ── Header Section ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <BrainCircuit className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            AI Intelligence Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-xl">
            Generate complete asset hierarchies, bills of materials, PM schedules, digital twins, and system diagrams
            using AI — all from a single machine description.
          </p>
        </div>
      </div>

      {/* ── AI Configuration Status Card ── */}
      <Card className="mb-6 border-0 shadow-sm py-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {configStatus?.configured ? (
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">
                  {configStatus?.configured ? 'AI Connected' : 'AI Not Configured'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {configStatus?.configured
                    ? `Provider: ${configStatus.provider}${configStatus.lastTestedAt ? ` · Last tested ${timeAgo(configStatus.lastTestedAt)}` : ''}`
                    : 'Configure your AI provider and API key to start generating assets'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('ai-config')}
              className="gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              {configStatus?.configured ? 'Update Config' : 'Configure AI'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Actions Grid ── */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QuickActionCard
          icon={Sparkles}
          title="Generate Asset"
          description="Create a complete asset with AI — sub-systems, components, BOM, PM schedules, and more"
          color="text-violet-600 dark:text-violet-400"
          bgColor="bg-violet-50 dark:bg-violet-950/30"
          onClick={() => setAiGeneratorOpen(true)}
        />
        <QuickActionCard
          icon={Settings}
          title="Configure AI"
          description="Set up your AI provider, model selection, temperature, and generation defaults"
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          onClick={() => navigate('ai-config')}
        />
        <QuickActionCard
          icon={History}
          title="Generation History"
          description="Browse all AI-generated assets, review what was created, and view details"
          color="text-cyan-600 dark:text-cyan-400"
          bgColor="bg-cyan-50 dark:bg-cyan-950/30"
          onClick={() => navigate('ai-history')}
        />
      </div>

      {/* ── Capabilities Section ── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CAPABILITIES.map((cap) => (
            <CapabilityCardItem key={cap.title} item={cap} />
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      {/* ── Recent Generations ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Generations
          </h2>
          {recentGenerations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => navigate('ai-history')}
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>

        {recentGenerations.length === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title="No AI generations yet"
            description="Start by generating your first asset with AI. It will create a complete asset hierarchy with components, BOM, PM schedules, and more."
          />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentGenerations.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => navigate('assets-machines', { id: item.assetId })}
              >
                <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{item.machineName || item.assetName}</p>
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {item.assetTag}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    {getSummaryCounts(item) && (
                      <span className="truncate">{getSummaryCounts(item)}</span>
                    )}
                    <span className="flex items-center gap-1 shrink-0">
                      <CalendarClock className="h-3 w-3" />
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
