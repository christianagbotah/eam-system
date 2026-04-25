'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Users, Crown, X, Loader2, Briefcase, Star, Filter } from 'lucide-react';
import { getInitials } from '@/components/shared/helpers';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkerSkill {
  id: string;
  name: string;
  code: string;
  category?: string;
  color?: string;
  proficiencyLevel: string;
  yearsExperience?: number;
  certified: boolean;
}

export interface WorkerInfo {
  id: string;
  fullName: string;
  username: string;
  staffId?: string;
  department?: string;
  primaryTrade?: string;
  skills: WorkerSkill[];
}

export type SelectedWorker = WorkerInfo;

interface DepartmentOption {
  id: string;
  name: string;
  code?: string;
}

export interface WorkerAssignmentPickerProps {
  /** Available departments to choose from */
  departments: DepartmentOption[];
  /** Currently selected department IDs */
  selectedDepartmentIds: string[];
  /** Called when department selection changes */
  onDepartmentChange: (ids: string[]) => void;
  /** Currently selected workers */
  selectedWorkers: SelectedWorker[];
  /** Called when worker selection changes */
  onWorkersChange: (workers: SelectedWorker[]) => void;
  /** Current team leader user ID */
  teamLeaderId: string;
  /** Called when team leader changes */
  onTeamLeaderChange: (id: string) => void;
  /** Role filter: 'technician' or 'supervisor' */
  mode: 'technician' | 'supervisor';
  /** Label for the worker list (default: "Workers") */
  label?: string;
  /** Whether to show team leader selection (default: true) */
  showTeamLeader?: boolean;
  /** Compact mode for mobile stepper sheets */
  compact?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const proficiencyColor: Record<string, string> = {
  beginner: 'bg-slate-100 text-slate-700 border-slate-200',
  intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
  advanced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expert: 'bg-amber-50 text-amber-700 border-amber-200',
};

const proficiencyLabel: Record<string, string> = {
  beginner: 'Beg',
  intermediate: 'Int',
  advanced: 'Adv',
  expert: 'Exp',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkerAssignmentPicker({
  departments,
  selectedDepartmentIds,
  onDepartmentChange,
  selectedWorkers,
  onWorkersChange,
  teamLeaderId,
  onTeamLeaderChange,
  mode,
  label,
  showTeamLeader = true,
  compact = false,
}: WorkerAssignmentPickerProps) {
  const displayLabel = label || (mode === 'technician' ? 'Technicians' : 'Supervisors');
  const [searchText, setSearchText] = useState('');
  const [workerPool, setWorkerPool] = useState<WorkerInfo[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Fetch workers when departments change ──────────────────────────────
  useEffect(() => {
    if (selectedDepartmentIds.length === 0) {
      setWorkerPool([]);
      return;
    }

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingWorkers(true);
    const params = new URLSearchParams();
    if (mode === 'technician') params.set('role', 'technician');
    if (mode === 'supervisor') params.set('role', 'supervisor');
    params.set('departmentIds', selectedDepartmentIds.join(','));
    params.set('includeSkills', 'true');
    params.set('status', 'active');

    api
      .get(`/api/users?${params}`)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.success && Array.isArray(res.data)) {
          const workers: WorkerInfo[] = res.data.map((u: Record<string, unknown>) => ({
            id: u.id as string,
            fullName: u.fullName as string,
            username: u.username as string,
            staffId: (u.staffId as string) || undefined,
            department: (u.department as string) || undefined,
            primaryTrade: (u.primaryTrade as string) || undefined,
            skills: Array.isArray(u.skills) ? u.skills as WorkerSkill[] : [],
          }));
          setWorkerPool(workers);
        } else {
          setWorkerPool([]);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setWorkerPool([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingWorkers(false);
      });

    return () => {
      controller.abort();
    };
  }, [selectedDepartmentIds, mode]);

  // ─── Filtered worker list ───────────────────────────────────────────────
  const filteredWorkers = useMemo(() => {
    if (!searchText.trim()) return workerPool;
    const q = searchText.toLowerCase();
    return workerPool.filter(
      (w) =>
        w.fullName.toLowerCase().includes(q) ||
        w.username.toLowerCase().includes(q) ||
        (w.staffId || '').toLowerCase().includes(q) ||
        (w.primaryTrade || '').toLowerCase().includes(q) ||
        w.skills.some((s) => s.name.toLowerCase().includes(q)),
    );
  }, [workerPool, searchText]);

  const selectedWorkerIds = useMemo(
    () => new Set(selectedWorkers.map((w) => w.userId || w.id)),
    [selectedWorkers],
  );

  // ─── Handlers ──────────────────────────────────────────────────────────

  const addDepartment = useCallback(
    (deptId: string) => {
      if (!selectedDepartmentIds.includes(deptId)) {
        onDepartmentChange([...selectedDepartmentIds, deptId]);
      }
    },
    [selectedDepartmentIds, onDepartmentChange],
  );

  const removeDepartment = useCallback(
    (deptId: string) => {
      onDepartmentChange(selectedDepartmentIds.filter((id) => id !== deptId));
    },
    [selectedDepartmentIds, onDepartmentChange],
  );

  const toggleWorker = useCallback(
    (worker: WorkerInfo) => {
      const isSelected = selectedWorkerIds.has(worker.id);
      if (isSelected) {
        // Remove from selection
        onWorkersChange(selectedWorkers.filter((w) => (w.userId || w.id) !== worker.id));
        // If this was the team leader, clear team leader
        if (teamLeaderId === worker.id) {
          onTeamLeaderChange('');
        }
      } else {
        // Add to selection
        onWorkersChange([
          ...selectedWorkers,
          { ...worker, userId: worker.id },
        ]);
      }
    },
    [selectedWorkers, selectedWorkerIds, teamLeaderId, onWorkersChange, onTeamLeaderChange],
  );

  const setTeamLeader = useCallback(
    (workerId: string) => {
      // Toggle: if already leader, deselect; otherwise set as leader
      if (teamLeaderId === workerId) {
        onTeamLeaderChange('');
      } else {
        onTeamLeaderChange(workerId);
      }
    },
    [teamLeaderId, onTeamLeaderChange],
  );

  const teamLeaderName = useMemo(() => {
    if (!teamLeaderId) return null;
    const leader = selectedWorkers.find((w) => (w.userId || w.id) === teamLeaderId);
    return leader?.fullName || null;
  }, [teamLeaderId, selectedWorkers]);

  // ─── Render ────────────────────────────────────────────────────────────

  const deptDept = (id: string) => departments.find((d) => d.id === id);
  const unselectedDepts = departments.filter((d) => !selectedDepartmentIds.includes(d.id));

  return (
    <div className="space-y-3">
      {/* ── Summary Bar ── */}
      {selectedWorkers.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-xs font-medium text-emerald-800">
            {selectedWorkers.length} {selectedWorkers.length === 1 ? 'worker' : 'workers'} selected
          </span>
          {showTeamLeader && teamLeaderName && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
              <Crown className="h-3 w-3" />
              Lead: {teamLeaderName}
            </span>
          )}
          {showTeamLeader && !teamLeaderName && (
            <span className="text-xs text-muted-foreground">
              Tap star to set team lead
            </span>
          )}
        </div>
      )}

      {/* ── Department Multi-Select ── */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium flex items-center gap-1">
          <Filter className="h-3 w-3 text-muted-foreground" />
          Filter by Department
        </Label>
        <div
          className={`flex flex-wrap gap-1.5 p-2 border rounded-md bg-white ${
            compact ? 'min-h-[40px]' : 'min-h-[44px]'
          }`}
        >
          {selectedDepartmentIds.length === 0 && (
            <span className="text-sm text-muted-foreground">Select departments to load workers...</span>
          )}
          {selectedDepartmentIds.map((dId) => {
            const dept = deptDept(dId);
            return dept ? (
              <Badge
                key={dId}
                variant="secondary"
                className="gap-1 bg-green-100 text-green-800 border-green-200"
              >
                {dept.name}
                <button
                  onClick={() => removeDepartment(dId)}
                  className={`flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600 ${
                    compact ? 'h-5 w-5 ml-0.5' : 'min-h-[44px] min-w-[44px] ml-0.5'
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
        {unselectedDepts.length > 0 && (
          <Select onValueChange={addDepartment}>
            <SelectTrigger className={compact ? 'h-11 rounded-xl' : 'min-h-[44px]'}>
              <SelectValue placeholder="+ Add department..." />
            </SelectTrigger>
            <SelectContent>
              {unselectedDepts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}{d.code ? ` [${d.code}]` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Worker List ── */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          {displayLabel}
          {filteredWorkers.length > 0 && (
            <span className="text-muted-foreground font-normal">
              ({filteredWorkers.length} available)
            </span>
          )}
        </Label>

        {/* Search within workers */}
        {(workerPool.length > 0 || searchText) && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={`Search ${displayLabel.toLowerCase()} by name, staff ID, or trade...`}
              className={`pl-9 ${compact ? 'h-11 rounded-xl text-sm' : 'min-h-[44px]'}`}
            />
          </div>
        )}

        {/* Loading skeleton */}
        {loadingWorkers && (
          <div className="space-y-2 p-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state: no departments selected */}
        {!loadingWorkers && selectedDepartmentIds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed rounded-lg">
            <Briefcase className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Select department(s) above to load {displayLabel.toLowerCase()}
            </p>
          </div>
        )}

        {/* Empty state: departments selected but no workers */}
        {!loadingWorkers && selectedDepartmentIds.length > 0 && workerPool.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed rounded-lg">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No active {displayLabel.toLowerCase()} found in selected department(s)
            </p>
          </div>
        )}

        {/* Worker list */}
        {!loadingWorkers && filteredWorkers.length > 0 && (
          <ScrollArea className={compact ? 'max-h-[48vh]' : 'max-h-[320px]'}>
            <div className="space-y-1 pr-1">
              {filteredWorkers.map((worker) => {
                const isSelected = selectedWorkerIds.has(worker.id);
                const isLeader = teamLeaderId === worker.id;
                return (
                  <div
                    key={worker.id}
                    className={`
                      group flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer
                      ${compact ? 'gap-2 p-2' : ''}
                      ${isSelected
                        ? isLeader
                          ? 'bg-amber-50 border-amber-300 shadow-sm'
                          : 'bg-emerald-50 border-emerald-300 shadow-sm'
                        : 'bg-white border-transparent hover:bg-muted/50 hover:border-border'
                      }
                    `}
                    onClick={() => toggleWorker(worker)}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleWorker(worker)}
                      className={compact ? 'h-4 w-4' : ''}
                      aria-label={`Select ${worker.fullName}`}
                    />

                    {/* Avatar */}
                    <Avatar className={compact ? 'h-8 w-8' : 'h-9 w-9'}>
                      <AvatarFallback
                        className={`text-xs font-semibold ${
                          isSelected
                            ? isLeader
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-emerald-200 text-emerald-800'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {getInitials(worker.fullName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${compact ? 'text-[13px]' : ''}`}>
                          {worker.fullName}
                        </span>
                        {isLeader && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {worker.staffId && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {worker.staffId}
                          </span>
                        )}
                        {worker.department && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 font-normal"
                          >
                            {worker.department}
                          </Badge>
                        )}
                      </div>
                      {/* Skill badges */}
                      {worker.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {worker.primaryTrade && (
                            <Badge
                              className="text-[10px] px-1.5 py-0 h-4 font-medium border"
                              style={{
                                backgroundColor: worker.skills[0]?.color
                                  ? `${worker.skills[0].color}18`
                                  : 'hsl(var(--primary) / 0.08)',
                                color: worker.skills[0]?.color || 'hsl(var(--primary))',
                                borderColor: worker.skills[0]?.color
                                  ? `${worker.skills[0].color}40`
                                  : 'hsl(var(--primary) / 0.25)',
                              }}
                            >
                              {worker.primaryTrade}
                            </Badge>
                          )}
                          {worker.skills
                            .filter(
                              (s) =>
                                !worker.primaryTrade ||
                                s.name.toLowerCase() !== worker.primaryTrade.toLowerCase(),
                            )
                            .slice(0, 3)
                            .map((skill) => (
                              <span
                                key={skill.id}
                                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 h-4 rounded border font-normal ${
                                  proficiencyColor[skill.proficiencyLevel] || ''
                                }`}
                                title={`${skill.name} — ${skill.proficiencyLevel}${
                                  skill.certified ? ' (Certified)' : ''
                                }${skill.yearsExperience ? ` · ${skill.yearsExperience}yr` : ''}`}
                              >
                                {skill.name}
                                <span className="opacity-60">
                                  {proficiencyLabel[skill.proficiencyLevel] || ''}
                                </span>
                                {skill.certified && (
                                  <Star className="h-2 w-2 fill-current" />
                                )}
                              </span>
                            ))}
                          {worker.skills.length > 4 && (
                            <span className="text-[10px] text-muted-foreground px-1">
                              +{worker.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Team Leader Radio (star button) */}
                    {showTeamLeader && isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTeamLeader(worker.id);
                        }}
                        className={`
                          shrink-0 flex items-center justify-center rounded-full transition-all
                          ${compact ? 'h-8 w-8' : 'h-9 w-9'}
                          ${isLeader
                            ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-400'
                            : 'text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-50'
                          }
                        `}
                        title={
                          isLeader
                            ? 'Remove as team leader'
                            : 'Set as team leader'
                        }
                        aria-label={
                          isLeader
                            ? `${worker.fullName} is team leader`
                            : `Set ${worker.fullName} as team leader`
                        }
                      >
                        <Crown className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ── Selected Workers Summary ── */}
      {selectedWorkers.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Assigned {displayLabel}
          </Label>
          <div className="flex flex-wrap gap-1.5 min-h-[44px] p-2 border rounded-md bg-white">
            {selectedWorkers.map((w) => {
              const wId = w.userId || w.id;
              const isLeader = teamLeaderId === wId;
              return (
                <Badge
                  key={wId}
                  variant="secondary"
                  className={`gap-1 ${isLeader ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}`}
                >
                  {isLeader && <Crown className="h-3 w-3 text-amber-500" />}
                  {w.fullName}
                  {w.primaryTrade && (
                    <span className="text-[10px] opacity-60 ml-0.5">({w.primaryTrade})</span>
                  )}
                  <button
                    onClick={() => toggleWorker(w)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-red-600 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
