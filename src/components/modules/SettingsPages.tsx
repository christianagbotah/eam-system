'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';
import type { PageName, User, Role, Permission, Module, UserRole, Notification, CompanyProfile } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users, Plus, Search, Pencil, Trash2, MoreHorizontal, Key, UserPlus,
  UserMinus, Settings, Shield, Eye, CheckCircle2, XCircle, RefreshCw,
  Lock, AlertTriangle, Bell, BellRing, Globe, Link2, Database, Download,
  MapPin, Check, ChevronDown,
  Box, Cpu, History, Smartphone,
  Upload, Archive, Building2, Boxes, Clock, Calendar, Factory, Building,
  PieChart as PieChartIcon, Layers, Cog, Wrench, FlaskConical, HardHat,
  Radio, Ruler, GraduationCap, TriangleAlert, Activity, BrainCircuit,
  GitBranch, ScanLine, Truck, FolderOpen, Target, TrendingUp, Zap, Mail,
  Send, ShieldAlert, ShieldCheck, BarChart3, Package, ClipboardList, Gauge, X,
  AlertCircle, FileBarChart,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { EmptyState, getInitials, formatDate, formatDateTime, timeAgo, LoadingSkeleton } from '@/components/shared/helpers';

// SettingsUsersPage
export function SettingsUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetPwd, setResetPwd] = useState('');

  const emptyForm = { fullName: '', username: '', email: '', phone: '', department: '', password: '', status: 'active' as string, roleIds: [] as string[] };
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const loadUsers = useCallback(() => {
    api.get<User[]>('/api/users').then(res => { if (res.success && res.data) setUsers(res.data); setLoading(false); });
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<User[]>('/api/users'),
      api.get<Role[]>('/api/roles'),
    ]).then(([usersRes, rolesRes]) => {
      if (usersRes.success && usersRes.data) setUsers(usersRes.data);
      if (rolesRes.success && rolesRes.data) setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      setLoading(false);
    });
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchText.trim()) return users;
    const q = searchText.toLowerCase();
    return users.filter(u => u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, searchText]);

  const handleCreate = async () => {
    if (!createForm.fullName || !createForm.username || !createForm.email || !createForm.password) { toast.error('Please fill required fields'); return; }
    setSaving(true);
    const res = await api.post('/api/users', createForm);
    if (res.success) { toast.success('User created'); setCreateOpen(false); setCreateForm(emptyForm); loadUsers(); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { password: _, ...data } = editForm;
    const res = await api.put(`/api/users/${selectedUser.id}`, data);
    if (res.success) { toast.success('User updated'); setEditOpen(false); setSelectedUser(null); loadUsers(); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setEditForm({ fullName: u.fullName, username: u.username, email: u.email, phone: u.phone || '', department: u.departmentId || '', password: '', status: u.status, roleIds: (u.userRoles as UserRole[])?.map(ur => ur.roleId) || [] });
    setEditOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !resetPwd) { toast.error('Enter a new password'); return; }
    setSaving(true);
    const res = await api.post(`/api/users/${selectedUser.id}/reset-password`, { password: resetPwd });
    if (res.success) { toast.success('Password reset'); setResetOpen(false); setResetPwd(''); setSelectedUser(null); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const toggleStatus = async (u: User) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    const res = await api.put(`/api/users/${u.id}`, { status: newStatus });
    if (res.success) { toast.success(`User ${newStatus}`); loadUsers(); } else { toast.error(res.error || 'Failed'); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} user(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Add User</Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden dark:bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Department</TableHead>
                <TableHead className="hidden md:table-cell">Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={Users} title="No users found" description="No users match your search criteria." /></TableCell></TableRow>
              ) : filteredUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(u.fullName)}</AvatarFallback></Avatar>
                      <span className="font-medium text-sm">{u.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{u.username}</TableCell>
                  <TableCell className="text-sm hidden md:table-cell">{u.email}</TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">{u.department?.name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles?.map(r => (<Badge key={r.id} variant="outline" style={{ borderColor: r.color || undefined, color: r.color || undefined }} className="text-[10px]">{r.name}</Badge>))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className={u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ''}>{u.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedUser(u); setResetPwd(''); setResetOpen(true); }}><Key className="h-3.5 w-3.5 mr-2" />Reset Password</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(u)}>{u.status === 'active' ? <UserPlus className="h-3.5 w-3.5 mr-2" /> : <UserMinus className="h-3.5 w-3.5 mr-2" />}{u.status === 'active' ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create User</DialogTitle><DialogDescription>Add a new user to the system.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Full Name *</Label><Input value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Username *</Label><Input value={createForm.username} onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Password *</Label><Input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {roles.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/30 cursor-pointer">
                    <input type="checkbox" checked={createForm.roleIds.includes(r.id)} onChange={e => setCreateForm(f => ({ ...f, roleIds: e.target.checked ? [...f.roleIds, r.id] : f.roleIds.filter(id => id !== r.id) }))} className="rounded" />
                    <span>{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={createForm.status} onValueChange={v => setCreateForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update user information.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Full Name *</Label><Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Username</Label><Input value={editForm.username} disabled className="bg-muted" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {roles.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/30 cursor-pointer">
                    <input type="checkbox" checked={editForm.roleIds.includes(r.id)} onChange={e => setEditForm(f => ({ ...f, roleIds: e.target.checked ? [...f.roleIds, r.id] : f.roleIds.filter(id => id !== r.id) }))} className="rounded" />
                    <span>{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle><DialogDescription>Set a new password for {selectedUser?.fullName}.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>New Password *</Label><Input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// SettingsRolesPage
export function SettingsRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [allRolePerms, setAllRolePerms] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [savingPerm, setSavingPerm] = useState(false);
  const [permFilter, setPermFilter] = useState('');

  const emptyRoleForm = { name: '', slug: '', description: '', level: 1 };
  const [createForm, setCreateForm] = useState(emptyRoleForm);
  const [editForm, setEditForm] = useState(emptyRoleForm);

  const permissionsByModule = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    if (!Array.isArray(permissions)) return map;
    permissions.forEach(p => { if (!map[p.module]) map[p.module] = []; map[p.module].push(p); });
    return map;
  }, [permissions]);

  useEffect(() => {
    Promise.all([
      api.get<Role[]>('/api/roles'),
      api.get<Permission[]>('/api/permissions'),
    ]).then(([rolesRes, permsRes]) => {
      const r = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      if (rolesRes.success && rolesRes.data) setRoles(r);
      if (r[0]) setSelectedRoleId(r[0].id);
      if (permsRes.success && permsRes.data) {
        const perms = Array.isArray(permsRes.data) ? permsRes.data : (permsRes.data as { all?: Permission[] }).all || [];
        setPermissions(perms);
      }
      setLoading(false);

      // Load permissions for ALL roles in background for summary counts
      r.forEach(role => {
        api.get<{ permissions: Permission[] }>(`/api/roles/${role.id}`).then(res => {
          if (res.success && res.data) {
            const p = (res.data as any).permissions || (res.data as any).rolePermissions || [];
            const permIds = Array.isArray(p) ? p.map((x: any) => typeof x === 'string' ? x : x.id) : [];
            setAllRolePerms(prev => ({ ...prev, [role.id]: permIds }));
          }
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    api.get<{ permissions: Permission[] }>(`/api/roles/${selectedRoleId}`).then(res => {
      if (res.success && res.data) {
        const p = (res.data as any).permissions || (res.data as any).rolePermissions || [];
        const permIds = Array.isArray(p) ? p.map((x: any) => typeof x === 'string' ? x : x.id) : [];
        setRolePerms(permIds);
        setAllRolePerms(prev => ({ ...prev, [selectedRoleId]: permIds }));
      }
    });
  }, [selectedRoleId]);

  const selectedRoleData = roles.find(r => r.id === selectedRoleId);

  const togglePermission = async (permId: string) => {
    const newPerms = rolePerms.includes(permId) ? rolePerms.filter(id => id !== permId) : [...rolePerms, permId];
    setRolePerms(newPerms);
    setSavingPerm(true);
    await api.put(`/api/roles/${selectedRoleId}/permissions`, { permissionIds: newPerms });
    setSavingPerm(false);
  };

  const handleCreateRole = async () => {
    if (!createForm.name || !createForm.slug) { toast.error('Name and slug required'); return; }
    setSaving(true);
    const res = await api.post('/api/roles', createForm);
    if (res.success) { toast.success('Role created'); setCreateOpen(false); setCreateForm(emptyRoleForm); api.get<Role[]>('/api/roles').then(r => { if (r.success && r.data) setRoles(Array.isArray(r.data) ? r.data : []); }); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const openEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditForm({ name: role.name, slug: role.slug, description: role.description || '', level: role.level });
    setEditOpen(true);
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const res = await api.put(`/api/roles/${selectedRole.id}`, { name: editForm.name, description: editForm.description, level: editForm.level });
    if (res.success) { toast.success('Role updated'); setEditOpen(false); api.get<Role[]>('/api/roles').then(r => { if (r.success && r.data) setRoles(Array.isArray(r.data) ? r.data : []); }); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) { toast.error('Cannot delete system role'); return; }
    const res = await api.delete(`/api/roles/${role.id}`);
    if (res.success) { toast.success('Role deleted'); if (selectedRoleId === role.id && roles[0]) setSelectedRoleId(roles[0].id); api.get<Role[]>('/api/roles').then(r => { if (r.success && r.data) setRoles(Array.isArray(r.data) ? r.data : []); }); } else { toast.error(res.error || 'Failed'); }
  };

  const totalPerms = permissions.length;
  const selectedPermCount = rolePerms.length;

  const moduleNames = useMemo(() => {
    const entries = Object.entries(permissionsByModule);
    if (!permFilter.trim()) return entries;
    const q = permFilter.toLowerCase();
    return entries
      .map(([mod, perms]) => [mod, perms.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))])
      .filter(([, perms]) => perms.length > 0);
  }, [permissionsByModule, permFilter]);
  const filteredPermTotal = useMemo(() => moduleNames.reduce((s, [, p]) => s + p.length, 0), [moduleNames]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Page header — shrinks, never scrolls */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 md:px-6 lg:px-8 py-4 lg:py-5 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Manage system roles and their associated permissions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"><Plus className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Create</span> Role</Button>
      </div>

      {/* ─── Mobile: Role selector dropdown above permissions ─── */}
      <div className="lg:hidden px-4 pb-3 shrink-0">
        <div className="relative">
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger className="w-full h-11 pl-3 pr-8">
              <div className="flex items-center gap-2.5">
                {selectedRoleData && (
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (selectedRoleData.color || '#10b981') + '18', color: selectedRoleData.color || '#10b981' }}>
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{selectedRoleData?.name || 'Select role'}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedPermCount} of {totalPerms} permissions</p>
                </div>
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {roles.map(role => {
                const rpIds = allRolePerms[role.id] || [];
                const count = role.id === selectedRoleId ? selectedPermCount : rpIds.length;
                return (
                  <SelectItem key={role.id} value={role.id} className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: (role.color || '#10b981') + '15', color: role.color || '#10b981' }}>
                        <Shield className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{role.name}</p>
                        <p className="text-[10px] text-muted-foreground">{count}/{totalPerms} perms</p>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {/* Mobile action buttons for selected role */}
          {selectedRoleData && (
            <div className="flex items-center gap-1.5 mt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEditRole(selectedRoleData)}>
                <Pencil className="h-3 w-3 mr-1" />Edit
              </Button>
              {!selectedRoleData.isSystem && (
                <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteRole(selectedRoleData)}>
                  <Trash2 className="h-3 w-3 mr-1" />Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout on desktop; single column on mobile/tablet */}
      <div className="flex gap-4 flex-1 min-h-0 mx-4 md:mx-6 lg:mx-8 mb-4 md:mb-6 lg:mb-8">

        {/* ─── Left Column: Role List — desktop only (hidden on mobile/tablet) ─── */}
        <Card className="hidden lg:flex border border-border/60 shadow-md w-60 shrink-0 flex-col overflow-hidden bg-muted/40 dark:bg-muted/20">
          <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roles ({roles.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {roles.map(role => {
              const isSelected = selectedRoleId === role.id;
              const rpIds = allRolePerms[role.id] || [];
              const count = isSelected ? selectedPermCount : rpIds.length;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted/60'}`}
                >
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (role.color || '#10b981') + (isSelected ? '28' : '15'), color: role.color || '#10b981' }}>
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{role.name}</p>
                      {role.isSystem && <span className="text-[7px] px-1 py-px rounded bg-muted text-muted-foreground font-bold shrink-0">SYS</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{count}/{totalPerms}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <button className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all shrink-0">
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditRole(role); }}><Pencil className="h-3 w-3 mr-2" />Edit</DropdownMenuItem>
                      {!role.isSystem && <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}><Trash2 className="h-3 w-3 mr-2" />Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ─── Right Column: Permissions (scrolls vertically) ─── */}
        <div className="flex-1 min-w-0 overflow-y-auto space-y-3 md:space-y-4 pr-0 lg:pr-1">
          {/* Role info header — desktop only (mobile shows selector above) */}
          {selectedRoleData && (
            <div className="hidden lg:flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: (selectedRoleData.color || '#10b981') + '18', color: selectedRoleData.color || '#10b981' }}>
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{selectedRoleData.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedRoleData.description || `Level ${selectedRoleData.level}`} &middot; {selectedPermCount} of {totalPerms} permissions enabled</p>
              </div>
            </div>
          )}

          {/* Permission search filter */}
          <div className="relative">
            <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter permissions..."
              value={permFilter}
              onChange={e => setPermFilter(e.target.value)}
              className="pl-8 md:pl-9 h-8 md:h-9 text-xs md:text-sm bg-muted/40 dark:bg-muted/20"
            />
            {permFilter && (
              <div className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground tabular-nums">{filteredPermTotal} of {totalPerms}</span>
                <button
                  onClick={() => setPermFilter('')}
                  className="h-4 w-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 flex items-center justify-center transition-colors"
                >
                  <X className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {moduleNames.map(([module, perms]) => {
            const moduleEnabledCount = perms.filter(p => rolePerms.includes(p.id)).length;
            const allEnabled = moduleEnabledCount === perms.length;
            return (
              <Card key={module} className="border-0 shadow-sm overflow-hidden">
                {/* Module header with master toggle */}
                <div
                  className={`flex items-center justify-between px-3 md:px-4 lg:px-5 py-2.5 md:py-3 lg:py-3.5 border-b transition-colors ${allEnabled ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40' : 'bg-muted/30 border-border/60'}`}
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className={`h-6 w-6 md:h-7 md:w-7 rounded-md flex items-center justify-center shrink-0 ${allEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      {allEnabled ? <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5" /> : <Settings className="h-3 w-3 md:h-3.5 md:w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-semibold truncate">{module.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-muted-foreground">{perms.length} permissions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <Badge variant="outline" className={`text-[10px] md:text-[11px] font-medium tabular-nums ${allEnabled ? 'border-emerald-300 text-emerald-600 dark:border-emerald-600 dark:text-emerald-400' : ''}`}>
                      {moduleEnabledCount}/{perms.length}
                    </Badge>
                    <Switch
                      checked={allEnabled}
                      onCheckedChange={() => {
                        if (allEnabled) {
                          const newPerms = rolePerms.filter(pid => !perms.some(p => p.id === pid));
                          setRolePerms(newPerms);
                          setSavingPerm(true);
                          api.put(`/api/roles/${selectedRoleId}/permissions`, { permissionIds: newPerms }).then(() => setSavingPerm(false));
                        } else {
                          const newPerms = [...new Set([...rolePerms, ...perms.map(p => p.id)])];
                          setRolePerms(newPerms);
                          setSavingPerm(true);
                          api.put(`/api/roles/${selectedRoleId}/permissions`, { permissionIds: newPerms }).then(() => setSavingPerm(false));
                        }
                      }}
                    />
                  </div>
                </div>
                {/* Permission items */}
                <div className="p-2 md:p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1 md:gap-1.5">
                  {perms.map(p => {
                    const isOn = rolePerms.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        className={`flex items-center gap-2 md:gap-2.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg transition-all cursor-pointer ${isOn ? 'bg-emerald-50/70 dark:bg-emerald-950/25' : 'hover:bg-muted/50 active:bg-muted/70'}`}
                        onClick={() => togglePermission(p.id)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePermission(p.id); } }}
                      >
                        <Switch checked={isOn} onCheckedChange={() => togglePermission(p.id)} className="scale-[0.65] md:scale-[0.72] shrink-0" onClick={e => e.stopPropagation()} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-[11px] md:text-xs font-medium truncate ${isOn ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{p.name}</p>
                          <p className="hidden sm:block text-[10px] text-muted-foreground/60 truncate">{p.slug}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Saving indicator */}
      {savingPerm && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border shadow-lg z-50">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
          <span className="text-xs font-medium text-muted-foreground">Saving permissions...</span>
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Role</DialogTitle><DialogDescription>Add a new role to the system.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Slug *</Label><Input value={createForm.slug} onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. technician" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Level</Label><Input type="number" min={1} max={100} value={createForm.level} onChange={e => setCreateForm(f => ({ ...f, level: parseInt(e.target.value) || 1 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Role</DialogTitle><DialogDescription>Update role information.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Slug</Label><Input value={editForm.slug} disabled={selectedRole?.isSystem} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))} className={selectedRole?.isSystem ? 'bg-muted' : ''} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Level</Label><Input type="number" min={1} max={100} value={editForm.level} onChange={e => setEditForm(f => ({ ...f, level: parseInt(e.target.value) || 1 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditRole} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// moduleIconMap + SettingsModulesPage
const moduleIconMap: Record<string, React.ElementType> = {
  core: Boxes,
  assets: Building2,
  maintenance_requests: ClipboardList,
  work_orders: Wrench,
  inventory: Package,
  pm_schedules: Calendar,
  analytics: BarChart3,
  production: Zap,
  quality: FlaskConical,
  safety: HardHat,
  iot_sensors: Radio,
  calibration: Ruler,
  downtime: Clock,
  meter_readings: Gauge,
  training: GraduationCap,
  risk_assessment: TriangleAlert,
  condition_monitoring: Activity,
  digital_twin: BrainCircuit,
  bom: Layers,
  failure_analysis: AlertCircle,
  rca_analysis: GitBranch,
  capa: ShieldCheck,
  reports: FileBarChart,
  vendors: Truck,
  tools: ScanLine,
  notifications: BellRing,
  documents: FolderOpen,
  modules: Cog,
  kpi_dashboard: PieChartIcon,
  predictive: TrendingUp,
  oee: Target,
  energy: Zap,
  shift_management: Clock,
  erp_integration: Link2,
  forecasting: TrendingUp,
};

export function SettingsModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('licensing');
  const [searchQuery, setSearchQuery] = useState('');
  const { hasPermission } = useAuthStore();
  const canLicense = hasPermission('modules.activate');
  const canManage = hasPermission('modules.manage');

  useEffect(() => {
    api.get<Module[]>('/api/modules').then(res => {
      if (res.success && res.data) setModules(res.data);
      setLoading(false);
    });
  }, []);

  // Derived stats
  const stats = useMemo(() => {
    const total = modules.length;
    const licensed = modules.filter(m => m.isActive || m.isCore).length;
    const active = modules.filter(m => m.isEnabled || m.isCore).length;
    const core = modules.filter(m => m.isCore).length;
    return { total, licensed, active, core };
  }, [modules]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase();
    return modules.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q)
    );
  }, [modules, searchQuery]);

  // Licensing tab shows all modules
  const licensingModules = filteredModules;
  // Activation tab shows only licensed modules
  const activationModules = filteredModules.filter(m => m.isActive || m.isCore);

  const handleLicenseToggle = async (mod: Module) => {
    if (mod.isCore) return;
    const nextIsActive = !mod.isActive;
    const res = await api.patch(`/api/modules/${mod.id}`, { isActive: nextIsActive });
    if (res.success) {
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, isActive: nextIsActive, isEnabled: nextIsActive ? m.isEnabled : false } : m));
      toast.success(`${mod.name} ${nextIsActive ? 'licensed successfully' : 'license revoked'}`);
    } else {
      toast.error(res.error || 'Failed to update module license');
    }
  };

  const handleEnableToggle = async (mod: Module) => {
    if (mod.isCore && mod.isEnabled) return;
    if (!mod.isActive && !mod.isCore) {
      toast.error('Module must be licensed by vendor before it can be enabled');
      return;
    }
    const nextIsEnabled = !mod.isEnabled;
    const res = await api.put(`/api/modules/${mod.id}`, { isEnabled: nextIsEnabled });
    if (res.success) {
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, isEnabled: nextIsEnabled } : m));
      toast.success(`${mod.name} ${nextIsEnabled ? 'activated' : 'deactivated'}`);
    } else {
      toast.error(res.error || 'Failed to update module');
    }
  };

  const getLicenseStatus = (mod: Module): { label: string; color: string } => {
    if (mod.isCore) return { label: 'Licensed (Core)', color: 'text-emerald-700 bg-emerald-50' };
    if (!mod.isActive) return { label: 'Unlicensed', color: 'text-slate-500 bg-slate-100' };
    if (mod.validUntil && new Date(mod.validUntil) < new Date()) return { label: 'Expired', color: 'text-red-600 bg-red-50' };
    return { label: 'Licensed', color: 'text-emerald-700 bg-emerald-50' };
  };

  const getCardBorderStyle = (mod: Module): string => {
    const isEnabled = mod.isEnabled || mod.isCore;
    const isActive = mod.isActive || mod.isCore;
    if (isEnabled) return 'ring-1 ring-emerald-200 dark:ring-emerald-800 border-0';
    if (isActive) return 'ring-1 ring-amber-200 dark:ring-amber-800 border-0';
    return 'border-0';
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Module Management</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Two-tier module system: vendor licensing controls availability, company activation enables features
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Modules</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Key className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Licensed</p>
                <p className="text-xl font-bold">{stats.licensed}<span className="text-sm text-muted-foreground font-normal ml-0.5">/{stats.total}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active</p>
                <p className="text-xl font-bold">{stats.active}<span className="text-sm text-muted-foreground font-normal ml-0.5">/{stats.total}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Core Modules</p>
                <p className="text-xl font-bold">{stats.core}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="licensing" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Module Licensing
            </TabsTrigger>
            <TabsTrigger value="activation" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Module Activation
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Licensing Tab */}
      {activeTab === 'licensing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {licensingModules.map(mod => {
            const Icon = moduleIconMap[mod.code] || Boxes;
            const licenseStatus = getLicenseStatus(mod);
            const borderStyle = getCardBorderStyle(mod);
            const isGreyedOut = !mod.isActive && !mod.isCore;

            return (
              <Card key={mod.id} className={`shadow-sm transition-all hover:shadow-md ${borderStyle} ${isGreyedOut ? 'opacity-60' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${mod.isActive || mod.isCore ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm truncate">{mod.name}</h3>
                          {mod.isCore ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-0.5">
                              <Lock className="h-2.5 w-2.5" />
                              CORE
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">OPTIONAL</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mod.description}</p>
                      </div>
                    </div>
                    {canLicense && (
                      <Switch
                        checked={mod.isActive || mod.isCore}
                        onCheckedChange={() => handleLicenseToggle(mod)}
                        disabled={mod.isCore}
                        className="shrink-0"
                      />
                    )}
                  </div>

                  {/* Module meta */}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-[10px] font-mono">{mod.code}</Badge>
                    <span className="text-[10px] text-muted-foreground">v{mod.version}</span>
                  </div>

                  {/* Status row */}
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">License Status</p>
                      <span className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded ${licenseStatus.color}`}>
                        {licenseStatus.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Activation</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${mod.isEnabled || mod.isCore ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[11px] font-medium">{mod.isEnabled || mod.isCore ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>

                  {/* License period & licensed by */}
                  {mod.isActive && (mod.validFrom || mod.validUntil || mod.licensedAt) && (
                    <div className="mt-2.5 pt-2.5 border-t space-y-1">
                      {mod.validFrom && mod.validUntil && (
                        <p className="text-[10px] text-muted-foreground">
                          <Calendar className="inline h-3 w-3 mr-1 -mt-px" />
                          {format(new Date(mod.validFrom), 'MMM d, yyyy')} — {format(new Date(mod.validUntil), 'MMM d, yyyy')}
                        </p>
                      )}
                      {mod.licensedAt && (
                        <p className="text-[10px] text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1 -mt-px" />
                          Licensed {formatDistanceToNow(new Date(mod.licensedAt), { addSuffix: true })}
                          {mod.licensedByUser && <> by {mod.licensedByUser.fullName}</>}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {licensingModules.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">No modules found</p>
              <p className="text-xs">Try adjusting your search query</p>
            </div>
          )}
        </div>
      )}

      {/* Activation Tab */}
      {activeTab === 'activation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activationModules.map(mod => {
            const Icon = moduleIconMap[mod.code] || Boxes;
            const borderStyle = getCardBorderStyle(mod);
            const isEnabled = mod.isEnabled || mod.isCore;

            return (
              <Card key={mod.id} className={`shadow-sm transition-all hover:shadow-md ${borderStyle}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm truncate">{mod.name}</h3>
                          {mod.isCore ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-0.5">
                              <Lock className="h-2.5 w-2.5" />
                              CORE
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">OPTIONAL</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mod.description}</p>
                      </div>
                    </div>
                    {canManage && (
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleEnableToggle(mod)}
                        disabled={mod.isCore && mod.isEnabled}
                        className="shrink-0"
                      />
                    )}
                  </div>

                  {/* Module meta */}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-[10px] font-mono">{mod.code}</Badge>
                    <span className="text-[10px] text-muted-foreground">v{mod.version}</span>
                  </div>

                  {/* Status row */}
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Status</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className={`text-[11px] font-medium ${isEnabled ? 'text-emerald-700' : 'text-amber-600'}`}>
                          {isEnabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Licensed</p>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-[11px] font-medium text-emerald-700">Yes</span>
                      </div>
                    </div>
                  </div>

                  {/* Activated date */}
                  {mod.activatedAt && (
                    <div className="mt-2.5 pt-2.5 border-t">
                      <p className="text-[10px] text-muted-foreground">
                        <CheckCircle2 className="inline h-3 w-3 mr-1 -mt-px text-emerald-500" />
                        Activated {formatDistanceToNow(new Date(mod.activatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  )}

                  {/* Inactive notice */}
                  {!isEnabled && !mod.isCore && (
                    <div className="mt-2.5 pt-2.5 border-t">
                      <p className="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1">
                        <AlertTriangle className="inline h-3 w-3 mr-1 -mt-px" />
                        Module is licensed but not yet activated
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {activationModules.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Key className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">No licensed modules</p>
              <p className="text-xs">License modules from the licensing tab first</p>
            </div>
          )}
        </div>
      )}

      {/* Permission notice */}
      {!canLicense && !canManage && (
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              You need <strong>modules.activate</strong> or <strong>modules.manage</strong> permission to manage modules. Contact your administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
// CompanyProfilePage
const defaultCompanyProfile: CompanyProfile = {
  id: '',
  companyName: '',
  tradingName: '',
  address: '',
  city: '',
  region: '',
  country: 'Ghana',
  postalCode: '',
  phone: '',
  email: '',
  website: '',
  industry: '',
  employeeCount: '',
  fiscalYearStart: 'January',
  timezone: 'Africa/Accra',
  currency: 'GHS',
  dateFormat: 'DD/MM/YYYY',
  isSetupComplete: false,
  createdAt: '',
  updatedAt: '',
};

export function CompanyProfilePage() {
  const [form, setForm] = useState<CompanyProfile>(defaultCompanyProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get<CompanyProfile>('/api/company-profile').then(res => {
      if (res.success && res.data) setForm(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 2MB');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Invalid file type. Allowed: PNG, JPEG, GIF, WebP, SVG');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/upload', formData);
      if (res.success && res.data?.url) {
        // Save the logo URL to company profile
        const profileRes = await api.put('/api/company-profile', { ...form, logo: res.data.url, isSetupComplete: true });
        if (profileRes.success && profileRes.data) {
          setForm(profileRes.data);
          toast.success('Logo uploaded successfully');
        } else {
          toast.error(profileRes.error || 'Failed to save logo');
        }
      } else {
        toast.error(res.error || 'Failed to upload logo');
      }
    } catch {
      toast.error('Failed to upload logo');
    }
    setUploading(false);
    // Reset file input
    e.target.value = '';
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    try {
      const profileRes = await api.put('/api/company-profile', { ...form, logo: null, isSetupComplete: true });
      if (profileRes.success && profileRes.data) {
        setForm(profileRes.data);
        toast.success('Logo removed');
      } else {
        toast.error(profileRes.error || 'Failed to remove logo');
      }
    } catch {
      toast.error('Failed to remove logo');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    const res = await api.put<CompanyProfile>('/api/company-profile', {
      ...form,
      isSetupComplete: true,
    });
    if (res.success && res.data) {
      setForm(res.data);
      toast.success('Company profile saved successfully');
    } else {
      toast.error(res.error || 'Failed to save company profile');
    }
    setSaving(false);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your organization details and information</p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* Company Logo Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Company Logo</CardTitle>
            <CardDescription>Upload your company logo for branding (PNG, JPEG, WebP, SVG — max 2MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 overflow-hidden border-2 border-white/20 shadow-sm">
                {form.logo ? (
                  <img src={form.logo} alt="Company Logo" className="h-full w-full object-cover" />
                ) : (
                  <Factory className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                  </label>
                  {form.logo && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemoveLogo} disabled={uploading}>
                      <Trash2 className="h-3 w-3 mr-1" />Remove
                    </Button>
                  )}
                </div>
                {uploading && (
                  <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse w-full" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Company Details</CardTitle>
            <CardDescription>Basic information about your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium">Company Name *</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  placeholder="Enter legal company name"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradingName" className="text-sm font-medium">Trading Name</Label>
                <Input
                  id="tradingName"
                  value={form.tradingName || ''}
                  onChange={e => handleChange('tradingName', e.target.value)}
                  placeholder="Enter trading/brand name"
                  className="h-10"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                <Textarea
                  id="address"
                  value={form.address || ''}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="Enter street address"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">City</Label>
                <Input
                  id="city"
                  value={form.city || ''}
                  onChange={e => handleChange('city', e.target.value)}
                  placeholder="Enter city"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region" className="text-sm font-medium">Region / State</Label>
                <Input
                  id="region"
                  value={form.region || ''}
                  onChange={e => handleChange('region', e.target.value)}
                  placeholder="Enter region or state"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                <Input
                  id="country"
                  value={form.country || ''}
                  onChange={e => handleChange('country', e.target.value)}
                  placeholder="Enter country"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-sm font-medium">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={form.postalCode || ''}
                  onChange={e => handleChange('postalCode', e.target.value)}
                  placeholder="Enter postal code"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Contact Information</CardTitle>
            <CardDescription>How people can reach your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone || ''}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+233 XX XXX XXXX"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cemail" className="text-sm font-medium">Email</Label>
                <Input
                  id="cemail"
                  type="email"
                  value={form.email || ''}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="info@company.com"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                <Input
                  id="website"
                  value={form.website || ''}
                  onChange={e => handleChange('website', e.target.value)}
                  placeholder="https://www.company.com"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Industry & Size */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Industry &amp; Organization</CardTitle>
            <CardDescription>Industry and organization size details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Industry</Label>
                <Select value={form.industry || ''} onValueChange={v => handleChange('industry', v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="energy">Energy &amp; Utilities</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="transportation">Transportation &amp; Logistics</SelectItem>
                    <SelectItem value="mining">Mining &amp; Resources</SelectItem>
                    <SelectItem value="oil_gas">Oil &amp; Gas</SelectItem>
                    <SelectItem value="telecommunications">Telecommunications</SelectItem>
                    <SelectItem value="food_beverage">Food &amp; Beverage</SelectItem>
                    <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem>
                    <SelectItem value="real_estate">Real Estate &amp; Facilities</SelectItem>
                    <SelectItem value="government">Government &amp; Public Sector</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Number of Employees</Label>
                <Select value={form.employeeCount || ''} onValueChange={v => handleChange('employeeCount', v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1 - 10</SelectItem>
                    <SelectItem value="11-50">11 - 50</SelectItem>
                    <SelectItem value="51-200">51 - 200</SelectItem>
                    <SelectItem value="201-500">201 - 500</SelectItem>
                    <SelectItem value="501-1000">501 - 1,000</SelectItem>
                    <SelectItem value="1001-5000">1,001 - 5,000</SelectItem>
                    <SelectItem value="5001+">5,001+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Currency</Label>
                <Select value={form.currency || 'GHS'} onValueChange={v => handleChange('currency', v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GHS">GHS - Ghana Cedi</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Timezone</Label>
                <Select value={form.timezone || 'Africa/Accra'} onValueChange={v => handleChange('timezone', v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Accra">GMT (Africa/Accra)</SelectItem>
                    <SelectItem value="Africa/Lagos">WAT (Africa/Lagos)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Europe/London">GMT (Europe/London)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS - PLANTS
// ============================================================================

// SettingsPlantsPage
export function SettingsPlantsPage() {
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', location: '', country: '', city: '' });

  const loadPlants = useCallback(() => {
    api.get<any[]>('/api/plants').then(res => { if (res.success && res.data) setPlants(Array.isArray(res.data) ? res.data : []); setLoading(false); });
  }, []);

  useEffect(() => { loadPlants(); }, [loadPlants]);

  const openCreate = () => { setEditId(null); setForm({ name: '', code: '', location: '', country: '', city: '' }); setDialogOpen(true); };
  const openEdit = (p: any) => { setEditId(p.id); setForm({ name: p.name, code: p.code, location: p.location || '', country: p.country || '', city: p.city || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and code required'); return; }
    setSaving(true);
    const res = editId ? await api.put(`/api/plants/${editId}`, form) : await api.post('/api/plants', form);
    if (res.success) { toast.success(editId ? 'Plant updated' : 'Plant created'); setDialogOpen(false); loadPlants(); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const handleDelete = async (p: any) => {
    const res = await api.delete(`/api/plants/${p.id}`);
    if (res.success) { toast.success('Plant deleted'); loadPlants(); } else { toast.error(res.error || 'Failed'); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plants</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage plant locations and facilities</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Add Plant</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plants.length === 0 ? (
          <div className="col-span-full"><EmptyState icon={Factory} title="No plants" description="Create your first plant to get started." /></div>
        ) : plants.map(p => (
          <Card key={p.id} className="border-0 shadow-sm dark:bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-900/30 dark:text-emerald-400"><Factory className="h-5 w-5" /></div>
                  <div>
                    <CardTitle className="text-sm">{p.name}</CardTitle>
                    <CardDescription className="text-xs font-mono">{p.code}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={p.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {p.location && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{p.location}</div>}
                {(p.city || p.country) && <div>{p.city}{p.city && p.country ? ', ' : ''}{p.country}</div>}
                <div className="flex items-center gap-2 pt-1">
                  {(p as any)._count?.departments !== undefined && (
                    <Badge variant="outline" className="text-[10px]"><Building2 className="h-2.5 w-2.5 mr-1" />{(p as any)._count.departments} Dept(s)</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Plant' : 'Create Plant'}</DialogTitle><DialogDescription>{editId ? 'Update plant details.' : 'Add a new plant location.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Street address" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}{editId ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SETTINGS - DEPARTMENTS
// ============================================================================

export function SettingsDepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', plantId: '', parentId: '', supervisorId: '' });

  const loadData = useCallback(() => {
    Promise.all([api.get<any[]>('/api/departments'), api.get<any[]>('/api/plants')]).then(([deptRes, plantRes]) => {
      if (deptRes.success && deptRes.data) setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      if (plantRes.success && plantRes.data) setPlants(Array.isArray(plantRes.data) ? plantRes.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => { setEditId(null); setForm({ name: '', code: '', plantId: '', parentId: '', supervisorId: '' }); setDialogOpen(true); };
  const openEdit = (d: any) => { setEditId(d.id); setForm({ name: d.name, code: d.code, plantId: d.plantId || '', parentId: d.parentId || '', supervisorId: d.supervisorId || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and code required'); return; }
    setSaving(true);
    const res = editId ? await api.put(`/api/departments/${editId}`, form) : await api.post('/api/departments', form);
    if (res.success) { toast.success(editId ? 'Department updated' : 'Department created'); setDialogOpen(false); loadData(); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const handleDelete = async (d: any) => {
    if (d._count?.children > 0) { toast.error('Cannot delete department with children'); return; }
    const res = await api.delete(`/api/departments/${d.id}`);
    if (res.success) { toast.success('Department deleted'); loadData(); } else { toast.error(res.error || 'Failed'); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage organizational departments</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Add Department</Button>
      </div>
      <Card className="border-0 shadow-sm dark:bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Plant</TableHead>
                <TableHead className="hidden lg:table-cell">Supervisor</TableHead>
                <TableHead className="hidden md:table-cell">Children</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-48"><EmptyState icon={Building2} title="No departments" description="Create your first department." /></TableCell></TableRow>
              ) : departments.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-sm">{d.name}</TableCell>
                  <TableCell className="font-mono text-xs">{d.code}</TableCell>
                  <TableCell className="text-sm hidden md:table-cell">{d.plant?.name || '-'}</TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">{(d as any).supervisor?.fullName || d.supervisorId || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(d as any)._count?.children !== undefined ? (
                      <Badge variant="outline" className="text-[10px]">{(d as any)._count.children}</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(d)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Department' : 'Create Department'}</DialogTitle><DialogDescription>{editId ? 'Update department details.' : 'Add a new department.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Plant</Label>
              <Select value={form.plantId} onValueChange={v => setForm(f => ({ ...f, plantId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
                <SelectContent>{plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Parent Department</Label>
              <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.filter(d => d.id !== editId).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Supervisor ID</Label><Input value={form.supervisorId} onChange={e => setForm(f => ({ ...f, supervisorId: e.target.value }))} placeholder="User ID" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}{editId ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigationStore(s => s.navigate);

  const loadNotifications = useCallback(() => {
    api.get<Notification[]>('/api/notifications').then(res => { if (res.success && res.data) setNotifications(Array.isArray(res.data) ? res.data : []); setLoading(false); });
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAllRead = async () => {
    await api.put('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const markRead = async (n: Notification) => {
    if (n.isRead) return;
    await api.put(`/api/notifications/${n.id}`);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    if (n.actionUrl) {
      navigate(n.actionUrl as PageName);
    }
  };

  const typeColors: Record<string, string> = {
    mr_assigned: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    wo_assigned: 'bg-sky-50 text-sky-500 dark:bg-sky-950/30 dark:text-sky-300',
    wo_completed: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    system: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
    info: 'bg-slate-50 text-slate-500 dark:bg-slate-800/30 dark:text-slate-400',
  };

  const typeIcons: Record<string, React.ElementType> = {
    mr_assigned: ClipboardList,
    wo_assigned: Wrench,
    wo_completed: CheckCircle2,
    system: Settings,
    info: MessageSquare,
  };

  if (loading) return <LoadingSkeleton />;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">{unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} className="gap-1.5"><Check className="h-4 w-4" />Mark All Read</Button>
        )}
      </div>
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
        ) : notifications.map(n => {
          const Icon = typeIcons[n.type] || MessageSquare;
          const colorClass = typeColors[n.type] || typeColors.info;
          return (
            <Card key={n.id} className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md dark:bg-card ${!n.isRead ? 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400' : 'opacity-70'}`} onClick={() => markRead(n)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback((entity: string, action: string) => {
    let url = '/api/audit-logs';
    const params: string[] = [];
    if (entity !== 'all') params.push(`entityType=${entity}`);
    if (action !== 'all') params.push(`action=${action}`);
    if (params.length) url += '?' + params.join('&');
    api.get<any[]>(url).then(res => { if (res.success && res.data) setLogs(Array.isArray(res.data) ? res.data : []); setLoading(false); });
  }, []);

  useEffect(() => { fetchLogs(entityFilter, actionFilter); }, [entityFilter, actionFilter, fetchLogs]);

  const handleEntityChange = (value: string) => { setLoading(true); setEntityFilter(value); };
  const handleActionChange = (value: string) => { setLoading(true); setActionFilter(value); };

  const actionColors: Record<string, string> = {
    create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    update: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all system changes and actions</p>
      </div>
      <div className="filter-row flex flex-wrap gap-3">
        <Select value={entityFilter} onValueChange={handleEntityChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Entity Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="maintenance_request">Maintenance Request</SelectItem>
            <SelectItem value="work_order">Work Order</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="plant">Plant</SelectItem>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={handleActionChange}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="border-0 shadow-sm dark:bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Entity Type</TableHead>
                <TableHead className="hidden md:table-cell">Entity ID</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-48"><EmptyState icon={Eye} title="No audit logs" description="No logs match your filter criteria." /></TableCell></TableRow>
              ) : logs.map(log => (
                <React.Fragment key={log.id}>
                  <TableRow className="cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="text-sm">{(log as any).user?.fullName || log.userId || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${actionColors[log.action] || ''}`}>{log.action?.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono hidden md:table-cell">{log.entityType || '-'}</TableCell>
                    <TableCell className="text-xs font-mono hidden md:table-cell">{log.entityId ? log.entityId.slice(0, 8) + '...' : '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === log.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 px-8 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {log.oldValues && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Old Values</p>
                              <pre className="text-xs bg-background rounded-lg p-3 overflow-x-auto max-h-40 dark:bg-card">{typeof log.oldValues === 'string' ? log.oldValues : JSON.stringify(log.oldValues, null, 2)}</pre>
                            </div>
                          )}
                          {log.newValues && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">New Values</p>
                              <pre className="text-xs bg-background rounded-lg p-3 overflow-x-auto max-h-40 dark:bg-card">{typeof log.newValues === 'string' ? log.newValues : JSON.stringify(log.newValues, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// ASSETS PAGE
// ============================================================================

// General/Notifications/Integrations/Backup
export function SettingsGeneralPage() {
  const [profile, setProfile] = useState<CompanyProfile>(defaultCompanyProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CompanyProfile>('/api/company-profile').then(res => {
      if (res.success && res.data) {
        setProfile(prev => ({ ...prev, ...res.data }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile.companyName.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      const res = await api.put('/api/company-profile', {
        companyName: profile.companyName,
        tradingName: profile.tradingName,
        address: profile.address,
        city: profile.city,
        region: profile.region,
        country: profile.country,
        postalCode: profile.postalCode,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        industry: profile.industry,
        employeeCount: profile.employeeCount,
        fiscalYearStart: profile.fiscalYearStart,
        timezone: profile.timezone,
        currency: profile.currency,
        dateFormat: profile.dateFormat,
      });
      if (res.success) {
        toast.success('General settings saved');
      } else {
        toast.error(res.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center min-h-[40vh]">
        <div className="text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Loading settings…</p></div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">General Settings</h1><p className="text-muted-foreground mt-1">Configure system-wide preferences and defaults</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Company Info</CardTitle><CardDescription>Organization identification and address</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Company Name *</Label><Input value={profile.companyName || ''} onChange={e => handleChange('companyName', e.target.value)} placeholder="Legal company name" /></div>
            <div className="space-y-2"><Label>Trading Name</Label><Input value={profile.tradingName || ''} onChange={e => handleChange('tradingName', e.target.value)} placeholder="Display / brand name" /></div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={profile.address || ''} onChange={e => handleChange('address', e.target.value)} placeholder="Street address" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>City</Label><Input value={profile.city || ''} onChange={e => handleChange('city', e.target.value)} placeholder="City" /></div>
              <div className="space-y-2"><Label>Region / State</Label><Input value={profile.region || ''} onChange={e => handleChange('region', e.target.value)} placeholder="Region" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Country</Label><Input value={profile.country || ''} onChange={e => handleChange('country', e.target.value)} placeholder="Country" /></div>
              <div className="space-y-2"><Label>Postal Code</Label><Input value={profile.postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} placeholder="Postal code" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="+233 XX XXX XXXX" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={profile.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="info@company.com" /></div>
            </div>
            <div className="space-y-2"><Label>Website</Label><Input value={profile.website || ''} onChange={e => handleChange('website', e.target.value)} placeholder="https://www.company.com" /></div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Business Details</CardTitle><CardDescription>Industry and organization information</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={profile.industry || ''} onValueChange={v => handleChange('industry', v)}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="energy">Energy &amp; Utilities</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="transportation">Transportation &amp; Logistics</SelectItem>
                  <SelectItem value="mining">Mining &amp; Resources</SelectItem>
                  <SelectItem value="oil_gas">Oil &amp; Gas</SelectItem>
                  <SelectItem value="telecommunications">Telecommunications</SelectItem>
                  <SelectItem value="food_beverage">Food &amp; Beverage</SelectItem>
                  <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem>
                  <SelectItem value="real_estate">Real Estate &amp; Facilities</SelectItem>
                  <SelectItem value="government">Government &amp; Public Sector</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Employees</Label>
              <Select value={profile.employeeCount || ''} onValueChange={v => handleChange('employeeCount', v)}>
                <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1 - 10</SelectItem>
                  <SelectItem value="11-50">11 - 50</SelectItem>
                  <SelectItem value="51-200">51 - 200</SelectItem>
                  <SelectItem value="201-500">201 - 500</SelectItem>
                  <SelectItem value="501-1000">501 - 1,000</SelectItem>
                  <SelectItem value="1001-5000">1,001 - 5,000</SelectItem>
                  <SelectItem value="5001+">5,001+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fiscal Year Start</Label>
              <Select value={profile.fiscalYearStart || 'January'} onValueChange={v => handleChange('fiscalYearStart', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* System Information */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">System Information</p>
              {[
                { label: 'Version', value: '2.0.0' },
                { label: 'Environment', value: 'Production' },
                { label: 'Database', value: 'SQLite' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center py-2 border-b last:border-0"><span className="text-sm text-muted-foreground">{r.label}</span><span className="text-sm font-medium">{r.value}</span></div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Display Settings</CardTitle><CardDescription>Regional preferences, locale, and formatting</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={profile.timezone || 'UTC'} onValueChange={v => handleChange('timezone', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Africa/Accra">GMT (Africa/Accra)</SelectItem>
                    <SelectItem value="Africa/Lagos">WAT (Africa/Lagos)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={profile.currency || 'GHS'} onValueChange={v => handleChange('currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GHS">GHS (₵)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select value={profile.dateFormat || 'DD/MM/YYYY'} onValueChange={v => handleChange('dateFormat', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="DD-MMM-YYYY">DD-MMM-YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value="en" onValueChange={() => { /* placeholder for future i18n */ }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={saving}>{saving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}</Button>
    </div>
  );
}

export function SettingsNotificationsPage() {
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState(() => {
    try { const s = localStorage.getItem('iassetspro_notif_settings'); if (s) { const saved = JSON.parse(s); return saved.channels || { inApp: true, email: true, emailAddr: 'admin@company.com', sms: false, phone: '' }; } } catch { /* ignore */ }
    return { inApp: true, email: true, emailAddr: 'admin@company.com', sms: false, phone: '' };
  });
  const [quietHours, setQuietHours] = useState(() => {
    try { const s = localStorage.getItem('iassetspro_notif_settings'); if (s) { const saved = JSON.parse(s); return saved.quietHours || { enabled: false, start: '22:00', end: '07:00', timezone: 'UTC' }; } } catch { /* ignore */ }
    return { enabled: false, start: '22:00', end: '07:00', timezone: 'UTC' };
  });
  const [notifTypes, setNotifTypes] = useState(() => {
    try { const s = localStorage.getItem('iassetspro_notif_settings'); if (s) { const saved = JSON.parse(s); return saved.notifTypes || { woAssigned: true, woStatusChange: true, mrApprovedRejected: true, pmDue: true, lowStockAlert: true, assetConditionAlert: false, systemNotifications: true }; } } catch { /* ignore */ }
    return { woAssigned: true, woStatusChange: true, mrApprovedRejected: true, pmDue: true, lowStockAlert: true, assetConditionAlert: false, systemNotifications: true };
  });

  const typeLabels: Record<string, { label: string; desc: string }> = {
    woAssigned: { label: 'WO Assigned', desc: 'When a work order is assigned to you' },
    woStatusChange: { label: 'WO Status Change', desc: 'Status updates on work orders you follow' },
    mrApprovedRejected: { label: 'MR Approved/Rejected', desc: 'Maintenance request approval decisions' },
    pmDue: { label: 'PM Due', desc: 'Preventive maintenance schedule reminders' },
    lowStockAlert: { label: 'Low Stock Alert', desc: 'Inventory items below reorder point' },
    assetConditionAlert: { label: 'Asset Condition Alert', desc: 'Assets with degraded condition readings' },
    systemNotifications: { label: 'System Notifications', desc: 'System updates, maintenance windows' },
  };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('iassetspro_notif_settings', JSON.stringify({ channels, quietHours, notifTypes }));
    toast.success('Notification preferences saved');
    setSaving(false);
  };

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification Preferences</h1>
        <p className="text-muted-foreground mt-1">Configure how and when you receive notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Channels */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notification Channels</CardTitle><CardDescription>Choose where to receive notifications</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div><Label className="text-sm font-medium">In-App Notifications</Label><p className="text-xs text-muted-foreground mt-0.5">Receive notifications within the application</p></div>
              <Switch checked={channels.inApp} onCheckedChange={v => setChannels(c => ({ ...c, inApp: v }))} />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div><Label className="text-sm font-medium">Email Notifications</Label><p className="text-xs text-muted-foreground mt-0.5">Receive notifications via email</p></div>
                <Switch checked={channels.email} onCheckedChange={v => setChannels(c => ({ ...c, email: v }))} />
              </div>
              {channels.email && (
                <div className="space-y-2 pl-1"><Label className="text-xs">Email Address</Label><Input value={channels.emailAddr} onChange={e => setChannels(c => ({ ...c, emailAddr: e.target.value }))} placeholder="admin@company.com" /></div>
              )}
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div><Label className="text-sm font-medium">SMS Notifications</Label><p className="text-xs text-muted-foreground mt-0.5">Receive critical alerts via SMS</p></div>
                <Switch checked={channels.sms} onCheckedChange={v => setChannels(c => ({ ...c, sms: v }))} />
              </div>
              {channels.sms && (
                <div className="space-y-2 pl-1"><Label className="text-xs">Phone Number</Label><Input value={channels.phone} onChange={e => setChannels(c => ({ ...c, phone: e.target.value }))} placeholder="+1 234 567 8900" /></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader><CardTitle className="text-base">Quiet Hours</CardTitle><CardDescription>Pause non-critical notifications during specified hours</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label className="text-sm font-medium">Enable Quiet Hours</Label><p className="text-xs text-muted-foreground mt-0.5">Only urgent alerts will be sent</p></div>
              <Switch checked={quietHours.enabled} onCheckedChange={v => setQuietHours(q => ({ ...q, enabled: v }))} />
            </div>
            {quietHours.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs">Start Time</Label><Input type="time" value={quietHours.start} onChange={e => setQuietHours(q => ({ ...q, start: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="text-xs">End Time</Label><Input type="time" value={quietHours.end} onChange={e => setQuietHours(q => ({ ...q, end: e.target.value }))} /></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Timezone</Label>
                  <Select value={quietHours.timezone} onValueChange={v => setQuietHours(q => ({ ...q, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Africa/Accra">Accra (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Notification Types</CardTitle><CardDescription>Toggle specific notification categories</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              {Object.entries(typeLabels).map(([key, { label, desc }]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div><Label className="text-sm font-medium">{label}</Label><p className="text-xs text-muted-foreground mt-0.5">{desc}</p></div>
                  <Switch checked={notifTypes[key as keyof typeof notifTypes]} onCheckedChange={v => setNotifTypes(n => ({ ...n, [key]: v }))} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={saving}>{saving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Preferences'}</Button>
    </div>
  );
}
export function SettingsIntegrationsPage() {
  const [configOpen, setConfigOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [configForm, setConfigForm] = useState({ url: '', apiKey: '', username: '', password: '', webhookUrl: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverConfigs, setServerConfigs] = useState<Record<string, any>>({});

  const defaultIntegrations = [
    { id: 'erp', name: 'ERP Integration', description: 'Connect to your enterprise resource planning system for data synchronization', icon: Server, connected: false, fields: ['url', 'apiKey', 'username', 'password'] },
    { id: 'iot', name: 'IoT Platform', description: 'Stream sensor data from IoT devices and gateways into iAssetsPro', icon: Cpu, connected: false, fields: ['url', 'apiKey'] },
    { id: 'email', name: 'Email Server', description: 'Configure SMTP settings for email notifications and reports delivery', icon: Mail, connected: false, fields: ['url', 'username', 'password'] },
    { id: 'sms', name: 'SMS Gateway', description: 'Set up SMS delivery for critical alerts via your preferred gateway', icon: Smartphone, connected: false, fields: ['url', 'apiKey'] },
    { id: 'webhooks', name: 'Webhooks', description: 'Send real-time event notifications to external systems via webhooks', icon: Globe, connected: false, fields: ['webhookUrl'] },
    { id: 'ldap', name: 'LDAP / Active Directory', description: 'Sync users and authenticate via your organization\'s directory service', icon: Shield, connected: false, fields: ['url', 'username', 'password'] },
  ];

  const [integrations, setIntegrations] = useState(defaultIntegrations);

  useEffect(() => {
    api.get<Record<string, any>>('/api/settings/integrations').then(res => {
      if (res.success && res.data) {
        setServerConfigs(res.data);
        setIntegrations(prev => prev.map(i => ({ ...i, connected: !!res.data?.[i.id] })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openConfig = (integ: any) => {
    setSelected(integ);
    const stored = serverConfigs[integ.id];
    if (stored) {
      setConfigForm({ url: stored.url || '', apiKey: stored.apiKey || '', username: stored.username || '', password: stored.password || '', webhookUrl: stored.webhookUrl || '' });
    } else {
      setConfigForm({ url: '', apiKey: '', username: '', password: '', webhookUrl: '' });
    }
    setConfigOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.put('/api/settings/integrations', {
        integrationId: selected.id,
        config: { ...configForm, connected: true },
      });
      if (res.success) {
        setServerConfigs(prev => ({ ...prev, [selected.id]: { ...configForm, connected: true } }));
        setIntegrations(prev => prev.map(i => i.id === selected.id ? { ...i, connected: true } : i));
        toast.success(`${selected.name} configuration saved`);
      } else {
        toast.error(res.error || 'Failed to save configuration');
      }
    } catch {
      toast.error('Failed to save configuration');
    }
    setConfigOpen(false);
    setSelected(null);
    setSaving(false);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect with third-party systems and external services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map(integ => {
          const I = integ.icon;
          return (
            <Card key={integ.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${integ.connected ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-muted'}`}>
                    <I className={`h-5 w-5 ${integ.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{integ.name}</h3>
                      <Badge variant="outline" className={`text-[10px] ${integ.connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {integ.connected ? (
                          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Connected</span>
                        ) : 'Not Connected'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{integ.description}</p>
                    <Button variant={integ.connected ? 'outline' : 'default'} size="sm" className={integ.connected ? '' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} onClick={() => openConfig(integ)}>
                      {integ.connected ? <><Settings className="h-3.5 w-3.5 mr-1" />Configure</> : <><Link2 className="h-3.5 w-3.5 mr-1" />Connect</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configure Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.connected ? 'Configure' : 'Connect'} {selected?.name}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selected?.fields?.includes('url') && (
              <div className="space-y-2"><Label>Server URL</Label><Input value={configForm.url} onChange={e => setConfigForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com/api" /></div>
            )}
            {selected?.fields?.includes('apiKey') && (
              <div className="space-y-2"><Label>API Key</Label><Input type="password" value={configForm.apiKey} onChange={e => setConfigForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="Enter API key" /></div>
            )}
            {selected?.fields?.includes('username') && (
              <div className="space-y-2"><Label>Username</Label><Input value={configForm.username} onChange={e => setConfigForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" /></div>
            )}
            {selected?.fields?.includes('password') && (
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={configForm.password} onChange={e => setConfigForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" /></div>
            )}
            {selected?.fields?.includes('webhookUrl') && (
              <div className="space-y-2"><Label>Webhook URL</Label><Input value={configForm.webhookUrl} onChange={e => setConfigForm(f => ({ ...f, webhookUrl: e.target.value }))} placeholder="https://your-server.com/webhook" /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Saving...' : selected?.connected ? 'Save Configuration' : 'Connect'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function SettingsBackupPage() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupHistory, setBackupHistory] = useState<Array<{ id: string; date: string; type: string; size: string; status: string }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadBackupHistory = useCallback(() => {
    api.get<Array<{ id: string; date: string; type: string; size: string; status: string }>>('/api/backups').then(res => {
      if (res.success && res.data) setBackupHistory(res.data);
      setLoadingHistory(false);
    }).catch(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    loadBackupHistory();
  }, [loadBackupHistory]);

  const lastBackup = backupHistory.find(b => b.status === 'completed');

  const summaryCards = [
    { label: 'Last Backup', value: lastBackup?.date ? format(new Date(lastBackup.date), 'MMM d, HH:mm') : 'Never', icon: History, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Backup Size', value: lastBackup?.size || '-', icon: Database, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Auto-backup', value: 'Enabled', icon: RefreshCw, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Total Backups', value: backupHistory.filter(b => b.status === 'completed').length.toString(), icon: Layers, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const endpoints = ['/api/company-profile', '/api/assets?limit=9999', '/api/inventory?limit=9999', '/api/work-orders?limit=9999', '/api/maintenance-requests?limit=9999'];
      const keys = ['companyProfile', 'assets', 'inventory', 'workOrders', 'maintenanceRequests'];
      const results: Record<string, any> = { exportedAt: new Date().toISOString(), version: '2.0.0' };
      await Promise.all(endpoints.map(async (ep, i) => {
        const res = await api.get(ep);
        results[keys[i]] = res.data || res;
      }));
      const jsonStr = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iassetspro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Record the backup in history via API
      const sizeKB = new Blob([jsonStr]).size / 1024;
      const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(1)} KB`;
      await api.post('/api/backups', { type: 'Manual', size: sizeStr, status: 'completed' });
      loadBackupHistory();

      toast.success('Backup completed and downloaded successfully');
    } catch (err: any) {
      // Record failed backup
      await api.post('/api/backups', { type: 'Manual', size: '0 KB', status: 'failed' }).catch(() => {});
      loadBackupHistory();
      toast.error(err.message || 'Backup failed');
    }
    setBackingUp(false);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleRestore = async () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.exportedAt) {
        toast.error('Invalid backup file format');
      } else {
        toast.success(`Backup file loaded (${new Date(data.exportedAt).toLocaleString()}). Restore would require a dedicated server endpoint.`);
      }
    } catch {
      toast.error('Failed to read backup file');
    }
    setRestoring(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = async (type: string) => {
    let endpoint = '';
    let filename = '';
    if (type === 'Assets') { endpoint = '/api/assets?limit=9999'; filename = 'assets.csv'; }
    else if (type === 'Inventory') { endpoint = '/api/inventory?limit=9999'; filename = 'inventory.csv'; }
    else if (type === 'Work Orders') { endpoint = '/api/work-orders?limit=9999'; filename = 'work-orders.csv'; }
    if (!endpoint) return;
    try {
      const res = await api.get(endpoint);
      const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (items.length === 0) { toast.info(`No ${type.toLowerCase()} data to export`); return; }
      const headers = Object.keys(items[0]);
      const csvRows = [headers.join(',')];
      for (const item of items) {
        csvRows.push(headers.map(h => {
          const val = String(item[h] ?? '');
          return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iassetspro-${filename}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type} exported successfully`);
    } catch {
      toast.error(`Failed to export ${type.toLowerCase()}`);
    }
  };

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Backup & Restore</h1>
        <p className="text-muted-foreground mt-1">Manage system backups, data exports, and disaster recovery</p>
      </div>
      <input ref={fileInputRef} type="file" accept=".json,.sql,.zip" className="hidden" onChange={onFileSelected} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`h-10 w-10 rounded-lg ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-lg font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Backup */}
        <Card>
          <CardHeader><CardTitle className="text-base">Manual Backup</CardTitle><CardDescription>Create an immediate backup of all system data</CardDescription></CardHeader>
          <CardContent>
            <Button onClick={handleBackup} disabled={backingUp} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
              {backingUp ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Creating Backup...</> : <><Database className="h-4 w-4 mr-2" />Create Backup Now</>}
            </Button>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader><CardTitle className="text-base">Data Export</CardTitle><CardDescription>Export specific data as CSV files</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Assets', icon: Box },
                { label: 'Inventory', icon: Package },
                { label: 'Work Orders', icon: ClipboardList },
              ].map(exp => {
                const I = exp.icon;
                return (
                  <Button key={exp.label} variant="outline" onClick={() => handleExport(exp.label)} className="h-auto py-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <I className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs">Export {exp.label} CSV</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Restore */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Restore Data</CardTitle><CardDescription>Upload a backup file to restore system data</CardDescription></CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-emerald-300 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Drag & drop backup file here</p>
              <p className="text-xs text-muted-foreground mb-4">or click to browse (.sql, .json, .zip)</p>
              <Button variant="outline" size="sm" disabled={restoring} onClick={handleRestore}>
                {restoring ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Restoring...</> : 'Choose File'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Backup History</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backupHistory.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm">{formatDateTime(b.date)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[11px]">{b.type}</Badge></TableCell>
                    <TableCell className="text-sm">{b.size}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${b.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {b.status === 'completed' ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Success</span> : <span className="flex items-center gap-1"><XCircle className="h-3 w-3" />Failed</span>}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.status === 'completed' && (
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => toast.info('Download started')}><Download className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN APP SHELL
// ============================================================================

// ============================================================================
// CHAT PAGE
// ============================================================================

interface ChatConversation {
  id: string;
  name: string;
  type: string;
  lastMessage?: { content: string; createdAt: string; senderId: string; senderName?: string };
  unreadCount: number;
  participants: { userId: string; name: string }[];
}

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  messageType: string;
  createdAt: string;
}

