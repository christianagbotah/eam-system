'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';
import type { PageName, User, MaintenanceRequest, WorkOrder, DashboardStats, Module, Role, Permission, UserRole, Notification, CompanyProfile } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  Settings,
  Users,
  Boxes,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Play,
  Pause,
  Check,
  Lock,
  Eye,
  MessageSquare,
  Factory,
  Search,
  Bell,
  TrendingUp,
  RefreshCw,
  Shield,
  Package,
  BarChart3,
  Cog,
  ShoppingCart,
  Building2,
  Zap,
  Sun,
  Moon,
  Monitor,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  Target,
  Activity,
  Gauge,
  UserPlus,
  CircleDot,
  Hash,
  Timer,
  Key,
  UserMinus,
  History,
  ArrowUpDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

// ============================================================================
// HELPERS
// ============================================================================

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-sky-50 text-sky-700 border-sky-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  emergency: 'bg-red-100 text-red-800 border-red-300',
};

const mrStatusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  converted: 'bg-teal-50 text-teal-700 border-teal-200',
};

const woStatusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  requested: 'bg-sky-50 text-sky-700 border-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  planned: 'bg-violet-50 text-violet-700 border-violet-200',
  assigned: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  waiting_parts: 'bg-orange-50 text-orange-700 border-orange-200',
  on_hold: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  verified: 'bg-teal-50 text-teal-700 border-teal-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

function StatusIcon({ status }: { status: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3.5 w-3.5" />,
    approved: <CheckCircle2 className="h-3.5 w-3.5" />,
    rejected: <XCircle className="h-3.5 w-3.5" />,
    converted: <RefreshCw className="h-3.5 w-3.5" />,
    draft: <AlertCircle className="h-3.5 w-3.5" />,
    assigned: <Users className="h-3.5 w-3.5" />,
    in_progress: <Play className="h-3.5 w-3.5" />,
    completed: <Check className="h-3.5 w-3.5" />,
    verified: <CheckCircle2 className="h-3.5 w-3.5" />,
    closed: <Lock className="h-3.5 w-3.5" />,
  };
  return <>{iconMap[status]}</>;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d?: string) {
  if (!d) return '-';
  return format(new Date(d), 'MMM d, yyyy');
}

function formatDateTime(d?: string) {
  if (!d) return '-';
  return format(new Date(d), 'MMM d, yyyy HH:mm');
}

function timeAgo(d?: string) {
  if (!d) return '';
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={mrStatusColors[status] || woStatusColors[status] || 'bg-gray-50 text-gray-700'}>
      <span className="flex items-center gap-1">
        <StatusIcon status={status} />
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="outline" className={priorityColors[priority] || ''}>
      {priority.toUpperCase()}
    </Badge>
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

// ============================================================================
// LOADING SCREEN
// ============================================================================

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center animate-pulse shadow-lg">
          <Factory className="h-6 w-6 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">iAssetsPro</h2>
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
        <div className="flex gap-1 justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

// ============================================================================
// LOGIN PAGE
// ============================================================================

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    const ok = await login(username, password);
    if (ok) {
      toast.success('Welcome to iAssetsPro!');
    } else {
      toast.error('Invalid credentials');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setResetLoading(false);
    setForgotOpen(false);
    toast.success('Password reset link sent to your email');
  };

  const features = [
    { icon: BarChart3, label: 'Real-time Monitoring', desc: 'Track assets 24/7 with live dashboards', color: 'bg-emerald-500/20 text-emerald-300' },
    { icon: Zap, label: 'Predictive AI', desc: 'Prevent failures before they happen', color: 'bg-amber-500/20 text-amber-300' },
    { icon: Wrench, label: 'Work Orders', desc: 'Streamline maintenance tasks', color: 'bg-teal-500/20 text-teal-300' },
    { icon: Package, label: 'Inventory', desc: 'Manage parts & supplies', color: 'bg-orange-500/20 text-orange-300' },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50">
      {/* ========== LEFT PANEL - BRANDING ========== */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/2 relative overflow-hidden">
        {/* Dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950" />

        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Floating orbs */}
        <div className="absolute top-20 left-16 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-24 right-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse [animation-delay:1.5s]" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl animate-pulse [animation-delay:3s]" />

        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-10 xl:p-12 text-white h-full">
          <div className="space-y-8">
            {/* Logo & Brand */}
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-4 bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/15 shadow-2xl">
                <div className="h-12 w-12 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Factory className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight">iAssetsPro</h1>
                  <p className="text-emerald-300/80 text-xs font-medium">Enterprise Asset Management</p>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-bold leading-tight bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
                  Intelligent Asset Management Platform
                </h2>
                <p className="text-xs text-emerald-200/80 leading-relaxed max-w-lg">
                  Transform your maintenance operations with real-time monitoring, predictive analytics, and comprehensive asset lifecycle management.
                </p>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="group bg-white/[0.08] backdrop-blur-sm rounded-xl p-4 border border-white/[0.12] hover:bg-white/[0.12] hover:border-white/20 transition-all duration-300 cursor-default"
                  >
                    <div className={`h-10 w-10 ${f.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">{f.label}</h3>
                    <p className="text-[11px] text-emerald-200/70 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-3">
              {[
                { value: '99.9%', label: 'System Uptime' },
                { value: '24/7', label: 'Live Support' },
                { value: 'ISO', label: '27001 Certified' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-lg font-bold">{s.value}</div>
                  <div className="text-[11px] text-emerald-300/60">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[11px] text-emerald-300/50 pt-6 border-t border-white/10">
            <span>&copy; {new Date().getFullYear()} iAssetsPro</span>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
              <span className="bg-white/[0.08] px-2 py-0.5 rounded">v2.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== RIGHT PANEL - LOGIN FORM ========== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="inline-flex items-center space-x-3 bg-white rounded-2xl px-5 py-3 shadow-lg border border-slate-200">
              <div className="h-11 w-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Factory className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">iAssetsPro</h1>
                <p className="text-[11px] text-slate-500">Enterprise Asset Management</p>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-200/60 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1.5">Welcome Back</h2>
              <p className="text-sm text-slate-500">Sign in to access your maintenance dashboard</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Username or Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus
                    className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm bg-slate-50/50 focus:bg-white h-12"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm bg-slate-50/50 focus:bg-white h-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:via-emerald-700 hover:to-teal-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </span>
                )}
              </button>
            </form>

            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span>Secured by enterprise-grade encryption</span>
              </div>
            </div>
          </div>

          {/* Demo Accounts */}
          <div className="mt-5 p-4 rounded-2xl bg-white/80 backdrop-blur border border-slate-200/60 shadow-sm">
            <p className="font-semibold text-xs text-slate-500 mb-2.5 uppercase tracking-wider">Demo Accounts</p>
            <div className="space-y-2 text-xs">
              {[
                { user: 'admin', pass: 'admin123', role: 'Administrator', color: 'text-emerald-600' },
                { user: 'planner1', pass: 'password123', role: 'Planner', color: 'text-amber-600' },
                { user: 'supervisor1', pass: 'password123', role: 'Supervisor', color: 'text-teal-600' },
              ].map(d => (
                <button
                  key={d.user}
                  type="button"
                  onClick={() => { setUsername(d.user); setPassword(d.pass); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">{d.user}</span>
                    <span className="text-slate-400">/</span>
                    <span className="font-mono text-slate-500">{d.pass}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-medium text-slate-500 group-hover:border-emerald-300">{d.role}</Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Help */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-400">
              Need help? Contact{' '}
              <span className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer">IT Support</span>
            </p>
          </div>
        </div>
      </div>

      {/* ========== FORGOT PASSWORD MODAL ========== */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto h-14 w-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <DialogTitle className="text-xl font-bold">Reset Password</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Enter your email to receive a password reset link</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Email Address</Label>
              <Input
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                className="h-11"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={resetLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SIDEBAR
// ============================================================================

// Sidebar inner content extracted as a separate component
function SidebarContent() {
  const { currentPage, navigate, sidebarOpen } = useNavigationStore();
  const { user, hasPermission, logout } = useAuthStore();

  const navItems: { page: PageName; label: string; icon: React.ElementType; perm: string; comingSoon?: boolean }[] = [
    { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view' },
    { page: 'maintenance-requests', label: 'Maintenance Requests', icon: ClipboardList, perm: 'maintenance_requests.view' },
    { page: 'work-orders', label: 'Work Orders', icon: Wrench, perm: 'work_orders.view' },
    { page: 'assets', label: 'Assets', icon: Building2, perm: 'assets.view' },
    { page: 'inventory', label: 'Inventory', icon: Package, perm: 'inventory.view' },
    { page: 'pm-schedules', label: 'PM Schedules', icon: Timer, perm: 'work_orders.view' },
    { page: 'production', label: 'Production', icon: Zap, perm: 'production.view', comingSoon: true },
    { page: 'analytics', label: 'Analytics', icon: BarChart3, perm: 'analytics.view' },
  ];

  const settingsItems: { page: PageName; label: string; icon: React.ElementType; perm: string }[] = [
    { page: 'settings-users', label: 'Users', icon: Users, perm: 'users.view' },
    { page: 'settings-roles', label: 'Roles & Permissions', icon: Shield, perm: 'roles.view' },
    { page: 'settings-modules', label: 'Module Management', icon: Boxes, perm: 'modules.manage' },
    { page: 'settings-company', label: 'Company Profile', icon: Building2, perm: 'settings.update' },
    { page: 'settings-plants', label: 'Plants', icon: Factory, perm: 'plants.view' },
    { page: 'settings-departments', label: 'Departments', icon: Building2, perm: 'departments.view' },
    { page: 'settings-audit', label: 'Audit Logs', icon: Eye, perm: 'audit.view' },
  ];

  const visibleNavItems = navItems.filter(item => item.comingSoon || hasPermission(item.perm));
  const visibleSettingsItems = settingsItems.filter(item => hasPermission(item.perm));
  const showSettings = visibleSettingsItems.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Brand — Prominent logo on dark surface */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shrink-0 shadow-lg shadow-emerald-900/30">
          <Factory className="h-5 w-5 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">iAssetsPro</h1>
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest font-medium">Enterprise EAM</p>
          </div>
        )}
      </div>

      {/* Navigation - overflow-y-auto for reliable native scroll */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="space-y-0.5">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.page ||
              (item.page === 'maintenance-requests' && (currentPage === 'mr-detail' || currentPage === 'create-mr')) ||
              (item.page === 'work-orders' && (currentPage === 'wo-detail'));
            return (
              <TooltipProvider key={item.page} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => item.comingSoon ? toast.info(`${item.label} module coming soon!`) : navigate(item.page)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                        active
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-sm shadow-black/10'
                          : item.comingSoon
                            ? 'text-sidebar-foreground/25 cursor-not-allowed'
                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90'
                      }`}
                      disabled={item.comingSoon}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
                      )}
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                      {sidebarOpen && (
                        <span className="flex-1 text-left">{item.label}</span>
                      )}
                      {sidebarOpen && item.comingSoon && (
                        <span className="text-[9px] px-1.5 py-0 rounded border border-sidebar-border text-sidebar-foreground/25 font-medium">SOON</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {!sidebarOpen && <TooltipContent side="right">{item.label}{item.comingSoon ? ' (Coming Soon)' : ''}</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {showSettings && (
            <>
              <Separator className="my-3 bg-sidebar-border" />
              <p className={`px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/30 mb-1.5 font-semibold ${!sidebarOpen && 'text-center'}`}>
                {sidebarOpen ? 'Configuration' : '⚙'}
              </p>
              {visibleSettingsItems.map(item => {
                const Icon = item.icon;
                const active = currentPage === item.page;
                return (
                  <TooltipProvider key={item.page} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(item.page)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                            active
                              ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-sm shadow-black/10'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90'
                          }`}
                        >
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
                          )}
                          <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                          {sidebarOpen && <span>{item.label}</span>}
                        </button>
                      </TooltipTrigger>
                      {!sidebarOpen && <TooltipContent side="right">{item.label}</TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </>
          )}
        </div>
      </nav>

      {/* User — Clean profile section */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/80 to-emerald-700/80 flex items-center justify-center shrink-0 ring-1 ring-sidebar-border">
            <span className="text-xs font-bold text-white">{user ? getInitials(user.fullName) : '?'}</span>
          </div>
          {sidebarOpen && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.fullName}</p>
                <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.roles?.[0]?.name || ''}</p>
              </div>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Sign Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const { sidebarOpen, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useNavigationStore();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? 'w-64' : 'w-[68px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar z-50 shadow-2xl flex flex-col overflow-hidden">
            <button
              className="absolute top-4 right-3 text-sidebar-foreground/50 hover:text-sidebar-foreground z-10"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}

// ============================================================================
// DASHBOARD
// ============================================================================

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const woStatusChartConfig = {
  draft: { label: 'Draft', color: '#94a3b8' },
  requested: { label: 'Requested', color: '#06b6d4' },
  approved: { label: 'Approved', color: '#8b5cf6' },
  assigned: { label: 'Assigned', color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  completed: { label: 'Completed', color: '#10b981' },
  closed: { label: 'Closed', color: '#6b7280' },
} as const;

const woTypeChartConfig = {
  preventive: { label: 'Preventive', color: '#10b981' },
  corrective: { label: 'Corrective', color: '#f59e0b' },
  emergency: { label: 'Emergency', color: '#ef4444' },
  inspection: { label: 'Inspection', color: '#8b5cf6' },
  predictive: { label: 'Predictive', color: '#06b6d4' },
} as const;

const mrStatusChartConfig = {
  pending: { label: 'Pending', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  converted: { label: 'Converted', color: '#06b6d4' },
} as const;

function MiniBarChart({ data, color, maxVal }: { data: number[]; color: string; maxVal: number }) {
  const bars = 7;
  return (
    <div className="flex items-end gap-[3px] h-8">
      {Array.from({ length: bars }).map((_, i) => {
        const val = data[i] ?? 0;
        const h = maxVal > 0 ? Math.max(2, (val / maxVal) * 100) : 2;
        const isLast = i === bars - 1;
        return (
          <div
            key={i}
            className="w-[5px] rounded-sm"
            style={{ height: `${h}%`, backgroundColor: color, opacity: isLast ? 1 : 0.4 }}
          />
        );
      })}
    </div>
  );
}

function ProgressRing({ value, size = 44, strokeWidth = 4, color = '#10b981' }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/50" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, hasPermission } = useAuthStore();
  const { navigate } = useNavigationStore();

  useEffect(() => {
    api.get<DashboardStats>('/api/dashboard/stats').then(res => {
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSkeleton />;

  const totalWOs = stats?.totalWorkOrders || 0;
  const completedWOs = stats?.completedWorkOrders || 0;
  const completionRate = totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0;
  const activeWOs = stats?.activeWorkOrders || 0;
  const overdueWOs = stats?.overdueWorkOrders || 0;
  const pendingReqs = stats?.pendingRequests || 0;
  const pendingApprovals = stats?.pendingApprovals || 0;

  // Chart Data
  const woStatusData = [
    { status: 'draft', count: stats?.draftWO || 0 },
    { status: 'requested', count: stats?.requestedWO || 0 },
    { status: 'approved', count: stats?.approvedWO || 0 },
    { status: 'assigned', count: stats?.assignedWO || 0 },
    { status: 'in_progress', count: stats?.inProgressWO || 0 },
    { status: 'completed', count: stats?.completedWO || 0 },
    { status: 'closed', count: stats?.closedWO || 0 },
  ].filter(d => d.count > 0);

  const woTypeData = [
    { type: 'preventive', count: stats?.preventiveWO || 0 },
    { type: 'corrective', count: stats?.correctiveWO || 0 },
    { type: 'emergency', count: stats?.emergencyWO || 0 },
    { type: 'inspection', count: stats?.inspectionWO || 0 },
    { type: 'predictive', count: stats?.predictiveWO || 0 },
  ].filter(d => d.count > 0);

  const mrStatusData = [
    { status: 'pending', count: stats?.pendingMR || 0 },
    { status: 'approved', count: stats?.approvedMR || 0 },
    { status: 'rejected', count: stats?.rejectedMR || 0 },
    { status: 'converted', count: stats?.convertedMR || 0 },
  ];

  const kpiCards = [
    {
      label: 'Pending Requests', value: pendingReqs,
      sublabel: `${stats?.createdTodayMR || 0} new today`,
      color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-100 dark:border-amber-900/40',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600 dark:text-amber-400',
      icon: ClipboardList, permission: 'maintenance_requests.view',
      barData: [2, 1, 3, pendingReqs - 1, pendingReqs + 1, pendingReqs, pendingReqs],
    },
    {
      label: 'Active Work Orders', value: activeWOs,
      sublabel: `${stats?.createdTodayWO || 0} created today`,
      color: '#10b981', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-100 dark:border-emerald-900/40',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Wrench, permission: 'work_orders.view',
      barData: [1, activeWOs - 1, activeWOs + 2, activeWOs, activeWOs - 2, activeWOs + 1, activeWOs],
    },
    {
      label: 'Completion Rate', value: `${completionRate}%`,
      sublabel: `${completedWOs} of ${totalWOs} completed`,
      color: '#14b8a6', bgColor: 'bg-teal-50 dark:bg-teal-950/30',
      borderColor: 'border-teal-100 dark:border-teal-900/40',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50', iconColor: 'text-teal-600 dark:text-teal-400',
      icon: CheckCircle2, permission: 'work_orders.view',
      barData: [45, 52, 48, 60, completionRate - 5, completionRate + 3, completionRate],
      showRing: true, ringValue: completionRate,
    },
    {
      label: 'Overdue', value: overdueWOs,
      sublabel: overdueWOs > 0 ? 'Need immediate attention' : 'All on track',
      color: overdueWOs > 0 ? '#ef4444' : '#10b981',
      bgColor: overdueWOs > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: overdueWOs > 0 ? 'border-red-100 dark:border-red-900/40' : 'border-emerald-100 dark:border-emerald-900/40',
      iconBg: overdueWOs > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: overdueWOs > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
      icon: AlertTriangle, permission: 'work_orders.view',
      barData: [overdueWOs + 2, overdueWOs + 1, overdueWOs, overdueWOs + 1, overdueWOs - 1, overdueWOs, overdueWOs],
    },
  ];

  const visibleKpis = kpiCards.filter(c => hasPermission(c.permission));

  const quickActions = [
    { label: 'New Request', icon: Plus, permission: 'maintenance_requests.create', page: 'create-mr' as PageName, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50', border: 'border-amber-200 hover:border-amber-300 dark:border-amber-900/40' },
    { label: 'New Work Order', icon: Wrench, permission: 'work_orders.create', page: 'work-orders' as PageName, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50', border: 'border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/40' },
    { label: 'All Requests', icon: ClipboardList, permission: 'maintenance_requests.view', page: 'maintenance-requests' as PageName, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 dark:hover:bg-sky-950/50', border: 'border-sky-200 hover:border-sky-300 dark:border-sky-900/40' },
    { label: 'All Work Orders', icon: Eye, permission: 'work_orders.view', page: 'work-orders' as PageName, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/50', border: 'border-violet-200 hover:border-violet-300 dark:border-violet-900/40' },
  ].filter(a => hasPermission(a.permission));

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* ===== Welcome Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Operations Dashboard</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-primary">{user?.fullName?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Real-time maintenance operations overview &middot; {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="text-[11px] font-mono gap-1.5 border-primary/20 bg-primary/5 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* ===== KPI Cards ===== */}
      {visibleKpis.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {visibleKpis.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className={`border ${card.borderColor} ${card.bgColor} hover:shadow-lg transition-all duration-300 group overflow-hidden relative`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/40 to-transparent dark:from-white/5 dark:to-transparent rounded-bl-full" />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-10 w-10 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    {card.showRing ? (
                      <ProgressRing value={card.ringValue || 0} color={card.color} size={48} strokeWidth={4} />
                    ) : (
                      <MiniBarChart data={card.barData} color={card.color} maxVal={Math.max(...card.barData, 1)} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold tracking-tight" style={{ color: card.color }}>{card.value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{card.sublabel}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Charts Row ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WO Status Bar Chart */}
        <Card className="border lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Work Orders by Status</CardTitle>
                <CardDescription className="text-xs mt-0.5">Current distribution across all work order stages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={woStatusChartConfig} className="h-[280px] w-full">
              <BarChart data={woStatusData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.replace(/_/g, ' ')} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {woStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} className="fill-primary" />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* WO Type Donut Chart */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">WO by Type</CardTitle>
                <CardDescription className="text-xs mt-0.5">Breakdown by work order type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={woTypeChartConfig} className="h-[280px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={woTypeData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="type"
                >
                  {woTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="type" />} className="flex-wrap gap-x-4 gap-y-1" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ===== Second Charts Row ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MR Status + Priority */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Request Status & Priority</CardTitle>
                <CardDescription className="text-xs mt-0.5">Maintenance request breakdown</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <ChartContainer config={mrStatusChartConfig} className="h-[180px] w-full">
              <BarChart data={mrStatusData} layout="vertical" margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/30" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} className="fill-muted-foreground" tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {mrStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index + 1]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Priority Mix</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden bg-muted flex">
                {(stats?.highPriorityMR || 0) > 0 && (
                  <div className="bg-red-500 h-full" style={{ width: `${Math.max(5, (stats?.highPriorityMR || 0) / Math.max(1, (stats?.totalRequests || 1)) * 100)}%` }} />
                )}
                {(stats?.mediumPriorityMR || 0) > 0 && (
                  <div className="bg-amber-500 h-full" style={{ width: `${Math.max(5, (stats?.mediumPriorityMR || 0) / Math.max(1, (stats?.totalRequests || 1)) * 100)}%` }} />
                )}
                {(stats?.lowPriorityMR || 0) > 0 && (
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.max(5, (stats?.lowPriorityMR || 0) / Math.max(1, (stats?.totalRequests || 1)) * 100)}%` }} />
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] shrink-0">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{stats?.highPriorityMR || 0}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{stats?.mediumPriorityMR || 0}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{stats?.lowPriorityMR || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations Summary + Completion */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Operations Summary</CardTitle>
                <CardDescription className="text-xs mt-0.5">Key metrics at a glance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Pending Approvals', value: pendingApprovals, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-100 dark:border-orange-900/40' },
                { label: 'Total Requests', value: stats?.totalRequests || 0, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-100 dark:border-sky-900/40' },
                { label: 'Approved', value: stats?.approvedRequests || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/40' },
                { label: 'Converted to WO', value: stats?.convertedRequests || 0, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-100 dark:border-teal-900/40' },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${item.border} ${item.bg} transition-all hover:shadow-sm`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Overall Completion</span>
                <span className="text-sm font-bold text-primary">{completionRate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-all duration-1000 ease-out"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{completedWOs} completed</span>
                <span>{totalWOs - completedWOs} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Quick Actions ===== */}
      {quickActions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.page)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${action.border} ${action.bg} transition-all duration-200 group cursor-pointer text-left`}
                >
                  <div className={`h-9 w-9 rounded-lg bg-white/80 dark:bg-white/5 shadow-sm flex items-center justify-center shrink-0 ${action.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-sm font-semibold ${action.color}`}>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Recent Activity Panels ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {hasPermission('maintenance_requests.view') && (
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Requests</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Latest maintenance requests</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 font-medium" onClick={() => navigate('maintenance-requests')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!stats?.recentRequests?.length ? (
                <EmptyState icon={ClipboardList} title="No recent requests" description="Maintenance requests you create will appear here." />
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {stats.recentRequests.map(mr => (
                    <div
                      key={mr.id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-150 group"
                      onClick={() => navigate('mr-detail', { id: mr.id })}
                    >
                      <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{mr.title}</p>
                        <p className="text-[11px] text-muted-foreground">{mr.requestNumber} &middot; {mr.requester?.fullName} &middot; {timeAgo(mr.createdAt)}</p>
                      </div>
                      <StatusBadge status={mr.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasPermission('work_orders.view') && (
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Work Orders</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Latest work order activity</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 font-medium" onClick={() => navigate('work-orders')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!stats?.recentWorkOrders?.length ? (
                <EmptyState icon={Wrench} title="No recent work orders" description="Work orders created from approved requests will appear here." />
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {stats.recentWorkOrders.map(wo => (
                    <div
                      key={wo.id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-150 group"
                      onClick={() => navigate('wo-detail', { id: wo.id })}
                    >
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
                        <Wrench className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{wo.title}</p>
                        <p className="text-[11px] text-muted-foreground">{wo.woNumber} &middot; {wo.type.replace(/_/g, ' ')} &middot; {timeAgo(wo.createdAt)}</p>
                      </div>
                      <StatusBadge status={wo.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== System Health Footer ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border bg-gradient-to-br from-emerald-50/80 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/10 border-emerald-100 dark:border-emerald-900/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
              <Factory className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">System Health</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">All Systems Operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-gradient-to-br from-sky-50/80 to-blue-50/30 dark:from-sky-950/30 dark:to-blue-950/10 border-sky-100 dark:border-sky-900/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">Security Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <p className="text-sm font-bold text-sky-700 dark:text-sky-400">No Security Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-gradient-to-br from-violet-50/80 to-purple-50/30 dark:from-violet-950/30 dark:to-purple-950/10 border-violet-100 dark:border-violet-900/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">Maintenance Efficiency</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                <p className="text-sm font-bold text-violet-700 dark:text-violet-400">{completionRate >= 80 ? 'Excellent' : completionRate >= 50 ? 'Good' : 'Needs Improvement'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// MAINTENANCE REQUESTS - LIST
// ============================================================================

function MaintenanceRequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasPermission } = useAuthStore();

  const filteredRequests = useMemo(() => {
    if (!searchText.trim()) return requests;
    const q = searchText.toLowerCase();
    return requests.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.requestNumber.toLowerCase().includes(q) ||
      (r.assetName || '').toLowerCase().includes(q) ||
      (r.requester?.fullName || '').toLowerCase().includes(q)
    );
  }, [requests, searchText]);

  const statusCounts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    converted: requests.filter(r => r.status === 'converted').length,
  }), [requests]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterPriority !== 'all') params.set('priority', filterPriority);
    api.get<MaintenanceRequest[]>(`/api/maintenance-requests?${params}`).then(res => {
      if (active) {
        if (res.success && res.data) setRequests(res.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [filterStatus, filterPriority, refreshKey]);

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  if (detailId) {
    return <MRDetailPage id={detailId} onBack={() => setDetailId(null)} onUpdate={handleRefresh} />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track all maintenance requests</p>
        </div>
        {hasPermission('maintenance_requests.create') && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />New Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Maintenance Request</DialogTitle></DialogHeader>
              <CreateMRForm onSuccess={() => { setCreateOpen(false); handleRefresh(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Bar - Pill style */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Total', value: statusCounts.total, className: 'bg-slate-100 text-slate-700 border-slate-200' },
          { label: 'Pending', value: statusCounts.pending, className: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Approved', value: statusCounts.approved, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Rejected', value: statusCounts.rejected, className: 'bg-red-50 text-red-700 border-red-200' },
          { label: 'Converted', value: statusCounts.converted, className: 'bg-teal-50 text-teal-700 border-teal-200' },
        ].map(s => (
          <div key={s.label} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${s.className} transition-colors`}>
            {s.value} {s.label}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingSkeleton /> : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Requested By</TableHead>
                <TableHead className="hidden xl:table-cell">Asset</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-48">
                  <EmptyState icon={ClipboardList} title="No maintenance requests found" description="Try adjusting your filters or create a new request." />
                </TableCell></TableRow>
              ) : filteredRequests.map(mr => (
                <TableRow key={mr.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(mr.id)}>
                  <TableCell className="font-mono text-xs">{mr.requestNumber}</TableCell>
                  <TableCell className="font-medium max-w-[250px] truncate">{mr.title}</TableCell>
                  <TableCell className="hidden md:table-cell"><PriorityBadge priority={mr.priority} /></TableCell>
                  <TableCell><StatusBadge status={mr.status} /></TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">{mr.requester?.fullName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate hidden xl:table-cell">{mr.assetName || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(mr.createdAt)}</TableCell>
                  <TableCell>
                    {mr.machineDown && <Badge variant="destructive" className="text-[10px]">DOWN</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// CREATE MR FORM
// ============================================================================

function CreateMRForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assetName, setAssetName] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [machineDown, setMachineDown] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.post('/api/maintenance-requests', { title, description, priority, assetName, location, category, machineDown });
    if (res.success) {
      toast.success('Maintenance request created');
      onSuccess();
    } else {
      toast.error(res.error || 'Failed to create request');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the issue" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of the issue, including any relevant observations" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mechanical">Mechanical</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="hydraulic">Hydraulic</SelectItem>
              <SelectItem value="pneumatic">Pneumatic</SelectItem>
              <SelectItem value="instrumentation">Instrumentation</SelectItem>
              <SelectItem value="structural">Structural</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Asset / Machine</Label>
          <Input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Conveyor Belt B3" />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Production Line 2" />
        </div>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
        <Switch checked={machineDown} onCheckedChange={setMachineDown} />
        <div>
          <Label className="text-sm font-medium text-red-700">Machine is Down</Label>
          <p className="text-[11px] text-red-500">Enable if this issue has caused a machine shutdown</p>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
          {loading ? 'Creating...' : 'Submit Request'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============================================================================
// MR DETAIL PAGE
// ============================================================================

function MRDetailPage({ id, onBack, onUpdate }: { id: string; onBack: () => void; onUpdate: () => void }) {
  const [mr, setMr] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    let active = true;
    api.get<MaintenanceRequest>(`/api/maintenance-requests/${id}`).then(res => {
      if (active) {
        if (res.success && res.data) setMr(res.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [id]);

  const handleRefresh = useCallback(() => {
    api.get<MaintenanceRequest>(`/api/maintenance-requests/${id}`).then(res => {
      if (res.success && res.data) setMr(res.data);
    });
  }, [id]);

  const handleAction = async (action: string, notes?: string) => {
    setActionLoading(true);
    const res = await api.patch(`/api/maintenance-requests/${id}`, { action, reviewNotes: notes });
    if (res.success) {
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      handleRefresh();
      onUpdate();
      setRejectDialogOpen(false);
      setRejectNotes('');
    } else {
      toast.error(res.error || 'Action failed');
    }
    setActionLoading(false);
  };

  const handleConvert = async () => {
    setActionLoading(true);
    const res = await api.patch(`/api/maintenance-requests/${id}`, {
      action: 'convert',
      woTitle: mr?.title,
      woPriority: mr?.priority,
    });
    if (res.success) {
      toast.success('Converted to Work Order');
      handleRefresh();
      onUpdate();
    } else {
      toast.error(res.error || 'Conversion failed');
    }
    setActionLoading(false);
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    const res = await api.patch(`/api/maintenance-requests/${id}`, { action: 'comment', comment });
    if (res.success) {
      toast.success('Comment added');
      setComment('');
      handleRefresh();
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (!mr) return <div className="p-6">Request not found</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{mr.requestNumber}</span>
            <StatusBadge status={mr.status} />
            <PriorityBadge priority={mr.priority} />
            {mr.machineDown && <Badge variant="destructive" className="text-[10px]">MACHINE DOWN</Badge>}
          </div>
          <h1 className="text-xl font-bold mt-1">{mr.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {mr.status === 'pending' && hasPermission('maintenance_requests.approve') && (
            <>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setRejectDialogOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" />Reject
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={() => handleAction('approve', '')}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Approve
              </Button>
            </>
          )}
          {mr.status === 'approved' && hasPermission('maintenance_requests.convert') && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={handleConvert}>
              <RefreshCw className="h-4 w-4 mr-1" />Convert to WO
            </Button>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle><DialogDescription>Please provide a reason for rejection.</DialogDescription></DialogHeader>
          <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Reason for rejection..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={() => handleAction('reject', rejectNotes)}>
              {actionLoading ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mr.description || 'No description provided.'}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Comments ({mr.comments?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." onKeyDown={e => e.key === 'Enter' && handleComment()} />
                <Button size="icon" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleComment}><MessageSquare className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="max-h-64">
                {mr.comments?.map(c => (
                  <div key={c.id} className="flex gap-3 py-2 border-b last:border-0">
                    <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[10px]">{getInitials(c.user?.fullName || 'U')}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs"><span className="font-medium">{c.user?.fullName || 'Unknown'}</span> <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span></p>
                      <p className="text-sm mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
              {(!mr.comments || mr.comments.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>}
            </CardContent>
          </Card>

          {/* Status History */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mr.statusHistory?.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <div className="relative flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-emerald-300'}`} />
                      {i < (mr.statusHistory?.length || 0) - 1 && <div className="w-0.5 h-6 bg-emerald-200" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{h.toStatus.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground"> — by {h.changedBy?.fullName || 'System'}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{formatDateTime(h.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium capitalize">{mr.category || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{mr.location || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Asset</span><span className="font-medium">{mr.assetName || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Requested By</span><span className="font-medium">{mr.requester?.fullName}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{formatDateTime(mr.createdAt)}</span></div>
              {mr.approvedAt && (
                <>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span className="font-medium">{formatDateTime(mr.approvedAt)}</span></div>
                </>
              )}
              {mr.reviewNotes && (
                <>
                  <Separator />
                  <div><span className="text-muted-foreground">Review Notes</span><p className="mt-1 text-xs">{mr.reviewNotes}</p></div>
                </>
              )}
            </CardContent>
          </Card>

          {mr.workOrder && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">Linked Work Order</p>
                <p className="font-semibold">{mr.workOrder.woNumber}</p>
                <p className="text-sm text-muted-foreground">{mr.workOrder.title}</p>
                <StatusBadge status={mr.workOrder.status} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WORK ORDERS - LIST
// ============================================================================

function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasPermission } = useAuthStore();

  const filteredWOs = useMemo(() => {
    if (!searchText.trim()) return workOrders;
    const q = searchText.toLowerCase();
    return workOrders.filter(wo =>
      wo.title.toLowerCase().includes(q) ||
      wo.woNumber.toLowerCase().includes(q) ||
      (wo.assetName || '').toLowerCase().includes(q) ||
      (wo.assignedToName || '').toLowerCase().includes(q)
    );
  }, [workOrders, searchText]);

  const statusCounts = useMemo(() => ({
    total: workOrders.length,
    inProgress: workOrders.filter(w => w.status === 'in_progress').length,
    completed: workOrders.filter(w => w.status === 'completed').length,
    assigned: workOrders.filter(w => w.status === 'assigned' || w.status === 'draft').length,
    overdue: workOrders.filter(w => w.slaBreached).length,
  }), [workOrders]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterPriority !== 'all') params.set('priority', filterPriority);
    api.get<WorkOrder[]>(`/api/work-orders?${params}`).then(res => {
      if (active) {
        if (res.success && res.data) setWorkOrders(res.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [filterStatus, filterPriority, refreshKey]);

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  if (detailId) {
    return <WODetailPage id={detailId} onBack={() => setDetailId(null)} onUpdate={handleRefresh} />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and execute all maintenance work orders</p>
        </div>
        {hasPermission('work_orders.create') && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />New Work Order</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
              <CreateWOForm onSuccess={() => { setCreateOpen(false); handleRefresh(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Bar - Pill style */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Total', value: statusCounts.total, className: 'bg-slate-100 text-slate-700 border-slate-200' },
          { label: 'In Progress', value: statusCounts.inProgress, className: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Completed', value: statusCounts.completed, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Pending', value: statusCounts.assigned, className: 'bg-sky-50 text-sky-700 border-sky-200' },
          { label: 'Overdue', value: statusCounts.overdue, className: 'bg-red-50 text-red-700 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${s.className} transition-colors`}>
            {s.value} {s.label}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search work orders..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingSkeleton /> : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WO #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden sm:table-cell">Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWOs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-48">
                  <EmptyState icon={Wrench} title="No work orders found" description="Try adjusting your filters or create a new work order." />
                </TableCell></TableRow>
              ) : filteredWOs.map(wo => (
                <TableRow key={wo.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(wo.id)}>
                  <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
                  <TableCell className="font-medium max-w-[250px] truncate">{wo.title}</TableCell>
                  <TableCell className="text-xs capitalize hidden md:table-cell">{wo.type.replace('_', ' ')}</TableCell>
                  <TableCell className="hidden sm:table-cell"><PriorityBadge priority={wo.priority} /></TableCell>
                  <TableCell><StatusBadge status={wo.status} /></TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">{wo.assignedToName || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(wo.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// CREATE WO FORM
// ============================================================================

function CreateWOForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('corrective');
  const [priority, setPriority] = useState('medium');
  const [assetName, setAssetName] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.post('/api/work-orders', {
      title, description, type, priority, assetName,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
    });
    if (res.success) {
      toast.success('Work order created');
      onSuccess();
    } else {
      toast.error(res.error || 'Failed');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Work order title" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of work to be done" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="preventive">Preventive</SelectItem>
              <SelectItem value="predictive">Predictive</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="project">Project</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Asset / Machine</Label>
          <Input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Pump Station A" />
        </div>
        <div className="space-y-2">
          <Label>Est. Hours</Label>
          <Input type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} placeholder="0" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
          {loading ? 'Creating...' : 'Create WO'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============================================================================
// WORK ORDER DETAIL PAGE
// ============================================================================

function WODetailPage({ id, onBack, onUpdate }: { id: string; onBack: () => void; onUpdate: () => void }) {
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const { hasPermission } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  // Edit WO
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  // Time log
  const [timeLogOpen, setTimeLogOpen] = useState(false);
  const [tlAction, setTlAction] = useState('start');
  const [tlHours, setTlHours] = useState('');
  const [tlNotes, setTlNotes] = useState('');
  const [tlLoading, setTlLoading] = useState(false);
  // Material
  const [materialOpen, setMaterialOpen] = useState(false);
  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('');
  const [matCost, setMatCost] = useState('');
  const [matUnit, setMatUnit] = useState('each');
  const [matLoading, setMatLoading] = useState(false);

  const fetchWO = useCallback(async () => {
    const res = await api.get<WorkOrder>(`/api/work-orders/${id}`);
    if (res.success && res.data) setWo(res.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let active = true;
    api.get<WorkOrder>(`/api/work-orders/${id}`).then(res => {
      if (active) {
        if (res.success && res.data) setWo(res.data);
        setLoading(false);
      }
    });
    api.get<User[]>('/api/users').then(res => { if (res.success && res.data) setUsers(res.data); });
    return () => { active = false; };
  }, [id]);

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(true);
    const res = await api.patch(`/api/work-orders/${id}`, { action, ...extra });
    if (res.success) {
      toast.success(`Work order ${action}d`);
      fetchWO();
      onUpdate();
      setActionDialog(null);
    } else {
      toast.error(res.error || 'Action failed');
    }
    setActionLoading(false);
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    const res = await api.patch(`/api/work-orders/${id}`, { action: 'comment', comment });
    if (res.success) { toast.success('Comment added'); setComment(''); fetchWO(); }
  };

  const openEditWO = () => {
    if (!wo) return;
    setEditForm({
      title: wo.title, description: wo.description || '', type: wo.type,
      priority: wo.priority, estimatedHours: wo.estimatedHours?.toString() || '',
      plannedStart: wo.plannedStart ? wo.plannedStart.slice(0, 16) : '',
      plannedEnd: wo.plannedEnd ? wo.plannedEnd.slice(0, 16) : '',
      failureDescription: wo.failureDescription || '',
      causeDescription: wo.causeDescription || '',
      actionDescription: wo.actionDescription || '',
    });
    setEditOpen(true);
  };

  const handleEditWO = async () => {
    if (!editForm.title) { toast.error('Title is required'); return; }
    setActionLoading(true);
    const payload: any = { action: 'update' };
    if (editForm.title) payload.title = editForm.title;
    if (editForm.description !== undefined) payload.description = editForm.description;
    if (editForm.type) payload.type = editForm.type;
    if (editForm.priority) payload.priority = editForm.priority;
    if (editForm.estimatedHours) payload.estimatedHours = parseFloat(editForm.estimatedHours);
    if (editForm.plannedStart) payload.plannedStart = editForm.plannedStart;
    if (editForm.plannedEnd) payload.plannedEnd = editForm.plannedEnd;
    if (editForm.failureDescription !== undefined) payload.failureDescription = editForm.failureDescription;
    if (editForm.causeDescription !== undefined) payload.causeDescription = editForm.causeDescription;
    if (editForm.actionDescription !== undefined) payload.actionDescription = editForm.actionDescription;
    const res = await api.patch(`/api/work-orders/${id}`, payload);
    if (res.success) { toast.success('Work order updated'); setEditOpen(false); fetchWO(); }
    else { toast.error(res.error || 'Update failed'); }
    setActionLoading(false);
  };

  const handleTimeLog = async () => {
    setTlLoading(true);
    const body: any = { action: tlAction };
    if (tlNotes) body.notes = tlNotes;
    if (tlHours && (tlAction === 'start' || tlAction === 'resume')) body.hoursWorked = parseFloat(tlHours);
    const res = await api.post(`/api/work-orders/${id}/time-logs`, body);
    if (res.success) { toast.success('Time log recorded'); setTimeLogOpen(false); setTlHours(''); setTlNotes(''); fetchWO(); }
    else { toast.error(res.error || 'Failed to log time'); }
    setTlLoading(false);
  };

  const handleAddMaterial = async () => {
    if (!matName) { toast.error('Item name is required'); return; }
    setMatLoading(true);
    const body: any = { itemName: matName };
    if (matQty) body.quantity = parseFloat(matQty);
    if (matCost) body.unitCost = parseFloat(matCost);
    if (matUnit) body.unit = matUnit;
    const res = await api.post(`/api/work-orders/${id}/materials`, body);
    if (res.success) { toast.success('Material added'); setMaterialOpen(false); setMatName(''); setMatQty(''); setMatCost(''); fetchWO(); }
    else { toast.error(res.error || 'Failed to add material'); }
    setMatLoading(false);
  };

  if (loading) return <LoadingSkeleton />;
  if (!wo) return <div className="p-6">Work order not found</div>;

  const canApprove = hasPermission('work_orders.approve') && wo.status === 'draft';
  const canAssign = hasPermission('work_orders.assign') && ['draft', 'approved'].includes(wo.status);
  const canStart = hasPermission('work_orders.execute') && wo.status === 'assigned';
  const canComplete = hasPermission('work_orders.complete') && wo.status === 'in_progress';
  const canVerify = hasPermission('work_orders.verify') && wo.status === 'completed';
  const canClose = hasPermission('work_orders.close') && wo.status === 'verified';
  const canEdit = !['closed', 'cancelled'].includes(wo.status);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{wo.woNumber}</span>
            <StatusBadge status={wo.status} />
            <PriorityBadge priority={wo.priority} />
            <Badge variant="outline" className="capitalize">{wo.type.replace('_', ' ')}</Badge>
            {wo.isLocked && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
            {wo.slaBreached && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />SLA BREACHED</Badge>}
          </div>
          <h1 className="text-xl font-bold mt-1">{wo.title}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="h-4 w-4 mr-1" />Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && <DropdownMenuItem onClick={openEditWO}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
            {canEdit && <DropdownMenuSeparator />}
            {canApprove && <DropdownMenuItem onClick={() => handleAction('approve')}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>}
            {canAssign && <DropdownMenuItem onClick={() => setActionDialog('assign')}><Users className="h-4 w-4 mr-2" />Assign</DropdownMenuItem>}
            {canStart && <DropdownMenuItem onClick={() => handleAction('start')}><Play className="h-4 w-4 mr-2" />Start Work</DropdownMenuItem>}
            {canComplete && <DropdownMenuItem onClick={() => setActionDialog('complete')}><Check className="h-4 w-4 mr-2" />Complete</DropdownMenuItem>}
            {canVerify && <DropdownMenuItem onClick={() => handleAction('verify')}><Eye className="h-4 w-4 mr-2" />Verify</DropdownMenuItem>}
            {canClose && <DropdownMenuItem onClick={() => handleAction('close')}><Lock className="h-4 w-4 mr-2" />Close</DropdownMenuItem>}
            {!canEdit && !canApprove && !canAssign && !canStart && !canComplete && !canVerify && !canClose && (
              <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Assign Dialog */}
      <Dialog open={actionDialog === 'assign'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Work Order</DialogTitle><DialogDescription>Select a technician to assign this work order.</DialogDescription></DialogHeader>
          <Select onValueChange={(val) => {
            const u = users.find(x => x.id === val);
            if (u) handleAction('assign', { assignedToId: u.id, assignedToName: u.fullName });
          }}>
            <SelectTrigger><SelectValue placeholder="Select technician..." /></SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.username})</SelectItem>)}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={actionDialog === 'complete'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Complete Work Order</DialogTitle><DialogDescription>Mark this work order as completed.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Completion Notes</Label>
              <Textarea value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="What was done?" rows={3} />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={() => handleAction('complete', { completionNotes })}>
              {actionLoading ? 'Completing...' : 'Mark as Completed'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit WO Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Work Order</DialogTitle><DialogDescription>Update work order details.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="predictive">Predictive</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Est. Hours</Label><Input type="number" value={editForm.estimatedHours || ''} onChange={e => setEditForm(f => ({ ...f, estimatedHours: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Planned Start</Label><Input type="datetime-local" value={editForm.plannedStart || ''} onChange={e => setEditForm(f => ({ ...f, plannedStart: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Planned End</Label><Input type="datetime-local" value={editForm.plannedEnd || ''} onChange={e => setEditForm(f => ({ ...f, plannedEnd: e.target.value }))} /></div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Failure Analysis</p>
            <div className="space-y-1.5"><Label>Failure Description</Label><Textarea value={editForm.failureDescription || ''} onChange={e => setEditForm(f => ({ ...f, failureDescription: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Cause Description</Label><Textarea value={editForm.causeDescription || ''} onChange={e => setEditForm(f => ({ ...f, causeDescription: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Action Description</Label><Textarea value={editForm.actionDescription || ''} onChange={e => setEditForm(f => ({ ...f, actionDescription: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditWO} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{actionLoading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Log Dialog */}
      <Dialog open={timeLogOpen} onOpenChange={setTimeLogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Time</DialogTitle><DialogDescription>Record time spent on this work order.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Action</Label>
              <Select value={tlAction} onValueChange={setTlAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="start">Start</SelectItem><SelectItem value="pause">Pause</SelectItem><SelectItem value="resume">Resume</SelectItem><SelectItem value="complete">Complete</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Hours Worked</Label><Input type="number" step="0.25" value={tlHours} onChange={e => setTlHours(e.target.value)} placeholder="e.g. 2.5" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={tlNotes} onChange={e => setTlNotes(e.target.value)} placeholder="Optional notes..." rows={2} /></div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={tlLoading} onClick={handleTimeLog}>
              {tlLoading ? 'Logging...' : 'Log Time'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Material</DialogTitle><DialogDescription>Add a material or part to this work order.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Item Name *</Label><Input value={matName} onChange={e => setMatName(e.target.value)} placeholder="e.g. Bearing 6205" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={matQty} onChange={e => setMatQty(e.target.value)} placeholder="1" /></div>
              <div className="space-y-1.5"><Label>Unit Cost</Label><Input type="number" step="0.01" value={matCost} onChange={e => setMatCost(e.target.value)} placeholder="0.00" /></div>
              <div className="space-y-1.5"><Label>Unit</Label>
                <Select value={matUnit} onValueChange={setMatUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="each">Each</SelectItem><SelectItem value="kg">Kg</SelectItem><SelectItem value="meter">Meter</SelectItem><SelectItem value="set">Set</SelectItem><SelectItem value="box">Box</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={matLoading} onClick={handleAddMaterial}>
              {matLoading ? 'Adding...' : 'Add Material'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{wo.description || 'No description'}</p></CardContent>
          </Card>

          {/* Comments */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Comments ({wo.comments?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add comment..." onKeyDown={e => e.key === 'Enter' && handleComment()} />
                <Button size="icon" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleComment}><MessageSquare className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="max-h-64">
                {wo.comments?.map(c => (
                  <div key={c.id} className="flex gap-3 py-2 border-b last:border-0">
                    <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[10px]">{getInitials(c.userName || 'U')}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs"><span className="font-medium">{c.userName || 'Unknown'}</span> <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span></p>
                      <p className="text-sm mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Time Logs */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-base">Time Logs</CardTitle><CardDescription className="text-xs">{wo.timeLogs?.length || 0} entries · {wo.actualHours || 0}h total</CardDescription></div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setTlAction('start'); setTlHours(''); setTlNotes(''); setTimeLogOpen(true); }}><Timer className="h-3.5 w-3.5" />Log Time</Button>
            </CardHeader>
            <CardContent>
              {(!wo.timeLogs || wo.timeLogs.length === 0) ? (
                <p className="text-sm text-muted-foreground">No time logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {wo.timeLogs.map(tl => (
                    <div key={tl.id} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${tl.action === 'start' ? 'bg-emerald-100 text-emerald-700' : tl.action === 'pause' ? 'bg-amber-100 text-amber-700' : tl.action === 'resume' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                        {tl.action === 'start' ? <Play className="h-3.5 w-3.5" /> : tl.action === 'pause' ? <Pause className="h-3.5 w-3.5" /> : tl.action === 'resume' ? <Play className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">{tl.action}</p>
                        <p className="text-xs text-muted-foreground">{tl.userName || 'Unknown'} · {formatDateTime(tl.createdAt)}</p>
                        {tl.note && <p className="text-xs text-muted-foreground mt-0.5">{tl.note}</p>}
                      </div>
                      {tl.duration != null && tl.duration > 0 && (
                        <Badge variant="outline" className="text-[10px] shrink-0">{tl.duration}h</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Materials */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-base">Materials & Parts</CardTitle><CardDescription className="text-xs">{wo.materials?.length || 0} items</CardDescription></div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setMatName(''); setMatQty(''); setMatCost(''); setMaterialOpen(true); }}><Plus className="h-3.5 w-3.5" />Add Material</Button>
            </CardHeader>
            <CardContent>
              {(!wo.materials || wo.materials.length === 0) ? (
                <p className="text-sm text-muted-foreground">No materials added yet.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Unit Cost</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wo.materials.map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium text-sm">{m.itemName || '-'}</TableCell>
                            <TableCell className="text-right text-sm">{m.quantity || 0} {m.unit || ''}</TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell">${(m.unitCost || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell font-medium">${(m.totalCost || (m.quantity || 0) * (m.unitCost || 0)).toFixed(2)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] capitalize">{m.status || 'requested'}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end mt-3 pt-3 border-t">
                    <div className="text-sm font-semibold">
                      Total: ${wo.materials.reduce((sum, m) => sum + (m.totalCost || (m.quantity || 0) * (m.unitCost || 0)), 0).toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wo.statusHistory?.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <div className="relative flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-emerald-300'}`} />
                      {i < (wo.statusHistory?.length || 0) - 1 && <div className="w-0.5 h-6 bg-emerald-200" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{h.toStatus.replace(/_/g, ' ')}</span>
                        {h.reason && <span className="text-muted-foreground"> — {h.reason}</span>}
                      </div>
                      <span className="text-muted-foreground text-xs">{formatDateTime(h.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{wo.type.replace('_', ' ')}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Asset</span><span className="font-medium">{wo.assetName || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Assigned To</span><span className="font-medium">{wo.assignedToName || 'Unassigned'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Est. Hours</span><span className="font-medium">{wo.estimatedHours || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Actual Hours</span><span className="font-medium">{wo.actualHours || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Created By</span><span className="font-medium">{wo.creator?.fullName || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{formatDateTime(wo.createdAt)}</span></div>
              {wo.plannedStart && (
                <><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Planned Start</span><span className="font-medium">{formatDateTime(wo.plannedStart)}</span></div></>
              )}
              {wo.actualStart && (
                <><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Actual Start</span><span className="font-medium">{formatDateTime(wo.actualStart)}</span></div></>
              )}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Cost Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Material</span><span className="font-medium">GHS {wo.materialCost.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Labor</span><span className="font-medium">GHS {wo.laborCost.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between font-semibold"><span>Total</span><span>GHS {wo.totalCost.toFixed(2)}</span></div>
            </CardContent>
          </Card>

          {/* Source Request */}
          {wo.request && (
            <Card className="border-teal-200 bg-teal-50/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-teal-700 uppercase tracking-wider mb-1">Source Request</p>
                <p className="font-semibold">{wo.request.requestNumber}</p>
                <p className="text-sm text-muted-foreground">{wo.request.title}</p>
                {wo.request.requester && <p className="text-xs text-muted-foreground mt-1">by {wo.request.requester.fullName}</p>}
              </CardContent>
            </Card>
          )}

          {/* Team Members */}
          {wo.teamMembers && wo.teamMembers.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {wo.teamMembers.map(tm => (
                  <div key={tm.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{getInitials(tm.userName || 'U')}</AvatarFallback></Avatar>
                    <span className="font-medium">{tm.userName}</span>
                    <Badge variant="outline" className="text-[10px] capitalize ml-auto">{tm.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS - USERS (Full CRUD)
// ============================================================================

function SettingsUsersPage() {
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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

// ============================================================================
// SETTINGS - ROLES (Full CRUD + Permission Matrix)
// ============================================================================

function SettingsRolesPage() {
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

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system roles and their associated permissions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Create Role</Button>
      </div>

      {/* Permission Matrix — Role names sticky, permissions scroll horizontally */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header row */}
            <div className="flex border-b bg-muted/40">
              {/* Sticky role name header */}
              <div className="sticky left-0 z-20 w-56 shrink-0 px-4 py-3 bg-[var(--header)] border-r border-header-border shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
              </div>
              {/* Module columns header — generated dynamically */}
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="px-3 py-3 border-r border-border/50 min-w-[180px] shrink-0 last:border-r-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{module.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{perms.length} permissions</p>
                </div>
              ))}
            </div>

            {/* Role rows */}
            <div className="divide-y">
              {roles.map(role => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <div
                    key={role.id}
                    className={`flex items-stretch transition-colors ${isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-muted/20 cursor-pointer'}`}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    {/* Sticky role name cell */}
                    <div className={`sticky left-0 z-10 w-56 shrink-0 px-4 py-3 border-r border-header-border flex items-center gap-2.5 transition-colors shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] ${isSelected ? 'bg-emerald-50/95 dark:bg-emerald-950/40' : 'bg-card'}`}>
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (role.color || '#10b981') + '20', color: role.color || '#10b981' }}>
                        <Shield className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{role.name}</p>
                          {role.isSystem && <span className="text-[8px] px-1 py-px rounded bg-muted text-muted-foreground font-bold shrink-0">SYS</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{role.description || `Level ${role.level}`}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0">
                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditRole(role); }}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          {!role.isSystem && <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Permission columns for this role */}
                    {isSelected ? (
                      Object.entries(permissionsByModule).map(([module, perms]) => (
                        <div key={module} className="px-3 py-2 border-r border-border/50 min-w-[180px] shrink-0 last:border-r-0">
                          <div className="space-y-1">
                            {perms.map(p => {
                              const isOn = rolePerms.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  className={`flex items-center justify-between px-2 py-1.5 rounded-md transition-colors cursor-pointer ${isOn ? 'bg-emerald-100/80 dark:bg-emerald-900/40' : 'hover:bg-muted/40'}`}
                                  onClick={(e) => { e.stopPropagation(); togglePermission(p.id); }}
                                >
                                  <span className="text-xs truncate mr-2">{p.name}</span>
                                  <Switch
                                    checked={isOn}
                                    onCheckedChange={() => togglePermission(p.id)}
                                    className="scale-75"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      Object.entries(permissionsByModule).map(([module, perms]) => {
                        const rpIds = allRolePerms[role.id] || [];
                        const modulePermIds = perms.map(p => p.id);
                        const enabledCount = modulePermIds.filter(pid => rpIds.includes(pid)).length;
                        return (
                          <div key={module} className="px-3 py-2 border-r border-border/50 min-w-[180px] shrink-0 last:border-r-0 flex items-center justify-center">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
                              <span className="text-xs font-medium text-muted-foreground">{enabledCount}<span className="text-muted-foreground/50">/{perms.length}</span></span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {savingPerm && (
          <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/30">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
            <span className="text-xs text-muted-foreground">Saving permissions...</span>
          </div>
        )}
      </Card>

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

// ============================================================================
// SETTINGS - MODULES
// ============================================================================

function SettingsModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuthStore();
  const canToggle = hasPermission('modules.activate');

  useEffect(() => {
    api.get<Module[]>('/api/modules').then(res => {
      if (res.success && res.data) setModules(res.data);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (mod: Module) => {
    if (mod.isCore && !mod.isEnabled) return;
    const res = await api.patch(`/api/modules/${mod.id}`, { isEnabled: !mod.isEnabled });
    if (res.success) {
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, isEnabled: !m.isEnabled } : m));
      toast.success(`${mod.name} ${!mod.isEnabled ? 'activated' : 'deactivated'}`);
    } else {
      toast.error(res.error || 'Failed to update module');
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Module Management</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage system modules and feature availability</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(mod => {
          const moduleIcon: Record<string, React.ElementType> = {
            maintenance_requests: ClipboardList,
            work_orders: Wrench,
            assets: Building2,
            inventory: Package,
            production: Zap,
            analytics: BarChart3,
          };
          const Icon = moduleIcon[mod.code] || Boxes;

          return (
            <Card key={mod.id} className={`border-0 shadow-sm transition-all hover:shadow-md ${mod.isEnabled ? 'ring-1 ring-emerald-200' : 'opacity-75'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${mod.isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{mod.name}</h3>
                        {mod.isCore && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">CORE</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mod.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] font-mono">{mod.code}</Badge>
                        <span className="text-[10px] text-muted-foreground">v{mod.version}</span>
                      </div>
                    </div>
                  </div>
                  {canToggle && (
                    <Switch
                      checked={mod.isEnabled}
                      onCheckedChange={() => handleToggle(mod)}
                      disabled={mod.isCore && mod.isEnabled}
                    />
                  )}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${mod.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-[11px] font-medium">{mod.isEnabled ? 'Active' : 'Inactive'}</span>
                    </div>
                    {!mod.isCore && (
                      <Badge variant="secondary" className="text-[9px]">Optional</Badge>
                    )}
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
// COMPANY PROFILE PAGE
// ============================================================================

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

function CompanyProfilePage() {
  const [form, setForm] = useState<CompanyProfile>(defaultCompanyProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CompanyProfile>('/api/company-profile').then(res => {
      if (res.success && res.data) setForm(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your organization details and information</p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* Company Logo Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Company Logo</CardTitle>
            <CardDescription>Upload your company logo for branding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 overflow-hidden">
                {form.logo ? (
                  <img src={form.logo} alt="Company Logo" className="h-full w-full object-cover" />
                ) : (
                  <Factory className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Logo upload will be available in a future update</p>
                <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
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

function SettingsPlantsPage() {
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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

function SettingsDepartmentsPage() {
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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

function NotificationsPage() {
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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

function AuditLogsPage() {
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all system changes and actions</p>
      </div>
      <div className="flex flex-wrap gap-3">
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

function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [plantList, setPlantList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  // Detail view
  const [detailId, setDetailId] = useState<string | null>(null);
  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { navigate } = useNavigationStore();

  const emptyForm = { name: '', assetTag: '', serialNumber: '', categoryId: '', manufacturer: '', model: '', yearManufactured: '', condition: 'new', status: 'operational', criticality: 'medium', location: '', building: '', floor: '', area: '', plantId: '', departmentId: '', description: '', purchaseDate: '', purchaseCost: '', expectedLifeYears: '' };
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(() => {
    Promise.all([api.get<any[]>('/api/assets'), api.get<any[]>('/api/asset-categories'), api.get<any[]>('/api/plants')]).then(([aRes, cRes, pRes]) => {
      if (aRes.success && aRes.data) setAssets(Array.isArray(aRes.data) ? aRes.data : []);
      if (cRes.success && cRes.data) setCategories(Array.isArray(cRes.data) ? cRes.data : []);
      if (pRes.success && pRes.data) setPlantList(Array.isArray(pRes.data) ? pRes.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (searchText) { const q = searchText.toLowerCase(); if (!a.name.toLowerCase().includes(q) && !a.assetTag.toLowerCase().includes(q)) return false; }
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (conditionFilter !== 'all' && a.condition !== conditionFilter) return false;
      if (criticalityFilter !== 'all' && a.criticality !== criticalityFilter) return false;
      return true;
    });
  }, [assets, searchText, statusFilter, conditionFilter, criticalityFilter]);

  const stats = useMemo(() => ({
    total: assets.length,
    operational: assets.filter(a => a.status === 'operational').length,
    maintenance: assets.filter(a => a.status === 'under_maintenance').length,
    critical: assets.filter(a => a.criticality === 'critical').length,
  }), [assets]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: any) => { setEditId(a.id); setForm({ name: a.name, assetTag: a.assetTag, serialNumber: a.serialNumber || '', categoryId: a.categoryId || '', manufacturer: a.manufacturer || '', model: a.model || '', yearManufactured: a.yearManufactured?.toString() || '', condition: a.condition || 'new', status: a.status || 'operational', criticality: a.criticality || 'medium', location: a.location || '', building: a.building || '', floor: a.floor || '', area: a.area || '', plantId: a.plantId || '', departmentId: a.departmentId || '', description: a.description || '', purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '', purchaseCost: a.purchaseCost?.toString() || '', expectedLifeYears: a.expectedLifeYears?.toString() || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.assetTag) { toast.error('Name and asset tag required'); return; }
    setSaving(true);
    const payload: any = { ...form, purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : undefined, yearManufactured: form.yearManufactured ? parseInt(form.yearManufactured) : undefined, expectedLifeYears: form.expectedLifeYears ? parseInt(form.expectedLifeYears) : undefined, purchaseDate: form.purchaseDate || undefined };
    const res = editId ? await api.put(`/api/assets/${editId}`, payload) : await api.post('/api/assets', payload);
    if (res.success) { toast.success(editId ? 'Asset updated' : 'Asset created'); setDialogOpen(false); loadData(); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const statusColors: Record<string, string> = { operational: 'bg-emerald-100 text-emerald-700', under_maintenance: 'bg-amber-100 text-amber-700', decommissioned: 'bg-slate-100 text-slate-500', disposed: 'bg-red-100 text-red-600' };
  const criticalityColors: Record<string, string> = { low: 'bg-slate-100 text-slate-600', medium: 'bg-sky-100 text-sky-700', high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700' };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await api.delete(`/api/assets/${deleteId}`);
    if (res.success) { toast.success('Asset deleted'); setDeleteId(null); loadData(); }
    else { toast.error(res.error || 'Failed to delete'); }
  };

  if (loading) return <LoadingSkeleton />;

  // Render detail view if an asset is selected
  if (detailId) {
    return <AssetDetailPage id={detailId} onBack={() => setDetailId(null)} />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Register</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all physical assets and equipment</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Add Asset</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: stats.total, icon: Building2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Operational', value: stats.operational, icon: CheckCircle2, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
          { label: 'Under Maintenance', value: stats.maintenance, icon: Wrench, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm dark:bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="operational">Operational</SelectItem><SelectItem value="under_maintenance">Under Maintenance</SelectItem><SelectItem value="decommissioned">Decommissioned</SelectItem></SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Condition</SelectItem><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent>
        </Select>
        <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Criticality" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Criticality</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm dark:bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Criticality</TableHead>
                <TableHead className="hidden xl:table-cell">Condition</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Building2} title="No assets found" description="Try adjusting your filters." /></TableCell></TableRow>
              ) : filteredAssets.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.assetTag}</TableCell>
                  <TableCell className="font-medium text-sm">{a.name}</TableCell>
                  <TableCell className="text-sm hidden md:table-cell">{a.category?.name || '-'}</TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">{a.location || '-'}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${statusColors[a.status] || ''}`}>{(a.status || '').replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className={`text-[10px] ${criticalityColors[a.criticality] || ''}`}>{(a.criticality || '').toUpperCase()}</Badge></TableCell>
                  <TableCell className="text-xs hidden xl:table-cell capitalize">{a.condition || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailId(a.id)}><Eye className="h-3.5 w-3.5 mr-2" />View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Asset' : 'Create Asset'}</DialogTitle><DialogDescription>{editId ? 'Update asset information.' : 'Register a new asset.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Asset Tag *</Label><Input value={form.assetTag} onChange={e => setForm(f => ({ ...f, assetTag: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Serial Number</Label><Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Category</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Model</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Year</Label><Input value={form.yearManufactured} onChange={e => setForm(f => ({ ...f, yearManufactured: e.target.value }))} placeholder="2024" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Condition</Label>
                <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="operational">Operational</SelectItem><SelectItem value="under_maintenance">Under Maintenance</SelectItem><SelectItem value="decommissioned">Decommissioned</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Criticality</Label>
                <Select value={form.criticality} onValueChange={v => setForm(f => ({ ...f, criticality: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Building</Label><Input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Floor</Label><Input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Area</Label><Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Plant</Label>
                <Select value={form.plantId} onValueChange={v => setForm(f => ({ ...f, plantId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
                  <SelectContent>{plantList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Department ID</Label><Input value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Purchase Date</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Purchase Cost</Label><Input type="number" value={form.purchaseCost} onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Expected Life (years)</Label><Input type="number" value={form.expectedLifeYears} onChange={e => setForm(f => ({ ...f, expectedLifeYears: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}{editId ? 'Save Changes' : 'Create Asset'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Asset</DialogTitle><DialogDescription>Are you sure you want to delete this asset? This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// ASSET DETAIL PAGE
// ============================================================================

function AssetDetailPage({ id, onBack }: { id: string; onBack: () => void }) {
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>(`/api/assets/${id}`).then(res => {
      if (res.success && res.data) setAsset(res.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingSkeleton />;
  if (!asset) return <div className="p-6">Asset not found</div>;

  const specs: Record<string, string> = asset.specification || {};

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{asset.assetTag}</span>
            <Badge variant="outline" className="capitalize">{(asset.status || '').replace(/_/g, ' ')}</Badge>
            <Badge variant="outline" className="capitalize">{asset.condition || '-'}</Badge>
            <Badge variant="outline" className="uppercase">{asset.criticality || '-'}</Badge>
          </div>
          <h1 className="text-xl font-bold mt-1">{asset.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border-0 shadow-sm dark:bg-card">
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{asset.description || 'No description'}</p></CardContent>
          </Card>

          {/* Specifications */}
          {Object.keys(specs).length > 0 && (
            <Card className="border-0 shadow-sm dark:bg-card">
              <CardHeader><CardTitle className="text-base">Specifications</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PM Schedules */}
          {asset.pmSchedules && asset.pmSchedules.length > 0 && (
            <Card className="border-0 shadow-sm dark:bg-card">
              <CardHeader><CardTitle className="text-base">PM Schedules</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {asset.pmSchedules.map((pm: any) => (
                    <div key={pm.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{pm.title}</p>
                        <p className="text-xs text-muted-foreground">{pm.frequencyType} · Priority: {(pm.priority || '').toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Next Due</p>
                        <p className="text-sm font-medium">{pm.nextDueDate ? formatDate(pm.nextDueDate) : 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm dark:bg-card">
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{asset.category?.name || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Serial Number</span><span className="font-mono font-medium">{asset.serialNumber || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Manufacturer</span><span className="font-medium">{asset.manufacturer || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">{asset.model || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{asset.location || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Plant</span><span className="font-medium">{asset.plant?.name || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{formatDate(asset.createdAt)}</span></div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card className="border-0 shadow-sm dark:bg-card">
            <CardHeader><CardTitle className="text-base">Financial</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Purchase Cost</span><span className="font-medium">${asset.purchaseCost?.toLocaleString() || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Current Value</span><span className="font-medium">${asset.currentValue?.toLocaleString() || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Purchase Date</span><span className="font-medium">{formatDate(asset.purchaseDate)}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Warranty Expiry</span><span className="font-medium">{formatDate(asset.warrantyExpiry)}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Expected Life</span><span className="font-medium">{asset.expectedLifeYears ? `${asset.expectedLifeYears} years` : '-'}</span></div>
            </CardContent>
          </Card>

          {/* Assigned To */}
          {asset.assignedTo && asset.assignedTo.length > 0 && (
            <Card className="border-0 shadow-sm dark:bg-card">
              <CardHeader><CardTitle className="text-base">Assigned To</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {asset.assignedTo.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{getInitials(u.fullName || 'U')}</AvatarFallback></Avatar>
                    <span className="font-medium">{u.fullName}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INVENTORY PAGE
// ============================================================================

function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [plantList, setPlantList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Stock movement
  const [movementOpen, setMovementOpen] = useState(false);
  const [movType, setMovType] = useState('in');
  const [movItemId, setMovItemId] = useState('');
  const [movQty, setMovQty] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movLoading, setMovLoading] = useState(false);
  // Stock movements list
  const [selectedMovItemId, setSelectedMovItemId] = useState<string | null>(null);
  const [stockMovements, setStockMovements] = useState<any[]>([]);

  const emptyForm = { itemCode: '', name: '', description: '', category: 'spare_part', unitOfMeasure: 'each', currentStock: '', minStockLevel: '', maxStockLevel: '', reorderQuantity: '', unitCost: '', supplier: '', location: '', binLocation: '', plantId: '' };
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(() => {
    Promise.all([api.get<any[]>('/api/inventory'), api.get<any[]>('/api/plants')]).then(([iRes, pRes]) => {
      if (iRes.success && iRes.data) setItems(Array.isArray(iRes.data) ? iRes.data : []);
      if (pRes.success && pRes.data) setPlantList(Array.isArray(pRes.data) ? pRes.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      if (searchText) { const q = searchText.toLowerCase(); if (!i.name.toLowerCase().includes(q) && !i.itemCode.toLowerCase().includes(q)) return false; }
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (lowStockOnly && i.currentStock > i.minStockLevel) return false;
      return true;
    });
  }, [items, searchText, categoryFilter, lowStockOnly]);

  const stats = useMemo(() => {
    const lowStock = items.filter(i => i.currentStock <= i.minStockLevel).length;
    const totalValue = items.reduce((sum, i) => sum + (i.currentStock * (i.unitCost || 0)), 0);
    return { total: items.length, lowStock, totalValue };
  }, [items]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (i: any) => { setEditId(i.id); setForm({ itemCode: i.itemCode, name: i.name, description: i.description || '', category: i.category || 'spare_part', unitOfMeasure: i.unitOfMeasure || 'each', currentStock: i.currentStock?.toString() || '', minStockLevel: i.minStockLevel?.toString() || '', maxStockLevel: i.maxStockLevel?.toString() || '', reorderQuantity: i.reorderQuantity?.toString() || '', unitCost: i.unitCost?.toString() || '', supplier: i.supplier || '', location: i.location || '', binLocation: i.binLocation || '', plantId: i.plantId || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.itemCode) { toast.error('Name and item code required'); return; }
    setSaving(true);
    const payload: any = { ...form, currentStock: form.currentStock ? parseFloat(form.currentStock) : 0, minStockLevel: form.minStockLevel ? parseFloat(form.minStockLevel) : 0, maxStockLevel: form.maxStockLevel ? parseFloat(form.maxStockLevel) : undefined, reorderQuantity: form.reorderQuantity ? parseFloat(form.reorderQuantity) : undefined, unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined };
    const res = editId ? await api.put(`/api/inventory/${editId}`, payload) : await api.post('/api/inventory', payload);
    if (res.success) { toast.success(editId ? 'Item updated' : 'Item created'); setDialogOpen(false); loadData(); } else { toast.error(res.error || 'Failed'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await api.delete(`/api/inventory/${deleteId}`);
    if (res.success) { toast.success('Item deleted'); setDeleteId(null); loadData(); }
    else { toast.error(res.error || 'Failed to delete'); }
  };

  const handleStockMovement = async () => {
    if (!movItemId || !movQty) { toast.error('Item and quantity required'); return; }
    setMovLoading(true);
    const res = await api.post(`/api/inventory/${movItemId}/stock-movements`, { type: movType, quantity: parseFloat(movQty), reason: movReason || undefined });
    if (res.success) { toast.success('Stock movement recorded'); setMovementOpen(false); setMovQty(''); setMovReason(''); loadData(); }
    else { toast.error(res.error || 'Failed'); }
    setMovLoading(false);
  };

  const loadMovements = useCallback((itemId: string) => {
    setSelectedMovItemId(itemId);
    api.get<any[]>(`/api/inventory/${itemId}/stock-movements`).then(res => {
      if (res.success && res.data) setStockMovements(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage spare parts, consumables, and supplies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setMovItemId(''); setMovQty(''); setMovReason(''); setMovType('in'); setMovementOpen(true); }} className="gap-1.5"><ArrowUpDown className="h-4 w-4" />Stock Movement</Button>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Add Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Items', value: stats.total, icon: Package, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Low Stock Alerts', value: stats.lowStock, icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Total Value', value: `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm dark:bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search inventory..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="spare_part">Spare Part</SelectItem><SelectItem value="consumable">Consumable</SelectItem><SelectItem value="tool">Tool</SelectItem><SelectItem value="material">Material</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="rounded" />
          <span>Low Stock Only</span>
        </label>
      </div>

      <Card className="border-0 shadow-sm dark:bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead className="hidden md:table-cell">Unit Cost</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={Package} title="No items found" description="Try adjusting your filters." /></TableCell></TableRow>
              ) : filteredItems.map(i => {
                const isLow = i.currentStock <= i.minStockLevel;
                const max = i.maxStockLevel || Math.max(i.minStockLevel * 2, i.currentStock, 100);
                const pct = Math.min(100, (i.currentStock / max) * 100);
                return (
                  <TableRow key={i.id} className={isLow ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                    <TableCell className="font-mono text-xs">{i.itemCode}</TableCell>
                    <TableCell className="font-medium text-sm">{i.name}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell capitalize">{i.category?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5"><span>{i.currentStock}</span><span>{i.maxStockLevel || '—'}</span></div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Min: {i.minStockLevel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{i.unitCost ? `$${i.unitCost.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{i.location || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(i)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadMovements(i.id)}><History className="h-3.5 w-3.5 mr-2" />Movements</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(i.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle><DialogDescription>{editId ? 'Update inventory item.' : 'Add a new item to inventory.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Item Code *</Label><Input value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="spare_part">Spare Part</SelectItem><SelectItem value="consumable">Consumable</SelectItem><SelectItem value="tool">Tool</SelectItem><SelectItem value="material">Material</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Unit of Measure</Label>
                <Select value={form.unitOfMeasure} onValueChange={v => setForm(f => ({ ...f, unitOfMeasure: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="each">Each</SelectItem><SelectItem value="kg">Kg</SelectItem><SelectItem value="liter">Liter</SelectItem><SelectItem value="meter">Meter</SelectItem><SelectItem value="set">Set</SelectItem><SelectItem value="box">Box</SelectItem><SelectItem value="roll">Roll</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Plant</Label>
                <Select value={form.plantId} onValueChange={v => setForm(f => ({ ...f, plantId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{plantList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5"><Label>Current Stock</Label><Input type="number" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Min Stock Level</Label><Input type="number" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Max Stock Level</Label><Input type="number" value={form.maxStockLevel} onChange={e => setForm(f => ({ ...f, maxStockLevel: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Reorder Qty</Label><Input type="number" value={form.reorderQuantity} onChange={e => setForm(f => ({ ...f, reorderQuantity: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Unit Cost ($)</Label><Input type="number" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Bin Location</Label><Input value={form.binLocation} onChange={e => setForm(f => ({ ...f, binLocation: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}{editId ? 'Save Changes' : 'Add Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Inventory Item</DialogTitle><DialogDescription>Are you sure? This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Stock Movement</DialogTitle><DialogDescription>Record a stock movement.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Movement Type</Label>
              <Select value={movType} onValueChange={setMovType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="in">Stock In</SelectItem><SelectItem value="out">Stock Out</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Item *</Label>
              <Select value={movItemId} onValueChange={setMovItemId}>
                <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                <SelectContent>{items.map(it => <SelectItem key={it.id} value={it.id}>{it.name} ({it.itemCode})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" value={movQty} onChange={e => setMovQty(e.target.value)} placeholder="Enter quantity" /></div>
            <div className="space-y-1.5"><Label>Reason</Label><Textarea value={movReason} onChange={e => setMovReason(e.target.value)} placeholder="Optional reason..." rows={2} /></div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={movLoading} onClick={handleStockMovement}>
              {movLoading ? 'Recording...' : 'Record Movement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Movements Section */}
      {selectedMovItemId && (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-base">Stock Movements</CardTitle><CardDescription className="text-xs">For item: {items.find(it => it.id === selectedMovItemId)?.name || selectedMovItemId}</CardDescription></div>
            <Button size="sm" variant="ghost" onClick={() => { setSelectedMovItemId(null); setStockMovements([]); }}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {stockMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock movements found for this item.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="hidden sm:table-cell">Previous</TableHead>
                      <TableHead className="hidden sm:table-cell">New</TableHead>
                      <TableHead className="hidden md:table-cell">Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.map(m => (
                      <TableRow key={m.id}>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${m.type === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : m.type === 'out' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{m.type === 'in' ? 'Stock In' : m.type === 'out' ? 'Stock Out' : 'Adjustment'}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{m.type === 'out' ? '-' : '+'}{m.quantity}</TableCell>
                        <TableCell className="hidden sm:table-cell">{m.previousStock ?? '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell font-medium">{m.newStock ?? '-'}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{m.reason || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// PM SCHEDULES PAGE
// ============================================================================

function PmSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [dueSoonFilter, setDueSoonFilter] = useState(false);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useAuthStore();

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAssetId, setFormAssetId] = useState('');
  const [formFreqType, setFormFreqType] = useState('monthly');
  const [formFreqValue, setFormFreqValue] = useState('1');
  const [formPriority, setFormPriority] = useState('medium');
  const [formEstDuration, setFormEstDuration] = useState('');
  const [formAssignedToId, setFormAssignedToId] = useState('');
  const [formAutoGenWO, setFormAutoGenWO] = useState(true);
  const [formLeadDays, setFormLeadDays] = useState('3');
  const [formNextDueDate, setFormNextDueDate] = useState('');

  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dueSoonFilter) params.set('dueSoon', 'true');
      const res = await api.get(`/api/pm-schedules?${params.toString()}`);
      if (res.success) setSchedules(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [dueSoonFilter]);

  const fetchLookups = useCallback(async () => {
    try {
      const [assetRes, userRes] = await Promise.all([
        api.get('/api/assets?limit=200'),
        api.get('/api/users'),
      ]);
      if (assetRes.success) setAssets(assetRes.data || []);
      if (userRes.success) setUsers((userRes.data || []).filter((u: any) => u.status === 'active'));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);
  useEffect(() => { fetchLookups(); }, [fetchLookups]);

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormAssetId('');
    setFormFreqType('monthly'); setFormFreqValue('1');
    setFormPriority('medium'); setFormEstDuration('');
    setFormAssignedToId(''); setFormAutoGenWO(true);
    setFormLeadDays('3'); setFormNextDueDate('');
  };

  const openCreate = () => { resetForm(); setCreateOpen(true); };
  const openEdit = (item: any) => {
    setFormTitle(item.title || '');
    setFormDesc(item.description || '');
    setFormAssetId(item.assetId || '');
    setFormFreqType(item.frequencyType || 'monthly');
    setFormFreqValue(String(item.frequencyValue || 1));
    setFormPriority(item.priority || 'medium');
    setFormEstDuration(item.estimatedDuration ? String(item.estimatedDuration) : '');
    setFormAssignedToId(item.assignedToId || '');
    setFormAutoGenWO(item.autoGenerateWO !== false);
    setFormLeadDays(String(item.leadDays || 3));
    setFormNextDueDate(item.nextDueDate ? item.nextDueDate.split('T')[0] : '');
    setEditItem(item);
  };

  const handleSave = async () => {
    if (!formTitle || !formAssetId) { toast.error('Title and asset are required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: formTitle, description: formDesc || null,
        assetId: formAssetId, frequencyType: formFreqType,
        frequencyValue: parseInt(formFreqValue, 10) || 1,
        priority: formPriority,
        estimatedDuration: formEstDuration ? parseFloat(formEstDuration) : null,
        assignedToId: formAssignedToId || null,
        autoGenerateWO: formAutoGenWO,
        leadDays: parseInt(formLeadDays, 10) || 3,
        nextDueDate: formNextDueDate || null,
      };

      if (editItem) {
        const res = await api.put(`/api/pm-schedules/${editItem.id}`, payload);
        if (res.success) { toast.success('Schedule updated'); setEditItem(null); fetchSchedules(); }
        else toast.error(res.error || 'Update failed');
      } else {
        const res = await api.post('/api/pm-schedules', payload);
        if (res.success) { toast.success('Schedule created'); setCreateOpen(false); resetForm(); fetchSchedules(); }
        else toast.error(res.error || 'Create failed');
      }
    } catch { toast.error('Operation failed'); }
    setSaving(false);
  };

  const handleDeactivate = async (id: string) => {
    try {
      const res = await api.delete(`/api/pm-schedules/${id}`);
      if (res.success) { toast.success('Schedule deactivated'); fetchSchedules(); }
      else toast.error(res.error || 'Failed');
    } catch { toast.error('Failed'); }
  };

  const freqLabel = (type: string, val: number) => {
    const map: Record<string, string> = {
      daily: `Every ${val} day${val > 1 ? 's' : ''}`,
      weekly: `Every ${val} week${val > 1 ? 's' : ''}`,
      biweekly: `Every ${val * 2} weeks`,
      monthly: `Every ${val} month${val > 1 ? 's' : ''}`,
      quarterly: `Every ${val * 3} months`,
      semiannual: `Every ${val * 6} months`,
      annual: `Every ${val} year${val > 1 ? 's' : ''}`,
      custom_hours: `Every ${val} hours`,
      custom_days: `Every ${val} days`,
      meter_based: `Every ${val} units`,
    };
    return map[type] || `${type}/${val}`;
  };

  const isDueSoon = (d?: string) => {
    if (!d) return false;
    const due = new Date(d);
    const week = new Date(Date.now() + 7 * 86400000);
    return due <= week;
  };

  const isOverdue = (d?: string) => {
    if (!d) return false;
    return new Date(d) < new Date();
  };

  const activeSchedules = schedules.filter(s => s.isActive);
  const dueSoonCount = activeSchedules.filter(s => isDueSoon(s.nextDueDate)).length;
  const overdueCount = activeSchedules.filter(s => isOverdue(s.nextDueDate)).length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Preventive Maintenance</p>
          <h1 className="text-2xl font-bold tracking-tight">PM Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage preventive maintenance schedules for your assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setDueSoonFilter(!dueSoonFilter); }}
            className={dueSoonFilter ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40' : ''}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Due Soon
          </Button>
          {hasPermission('work_orders.create') && (
            <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Schedules', value: schedules.length, icon: Timer, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
          { label: 'Active', value: activeSchedules.length, icon: Activity, color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400' },
          { label: 'Due Soon', value: dueSoonCount, icon: AlertCircle, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">Schedule</TableHead>
                <TableHead className="text-xs font-semibold">Asset</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Frequency</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
                <TableHead className="text-xs font-semibold">Next Due</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Assigned To</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )) : schedules.length === 0 ? (
                <TableRow><TableCell colSpan={8}>
                  <EmptyState icon={Timer} title="No schedules found" description={dueSoonFilter ? "No schedules due in the next 7 days" : "Create your first PM schedule to get started"} />
                </TableCell></TableRow>
              ) : schedules.map(s => (
                <TableRow key={s.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{s.title}</p>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{s.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{s.asset?.name || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{s.asset?.assetTag || ''}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {freqLabel(s.frequencyType, s.frequencyValue)}
                    </Badge>
                  </TableCell>
                  <TableCell><PriorityBadge priority={s.priority} /></TableCell>
                  <TableCell>
                    <div>
                      <p className={`text-xs font-medium ${isOverdue(s.nextDueDate) ? 'text-red-600 dark:text-red-400' : isDueSoon(s.nextDueDate) ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                        {s.nextDueDate ? formatDate(s.nextDueDate) : '—'}
                      </p>
                      {isOverdue(s.nextDueDate) && <p className="text-[10px] text-red-500">OVERDUE</p>}
                      {isDueSoon(s.nextDueDate) && !isOverdue(s.nextDueDate) && <p className="text-[10px] text-amber-500">DUE SOON</p>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <p className="text-xs">{s.assignedTo?.fullName || 'Unassigned'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.isActive && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          {hasPermission('roles.update') && (
                            <DropdownMenuItem onClick={() => handleDeactivate(s.id)} className="text-red-600">
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || !!editItem} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit PM Schedule' : 'New PM Schedule'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Update preventive maintenance schedule' : 'Define a new preventive maintenance schedule for an asset'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Title *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g., Monthly Motor Inspection" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Describe the maintenance tasks..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Asset *</Label>
              <Select value={formAssetId} onValueChange={setFormAssetId}>
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.assetTag})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Frequency Type *</Label>
                <Select value={formFreqType} onValueChange={setFormFreqType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom_hours', 'custom_days', 'meter_based'].map(f => (
                      <SelectItem key={f} value={f}>{f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Frequency Value *</Label>
                <Input type="number" min="1" value={formFreqValue} onChange={e => setFormFreqValue(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high', 'critical'].map(p => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Est. Duration (hrs)</Label>
                <Input type="number" min="0" step="0.5" value={formEstDuration} onChange={e => setFormEstDuration(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assigned To</Label>
              <Select value={formAssignedToId} onValueChange={setFormAssignedToId}>
                <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Next Due Date</Label>
              <Input type="date" value={formNextDueDate} onChange={e => setFormNextDueDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Auto-generate Work Order</p>
                <p className="text-[11px] text-muted-foreground">Automatically create WO when schedule is due</p>
              </div>
              <Switch checked={formAutoGenWO} onCheckedChange={setFormAutoGenWO} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Lead Days</Label>
              <Input type="number" min="0" value={formLeadDays} onChange={e => setFormLeadDays(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Days before due date to generate WO</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editItem ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// ANALYTICS PAGE
// ============================================================================

function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    let active = true;
    api.get(`/api/analytics?period=${period}`).then(res => {
      if (active) {
        if (res.success && res.data) setData(res.data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [period]);

  if (loading) return <LoadingSkeleton />;

  const kpis = data?.kpis || {};
  const costs = data?.costs || {};
  const charts = data?.charts || {};

  const kpiCards = [
    { label: 'MTTR', value: `${kpis.mttr || 0} hrs`, icon: Timer, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'MTBF', value: `${kpis.mtbf || 0} hrs`, icon: Activity, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Asset Utilization', value: `${kpis.assetUtilization || 0}%`, icon: Gauge, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'PM Compliance', value: `${kpis.pmCompliance || 0}%`, icon: Target, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: 'SLA Compliance', value: `${kpis.slaCompliance || 0}%`, icon: CheckCircle2, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const woStatusData = (charts.woStatus || []).map((s: any, i: number) => ({
    status: s.status || s.name || `Status ${i}`,
    count: s.count || s.value || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const woStatusConfig = Object.fromEntries(woStatusData.map((s: any, i: number) => [s.status.toLowerCase().replace(/ /g, '_'), { label: s.status, color: CHART_COLORS[i % CHART_COLORS.length] }])) as any;

  const conditionData = (charts.assetCondition || []).map((c: any) => ({
    name: c.condition || c.name || 'Unknown',
    value: c.count || c.value || 0,
    fill: CHART_COLORS[(charts.assetCondition || []).indexOf(c) % CHART_COLORS.length],
  }));

  const conditionConfig = Object.fromEntries(conditionData.map((c: any) => [c.name, { label: c.name, color: c.fill }])) as any;

  const dailyTrendData = (charts.dailyTrend || []).map((d: any) => ({
    date: d.date ? d.date.slice(5) : d.date,
    created: d.created || d.total || 0,
    completed: d.completed || 0,
  }));

  const trendConfig = {
    created: { label: 'Created', color: '#06b6d4' },
    completed: { label: 'Completed', color: '#10b981' },
  } as const;

  const topAssetsData = (charts.topMaintainedAssets || []).map((a: any) => ({
    name: a.name || 'Unknown',
    count: a.count || a.hours || 0,
  }));

  const topAssetsConfig = {
    count: { label: 'WO Count', color: '#10b981' },
  } as const;

  const priorityData = (charts.woPriority || []).map((p: any, i: number) => ({
    priority: (p.priority || p.name || 'Unknown').charAt(0).toUpperCase() + (p.priority || p.name || 'Unknown').slice(1),
    count: p.count || p.value || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const priorityConfig = Object.fromEntries(priorityData.map((p: any, i: number) => [p.priority.toLowerCase(), { label: p.priority, color: CHART_COLORS[i % CHART_COLORS.length] }])) as any;

  const mrCategoryData = (charts.mrCategories || []).map((c: any, i: number) => ({
    category: c.category || c.name || 'Other',
    count: c.count || c.value || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const mrCatConfig = Object.fromEntries(mrCategoryData.map((c: any, i: number) => [c.category.toLowerCase().replace(/ /g, '_'), { label: c.category, color: CHART_COLORS[i % CHART_COLORS.length] }])) as any;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Maintenance performance insights and KPIs</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpiCards.map(kpi => (
          <Card key={kpi.label} className="border-0 shadow-sm dark:bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${kpi.color}`}><kpi.icon className="h-4.5 w-4.5" /></div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Summary */}
      <Card className="border-0 shadow-sm dark:bg-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Cost Summary</CardTitle><CardDescription className="text-xs">Financial overview</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">${((costs.totalMaintenanceCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Total Maint. Cost</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">${((costs.totalLaborCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Labor Cost</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">${((costs.totalPartsCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Parts Cost</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">${((costs.inventoryValue || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Inventory Value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WO Status Distribution */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Work Order Status</CardTitle><CardDescription className="text-xs">Current distribution</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={woStatusConfig} className="h-[260px] w-full">
              <BarChart data={woStatusData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {woStatusData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Asset Condition Donut */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Asset Condition</CardTitle><CardDescription className="text-xs">Distribution by condition</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={conditionConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={conditionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" strokeWidth={2} stroke="hsl(var(--background))">
                  {conditionData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {conditionData.map((c: any) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.fill }} />
                  <span className="text-muted-foreground">{c.name} ({c.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily WO Trend */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Daily WO Trend</CardTitle><CardDescription className="text-xs">Created vs completed</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[260px] w-full">
              <AreaChart data={dailyTrendData} margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="created" stroke="var(--color-created)" fill="var(--color-created)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="completed" stroke="var(--color-completed)" fill="var(--color-completed)" fillOpacity={0.3} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Maintained Assets */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Maintained Assets</CardTitle><CardDescription className="text-xs">By work order count</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={topAssetsConfig} className="h-[260px] w-full">
              <BarChart data={topAssetsData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="var(--color-count)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* WO Priority Pie */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">WO Priority Mix</CardTitle><CardDescription className="text-xs">Distribution by priority</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={priorityConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={priorityData} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="priority" strokeWidth={2} stroke="hsl(var(--background))">
                  {priorityData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {priorityData.map((p: any) => (
                <div key={p.priority} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.fill }} />
                  <span className="text-muted-foreground">{p.priority} ({p.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* MR Category Bar */}
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">MR Categories</CardTitle><CardDescription className="text-xs">Requests by category</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={mrCatConfig} className="h-[260px] w-full">
              <BarChart data={mrCategoryData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {mrCategoryData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP SHELL
// ============================================================================

function AppShell() {
  const { currentPage, navigate, toggleSidebar, setMobileSidebarOpen } = useNavigationStore();
  const { user, isAuthenticated, isLoading, fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'maintenance-requests':
      case 'mr-detail':
      case 'create-mr': return <MaintenanceRequestsPage />;
      case 'work-orders':
      case 'wo-detail': return <WorkOrdersPage />;
      case 'assets':
      case 'asset-detail': return <AssetsPage />;
      case 'inventory': return <InventoryPage />;
      case 'pm-schedules': return <PmSchedulesPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'notifications': return <NotificationsPage />;
      case 'settings-users': return <SettingsUsersPage />;
      case 'settings-roles': return <SettingsRolesPage />;
      case 'settings-modules': return <SettingsModulesPage />;
      case 'settings-company': return <CompanyProfilePage />;
      case 'settings-plants': return <SettingsPlantsPage />;
      case 'settings-departments': return <SettingsDepartmentsPage />;
      case 'settings-audit': return <AuditLogsPage />;
      default: return <DashboardPage />;
    }
  };

  const pageTitle: Record<string, string> = {
    'dashboard': 'Dashboard',
    'maintenance-requests': 'Maintenance Requests',
    'mr-detail': 'Request Details',
    'create-mr': 'New Request',
    'work-orders': 'Work Orders',
    'wo-detail': 'Work Order Details',
    'assets': 'Asset Register',
    'asset-detail': 'Asset Details',
    'inventory': 'Inventory',
    'pm-schedules': 'PM Schedules',
    'analytics': 'Analytics',
    'notifications': 'Notifications',
    'settings-users': 'Users',
    'settings-roles': 'Roles & Permissions',
    'settings-modules': 'Module Management',
    'settings-company': 'Company Profile',
    'settings-plants': 'Plants',
    'settings-departments': 'Departments',
    'settings-audit': 'Audit Logs',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-header-border flex items-center px-4 gap-3 shrink-0 bg-header z-10">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden lg:flex p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={toggleSidebar}
          >
            {useNavigationStore.getState().sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{pageTitle[currentPage] || 'Dashboard'}</h2>
            <Separator orientation="vertical" className="h-4 bg-border/60" />
            <span className="text-xs text-muted-foreground">iAssetsPro</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-muted transition-colors"
                    onClick={() => {
                      const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                      document.documentElement.classList.toggle('dark');
                      localStorage.setItem('iassetspro-theme', current === 'dark' ? 'light' : 'dark');
                    }}
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-muted transition-colors" onClick={() => navigate('notifications')}>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-header" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Separator orientation="vertical" className="h-6 mx-1 bg-border/40" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 pl-1 pr-1.5 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{user ? getInitials(user.fullName) : '?'}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{user?.roles?.[0]?.name || 'User'}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1.5 pb-1">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{user ? getInitials(user.fullName) : '?'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{user?.username}</p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('dashboard')}><LayoutDashboard className="h-4 w-4 mr-2.5" />Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('notifications')}><Bell className="h-4 w-4 mr-2.5" />Notifications</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('settings-company')}><Building2 className="h-4 w-4 mr-2.5" />Company Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('settings-audit')}><History className="h-4 w-4 mr-2.5" />Audit Logs</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2.5" />Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content - native scroll for reliability */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-in fade-in-0 duration-300">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// ROOT PAGE COMPONENT
// ============================================================================

export default function Home() {
  return <AppShell />;
}
