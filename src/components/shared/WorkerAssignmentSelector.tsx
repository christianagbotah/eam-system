'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { useIsMobile } from '@/components/shared/ResponsiveDialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, X, Users, Wrench, Shield, Crown, Filter,
  UserPlus, UserMinus,
} from 'lucide-react';
import { getInitials } from '@/components/shared/helpers';

// ============================================================================
// Types
// ============================================================================

interface Worker {
  id: string;
  fullName: string;
  staffId: string | null;
  username: string;
  department: string | null;
  trade: string | null;
  status: string;
  primaryRole: string | null;
  primaryRoleSlug: string | null;
  isTechnician: boolean;
  roles: Array<{ name: string; slug: string }>;
}

interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
}

interface WorkerAssignmentSelectorProps {
  selectedWorkerIds: string[];
  teamLeaderId: string;
  onSelectedWorkersChange: (workerIds: string[]) => void;
  onTeamLeaderChange: (workerId: string) => void;
  departments: DepartmentInfo[];
  selectedDepartmentIds: string[];
  onDepartmentsChange: (deptIds: string[]) => void;
  assignType: 'technician' | 'supervisor';
  onAssignTypeChange: (type: 'technician' | 'supervisor') => void;
  label?: string;
}

// ============================================================================
// Trade color helper
// ============================================================================

function getTradeColor(trade: string | null): { bg: string; text: string; border: string } {
  if (!trade) return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  const t = trade.toLowerCase();
  if (t.includes('electric')) return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
  if (t.includes('mechan') || t.includes('fitter')) return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' };
  if (t.includes('civil') || t.includes('construct')) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' };
  if (t.includes('instrum') || t.includes('iot')) return { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' };
  if (t.includes('weld')) return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
  if (t.includes('workshop') || t.includes('machine')) return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' };
  if (t.includes('hse') || t.includes('safety')) return { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' };
  if (t.includes('quality') || t.includes('inspect')) return { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' };
  if (t.includes('store') || t.includes('supply') || t.includes('logistics')) return { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' };
  if (t.includes('prod') || t.includes('operat')) return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' };
  if (t.includes('engineer')) return { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' };
  return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
}

// ============================================================================
// Department Selector
// ============================================================================

function DepartmentSelector({
  departments,
  selectedDepartmentIds,
  removeDepartment,
  addDepartment,
  mobile,
}: {
  departments: DepartmentInfo[];
  selectedDepartmentIds: string[];
  removeDepartment: (id: string) => void;
  addDepartment: (id: string) => void;
  mobile?: boolean;
}) {
  const selectedDepts = departments.filter(d => selectedDepartmentIds.includes(d.id));
  const availableDepts = departments.filter(d => !selectedDepartmentIds.includes(d.id));

  return (
    <div className="space-y-2">
      {!mobile && <Label className="text-xs flex items-center gap-1"><Filter className="h-3 w-3" />Department(s)</Label>}
      <div className={`flex flex-wrap gap-1.5 min-h-[44px] p-2 border rounded-md bg-white ${mobile ? 'rounded-xl !p-3 bg-muted/30' : ''}`}>
        {selectedDepts.length === 0 && (
          <span className="text-sm text-muted-foreground">
            {mobile ? 'Tap below to add...' : 'Select departments to filter workers...'}
          </span>
        )}
        {selectedDepts.map(dept => (
          <Badge
            key={dept.id}
            variant="secondary"
            className={`gap-1 bg-green-100 text-green-800 border-green-200 ${mobile ? 'px-2.5 py-1 rounded-lg' : ''}`}
          >
            {dept.name}
            <button
              onClick={(e) => { e.stopPropagation(); removeDepartment(dept.id); }}
              className={`ml-0.5 flex items-center justify-center hover:text-red-600 ${
                mobile ? 'h-6 w-6 rounded-full hover:bg-red-100' : 'min-h-[44px] min-w-[44px]'
              }`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {availableDepts.length > 0 && (
        <Select onValueChange={v => addDepartment(v)}>
          <SelectTrigger className={`min-h-[44px] ${mobile ? 'h-12 rounded-xl' : ''}`}>
            <SelectValue placeholder={mobile ? '+ Add department...' : 'Add department...'} />
          </SelectTrigger>
          <SelectContent>
            {availableDepts.map(d => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}{d.code ? ` (${d.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkerAssignmentSelector({
  selectedWorkerIds,
  teamLeaderId,
  onSelectedWorkersChange,
  onTeamLeaderChange,
  departments,
  selectedDepartmentIds,
  onDepartmentsChange,
  assignType,
  onAssignTypeChange,
  label,
}: WorkerAssignmentSelectorProps) {
  const isMobile = useIsMobile();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Fetch workers
  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartmentIds.length > 0) {
        params.set('departmentIds', selectedDepartmentIds.join(','));
      }
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      params.set('role', assignType);
      const res = await api.get(`/api/workers?${params}`);
      if (res.success && res.data) {
        setWorkers(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setWorkers([]);
    }
    setLoading(false);
  }, [selectedDepartmentIds, debouncedSearch, assignType]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // Toggle worker selection
  const toggleWorker = useCallback((workerId: string) => {
    if (selectedWorkerIds.includes(workerId)) {
      const newIds = selectedWorkerIds.filter(id => id !== workerId);
      onSelectedWorkersChange(newIds);
      if (teamLeaderId === workerId) {
        onTeamLeaderChange('');
      }
    } else {
      const newIds = [...selectedWorkerIds, workerId];
      onSelectedWorkersChange(newIds);
      if (newIds.length === 1) {
        onTeamLeaderChange(workerId);
      }
    }
  }, [selectedWorkerIds, teamLeaderId, onSelectedWorkersChange, onTeamLeaderChange]);

  // Add department
  const addDepartment = useCallback((deptId: string) => {
    if (!selectedDepartmentIds.includes(deptId)) {
      onDepartmentsChange([...selectedDepartmentIds, deptId]);
    }
  }, [selectedDepartmentIds, onDepartmentsChange]);

  // Remove department
  const removeDepartment = useCallback((deptId: string) => {
    onDepartmentsChange(selectedDepartmentIds.filter(id => id !== deptId));
  }, [selectedDepartmentIds, onDepartmentsChange]);

  // Derived
  const selectedWorkers = useMemo(
    () => workers.filter(w => selectedWorkerIds.includes(w.id)),
    [workers, selectedWorkerIds]
  );
  const hasSelected = selectedWorkerIds.length > 0;
  const hasTeamLeader = !!teamLeaderId && selectedWorkerIds.includes(teamLeaderId);

  // Shared props for both layouts
  const sharedProps = {
    workers, loading, searchText, setSearchText,
    selectedWorkerIds, teamLeaderId, toggleWorker, onTeamLeaderChange,
    departments, selectedDepartmentIds, removeDepartment, addDepartment,
    assignType, onAssignTypeChange,
    selectedWorkers, hasSelected, hasTeamLeader,
  };

  return (
    <div className="space-y-4">
      {label && (
        <h3 className={`text-xs font-semibold text-green-800 uppercase tracking-wider flex items-center gap-2 ${isMobile ? 'gap-1.5' : ''}`}>
          <Users className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          {label}
        </h3>
      )}

      {/* Department Selector */}
      <DepartmentSelector
        departments={departments}
        selectedDepartmentIds={selectedDepartmentIds}
        removeDepartment={removeDepartment}
        addDepartment={addDepartment}
        mobile={isMobile}
      />

      {/* Assign Type Toggle */}
      {isMobile ? (
        <MobileAssignToggle assignType={assignType} onAssignTypeChange={onAssignTypeChange} />
      ) : (
        <DesktopAssignToggle assignType={assignType} onAssignTypeChange={onAssignTypeChange} />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isMobile ? 'Search workers...' : 'Search workers by name, staff ID, or username...'}
          className={`pl-9 ${isMobile ? 'h-12 rounded-xl' : 'min-h-[44px]'}`}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        {searchText && (
          <button
            onClick={() => setSearchText('')}
            className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center ${
              isMobile ? 'h-10 w-10 rounded-full' : 'min-h-[44px] min-w-[44px]'
            } hover:text-muted-foreground`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Worker List */}
      {isMobile ? (
        <MobileWorkerList
          workers={workers}
          loading={loading}
          selectedWorkerIds={selectedWorkerIds}
          teamLeaderId={teamLeaderId}
          toggleWorker={toggleWorker}
          onTeamLeaderChange={onTeamLeaderChange}
          hasSelected={hasSelected}
        />
      ) : (
        <DesktopWorkerTable
          workers={workers}
          loading={loading}
          selectedWorkerIds={selectedWorkerIds}
          teamLeaderId={teamLeaderId}
          toggleWorker={toggleWorker}
          onTeamLeaderChange={onTeamLeaderChange}
          onSelectedWorkersChange={onSelectedWorkersChange}
          hasSelected={hasSelected}
        />
      )}

      {/* Summary Bar */}
      {hasSelected && (
        <div className={`flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 ${isMobile ? 'rounded-xl' : 'rounded-lg'}`}>
          <div className="flex items-center gap-1.5 text-sm">
            <UserPlus className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-800">
              {selectedWorkerIds.length} worker{selectedWorkerIds.length !== 1 ? 's' : ''} selected
            </span>
            {hasTeamLeader && (
              <>
                <span className="text-emerald-300">·</span>
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-emerald-700">
                  {selectedWorkers.find(w => w.id === teamLeaderId)?.fullName}
                </span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${isMobile ? 'h-7 text-xs' : 'h-8 text-xs'}`}
            onClick={() => { onSelectedWorkersChange([]); onTeamLeaderChange(''); }}
          >
            <UserMinus className="h-3 w-3 mr-1" />Clear
          </Button>
        </div>
      )}

      {/* Team leader hint */}
      {hasSelected && !hasTeamLeader && (
        <p className={`text-xs text-amber-600 flex items-center gap-1 ${isMobile ? 'text-center' : ''}`}>
          <Crown className="h-3 w-3" />
          {isMobile
            ? 'Tap the crown icon to designate a team leader'
            : 'Click the radio button (crown column) to designate a team leader'}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Desktop Assign Toggle
// ============================================================================

function DesktopAssignToggle({ assignType, onAssignTypeChange }: {
  assignType: 'technician' | 'supervisor';
  onAssignTypeChange: (type: 'technician' | 'supervisor') => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Assign To</Label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          size="sm"
          variant={assignType === 'technician' ? 'default' : 'outline'}
          className={assignType === 'technician'
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]'
            : 'min-h-[44px]'}
          onClick={() => onAssignTypeChange('technician')}
        >
          <Wrench className="h-3.5 w-3.5 mr-1" />Technician(s)
        </Button>
        <Button
          size="sm"
          variant={assignType === 'supervisor' ? 'default' : 'outline'}
          className={assignType === 'supervisor'
            ? 'bg-violet-600 hover:bg-violet-700 text-white min-h-[44px]'
            : 'min-h-[44px]'}
          onClick={() => onAssignTypeChange('supervisor')}
        >
          <Shield className="h-3.5 w-3.5 mr-1" />Supervisor(s)
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Mobile Assign Toggle
// ============================================================================

function MobileAssignToggle({ assignType, onAssignTypeChange }: {
  assignType: 'technician' | 'supervisor';
  onAssignTypeChange: (type: 'technician' | 'supervisor') => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Assign To</Label>
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
        <button
          type="button"
          onClick={() => onAssignTypeChange('technician')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
            assignType === 'technician'
              ? 'bg-background shadow-sm text-emerald-700'
              : 'text-muted-foreground'
          }`}
        >
          <Wrench className="h-4 w-4" />Technicians
        </button>
        <button
          type="button"
          onClick={() => onAssignTypeChange('supervisor')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
            assignType === 'supervisor'
              ? 'bg-background shadow-sm text-violet-700'
              : 'text-muted-foreground'
          }`}
        >
          <Shield className="h-4 w-4" />Supervisors
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Desktop Worker Table
// ============================================================================

function DesktopWorkerTable({
  workers, loading, selectedWorkerIds, teamLeaderId, toggleWorker,
  onTeamLeaderChange, onSelectedWorkersChange, hasSelected,
}: {
  workers: Worker[];
  loading: boolean;
  selectedWorkerIds: string[];
  teamLeaderId: string;
  toggleWorker: (id: string) => void;
  onTeamLeaderChange: (id: string) => void;
  onSelectedWorkersChange: (ids: string[]) => void;
  hasSelected: boolean;
}) {
  const allSelected = workers.length > 0 && workers.every(w => selectedWorkerIds.includes(w.id));

  return (
    <div className="border rounded-md max-h-[320px] overflow-y-auto">
      {loading ? (
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No workers found. Select departments to filter.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const newIds = workers.map(w => w.id);
                      onSelectedWorkersChange(newIds);
                      if (!teamLeaderId && newIds.length > 0) {
                        onTeamLeaderChange(newIds[0]);
                      }
                    } else {
                      onSelectedWorkersChange([]);
                      onTeamLeaderChange('');
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-10 px-3">
                <span className="sr-only">Team Leader</span>
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              </TableHead>
              <TableHead className="px-3">Name &amp; Staff ID</TableHead>
              <TableHead className="px-3">Trade / Skill</TableHead>
              <TableHead className="px-3">Department</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map(worker => {
              const isSelected = selectedWorkerIds.includes(worker.id);
              const isLeader = teamLeaderId === worker.id;
              const tradeColor = getTradeColor(worker.trade);

              return (
                <TableRow
                  key={worker.id}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50' : ''}`}
                  onClick={() => toggleWorker(worker.id)}
                >
                  <TableCell className="px-3" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleWorker(worker.id)} />
                  </TableCell>
                  <TableCell className="px-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="radio"
                      name="teamLeader"
                      checked={isLeader}
                      disabled={!isSelected}
                      onChange={() => onTeamLeaderChange(worker.id)}
                      className={`h-4 w-4 cursor-pointer transition-all ${
                        !isSelected
                          ? 'opacity-30 cursor-not-allowed'
                          : 'accent-amber-500'
                      }`}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                        isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getInitials(worker.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-tight truncate">{worker.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {worker.staffId && <span className="mr-1.5">{worker.staffId}</span>}
                          {worker.primaryRole && <span className="text-gray-400">{worker.primaryRole}</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {worker.trade ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${tradeColor.bg} ${tradeColor.text} ${tradeColor.border}`}>
                        {worker.trade}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {worker.department ? (
                      <Badge variant="outline" className="text-xs font-normal">{worker.department}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ============================================================================
// Mobile Worker List (Cards)
// ============================================================================

function MobileWorkerList({
  workers, loading, selectedWorkerIds, teamLeaderId, toggleWorker,
  onTeamLeaderChange, hasSelected,
}: {
  workers: Worker[];
  loading: boolean;
  selectedWorkerIds: string[];
  teamLeaderId: string;
  toggleWorker: (id: string) => void;
  onTeamLeaderChange: (id: string) => void;
  hasSelected: boolean;
}) {
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-xl">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No workers found. Select departments to filter.
        </div>
      ) : (
        workers.map(worker => {
          const isSelected = selectedWorkerIds.includes(worker.id);
          const isLeader = teamLeaderId === worker.id;
          const tradeColor = getTradeColor(worker.trade);

          return (
            <div
              key={worker.id}
              onClick={() => toggleWorker(worker.id)}
              className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all min-h-[56px] ${
                isSelected
                  ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                  : 'border-border bg-card hover:border-gray-300'
              }`}
            >
              <div onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleWorker(worker.id)}
                  className="h-5 w-5"
                />
              </div>

              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {getInitials(worker.fullName)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{worker.fullName}</span>
                  {isLeader && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-400" />}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {worker.trade && (
                    <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border ${tradeColor.bg} ${tradeColor.text} ${tradeColor.border}`}>
                      {worker.trade}
                    </span>
                  )}
                  {worker.department && (
                    <span className="text-[10px] text-muted-foreground">{worker.department}</span>
                  )}
                </div>
              </div>

              <div onClick={e => e.stopPropagation()} className="shrink-0">
                <button
                  onClick={() => isSelected && onTeamLeaderChange(worker.id)}
                  disabled={!isSelected}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-all ${
                    isLeader
                      ? 'bg-amber-100 text-amber-600'
                      : isSelected
                        ? 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                        : 'text-gray-300'
                  }`}
                  title={isSelected ? (isLeader ? 'Remove as team leader' : 'Set as team leader') : 'Select worker first'}
                >
                  <Crown className={`h-4 w-4 ${isLeader ? 'fill-amber-400' : ''}`} />
                </button>
              </div>
            </div>
          );
        })
      )}

      {!hasSelected && workers.length > 0 && !loading && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Tap workers to add them to the team
        </p>
      )}
    </div>
  );
}
