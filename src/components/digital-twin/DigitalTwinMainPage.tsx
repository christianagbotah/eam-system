'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import { AsyncSearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Box,
  ArrowLeft,
  Search,
  Plus,
  RefreshCw,
  Play,
  AlertTriangle,
  Eye,
  GitBranch,
  Loader2,
  Activity,
  Clock,
  Wifi,
  ChevronRight,
  Filter,
  Upload,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface TwinData {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  healthScore: number;
  lastSynced: string | null;
  alertCount: number;
  asset: { id: string; name: string; assetTag?: string; imageUrl?: string } | null;
  parameters?: string | null;
  specification?: string | null;
  status?: string;
  createdAt: string;
}

type ViewMode = 'grid' | 'viewer' | 'diagram';

// Lazy-load heavy 3D components to avoid blocking initial render
import dynamic from 'next/dynamic';

const DigitalTwinViewer = dynamic(
  () => import('./DigitalTwinViewer').then(m => ({ default: m.DigitalTwinViewer })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center min-h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400 mx-auto mb-4" />
        <p className="text-sm text-slate-400">Loading 3D Viewer...</p>
      </div>
    </div>
  )}
);

const SystemDiagramPageModule = dynamic(
  () => import('./SystemDiagramPage').then(m => ({ default: m.SystemDiagramPage })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center min-h-[500px] bg-card rounded-2xl border border-border">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Loading System Diagrams...</p>
      </div>
    </div>
  )}
);

/** Wrapper to pass twin context to the SystemDiagramPage */
function SystemDiagramPageWrapper({ twinId, twinName }: { twinId: string; twinName: string }) {
  return <SystemDiagramPageModule twinId={twinId} twinName={twinName} />;
}

// ============================================================================
// KPI Card
// ============================================================================

function KpiCard({ label, value, icon: Icon, color, subtext }: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
          {subtext && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Twin Card
// ============================================================================

function TwinCard({ twin, onOpenViewer, onOpenDiagram }: {
  twin: TwinData;
  onOpenViewer: () => void;
  onOpenDiagram: () => void;
}) {
  const healthColor = (score: number) =>
    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';

  const healthTextColor = (score: number) =>
    score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-lg hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden">
      {/* Gradient top bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{twin.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {twin.asset?.name || 'Unlinked Asset'}
              {twin.asset?.assetTag && ` (${twin.asset.assetTag})`}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              twin.isActive
                ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400'
                : 'text-slate-500 bg-slate-50 border-slate-200'
            }
          >
            <span className="capitalize">{twin.isActive ? 'Active' : 'Inactive'}</span>
          </Badge>
        </div>

        {/* Health Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Health Score</span>
            <span className={`font-bold ${healthTextColor(twin.healthScore)}`}>
              {twin.healthScore}%
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${healthColor(twin.healthScore)}`}
              style={{ width: `${twin.healthScore}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {twin.lastSynced ? new Date(twin.lastSynced).toLocaleDateString() : 'Never synced'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {twin.alertCount > 0 ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-amber-600 font-medium">{twin.alertCount} alert{twin.alertCount !== 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 font-medium">No alerts</span>
              </>
            )}
          </div>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] capitalize">
            <Box className="h-3 w-3 mr-1" />
            {twin.type.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs h-8"
            onClick={onOpenViewer}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Open 3D Viewer
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-8"
            onClick={onOpenDiagram}
          >
            <GitBranch className="h-3.5 w-3.5 mr-1.5" />
            System Diagram
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Create Twin Dialog
// ============================================================================

function CreateTwinDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    asset: '',
    type: 'pump',
    syncInterval: '1min',
  });

  const handleCreate = async () => {
    if (!form.name || !form.asset) return;
    setSaving(true);
    try {
      const res = await api.post('/api/digital-twins', {
        name: form.name,
        assetId: form.asset,
        type: form.type,
        syncInterval: form.syncInterval,
      });
      if (res.success) {
        toast.success('Digital twin created successfully');
        setForm({ name: '', asset: '', type: 'pump', syncInterval: '1min' });
        onOpenChange(false);
        onCreated();
      } else {
        toast.error(res.error || 'Failed to create digital twin');
      }
    } catch {
      toast.error('Failed to create digital twin');
    }
    setSaving(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-1.5 mb-4">
        <h2 className="text-lg font-semibold leading-none tracking-tight">Create Digital Twin</h2>
        <p className="text-sm text-muted-foreground">Create a new digital replica for an asset</p>
      </div>
      <div className="space-y-4">
        <div>
          <Label>Twin Name</Label>
          <Input
            placeholder="e.g. Centrifugal Pump P-101"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Asset</Label>
          <AsyncSearchableSelect
            value={form.asset}
            onValueChange={(v) => setForm((f) => ({ ...f, asset: v }))}
            fetchOptions={async () => {
              const res = await api.get('/api/assets?limit=999');
              if (res.success && res.data) {
                return (Array.isArray(res.data) ? res.data : []).map((a: any) => ({
                  value: a.id,
                  label: `${a.name} (${a.assetTag || 'N/A'})`,
                }));
              }
              return [];
            }}
            placeholder="Select asset..."
            searchPlaceholder="Search assets..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pump">Pump</SelectItem>
                <SelectItem value="motor">Motor</SelectItem>
                <SelectItem value="compressor">Compressor</SelectItem>
                <SelectItem value="valve">Valve</SelectItem>
                <SelectItem value="heat_exchanger">Heat Exchanger</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sync Interval</Label>
            <Select value={form.syncInterval} onValueChange={(v) => setForm((f) => ({ ...f, syncInterval: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="real_time">Real-time</SelectItem>
                <SelectItem value="1min">1 min</SelectItem>
                <SelectItem value="5min">5 min</SelectItem>
                <SelectItem value="15min">15 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={handleCreate} disabled={saving || !form.name || !form.asset}>
          {saving ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating...</span>
          ) : 'Create Twin'}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

// ============================================================================
// Upload 3D Model Dialog
// ============================================================================

const ACCEPTED_EXTENSIONS = ['.glb', '.gltf', '.fbx', '.obj', '.step', '.stp'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function UploadModelDialog({ open, onOpenChange, onUploaded }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({ asset: '', name: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error(`Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 100MB.');
      return;
    }

    setSelectedFile(file);
    if (!form.name) {
      setForm((f) => ({ ...f, name: file.name.replace(/\.[^.]+$/, '') }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !form.asset || !form.name) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assetId', form.asset);
      formData.append('name', form.name);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/asset-models/upload');

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve, reject) => {
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Invalid response'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });

      if (response.success) {
        toast.success('3D model uploaded successfully');
        setSelectedFile(null);
        setForm({ asset: '', name: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        onOpenChange(false);
        onUploaded();
      } else {
        toast.error(response.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed. Please try again.');
    }

    setSaving(false);
    setUploadProgress(0);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-1.5 mb-4">
        <h2 className="text-lg font-semibold leading-none tracking-tight">Upload 3D Model</h2>
        <p className="text-sm text-muted-foreground">Upload a 3D model file (.glb, .gltf, .fbx, .obj, .step)</p>
      </div>
      <div className="space-y-4">
        {/* Asset Selector */}
        <div>
          <Label>Asset *</Label>
          <AsyncSearchableSelect
            value={form.asset}
            onValueChange={(v) => setForm((f) => ({ ...f, asset: v }))}
            fetchOptions={async () => {
              const res = await api.get('/api/assets?limit=999');
              if (res.success && res.data) {
                return (Array.isArray(res.data) ? res.data : []).map((a: any) => ({
                  value: a.id,
                  label: `${a.name} (${a.assetTag || 'N/A'})`,
                }));
              }
              return [];
            }}
            placeholder="Select asset..."
            searchPlaceholder="Search assets..."
          />
        </div>

        {/* Model Name */}
        <div>
          <Label>Model Name *</Label>
          <Input
            placeholder="e.g. Pump P-101 Assembly"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        {/* File Picker */}
        <div>
          <Label>3D Model File *</Label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              selectedFile
                ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <Box className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Click to select a 3D model file
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Supports: .glb, .gltf, .fbx, .obj, .step (max 100MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {saving && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
        <Button onClick={handleUpload} disabled={saving || !selectedFile || !form.asset || !form.name}>
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading... {uploadProgress}%
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Model
            </span>
          )}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function DigitalTwinMainPage() {
  const { hasPermission, isAdmin } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTwin, setSelectedTwin] = useState<TwinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [twins, setTwins] = useState<TwinData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [kpis, setKpis] = useState<{ total: number; activeSync: number; simulationRuns: number; alerts: number }>({ total: 0, activeSync: 0, simulationRuns: 0, alerts: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/digital-twins');
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : [];
        // Map to TwinData with alertCount
        const mapped: TwinData[] = list.map((t: any) => ({
          id: t.id,
          name: t.name,
          type: t.type || 'other',
          isActive: t.isActive ?? true,
          healthScore: t.healthScore ?? 0,
          lastSynced: t.lastSynced || null,
          alertCount: 0, // TODO: wire to real IoT alert aggregation
          asset: t.asset || null,
          parameters: t.parameters || null,
          specification: t.specification || null,
          status: t.status || null,
          createdAt: t.createdAt || '',
        }));
        setTwins(mapped);
        if (res.kpis) setKpis(res.kpis as { total: number; activeSync: number; simulationRuns: number; alerts: number });
      }
    } catch {
      toast.error('Failed to load digital twins');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter twins
  const filteredTwins = useMemo(() => {
    let result = twins;
    if (filterStatus === 'active') result = result.filter((t) => t.isActive);
    if (filterStatus === 'inactive') result = result.filter((t) => !t.isActive);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.asset?.name?.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [twins, filterStatus, searchQuery]);

  const handleOpenViewer = (twin: TwinData) => {
    setSelectedTwin(twin);
    setViewMode('viewer');
  };

  const handleOpenDiagram = (twin: TwinData) => {
    setSelectedTwin(twin);
    setViewMode('diagram');
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setSelectedTwin(null);
  };

  const kpiCards = [
    { label: 'Total Twins', value: kpis.total, icon: Box, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' },
    { label: 'Active Sync', value: kpis.activeSync, icon: RefreshCw, color: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400' },
    { label: 'Simulation Runs', value: kpis.simulationRuns, icon: Play, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' },
    { label: 'Active Alerts', value: kpis.alerts, icon: AlertTriangle, color: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' },
  ];

  return (
    <div className="page-content">
      {/* ================================================================ */}
      {/* Full-Screen 3D Viewer Mode                                       */}
      {/* ================================================================ */}
      {viewMode === 'viewer' && selectedTwin && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBackToGrid}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Twins
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{selectedTwin.name} — 3D Viewer</h1>
            </div>
            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
              <Activity className="h-3 w-3 mr-1" />
              {selectedTwin.healthScore}% Health
            </Badge>
          </div>
          <div className="relative" style={{ height: 'calc(100vh - 160px)' }}>
            <DigitalTwinViewer assetId={selectedTwin.asset?.id} twinId={selectedTwin.id} twinName={selectedTwin.name} />
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Full-Screen System Diagram Mode                                  */}
      {/* ================================================================ */}
      {viewMode === 'diagram' && selectedTwin && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBackToGrid}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Twins
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{selectedTwin.name} — System Diagram</h1>
            </div>
            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
              <GitBranch className="h-3 w-3 mr-1" />
              {selectedTwin.type.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="relative" style={{ height: 'calc(100vh - 160px)' }}>
            <SystemDiagramPageWrapper twinId={selectedTwin.id} twinName={selectedTwin.name} />
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Grid View — Scene Selector                                       */}
      {/* ================================================================ */}
      {viewMode === 'grid' && (
        <>
          {/* Page Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Digital Twin</h1>
              <p className="text-muted-foreground mt-1">
                Create and manage digital replicas of physical assets with 3D visualization
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {(hasPermission('assets.create') || isAdmin()) && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Twin
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload 3D Model
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpiCards.map((k) => {
              const Icon = k.icon;
              return <KpiCard key={k.label} {...k} />;
            })}
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search twins by name, asset, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(['all', 'active', 'inactive'] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={filterStatus === status ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(status)}
                  className="text-xs h-8 capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              {filteredTwins.length} twin{filteredTwins.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Twin Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTwins.length === 0 ? (
            <Card className="border border-border/60 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Box className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {searchQuery || filterStatus !== 'all' ? 'No twins match your filters' : 'No digital twins yet'}
                </h3>
                <p className="text-xs text-muted-foreground/60 mb-4">
                  {searchQuery || filterStatus !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first digital twin to get started'}
                </p>
                {!searchQuery && filterStatus === 'all' && (hasPermission('assets.create') || isAdmin()) && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Twin
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTwins.map((twin) => (
                <TwinCard
                  key={twin.id}
                  twin={twin}
                  onOpenViewer={() => handleOpenViewer(twin)}
                  onOpenDiagram={() => handleOpenDiagram(twin)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Twin Dialog */}
      <CreateTwinDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchData}
      />

      {/* Upload Model Dialog */}
      <UploadModelDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={fetchData}
      />
    </div>
  );
}

export default DigitalTwinMainPage;
