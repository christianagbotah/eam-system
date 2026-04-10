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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Minus,
  History,
  ArrowUpDown,
  ExternalLink,
  GitBranch,
  ListChecks,
  HeartPulse,
  Box,
  Crosshair,
  Wrench as WrenchIcon,
  Smartphone,
  Radio,
  Wifi,
  Ruler,
  GraduationCap,
  FileText,
  ArrowRightLeft,
  CheckSquare,
  Calendar,
  TrendingDown,
  ShieldCheck,
  FileCheck,
  ShieldAlert,
  TriangleAlert,
  HardHat,
  ScrollText,
  FolderOpen,
  Truck,
  Download,
  Database,
  Link2,
  Globe,
  BellRing,
  Layers,
  Server,
  Cpu,
  Thermometer,
  Droplets,
  ClipboardCheck,
  Group,
  Building,
  FileBarChart,
  PieChart as PieChartIcon,
  BookOpen,
  MapPinned,
  Warehouse,
  ScanLine,
  Route,
  Workflow,
  DollarSign,
  FlaskConical,
  Microscope,
  TestTubes,
  StopCircle,
  Ban,
  Megaphone,
  FilePlus,
  FileSpreadsheet,
  BrainCircuit,
  Waypoints,
  Mail,
  Upload,
  Archive,
  Star,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';

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

// Sidebar inner content extracted as a separate component with collapsible submenus
function SidebarContent({ forceExpanded }: { forceExpanded?: boolean } = {}) {
  const { currentPage, navigate, sidebarOpen, enabledModules } = useNavigationStore();
  const expanded = forceExpanded ?? sidebarOpen;
  const { user, permissions, hasPermission, logout } = useAuthStore();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Menu group definition
  interface NavGroup {
    label: string;
    icon: React.ElementType;
    perm: string;
    page?: PageName;
    moduleCode?: string; // maps to SystemModule.code (lowercase) for module-aware filtering
    moduleCodes?: string[]; // for groups spanning multiple modules (any match = visible)
    children?: { page: PageName; label: string; icon?: React.ElementType }[];
  }

  const menuGroups = useMemo<NavGroup[]>(() => [
    { label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view', page: 'dashboard', moduleCode: 'core' },
    {
      label: 'Assets', icon: Building2, perm: 'assets.view', moduleCode: 'assets',
      children: [
        { page: 'assets-machines', label: 'Machines', icon: Building2 },
        { page: 'assets-hierarchy', label: 'Hierarchy', icon: GitBranch },
        { page: 'assets-bom', label: 'Bill of Materials', icon: ListChecks },
        { page: 'assets-condition-monitoring', label: 'Condition Monitoring', icon: Activity },
        { page: 'assets-digital-twin', label: 'Digital Twin', icon: Box },
        { page: 'assets-health', label: 'Asset Health', icon: HeartPulse },
      ],
    },
    {
      label: 'Maintenance', icon: Wrench, perm: 'work_orders.view', moduleCodes: ['work_orders', 'maintenance_requests'],
      children: [
        { page: 'maintenance-work-orders', label: 'Work Orders', icon: ClipboardList },
        { page: 'maintenance-requests', label: 'Requests', icon: MessageSquare },
        { page: 'maintenance-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { page: 'maintenance-analytics', label: 'Analytics', icon: BarChart3 },
        { page: 'maintenance-calibration', label: 'Calibration', icon: Crosshair },
        { page: 'maintenance-risk-assessment', label: 'Risk Assessment', icon: TriangleAlert },
        { page: 'maintenance-tools', label: 'Tools', icon: WrenchIcon },
        { page: 'pm-schedules', label: 'PM Schedules', icon: Timer },
      ],
    },
    {
      label: 'IoT', icon: Wifi, perm: 'iot.view', moduleCode: 'iot_sensors',
      children: [
        { page: 'iot-devices', label: 'Devices', icon: Smartphone },
        { page: 'iot-monitoring', label: 'Monitoring', icon: Monitor },
        { page: 'iot-rules', label: 'Rules', icon: Radio },
      ],
    },
    {
      label: 'Analytics', icon: BarChart3, perm: 'analytics.view', moduleCodes: ['analytics', 'kpi_dashboard', 'oee', 'downtime', 'energy'],
      children: [
        { page: 'analytics-kpi', label: 'KPI Dashboard', icon: Target },
        { page: 'analytics-oee', label: 'OEE', icon: Gauge },
        { page: 'analytics-downtime', label: 'Downtime', icon: TrendingDown },
        { page: 'analytics-energy', label: 'Energy', icon: Zap },
      ],
    },
    {
      label: 'Operations', icon: ClipboardCheck, perm: 'operations.view', moduleCodes: ['meter_readings', 'training', 'shift_management'],
      children: [
        { page: 'operations-meter-readings', label: 'Meter Readings', icon: Gauge },
        { page: 'operations-training', label: 'Training', icon: GraduationCap },
        { page: 'operations-surveys', label: 'Surveys', icon: FileText },
        { page: 'operations-time-logs', label: 'Time Logs', icon: Clock },
        { page: 'operations-shift-handover', label: 'Shift Handover', icon: ArrowRightLeft },
        { page: 'operations-checklists', label: 'Checklists', icon: CheckSquare },
      ],
    },
    {
      label: 'Production', icon: Zap, perm: 'production.view', moduleCode: 'production',
      children: [
        { page: 'production-work-centers', label: 'Work Centers', icon: Factory },
        { page: 'production-resource-planning', label: 'Resource Planning', icon: Layers },
        { page: 'production-scheduling', label: 'Scheduling', icon: Calendar },
        { page: 'production-capacity', label: 'Capacity', icon: Box },
        { page: 'production-efficiency', label: 'Efficiency', icon: TrendingUp },
        { page: 'production-bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
        { page: 'production-orders', label: 'Orders', icon: ClipboardList },
        { page: 'production-batches', label: 'Batches', icon: Package },
      ],
    },
    {
      label: 'Quality', icon: ShieldCheck, perm: 'quality.view', moduleCodes: ['quality', 'capa'],
      children: [
        { page: 'quality-inspections', label: 'Inspections', icon: Search },
        { page: 'quality-ncr', label: 'NCR', icon: FileCheck },
        { page: 'quality-audits', label: 'Audits', icon: ShieldAlert },
        { page: 'quality-control-plans', label: 'Control Plans', icon: ScrollText },
        { page: 'quality-spc', label: 'SPC', icon: BarChart3 },
        { page: 'quality-capa', label: 'CAPA', icon: HardHat },
      ],
    },
    {
      label: 'Safety', icon: HardHat, perm: 'safety.view', moduleCode: 'safety',
      children: [
        { page: 'safety-incidents', label: 'Incidents', icon: TriangleAlert },
        { page: 'safety-inspections', label: 'Inspections', icon: Search },
        { page: 'safety-training', label: 'Training', icon: GraduationCap },
        { page: 'safety-equipment', label: 'Equipment', icon: HardHat },
        { page: 'safety-permits', label: 'Permits', icon: FileCheck },
      ],
    },
    {
      label: 'Inventory', icon: Package, perm: 'inventory.view', moduleCode: 'inventory',
      children: [
        { page: 'inventory-items', label: 'Items', icon: Package },
        { page: 'inventory-categories', label: 'Categories', icon: FolderOpen },
        { page: 'inventory-locations', label: 'Locations', icon: MapPin },
        { page: 'inventory-transactions', label: 'Transactions', icon: ArrowRightLeft },
        { page: 'inventory-adjustments', label: 'Adjustments', icon: ArrowUpDown },
        { page: 'inventory-requests', label: 'Requests', icon: FileText },
        { page: 'inventory-transfers', label: 'Transfers', icon: Truck },
        { page: 'inventory-suppliers', label: 'Suppliers', icon: Building },
        { page: 'inventory-purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
        { page: 'inventory-receiving', label: 'Receiving', icon: Download },
      ],
    },
    {
      label: 'Reports', icon: FileBarChart, perm: 'reports.view', moduleCode: 'reports',
      children: [
        { page: 'reports-asset', label: 'Asset Reports', icon: Building2 },
        { page: 'reports-maintenance', label: 'Maintenance Reports', icon: Wrench },
        { page: 'reports-inventory', label: 'Inventory Reports', icon: Package },
        { page: 'reports-production', label: 'Production Reports', icon: Factory },
        { page: 'reports-quality', label: 'Quality Reports', icon: ShieldCheck },
        { page: 'reports-safety', label: 'Safety Reports', icon: HardHat },
        { page: 'reports-financial', label: 'Financial Reports', icon: TrendingUp },
        { page: 'reports-custom', label: 'Custom Reports', icon: FileSpreadsheet },
      ],
    },
    {
      label: 'Settings', icon: Cog, perm: 'settings.update', moduleCode: 'modules',
      children: [
        { page: 'settings-general', label: 'General', icon: Settings },
        { page: 'settings-users', label: 'Users', icon: Users },
        { page: 'settings-roles', label: 'Roles & Permissions', icon: Shield },
        { page: 'settings-modules', label: 'Module Management', icon: Boxes },
        { page: 'settings-company', label: 'Company Profile', icon: Building2 },
        { page: 'settings-plants', label: 'Plants', icon: Factory },
        { page: 'settings-departments', label: 'Departments', icon: Building },
        { page: 'settings-notifications', label: 'Notifications', icon: BellRing },
        { page: 'settings-integrations', label: 'Integrations', icon: Link2 },
        { page: 'settings-backup', label: 'Backup', icon: Database },
        { page: 'settings-audit', label: 'Audit Logs', icon: Eye },
      ],
    },
  ], []);

  const toggleMenu = useCallback((label: string) => {
    setOpenMenus(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  }, []);

  // Auto-expand parent when child is active
  useEffect(() => {
    let shouldExpand = false;
    for (const group of menuGroups) {
      if (!group.children) continue;
      const childMatch = group.children.some(c => {
        if (c.page === currentPage) return true;
        if (c.page === 'maintenance-requests' && (currentPage === 'mr-detail' || currentPage === 'create-mr')) return true;
        if (c.page === 'maintenance-work-orders' && currentPage === 'wo-detail') return true;
        return false;
      });
      if (childMatch && !openMenus.includes(group.label)) {
        shouldExpand = true;
        break;
      }
    }
    if (shouldExpand) {
      // Use queueMicrotask to avoid cascading render warning
      queueMicrotask(() => {
        setOpenMenus(prev => {
          const next = [...prev];
          for (const group of menuGroups) {
            if (!group.children) continue;
            const childMatch = group.children.some(c => {
              if (c.page === currentPage) return true;
              if (c.page === 'maintenance-requests' && (currentPage === 'mr-detail' || currentPage === 'create-mr')) return true;
              if (c.page === 'maintenance-work-orders' && currentPage === 'wo-detail') return true;
              return false;
            });
            if (childMatch && !next.includes(group.label)) {
              next.push(group.label);
              break;
            }
          }
          return next;
        });
      });
    }
  }, [currentPage]);

  // Check if a group or its children are active
  const isGroupActive = useCallback((group: NavGroup) => {
    if (group.page) return currentPage === group.page;
    if (!group.children) return false;
    return group.children.some(c => {
      if (c.page === currentPage) return true;
      if (c.page === 'maintenance-requests' && (currentPage === 'mr-detail' || currentPage === 'create-mr')) return true;
      if (c.page === 'maintenance-work-orders' && currentPage === 'wo-detail') return true;
      return false;
    });
  }, [currentPage]);

  // Filter visible groups
  const visibleGroups = useMemo(() => menuGroups.filter(g => {
    // Permission check
    if (!hasPermission(g.perm)) return false;
    // Module-aware check: hide groups whose module is not enabled (unless data not loaded yet)
    if (enabledModules !== null) {
      const codes = g.moduleCodes || (g.moduleCode ? [g.moduleCode] : []);
      if (codes.length > 0 && !codes.some(c => enabledModules.has(c))) return false;
    }
    return true;
  }), [menuGroups, hasPermission, enabledModules, permissions]);

  // Get tooltip text for collapsed sidebar
  const getGroupTooltip = (group: NavGroup) => {
    if (!group.children) return group.label;
    const activeChild = group.children.find(c => {
      if (c.page === currentPage) return true;
      if (c.page === 'maintenance-requests' && (currentPage === 'mr-detail' || currentPage === 'create-mr')) return true;
      if (c.page === 'maintenance-work-orders' && currentPage === 'wo-detail') return true;
      return false;
    });
    return activeChild ? `${group.label} → ${activeChild.label}` : group.label;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shrink-0 shadow-lg shadow-emerald-900/30">
          <Factory className="h-5 w-5 text-white" />
        </div>
        {expanded && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">iAssetsPro</h1>
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest font-medium">Enterprise EAM</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="space-y-0.5">
          {visibleGroups.map(group => {
            const Icon = group.icon;
            const active = isGroupActive(group);
            const isOpen = openMenus.includes(group.label);
            const hasChildren = !!group.children;

            // Standalone item (no children)
            if (!hasChildren) {
              return (
                <TooltipProvider key={group.label} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(group.page!)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                          active
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-sm shadow-black/10'
                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90'
                        }`}
                      >
                        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />}
                        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                        {expanded && <span className="flex-1 text-left">{group.label}</span>}
                      </button>
                    </TooltipTrigger>
                    {!expanded && <TooltipContent side="right">{group.label}</TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
              );
            }

            // Collapsed sidebar — show only icon with tooltip
            if (!expanded) {
              return (
                <TooltipProvider key={group.label} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          const firstChild = group.children![0];
                          navigate(firstChild.page);
                        }}
                        className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                          active
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-sm shadow-black/10'
                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90'
                        }`}
                      >
                        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />}
                        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{getGroupTooltip(group)}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            // Expanded sidebar — show icon + label + chevron + children
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleMenu(group.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                    active
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-sm shadow-black/10'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90'
                  }`}
                >
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />}
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {group.children!.map(child => {
                      const childActive = child.page === currentPage ||
                        (child.page === 'maintenance-requests' && (currentPage === 'mr-detail' || currentPage === 'create-mr')) ||
                        (child.page === 'maintenance-work-orders' && currentPage === 'wo-detail');
                      const ChildIcon = child.icon;
                      return (
                        <button
                          key={child.page}
                          onClick={() => navigate(child.page)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-all relative ${
                            childActive
                              ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground/80'
                          }`}
                        >
                          {childActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-sidebar-primary" />}
                          {ChildIcon && <ChildIcon className={`h-[15px] w-[15px] shrink-0 ${childActive ? 'text-sidebar-primary' : ''}`} />}
                          <span className="flex-1 text-left">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User — Clean profile section */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/80 to-emerald-700/80 flex items-center justify-center shrink-0 ring-1 ring-sidebar-border">
            <span className="text-xs font-bold text-white">{user ? getInitials(user.fullName) : '?'}</span>
          </div>
          {expanded && (
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

      {/* Mobile sidebar */}
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
            <SidebarContent forceExpanded />
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
    <div className="page-content">
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
      <div className="filter-row flex items-center gap-2 flex-wrap">
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
    <div className="page-content">
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
    <div className="page-content">
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
      <div className="filter-row flex items-center gap-2 flex-wrap">
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
    <div className="page-content">
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

  const moduleNames = Object.entries(permissionsByModule);
  const totalPerms = permissions.length;
  const selectedPermCount = rolePerms.length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Page header — shrinks, never scrolls */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-6 lg:px-8 py-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system roles and their associated permissions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Create Role</Button>
      </div>

      {/* Two-column layout: fills remaining height, each column scrolls independently */}
      <div className="flex gap-4 flex-1 min-h-0 mx-6 lg:mx-8 mb-6 lg:mb-8">

        {/* ─── Left Column: Role List (viewport height, own scroll) ─── */}
        <Card className="border border-border/60 shadow-md w-60 shrink-0 flex flex-col overflow-hidden bg-muted/40 dark:bg-muted/20">
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
        <div className="flex-1 min-w-0 overflow-y-auto space-y-4 pr-1">
          {selectedRoleData && (
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: (selectedRoleData.color || '#10b981') + '18', color: selectedRoleData.color || '#10b981' }}>
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{selectedRoleData.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedRoleData.description || `Level ${selectedRoleData.level}`} &middot; {selectedPermCount} of {totalPerms} permissions enabled</p>
              </div>
            </div>
          )}

          {moduleNames.map(([module, perms]) => {
            const moduleEnabledCount = perms.filter(p => rolePerms.includes(p.id)).length;
            const allEnabled = moduleEnabledCount === perms.length;
            return (
              <Card key={module} className="border-0 shadow-sm overflow-hidden">
                {/* Module header with master toggle */}
                <div
                  className={`flex items-center justify-between px-5 py-3.5 border-b transition-colors ${allEnabled ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40' : 'bg-muted/30 border-border/60'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center ${allEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      {allEnabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{module.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-muted-foreground">{perms.length} permissions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-[11px] font-medium tabular-nums ${allEnabled ? 'border-emerald-300 text-emerald-600 dark:border-emerald-600 dark:text-emerald-400' : ''}`}>
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
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
                  {perms.map(p => {
                    const isOn = rolePerms.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${isOn ? 'bg-emerald-50/70 dark:bg-emerald-950/25' : 'hover:bg-muted/50'}`}
                        onClick={() => togglePermission(p.id)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePermission(p.id); } }}
                      >
                        <Switch checked={isOn} onCheckedChange={() => togglePermission(p.id)} className="scale-[0.72] shrink-0" onClick={e => e.stopPropagation()} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium truncate ${isOn ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{p.name}</p>
                          <p className="text-[10px] text-muted-foreground/60 truncate">{p.slug}</p>
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

// ============================================================================
// SETTINGS - MODULES
// ============================================================================

// Module icon mapping
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
  downtime: Timer,
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

function SettingsModulesPage() {
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
    <div className="page-content">
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

      <div className="filter-row flex flex-wrap gap-3 items-center">
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
    <div className="page-content">
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
    <div className="page-content">
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

      <div className="filter-row flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search inventory..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="spare_part">Spare Part</SelectItem><SelectItem value="consumable">Consumable</SelectItem><SelectItem value="tool">Tool</SelectItem><SelectItem value="material">Material</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
        </Select>
        <label className="filter-row-checkbox flex items-center gap-2 text-sm cursor-pointer">
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
    <div className="page-content">
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
    <div className="page-content">
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
// NOTIFICATION POPOVER (Header)
// ============================================================================

function NotificationPopover() {
  const navigate = useNavigationStore(s => s.navigate);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const typeColors: Record<string, string> = {
    mr_assigned: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    wo_assigned: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    wo_completed: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    mr_approved: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    mr_rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    system: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
    info: 'bg-slate-50 text-slate-500 dark:bg-slate-800/30 dark:text-slate-400',
  };

  const typeIcons: Record<string, React.ElementType> = {
    mr_assigned: ClipboardList,
    wo_assigned: Wrench,
    wo_completed: CheckCircle2,
    mr_approved: CheckCircle2,
    mr_rejected: XCircle,
    system: Settings,
    info: MessageSquare,
  };

  const loadNotifications = useCallback(() => {
    setLoading(true);
    api.get('/api/notifications').then(res => {
      if (res.success && res.data) {
        const data = (res.data as any).notifications || res.data;
        setNotifications(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePopoverChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (n: Notification) => {
    if (!n.isRead) {
      await api.put(`/api/notifications/${n.id}`);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    }
    setSelectedNotif(n);
    setDetailOpen(true);
  };

  const handleMarkAllRead = async () => {
    await api.put('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('notifications');
  };

  const handleGoToAction = () => {
    if (selectedNotif?.actionUrl) {
      const url = selectedNotif.actionUrl as string;
      navigate(url as PageName);
    }
    setDetailOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={handlePopoverChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-muted transition-colors">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-h-[16px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0 gap-0 overflow-hidden" sideOffset={8}>
          {/* Popover header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold dark:bg-emerald-900/40 dark:text-emerald-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2" onClick={handleMarkAllRead}>
                <Check className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[340px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-muted" />
                      <div className="h-2.5 w-full rounded bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">You&apos;re all caught up!</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(n => {
                const Icon = typeIcons[n.type] || MessageSquare;
                const colorClass = typeColors[n.type] || typeColors.info;
                return (
                  <button
                    key={n.id}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 last:border-b-0 hover:bg-muted/40 ${!n.isRead ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                    onClick={() => handleMarkRead(n)}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm truncate ${!n.isRead ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>{n.title}</p>
                        {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* View All footer */}
          {notifications.length > 0 && (
            <div className="border-t bg-muted/20 px-2 py-1.5">
              <Button
                variant="ghost"
                className="w-full h-8 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
                onClick={handleViewAll}
              >
                View all notifications
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Notification Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedNotif && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${(typeColors[selectedNotif.type] || typeColors.info)}`}>
                    {React.createElement(typeIcons[selectedNotif.type] || MessageSquare, { className: 'h-5 w-5' })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base">{selectedNotif.title}</DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">{timeAgo(selectedNotif.createdAt)}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-muted/40 border p-4">
                  <p className="text-sm leading-relaxed">{selectedNotif.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
                      {(selectedNotif.type || 'info').replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {selectedNotif.entityType && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Entity</span>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {selectedNotif.entityType.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Status</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${selectedNotif.isRead ? 'bg-muted-foreground/40' : 'bg-emerald-500'}`} />
                      <span className="font-medium">{selectedNotif.isRead ? 'Read' : 'Unread'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Received</span>
                    <span className="font-medium">
                      {selectedNotif.createdAt ? format(new Date(selectedNotif.createdAt), 'MMM d, yyyy \'at\' h:mm a') : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                {selectedNotif.actionUrl && (
                  <Button onClick={handleGoToAction} className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Details
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// ASSETS SUBPAGES
// ============================================================================

function AssetsMachinesPage() {
  const { navigate } = useNavigationStore();
  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Machines</h1>
        <p className="text-muted-foreground mt-1">View and manage all registered machines and equipment</p>
      </div>
      <AssetsPage />
    </div>
  );
}

function AssetsHierarchyPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/assets');
        if (res.data) setAssets(res.data.assets || res.data || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const roots = assets.filter((a: any) => !a.parentId);
  const getChildren = (parentId: string) => assets.filter((a: any) => a.parentId === parentId);
  const toggle = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };

  const renderTree = (items: any[], depth: number = 0) => items.map(a => {
    const children = getChildren(a.id);
    const isOpen = expanded.has(a.id);
    return (
      <div key={a.id}>
        <button onClick={() => children.length > 0 && toggle(a.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm text-left transition-colors" style={{ paddingLeft: `${depth * 20 + 12}px` }}>
          {children.length > 0 && <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />}
          {children.length === 0 && <span className="w-3.5" />}
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate font-medium">{a.name}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">{a.status?.replace(/_/g,' ')}</Badge>
        </button>
        {isOpen && children.length > 0 && renderTree(children, depth + 1)}
      </div>
    );
  });

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asset Hierarchy</h1>
        <p className="text-muted-foreground mt-1">Visualize the parent-child relationships between assets</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tree View</CardTitle>
          <CardDescription>Click to expand/collapse branches</CardDescription>
        </CardHeader>
        <CardContent>
          {roots.length === 0 ? (
            <EmptyState icon={GitBranch} title="No assets found" description="Create assets to build the hierarchy tree" />
          ) : (
            <div className="max-h-[500px] overflow-y-auto">{renderTree(roots)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AssetHealthPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/assets');
        if (res.data) setAssets(res.data.assets || res.data || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const conditions = ['new', 'good', 'fair', 'poor', 'out_of_service'];
  const condColors: Record<string, string> = { new: 'bg-emerald-500', good: 'bg-emerald-400', fair: 'bg-amber-400', poor: 'bg-red-400', out_of_service: 'bg-red-600' };
  const condBadgeColors: Record<string, string> = { new: 'bg-emerald-50 text-emerald-700 border-emerald-200', good: 'bg-emerald-50 text-emerald-700 border-emerald-200', fair: 'bg-amber-50 text-amber-700 border-amber-200', poor: 'bg-red-50 text-red-700 border-red-200', out_of_service: 'bg-red-100 text-red-800 border-red-300' };
  const condLabels: Record<string, string> = { new: 'New', good: 'Good', fair: 'Fair', poor: 'Poor', out_of_service: 'Out of Service' };
  const critColors: Record<string, string> = { low: 'text-emerald-600', medium: 'text-amber-600', high: 'text-orange-600', critical: 'text-red-600' };

  const condCounts = conditions.map(c => ({ condition: c, count: assets.filter((a: any) => a.condition === c).length }));
  const critCounts = ['low', 'medium', 'high', 'critical'].map(c => ({ criticality: c, count: assets.filter((a: any) => a.criticality === c).length }));
  const statusCounts = ['operational', 'standby', 'under_maintenance', 'decommissioned'].map(s => ({ status: s, count: assets.filter((a: any) => a.status === s).length }));
  const total = assets.length || 1;

  const goodCount = assets.filter((a: any) => a.condition === 'good' || a.condition === 'new').length;
  const fairCount = assets.filter((a: any) => a.condition === 'fair').length;
  const poorCount = assets.filter((a: any) => a.condition === 'poor').length;
  const criticalCount = assets.filter((a: any) => a.condition === 'out_of_service').length;

  const summaryCards = [
    { label: 'Total Assets', value: assets.length, icon: Box, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-400' },
    { label: 'Good Condition', value: goodCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Fair Condition', value: fairCount, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Poor Condition', value: poorCount, icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Critical', value: criticalCount, icon: XCircle, color: 'text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300' },
  ];

  // Category distribution
  const categories = useMemo(() => {
    const map = new Map<string, { total: number; good: number; fair: number; poor: number; critical: number }>();
    assets.forEach((a: any) => {
      const cat = a.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, { total: 0, good: 0, fair: 0, poor: 0, critical: 0 });
      const c = map.get(cat)!;
      c.total++;
      if (a.condition === 'good' || a.condition === 'new') c.good++;
      else if (a.condition === 'fair') c.fair++;
      else if (a.condition === 'poor') c.poor++;
      else c.critical++;
    });
    return Array.from(map.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [assets]);

  // Health matrix: group by criticality, show condition badges
  const criticalityLevels = ['critical', 'high', 'medium', 'low'];
  const healthMatrix = criticalityLevels.map(crit => {
    const group = assets.filter((a: any) => a.criticality === crit);
    return { criticality: crit, assets: group };
  });

  // Assets needing attention
  const attentionAssets = assets.filter((a: any) => a.condition === 'poor' || a.condition === 'out_of_service').sort((a: any, b: any) => {
    const order: Record<string, number> = { out_of_service: 0, poor: 1 };
    return (order[a.condition] ?? 2) - (order[b.condition] ?? 2);
  });

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asset Health</h1>
        <p className="text-muted-foreground mt-1">Overview of asset conditions, criticality, and operational status</p>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`h-10 w-10 rounded-lg ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      {/* Health Matrix */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Health Matrix</CardTitle><CardDescription>Asset conditions grouped by criticality level</CardDescription></CardHeader>
        <CardContent>
          {healthMatrix.map(group => (
            <div key={group.criticality} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`capitalize font-semibold ${critColors[group.criticality]} border-current/20`}>{group.criticality}</Badge>
                <span className="text-xs text-muted-foreground">{group.assets.length} asset(s)</span>
              </div>
              {group.assets.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {group.assets.map((a: any) => (
                    <Badge key={a.id} variant="outline" className={`text-[11px] ${condBadgeColors[a.condition] || ''} ${a.condition === 'out_of_service' ? 'animate-pulse' : ''}`}>
                      {a.name || a.assetTag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pl-1">No assets in this criticality level</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health distribution by category */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Health by Category</CardTitle></CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {categories.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No categories" description="Asset categories will appear here." />
            ) : categories.map((cat, idx) => {
              const pct = total > 0 ? Math.round((cat.total / total) * 100) : 0;
              const goodPct = cat.total > 0 ? Math.round((cat.good / cat.total) * 100) : 0;
              const fairPct = cat.total > 0 ? Math.round((cat.fair / cat.total) * 100) : 0;
              const poorPct = cat.total > 0 ? Math.round((cat.poor / cat.total) * 100) : 0;
              return (
                <div key={`${cat.name}-${idx}`} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate max-w-[200px]">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">{cat.total} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="bg-emerald-400 h-full" style={{ width: `${goodPct}%` }} />
                    <div className="bg-amber-400 h-full" style={{ width: `${fairPct}%` }} />
                    <div className="bg-red-400 h-full" style={{ width: `${poorPct}%` }} />
                  </div>
                </div>
              );
            })}
            {categories.length > 0 && (
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-[10px] text-muted-foreground">Good</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-400" /><span className="text-[10px] text-muted-foreground">Fair</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-400" /><span className="text-[10px] text-muted-foreground">Poor/Critical</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Criticality + By Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">By Criticality</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {critCounts.map(c => (
                <div key={c.criticality} className="flex items-center gap-3">
                  <span className={`text-sm font-medium capitalize w-24 ${critColors[c.criticality]}`}>{c.criticality}</span>
                  <div className="flex-1 bg-muted rounded-full h-2.5"><div className="bg-primary rounded-full h-2.5 transition-all" style={{ width: `${(c.count / total) * 100}%` }} /></div>
                  <span className="text-sm font-semibold w-8 text-right">{c.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">By Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {statusCounts.map(s => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className="text-sm font-medium capitalize w-44">{s.status.replace(/_/g,' ')}</span>
                  <div className="flex-1 bg-muted rounded-full h-2.5"><div className="bg-primary rounded-full h-2.5 transition-all" style={{ width: `${(s.count / total) * 100}%` }} /></div>
                  <span className="text-sm font-semibold w-8 text-right">{s.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assets needing attention */}
      {attentionAssets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base">Assets Needing Attention</CardTitle>
            </div>
            <CardDescription>{attentionAssets.length} asset(s) in poor or critical condition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="hidden md:table-cell">Tag</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="hidden lg:table-cell">Criticality</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="hidden lg:table-cell">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attentionAssets.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs hidden md:table-cell">{a.assetTag || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${condBadgeColors[a.condition] || ''} ${a.condition === 'out_of_service' ? 'animate-pulse' : ''}`}>
                          {condLabels[a.condition] || a.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell"><span className={`capitalize text-sm font-medium ${critColors[a.criticality] || ''}`}>{a.criticality || '-'}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{a.location || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{a.category || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Asset detail pages
function AssetsBomPage() {
  const [bomItems] = useState([
    { id: '1', parent: 'CNC Machine A1', component: 'Main Spindle Assembly', partNumber: 'SPD-4521-A', quantity: 1, unit: 'ea', specification: 'High-speed spindle, 15k RPM, 7.5kW', status: 'active', revision: 'C', indent: false },
    { id: '2', parent: 'CNC Machine A1', component: 'Spindle Bearings', partNumber: 'BRG-7810-2RS', quantity: 2, unit: 'ea', specification: 'Angular contact, 50x80x16mm', status: 'active', revision: 'B', indent: true },
    { id: '3', parent: 'CNC Machine A1', component: 'Spindle Motor', partNumber: 'MTR-7500-SPD', quantity: 1, unit: 'ea', specification: 'AC servo, 7.5kW, 3000RPM', status: 'active', revision: 'A', indent: true },
    { id: '4', parent: 'CNC Machine A1', component: 'Coolant Pump', partNumber: 'PMP-CNT-250', quantity: 1, unit: 'ea', specification: 'Centrifugal, 25L/min, 2.2kW', status: 'active', revision: 'B', indent: true },
    { id: '5', parent: 'Boiler System B2', component: 'Burner Assembly', partNumber: 'BRN-GAS-500', quantity: 1, unit: 'ea', specification: 'Natural gas, 500kW capacity', status: 'active', revision: 'D', indent: false },
    { id: '6', parent: 'Boiler System B2', component: 'Ignition Transformer', partNumber: 'TRN-IGN-15KV', quantity: 1, unit: 'ea', specification: '15kV output, intermittent duty', status: 'pending', revision: 'A', indent: true },
    { id: '7', parent: 'Boiler System B2', component: 'Safety Valve', partNumber: 'VLV-SFT-10BAR', quantity: 2, unit: 'ea', specification: 'Spring-loaded, 10 bar setpoint', status: 'active', revision: 'C', indent: true },
    { id: '8', parent: 'Compressor C3', component: 'Air End Assembly', partNumber: 'AEN-SCR-75', quantity: 1, unit: 'ea', specification: 'Screw type, 75kW, 13 bar', status: 'active', revision: 'B', indent: false },
    { id: '9', parent: 'Compressor C3', component: 'Rotor Bearings', partNumber: 'BRG-TAP-3216', quantity: 4, unit: 'ea', specification: 'Tapered roller, 80x140x35mm', status: 'obsolete', revision: 'A', indent: true },
    { id: '10', parent: 'Compressor C3', component: 'Oil Filter Element', partNumber: 'FLT-OIL-HP10', quantity: 3, unit: 'ea', specification: 'High-performance, 10 micron', status: 'active', revision: 'E', indent: true },
  ]);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ parentAsset: '', component: '', partNumber: '', quantity: '', unit: 'ea', specification: '', revision: '' });
  const filtered = searchText.trim() ? bomItems.filter(b => {
    const q = searchText.toLowerCase();
    return b.parent.toLowerCase().includes(q) || b.component.toLowerCase().includes(q) || b.partNumber.toLowerCase().includes(q);
  }) : bomItems;
  const kpis = [
    { label: 'Total BOMs', value: '18', icon: ListChecks, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Components', value: '142', icon: Layers, color: 'bg-sky-50 text-sky-600' },
    { label: 'Active', value: '15', icon: CheckCircle2, color: 'bg-amber-50 text-amber-600' },
    { label: 'Under Review', value: '2', icon: Clock, color: 'bg-violet-50 text-violet-600' },
  ];
  const statusColor = (s: string) => s === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'pending' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  const handleCreate = () => { setSaving(true); setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ parentAsset: '', component: '', partNumber: '', quantity: '', unit: 'ea', specification: '', revision: '' }); toast.success('BOM component added successfully'); }, 800); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Bill of Materials</h1><p className="text-muted-foreground mt-1">Manage hierarchical parts lists for each asset</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Component</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search BOM items..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" /></div>
      </div>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Parent Asset</TableHead><TableHead>Component</TableHead><TableHead className="hidden sm:table-cell">Part Number</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="hidden sm:table-cell">Unit</TableHead><TableHead className="hidden lg:table-cell">Specification</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Rev</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(b => (
            <TableRow key={b.id} className={`hover:bg-muted/30 ${b.indent ? 'ml-6' : ''}`}>
              <TableCell className={`font-medium ${b.indent ? 'text-sm text-muted-foreground' : ''}`}>{b.indent ? '└ ' : ''}{b.parent}</TableCell>
              <TableCell className={b.indent ? 'text-sm pl-6' : ''}>{b.component}</TableCell>
              <TableCell className="font-mono text-xs hidden sm:table-cell">{b.partNumber}</TableCell>
              <TableCell className="text-right">{b.quantity}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{b.unit}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{b.specification}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(b.status)}><span className="capitalize">{b.status}</span></Badge></TableCell>
              <TableCell className="font-mono text-xs hidden md:table-cell">{b.revision}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add BOM Component</DialogTitle><DialogDescription>Add a new component to a Bill of Materials</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Parent Asset</Label><Input placeholder="e.g. CNC Machine A1" value={form.parentAsset} onChange={e => setForm(f => ({ ...f, parentAsset: e.target.value }))} /></div>
            <div><Label>Component</Label><Input placeholder="e.g. Main Spindle Assembly" value={form.component} onChange={e => setForm(f => ({ ...f, component: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Part Number</Label><Input placeholder="e.g. SPD-4521-A" value={form.partNumber} onChange={e => setForm(f => ({ ...f, partNumber: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity</Label><Input type="number" placeholder="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><Label>Unit</Label><Input placeholder="ea" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
              </div>
            </div>
            <div><Label>Specification</Label><Textarea placeholder="Component specifications..." value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))} /></div>
            <div><Label>Revision</Label><Input placeholder="e.g. A" value={form.revision} onChange={e => setForm(f => ({ ...f, revision: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.parentAsset || !form.component}>{saving ? 'Saving...' : 'Add Component'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function AssetsConditionMonitoringPage() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const assetCards = [
    { id: '1', name: 'Main Compressor A', parameter: 'Vibration', value: 4.2, unit: 'mm/s', status: 'normal', trend: 'stable' },
    { id: '2', name: 'Boiler Feed Pump', parameter: 'Temperature', value: 87.5, unit: '°C', status: 'warning', trend: 'rising' },
    { id: '3', name: 'Hydraulic Press #1', parameter: 'Pressure', value: 210, unit: 'bar', status: 'normal', trend: 'stable' },
    { id: '4', name: 'Cooling Tower Fan', parameter: 'Vibration', value: 8.7, unit: 'mm/s', status: 'critical', trend: 'rising' },
    { id: '5', name: 'Conveyor Drive Motor', parameter: 'Temperature', value: 62.1, unit: '°C', status: 'normal', trend: 'falling' },
    { id: '6', name: 'Air Handling Unit', parameter: 'Pressure', value: 1.8, unit: 'bar', status: 'warning', trend: 'rising' },
  ];
  const tableData = [
    { id: '1', asset: 'Main Compressor A', parameter: 'Vibration', current: '4.2 mm/s', normal: '0–5 mm/s', status: 'normal', lastReading: '2025-01-15 14:30', trend: '→' },
    { id: '2', asset: 'Boiler Feed Pump', parameter: 'Temperature', current: '87.5 °C', normal: '60–80 °C', status: 'warning', lastReading: '2025-01-15 14:25', trend: '↑' },
    { id: '3', asset: 'Hydraulic Press #1', parameter: 'Pressure', current: '210 bar', normal: '180–240 bar', status: 'normal', lastReading: '2025-01-15 14:20', trend: '→' },
    { id: '4', asset: 'Cooling Tower Fan', parameter: 'Vibration', current: '8.7 mm/s', normal: '0–5 mm/s', status: 'critical', lastReading: '2025-01-15 14:15', trend: '↑' },
    { id: '5', asset: 'Conveyor Drive Motor', parameter: 'Temperature', current: '62.1 °C', normal: '50–75 °C', status: 'normal', lastReading: '2025-01-15 14:10', trend: '↓' },
    { id: '6', asset: 'Air Handling Unit', parameter: 'Pressure', current: '1.8 bar', normal: '1.0–1.5 bar', status: 'warning', lastReading: '2025-01-15 14:05', trend: '↑' },
    { id: '7', asset: 'CNC Spindle Motor', parameter: 'Vibration', current: '3.1 mm/s', normal: '0–5 mm/s', status: 'normal', lastReading: '2025-01-15 14:00', trend: '→' },
    { id: '8', asset: 'Generator Set', parameter: 'Temperature', current: '78.2 °C', normal: '60–85 °C', status: 'normal', lastReading: '2025-01-15 13:55', trend: '↓' },
  ];
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ asset: '', parameter: 'vibration', normalMin: '', normalMax: '', alertThreshold: '' });
  const filtered = searchText.trim() ? tableData.filter(r => {
    const q = searchText.toLowerCase();
    return r.asset.toLowerCase().includes(q) || r.parameter.toLowerCase().includes(q);
  }) : tableData;
  const kpis = [
    { label: 'Assets Monitored', value: '24', icon: Activity, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Normal', value: '19', icon: CheckCircle2, color: 'bg-sky-50 text-sky-600' },
    { label: 'Warning', value: '3', icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Critical', value: '2', icon: AlertCircle, color: 'bg-red-50 text-red-600' },
  ];
  const statusColor = (s: string) => s === 'normal' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'warning' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  const dotColor = (s: string) => s === 'normal' ? 'bg-emerald-500' : s === 'warning' ? 'bg-amber-500' : 'bg-red-500';
  const barColor = (s: string) => s === 'normal' ? 'bg-emerald-400' : s === 'warning' ? 'bg-amber-400' : 'bg-red-400';
  const handleCreate = () => { setSaving(true); setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ asset: '', parameter: 'vibration', normalMin: '', normalMax: '', alertThreshold: '' }); toast.success('Monitoring point added successfully'); }, 800); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Condition Monitoring</h1><p className="text-muted-foreground mt-1">Real-time monitoring of asset health parameters</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Monitoring Point</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assetCards.map(card => (
          <Card key={card.id} className={`border border-border/60 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedCard === card.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedCard(selectedCard === card.id ? null : card.id)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{card.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.parameter}</p>
                </div>
                <div className={`h-3 w-3 rounded-full ${dotColor(card.status)} animate-pulse`} />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">{card.value}</span>
                <span className="text-sm text-muted-foreground mb-0.5">{card.unit}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className={statusColor(card.status)}><span className="capitalize">{card.status}</span></Badge>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${barColor(card.status)} rounded-full`} style={{ width: card.status === 'normal' ? '40%' : card.status === 'warning' ? '70%' : '95%' }} />
                </div>
                <span className="text-xs text-muted-foreground">{card.trend === 'rising' ? '↑' : card.trend === 'falling' ? '↓' : '→'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search assets..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" /></div>
      </div>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead className="hidden sm:table-cell">Parameter</TableHead><TableHead>Current Value</TableHead><TableHead className="hidden md:table-cell">Normal Range</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Last Reading</TableHead><TableHead>Trend</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(r => (
            <TableRow key={r.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{r.asset}</TableCell>
              <TableCell className="text-sm hidden sm:table-cell">{r.parameter}</TableCell>
              <TableCell className="font-medium">{r.current}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{r.normal}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(r.status)}><span className="capitalize">{r.status}</span></Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDateTime(r.lastReading)}</TableCell>
              <TableCell><span className={`text-lg font-bold ${r.trend === '↑' ? 'text-red-500' : r.trend === '↓' ? 'text-emerald-500' : 'text-slate-400'}`}>{r.trend}</span></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add Monitoring Point</DialogTitle><DialogDescription>Configure a new condition monitoring point</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Asset</Label><Input placeholder="e.g. Main Compressor A" value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))} /></div>
            <div><Label>Parameter</Label><Select value={form.parameter} onValueChange={v => setForm(f => ({ ...f, parameter: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="vibration">Vibration</SelectItem><SelectItem value="temperature">Temperature</SelectItem><SelectItem value="pressure">Pressure</SelectItem><SelectItem value="flow">Flow Rate</SelectItem><SelectItem value="current">Current</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Normal Min</Label><Input placeholder="0" value={form.normalMin} onChange={e => setForm(f => ({ ...f, normalMin: e.target.value }))} /></div>
              <div><Label>Normal Max</Label><Input placeholder="100" value={form.normalMax} onChange={e => setForm(f => ({ ...f, normalMax: e.target.value }))} /></div>
            </div>
            <div><Label>Alert Threshold</Label><Input placeholder="e.g. 90" value={form.alertThreshold} onChange={e => setForm(f => ({ ...f, alertThreshold: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.asset}>{saving ? 'Saving...' : 'Add Point'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function AssetsDigitalTwinPage() {
  const [selectedTwin, setSelectedTwin] = useState<string>('1');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', asset: '', type: 'pump', syncInterval: '1min' });
  const twins = [
    { id: '1', name: 'Centrifugal Pump P-101', asset: 'Main Water Pump', type: 'pump', status: 'active', lastSync: '2025-01-15 14:30', healthScore: 92 },
    { id: '2', name: 'Induction Motor M-201', asset: 'Conveyor Drive', type: 'motor', status: 'active', lastSync: '2025-01-15 14:28', healthScore: 87 },
    { id: '3', name: 'Screw Compressor C-301', asset: 'Air Compressor', type: 'compressor', status: 'active', lastSync: '2025-01-15 14:25', healthScore: 64 },
    { id: '4', name: 'Control Valve V-401', asset: 'Steam Valve', type: 'valve', status: 'inactive', lastSync: '2025-01-14 09:15', healthScore: 0 },
  ];
  const twinSpecs: Record<string, { name: string; value: string; unit: string; status: string }[]> = {
    '1': [
      { name: 'Flow Rate', value: '245', unit: 'L/min', status: 'normal' },
      { name: 'Discharge Pressure', value: '4.2', unit: 'bar', status: 'normal' },
      { name: 'Vibration', value: '2.8', unit: 'mm/s', status: 'normal' },
      { name: 'Bearing Temp', value: '52', unit: '°C', status: 'normal' },
      { name: 'Power Draw', value: '18.5', unit: 'kW', status: 'normal' },
      { name: 'Seal Leakage', value: '0.1', unit: 'mL/hr', status: 'normal' },
      { name: 'Efficiency', value: '82', unit: '%', status: 'normal' },
      { name: 'Runtime Hours', value: '12,450', unit: 'hrs', status: 'normal' },
    ],
    '2': [
      { name: 'Speed', value: '1485', unit: 'RPM', status: 'normal' },
      { name: 'Current Draw', value: '35.2', unit: 'A', status: 'warning' },
      { name: 'Winding Temp', value: '78', unit: '°C', status: 'normal' },
      { name: 'Vibration', value: '3.1', unit: 'mm/s', status: 'normal' },
      { name: 'Power Factor', value: '0.89', unit: '', status: 'normal' },
      { name: 'Torque', value: '142', unit: 'Nm', status: 'normal' },
      { name: 'Insulation R', value: '250', unit: 'MΩ', status: 'normal' },
      { name: 'Runtime Hours', value: '8,920', unit: 'hrs', status: 'normal' },
    ],
    '3': [
      { name: 'Outlet Pressure', value: '7.8', unit: 'bar', status: 'warning' },
      { name: 'Flow Rate', value: '12.5', unit: 'm³/min', status: 'normal' },
      { name: 'Bearing Vibration', value: '6.2', unit: 'mm/s', status: 'warning' },
      { name: 'Oil Temp', value: '82', unit: '°C', status: 'critical' },
      { name: 'Power Draw', value: '72', unit: 'kW', status: 'warning' },
      { name: 'Discharge Temp', value: '95', unit: '°C', status: 'warning' },
      { name: 'Load Factor', value: '88', unit: '%', status: 'normal' },
      { name: 'Runtime Hours', value: '15,300', unit: 'hrs', status: 'normal' },
    ],
    '4': [
      { name: 'Position', value: '65', unit: '%', status: 'normal' },
      { name: 'Actuator Pressure', value: '4.0', unit: 'bar', status: 'normal' },
      { name: 'Valve Leakage', value: '0', unit: 'mL/min', status: 'normal' },
      { name: 'Body Temp', value: '185', unit: '°C', status: 'normal' },
      { name: 'Travel Time', value: '3.2', unit: 'sec', status: 'normal' },
      { name: 'Stem Torque', value: '45', unit: 'Nm', status: 'normal' },
    ],
  };
  const currentTwin = twins.find(t => t.id === selectedTwin);
  const kpis = [
    { label: 'Digital Twins', value: '8', icon: Box, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Active Sync', value: '6', icon: RefreshCw, color: 'bg-sky-50 text-sky-600' },
    { label: 'Simulation Runs', value: '34', icon: Play, color: 'bg-amber-50 text-amber-600' },
    { label: 'Alerts', value: '2', icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];
  const statusColor = (s: string) => s === 'normal' ? 'text-emerald-600' : s === 'warning' ? 'text-amber-600' : 'text-red-600';
  const healthRingColor = (score: number) => score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  const handleCreate = () => { setSaving(true); setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ name: '', asset: '', type: 'pump', syncInterval: '1min' }); toast.success('Digital twin created successfully'); }, 800); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Digital Twin</h1><p className="text-muted-foreground mt-1">Create and manage digital replicas of physical assets</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Twin</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {twins.map(twin => (
          <Card key={twin.id} className={`border border-border/60 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedTwin === twin.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedTwin(twin.id)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{twin.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{twin.asset}</p>
                </div>
                <Badge variant="outline" className={twin.status === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'}>
                  <span className="capitalize">{twin.status}</span>
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">Type: <span className="capitalize font-medium text-foreground">{twin.type}</span></div>
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/30" /><circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5" strokeDasharray={`${twin.healthScore * 1} ${100 - twin.healthScore}`} className={healthRingColor(twin.healthScore)} strokeLinecap="round" /></svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{twin.healthScore}%</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Last sync: {formatDateTime(twin.lastSync)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {currentTwin && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{currentTwin.name} — Specifications</CardTitle>
            <CardDescription className="text-xs">Real-time parameter data from the digital twin model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Value</TableHead><TableHead className="hidden sm:table-cell">Unit</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {(twinSpecs[selectedTwin] || []).map((spec, i) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{spec.name}</TableCell>
                  <TableCell className="font-mono">{spec.value}</TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{spec.unit}</TableCell>
                  <TableCell><span className={`text-xs font-medium ${statusColor(spec.status)}`}>{spec.status === 'normal' ? '● Normal' : spec.status === 'warning' ? '● Warning' : '● Critical'}</span></TableCell>
                </TableRow>
              ))}
            </TableBody></Table></div>
          </CardContent>
        </Card>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create Digital Twin</DialogTitle><DialogDescription>Create a new digital replica for an asset</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Twin Name</Label><Input placeholder="e.g. Centrifugal Pump P-101" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Asset</Label><Input placeholder="e.g. Main Water Pump" value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pump">Pump</SelectItem><SelectItem value="motor">Motor</SelectItem><SelectItem value="compressor">Compressor</SelectItem><SelectItem value="valve">Valve</SelectItem><SelectItem value="heat_exchanger">Heat Exchanger</SelectItem></SelectContent></Select></div>
              <div><Label>Sync Interval</Label><Select value={form.syncInterval} onValueChange={v => setForm(f => ({ ...f, syncInterval: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="real_time">Real-time</SelectItem><SelectItem value="1min">1 min</SelectItem><SelectItem value="5min">5 min</SelectItem><SelectItem value="15min">15 min</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.name || !form.asset}>{saving ? 'Creating...' : 'Create Twin'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// MAINTENANCE SUBPAGES
// ============================================================================

function MaintenanceWorkOrdersPage() {
  const { navigate } = useNavigationStore();
  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
        <p className="text-muted-foreground mt-1">Create, track, and manage all maintenance work orders</p>
      </div>
      <WorkOrdersPage />
    </div>
  );
}

function MaintenanceDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { const res = await api.get('/api/dashboard/stats'); if (res.data) setStats(res.data); } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);
  const kpis = [
    { label: 'Active WOs', value: stats?.activeWorkOrders ?? '-', icon: Wrench, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Completed', value: stats?.completedWorkOrders ?? '-', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Overdue', value: stats?.overdueWorkOrders ?? '-', icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Created Today', value: stats?.createdTodayWO ?? '-', icon: Plus, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
  ];
  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Maintenance Dashboard</h1><p className="text-muted-foreground mt-1">Maintenance operations overview and KPIs</p></div>
      {loading ? <LoadingSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
      )}
    </div>
  );
}

function MaintenanceAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<WorkOrder[]>('/api/work-orders'),
    ]).then(([statsRes, woRes]) => {
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (woRes.success && woRes.data) setWorkOrders(woRes.data);
      setLoading(false);
    });
  }, []);

  const completedWOs = workOrders.filter(wo => wo.status === 'completed' || wo.status === 'verified' || wo.status === 'closed');
  const mttr = completedWOs.length > 0 ? (completedWOs.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) / completedWOs.length).toFixed(1) : '0.0';
  const totalHours = completedWOs.reduce((sum, wo) => sum + (wo.actualHours || 0), 0);
  const mtbf = completedWOs.length > 1 ? (totalHours / Math.max(completedWOs.length - 1, 1)).toFixed(1) : totalHours.toFixed(1);
  const totalWOs = stats?.totalWorkOrders || 0;
  const preventiveWOs = stats?.preventiveWO || 0;
  const pmCompliance = totalWOs > 0 ? Math.round((preventiveWOs / totalWOs) * 100) : 0;
  const totalCost = workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);

  const typeBreakdown = [
    { type: 'Preventive', count: stats?.preventiveWO || 0, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { type: 'Corrective', count: stats?.correctiveWO || 0, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    { type: 'Emergency', count: stats?.emergencyWO || 0, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    { type: 'Inspection', count: stats?.inspectionWO || 0, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
    { type: 'Predictive', count: stats?.predictiveWO || 0, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  ];

  const priorityBreakdown = [
    { priority: 'Low', count: workOrders.filter(wo => wo.priority === 'low').length },
    { priority: 'Medium', count: workOrders.filter(wo => wo.priority === 'medium').length },
    { priority: 'High', count: workOrders.filter(wo => wo.priority === 'high').length },
    { priority: 'Critical', count: workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'emergency').length },
  ];

  const kpis = [
    { label: 'MTTR (Hours)', value: mttr, icon: Timer, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'MTBF (Hours)', value: mtbf, icon: Activity, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'PM Compliance', value: `${pmCompliance}%`, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Total Maintenance Cost', value: `$${totalCost.toLocaleString()}`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Maintenance Analytics</h1><p className="text-muted-foreground mt-1">Advanced analytics for maintenance operations including MTTR, MTBF, and cost trends</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border"><CardHeader><CardTitle className="text-base">WO Type Distribution</CardTitle><CardDescription className="text-xs">Breakdown by work order type</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {typeBreakdown.map(t => {
                const pct = totalWOs > 0 ? Math.round((t.count / totalWOs) * 100) : 0;
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-24">{t.type}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{t.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
          <Card className="border"><CardHeader><CardTitle className="text-base">Priority Breakdown</CardTitle><CardDescription className="text-xs">Work orders by priority level</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {priorityBreakdown.map(p => {
                const pct = workOrders.length > 0 ? Math.round((p.count / workOrders.length) * 100) : 0;
                return (
                  <div key={p.priority} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-24">{p.priority}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${p.priority === 'Critical' ? 'bg-red-500' : p.priority === 'High' ? 'bg-amber-500' : p.priority === 'Medium' ? 'bg-sky-500' : 'bg-slate-400'}`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{p.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        </div>
        <Card className="border"><CardHeader><CardTitle className="text-base">Recent Cost Summary</CardTitle><CardDescription className="text-xs">Latest completed work orders by cost</CardDescription></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">Material</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="hidden md:table-cell">Actual Hours</TableHead></TableRow></TableHeader><TableBody>
            {completedWOs.sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0)).slice(0, 10).map(wo => (
              <TableRow key={wo.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                <TableCell className="text-xs capitalize">{wo.type.replace('_', ' ')}</TableCell>
                <TableCell className="text-right font-semibold">${(wo.totalCost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">${(wo.materialCost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">${(wo.laborCost || 0).toLocaleString()}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{wo.actualHours || '-'}</TableCell>
              </TableRow>
            ))}
            {completedWOs.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState icon={BarChart3} title="No completed work orders" description="Cost data will appear once work orders are completed." /></TableCell></TableRow>}
          </TableBody></Table>
        </CardContent></Card>
      </>)}
    </div>
  );
}
function MaintenanceCalibrationPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ instrument: '', serialNumber: '', type: '', lastCalibration: '', nextDue: '', technician: '', certificates: '' });
  const [saving, setSaving] = useState(false);

  const calStatusColors: Record<string, string> = {
    calibrated: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    due_soon: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    overdue: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    in_progress: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  };

  const kpis = [
    { label: 'Total Instruments', value: 36, icon: Crosshair, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'Calibrated', value: 28, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Due Soon', value: 5, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Overdue', value: 3, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const calibrations = [
    { id: 'CAL-001', instrument: 'Digital Pressure Gauge', serialNumber: 'DPG-2024-001', type: 'pressure', lastCalibration: '2024-11-15', nextDue: '2025-05-15', status: 'calibrated', technician: 'James Miller' },
    { id: 'CAL-002', instrument: 'Thermocouple Probe TC-K', serialNumber: 'TCP-2024-012', type: 'temperature', lastCalibration: '2024-09-20', nextDue: '2025-03-20', status: 'overdue', technician: 'Sarah Chen' },
    { id: 'CAL-003', instrument: 'Multimeter Fluke 87V', serialNumber: 'FM-87V-0456', type: 'electrical', lastCalibration: '2024-12-01', nextDue: '2025-06-01', status: 'calibrated', technician: 'Mike Rodriguez' },
    { id: 'CAL-004', instrument: 'Micrometer Set 0-150mm', serialNumber: 'MS-2024-078', type: 'dimensional', lastCalibration: '2024-10-10', nextDue: '2025-04-10', status: 'due_soon', technician: 'Anna White' },
    { id: 'CAL-005', instrument: 'Ultrasonic Flow Meter', serialNumber: 'UFM-2024-033', type: 'flow', lastCalibration: '2024-08-25', nextDue: '2025-02-25', status: 'overdue', technician: 'James Miller' },
    { id: 'CAL-006', instrument: 'IR Thermometer Raytek', serialNumber: 'IRT-2024-089', type: 'temperature', lastCalibration: '2024-12-10', nextDue: '2025-06-10', status: 'calibrated', technician: 'Sarah Chen' },
    { id: 'CAL-007', instrument: 'Pressure Transmitter 4-20mA', serialNumber: 'PT-2024-056', type: 'pressure', lastCalibration: '2024-11-01', nextDue: '2025-05-01', status: 'in_progress', technician: 'Mike Rodriguez' },
    { id: 'CAL-008', instrument: 'Caliper Vernier Digital', serialNumber: 'CVD-2024-102', type: 'dimensional', lastCalibration: '2024-07-15', nextDue: '2025-01-15', status: 'overdue', technician: 'Anna White' },
  ];

  const filtered = calibrations.filter(c => {
    const matchSearch = !search || c.instrument.toLowerCase().includes(search.toLowerCase()) || c.serialNumber.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ instrument: '', serialNumber: '', type: '', lastCalibration: '', nextDue: '', technician: '', certificates: '' }); toast.success('Calibration record created successfully'); }, 800);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Calibration</h1><p className="text-muted-foreground mt-1">Manage instrument calibration schedules, records, and compliance tracking</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><CardTitle className="text-base">Calibration Records</CardTitle><CardDescription className="text-xs">Track all instrument calibrations and due dates</CardDescription></div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Record</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Calibration Record</DialogTitle><DialogDescription>Add a new instrument calibration record</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2"><Label className="text-xs">Instrument</Label><Input placeholder="e.g. Digital Pressure Gauge" value={form.instrument} onChange={e => setForm({ ...form, instrument: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Serial Number</Label><Input placeholder="e.g. DPG-2024-001" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
                    <div className="grid gap-2"><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="pressure">Pressure</SelectItem><SelectItem value="temperature">Temperature</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="dimensional">Dimensional</SelectItem><SelectItem value="flow">Flow</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Last Calibration</Label><Input type="date" value={form.lastCalibration} onChange={e => setForm({ ...form, lastCalibration: e.target.value })} /></div>
                    <div className="grid gap-2"><Label className="text-xs">Next Due</Label><Input type="date" value={form.nextDue} onChange={e => setForm({ ...form, nextDue: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Technician</Label><Input placeholder="e.g. James Miller" value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} /></div>
                    <div className="grid gap-2"><Label className="text-xs">Certificates</Label><Input placeholder="e.g. CERT-2024-001" value={form.certificates} onChange={e => setForm({ ...form, certificates: e.target.value })} /></div>
                  </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Record'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search instruments, serial numbers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="calibrated">Calibrated</SelectItem><SelectItem value="due_soon">Due Soon</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="in_progress">In Progress</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">ID</TableHead><TableHead className="text-xs">Instrument</TableHead><TableHead className="text-xs hidden md:table-cell">Serial #</TableHead><TableHead className="text-xs hidden lg:table-cell">Type</TableHead><TableHead className="text-xs hidden lg:table-cell">Last Calibration</TableHead><TableHead className="text-xs">Next Due</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Technician</TableHead></TableRow></TableHeader><TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className={`hover:bg-muted/30 ${c.status === 'overdue' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="font-medium text-sm">{c.instrument}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{c.serialNumber}</TableCell>
                  <TableCell className="text-xs capitalize hidden lg:table-cell">{c.type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(c.lastCalibration)}</TableCell>
                  <TableCell className="text-xs">{formatDate(c.nextDue)}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${calStatusColors[c.status] || ''}`}>{c.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{c.technician}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8}><EmptyState icon={Crosshair} title="No calibration records found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MaintenanceRiskAssessmentPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ asset: '', category: '', likelihood: '', consequence: '', mitigationPlan: '', assessor: '' });
  const [saving, setSaving] = useState(false);

  const riskLevelColors: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    high: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  };

  const riskScoreColor = (score: number) => score >= 15 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' : score >= 9 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';

  const kpis = [
    { label: 'Total Assessments', value: 18, icon: ClipboardList, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'High Risk', value: 3, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400' },
    { label: 'Medium Risk', value: 7, icon: ShieldAlert, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Low Risk', value: 8, icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ];

  const assessments = [
    { id: 'RA-001', asset: 'CNC Lathe #3', category: 'mechanical', likelihood: 4, consequence: 5, riskScore: 20, level: 'critical', mitigationStatus: 'in_progress', lastAssessment: '2025-01-10' },
    { id: 'RA-002', asset: 'Main Distribution Panel', category: 'electrical', likelihood: 3, consequence: 5, riskScore: 15, level: 'critical', mitigationStatus: 'identified', lastAssessment: '2025-01-08' },
    { id: 'RA-003', asset: 'Chemical Storage Tank', category: 'safety', likelihood: 3, consequence: 5, riskScore: 15, level: 'critical', mitigationStatus: 'in_progress', lastAssessment: '2025-01-05' },
    { id: 'RA-004', asset: 'Boiler Unit B-12', category: 'mechanical', likelihood: 3, consequence: 4, riskScore: 12, level: 'high', mitigationStatus: 'identified', lastAssessment: '2024-12-28' },
    { id: 'RA-005', asset: 'Cooling Tower CT-2', category: 'operational', likelihood: 3, consequence: 3, riskScore: 9, level: 'medium', mitigationStatus: 'completed', lastAssessment: '2024-12-20' },
    { id: 'RA-006', asset: 'Compressor CP-01', category: 'mechanical', likelihood: 2, consequence: 4, riskScore: 8, level: 'medium', mitigationStatus: 'in_progress', lastAssessment: '2024-12-15' },
    { id: 'RA-007', asset: 'Waste Water Treatment', category: 'environmental', likelihood: 2, consequence: 3, riskScore: 6, level: 'medium', mitigationStatus: 'completed', lastAssessment: '2024-12-10' },
    { id: 'RA-008', asset: 'Fire Suppression System', category: 'safety', likelihood: 1, consequence: 3, riskScore: 3, level: 'low', mitigationStatus: 'completed', lastAssessment: '2024-12-05' },
  ];

  const filtered = assessments.filter(a => {
    const matchSearch = !search || a.asset.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || a.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const handleCreate = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ asset: '', category: '', likelihood: '', consequence: '', mitigationPlan: '', assessor: '' }); toast.success('Risk assessment created successfully'); }, 800);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Risk Assessment</h1><p className="text-muted-foreground mt-1">Evaluate and manage risks associated with asset failures and maintenance activities</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><CardTitle className="text-base">Risk Assessments</CardTitle><CardDescription className="text-xs">Risk matrix with likelihood and consequence scoring</CardDescription></div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Assessment</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Risk Assessment</DialogTitle><DialogDescription>Evaluate risk for an asset</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2"><Label className="text-xs">Asset</Label><Input placeholder="e.g. CNC Lathe #3" value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent><SelectItem value="mechanical">Mechanical</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="environmental">Environmental</SelectItem><SelectItem value="operational">Operational</SelectItem></SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Likelihood (1-5)</Label><Select value={form.likelihood} onValueChange={v => setForm({ ...form, likelihood: v })}><SelectTrigger><SelectValue placeholder="1-5" /></SelectTrigger><SelectContent><SelectItem value="1">1 - Rare</SelectItem><SelectItem value="2">2 - Unlikely</SelectItem><SelectItem value="3">3 - Possible</SelectItem><SelectItem value="4">4 - Likely</SelectItem><SelectItem value="5">5 - Almost Certain</SelectItem></SelectContent></Select></div>
                    <div className="grid gap-2"><Label className="text-xs">Consequence (1-5)</Label><Select value={form.consequence} onValueChange={v => setForm({ ...form, consequence: v })}><SelectTrigger><SelectValue placeholder="1-5" /></SelectTrigger><SelectContent><SelectItem value="1">1 - Negligible</SelectItem><SelectItem value="2">2 - Minor</SelectItem><SelectItem value="3">3 - Moderate</SelectItem><SelectItem value="4">4 - Major</SelectItem><SelectItem value="5">5 - Catastrophic</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid gap-2"><Label className="text-xs">Mitigation Plan</Label><Textarea placeholder="Describe mitigation measures..." value={form.mitigationPlan} onChange={e => setForm({ ...form, mitigationPlan: e.target.value })} rows={3} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Assessor</Label><Input placeholder="e.g. Sarah Chen" value={form.assessor} onChange={e => setForm({ ...form, assessor: e.target.value })} /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Assessment'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search assets, assessment IDs..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={levelFilter} onValueChange={setLevelFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Risk Level" /></SelectTrigger><SelectContent><SelectItem value="all">All Levels</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">ID</TableHead><TableHead className="text-xs">Asset</TableHead><TableHead className="text-xs hidden md:table-cell">Category</TableHead><TableHead className="text-xs text-center">L</TableHead><TableHead className="text-xs text-center">C</TableHead><TableHead className="text-xs text-center">Risk Score</TableHead><TableHead className="text-xs">Level</TableHead><TableHead className="text-xs hidden lg:table-cell">Mitigation</TableHead><TableHead className="text-xs hidden md:table-cell">Last Assessment</TableHead></TableRow></TableHeader><TableBody>
              {filtered.map(a => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{a.id}</TableCell>
                  <TableCell className="font-medium text-sm">{a.asset}</TableCell>
                  <TableCell className="text-xs capitalize hidden md:table-cell">{a.category}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{a.likelihood}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{a.consequence}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className={`text-[10px] font-bold ${riskScoreColor(a.riskScore)}`}>{a.riskScore}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${riskLevelColors[a.level] || ''}`}>{a.level}</Badge></TableCell>
                  <TableCell className="text-xs capitalize hidden lg:table-cell"><Badge variant="outline" className="text-[10px]">{a.mitigationStatus.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(a.lastAssessment)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9}><EmptyState icon={TriangleAlert} title="No assessments found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MaintenanceToolsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', location: '', serialNumber: '', assignedTo: '', condition: '' });
  const [saving, setSaving] = useState(false);

  const toolStatusColors: Record<string, string> = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    checked_out: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
    in_repair: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    lost: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  };

  const kpis = [
    { label: 'Total Tools', value: 67, icon: WrenchIcon, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'Available', value: 52, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Checked Out', value: 12, icon: ArrowRightLeft, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Needs Repair', value: 3, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  const tools = [
    { id: 'TL-001', name: 'Torque Wrench 1/2"', category: 'hand_tool', location: 'Tool Room A-1', status: 'available', assignedTo: '-', lastReturnDate: '2025-01-12' },
    { id: 'TL-002', name: 'Digital Multimeter', category: 'measuring', location: 'Electrical Shop', status: 'checked_out', assignedTo: 'Mike Rodriguez', lastReturnDate: '2025-01-10' },
    { id: 'TL-003', name: 'Angle Grinder 4.5"', category: 'power_tool', location: 'Tool Room A-2', status: 'available', assignedTo: '-', lastReturnDate: '2025-01-14' },
    { id: 'TL-004', name: 'Micrometer 0-25mm', category: 'measuring', location: 'Quality Lab', status: 'available', assignedTo: '-', lastReturnDate: '2025-01-08' },
    { id: 'TL-005', name: 'Hydraulic Puller Set', category: 'specialty', location: 'Workshop B', status: 'in_repair', assignedTo: '-', lastReturnDate: '2024-12-28' },
    { id: 'TL-006', name: 'Cordless Impact Driver', category: 'power_tool', location: 'Tool Room A-1', status: 'checked_out', assignedTo: 'James Miller', lastReturnDate: null },
    { id: 'TL-007', name: 'Pipe Wrench 18"', category: 'hand_tool', location: 'Pipe Shop', status: 'available', assignedTo: '-', lastReturnDate: '2025-01-11' },
    { id: 'TL-008', name: 'Thermal Imaging Camera', category: 'specialty', location: 'Electrical Shop', status: 'checked_out', assignedTo: 'Sarah Chen', lastReturnDate: null },
    { id: 'TL-009', name: 'Oscilloscope Tektronix', category: 'measuring', location: 'Electrical Lab', status: 'available', assignedTo: '-', lastReturnDate: '2025-01-05' },
    { id: 'TL-010', name: 'Reciprocating Saw', category: 'power_tool', location: 'Workshop A', status: 'in_repair', assignedTo: '-', lastReturnDate: '2024-12-20' },
  ];

  const filtered = tools.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()) || t.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ name: '', category: '', location: '', serialNumber: '', assignedTo: '', condition: '' }); toast.success('Tool added successfully'); }, 800);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Tools</h1><p className="text-muted-foreground mt-1">Manage maintenance tool inventory, assignments, and condition tracking</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><CardTitle className="text-base">Tool Inventory</CardTitle><CardDescription className="text-xs">Track tool availability, assignments, and condition</CardDescription></div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Tool</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Add New Tool</DialogTitle><DialogDescription>Register a new tool in the inventory</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2"><Label className="text-xs">Tool Name</Label><Input placeholder="e.g. Torque Wrench 1/2 inch" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="hand_tool">Hand Tool</SelectItem><SelectItem value="power_tool">Power Tool</SelectItem><SelectItem value="measuring">Measuring</SelectItem><SelectItem value="specialty">Specialty</SelectItem></SelectContent></Select></div>
                    <div className="grid gap-2"><Label className="text-xs">Condition</Label><Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid gap-2"><Label className="text-xs">Location</Label><Input placeholder="e.g. Tool Room A-1" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Serial Number</Label><Input placeholder="e.g. SN-2024-001" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Assigned To</Label><Input placeholder="Leave blank if unassigned" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Adding...' : 'Add Tool'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search tools, locations..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="checked_out">Checked Out</SelectItem><SelectItem value="in_repair">In Repair</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">ID</TableHead><TableHead className="text-xs">Tool Name</TableHead><TableHead className="text-xs hidden md:table-cell">Category</TableHead><TableHead className="text-xs hidden lg:table-cell">Location</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Assigned To</TableHead><TableHead className="text-xs hidden lg:table-cell">Last Return</TableHead></TableRow></TableHeader><TableBody>
              {filtered.map(t => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell className="font-medium text-sm">{t.name}</TableCell>
                  <TableCell className="text-xs capitalize hidden md:table-cell">{t.category.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-xs hidden lg:table-cell"><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{t.location}</div></TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${toolStatusColors[t.status] || ''}`}>{t.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{t.assignedTo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(t.lastReturnDate as string | undefined)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState icon={WrenchIcon} title="No tools found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// INVENTORY SUBPAGES
// ============================================================================

function InventoryItemsPage() {
  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Inventory Items</h1><p className="text-muted-foreground mt-1">Manage spare parts, consumables, and supply inventory</p></div>
      <InventoryPage />
    </div>
  );
}

function InventoryCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: '', code: '', description: '', parentId: '' });
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/asset-categories');
        if (res.data) setCategories(res.data.categories || res.data || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getChildren = (parentId: string | null) => categories.filter(c => (parentId ? c.parentId === parentId : !c.parentId));

  const countDescendants = (id: string): number => {
    let count = 0;
    categories.filter(c => c.parentId === id).forEach(c => { count += 1 + countDescendants(c.id); });
    return count;
  };

  const renderTree = (parentId: string | null, depth: number = 0) => {
    const children = getChildren(parentId);
    const q = searchText.toLowerCase();
    const filtered = q ? children.filter((c: any) => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)) : children;
    return filtered.map((cat: any) => {
      const hasChildren = categories.some(c => c.parentId === cat.id);
      const isExpanded = expandedIds.has(cat.id);
      return (
        <div key={cat.id}>
          <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
            {hasChildren ? (
              <button onClick={() => toggleExpand(cat.id)} className="p-0.5 rounded hover:bg-muted">
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <div className="w-5" />
            )}
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{cat.name}</span>
              {cat.code && <span className="text-[10px] text-muted-foreground ml-2 font-mono">{cat.code}</span>}
            </div>
            <Badge variant="secondary" className="text-[10px] h-5">{cat._count?.assets ?? 0} items</Badge>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => { setSelectedCat(cat); setForm({ name: cat.name, code: cat.code || '', description: cat.description || '', parentId: cat.parentId || '' }); setEditOpen(true); }} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
              <button onClick={() => { if (confirm('Delete this category?')) { setCategories(prev => prev.filter(c => c.id !== cat.id)); toast.success('Category deleted'); } }} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
            </div>
          </div>
          {hasChildren && isExpanded && renderTree(cat.id, depth + 1)}
        </div>
      );
    });
  };

  const handleCreate = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const newCat = { id: `cat-${Date.now()}`, name: form.name, code: form.code, description: form.description, parentId: form.parentId || null, isActive: true, _count: { assets: 0 } };
    setCategories(prev => [...prev, newCat]);
    toast.success('Category created');
    setCreateOpen(false);
    setForm({ name: '', code: '', description: '', parentId: '' });
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!selectedCat) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setCategories(prev => prev.map(c => c.id === selectedCat.id ? { ...c, name: form.name, code: form.code, description: form.description, parentId: form.parentId || null } : c));
    toast.success('Category updated');
    setEditOpen(false);
    setSelectedCat(null);
    setSaving(false);
  };

  const rootCategories = getChildren(null);
  const totalItems = categories.reduce((sum: number, c: any) => sum + (c._count?.assets ?? 0), 0);

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">{categories.length} categories · {totalItems} total items</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search categories..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Category</Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-2">
          {rootCategories.length === 0 ? (
            <EmptyState icon={FolderOpen} title="No categories yet" description="Create your first category to start organizing inventory items." />
          ) : (
            renderTree(null)
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Category</DialogTitle><DialogDescription>Add a new inventory category to the hierarchy.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Category Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Electrical Components" /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g., ELEC" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Category description..." rows={2} /></div>
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                <SelectTrigger><SelectValue placeholder="None (root category)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root category)</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Creating...' : 'Create Category'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle><DialogDescription>Update category details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Category Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                <SelectTrigger><SelectValue placeholder="None (root)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root category)</SelectItem>
                  {categories.filter((c: any) => c.id !== selectedCat?.id).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function InventoryLocationsPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: '', zone: '', capacity: '', address: '' });

  const locationTypes = ['warehouse', 'staging', 'production', 'picking', 'receiving'];

  const initialLocations = [
    { id: 1, code: 'WH-A1', name: 'Warehouse A - Zone 1', type: 'warehouse', zone: 'Zone A', capacityUsed: 85, capacity: 500, status: 'active', itemsCount: 425, address: 'Building A, Floor 1' },
    { id: 2, code: 'WH-A2', name: 'Warehouse A - Zone 2', type: 'warehouse', zone: 'Zone A', capacityUsed: 62, capacity: 400, status: 'active', itemsCount: 248, address: 'Building A, Floor 1' },
    { id: 3, code: 'ST-B1', name: 'Staging Area B', type: 'staging', zone: 'Zone B', capacityUsed: 100, capacity: 150, status: 'active', itemsCount: 150, address: 'Building B, Dock 3' },
    { id: 4, code: 'PR-C1', name: 'Production Floor - Line 1', type: 'production', zone: 'Zone C', capacityUsed: 45, capacity: 200, status: 'active', itemsCount: 90, address: 'Building C, Line 1' },
    { id: 5, code: 'PK-D1', name: 'Picking Station Delta', type: 'picking', zone: 'Zone D', capacityUsed: 30, capacity: 100, status: 'active', itemsCount: 30, address: 'Building D, Bay 5' },
    { id: 6, code: 'RC-E1', name: 'Receiving Dock East', type: 'receiving', zone: 'Zone E', capacityUsed: 0, capacity: 300, status: 'active', itemsCount: 0, address: 'Building E, Dock 1' },
    { id: 7, code: 'WH-F1', name: 'Warehouse F - Cold Storage', type: 'warehouse', zone: 'Zone F', capacityUsed: 100, capacity: 200, status: 'active', itemsCount: 200, address: 'Building F, Cold Room' },
    { id: 8, code: 'ST-G1', name: 'Staging Area G', type: 'staging', zone: 'Zone G', capacityUsed: 0, capacity: 120, status: 'inactive', itemsCount: 0, address: 'Building G, Bay 2' },
  ];

  const filtered = initialLocations.filter(l => {
    const matchSearch = l.code.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase()) || l.zone.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || l.type === filterType;
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const totalLocations = initialLocations.length;
  const activeCount = initialLocations.filter(l => l.status === 'active').length;
  const fullCapacity = initialLocations.filter(l => l.capacityUsed >= 100).length;
  const emptyCount = initialLocations.filter(l => l.capacityUsed === 0).length;

  const kpiCards = [
    { label: 'Total Locations', value: totalLocations, icon: MapPin, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Active', value: activeCount, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Full Capacity', value: fullCapacity, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Empty', value: emptyCount, icon: Box, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const handleCreate = () => {
    if (!form.code || !form.name || !form.type) { toast.error('Please fill in all required fields'); return; }
    toast.success(`Location ${form.code} created successfully`);
    setCreateOpen(false);
    setForm({ code: '', name: '', type: '', zone: '', capacity: '', address: '' });
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Locations</h1>
          <p className="text-muted-foreground mt-1">Manage warehouse locations, bins, and storage areas</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />Add Location</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>{locationTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Zone</TableHead><TableHead>Capacity Used</TableHead><TableHead className="hidden lg:table-cell">Status</TableHead><TableHead className="hidden lg:table-cell text-right">Items</TableHead></TableRow></TableHeader><TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={MapPin} title="No locations found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{l.code}</TableCell>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{l.type}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{l.zone}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${l.capacityUsed >= 90 ? 'bg-red-500' : l.capacityUsed >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${l.capacityUsed}%` }} /></div>
                    <span className="text-xs font-medium w-10 text-right">{l.capacityUsed}%</span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell"><StatusBadge status={l.status} /></TableCell>
                <TableCell className="hidden lg:table-cell text-right font-medium">{l.itemsCount}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Add New Location</DialogTitle><DialogDescription>Create a new storage location in the warehouse.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Code *</Label><Input placeholder="WH-A1" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
              <div className="space-y-2"><Label>Name *</Label><Input placeholder="Warehouse A - Zone 1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type *</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{locationTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Zone</Label><Input placeholder="Zone A" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Capacity</Label><Input type="number" placeholder="500" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address</Label><Input placeholder="Building A, Floor 1" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function InventoryTransactionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    api.get<any[]>('/api/inventory').then(res => {
      if (res.success && res.data) setItems(res.data);
      setLoading(false);
    });
  }, []);

  const allTransactions = items.flatMap(item =>
    (item.stockMovements || []).map((m: any) => ({ ...m, itemName: item.name, itemCode: item.itemCode }))
  ).sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());

  const filtered = filterType === 'all' ? allTransactions : allTransactions.filter(t => t.type === filterType);
  const totalTransactions = allTransactions.length;
  const received = allTransactions.filter(t => t.type === 'received' || t.type === 'in').length;
  const issued = allTransactions.filter(t => t.type === 'issued' || t.type === 'out').length;
  const adjustments = allTransactions.filter(t => t.type === 'adjustment').length;

  const summaryCards = [
    { label: 'Total Transactions', value: totalTransactions, icon: ArrowRightLeft, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Items Received', value: received, icon: Download, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Items Issued', value: issued, icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Adjustments', value: adjustments, icon: ArrowUpDown, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Transactions</h1><p className="text-muted-foreground mt-1">View complete transaction history for all inventory movements</p></div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="hidden sm:table-cell">Code</TableHead><TableHead>Type</TableHead><TableHead>Quantity</TableHead><TableHead className="hidden md:table-cell">Reference</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-48"><EmptyState icon={ArrowRightLeft} title="No transactions found" description="Transactions will appear once inventory movements are recorded." /></TableCell></TableRow>
          ) : filtered.slice(0, 50).map((t, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="font-medium">{t.itemName}</TableCell>
              <TableCell className="font-mono text-xs hidden sm:table-cell">{t.itemCode}</TableCell>
              <TableCell><Badge variant="outline" className={t.type === 'received' || t.type === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : t.type === 'issued' || t.type === 'out' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-sky-50 text-sky-700 border-sky-200'}>{(t.type || 'N/A').toUpperCase()}</Badge></TableCell>
              <TableCell className={t.type === 'issued' || t.type === 'out' ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>{t.type === 'issued' || t.type === 'out' ? '-' : '+'}{Math.abs(t.quantity || 0)}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{t.reference || '-'}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(t.createdAt || t.date)}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
function InventoryAdjustmentsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ item: '', location: '', type: '', quantityBefore: '', quantityAfter: '', reason: '' });

  const adjTypes = ['correction', 'write_off', 'damage', 'return'];

  const initialAdjustments = [
    { id: 1, adjNo: 'ADJ-001', item: 'Ball Bearing 6205', location: 'WH-A1', type: 'correction', qtyBefore: 100, qtyAfter: 95, reason: 'Physical count discrepancy found during cycle count', status: 'approved', date: '2025-01-10' },
    { id: 2, adjNo: 'ADJ-002', item: 'Hydraulic Pump HP-300', location: 'WH-A2', type: 'damage', qtyBefore: 8, qtyAfter: 6, reason: 'Damaged during handling, units unsalvageable', status: 'approved', date: '2025-01-09' },
    { id: 3, adjNo: 'ADJ-003', item: 'Drive Belt V-A68', location: 'ST-B1', type: 'write_off', qtyBefore: 25, qtyAfter: 20, reason: 'Expired stock beyond usable shelf life', status: 'pending', date: '2025-01-08' },
    { id: 4, adjNo: 'ADJ-004', item: 'Contactor LC1D25', location: 'PR-C1', type: 'correction', qtyBefore: 15, qtyAfter: 18, reason: 'Found 3 additional units during audit', status: 'approved', date: '2025-01-07' },
    { id: 5, adjNo: 'ADJ-005', item: 'Thermocouple Type K', location: 'WH-F1', type: 'damage', qtyBefore: 40, qtyAfter: 38, reason: 'Broken during quality inspection', status: 'rejected', date: '2025-01-06' },
    { id: 6, adjNo: 'ADJ-006', item: 'Lubricant ISO 68', location: 'WH-A1', type: 'return', qtyBefore: 50, qtyAfter: 55, reason: 'Unused stock returned from production line 3', status: 'approved', date: '2025-01-05' },
    { id: 7, adjNo: 'ADJ-007', item: 'Solenoid Valve SV-200', location: 'PK-D1', type: 'correction', qtyBefore: 12, qtyAfter: 11, reason: 'One unit missing, investigation pending', status: 'pending', date: '2025-01-04' },
    { id: 8, adjNo: 'ADJ-008', item: 'Fuse 30A NH-00', location: 'WH-A2', type: 'write_off', qtyBefore: 200, qtyAfter: 185, reason: 'Recalled batch from manufacturer', status: 'approved', date: '2025-01-03' },
  ];

  const adjStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

  const filtered = initialAdjustments.filter(a => {
    const matchSearch = a.adjNo.toLowerCase().includes(search.toLowerCase()) || a.item.toLowerCase().includes(search.toLowerCase()) || a.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Adjustments', value: initialAdjustments.length, icon: ArrowUpDown, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending Approval', value: initialAdjustments.filter(a => a.status === 'pending').length, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: initialAdjustments.filter(a => a.status === 'approved').length, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Rejected', value: initialAdjustments.filter(a => a.status === 'rejected').length, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const handleCreate = () => {
    if (!form.item || !form.location || !form.type) { toast.error('Please fill in all required fields'); return; }
    toast.success(`Adjustment for ${form.item} created successfully`);
    setCreateOpen(false);
    setForm({ item: '', location: '', type: '', quantityBefore: '', quantityAfter: '', reason: '' });
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Adjustments</h1><p className="text-muted-foreground mt-1">Record stock adjustments, write-offs, and corrections</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New Adjustment</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search adjustments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Adj #</TableHead><TableHead>Item</TableHead><TableHead className="hidden sm:table-cell">Location</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Qty Before</TableHead><TableHead className="hidden md:table-cell">Qty After</TableHead><TableHead className="hidden lg:table-cell">Reason</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-48"><EmptyState icon={ArrowUpDown} title="No adjustments found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(a => (
              <TableRow key={a.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{a.adjNo}</TableCell>
                <TableCell className="font-medium">{a.item}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{a.location}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{a.type.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="hidden md:table-cell font-medium">{a.qtyBefore}</TableCell>
                <TableCell className="hidden md:table-cell font-medium">{a.qtyAfter}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{a.reason}</TableCell>
                <TableCell><Badge variant="outline" className={adjStatusColors[a.status]}>{a.status.replace('_', ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(a.date)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Inventory Adjustment</DialogTitle><DialogDescription>Record a stock adjustment for an inventory item.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Item *</Label><Input placeholder="Ball Bearing 6205" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></div>
              <div className="space-y-2"><Label>Location *</Label><Input placeholder="WH-A1" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Adjustment Type *</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{adjTypes.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity Before</Label><Input type="number" placeholder="100" value={form.quantityBefore} onChange={e => setForm({ ...form, quantityBefore: e.target.value })} /></div>
              <div className="space-y-2"><Label>Quantity After</Label><Input type="number" placeholder="95" value={form.quantityAfter} onChange={e => setForm({ ...form, quantityAfter: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Reason *</Label><Textarea placeholder="Describe the reason for this adjustment..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Submit Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function InventoryRequestsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ item: '', quantity: '', workOrder: '', priority: '', requestedBy: '', notes: '' });

  const initialRequests = [
    { id: 1, reqNo: 'REQ-001', item: 'Ball Bearing 6205', quantity: 24, requestedBy: 'Mike Johnson', workOrder: 'WO-1023', priority: 'high', status: 'fulfilled', date: '2025-01-12' },
    { id: 2, reqNo: 'REQ-002', item: 'Hydraulic Pump HP-300', quantity: 2, requestedBy: 'Sarah Chen', workOrder: 'WO-1024', priority: 'urgent', status: 'approved', date: '2025-01-11' },
    { id: 3, reqNo: 'REQ-003', item: 'Drive Belt V-A68', quantity: 8, requestedBy: 'Tom Wilson', workOrder: 'WO-1025', priority: 'medium', status: 'pending', date: '2025-01-10' },
    { id: 4, reqNo: 'REQ-004', item: 'Contactor LC1D25', quantity: 5, requestedBy: 'Anna Lee', workOrder: 'WO-1026', priority: 'low', status: 'approved', date: '2025-01-09' },
    { id: 5, reqNo: 'REQ-005', item: 'Thermocouple Type K', quantity: 12, requestedBy: 'Mike Johnson', workOrder: 'WO-1027', priority: 'medium', status: 'partially_fulfilled', date: '2025-01-08' },
    { id: 6, reqNo: 'REQ-006', item: 'Lubricant ISO 68 (5L)', quantity: 6, requestedBy: 'David Park', workOrder: 'WO-1028', priority: 'low', status: 'pending', date: '2025-01-07' },
    { id: 7, reqNo: 'REQ-007', item: 'Solenoid Valve SV-200', quantity: 3, requestedBy: 'Sarah Chen', workOrder: 'WO-1029', priority: 'high', status: 'rejected', date: '2025-01-06' },
    { id: 8, reqNo: 'REQ-008', item: 'Motor Coupling F-50', quantity: 4, requestedBy: 'Tom Wilson', workOrder: 'WO-1030', priority: 'urgent', status: 'fulfilled', date: '2025-01-05' },
  ];

  const reqStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', partially_fulfilled: 'bg-sky-50 text-sky-700 border-sky-200', fulfilled: 'bg-teal-50 text-teal-700 border-teal-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

  const filtered = initialRequests.filter(r => {
    const matchSearch = r.reqNo.toLowerCase().includes(search.toLowerCase()) || r.item.toLowerCase().includes(search.toLowerCase()) || r.workOrder.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchPriority = filterPriority === 'all' || r.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const kpiCards = [
    { label: 'Total Requests', value: initialRequests.length, icon: FileText, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending', value: initialRequests.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: initialRequests.filter(r => r.status === 'approved').length, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Fulfilled', value: initialRequests.filter(r => r.status === 'fulfilled' || r.status === 'partially_fulfilled').length, icon: Check, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const handleCreate = () => {
    if (!form.item || !form.quantity || !form.priority) { toast.error('Please fill in all required fields'); return; }
    toast.success(`Request for ${form.item} created successfully`);
    setCreateOpen(false);
    setForm({ item: '', quantity: '', workOrder: '', priority: '', requestedBy: '', notes: '' });
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Requests</h1><p className="text-muted-foreground mt-1">Submit and track material requisitions from work orders</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New Request</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="partially_fulfilled">Partial</SelectItem><SelectItem value="fulfilled">Fulfilled</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Req #</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="hidden sm:table-cell">Requested By</TableHead><TableHead className="hidden md:table-cell">Work Order</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={FileText} title="No requests found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(r => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{r.reqNo}</TableCell>
                <TableCell className="font-medium">{r.item}</TableCell>
                <TableCell className="font-medium">{r.quantity}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{r.requestedBy}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className="font-mono text-xs">{r.workOrder}</Badge></TableCell>
                <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                <TableCell><Badge variant="outline" className={reqStatusColors[r.status]}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(r.date)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Inventory Request</DialogTitle><DialogDescription>Submit a material requisition linked to a work order.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Item *</Label><Input placeholder="Ball Bearing 6205" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></div>
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Work Order</Label><Input placeholder="WO-1023" value={form.workOrder} onChange={e => setForm({ ...form, workOrder: e.target.value })} /></div>
              <div className="space-y-2"><Label>Priority *</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Requested By</Label><Input placeholder="Your name" value={form.requestedBy} onChange={e => setForm({ ...form, requestedBy: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function InventoryTransfersPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ item: '', quantity: '', fromLocation: '', toLocation: '', notes: '' });

  const transferStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', in_transit: 'bg-sky-50 text-sky-700 border-sky-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', cancelled: 'bg-slate-100 text-slate-600 border-slate-200' };

  const initialTransfers = [
    { id: 1, transferNo: 'TRF-001', item: 'Ball Bearing 6205', qty: 50, fromLocation: 'WH-A1', toLocation: 'PR-C1', status: 'completed', requestedDate: '2025-01-08', completedDate: '2025-01-10' },
    { id: 2, transferNo: 'TRF-002', item: 'Drive Belt V-A68', qty: 20, fromLocation: 'WH-A2', toLocation: 'ST-B1', status: 'in_transit', requestedDate: '2025-01-11', completedDate: null },
    { id: 3, transferNo: 'TRF-003', item: 'Contactor LC1D25', qty: 10, fromLocation: 'WH-F1', toLocation: 'PK-D1', status: 'completed', requestedDate: '2025-01-05', completedDate: '2025-01-06' },
    { id: 4, transferNo: 'TRF-004', item: 'Lubricant ISO 68 (5L)', qty: 15, fromLocation: 'RC-E1', toLocation: 'WH-A1', status: 'pending', requestedDate: '2025-01-12', completedDate: null },
    { id: 5, transferNo: 'TRF-005', item: 'Solenoid Valve SV-200', qty: 8, fromLocation: 'WH-A2', toLocation: 'PR-C1', status: 'completed', requestedDate: '2025-01-03', completedDate: '2025-01-04' },
    { id: 6, transferNo: 'TRF-006', item: 'Hydraulic Pump HP-300', qty: 3, fromLocation: 'WH-A1', toLocation: 'ST-G1', status: 'cancelled', requestedDate: '2025-01-02', completedDate: null },
    { id: 7, transferNo: 'TRF-007', item: 'Thermocouple Type K', qty: 30, fromLocation: 'WH-F1', toLocation: 'WH-A1', status: 'in_transit', requestedDate: '2025-01-10', completedDate: null },
    { id: 8, transferNo: 'TRF-008', item: 'Fuse 30A NH-00', qty: 100, fromLocation: 'WH-A2', toLocation: 'PK-D1', status: 'completed', requestedDate: '2025-01-01', completedDate: '2025-01-02' },
  ];

  const filtered = initialTransfers.filter(t => {
    const matchSearch = t.transferNo.toLowerCase().includes(search.toLowerCase()) || t.item.toLowerCase().includes(search.toLowerCase()) || t.fromLocation.toLowerCase().includes(search.toLowerCase()) || t.toLocation.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Transfers', value: initialTransfers.length, icon: Truck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'In Transit', value: initialTransfers.filter(t => t.status === 'in_transit').length, icon: ArrowRightLeft, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Completed', value: initialTransfers.filter(t => t.status === 'completed').length, icon: CheckCircle2, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'Cancelled', value: initialTransfers.filter(t => t.status === 'cancelled').length, icon: XCircle, color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' },
  ];

  const handleCreate = () => {
    if (!form.item || !form.quantity || !form.fromLocation || !form.toLocation) { toast.error('Please fill in all required fields'); return; }
    if (form.fromLocation === form.toLocation) { toast.error('From and To locations cannot be the same'); return; }
    toast.success(`Transfer for ${form.item} created successfully`);
    setCreateOpen(false);
    setForm({ item: '', quantity: '', fromLocation: '', toLocation: '', notes: '' });
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Transfers</h1><p className="text-muted-foreground mt-1">Transfer inventory items between locations</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New Transfer</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search transfers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Transfer #</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="hidden sm:table-cell">From</TableHead><TableHead className="hidden sm:table-cell">To</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Req. Date</TableHead><TableHead className="hidden lg:table-cell">Comp. Date</TableHead></TableRow></TableHeader><TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Truck} title="No transfers found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(t => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{t.transferNo}</TableCell>
                <TableCell className="font-medium">{t.item}</TableCell>
                <TableCell className="font-medium">{t.qty}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{t.fromLocation}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{t.toLocation}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={transferStatusColors[t.status]}>{t.status.replace('_', ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(t.requestedDate)}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{t.completedDate ? formatDate(t.completedDate) : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Inventory Transfer</DialogTitle><DialogDescription>Create a transfer request to move items between locations.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Item *</Label><Input placeholder="Ball Bearing 6205" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>From Location *</Label><Input placeholder="WH-A1" value={form.fromLocation} onChange={e => setForm({ ...form, fromLocation: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>To Location *</Label><Input placeholder="PR-C1" value={form.toLocation} onChange={e => setForm({ ...form, toLocation: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function InventorySuppliersPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ company: '', contact: '', email: '', phone: '', leadTime: '', address: '', categories: '' });

  const initialSuppliers = [
    { id: 1, code: 'SUP-001', company: 'SKF Industries', contact: 'James Morton', email: 'j.morton@skf.com', phone: '+1-555-0101', leadTime: 7, rating: 5, status: 'active', itemsSupplied: 45 },
    { id: 2, code: 'SUP-002', company: 'Siemens AG', contact: 'Erika Muller', email: 'e.muller@siemens.com', phone: '+49-30-555-0102', leadTime: 14, rating: 4, status: 'active', itemsSupplied: 32 },
    { id: 3, code: 'SUP-003', company: 'Schneider Electric', contact: 'Pierre Dubois', email: 'p.dubois@schneider.fr', phone: '+33-1-555-0103', leadTime: 10, rating: 5, status: 'active', itemsSupplied: 58 },
    { id: 4, code: 'SUP-004', company: 'Gates Corporation', contact: 'Robert Chen', email: 'r.chen@gates.com', phone: '+1-555-0104', leadTime: 5, rating: 4, status: 'active', itemsSupplied: 23 },
    { id: 5, code: 'SUP-005', company: 'Parker Hannifin', contact: 'Linda Scott', email: 'l.scott@parker.com', phone: '+1-555-0105', leadTime: 12, rating: 3, status: 'on_hold', itemsSupplied: 17 },
    { id: 6, code: 'SUP-006', company: 'ABB Ltd', contact: 'Karl Andersen', email: 'k.andersen@abb.ch', phone: '+41-44-555-0106', leadTime: 18, rating: 4, status: 'active', itemsSupplied: 29 },
    { id: 7, code: 'SUP-007', company: 'Emerson Electric', contact: 'Maria Garcia', email: 'm.garcia@emerson.com', phone: '+1-555-0107', leadTime: 8, rating: 5, status: 'active', itemsSupplied: 41 },
    { id: 8, code: 'SUP-008', company: 'Timken Company', contact: 'David Brown', email: 'd.brown@timken.com', phone: '+1-555-0108', leadTime: 6, rating: 3, status: 'active', itemsSupplied: 19 },
    { id: 9, code: 'SUP-009', company: 'Rockwell Automation', contact: 'Susan Taylor', email: 's.taylor@rockwell.com', phone: '+1-555-0109', leadTime: 10, rating: 2, status: 'on_hold', itemsSupplied: 14 },
    { id: 10, code: 'SUP-010', company: 'Honeywell Intl', contact: 'William Lee', email: 'w.lee@honeywell.com', phone: '+1-555-0110', leadTime: 9, rating: 4, status: 'active', itemsSupplied: 36 },
  ];

  const supplierStatusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', on_hold: 'bg-amber-50 text-amber-700 border-amber-200', inactive: 'bg-slate-100 text-slate-600 border-slate-200' };

  const filtered = initialSuppliers.filter(s => {
    const matchSearch = s.code.toLowerCase().includes(search.toLowerCase()) || s.company.toLowerCase().includes(search.toLowerCase()) || s.contact.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Suppliers', value: initialSuppliers.length, icon: Building, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Active', value: initialSuppliers.filter(s => s.status === 'active').length, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'On Hold', value: initialSuppliers.filter(s => s.status === 'on_hold').length, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'New This Quarter', value: 3, icon: Star, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const handleCreate = () => {
    if (!form.company || !form.contact || !form.email) { toast.error('Please fill in all required fields'); return; }
    toast.success(`Supplier ${form.company} added successfully`);
    setCreateOpen(false);
    setForm({ company: '', contact: '', email: '', phone: '', leadTime: '', address: '', categories: '' });
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Suppliers</h1><p className="text-muted-foreground mt-1">Manage supplier information, contacts, and performance metrics</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Company</TableHead><TableHead className="hidden sm:table-cell">Contact</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead className="hidden md:table-cell">Phone</TableHead><TableHead className="hidden lg:table-cell">Lead Time</TableHead><TableHead className="hidden lg:table-cell">Rating</TableHead><TableHead>Status</TableHead><TableHead className="hidden xl:table-cell text-right">Items</TableHead></TableRow></TableHeader><TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-48"><EmptyState icon={Building} title="No suppliers found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(s => (
              <TableRow key={s.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{s.code}</TableCell>
                <TableCell className="font-medium">{s.company}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{s.contact}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.email}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.phone}</TableCell>
                <TableCell className="hidden lg:table-cell">{s.leadTime} days</TableCell>
                <TableCell className="hidden lg:table-cell"><span className="text-amber-500">{'★'.repeat(s.rating)}</span><span className="text-muted/30">{'★'.repeat(5 - s.rating)}</span></TableCell>
                <TableCell><Badge variant="outline" className={supplierStatusColors[s.status]}>{s.status.replace('_', ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden xl:table-cell text-right font-medium">{s.itemsSupplied}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle><DialogDescription>Register a new supplier in the system.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Company Name *</Label><Input placeholder="SKF Industries" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contact Person *</Label><Input placeholder="John Smith" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="john@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="+1-555-0100" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Lead Time (days)</Label><Input type="number" placeholder="7" value={form.leadTime} onChange={e => setForm({ ...form, leadTime: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea placeholder="Full address..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Categories</Label><Input placeholder="Bearings, Pumps, Valves" value={form.categories} onChange={e => setForm({ ...form, categories: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function InventoryPurchaseOrdersPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ supplier: '', priority: '', expectedDate: '', notes: '', items: '' });

  const poStatusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600 border-slate-200', pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', partially_received: 'bg-sky-50 text-sky-700 border-sky-200', received: 'bg-teal-50 text-teal-700 border-teal-200', cancelled: 'bg-red-50 text-red-600 border-red-200' };

  const initialPOs = [
    { id: 1, poNo: 'PO-2025-001', supplier: 'SKF Industries', totalItems: 5, totalAmount: 12500.00, priority: 'high', status: 'received', orderDate: '2025-01-02', expectedDate: '2025-01-12' },
    { id: 2, poNo: 'PO-2025-002', supplier: 'Siemens AG', totalItems: 3, totalAmount: 28750.00, priority: 'urgent', status: 'approved', orderDate: '2025-01-04', expectedDate: '2025-01-18' },
    { id: 3, poNo: 'PO-2025-003', supplier: 'Schneider Electric', totalItems: 8, totalAmount: 9320.00, priority: 'medium', status: 'pending', orderDate: '2025-01-06', expectedDate: '2025-01-20' },
    { id: 4, poNo: 'PO-2025-004', supplier: 'Gates Corporation', totalItems: 12, totalAmount: 4680.00, priority: 'low', status: 'received', orderDate: '2025-01-03', expectedDate: '2025-01-10' },
    { id: 5, poNo: 'PO-2025-005', supplier: 'Parker Hannifin', totalItems: 4, totalAmount: 18200.00, priority: 'high', status: 'partially_received', orderDate: '2025-01-05', expectedDate: '2025-01-17' },
    { id: 6, poNo: 'PO-2025-006', supplier: 'ABB Ltd', totalItems: 6, totalAmount: 35100.00, priority: 'medium', status: 'draft', orderDate: '2025-01-08', expectedDate: '2025-01-26' },
    { id: 7, poNo: 'PO-2025-007', supplier: 'Emerson Electric', totalItems: 9, totalAmount: 21900.00, priority: 'high', status: 'approved', orderDate: '2025-01-07', expectedDate: '2025-01-21' },
    { id: 8, poNo: 'PO-2025-008', supplier: 'Timken Company', totalItems: 7, totalAmount: 8450.00, priority: 'medium', status: 'received', orderDate: '2025-01-01', expectedDate: '2025-01-09' },
    { id: 9, poNo: 'PO-2025-009', supplier: 'Rockwell Automation', totalItems: 2, totalAmount: 42000.00, priority: 'urgent', status: 'pending', orderDate: '2025-01-09', expectedDate: '2025-01-23' },
    { id: 10, poNo: 'PO-2025-010', supplier: 'Honeywell Intl', totalItems: 10, totalAmount: 15800.00, priority: 'low', status: 'cancelled', orderDate: '2025-01-04', expectedDate: '2025-01-15' },
  ];

  const filtered = initialPOs.filter(po => {
    const matchSearch = po.poNo.toLowerCase().includes(search.toLowerCase()) || po.supplier.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || po.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total POs', value: initialPOs.length, icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending Approval', value: initialPOs.filter(po => po.status === 'pending' || po.status === 'draft').length, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: initialPOs.filter(po => po.status === 'approved' || po.status === 'partially_received').length, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Received', value: initialPOs.filter(po => po.status === 'received').length, icon: Check, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const handleCreate = () => {
    if (!form.supplier || !form.priority || !form.expectedDate) { toast.error('Please fill in all required fields'); return; }
    toast.success(`Purchase order for ${form.supplier} created successfully`);
    setCreateOpen(false);
    setForm({ supplier: '', priority: '', expectedDate: '', notes: '', items: '' });
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1><p className="text-muted-foreground mt-1">Create and manage purchase orders for inventory replenishment</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New PO</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search purchase orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="partially_received">Partial</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead className="hidden sm:table-cell">Items</TableHead><TableHead className="hidden sm:table-cell">Amount</TableHead><TableHead className="hidden md:table-cell">Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Order Date</TableHead><TableHead className="hidden lg:table-cell">Expected</TableHead></TableRow></TableHeader><TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={ShoppingCart} title="No purchase orders found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(po => (
              <TableRow key={po.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{po.poNo}</TableCell>
                <TableCell className="font-medium">{po.supplier}</TableCell>
                <TableCell className="hidden sm:table-cell">{po.totalItems}</TableCell>
                <TableCell className="hidden sm:table-cell font-medium">${po.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="hidden md:table-cell"><PriorityBadge priority={po.priority} /></TableCell>
                <TableCell><Badge variant="outline" className={poStatusColors[po.status]}>{po.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(po.orderDate)}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(po.expectedDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle><DialogDescription>Create a new purchase order for inventory items.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Supplier *</Label><Input placeholder="SKF Industries" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Priority *</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Expected Date *</Label><Input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Items (one per line: name, qty, price)</Label><Textarea placeholder={'Ball Bearing 6205, 100, 15.50\nHydraulic Pump HP-300, 5, 850.00'} value={form.items} onChange={e => setForm({ ...form, items: e.target.value })} rows={4} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function InventoryReceivingPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ purchaseOrder: '', supplier: '', receivedDate: '', notes: '', items: '' });

  const grnStatusColors: Record<string, string> = { pending_inspection: 'bg-amber-50 text-amber-700 border-amber-200', accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

  const initialGRNs = [
    { id: 1, grnNo: 'GRN-001', poNo: 'PO-2025-001', supplier: 'SKF Industries', itemsReceived: 5, receivedDate: '2025-01-12', status: 'accepted', inspectedBy: 'Mike Johnson', notes: 'All items passed QC inspection' },
    { id: 2, grnNo: 'GRN-002', poNo: 'PO-2025-004', supplier: 'Gates Corporation', itemsReceived: 12, receivedDate: '2025-01-10', status: 'accepted', inspectedBy: 'Sarah Chen', notes: 'Minor packaging damage, items OK' },
    { id: 3, grnNo: 'GRN-003', poNo: 'PO-2025-005', supplier: 'Parker Hannifin', itemsReceived: 2, receivedDate: '2025-01-13', status: 'pending_inspection', inspectedBy: '', notes: 'Awaiting QC team availability' },
    { id: 4, grnNo: 'GRN-004', poNo: 'PO-2025-002', supplier: 'Siemens AG', itemsReceived: 1, receivedDate: '2025-01-13', status: 'pending_inspection', inspectedBy: '', notes: 'Partial shipment received' },
    { id: 5, grnNo: 'GRN-005', poNo: 'PO-2025-008', supplier: 'Timken Company', itemsReceived: 7, receivedDate: '2025-01-09', status: 'accepted', inspectedBy: 'Tom Wilson', notes: 'All within specification' },
    { id: 6, grnNo: 'GRN-006', poNo: 'PO-2025-010', supplier: 'Honeywell Intl', itemsReceived: 3, receivedDate: '2025-01-14', status: 'pending_inspection', inspectedBy: '', notes: 'Special inspection required per contract' },
    { id: 7, grnNo: 'GRN-007', poNo: 'PO-2025-003', supplier: 'Schneider Electric', itemsReceived: 2, receivedDate: '2025-01-11', status: 'rejected', inspectedBy: 'Anna Lee', notes: 'Voltage rating mismatch on contactors - returned' },
    { id: 8, grnNo: 'GRN-008', poNo: 'PO-2025-006', supplier: 'ABB Ltd', itemsReceived: 4, receivedDate: '2025-01-14', status: 'rejected', inspectedBy: 'David Park', notes: 'Incorrect model shipped - returned to supplier' },
  ];

  const filtered = initialGRNs.filter(g => {
    const matchSearch = g.grnNo.toLowerCase().includes(search.toLowerCase()) || g.poNo.toLowerCase().includes(search.toLowerCase()) || g.supplier.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || g.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total GRNs', value: initialGRNs.length, icon: Download, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending Inspection', value: initialGRNs.filter(g => g.status === 'pending_inspection').length, icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Accepted', value: initialGRNs.filter(g => g.status === 'accepted').length, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Rejected', value: initialGRNs.filter(g => g.status === 'rejected').length, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const handleCreate = () => {
    if (!form.purchaseOrder || !form.supplier || !form.receivedDate) { toast.error('Please fill in all required fields'); return; }
    toast.success(`GRN for ${form.purchaseOrder} created successfully`);
    setCreateOpen(false);
    setForm({ purchaseOrder: '', supplier: '', receivedDate: '', notes: '', items: '' });
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Receiving</h1><p className="text-muted-foreground mt-1">Receive delivered items and update inventory stock levels</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-2" />New GRN</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search GRNs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending_inspection">Pending</SelectItem><SelectItem value="accepted">Accepted</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>GRN #</TableHead><TableHead>PO #</TableHead><TableHead className="hidden sm:table-cell">Supplier</TableHead><TableHead className="hidden sm:table-cell">Items</TableHead><TableHead className="hidden md:table-cell">Received Date</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Inspected By</TableHead><TableHead className="hidden lg:table-cell">Notes</TableHead></TableRow></TableHeader><TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Download} title="No GRNs found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(g => (
              <TableRow key={g.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{g.grnNo}</TableCell>
                <TableCell><Badge variant="outline" className="font-mono text-xs">{g.poNo}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell font-medium">{g.supplier}</TableCell>
                <TableCell className="hidden sm:table-cell font-medium">{g.itemsReceived}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(g.receivedDate)}</TableCell>
                <TableCell><Badge variant="outline" className={grnStatusColors[g.status]}>{g.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{g.inspectedBy || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{g.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Goods Receipt Note</DialogTitle><DialogDescription>Record received items against a purchase order.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Purchase Order *</Label><Input placeholder="PO-2025-001" value={form.purchaseOrder} onChange={e => setForm({ ...form, purchaseOrder: e.target.value })} /></div>
              <div className="space-y-2"><Label>Supplier *</Label><Input placeholder="SKF Industries" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Received Date *</Label><Input type="date" value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Items Received (one per line: name, qty)</Label><Textarea placeholder={'Ball Bearing 6205, 50\nDrive Belt V-A68, 20'} value={form.items} onChange={e => setForm({ ...form, items: e.target.value })} rows={4} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Any observations, discrepancies, or special instructions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create GRN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// IoT SUBPAGES
// ============================================================================

function IotDevicesPage() {
  const [devices, setDevices] = useState<any[]>([
    { id: 'DEV-001', name: 'Temperature Sensor - Boiler Room', type: 'sensor', location: 'Boiler Room A', protocol: 'MQTT', status: 'online', lastSeen: '2025-01-15T14:30:00Z', batteryLevel: 87, signalStrength: 'Strong', asset: 'BLR-101', group: 'HVAC Monitoring', parameter: 'Temperature', unit: '°C', currentValue: 72.4 },
    { id: 'DEV-002', name: 'Vibration Sensor - Pump Station', type: 'sensor', location: 'Pump Station B', protocol: 'Modbus', status: 'online', lastSeen: '2025-01-15T14:28:00Z', batteryLevel: 92, signalStrength: 'Strong', asset: 'PMP-205', group: 'Rotating Equipment', parameter: 'Vibration', unit: 'mm/s', currentValue: 3.2 },
    { id: 'DEV-003', name: 'Pressure Transmitter - Compressor', type: 'sensor', location: 'Compressor Room', protocol: 'OPC-UA', status: 'warning', lastSeen: '2025-01-15T14:29:00Z', batteryLevel: 45, signalStrength: 'Medium', asset: 'CMP-310', group: 'Process Control', parameter: 'Pressure', unit: 'PSI', currentValue: 142.8 },
    { id: 'DEV-004', name: 'Humidity Sensor - Clean Room', type: 'sensor', location: 'Clean Room 1', protocol: 'HTTP', status: 'online', lastSeen: '2025-01-15T14:30:00Z', batteryLevel: 78, signalStrength: 'Strong', asset: 'CLR-001', group: 'Environmental', parameter: 'Humidity', unit: '%', currentValue: 42.1 },
    { id: 'DEV-005', name: 'Flow Meter - Cooling Loop', type: 'sensor', location: 'Cooling Tower', protocol: 'MQTT', status: 'online', lastSeen: '2025-01-15T14:27:00Z', batteryLevel: 65, signalStrength: 'Good', asset: 'CLT-400', group: 'Process Control', parameter: 'Flow Rate', unit: 'GPM', currentValue: 120.5 },
    { id: 'DEV-006', name: 'Gateway - Building A', type: 'gateway', location: 'Building A MDF', protocol: 'MQTT', status: 'online', lastSeen: '2025-01-15T14:30:00Z', batteryLevel: null, signalStrength: 'Strong', asset: 'BLD-A', group: 'Infrastructure', parameter: 'Packet Rate', unit: 'pkt/s', currentValue: 1540 },
    { id: 'DEV-007', name: 'Level Sensor - Fuel Tank', type: 'sensor', location: 'Fuel Storage', protocol: 'Modbus', status: 'online', lastSeen: '2025-01-15T14:30:00Z', batteryLevel: 54, signalStrength: 'Good', asset: 'TK-501', group: 'Storage Monitoring', parameter: 'Level', unit: '%', currentValue: 67.3 },
    { id: 'DEV-008', name: 'Motor Actuator - Valve V-201', type: 'actuator', location: 'Process Line 2', protocol: 'OPC-UA', status: 'offline', lastSeen: '2025-01-15T12:15:00Z', batteryLevel: null, signalStrength: 'N/A', asset: 'VLV-201', group: 'Process Control', parameter: 'Position', unit: '%', currentValue: 0 },
    { id: 'DEV-009', name: 'Gateway - Building B', type: 'gateway', location: 'Building B MDF', protocol: 'MQTT', status: 'online', lastSeen: '2025-01-15T14:30:00Z', batteryLevel: null, signalStrength: 'Strong', asset: 'BLD-B', group: 'Infrastructure', parameter: 'Packet Rate', unit: 'pkt/s', currentValue: 980 },
    { id: 'DEV-010', name: 'Current Sensor - Motor M-102', type: 'sensor', location: 'Motor Control Center', protocol: 'Modbus', status: 'critical', lastSeen: '2025-01-15T14:30:00Z', batteryLevel: 31, signalStrength: 'Weak', asset: 'MTR-102', group: 'Electrical', parameter: 'Current', unit: 'A', currentValue: 48.7 },
    { id: 'DEV-011', name: 'pH Sensor - Effluent Treatment', type: 'sensor', location: 'ETP Room', protocol: 'HTTP', status: 'online', lastSeen: '2025-01-15T14:28:00Z', batteryLevel: 60, signalStrength: 'Good', asset: 'ETP-001', group: 'Environmental', parameter: 'pH', unit: 'pH', currentValue: 7.2 },
    { id: 'DEV-012', name: 'Proximity Sensor - Conveyor C3', type: 'sensor', location: 'Packaging Line', protocol: 'HTTP', status: 'online', lastSeen: '2025-01-15T14:30:00Z', batteryLevel: 88, signalStrength: 'Strong', asset: 'CNV-303', group: 'Production', parameter: 'Count', unit: 'units', currentValue: 1245 },
    { id: 'DEV-013', name: 'Thermal Camera - Panel P-14', type: 'sensor', location: 'Switchgear Room', protocol: 'MQTT', status: 'warning', lastSeen: '2025-01-15T14:25:00Z', batteryLevel: 22, signalStrength: 'Medium', asset: 'PNL-014', group: 'Electrical', parameter: 'Temperature', unit: '°C', currentValue: 58.3 },
    { id: 'DEV-014', name: 'Solenoid Valve - Cooling Water', type: 'actuator', location: 'Cooling Tower', protocol: 'OPC-UA', status: 'online', lastSeen: '2025-01-15T14:30:00Z', batteryLevel: null, signalStrength: 'Strong', asset: 'SV-701', group: 'Process Control', parameter: 'State', unit: '', currentValue: 1 },
    { id: 'DEV-015', name: 'Smoke Detector - Warehouse', type: 'sensor', location: 'Main Warehouse', protocol: 'HTTP', status: 'offline', lastSeen: '2025-01-15T08:45:00Z', batteryLevel: 5, signalStrength: 'None', asset: 'WH-001', group: 'Safety', parameter: 'Smoke', unit: '% obsc', currentValue: 0 },
  ]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProtocol, setFilterProtocol] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<any>(null);
  const [newDevice, setNewDevice] = useState({ name: '', type: 'sensor', location: '', protocol: 'MQTT', asset: '', group: '' });

  const filtered = useMemo(() => devices.filter(d => {
    const q = searchText.toLowerCase();
    if (q && !d.name.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q) && !d.location.toLowerCase().includes(q)) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterProtocol !== 'all' && d.protocol !== filterProtocol) return false;
    return true;
  }), [devices, searchText, filterType, filterStatus, filterProtocol]);

  const stats = useMemo(() => ({
    total: devices.length, online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length, alerting: devices.filter(d => d.status === 'warning' || d.status === 'critical').length,
  }), [devices]);

  const handleCreate = () => {
    if (!newDevice.name.trim()) { toast.error('Device name is required'); return; }
    const dev: any = { id: `DEV-${String(devices.length + 1).padStart(3, '0')}`, ...newDevice, status: 'offline', lastSeen: new Date().toISOString(), batteryLevel: 100, signalStrength: 'N/A', parameter: 'N/A', unit: '', currentValue: 0 };
    setDevices(p => [...p, dev]); setCreateOpen(false); setNewDevice({ name: '', type: 'sensor', location: '', protocol: 'MQTT', asset: '', group: '' });
    toast.success('Device registered successfully');
  };

  const handleDelete = (id: string) => { setDevices(p => p.filter(d => d.id !== id)); if (detailDevice?.id === id) setDetailDevice(null); toast.success('Device removed'); };

  const statusColor: Record<string, string> = { online: 'bg-emerald-50 text-emerald-700 border-emerald-200', offline: 'bg-slate-100 text-slate-500 border-slate-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', critical: 'bg-red-50 text-red-700 border-red-200' };
  const statusDot: Record<string, string> = { online: 'bg-emerald-500', offline: 'bg-slate-400', warning: 'bg-amber-500', critical: 'bg-red-500' };
  const typeIcon: Record<string, any> = { sensor: Thermometer, gateway: Wifi, actuator: Cpu };

  const generateReadingData = (baseVal: number, variance: number) => Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, value: +(baseVal + (Math.sin(i * 0.5) * variance) + (Math.random() * variance * 0.3)).toFixed(1) }));

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">IoT Devices</h1><p className="text-muted-foreground text-sm mt-1">Register and manage IoT sensors, gateways, and connected devices</p></div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />Add Device</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader><DialogTitle>Register New Device</DialogTitle><DialogDescription>Add a new IoT device to the registry.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2"><Label>Device Name *</Label><Input placeholder="Temperature Sensor - Room X" value={newDevice.name} onChange={e => setNewDevice({ ...newDevice, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Type *</Label><Select value={newDevice.type} onValueChange={v => setNewDevice({ ...newDevice, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sensor">Sensor</SelectItem><SelectItem value="gateway">Gateway</SelectItem><SelectItem value="actuator">Actuator</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Protocol *</Label><Select value={newDevice.protocol} onValueChange={v => setNewDevice({ ...newDevice, protocol: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MQTT">MQTT</SelectItem><SelectItem value="HTTP">HTTP</SelectItem><SelectItem value="Modbus">Modbus</SelectItem><SelectItem value="OPC-UA">OPC-UA</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>Location *</Label><Input placeholder="Building A, Room 101" value={newDevice.location} onChange={e => setNewDevice({ ...newDevice, location: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Asset Link</Label><Input placeholder="AST-001" value={newDevice.asset} onChange={e => setNewDevice({ ...newDevice, asset: e.target.value })} /></div>
                <div className="space-y-2"><Label>Device Group</Label><Input placeholder="Environmental" value={newDevice.group} onChange={e => setNewDevice({ ...newDevice, group: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Register Device</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Devices', value: stats.total, icon: Smartphone, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-400' },
          { label: 'Online', value: stats.online, icon: Wifi, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Offline', value: stats.offline, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
          { label: 'Alerting', value: stats.alerting, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      <div className="filter-row flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search devices..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="sensor">Sensor</SelectItem><SelectItem value="gateway">Gateway</SelectItem><SelectItem value="actuator">Actuator</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
        <Select value={filterProtocol} onValueChange={setFilterProtocol}><SelectTrigger className="w-36"><SelectValue placeholder="Protocol" /></SelectTrigger><SelectContent><SelectItem value="all">All Protocols</SelectItem><SelectItem value="MQTT">MQTT</SelectItem><SelectItem value="HTTP">HTTP</SelectItem><SelectItem value="Modbus">Modbus</SelectItem><SelectItem value="OPC-UA">OPC-UA</SelectItem></SelectContent></Select>
      </div>

      <Card className="border-0 shadow-sm">
        <Table><TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Device</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Location</TableHead><TableHead className="hidden md:table-cell">Protocol</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Last Seen</TableHead><TableHead className="hidden xl:table-cell">Battery</TableHead><TableHead className="hidden xl:table-cell">Signal</TableHead><TableHead className="w-12"></TableHead>
        </TableRow></TableHeader><TableBody>
          {filtered.length === 0 && <TableRow><TableCell colSpan={9}><EmptyState icon={Smartphone} title="No devices found" description="Try adjusting your search or filters." /></TableCell></TableRow>}
          {filtered.map(d => { const TI = typeIcon[d.type] || Smartphone; return (
            <TableRow key={d.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetailDevice(d)}>
              <TableCell><div className="flex items-center gap-2"><TI className="h-4 w-4 text-muted-foreground shrink-0" /><div><p className="font-medium text-sm">{d.name}</p><p className="text-xs text-muted-foreground font-mono">{d.id}</p></div></div></TableCell>
              <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{d.type}</Badge></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{d.location}</TableCell>
              <TableCell className="hidden md:table-cell"><Badge variant="secondary" className="font-mono text-xs">{d.protocol}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`${statusColor[d.status]} capitalize`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot[d.status]} mr-1`} />{d.status}</Badge></TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{timeAgo(d.lastSeen)}</TableCell>
              <TableCell className="hidden xl:table-cell">{d.batteryLevel != null ? <div className="flex items-center gap-2"><div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${d.batteryLevel <= 20 ? 'bg-red-500' : d.batteryLevel <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${d.batteryLevel}%` }} /></div><span className="text-xs font-medium">{d.batteryLevel}%</span></div> : <span className="text-xs text-muted-foreground">Wired</span>}</TableCell>
              <TableCell className="hidden xl:table-cell"><Badge variant="outline" className={`text-xs ${d.signalStrength === 'Strong' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : d.signalStrength === 'Good' || d.signalStrength === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : d.signalStrength === 'Weak' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{d.signalStrength}</Badge></TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={e => { e.stopPropagation(); setDetailDevice(d); }}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={e => { e.stopPropagation(); handleDelete(d.id); }}><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ); })}
        </TableBody></Table>
      </Card>

      <Dialog open={!!detailDevice} onOpenChange={() => setDetailDevice(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {detailDevice && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2">{detailDevice.name}<Badge variant="outline" className={`${statusColor[detailDevice.status]} capitalize ml-2`}>{detailDevice.status}</Badge></DialogTitle><DialogDescription className="font-mono text-xs">{detailDevice.id}</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[['Type', detailDevice.type], ['Protocol', detailDevice.protocol], ['Location', detailDevice.location], ['Asset', detailDevice.asset || '-'], ['Group', detailDevice.group || '-'], ['Last Seen', timeAgo(detailDevice.lastSeen)], ['Battery', detailDevice.batteryLevel != null ? `${detailDevice.batteryLevel}%` : 'Wired'], ['Signal', detailDevice.signalStrength], ['Parameter', detailDevice.parameter], ['Current Value', `${detailDevice.currentValue} ${detailDevice.unit}`]].map(([label, val]) => (
                <div key={label} className="flex justify-between p-2 rounded-lg bg-muted/30"><span className="text-muted-foreground">{label as string}</span><span className="font-medium">{label === 'Type' ? <span className="capitalize">{val as string}</span> : val as string}</span></div>
              ))}
            </div>
            <div className="mt-2">
              <p className="text-sm font-medium mb-2">Simulated Readings (24h)</p>
              <ChartContainer config={{ value: { label: detailDevice.parameter, color: '#10b981' } }} className="h-[200px] w-full">
                <AreaChart data={generateReadingData(detailDevice.currentValue, detailDevice.currentValue * 0.15)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={3} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => handleDelete(detailDevice.id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4 mr-1.5" />Remove Device</Button><Button variant="outline" onClick={() => setDetailDevice(null)}>Close</Button></DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IotMonitoringPage() {
  const [sensors] = useState([
    { id: 'DEV-001', name: 'Boiler Room Temp', parameter: 'Temperature', unit: '°C', value: 72.4, threshold: 85, trend: 'up' as const, sparkline: [68, 70, 69, 71, 73, 72, 74, 71, 72.4] },
    { id: 'DEV-002', name: 'Pump Vibration', parameter: 'Vibration', unit: 'mm/s', value: 3.2, threshold: 7.0, trend: 'stable' as const, sparkline: [3.0, 3.1, 3.3, 3.2, 3.1, 3.2, 3.0, 3.1, 3.2] },
    { id: 'DEV-003', name: 'Compressor Pressure', parameter: 'Pressure', unit: 'PSI', value: 142.8, threshold: 150, trend: 'up' as const, sparkline: [130, 135, 138, 140, 142, 139, 141, 143, 142.8] },
    { id: 'DEV-004', name: 'Clean Room Humidity', parameter: 'Humidity', unit: '%', value: 42.1, threshold: 60, trend: 'down' as const, sparkline: [45, 44, 43.5, 44, 43, 42.5, 42, 42.3, 42.1] },
    { id: 'DEV-010', name: 'Motor M-102 Current', parameter: 'Current', unit: 'A', value: 48.7, threshold: 35, trend: 'up' as const, sparkline: [32, 35, 38, 42, 44, 45, 47, 48, 48.7] },
    { id: 'DEV-011', name: 'ETP pH Level', parameter: 'pH', unit: 'pH', value: 7.2, threshold: 9.0, trend: 'stable' as const, sparkline: [7.1, 7.2, 7.0, 7.3, 7.2, 7.1, 7.2, 7.3, 7.2] },
    { id: 'DEV-013', name: 'Panel P-14 Thermal', parameter: 'Temperature', unit: '°C', value: 58.3, threshold: 55, trend: 'up' as const, sparkline: [42, 45, 48, 50, 52, 54, 55, 57, 58.3] },
    { id: 'DEV-007', name: 'Fuel Tank Level', parameter: 'Level', unit: '%', value: 67.3, threshold: 15, trend: 'down' as const, sparkline: [80, 78, 75, 73, 71, 70, 68, 67.5, 67.3] },
  ]);
  const [alerts] = useState([
    { id: 1, severity: 'critical' as const, device: 'Motor M-102 Current', parameter: 'Current', value: '48.7 A', threshold: '35 A', time: '2 min ago' },
    { id: 2, severity: 'critical' as const, device: 'Panel P-14 Thermal', parameter: 'Temperature', value: '58.3 °C', threshold: '55 °C', time: '5 min ago' },
    { id: 3, severity: 'warning' as const, device: 'Compressor Pressure', parameter: 'Pressure', value: '142.8 PSI', threshold: '150 PSI', time: '12 min ago' },
    { id: 4, severity: 'warning' as const, device: 'Boiler Room Temp', parameter: 'Temperature', value: '72.4 °C', threshold: '85 °C', time: '18 min ago' },
    { id: 5, severity: 'info' as const, device: 'Fuel Tank Level', parameter: 'Level', value: '67.3%', threshold: '15%', time: '1 hr ago' },
    { id: 6, severity: 'info' as const, device: 'Pump Vibration', parameter: 'Vibration', value: '3.2 mm/s', threshold: '7.0 mm/s', time: '2 hr ago' },
  ]);

  const activityData = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    temperature: +(70 + Math.sin(i * 0.4) * 8 + Math.random() * 3).toFixed(1),
    pressure: +(130 + Math.sin(i * 0.3 + 1) * 15 + Math.random() * 5).toFixed(1),
    humidity: +(45 + Math.sin(i * 0.25 + 2) * 5 + Math.random() * 2).toFixed(1),
  })), []);

  const activityConfig = {
    temperature: { label: 'Temperature (°C)', color: '#ef4444' },
    pressure: { label: 'Pressure (PSI)', color: '#f59e0b' },
    humidity: { label: 'Humidity (%)', color: '#06b6d4' },
  } as const;

  const severityStyle: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 border-red-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', info: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  const severityIcon: Record<string, any> = { critical: AlertCircle, warning: AlertTriangle, info: Info };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">IoT Monitoring</h1><p className="text-muted-foreground text-sm mt-1">Real-time monitoring dashboard for all connected IoT devices and sensor data</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Active Sensors', value: 8, icon: Radio, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Alerts Today', value: 14, icon: BellRing, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
          { label: 'Data Points (24h)', value: '1.2M', icon: Activity, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Avg Response Time', value: '142ms', icon: Gauge, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      <Card className="border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"><Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><CardTitle className="text-base font-semibold">Sensor Activity (24h)</CardTitle><CardDescription className="text-xs mt-0.5">Multi-parameter trend across critical sensors</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={activityConfig} className="h-[300px] w-full">
            <AreaChart data={activityData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={3} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="temperature" stroke="#ef4444" fill="#ef4444" fillOpacity={0.08} strokeWidth={2} />
              <Area type="monotone" dataKey="pressure" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={2} />
              <Area type="monotone" dataKey="humidity" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.08} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Live Sensor Readings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {sensors.map(s => {
              const isOver = s.value >= s.threshold;
              const TrendI = s.trend === 'up' ? TrendingUp : s.trend === 'down' ? TrendingDown : Minus;
              const trendColor = s.trend === 'up' ? 'text-red-500' : s.trend === 'down' ? 'text-emerald-500' : 'text-slate-400';
              return (
                <Card key={s.id} className={`border ${isOver ? 'border-red-200 bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">{s.name}</p>
                      <TrendI className={`h-3.5 w-3.5 ${trendColor}`} />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-bold ${isOver ? 'text-red-600' : ''}`}>{s.value}</span>
                      <span className="text-xs text-muted-foreground">{s.unit}</span>
                    </div>
                    <div className="mt-2 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={s.sparkline.map((v, i) => ({ i, v }))}>
                          <Area type="monotone" dataKey="v" stroke={isOver ? '#ef4444' : '#10b981'} fill={isOver ? '#ef4444' : '#10b981'} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Threshold: {s.threshold} {s.unit}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Alerts</h2>
          <Card className="border">
            <CardContent className="p-4">
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {alerts.map(a => {
                  const SI = severityIcon[a.severity];
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`h-7 w-7 rounded-lg ${severityStyle[a.severity]} flex items-center justify-center shrink-0 mt-0.5`}><SI className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5"><span className="font-medium text-xs truncate">{a.device}</span><Badge variant="outline" className={`text-[10px] capitalize ${severityStyle[a.severity]}`}>{a.severity}</Badge></div>
                        <p className="text-[11px] text-muted-foreground">{a.parameter}: <span className={a.severity === 'critical' ? 'text-red-600 font-medium' : ''}>{a.value}</span> (Limit: {a.threshold})</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IotRulesPage() {
  const [rules, setRules] = useState<any[]>([
    { id: 'RUL-001', name: 'High Temperature Alert', device: 'Temperature Sensor - Boiler Room', parameter: 'Temperature', operator: '>', threshold: 85, unit: '°C', action: 'alert', status: 'active', triggeredCount: 12, lastTriggered: '2025-01-15T14:20:00Z', cooldown: 300 },
    { id: 'RUL-002', name: 'Critical Vibration Shutdown', device: 'Vibration Sensor - Pump Station', parameter: 'Vibration', operator: '>', threshold: 10.0, unit: 'mm/s', action: 'shutdown', status: 'active', triggeredCount: 0, lastTriggered: null, cooldown: 60 },
    { id: 'RUL-003', name: 'Low Battery Warning', device: 'Smoke Detector - Warehouse', parameter: 'Battery', operator: '<', threshold: 20, unit: '%', action: 'email', status: 'active', triggeredCount: 3, lastTriggered: '2025-01-15T08:45:00Z', cooldown: 3600 },
    { id: 'RUL-004', name: 'High Pressure Alert', device: 'Pressure Transmitter - Compressor', parameter: 'Pressure', operator: '>=', threshold: 150, unit: 'PSI', action: 'alert', status: 'active', triggeredCount: 5, lastTriggered: '2025-01-15T14:28:00Z', cooldown: 300 },
    { id: 'RUL-005', name: 'Humidity Breach Notification', device: 'Humidity Sensor - Clean Room', parameter: 'Humidity', operator: '>', threshold: 55, unit: '%', action: 'webhook', status: 'paused', triggeredCount: 8, lastTriggered: '2025-01-14T22:10:00Z', cooldown: 600 },
    { id: 'RUL-006', name: 'Motor Overcurrent Protection', device: 'Current Sensor - Motor M-102', parameter: 'Current', operator: '>', threshold: 45, unit: 'A', action: 'shutdown', status: 'active', triggeredCount: 2, lastTriggered: '2025-01-15T14:30:00Z', cooldown: 120 },
    { id: 'RUL-007', name: 'Fuel Tank Low Level', device: 'Level Sensor - Fuel Tank', parameter: 'Level', operator: '<=', threshold: 15, unit: '%', action: 'email', status: 'active', triggeredCount: 1, lastTriggered: '2025-01-10T06:00:00Z', cooldown: 43200 },
    { id: 'RUL-008', name: 'pH Out of Range', device: 'pH Sensor - Effluent Treatment', parameter: 'pH', operator: '>', threshold: 9.0, unit: 'pH', action: 'alert', status: 'paused', triggeredCount: 0, lastTriggered: null, cooldown: 900 },
    { id: 'RUL-009', name: 'Thermal Panel Warning', device: 'Thermal Camera - Panel P-14', parameter: 'Temperature', operator: '>', threshold: 55, unit: '°C', action: 'alert', status: 'active', triggeredCount: 7, lastTriggered: '2025-01-15T14:25:00Z', cooldown: 600 },
    { id: 'RUL-010', name: 'Cooling Flow Drop', device: 'Flow Meter - Cooling Loop', parameter: 'Flow Rate', operator: '<', threshold: 80, unit: 'GPM', action: 'email', status: 'active', triggeredCount: 4, lastTriggered: '2025-01-15T11:30:00Z', cooldown: 1800 },
  ]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', device: '', parameter: '', operator: '>' as string, threshold: '', unit: '', action: 'alert' as string, cooldown: '300' });

  const stats = useMemo(() => ({
    total: rules.length, active: rules.filter(r => r.status === 'active').length,
    paused: rules.filter(r => r.status === 'paused').length, triggersToday: rules.reduce((s, r) => s + r.triggeredCount, 0),
  }), [rules]);

  const handleCreate = () => {
    if (!newRule.name.trim()) { toast.error('Rule name is required'); return; }
    if (!newRule.device.trim()) { toast.error('Device is required'); return; }
    const rule: any = { id: `RUL-${String(rules.length + 1).padStart(3, '0')}`, name: newRule.name, device: newRule.device, parameter: newRule.parameter || 'N/A', operator: newRule.operator, threshold: parseFloat(newRule.threshold) || 0, unit: newRule.unit || '', action: newRule.action, status: 'active', triggeredCount: 0, lastTriggered: null, cooldown: parseInt(newRule.cooldown) || 300 };
    setRules(p => [...p, rule]); setCreateOpen(false); setNewRule({ name: '', device: '', parameter: '', operator: '>', threshold: '', unit: '', action: 'alert', cooldown: '300' });
    toast.success('Rule created successfully');
  };

  const toggleRule = (id: string) => {
    setRules(p => p.map(r => r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r));
    const rule = rules.find(r => r.id === id);
    toast.success(`${rule?.name} ${rule?.status === 'active' ? 'paused' : 'activated'}`);
  };

  const handleDelete = (id: string) => { setRules(p => p.filter(r => r.id !== id)); toast.success('Rule deleted'); };

  const actionColor: Record<string, string> = { alert: 'bg-amber-50 text-amber-700 border-amber-200', email: 'bg-sky-50 text-sky-700 border-sky-200', webhook: 'bg-violet-50 text-violet-700 border-violet-200', shutdown: 'bg-red-50 text-red-700 border-red-200' };
  const actionIcon: Record<string, any> = { alert: Bell, email: Mail, webhook: Globe, shutdown: StopCircle };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">IoT Rules</h1><p className="text-muted-foreground text-sm mt-1">Configure automation rules and alert thresholds for IoT sensor data</p></div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />Create Rule</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Create Automation Rule</DialogTitle><DialogDescription>Define conditions and actions for automated responses.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2"><Label>Rule Name *</Label><Input placeholder="High Temperature Alert" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Device *</Label><Input placeholder="Temperature Sensor" value={newRule.device} onChange={e => setNewRule({ ...newRule, device: e.target.value })} /></div>
                <div className="space-y-2"><Label>Parameter</Label><Input placeholder="Temperature" value={newRule.parameter} onChange={e => setNewRule({ ...newRule, parameter: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Operator</Label><Select value={newRule.operator} onValueChange={v => setNewRule({ ...newRule, operator: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['>', '<', '>=', '<=', '==', '!='].map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Threshold *</Label><Input type="number" placeholder="85" value={newRule.threshold} onChange={e => setNewRule({ ...newRule, threshold: e.target.value })} /></div>
                <div className="space-y-2"><Label>Unit</Label><Input placeholder="°C" value={newRule.unit} onChange={e => setNewRule({ ...newRule, unit: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Action Type</Label><Select value={newRule.action} onValueChange={v => setNewRule({ ...newRule, action: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alert">Alert</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="webhook">Webhook</SelectItem><SelectItem value="shutdown">Shutdown</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Cooldown (sec)</Label><Input type="number" placeholder="300" value={newRule.cooldown} onChange={e => setNewRule({ ...newRule, cooldown: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Rule</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: stats.total, icon: ClipboardList, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-400' },
          { label: 'Active', value: stats.active, icon: Play, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Paused', value: stats.paused, icon: Pause, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Total Triggers', value: stats.triggersToday, icon: Zap, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      <div className="space-y-3">
        {rules.map(rule => {
          const AI = actionIcon[rule.action] || Bell;
          return (
            <Card key={rule.id} className={`border ${rule.status === 'paused' ? 'opacity-70' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`h-9 w-9 rounded-lg ${actionColor[rule.action]} flex items-center justify-center shrink-0 mt-0.5`}><AI className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{rule.name}</p>
                        <Badge variant="outline" className={rule.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>{rule.status === 'active' ? 'Active' : 'Paused'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rule.device} &mdash; When <span className="font-medium text-foreground">{rule.parameter}</span> {rule.operator} <span className="font-semibold text-foreground">{rule.threshold}{rule.unit}</span></p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                        <span>Triggers: <span className="font-medium text-foreground">{rule.triggeredCount}</span></span>
                        <span>Last: <span className="font-medium text-foreground">{rule.lastTriggered ? timeAgo(rule.lastTriggered) : 'Never'}</span></span>
                        <span className="hidden sm:inline">Cooldown: <span className="font-medium text-foreground">{rule.cooldown}s</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.status === 'active'} onCheckedChange={() => toggleRule(rule.id)} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleRule(rule.id)}>{rule.status === 'active' ? <><Pause className="h-4 w-4 mr-2" />Pause</> : <><Play className="h-4 w-4 mr-2" />Activate</>}</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rules.length === 0 && <EmptyState icon={Radio} title="No automation rules" description="Create rules to automate responses to IoT sensor data." />}
      </div>
    </div>
  );
}

// ============================================================================
// ANALYTICS SUBPAGES
// ============================================================================

function AnalyticsKpiPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<WorkOrder[]>('/api/work-orders'),
      api.get<MaintenanceRequest[]>('/api/maintenance-requests'),
    ]).then(([statsRes, woRes, mrRes]) => {
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (woRes.success && woRes.data) setWorkOrders(woRes.data);
      if (mrRes.success && mrRes.data) setRequests(mrRes.data);
      setLoading(false);
    });
  }, []);

  const totalWOs = stats?.totalWorkOrders || 0;
  const completedWOs = stats?.completedWorkOrders || 0;
  const completionRate = totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0;
  const completedList = workOrders.filter(wo => wo.status === 'completed' || wo.status === 'verified' || wo.status === 'closed');
  const mttr = completedList.length > 0 ? (completedList.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) / completedList.length).toFixed(1) : '0.0';
  const preventiveWOs = stats?.preventiveWO || 0;
  const pmCompliance = totalWOs > 0 ? Math.round((preventiveWOs / totalWOs) * 100) : 0;

  const kpiCards = [
    { label: 'Total Assets', value: '-', icon: Building2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Active Work Orders', value: stats?.activeWorkOrders || 0, icon: Wrench, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'MTTR (Hours)', value: mttr, icon: Timer, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Overdue WOs', value: stats?.overdueWorkOrders || 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'PM Compliance', value: `${pmCompliance}%`, icon: ClipboardCheck, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const recentWOs = [...workOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentMRs = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1><p className="text-muted-foreground mt-1">Organization-wide key performance indicators for maintenance, reliability, and operations</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {kpiCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border"><CardHeader><CardTitle className="text-base">Recent Work Orders</CardTitle><CardDescription className="text-xs">Latest work order activity</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {recentWOs.map(wo => (
                <div key={wo.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{wo.woNumber}</span>
                    <span className="font-medium text-sm truncate">{wo.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0"><StatusBadge status={wo.status} /></div>
                </div>
              ))}
              {recentWOs.length === 0 && <EmptyState icon={Wrench} title="No work orders" description="Work orders will appear here." />}
            </div>
          </CardContent></Card>
          <Card className="border"><CardHeader><CardTitle className="text-base">Recent Maintenance Requests</CardTitle><CardDescription className="text-xs">Latest request activity</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {recentMRs.map(mr => (
                <div key={mr.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{mr.requestNumber}</span>
                    <span className="font-medium text-sm truncate">{mr.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0"><StatusBadge status={mr.status} /></div>
                </div>
              ))}
              {recentMRs.length === 0 && <EmptyState icon={ClipboardList} title="No requests" description="Maintenance requests will appear here." />}
            </div>
          </CardContent></Card>
        </div>
      </>)}
    </div>
  );
}
function AnalyticsOeePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/assets');
        if (res.data) setAssets(res.data.assets || res.data || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  // Simulated OEE data derived from asset states
  const operationalAssets = assets.filter((a: any) => a.status === 'operational').length;
  const totalAssets = assets.length || 1;

  const availability = operationalAssets > 0 ? Math.min(98, 75 + Math.floor(operationalAssets / Math.max(1, totalAssets) * 25) + Math.floor(Math.random() * 5)) : 0;
  const performance = availability > 60 ? Math.min(97, 68 + Math.floor(Math.random() * 20)) : 45;
  const quality = performance > 50 ? Math.min(99, 88 + Math.floor(Math.random() * 10)) : 70;
  const oee = Math.round((availability * performance * quality) / 10000 * 100) / 100;

  const gaugeColor = (val: number) => {
    if (val >= 85) return 'text-emerald-500';
    if (val >= 65) return 'text-amber-500';
    return 'text-red-500';
  };
  const gaugeBg = (val: number) => {
    if (val >= 85) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (val >= 65) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };
  const strokeColor = (val: number) => {
    if (val >= 85) return 'stroke-emerald-500';
    if (val >= 65) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  function GaugeCircle({ value, label, size = 140 }: { value: number; label: string; size?: number }) {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    return (
      <div className="flex flex-col items-center gap-2">
        <div className={`rounded-2xl p-4 ${gaugeBg(value)}`}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted" strokeWidth="10" />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className={strokeColor(value)} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${gaugeColor(value)}`}>{value}%</span>
          </div>
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
    );
  }

  const oeeTarget = 85;
  const gap = oee - oeeTarget;

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OEE Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overall Equipment Effectiveness — Availability × Performance × Quality</p>
      </div>

      {/* OEE Score */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
            <div className="flex flex-col items-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Overall OEE</p>
              <div className={`relative w-44 h-44 rounded-2xl p-4 ${gaugeBg(oee)}`}>
                <svg width="144" height="144" className="-rotate-90">
                  <circle cx="72" cy="72" r="60" fill="none" className="stroke-muted" strokeWidth="12" />
                  <circle cx="72" cy="72" r="60" fill="none" className={strokeColor(oee)} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 - (oee / 100) * 2 * Math.PI * 60}
                    style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${gaugeColor(oee)}`}>{oee}%</span>
                  <span className="text-xs text-muted-foreground">Target: {oeeTarget}%</span>
                </div>
              </div>
              <Badge variant={oee >= oeeTarget ? 'default' : 'secondary'} className={`mt-2 ${oee >= oeeTarget ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                {gap >= 0 ? `${gap.toFixed(1)}% above target` : `${Math.abs(gap).toFixed(1)}% below target`}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-8">
              <GaugeCircle value={availability} label="Availability" />
              <GaugeCircle value={performance} label="Performance" />
              <GaugeCircle value={quality} label="Quality" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OEE Breakdown */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">OEE Breakdown</CardTitle><CardDescription>Component contribution to overall OEE</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: 'Availability', value: availability, desc: 'Planned vs unplanned downtime' },
              { label: 'Performance', value: performance, desc: 'Speed losses and minor stops' },
              { label: 'Quality', value: quality, desc: 'Defect rate and rework' },
            ].map(item => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">{item.label}</span>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <span className={`text-sm font-bold ${gaugeColor(item.value)}`}>{item.value}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${item.value >= 85 ? 'bg-emerald-500' : item.value >= 65 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Losses */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Loss Categories</CardTitle><CardDescription>Simulated production loss analysis</CardDescription></CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {[
              { type: 'Unplanned Downtime', hours: 12.5, pct: 28, color: 'bg-red-500' },
              { type: 'Speed Loss', hours: 8.2, pct: 18, color: 'bg-amber-500' },
              { type: 'Planned Downtime', hours: 7.0, pct: 16, color: 'bg-sky-500' },
              { type: 'Quality Rejects', hours: 6.3, pct: 14, color: 'bg-orange-500' },
              { type: 'Setup / Changeover', hours: 5.1, pct: 11, color: 'bg-violet-500' },
              { type: 'Minor Stops', hours: 3.8, pct: 8, color: 'bg-teal-500' },
              { type: 'Rework', hours: 2.2, pct: 5, color: 'bg-purple-500' },
            ].map(loss => (
              <div key={loss.type} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${loss.color} shrink-0`} />
                <span className="text-sm flex-1 truncate">{loss.type}</span>
                <span className="text-xs text-muted-foreground w-16 text-right">{loss.hours}h</span>
                <div className="w-20 bg-muted rounded-full h-2"><div className={`h-full rounded-full ${loss.color}`} style={{ width: `${loss.pct}%` }} /></div>
                <span className="text-xs font-semibold w-10 text-right">{loss.pct}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Asset-level OEE (simulated) */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Asset OEE Scores</CardTitle><CardDescription>Simulated OEE per asset based on condition and status</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Condition</TableHead>
                  <TableHead>Est. OEE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.slice(0, 15).map((a: any) => {
                  let estOee = 0;
                  if (a.status === 'operational' && (a.condition === 'good' || a.condition === 'new')) estOee = 82 + Math.floor(Math.random() * 16);
                  else if (a.status === 'operational' && a.condition === 'fair') estOee = 60 + Math.floor(Math.random() * 20);
                  else if (a.status === 'standby') estOee = 40 + Math.floor(Math.random() * 25);
                  else if (a.status === 'under_maintenance') estOee = 10 + Math.floor(Math.random() * 20);
                  else estOee = 0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.name || a.assetTag}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{a.category || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[11px] capitalize">{a.status?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell"><Badge variant="outline" className="text-[11px] capitalize">{a.condition}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2"><div className={`h-full rounded-full ${estOee >= 85 ? 'bg-emerald-500' : estOee >= 65 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, estOee)}%` }} /></div>
                          <span className={`text-sm font-semibold ${gaugeColor(estOee)}`}>{estOee}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function AnalyticsDowntimePage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<WorkOrder[]>('/api/work-orders').then(res => {
      if (res.success && res.data) setWorkOrders(res.data);
      setLoading(false);
    });
  }, []);

  const downtimeEvents = workOrders.filter(wo => wo.type === 'corrective' || wo.type === 'emergency');
  const totalEvents = downtimeEvents.length;
  const completedDowntime = downtimeEvents.filter(wo => wo.status === 'completed' || wo.status === 'verified' || wo.status === 'closed');
  const avgResolutionTime = completedDowntime.length > 0 ? (completedDowntime.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) / completedDowntime.length).toFixed(1) : '0.0';
  const costImpact = downtimeEvents.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);

  const assetFreq: Record<string, number> = {};
  downtimeEvents.forEach(wo => {
    const name = wo.assetName || 'Unknown';
    assetFreq[name] = (assetFreq[name] || 0) + 1;
  });
  const mostAffected = Object.entries(assetFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const sortedEvents = [...downtimeEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const kpis = [
    { label: 'Downtime Events', value: totalEvents, icon: TrendingDown, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Avg Resolution (Hrs)', value: avgResolutionTime, icon: Timer, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Most Affected', value: mostAffected.length > 0 ? mostAffected[0][0] : '-', icon: AlertTriangle, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: 'Cost Impact', value: `$${costImpact.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Downtime Analysis</h1><p className="text-muted-foreground mt-1">Track and analyze equipment downtime events, causes, and patterns</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{typeof k.value === 'string' && k.value.length > 14 ? k.value.slice(0, 14) + '...' : k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        {mostAffected.length > 0 && (
          <Card className="border"><CardHeader><CardTitle className="text-base">Most Affected Assets</CardTitle><CardDescription className="text-xs">Top assets by downtime frequency</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {mostAffected.map(([name, count], i) => {
                const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-6">#{i + 1}</span>
                    <span className="text-sm font-medium flex-1 truncate">{name}</span>
                    <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{count} events</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        )}
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Title</TableHead><TableHead className="hidden md:table-cell">Asset</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell text-right">Hours</TableHead><TableHead className="hidden lg:table-cell text-right">Cost</TableHead><TableHead className="hidden xl:table-cell">Created</TableHead></TableRow></TableHeader><TableBody>
          {sortedEvents.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="h-48"><EmptyState icon={TrendingDown} title="No downtime events" description="Corrective and emergency work orders will appear here." /></TableCell></TableRow>
          ) : sortedEvents.map(wo => (
            <TableRow key={wo.id} className="hover:bg-muted/30">
              <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
              <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
              <TableCell className="text-sm hidden md:table-cell">{wo.assetName || '-'}</TableCell>
              <TableCell><Badge variant="outline" className={wo.type === 'emergency' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>{wo.type.toUpperCase()}</Badge></TableCell>
              <TableCell><PriorityBadge priority={wo.priority} /></TableCell>
              <TableCell><StatusBadge status={wo.status} /></TableCell>
              <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{wo.actualHours || '-'}</TableCell>
              <TableCell className="text-right font-medium hidden lg:table-cell">${(wo.totalCost || 0).toLocaleString()}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden xl:table-cell">{formatDate(wo.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
function AnalyticsEnergyPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/assets');
        if (res.data) setAssets(res.data.assets || res.data || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  // Simulated energy data
  const totalConsumption = 48250;
  const totalCost = 28950;
  const avgDailyConsumption = 1608;
  const efficiencyScore = 78;

  const summaryCards = [
    { label: 'Total Consumption', value: `${(totalConsumption / 1000).toFixed(1)} MWh`, icon: Zap, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Total Cost', value: `$${(totalCost / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Avg Daily', value: `${avgDailyConsumption} kWh`, icon: BarChart3, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Efficiency Score', value: `${efficiencyScore}%`, icon: Target, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  // Monthly consumption trend (simulated)
  const monthlyData = [
    { month: 'Jan', kwh: 4200, cost: 2520 },
    { month: 'Feb', kwh: 3800, cost: 2280 },
    { month: 'Mar', kwh: 4500, cost: 2700 },
    { month: 'Apr', kwh: 4100, cost: 2460 },
    { month: 'May', kwh: 4800, cost: 2880 },
    { month: 'Jun', kwh: 5200, cost: 3120 },
    { month: 'Jul', kwh: 5600, cost: 3360 },
    { month: 'Aug', kwh: 5400, cost: 3240 },
    { month: 'Sep', kwh: 4600, cost: 2760 },
    { month: 'Oct', kwh: 3900, cost: 2340 },
    { month: 'Nov', kwh: 3700, cost: 2220 },
    { month: 'Dec', kwh: 3450, cost: 2070 },
  ];
  const maxKwh = Math.max(...monthlyData.map(m => m.kwh));

  // Meter readings (simulated)
  const meterReadings = [
    { id: '1', meter: 'MTR-001 Main', reading: '124568', date: '2025-01-15', consumption: 2480, cost: 1488 },
    { id: '2', meter: 'MTR-002 Building A', reading: '87342', date: '2025-01-15', consumption: 1850, cost: 1110 },
    { id: '3', meter: 'MTR-003 Production', reading: '198421', date: '2025-01-15', consumption: 3200, cost: 1920 },
    { id: '4', meter: 'MTR-004 HVAC', reading: '56218', date: '2025-01-15', consumption: 980, cost: 588 },
    { id: '5', meter: 'MTR-005 Lighting', reading: '34521', date: '2025-01-15', consumption: 620, cost: 372 },
    { id: '6', meter: 'MTR-006 Compressed Air', reading: '76834', date: '2025-01-15', consumption: 1540, cost: 924 },
    { id: '7', meter: 'MTR-007 Workshop', reading: '43210', date: '2025-01-15', consumption: 880, cost: 528 },
    { id: '8', meter: 'MTR-008 Cooling Tower', reading: '65432', date: '2025-01-15', consumption: 1280, cost: 768 },
  ];

  // Top consumers from assets
  const topConsumers = assets.slice(0, 8).map((a: any, i: number) => ({
    name: a.name || a.assetTag || `Asset ${i + 1}`,
    consumption: Math.floor(2000 - i * 200 + Math.random() * 500),
  })).sort((a: any, b: any) => b.consumption - a.consumption);
  const maxConsumption = topConsumers.length > 0 ? topConsumers[0].consumption : 1;

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Energy Analytics</h1>
        <p className="text-muted-foreground mt-1">Monitor energy consumption patterns and optimize usage across assets</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`h-10 w-10 rounded-lg ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly consumption trend */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Consumption Trend</CardTitle><CardDescription>kWh per month (simulated)</CardDescription></CardHeader>
          <CardContent className="space-y-2.5">
            {monthlyData.map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs font-medium w-8 text-muted-foreground">{m.month}</span>
                <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${m.kwh >= 5000 ? 'bg-red-400' : m.kwh >= 4000 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${(m.kwh / maxKwh) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold w-16 text-right">{m.kwh.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-[10px] text-muted-foreground">&lt; 4,000 kWh</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-400" /><span className="text-[10px] text-muted-foreground">4,000-5,000</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-400" /><span className="text-[10px] text-muted-foreground">&gt; 5,000 kWh</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Top energy consumers */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Energy Consumers</CardTitle><CardDescription>Assets ranked by estimated consumption</CardDescription></CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {topConsumers.map((c: any, i: number) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                <span className="text-sm flex-1 truncate">{c.name}</span>
                <div className="w-24 bg-muted rounded-full h-2"><div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(c.consumption / maxConsumption) * 100}%` }} /></div>
                <span className="text-xs font-semibold w-16 text-right">{c.consumption.toLocaleString()} kWh</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Meter readings table */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Meter Readings</CardTitle><CardDescription>Latest meter readings and consumption data (simulated)</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meter</TableHead>
                  <TableHead className="hidden md:table-cell">Reading</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Consumption (kWh)</TableHead>
                  <TableHead className="hidden md:table-cell">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meterReadings.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-sm font-mono">{m.meter}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{m.reading}</TableCell>
                    <TableCell className="text-sm hidden sm:table-cell">{m.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-muted rounded-full h-1.5"><div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, (m.consumption / 3500) * 100)}%` }} /></div>
                        <span className="text-sm font-semibold">{m.consumption.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">${m.cost.toLocaleString()}</TableCell>
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
// OPERATIONS SUBPAGES
// ============================================================================

function OperationsMeterReadingsPage() {
  const [readings] = useState([
    { id: 'MR-001', meter: 'Main Electricity Meter', type: 'electricity', location: 'Substation A', value: 45230, unit: 'kWh', previous: 43100, change: 4.95, date: '2025-01-15', status: 'normal' },
    { id: 'MR-002', meter: 'Water Supply Main', type: 'water', location: 'Utility Room B', value: 1285, unit: 'm³', previous: 1320, change: -2.65, date: '2025-01-15', status: 'normal' },
    { id: 'MR-003', meter: 'Natural Gas Inlet', type: 'gas', location: 'Boiler Room', value: 890, unit: 'm³', previous: 810, change: 9.88, date: '2025-01-15', status: 'warning' },
    { id: 'MR-004', meter: 'Compressed Air System', type: 'air', location: 'Compressor Room', value: 98.2, unit: 'bar', previous: 95.1, change: 3.26, date: '2025-01-15', status: 'normal' },
    { id: 'MR-005', meter: 'Steam Header Pressure', type: 'steam', location: 'Boiler Room', value: 12.8, unit: 'psi', previous: 12.5, change: 2.40, date: '2025-01-14', status: 'normal' },
    { id: 'MR-006', meter: 'HVAC Chiller Power', type: 'electricity', location: 'Building C', value: 8750, unit: 'kWh', previous: 8200, change: 6.71, date: '2025-01-14', status: 'warning' },
    { id: 'MR-007', meter: 'Process Water Loop', type: 'water', location: 'Production Floor', value: 3420, unit: 'm³', previous: 3380, change: 1.18, date: '2025-01-14', status: 'normal' },
    { id: 'MR-008', meter: 'Emergency Generator Fuel', type: 'gas', location: 'Generator Room', value: 450, unit: 'm³', previous: 500, change: -10.0, date: '2025-01-13', status: 'critical' },
  ]);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ meter: '', value: '', unit: 'kWh', notes: '', readingDate: '' });
  const filtered = searchText.trim() ? readings.filter(r => {
    const q = searchText.toLowerCase();
    return r.meter.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
  }) : readings;
  const kpis = [
    { label: 'Total Readings', value: '156', icon: Gauge, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Meters Tracked', value: '12', icon: Activity, color: 'bg-sky-50 text-sky-600' },
    { label: 'Anomalies', value: '3', icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Avg Daily', value: '5.2', icon: TrendingUp, color: 'bg-violet-50 text-violet-600' },
  ];
  const statusColor = (s: string) => s === 'normal' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'warning' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  const handleCreate = () => { setSaving(true); setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ meter: '', value: '', unit: 'kWh', notes: '', readingDate: '' }); toast.success('Reading recorded successfully'); }, 800); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Meter Readings</h1><p className="text-muted-foreground mt-1">Record and track meter/gauge readings for utility meters and equipment</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Reading</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search readings..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" /></div>
      </div>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Meter Name</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead className="hidden lg:table-cell">Location</TableHead><TableHead className="text-right">Reading Value</TableHead><TableHead className="hidden sm:table-cell text-right">Previous</TableHead><TableHead className="text-right">Change</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(r => (
            <TableRow key={r.id} className="hover:bg-muted/30">
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell className="font-medium">{r.meter}</TableCell>
              <TableCell className="hidden md:table-cell"><Badge variant="outline" className="capitalize">{r.type}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{r.location}</TableCell>
              <TableCell className="text-right font-medium">{r.value.toLocaleString()} <span className="text-xs text-muted-foreground">{r.unit}</span></TableCell>
              <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{r.previous.toLocaleString()}</TableCell>
              <TableCell className={`text-right font-medium ${r.change > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{r.change > 0 ? '+' : ''}{r.change.toFixed(2)}%</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(r.date)}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(r.status)}><span className="capitalize">{r.status}</span></Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Record New Reading</DialogTitle><DialogDescription>Enter the meter reading details below</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Meter Name</Label><Input placeholder="e.g. Main Electricity Meter" value={form.meter} onChange={e => setForm(f => ({ ...f, meter: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Reading Value</Label><Input type="number" placeholder="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div><Label>Unit</Label><Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kWh">kWh</SelectItem><SelectItem value="m³">m³</SelectItem><SelectItem value="psi">psi</SelectItem><SelectItem value="bar">bar</SelectItem><SelectItem value="CFM">CFM</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Reading Date</Label><Input type="date" value={form.readingDate} onChange={e => setForm(f => ({ ...f, readingDate: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.meter || !form.value}>{saving ? 'Saving...' : 'Record Reading'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function OperationsTrainingPage() {
  const [courses] = useState([
    { id: '1', course: 'Confined Space Entry', category: 'safety', instructor: 'John Martinez', duration: '4 hours', enrolled: 24, completion: 92, nextSession: '2025-01-20', status: 'active' },
    { id: '2', course: 'Lockout/Tagout Procedures', category: 'safety', instructor: 'Sarah Chen', duration: '2 hours', enrolled: 18, completion: 100, nextSession: '2025-02-01', status: 'completed' },
    { id: '3', course: 'PLC Programming Basics', category: 'technical', instructor: 'Mike Johnson', duration: '16 hours', enrolled: 12, completion: 67, nextSession: '2025-01-18', status: 'active' },
    { id: '4', course: 'Environmental Compliance', category: 'compliance', instructor: 'Emily Davis', duration: '3 hours', enrolled: 30, completion: 88, nextSession: '2025-01-25', status: 'active' },
    { id: '5', course: 'Leadership for Supervisors', category: 'leadership', instructor: 'Robert Wilson', duration: '8 hours', enrolled: 10, completion: 45, nextSession: '2025-02-10', status: 'upcoming' },
    { id: '6', course: 'Arc Flash Safety', category: 'safety', instructor: 'John Martinez', duration: '3 hours', enrolled: 22, completion: 95, nextSession: '2025-01-22', status: 'active' },
    { id: '7', course: 'Hydraulic Systems Maintenance', category: 'technical', instructor: 'Tom Brown', duration: '12 hours', enrolled: 15, completion: 78, nextSession: '2025-01-28', status: 'active' },
    { id: '8', course: 'ISO 9001 Internal Audit', category: 'compliance', instructor: 'Lisa Park', duration: '6 hours', enrolled: 8, completion: 100, nextSession: '-', status: 'completed' },
  ]);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'safety', instructor: '', duration: '', description: '' });
  const filtered = searchText.trim() ? courses.filter(c => {
    const q = searchText.toLowerCase();
    return c.course.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  }) : courses;
  const kpis = [
    { label: 'Total Courses', value: '24', icon: GraduationCap, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Active', value: '18', icon: Play, color: 'bg-sky-50 text-sky-600' },
    { label: 'Completed This Month', value: '67', icon: CheckCircle2, color: 'bg-amber-50 text-amber-600' },
    { label: 'Expiring Certs', value: '5', icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];
  const statusColor = (s: string) => s === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'upcoming' ? 'text-sky-600 bg-sky-50 border-sky-200' : s === 'completed' ? 'text-slate-600 bg-slate-50 border-slate-200' : 'text-red-600 bg-red-50 border-red-200';
  const categoryColor = (c: string) => c === 'safety' ? 'text-red-600 bg-red-50 border-red-200' : c === 'technical' ? 'text-sky-600 bg-sky-50 border-sky-200' : c === 'compliance' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-violet-600 bg-violet-50 border-violet-200';
  const handleCreate = () => { setSaving(true); setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ name: '', category: 'safety', instructor: '', duration: '', description: '' }); toast.success('Course created successfully'); }, 800); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Training</h1><p className="text-muted-foreground mt-1">Manage employee training records, certifications, and compliance</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Course</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search courses..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" /></div>
      </div>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Category</TableHead><TableHead className="hidden md:table-cell">Instructor</TableHead><TableHead className="hidden sm:table-cell">Duration</TableHead><TableHead className="text-right">Enrolled</TableHead><TableHead>Completion</TableHead><TableHead className="hidden lg:table-cell">Next Session</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(c => (
            <TableRow key={c.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{c.course}</TableCell>
              <TableCell><Badge variant="outline" className={categoryColor(c.category)}><span className="capitalize">{c.category}</span></Badge></TableCell>
              <TableCell className="text-sm hidden md:table-cell">{c.instructor}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{c.duration}</TableCell>
              <TableCell className="text-right">{c.enrolled}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[100px]">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.completion === 100 ? 'bg-emerald-500' : c.completion >= 75 ? 'bg-sky-500' : 'bg-amber-500'}`} style={{ width: `${c.completion}%` }} /></div>
                  <span className="text-xs font-medium w-9 text-right">{c.completion}%</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{c.nextSession}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(c.status)}><span className="capitalize">{c.status}</span></Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create New Course</DialogTitle><DialogDescription>Add a new training course to the system</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Course Name</Label><Input placeholder="e.g. Advanced Safety Training" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="safety">Safety</SelectItem><SelectItem value="technical">Technical</SelectItem><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="leadership">Leadership</SelectItem></SelectContent></Select></div>
              <div><Label>Duration</Label><Input placeholder="e.g. 4 hours" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></div>
            </div>
            <div><Label>Instructor</Label><Input placeholder="Instructor name" value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea placeholder="Course description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.name}>{saving ? 'Creating...' : 'Create Course'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function OperationsSurveysPage() {
  const [surveys] = useState([
    { id: '1', title: 'Annual Safety Culture Assessment', type: 'safety', status: 'active', responses: 45, completion: 90, created: '2025-01-01', expires: '2025-01-31' },
    { id: '2', title: 'ISO 14001 Compliance Check', type: 'compliance', status: 'active', responses: 28, completion: 70, created: '2025-01-05', expires: '2025-02-05' },
    { id: '3', title: 'Equipment Condition Survey Q1', type: 'audit', status: 'active', responses: 12, completion: 48, created: '2025-01-10', expires: '2025-01-25' },
    { id: '4', title: 'Employee Satisfaction Survey', type: 'feedback', status: 'active', responses: 67, completion: 84, created: '2024-12-15', expires: '2025-01-15' },
    { id: '5', title: 'Fire Safety Compliance Audit', type: 'safety', status: 'active', responses: 18, completion: 60, created: '2025-01-08', expires: '2025-02-08' },
    { id: '6', title: 'PPE Usage Observation', type: 'safety', status: 'closed', responses: 32, completion: 100, created: '2024-11-01', expires: '2024-12-01' },
    { id: '7', title: 'Process Hazard Analysis', type: 'audit', status: 'draft', responses: 0, completion: 0, created: '2025-01-14', expires: '-' },
    { id: '8', title: 'Vendor Quality Feedback', type: 'feedback', status: 'closed', responses: 15, completion: 100, created: '2024-12-01', expires: '2024-12-31' },
  ]);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'safety', description: '', questions: '', expiryDate: '' });
  const filtered = searchText.trim() ? surveys.filter(s => {
    const q = searchText.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q);
  }) : surveys;
  const kpis = [
    { label: 'Total Surveys', value: '15', icon: ClipboardList, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Active', value: '8', icon: Play, color: 'bg-sky-50 text-sky-600' },
    { label: 'Responses', value: '234', icon: Users, color: 'bg-amber-50 text-amber-600' },
    { label: 'Completion Rate', value: '78%', icon: Target, color: 'bg-violet-50 text-violet-600' },
  ];
  const statusColor = (s: string) => s === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'draft' ? 'text-slate-600 bg-slate-50 border-slate-200' : 'text-sky-600 bg-sky-50 border-sky-200';
  const typeColor = (t: string) => t === 'safety' ? 'text-red-600 bg-red-50 border-red-200' : t === 'compliance' ? 'text-amber-600 bg-amber-50 border-amber-200' : t === 'audit' ? 'text-sky-600 bg-sky-50 border-sky-200' : 'text-violet-600 bg-violet-50 border-violet-200';
  const handleCreate = () => { setSaving(true); setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ title: '', type: 'safety', description: '', questions: '', expiryDate: '' }); toast.success('Survey created successfully'); }, 800); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Surveys</h1><p className="text-muted-foreground mt-1">Create and conduct safety, compliance, and operational surveys</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Survey</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search surveys..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" /></div>
      </div>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Responses</TableHead><TableHead>Completion</TableHead><TableHead className="hidden md:table-cell">Created</TableHead><TableHead className="hidden lg:table-cell">Expires</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(s => (
            <TableRow key={s.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{s.title}</TableCell>
              <TableCell><Badge variant="outline" className={typeColor(s.type)}><span className="capitalize">{s.type}</span></Badge></TableCell>
              <TableCell><Badge variant="outline" className={statusColor(s.status)}><span className="capitalize">{s.status}</span></Badge></TableCell>
              <TableCell className="text-right">{s.responses}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[80px]">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${s.completion === 100 ? 'bg-emerald-500' : s.completion >= 75 ? 'bg-sky-500' : 'bg-amber-500'}`} style={{ width: `${s.completion}%` }} /></div>
                  <span className="text-xs font-medium w-9 text-right">{s.completion}%</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(s.created)}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{s.expires === '-' ? '-' : formatDate(s.expires)}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create New Survey</DialogTitle><DialogDescription>Set up a new survey for your team</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input placeholder="e.g. Monthly Safety Checklist" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="safety">Safety</SelectItem><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="audit">Audit</SelectItem><SelectItem value="feedback">Feedback</SelectItem></SelectContent></Select></div>
            <div><Label>Description</Label><Textarea placeholder="Survey description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Questions (one per line)</Label><Textarea placeholder="Are fire extinguishers accessible?&#10;Are emergency exits clear?&#10;Is PPE being worn correctly?" rows={4} value={form.questions} onChange={e => setForm(f => ({ ...f, questions: e.target.value }))} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.title}>{saving ? 'Creating...' : 'Create Survey'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function OperationsTimeLogsPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    api.get<WorkOrder[]>('/api/work-orders').then(res => {
      if (res.success && res.data) setWorkOrders(res.data);
      setLoading(false);
    });
  }, []);

  const allTimeLogs = workOrders.flatMap(wo =>
    (wo.timeLogs || []).map((tl: any) => ({ ...tl, woNumber: wo.woNumber, woTitle: wo.title }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = searchText.trim() ? allTimeLogs.filter(tl => {
    const q = searchText.toLowerCase();
    return (tl.woNumber || '').toLowerCase().includes(q) || (tl.userName || '').toLowerCase().includes(q) || (tl.action || '').toLowerCase().includes(q);
  }) : allTimeLogs;

  const totalHours = allTimeLogs.reduce((sum, tl) => sum + (tl.duration || 0), 0);
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisWeekHours = allTimeLogs.filter(tl => tl.createdAt && new Date(tl.createdAt) >= weekStart).reduce((sum, tl) => sum + (tl.duration || 0), 0);
  const thisMonthHours = allTimeLogs.filter(tl => tl.createdAt && new Date(tl.createdAt) >= monthStart).reduce((sum, tl) => sum + (tl.duration || 0), 0);

  const techHours: Record<string, number> = {};
  allTimeLogs.forEach(tl => {
    const name = tl.userName || 'Unknown';
    techHours[name] = (techHours[name] || 0) + (tl.duration || 0);
  });
  const topTech = Object.entries(techHours).sort((a, b) => b[1] - a[1])[0];

  const summaryCards = [
    { label: 'Total Hours Logged', value: totalHours.toFixed(1), icon: Clock, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'This Week', value: thisWeekHours.toFixed(1), icon: Calendar, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'This Month', value: thisMonthHours.toFixed(1), icon: Timer, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Top Technician', value: topTech ? topTech[0] : '-', icon: Users, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Time Logs</h1><p className="text-muted-foreground mt-1">Track employee work hours, shifts, and labor allocation</p></div>
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead className="hidden sm:table-cell">User</TableHead><TableHead>Action</TableHead><TableHead className="hidden md:table-cell">Start Time</TableHead><TableHead className="hidden md:table-cell">End Time</TableHead><TableHead className="text-right">Duration</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={Clock} title="No time logs found" description="Time logs will appear once work order time tracking is used." /></TableCell></TableRow>
          ) : filtered.slice(0, 50).map((tl, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="font-mono text-xs">{tl.woNumber}</TableCell>
              <TableCell className="text-sm hidden sm:table-cell">{tl.userName || '-'}</TableCell>
              <TableCell className="text-sm capitalize">{(tl.action || '').replace(/_/g, ' ')}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{tl.startTime ? formatDateTime(tl.startTime) : '-'}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{tl.endTime ? formatDateTime(tl.endTime) : '-'}</TableCell>
              <TableCell className="text-right font-medium">{tl.duration ? `${tl.duration.toFixed(1)}h` : '-'}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(tl.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
function OperationsShiftHandoverPage() {
  const [handovers] = useState([
    { id: '1', shift: 'Morning', date: '2025-01-15', from: 'Alex Thompson', to: 'Maria Garcia', tasksCompleted: 'PM on CNC Machine #3 completed. Coolant system flushed. Safety guards inspected.', pendingItems: 'Calibrate temperature sensor on Boiler #2. Check vibration readings on Compressor A.', issues: 'Unusual noise from Pump Station B at 10:30 AM.', escalations: 'Pump Station B needs urgent inspection.', status: 'completed' },
    { id: '2', shift: 'Afternoon', date: '2025-01-15', from: 'Maria Garcia', to: 'James Wilson', tasksCompleted: 'Temperature sensor calibrated on Boiler #2. Vibration check done on Compressor A.', pendingItems: 'Replace filter in HVAC Unit 5. Complete wiring diagram update for Panel C.', issues: 'HVAC Unit 5 filter showing excessive wear.', escalations: '-', status: 'completed' },
    { id: '3', shift: 'Night', date: '2025-01-14', from: 'James Wilson', to: 'Alex Thompson', tasksCompleted: 'Filter replacement on HVAC Unit 5 completed. Wiring diagram updated.', pendingItems: 'Lubricate bearings on Conveyor Belt 2. Test emergency stop on Press #1.', issues: '-', escalations: '-', status: 'completed' },
    { id: '4', shift: 'Morning', date: '2025-01-14', from: 'Alex Thompson', to: 'Maria Garcia', tasksCompleted: 'Bearing lubrication on Conveyor Belt 2 done.', pendingItems: 'Emergency stop test on Press #1. Inspect roof-mounted HVAC unit.', issues: 'Emergency stop button on Press #1 sticky response.', escalations: 'Press #1 safety concern flagged.', status: 'pending' },
    { id: '5', shift: 'Afternoon', date: '2025-01-14', from: 'Maria Garcia', to: 'James Wilson', tasksCompleted: 'Press #1 emergency stop replaced. Roof HVAC visual inspection done.', pendingItems: 'Schedule roof HVAC full service. Order replacement gaskets for Pump C.', issues: '-', escalations: '-', status: 'pending' },
    { id: '6', shift: 'Night', date: '2025-01-13', from: 'James Wilson', to: 'Alex Thompson', tasksCompleted: 'Routine patrol completed. All readings normal.', pendingItems: 'Check oil level in Hydraulic Press. Inspect fire suppression nozzles.', issues: 'Minor hydraulic fluid drip on Press #2.', escalations: '-', status: 'pending' },
  ]);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ shift: 'Morning', fromOperator: '', toOperator: '', tasksCompleted: '', pendingItems: '', issues: '', escalations: '' });
  const filtered = searchText.trim() ? handovers.filter(h => {
    const q = searchText.toLowerCase();
    return h.shift.toLowerCase().includes(q) || h.from.toLowerCase().includes(q) || h.to.toLowerCase().includes(q) || h.issues.toLowerCase().includes(q);
  }) : handovers;
  const kpis = [
    { label: "Today's Handovers", value: '3', icon: ArrowRightLeft, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending Tasks', value: '8', icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Open Issues', value: '2', icon: AlertCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Items Escalated', value: '1', icon: AlertTriangle, color: 'bg-violet-50 text-violet-600' },
  ];
  const shiftColor = (s: string) => s === 'Morning' ? 'text-amber-600 bg-amber-50 border-amber-200' : s === 'Afternoon' ? 'text-sky-600 bg-sky-50 border-sky-200' : 'text-indigo-600 bg-indigo-50 border-indigo-200';
  const handleCreate = () => { setSaving(true); setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ shift: 'Morning', fromOperator: '', toOperator: '', tasksCompleted: '', pendingItems: '', issues: '', escalations: '' }); toast.success('Handover recorded successfully'); }, 800); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Shift Handover</h1><p className="text-muted-foreground mt-1">Manage shift-to-shift handover notes, pending tasks, and critical information</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Handover</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search handovers..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" /></div>
      </div>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Shift</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead>From / To</TableHead><TableHead className="hidden lg:table-cell">Tasks Completed</TableHead><TableHead className="hidden lg:table-cell">Pending</TableHead><TableHead className="hidden md:table-cell">Issues</TableHead><TableHead className="hidden sm:table-cell">Escalations</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(h => (
            <TableRow key={h.id} className="hover:bg-muted/30">
              <TableCell><Badge variant="outline" className={shiftColor(h.shift)}>{h.shift}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(h.date)}</TableCell>
              <TableCell className="text-sm"><span className="font-medium">{h.from}</span><span className="text-muted-foreground mx-1">→</span><span className="font-medium">{h.to}</span></TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{h.tasksCompleted}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[180px] truncate">{h.pendingItems}</TableCell>
              <TableCell className="text-xs hidden md:table-cell max-w-[150px] truncate"><span className={h.issues !== '-' ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>{h.issues}</span></TableCell>
              <TableCell className="text-xs hidden sm:table-cell max-w-[150px] truncate"><span className={h.escalations !== '-' ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{h.escalations}</span></TableCell>
              <TableCell><Badge variant="outline" className={h.status === 'completed' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200'}><span className="capitalize">{h.status}</span></Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>New Shift Handover</DialogTitle><DialogDescription>Record handover details for the current shift</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Shift</Label><Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Afternoon">Afternoon</SelectItem><SelectItem value="Night">Night</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From Operator</Label><Input placeholder="Name" value={form.fromOperator} onChange={e => setForm(f => ({ ...f, fromOperator: e.target.value }))} /></div>
              <div><Label>To Operator</Label><Input placeholder="Name" value={form.toOperator} onChange={e => setForm(f => ({ ...f, toOperator: e.target.value }))} /></div>
            </div>
            <div><Label>Tasks Completed</Label><Textarea placeholder="List completed tasks..." rows={2} value={form.tasksCompleted} onChange={e => setForm(f => ({ ...f, tasksCompleted: e.target.value }))} /></div>
            <div><Label>Pending Items</Label><Textarea placeholder="List pending tasks..." rows={2} value={form.pendingItems} onChange={e => setForm(f => ({ ...f, pendingItems: e.target.value }))} /></div>
            <div><Label>Issues</Label><Textarea placeholder="Any issues encountered..." rows={2} value={form.issues} onChange={e => setForm(f => ({ ...f, issues: e.target.value }))} /></div>
            <div><Label>Escalations</Label><Textarea placeholder="Items to escalate..." rows={2} value={form.escalations} onChange={e => setForm(f => ({ ...f, escalations: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.fromOperator || !form.toOperator}>{saving ? 'Saving...' : 'Save Handover'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function OperationsChecklistsPage() {
  const defaultChecklists = [
      { id: '1', name: 'Daily Safety Inspection', description: 'Routine safety walkthrough for all production areas', category: 'safety', itemsCount: 12, lastUsed: '2025-01-14', items: ['Check fire extinguisher accessibility', 'Inspect emergency exit signage', 'Verify PPE availability at stations', 'Check spill containment kits', 'Test emergency stop buttons', 'Inspect guard rails and barriers', 'Check overhead lighting', 'Verify first aid kit contents', 'Inspect floor conditions for hazards', 'Check machine guarding', 'Test alarm systems', 'Document findings'] },
      { id: '2', name: 'Preventive Maintenance - HVAC', description: 'Monthly PM checklist for HVAC systems', category: 'maintenance', itemsCount: 8, lastUsed: '2025-01-10', items: ['Check air filters', 'Inspect belt tension', 'Verify thermostat calibration', 'Check refrigerant levels', 'Clean condenser coils', 'Inspect ductwork connections', 'Test blower motor', 'Record operating temperatures'] },
      { id: '3', name: 'Equipment Startup Procedure', description: 'Standard procedure for starting production equipment', category: 'startup', itemsCount: 10, lastUsed: '2025-01-15', items: ['Verify power supply', 'Check hydraulic oil levels', 'Inspect pneumatic connections', 'Test safety interlocks', 'Verify material supply', 'Run dry cycle test', 'Check sensor calibration', 'Verify conveyor alignment', 'Test emergency stops', 'Begin production run'] },
      { id: '4', name: 'Electrical Panel Inspection', description: 'Quarterly electrical safety and compliance inspection', category: 'inspection', itemsCount: 15, lastUsed: '2024-12-20', items: ['Check panel labeling', 'Verify grounding connections', 'Inspect wire insulation', 'Test circuit breakers', 'Check for moisture intrusion', 'Verify load balancing', 'Inspect terminal connections', 'Test GFCI outlets', 'Check arc flash labels', 'Verify panel clearance', 'Inspect door seals', 'Test emergency lighting', 'Check cable routing', 'Verify lockout/tagout devices', 'Document inspection results'] },
      { id: '5', name: 'Quality Audit Checklist', description: 'Monthly quality management system audit', category: 'audit', itemsCount: 9, lastUsed: '2025-01-08', items: ['Review corrective actions', 'Check document control', 'Verify training records', 'Inspect calibration logs', 'Review customer complaints', 'Check process controls', 'Verify material traceability', 'Review non-conformances', 'Audit management review records'] },
      { id: '6', name: 'Shutdown Procedure', description: 'Standard procedure for safely shutting down production equipment', category: 'shutdown', itemsCount: 7, lastUsed: '2025-01-13', items: ['Complete production run', 'Clean equipment surfaces', 'Remove work-in-progress', 'Drain hydraulic systems', 'Lock out energy sources', 'Secure access points', 'Complete log entries'] },
    ];

  const [checklists, setChecklists] = useState<any[]>(defaultChecklists);
  const [loading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form, setForm] = useState({ name: '', description: '', category: 'safety', items: '' });

  const categories = ['safety', 'maintenance', 'inspection', 'startup', 'shutdown', 'audit', 'calibration'];

  const catColors: Record<string, string> = {
    safety: 'bg-red-50 text-red-700 border-red-200',
    maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
    inspection: 'bg-sky-50 text-sky-700 border-sky-200',
    startup: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    shutdown: 'bg-orange-50 text-orange-700 border-orange-200',
    audit: 'bg-violet-50 text-violet-700 border-violet-200',
    calibration: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  const catIcons: Record<string, React.ElementType> = {
    safety: ShieldAlert,
    maintenance: Wrench,
    inspection: Search,
    startup: Play,
    shutdown: StopCircle,
    audit: FileCheck,
    calibration: Crosshair,
  };

  const filtered = useMemo(() => {
    if (!searchText.trim()) return checklists;
    const q = searchText.toLowerCase();
    return checklists.filter(c => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [checklists, searchText]);

  const handleCreate = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    if (!form.items.trim()) { toast.error('At least one checklist item is required'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const items = form.items.split('\n').map(s => s.trim()).filter(Boolean);
    const newChecklist = {
      id: `cl-${Date.now()}`,
      name: form.name,
      description: form.description,
      category: form.category,
      itemsCount: items.length,
      lastUsed: new Date().toISOString().split('T')[0],
      items,
    };
    setChecklists(prev => [newChecklist, ...prev]);
    toast.success('Checklist created');
    setCreateOpen(false);
    setForm({ name: '', description: '', category: 'safety', items: '' });
    setSaving(false);
  };

  if (loading) return <div className="p-6 lg:p-8"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklists</h1>
          <p className="text-muted-foreground text-sm mt-1">{checklists.length} checklist template(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search checklists..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Checklist</Button>
        </div>
      </div>

      {/* Checklist grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full"><EmptyState icon={CheckSquare} title="No checklists found" description="Create a checklist template or adjust your search." /></div>
        ) : filtered.map(cl => {
          const CatIcon = catIcons[cl.category] || ClipboardList;
          return (
            <Card key={cl.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelected(cl); setViewOpen(true); }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${catColors[cl.category] || 'bg-slate-100'}`}>
                    <CatIcon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className={`text-[10px] capitalize ${catColors[cl.category] || ''}`}>{cl.category}</Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1">{cl.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{cl.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{cl.itemsCount} items</span>
                  <span>Used {cl.lastUsed ? timeAgo(cl.lastUsed) : 'never'}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Checklist</DialogTitle><DialogDescription>Define a new checklist template for routine procedures.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Checklist Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Monthly Safety Walkthrough" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this checklist for..." rows={2} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Checklist Items * (one per line)</Label><Textarea value={form.items} onChange={e => setForm(f => ({ ...f, items: e.target.value }))} placeholder={`Check fire extinguisher\nInspect emergency exits\nVerify PPE availability`} rows={6} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Creating...' : 'Create Checklist'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[11px] capitalize ${catColors[selected?.category || ''] || ''}`}>{selected?.category}</Badge>
              <span className="text-xs text-muted-foreground">{selected?.itemsCount} items</span>
              {selected?.lastUsed && <span className="text-xs text-muted-foreground">· Last used {timeAgo(selected.lastUsed)}</span>}
            </div>
            <Separator />
            <div className="space-y-2">
              {selected?.items?.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/50">
                  <div className="h-4 w-4 rounded border border-muted-foreground/30 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PRODUCTION SUBPAGES
// ============================================================================

function ProductionWorkCentersPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ code: '', name: '', type: 'production_line', department: 'Production', capacity: '', description: '' });
  const wcData = [
    { code: 'WC-001', name: 'Main Assembly Line', type: 'production_line', department: 'Assembly', capacity: 120, utilization: 94, status: 'active', equipmentCount: 12 },
    { code: 'WC-002', name: 'CNC Machining Center', type: 'work_cell', department: 'Production', capacity: 85, utilization: 88, status: 'active', equipmentCount: 8 },
    { code: 'WC-003', name: 'Paint & Coating Bay', type: 'work_cell', department: 'Production', capacity: 60, utilization: 72, status: 'active', equipmentCount: 6 },
    { code: 'WC-004', name: 'Packaging Line 1', type: 'production_line', department: 'Packaging', capacity: 150, utilization: 91, status: 'active', equipmentCount: 10 },
    { code: 'WC-005', name: 'Welding Station', type: 'work_cell', department: 'Assembly', capacity: 45, utilization: 83, status: 'active', equipmentCount: 5 },
    { code: 'WC-006', name: 'Final Inspection Bay', type: 'assembly', department: 'Production', capacity: 80, utilization: 65, status: 'idle', equipmentCount: 4 },
    { code: 'WC-007', name: 'Raw Material Prep', type: 'warehouse', department: 'Warehouse', capacity: 200, utilization: 0, status: 'maintenance', equipmentCount: 7 },
    { code: 'WC-008', name: 'Shipping Dock', type: 'warehouse', department: 'Warehouse', capacity: 300, utilization: 78, status: 'active', equipmentCount: 3 },
  ];
  const statusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', idle: 'bg-amber-50 text-amber-700 border-amber-200', maintenance: 'bg-slate-100 text-slate-600 border-slate-200' };
  const typeColors: Record<string, string> = { production_line: 'bg-sky-50 text-sky-700', work_cell: 'bg-violet-50 text-violet-700', assembly: 'bg-amber-50 text-amber-700', warehouse: 'bg-teal-50 text-teal-700' };
  const filtered = wcData.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalWC = 12;
  const activeWC = 10;
  const idleWC = 1;
  const maintenanceWC = 1;
  const kpis = [
    { label: 'Total Work Centers', value: totalWC, icon: Factory, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Active', value: activeWC, icon: Play, color: 'text-sky-600 bg-sky-50' },
    { label: 'Idle', value: idleWC, icon: Pause, color: 'text-amber-600 bg-amber-50' },
    { label: 'Under Maintenance', value: maintenanceWC, icon: Wrench, color: 'text-slate-600 bg-slate-100' },
  ];
  const handleCreate = () => { if (!form.code || !form.name) { toast.error('Code and name are required'); return; } toast.success('Work center created'); setCreateOpen(false); setForm({ code: '', name: '', type: 'production_line', department: 'Production', capacity: '', description: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Work Centers</h1><p className="text-muted-foreground text-sm mt-1">Define and manage production work centers, lines, and cells</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Work Center</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search work centers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="production_line">Production Line</SelectItem><SelectItem value="work_cell">Work Cell</SelectItem><SelectItem value="assembly">Assembly</SelectItem><SelectItem value="warehouse">Warehouse</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="idle">Idle</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[100px]">Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Capacity (units/hr)</TableHead><TableHead>Utilization</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Equipment</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(r => (
              <TableRow key={r.code}>
                <TableCell className="font-mono text-xs font-medium">{r.code}</TableCell>
                <TableCell className="font-medium text-sm">{r.name}</TableCell>
                <TableCell><Badge variant="secondary" className={`text-[11px] ${typeColors[r.type] || ''}`}>{r.type.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.department}</TableCell>
                <TableCell className="text-right text-sm font-medium">{r.capacity}</TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-20 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${r.utilization > 90 ? 'bg-amber-500' : r.utilization > 70 ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ width: `${r.utilization}%` }} /></div><span className="text-xs font-medium w-8">{r.utilization}%</span></div></TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.toUpperCase()}</Badge></TableCell>
                <TableCell className="text-right text-sm">{r.equipmentCount}</TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Work Center</DialogTitle><DialogDescription>Add a new production work center.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="WC-XXX" /></div>
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Work center name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="production_line">Production Line</SelectItem><SelectItem value="work_cell">Work Cell</SelectItem><SelectItem value="assembly">Assembly</SelectItem><SelectItem value="warehouse">Warehouse</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Department</Label><Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Production">Production</SelectItem><SelectItem value="Packaging">Packaging</SelectItem><SelectItem value="Assembly">Assembly</SelectItem><SelectItem value="Warehouse">Warehouse</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Capacity (units/hr)</Label><Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="0" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProductionResourcePlanningPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ resource: '', type: 'labor', assignedTo: '', allocation: '', shift: 'Day', startDate: '', endDate: '' });
  const resourceData = [
    { id: 'RES-001', name: 'CNC Operator Team A', type: 'labor', assignedTo: 'PO-2025-003', allocation: 95, available: 8, status: 'over-allocated', shift: 'Day' },
    { id: 'RES-002', name: 'CNC Machine #4', type: 'machine', assignedTo: 'PO-2025-003', allocation: 100, available: 40, status: 'allocated', shift: 'Day' },
    { id: 'RES-003', name: 'Steel Sheet 4mm', type: 'material', assignedTo: 'PO-2025-001', allocation: 70, available: 500, status: 'allocated', shift: 'All' },
    { id: 'RES-004', name: 'Welding Robot WR-02', type: 'machine', assignedTo: 'PO-2025-005', allocation: 100, available: 40, status: 'allocated', shift: 'Night' },
    { id: 'RES-005', name: 'Paint Booth PB-1', type: 'machine', assignedTo: 'PO-2025-002', allocation: 85, available: 40, status: 'allocated', shift: 'Day' },
    { id: 'RES-006', name: 'Assembly Technician B', type: 'labor', assignedTo: 'Unassigned', allocation: 50, available: 40, status: 'available', shift: 'Day' },
    { id: 'RES-007', name: 'Aluminum Extrusion', type: 'material', assignedTo: 'PO-2025-006', allocation: 100, available: 200, status: 'over-allocated', shift: 'All' },
    { id: 'RES-008', name: 'Packaging Operator', type: 'labor', assignedTo: 'Unassigned', allocation: 30, available: 40, status: 'under-utilized', shift: 'Night' },
  ];
  const statusColors: Record<string, string> = { allocated: 'bg-emerald-50 text-emerald-700 border-emerald-200', available: 'bg-sky-50 text-sky-700 border-sky-200', 'over-allocated': 'bg-red-50 text-red-700 border-red-200', 'under-utilized': 'bg-amber-50 text-amber-700 border-amber-200' };
  const typeColors: Record<string, string> = { labor: 'bg-violet-50 text-violet-700', machine: 'bg-sky-50 text-sky-700', material: 'bg-amber-50 text-amber-700' };
  const filtered = resourceData.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Resources Planned', value: 28, icon: Layers, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Over-Allocated', value: 4, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Under-Utilized', value: 6, icon: TrendingDown, color: 'text-amber-600 bg-amber-50' },
    { label: 'Utilization', value: '84%', icon: Gauge, color: 'text-sky-600 bg-sky-50' },
  ];
  const handleCreate = () => { if (!form.resource || !form.allocation) { toast.error('Resource and allocation are required'); return; } toast.success('Resource planned'); setCreateOpen(false); setForm({ resource: '', type: 'labor', assignedTo: '', allocation: '', shift: 'Day', startDate: '', endDate: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Resource Planning</h1><p className="text-muted-foreground text-sm mt-1">Plan and allocate resources for production orders</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Plan Resource</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="labor">Labor</SelectItem><SelectItem value="machine">Machine</SelectItem><SelectItem value="material">Material</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[100px]">ID</TableHead><TableHead>Resource</TableHead><TableHead>Type</TableHead><TableHead>Assigned To</TableHead><TableHead>Allocation</TableHead><TableHead>Available</TableHead><TableHead>Status</TableHead><TableHead>Shift</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="font-medium text-sm">{r.name}</TableCell>
                <TableCell><Badge variant="secondary" className={`text-[11px] ${typeColors[r.type] || ''}`}>{r.type}</Badge></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.assignedTo}</TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-20 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${r.allocation > 100 ? 'bg-red-500' : r.allocation > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(r.allocation, 100)}%` }} /></div><span className={`text-xs font-medium w-8 ${r.allocation > 100 ? 'text-red-600' : ''}`}>{r.allocation}%</span></div></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.available} hrs</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="text-sm">{r.shift}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Plan Resource</DialogTitle><DialogDescription>Allocate a resource to a production task.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Resource *</Label><Input value={form.resource} onChange={e => setForm(f => ({ ...f, resource: e.target.value }))} placeholder="Resource name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="labor">Labor</SelectItem><SelectItem value="machine">Machine</SelectItem><SelectItem value="material">Material</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Allocation (%) *</Label><Input type="number" value={form.allocation} onChange={e => setForm(f => ({ ...f, allocation: e.target.value }))} placeholder="0" /></div>
            </div>
            <div className="space-y-2"><Label>Assigned To</Label><Input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Order or task ID" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Shift</Label><Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Day">Day</SelectItem><SelectItem value="Night">Night</SelectItem><SelectItem value="All">All</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Plan Resource</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProductionSchedulingPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ product: '', workCenter: '', startDate: '', endDate: '', priority: 'medium', quantity: '' });
  const scheduleData = [
    { id: 'JOB-001', product: 'Hydraulic Pump HP-300', workCenter: 'Main Assembly Line', startDate: '2025-01-20', endDate: '2025-01-25', progress: 100, status: 'completed', priority: 'high' },
    { id: 'JOB-002', product: 'Control Valve CV-200', workCenter: 'Paint & Coating Bay', startDate: '2025-01-22', endDate: '2025-01-28', progress: 75, status: 'in_progress', priority: 'high' },
    { id: 'JOB-003', product: 'Actuator Arm AA-150', workCenter: 'CNC Machining Center', startDate: '2025-01-21', endDate: '2025-01-27', progress: 60, status: 'in_progress', priority: 'medium' },
    { id: 'JOB-004', product: 'Sensor Housing SH-400', workCenter: 'Final Inspection Bay', startDate: '2025-01-24', endDate: '2025-01-30', progress: 30, status: 'in_progress', priority: 'low' },
    { id: 'JOB-005', product: 'Bearing Assembly BA-100', workCenter: 'Welding Station', startDate: '2025-01-16', endDate: '2025-01-22', progress: 45, status: 'delayed', priority: 'critical' },
    { id: 'JOB-006', product: 'Gearbox GB-250', workCenter: 'CNC Machining Center', startDate: '2025-01-18', endDate: '2025-01-24', progress: 55, status: 'delayed', priority: 'high' },
    { id: 'JOB-007', product: 'Packaging Line 1 Run', workCenter: 'Packaging Line 1', startDate: '2025-01-28', endDate: '2025-02-03', progress: 0, status: 'scheduled', priority: 'medium' },
    { id: 'JOB-008', product: 'Seal Kit SK-50', workCenter: 'Main Assembly Line', startDate: '2025-01-30', endDate: '2025-02-05', progress: 0, status: 'scheduled', priority: 'low' },
    { id: 'JOB-009', product: 'Motor Mount MM-400', workCenter: 'Welding Station', startDate: '2025-01-25', endDate: '2025-01-31', progress: 40, status: 'delayed', priority: 'high' },
    { id: 'JOB-010', product: 'Filter Assembly FA-300', workCenter: 'Paint & Coating Bay', startDate: '2025-02-01', endDate: '2025-02-06', progress: 0, status: 'scheduled', priority: 'medium' },
  ];
  const statusColors: Record<string, string> = { scheduled: 'bg-slate-100 text-slate-600 border-slate-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', delayed: 'bg-red-50 text-red-700 border-red-200' };
  const priorityColors: Record<string, string> = { low: 'bg-sky-50 text-sky-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700' };
  const progressColors: Record<string, string> = { scheduled: 'bg-slate-300', in_progress: 'bg-sky-500', completed: 'bg-emerald-500', delayed: 'bg-red-500' };
  const filtered = scheduleData.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.product.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const getDuration = (s: string, e: string) => { const diff = (new Date(e).getTime() - new Date(s).getTime()) / 86400000; return Math.max(Math.round(diff), 1); };
  const kpis = [
    { label: 'Jobs Scheduled', value: 24, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Progress', value: 8, icon: Play, color: 'text-sky-600 bg-sky-50' },
    { label: 'Delayed', value: 3, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'On Track', value: 21, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = () => { if (!form.product || !form.workCenter) { toast.error('Product and work center are required'); return; } toast.success('Job scheduled'); setCreateOpen(false); setForm({ product: '', workCenter: '', startDate: '', endDate: '', priority: 'medium', quantity: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Production Scheduling</h1><p className="text-muted-foreground text-sm mt-1">Create and manage production schedules and sequencing</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Schedule Job</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="delayed">Delayed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[100px]">Job #</TableHead><TableHead>Product</TableHead><TableHead>Work Center</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead className="text-right">Duration</TableHead><TableHead>Progress</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(r => (
              <TableRow key={r.id} className={r.status === 'delayed' ? 'bg-red-50/30' : ''}>
                <TableCell className="font-mono text-xs font-medium">{r.id}</TableCell>
                <TableCell className="font-medium text-sm">{r.product}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.workCenter}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.startDate)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.endDate)}</TableCell>
                <TableCell className="text-right text-sm">{getDuration(r.startDate, r.endDate)} days</TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-16 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${progressColors[r.status] || 'bg-slate-400'}`} style={{ width: `${r.progress}%` }} /></div><span className="text-xs font-medium w-8">{r.progress}%</span></div></TableCell>
                <TableCell><Badge variant="secondary" className={`text-[11px] ${priorityColors[r.priority] || ''}`}>{r.priority}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Schedule New Job</DialogTitle><DialogDescription>Create a new production schedule entry.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Product *</Label><Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="Product name" /></div>
              <div className="space-y-2"><Label>Work Center *</Label><Input value={form.workCenter} onChange={e => setForm(f => ({ ...f, workCenter: e.target.value }))} placeholder="Work center" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProductionCapacityPage() {
  const [search, setSearch] = useState('');
  const capacityData = [
    { name: 'Main Assembly Line', totalCapacity: 480, planned: 450, actual: 420, utilization: 88, efficiency: 93, trend: 'up' as const, status: 'optimal' },
    { name: 'CNC Machining Center', totalCapacity: 400, planned: 380, actual: 355, utilization: 89, efficiency: 94, trend: 'up' as const, status: 'optimal' },
    { name: 'Paint & Coating Bay', totalCapacity: 320, planned: 310, actual: 305, utilization: 95, efficiency: 98, trend: 'stable' as const, status: 'warning' },
    { name: 'Packaging Line 1', totalCapacity: 500, planned: 400, actual: 310, utilization: 62, efficiency: 78, trend: 'down' as const, status: 'warning' },
    { name: 'Welding Station', totalCapacity: 280, planned: 290, actual: 310, utilization: 111, efficiency: 107, trend: 'up' as const, status: 'critical' },
    { name: 'Final Inspection Bay', totalCapacity: 200, planned: 180, actual: 175, utilization: 88, efficiency: 97, trend: 'stable' as const, status: 'optimal' },
    { name: 'Raw Material Prep', totalCapacity: 350, planned: 0, actual: 0, utilization: 0, efficiency: 0, trend: 'stable' as const, status: 'optimal' },
    { name: 'Shipping Dock', totalCapacity: 400, planned: 362, actual: 348, utilization: 87, efficiency: 96, trend: 'up' as const, status: 'optimal' },
  ];
  const filtered = capacityData.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const overallUtil = 78;
  const availableCapacity = 2400;
  const usedCapacity = 1872;
  const bottleneckLines = 2;
  const statusColors: Record<string, string> = { optimal: 'bg-emerald-50 text-emerald-700 border-emerald-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', critical: 'bg-red-50 text-red-700 border-red-200' };
  const trendIcons: Record<string, React.ReactNode> = { up: <TrendingUp className="h-4 w-4 text-emerald-600" />, down: <TrendingDown className="h-4 w-4 text-red-600" />, stable: <Minus className="h-4 w-4 text-slate-400" /> };
  const kpis = [
    { label: 'Overall Utilization', value: `${overallUtil}%`, icon: Gauge, color: overallUtil > 85 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50' },
    { label: 'Available Capacity', value: `${availableCapacity.toLocaleString()} hrs/wk`, icon: Box, color: 'text-sky-600 bg-sky-50' },
    { label: 'Used', value: `${usedCapacity.toLocaleString()} hrs`, icon: BarChart3, color: 'text-amber-600 bg-amber-50' },
    { label: 'Bottleneck Lines', value: bottleneckLines, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ];
  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Capacity Management</h1><p className="text-muted-foreground text-sm mt-1">Monitor and manage production capacity utilization</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search work centers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Work Center</TableHead><TableHead className="text-right">Total (hrs)</TableHead><TableHead className="text-right">Planned (hrs)</TableHead><TableHead className="text-right">Actual (hrs)</TableHead><TableHead>Utilization</TableHead><TableHead>Efficiency</TableHead><TableHead>Trend</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{r.name}</TableCell>
                <TableCell className="text-right text-sm">{r.totalCapacity.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm">{r.planned.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm">{r.actual.toLocaleString()}</TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-20 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${r.utilization > 100 ? 'bg-red-500' : r.utilization > 90 ? 'bg-amber-500' : r.utilization > 60 ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ width: `${Math.min(r.utilization, 100)}%` }} /></div><span className={`text-sm font-medium ${r.utilization > 100 ? 'text-red-600' : r.utilization > 90 ? 'text-amber-600' : 'text-emerald-600'}`}>{r.utilization}%</span></div></TableCell>
                <TableCell><span className={`text-sm font-medium ${r.efficiency > 95 ? 'text-emerald-600' : r.efficiency > 85 ? 'text-amber-600' : r.efficiency > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{r.efficiency > 0 ? `${r.efficiency}%` : '—'}</span></TableCell>
                <TableCell>{trendIcons[r.trend]}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.toUpperCase()}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
    </div>
  );
}
function ProductionEfficiencyPage() {
  const monthlyData = [
    { month: 'Aug 2024', unitsProduced: 4200, target: 4500, achievement: 93.3, oee: 80.1, downtime: 42, rejectRate: 2.8 },
    { month: 'Sep 2024', unitsProduced: 4650, target: 4500, achievement: 103.3, oee: 83.5, downtime: 38, rejectRate: 2.4 },
    { month: 'Oct 2024', unitsProduced: 4400, target: 4600, achievement: 95.7, oee: 81.2, downtime: 45, rejectRate: 3.1 },
    { month: 'Nov 2024', unitsProduced: 4800, target: 4700, achievement: 102.1, oee: 84.8, downtime: 32, rejectRate: 2.1 },
    { month: 'Dec 2024', unitsProduced: 5100, target: 5000, achievement: 102.0, oee: 86.2, downtime: 28, rejectRate: 1.9 },
    { month: 'Jan 2025', unitsProduced: 4950, target: 4800, achievement: 103.1, oee: 82.4, downtime: 35, rejectRate: 2.5 },
  ];
  const topPerformers = [
    { name: 'Inspection Bay', oee: 93.8 },
    { name: 'Packaging Line 1', oee: 91.2 },
    { name: 'Main Assembly Line', oee: 87.3 },
    { name: 'Welding Station', oee: 85.6 },
    { name: 'CNC Machining Center', oee: 82.1 },
  ];
  const bottomPerformers = [
    { name: 'Paint & Coating Bay', oee: 79.5 },
    { name: 'Raw Material Prep', oee: 65.0 },
    { name: 'Shipping Dock', oee: 61.2 },
  ];
  const kpis = [
    { label: 'OEE', value: '82.4%', icon: Gauge, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Availability', value: '91%', icon: Activity, color: 'text-sky-600 bg-sky-50' },
    { label: 'Performance', value: '93%', icon: Zap, color: 'text-violet-600 bg-violet-50' },
    { label: 'Quality', value: '97.5%', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
  ];
  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Production Efficiency</h1><p className="text-muted-foreground text-sm mt-1">Track production efficiency metrics and improvement opportunities</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="px-5 pt-5 pb-3"><h3 className="text-base font-semibold">Monthly Summary</h3><p className="text-xs text-muted-foreground">Production output and efficiency by month</p></div>
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Units Produced</TableHead><TableHead className="text-right">Target</TableHead><TableHead>Achievement</TableHead><TableHead>OEE</TableHead><TableHead className="text-right">Downtime (hrs)</TableHead><TableHead>Reject Rate</TableHead></TableRow></TableHeader><TableBody>
            {monthlyData.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{r.month}</TableCell>
                <TableCell className="text-right text-sm font-medium">{r.unitsProduced.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{r.target.toLocaleString()}</TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-16 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${r.achievement >= 100 ? 'bg-emerald-500' : r.achievement >= 95 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(r.achievement, 100)}%` }} /></div><span className={`text-sm font-medium ${r.achievement >= 100 ? 'text-emerald-600' : r.achievement >= 95 ? 'text-amber-600' : 'text-red-600'}`}>{r.achievement}%</span></div></TableCell>
                <TableCell><span className={`text-sm font-medium ${r.oee >= 85 ? 'text-emerald-600' : r.oee >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{r.oee}%</span></TableCell>
                <TableCell className="text-right text-sm">{r.downtime}</TableCell>
                <TableCell><span className={`text-sm ${r.rejectRate <= 2.0 ? 'text-emerald-600' : r.rejectRate <= 3.0 ? 'text-amber-600' : 'text-red-600'}`}>{r.rejectRate}%</span></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />Top Performers</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((wc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{wc.name}</span>
                  <div className="flex items-center gap-2"><div className="w-20 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${wc.oee}%` }} /></div><span className="text-sm font-semibold text-emerald-600 w-12 text-right">{wc.oee}%</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" />Needs Attention</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottomPerformers.map((wc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-50 text-red-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{wc.name}</span>
                  <div className="flex items-center gap-2"><div className="w-20 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${wc.oee >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${wc.oee}%` }} /></div><span className={`text-sm font-semibold w-12 text-right ${wc.oee >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{wc.oee}%</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function ProductionBottlenecksPage() {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ workCenter: '', type: 'capacity', severity: 'medium', impact: '', rootCause: '', proposedAction: '' });
  const bottleneckData = [
    { id: 'BN-001', workCenter: 'Welding Station', type: 'capacity', severity: 'high', impact: 180, rootCause: 'Exceeding planned capacity by 11%, causing overtime and quality issues', status: 'active', detectedDate: '2025-01-18' },
    { id: 'BN-002', workCenter: 'Paint & Coating Bay', type: 'maintenance', severity: 'high', impact: 120, rootCause: 'Ventilation system degradation reducing drying throughput', status: 'active', detectedDate: '2025-01-20' },
    { id: 'BN-003', workCenter: 'Main Assembly Line', type: 'material', severity: 'medium', impact: 85, rootCause: 'Intermittent steel sheet supply delays from vendor', status: 'investigating', detectedDate: '2025-01-15' },
    { id: 'BN-004', workCenter: 'CNC Machining Center', type: 'labor', severity: 'low', impact: 35, rootCause: 'Operator skill gap on new CNC programs', status: 'resolved', detectedDate: '2025-01-10' },
    { id: 'BN-005', workCenter: 'Packaging Line 1', type: 'quality', severity: 'medium', impact: 60, rootCause: 'High reject rate from misaligned label applicator', status: 'investigating', detectedDate: '2025-01-17' },
    { id: 'BN-006', workCenter: 'Final Inspection Bay', type: 'capacity', severity: 'low', impact: 20, rootCause: 'Seasonal demand spike exceeding inspection throughput', status: 'resolved', detectedDate: '2025-01-08' },
    { id: 'BN-007', workCenter: 'Raw Material Prep', type: 'maintenance', severity: 'medium', impact: 75, rootCause: 'Conveyor belt misalignment causing material jams', status: 'resolved', detectedDate: '2025-01-12' },
    { id: 'BN-008', workCenter: 'CNC Machining Center', type: 'quality', severity: 'low', impact: 25, rootCause: 'Tool wear exceeding tolerance on tight-spec parts', status: 'resolved', detectedDate: '2025-01-05' },
  ];
  const sevColors: Record<string, string> = { high: 'bg-red-50 text-red-700 border-red-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', low: 'bg-slate-100 text-slate-600 border-slate-200' };
  const statusColors: Record<string, string> = { active: 'bg-red-50 text-red-700 border-red-200', investigating: 'bg-amber-50 text-amber-700 border-amber-200', resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const typeColors: Record<string, string> = { capacity: 'bg-sky-50 text-sky-700', maintenance: 'bg-violet-50 text-violet-700', material: 'bg-amber-50 text-amber-700', labor: 'bg-teal-50 text-teal-700', quality: 'bg-rose-50 text-rose-700' };
  const filtered = bottleneckData.filter(r => {
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (search && !r.workCenter.toLowerCase().includes(search.toLowerCase()) && !r.rootCause.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const activeCount = bottleneckData.filter(b => b.status === 'active').length;
  const resolvedMonth = 5;
  const avgWait = '23 min';
  const totalImpact = 450;
  const kpis = [
    { label: 'Active Bottlenecks', value: activeCount, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Avg Wait Time', value: avgWait, icon: Timer, color: 'text-amber-600 bg-amber-50' },
    { label: 'Impact', value: `${totalImpact} units`, icon: TrendingDown, color: 'text-sky-600 bg-sky-50' },
    { label: 'Resolved This Month', value: resolvedMonth, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = () => { if (!form.workCenter || !form.rootCause) { toast.error('Work center and root cause are required'); return; } toast.success('Bottleneck reported'); setCreateOpen(false); setForm({ workCenter: '', type: 'capacity', severity: 'medium', impact: '', rootCause: '', proposedAction: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Bottleneck Analysis</h1><p className="text-muted-foreground text-sm mt-1">Identify and analyze production bottlenecks to optimize throughput</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Report Bottleneck</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search bottlenecks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger><SelectContent><SelectItem value="all">All Severity</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[100px]">ID</TableHead><TableHead>Work Center</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead className="text-right">Impact</TableHead><TableHead className="max-w-[250px]">Root Cause</TableHead><TableHead>Status</TableHead><TableHead>Detected</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="font-medium text-sm">{r.workCenter}</TableCell>
                <TableCell><Badge variant="secondary" className={`text-[11px] ${typeColors[r.type] || ''}`}>{r.type}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={sevColors[r.severity] || ''}>{r.severity.toUpperCase()}</Badge></TableCell>
                <TableCell className="text-right text-sm font-medium">{r.impact}</TableCell>
                <TableCell className="text-sm max-w-[250px] truncate">{r.rootCause}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.toUpperCase()}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.detectedDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Report Bottleneck</DialogTitle><DialogDescription>Report a new production bottleneck.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Work Center *</Label><Input value={form.workCenter} onChange={e => setForm(f => ({ ...f, workCenter: e.target.value }))} placeholder="Work center name" /></div>
              <div className="space-y-2"><Label>Impact (units lost)</Label><Input type="number" value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="capacity">Capacity</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="material">Material</SelectItem><SelectItem value="labor">Labor</SelectItem><SelectItem value="quality">Quality</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Root Cause *</Label><Textarea value={form.rootCause} onChange={e => setForm(f => ({ ...f, rootCause: e.target.value }))} placeholder="Describe the root cause..." rows={2} /></div>
            <div className="space-y-2"><Label>Proposed Action</Label><Textarea value={form.proposedAction} onChange={e => setForm(f => ({ ...f, proposedAction: e.target.value }))} placeholder="Suggested resolution..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Report</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProductionOrdersPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ product: '', quantity: '', workCenter: '', priority: 'medium', dueDate: '', notes: '' });
  const [orders, setOrders] = useState([
    { id: 'PO-2025-001', product: 'Hydraulic Pump HP-300', quantity: 120, workCenter: 'Main Assembly', status: 'completed', startDate: '2025-01-10', dueDate: '2025-01-25', progress: 100, priority: 'high' },
    { id: 'PO-2025-002', product: 'Control Valve CV-200', quantity: 85, workCenter: 'CNC Machining', status: 'in_progress', startDate: '2025-01-12', dueDate: '2025-01-28', progress: 72, priority: 'high' },
    { id: 'PO-2025-003', product: 'Actuator Arm AA-150', quantity: 200, workCenter: 'Welding Station', status: 'in_progress', startDate: '2025-01-14', dueDate: '2025-01-30', progress: 55, priority: 'medium' },
    { id: 'PO-2025-004', product: 'Sensor Housing SH-400', quantity: 500, workCenter: 'Paint & Coating', status: 'in_progress', startDate: '2025-01-15', dueDate: '2025-02-01', progress: 30, priority: 'low' },
    { id: 'PO-2025-005', product: 'Bearing Assembly BA-100', quantity: 300, workCenter: 'Main Assembly', status: 'in_progress', startDate: '2025-01-16', dueDate: '2025-01-27', progress: 45, priority: 'high' },
    { id: 'PO-2025-006', product: 'Gearbox GB-250', quantity: 60, workCenter: 'CNC Machining', status: 'in_progress', startDate: '2025-01-18', dueDate: '2025-02-05', progress: 15, priority: 'medium' },
    { id: 'PO-2025-007', product: 'Seal Kit SK-50', quantity: 1000, workCenter: 'Packaging L1', status: 'completed', startDate: '2025-01-05', dueDate: '2025-01-15', progress: 100, priority: 'low' },
    { id: 'PO-2025-008', product: 'Filter Assembly FA-300', quantity: 150, workCenter: 'Main Assembly', status: 'planned', startDate: '2025-01-22', dueDate: '2025-02-06', progress: 0, priority: 'medium' },
    { id: 'PO-2025-009', product: 'Piston Set PS-200', quantity: 250, workCenter: 'CNC Machining', status: 'completed', startDate: '2025-01-02', dueDate: '2025-01-12', progress: 100, priority: 'high' },
    { id: 'PO-2025-010', product: 'Coupling Assembly CA-100', quantity: 400, workCenter: 'Welding Station', status: 'cancelled', startDate: '2025-01-08', dueDate: '2025-01-20', progress: 0, priority: 'low' },
  ]);
  const statusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600 border-slate-200', planned: 'bg-sky-50 text-sky-700 border-sky-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', cancelled: 'bg-gray-100 text-gray-500 border-gray-200' };
  const progressColors: Record<string, string> = { draft: 'bg-slate-300', planned: 'bg-sky-400', in_progress: 'bg-amber-500', completed: 'bg-emerald-500', cancelled: 'bg-gray-300' };
  const priorityColors: Record<string, string> = { low: 'bg-sky-50 text-sky-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700' };
  const filtered = orders.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.product.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total Orders', value: 42, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Progress', value: 12, icon: Play, color: 'text-sky-600 bg-sky-50' },
    { label: 'Completed', value: 26, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Cancelled', value: 4, icon: XCircle, color: 'text-slate-600 bg-slate-100' },
  ];
  const handleCreate = () => { if (!form.product || !form.quantity) { toast.error('Product and quantity are required'); return; } toast.success('Production order created'); setCreateOpen(false); setForm({ product: '', quantity: '', workCenter: '', priority: 'medium', dueDate: '', notes: '' }); };
  const handleDelete = (id: string) => { setOrders(prev => prev.filter(o => o.id !== id)); toast.success('Order deleted'); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Production Orders</h1><p className="text-muted-foreground text-sm mt-1">Create and manage production orders from planning through completion</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Order</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[120px]">Order #</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Work Center</TableHead><TableHead>Status</TableHead><TableHead>Start Date</TableHead><TableHead>Due Date</TableHead><TableHead>Progress</TableHead><TableHead>Priority</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">{r.id}</TableCell>
                <TableCell className="font-medium text-sm">{r.product}</TableCell>
                <TableCell className="text-right text-sm">{r.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.workCenter}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.startDate)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-16 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${progressColors[r.status] || 'bg-slate-400'}`} style={{ width: `${r.progress}%` }} /></div><span className="text-xs font-medium w-8">{r.progress}%</span></div></TableCell>
                <TableCell><Badge variant="secondary" className={`text-[11px] ${priorityColors[r.priority] || ''}`}>{r.priority}</Badge></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Production Order</DialogTitle><DialogDescription>Create a new production order.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Product *</Label><Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="Product name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" /></div>
              <div className="space-y-2"><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Work Center</Label><Input value={form.workCenter} onChange={e => setForm(f => ({ ...f, workCenter: e.target.value }))} placeholder="Work center name" /></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Order</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProductionBatchesPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ product: '', order: '', quantity: '', startDate: '', notes: '' });
  const [batches, setBatches] = useState([
    { id: 'BATCH-001', product: 'Hydraulic Pump HP-300', order: 'PO-2025-001', quantity: 120, startDate: '2025-01-10', endDate: '2025-01-24', status: 'completed', qualityStatus: 'passed', yieldPct: 98.3 },
    { id: 'BATCH-002', product: 'Control Valve CV-200', order: 'PO-2025-002', quantity: 85, startDate: '2025-01-12', endDate: '', status: 'in_progress', qualityStatus: 'pending', yieldPct: 0 },
    { id: 'BATCH-003', product: 'Actuator Arm AA-150', order: 'PO-2025-003', quantity: 200, startDate: '2025-01-14', endDate: '', status: 'in_progress', qualityStatus: 'pending', yieldPct: 0 },
    { id: 'BATCH-004', product: 'Sensor Housing SH-400', order: 'PO-2025-004', quantity: 500, startDate: '2025-01-15', endDate: '', status: 'in_progress', qualityStatus: 'pending', yieldPct: 0 },
    { id: 'BATCH-005', product: 'Bearing Assembly BA-100', order: 'PO-2025-005', quantity: 300, startDate: '2025-01-16', endDate: '', status: 'on_hold', qualityStatus: 'pending', yieldPct: 95.2 },
    { id: 'BATCH-006', product: 'Coupling Assembly CA-100', order: 'PO-2025-010', quantity: 400, startDate: '2025-01-08', endDate: '2025-01-19', status: 'completed', qualityStatus: 'passed', yieldPct: 99.1 },
    { id: 'BATCH-007', product: 'Gearbox GB-250', order: 'PO-2025-006', quantity: 60, startDate: '2025-01-18', endDate: '', status: 'planned', qualityStatus: 'pending', yieldPct: 0 },
    { id: 'BATCH-008', product: 'Piston Set PS-200', order: 'PO-2025-009', quantity: 250, startDate: '2025-01-03', endDate: '2025-01-11', status: 'completed', qualityStatus: 'failed', yieldPct: 88.5 },
  ]);
  const statusColors: Record<string, string> = { planned: 'bg-slate-100 text-slate-600 border-slate-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', on_hold: 'bg-amber-50 text-amber-700 border-amber-200', quarantine: 'bg-red-50 text-red-700 border-red-200' };
  const qualityColors: Record<string, string> = { pending: 'bg-slate-100 text-slate-600 border-slate-200', passed: 'bg-emerald-50 text-emerald-700 border-emerald-200', failed: 'bg-red-50 text-red-700 border-red-200' };
  const filtered = batches.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.product.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total Batches', value: 58, icon: Package, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Progress', value: 8, icon: Play, color: 'text-sky-600 bg-sky-50' },
    { label: 'Completed', value: 45, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'On Hold', value: 5, icon: Pause, color: 'text-amber-600 bg-amber-50' },
  ];
  const handleCreate = () => { if (!form.product || !form.quantity) { toast.error('Product and quantity are required'); return; } toast.success('Batch created'); setCreateOpen(false); setForm({ product: '', order: '', quantity: '', startDate: '', notes: '' }); };
  const handleDelete = (id: string) => { setBatches(prev => prev.filter(b => b.id !== id)); toast.success('Batch deleted'); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Batch Management</h1><p className="text-muted-foreground text-sm mt-1">Track production batches, lot numbers, and traceability</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Batch</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search batches..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="quarantine">Quarantine</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[110px]">Batch #</TableHead><TableHead>Product</TableHead><TableHead>Order #</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead>Quality</TableHead><TableHead>Yield</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">{r.id}</TableCell>
                <TableCell className="font-medium text-sm">{r.product}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.order}</TableCell>
                <TableCell className="text-right text-sm">{r.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.startDate)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.endDate ? formatDate(r.endDate) : '—'}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={qualityColors[r.qualityStatus] || ''}>{r.qualityStatus.toUpperCase()}</Badge></TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-14 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${r.yieldPct >= 97 ? 'bg-emerald-500' : r.yieldPct > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${r.yieldPct > 0 ? Math.min(r.yieldPct, 100) : 0}%` }} /></div><span className={`text-xs font-medium w-10 ${r.yieldPct >= 97 ? 'text-emerald-600' : r.yieldPct > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{r.yieldPct > 0 ? `${r.yieldPct}%` : '—'}</span></div></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Batch</DialogTitle><DialogDescription>Start a new production batch.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Product *</Label><Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="Product name" /></div>
              <div className="space-y-2"><Label>Order #</Label><Input value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} placeholder="PO-2025-XXX" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" /></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Batch notes..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Batch</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



// ============================================================================
// QUALITY SUBPAGES
// ============================================================================

function QualityInspectionsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', type: 'incoming', product: '', inspector: '', date: '' });
  const inspStatusColors: Record<string, string> = { passed: 'bg-emerald-50 text-emerald-700 border-emerald-200', failed: 'bg-red-50 text-red-700 border-red-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', scheduled: 'bg-sky-50 text-sky-700 border-sky-200' };
  const inspData = [
    { id: 'QI-001', title: 'Incoming Raw Material Inspection', type: 'incoming', status: 'passed', inspector: 'Sarah Chen', date: '2025-01-15' },
    { id: 'QI-002', title: 'Weld Quality Check – Line A', type: 'in_process', status: 'in_progress', inspector: 'Mike Torres', date: '2025-01-18' },
    { id: 'QI-003', title: 'Final Product Assembly Audit', type: 'final', status: 'failed', inspector: 'James Park', date: '2025-01-19' },
    { id: 'QI-004', title: 'ISO 9001 Compliance Audit', type: 'audit', status: 'passed', inspector: 'Lisa Wang', date: '2025-01-20' },
    { id: 'QI-005', title: 'Coating Thickness Verification', type: 'in_process', status: 'scheduled', inspector: 'David Kim', date: '2025-01-22' },
    { id: 'QI-006', title: 'Supplier Parts Evaluation', type: 'incoming', status: 'passed', inspector: 'Sarah Chen', date: '2025-01-21' },
    { id: 'QI-007', title: 'Dimensional Inspection – CNC Batch', type: 'final', status: 'pending', inspector: 'Mike Torres', date: '2025-01-23' },
    { id: 'QI-008', title: 'Internal Process Audit – Paint', type: 'audit', status: 'pending', inspector: 'Lisa Wang', date: '2025-01-24' },
  ];
  const filtered = inspData.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total Inspections', value: 48, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Passed', value: 35, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Failed', value: 8, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Pending', value: 5, icon: Clock, color: 'text-sky-600 bg-sky-50' },
  ];
  const handleCreate = () => { if (!form.title) { toast.error('Title is required'); return; } toast.success('Inspection created'); setCreateOpen(false); setForm({ title: '', description: '', type: 'incoming', product: '', inspector: '', date: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Inspections</h1><p className="text-muted-foreground text-sm mt-1">Schedule, conduct, and track quality inspections</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Inspection</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inspections..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="passed">Passed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[100px]">ID</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Inspector</TableHead><TableHead className="w-[120px]">Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={inspStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm">{r.inspector}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.date)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Inspection</DialogTitle><DialogDescription>Schedule a new quality inspection.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Inspection title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Inspection details..." rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In Process</SelectItem><SelectItem value="final">Final</SelectItem><SelectItem value="audit">Audit</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Product</Label><Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="Product name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Inspector</Label><Input value={form.inspector} onChange={e => setForm(f => ({ ...f, inspector: e.target.value }))} placeholder="Assigned inspector" /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Inspection</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QualityNcrPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', severity: 'minor', source: 'inspection', product: '', quantity: '' });
  const sevColors: Record<string, string> = { critical: 'bg-red-50 text-red-700 border-red-200', major: 'bg-orange-50 text-orange-700 border-orange-200', minor: 'bg-amber-50 text-amber-700 border-amber-200' };
  const ncrStatusColors: Record<string, string> = { open: 'bg-amber-50 text-amber-700 border-amber-200', investigating: 'bg-sky-50 text-sky-700 border-sky-200', closed: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const ncrData = [
    { id: 'NCR-001', title: 'Dimensional Deviation on Shaft Assembly', severity: 'major', status: 'open', source: 'inspection', disposition: 'rework', date: '2025-01-10' },
    { id: 'NCR-002', title: 'Surface Finish Below Spec – Panel B', severity: 'critical', status: 'investigating', source: 'customer', disposition: 'scrap', date: '2025-01-12' },
    { id: 'NCR-003', title: 'Incorrect Material Certification', severity: 'major', status: 'open', source: 'audit', disposition: 'return', date: '2025-01-14' },
    { id: 'NCR-004', title: 'Weld Porosity on Pressure Vessel', severity: 'critical', status: 'investigating', source: 'inspection', disposition: 'rework', date: '2025-01-15' },
    { id: 'NCR-005', title: 'Packaging Damage During Transit', severity: 'minor', status: 'closed', source: 'customer', disposition: 'use_as_is', date: '2025-01-08' },
    { id: 'NCR-006', title: 'Paint Adhesion Failure – Batch 44', severity: 'minor', status: 'open', source: 'production', disposition: 'rework', date: '2025-01-16' },
    { id: 'NCR-007', title: 'Missing Gasket in Valve Assembly', severity: 'major', status: 'closed', source: 'inspection', disposition: 'rework', date: '2025-01-05' },
    { id: 'NCR-008', title: 'Tolerance Exceed – CNC Operation', severity: 'minor', status: 'closed', source: 'production', disposition: 'use_as_is', date: '2025-01-03' },
  ];
  const filtered = ncrData.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total NCRs', value: 23, icon: FileCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Open', value: 9, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
    { label: 'Under Investigation', value: 7, icon: Search, color: 'text-sky-600 bg-sky-50' },
    { label: 'Closed', value: 7, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = () => { if (!form.title) { toast.error('Title is required'); return; } toast.success('NCR created'); setCreateOpen(false); setForm({ title: '', description: '', severity: 'minor', source: 'inspection', product: '', quantity: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Non-Conformance Reports</h1><p className="text-muted-foreground text-sm mt-1">Manage non-conformances, investigations, and dispositions</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New NCR</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search NCRs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[100px]">NCR #</TableHead><TableHead>Title</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead>Disposition</TableHead><TableHead className="w-[110px]">Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="outline" className={sevColors[r.severity] || ''}>{r.severity.toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={ncrStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.source}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.disposition.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.date)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New NCR</DialogTitle><DialogDescription>Report a new non-conformance.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="NCR title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the non-conformance..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minor">Minor</SelectItem><SelectItem value="major">Major</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Source</Label><Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="customer">Customer</SelectItem><SelectItem value="audit">Audit</SelectItem><SelectItem value="production">Production</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Product</Label><Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="Product name" /></div>
              <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create NCR</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QualityAuditsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', type: 'internal', scope: '', auditor: '', scheduledDate: '', department: 'Quality' });
  const auditStatusColors: Record<string, string> = { scheduled: 'bg-sky-50 text-sky-700 border-sky-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const auditData = [
    { id: 'QA-001', title: 'ISO 9001:2015 Internal Audit – Q1', type: 'internal', status: 'completed', auditor: 'Lisa Wang', scope: 'Quality Management System', date: '2025-01-05' },
    { id: 'QA-002', title: 'Supplier Qualification Audit – Acme Corp', type: 'supplier', status: 'in_progress', auditor: 'James Park', scope: 'Supplier quality processes', date: '2025-01-12' },
    { id: 'QA-003', title: 'Process Audit – Welding Line', type: 'process', status: 'scheduled', auditor: 'Sarah Chen', scope: 'WPS compliance and weld quality', date: '2025-01-25' },
    { id: 'QA-004', title: 'Customer Audit – Automotive OEM', type: 'external', status: 'scheduled', auditor: 'Mike Torres', scope: 'IATF 16949 requirements', date: '2025-01-28' },
    { id: 'QA-005', title: 'Internal Audit – Calibration Lab', type: 'internal', status: 'completed', auditor: 'Lisa Wang', scope: 'Calibration procedures & records', date: '2025-01-08' },
    { id: 'QA-006', title: 'Layered Process Audit – Assembly', type: 'process', status: 'in_progress', auditor: 'David Kim', scope: 'Assembly line compliance', date: '2025-01-18' },
    { id: 'QA-007', title: 'Supplier Audit – Fastenal Inc', type: 'supplier', status: 'completed', auditor: 'James Park', scope: 'Fastener supply chain quality', date: '2025-01-02' },
    { id: 'QA-008', title: 'External Audit – Regulatory Body', type: 'external', status: 'completed', auditor: 'Sarah Chen', scope: 'CE marking compliance', date: '2025-01-10' },
  ];
  const filtered = auditData.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total Audits', value: 12, icon: ShieldAlert, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Scheduled', value: 4, icon: Calendar, color: 'text-sky-600 bg-sky-50' },
    { label: 'In Progress', value: 3, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Completed', value: 5, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = () => { if (!form.title) { toast.error('Title is required'); return; } toast.success('Audit scheduled'); setCreateOpen(false); setForm({ title: '', type: 'internal', scope: '', auditor: '', scheduledDate: '', department: 'Quality' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Audits</h1><p className="text-muted-foreground text-sm mt-1">Plan and execute internal, external, and supplier audits</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Audit</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search audits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[100px]">Audit #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Auditor</TableHead><TableHead>Scope</TableHead><TableHead className="w-[110px]">Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={auditStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm">{r.auditor}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.scope}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.date)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Schedule Audit</DialogTitle><DialogDescription>Plan a new quality audit.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Audit title" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="external">External</SelectItem><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="process">Process</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Department</Label><Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Quality">Quality</SelectItem><SelectItem value="Production">Production</SelectItem><SelectItem value="Maintenance">Maintenance</SelectItem><SelectItem value="Operations">Operations</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Scope</Label><Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="Audit scope and objectives..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Auditor</Label><Input value={form.auditor} onChange={e => setForm(f => ({ ...f, auditor: e.target.value }))} placeholder="Lead auditor" /></div>
              <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Schedule Audit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QualityControlPlansPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ name: '', product: '', description: '', revision: '', department: 'Quality', inspectionPoints: '' });
  const cpStatusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', draft: 'bg-slate-100 text-slate-600 border-slate-200', under_review: 'bg-amber-50 text-amber-700 border-amber-200', archived: 'bg-slate-100 text-slate-500 border-slate-200' };
  const cpData = [
    { id: 'CP-001', name: 'CNC Machining Control Plan', product: 'Shaft Assembly A-200', revision: '3.2', status: 'active', points: 24, updated: '2025-01-15' },
    { id: 'CP-002', name: 'Welding Process Control Plan', product: 'Pressure Vessel PV-100', revision: '2.1', status: 'active', points: 18, updated: '2025-01-12' },
    { id: 'CP-003', name: 'Paint & Coating Control Plan', product: 'Panel B Series', revision: '1.4', status: 'under_review', points: 15, updated: '2025-01-18' },
    { id: 'CP-004', name: 'Assembly Line QC Plan', product: 'Final Assembly FA-300', revision: '4.0', status: 'active', points: 32, updated: '2025-01-20' },
    { id: 'CP-005', name: 'Incoming Material QC Plan', product: 'Raw Steel & Aluminum', revision: '2.5', status: 'active', points: 12, updated: '2025-01-10' },
    { id: 'CP-006', name: 'Heat Treatment Control Plan', product: 'Gear Box GB-50', revision: '1.0', status: 'draft', points: 10, updated: '2025-01-22' },
    { id: 'CP-007', name: 'Calibration Control Plan', product: 'Measurement Equipment', revision: '3.1', status: 'active', points: 20, updated: '2025-01-08' },
    { id: 'CP-008', name: 'Packaging & Shipping QC Plan', product: 'All Finished Goods', revision: '2.0', status: 'archived', points: 8, updated: '2024-12-15' },
  ];
  const filtered = cpData.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total Plans', value: 15, icon: ScrollText, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Active', value: 11, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Under Review', value: 2, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
    { label: 'Archived', value: 2, icon: Archive, color: 'text-slate-600 bg-slate-100' },
  ];
  const handleCreate = () => { if (!form.name) { toast.error('Plan name is required'); return; } toast.success('Control plan created'); setCreateOpen(false); setForm({ name: '', product: '', description: '', revision: '', department: 'Quality', inspectionPoints: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Control Plans</h1><p className="text-muted-foreground text-sm mt-1">Define and manage control plans for products and processes</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Plan</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search control plans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="under_review">Under Review</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[100px]">Plan #</TableHead><TableHead>Name</TableHead><TableHead>Product / Process</TableHead><TableHead>Rev</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Inspection Points</TableHead><TableHead className="w-[110px]">Updated</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell className="font-medium text-sm">{r.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.product}</TableCell>
              <TableCell className="font-mono text-xs">{r.revision}</TableCell>
              <TableCell><Badge variant="outline" className={cpStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-center"><Badge variant="secondary" className="text-[11px]">{r.points}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.updated)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Control Plan</DialogTitle><DialogDescription>Create a quality control plan.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Plan Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Control plan name" /></div>
            <div className="space-y-2"><Label>Product / Process</Label><Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="Associated product or process" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Plan description..." rows={3} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Revision</Label><Input value={form.revision} onChange={e => setForm(f => ({ ...f, revision: e.target.value }))} placeholder="1.0" /></div>
              <div className="space-y-2"><Label>Department</Label><Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Quality">Quality</SelectItem><SelectItem value="Production">Production</SelectItem><SelectItem value="Maintenance">Maintenance</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Inspection Points</Label><Input type="number" value={form.inspectionPoints} onChange={e => setForm(f => ({ ...f, inspectionPoints: e.target.value }))} placeholder="0" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create Plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QualitySpcPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ process: '', characteristic: '', usl: '', lsl: '', target: '' });
  const spcStatusColors: Record<string, string> = { in_control: 'bg-emerald-50 text-emerald-700 border-emerald-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', out_of_control: 'bg-red-50 text-red-700 border-red-200' };
  const cpkColor = (v: number) => v >= 1.33 ? 'text-emerald-600 font-semibold' : v >= 1.0 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold';
  const spcData = [
    { process: 'CNC Turning', characteristic: 'Outer Diameter (mm)', usl: 50.05, lsl: 49.95, target: 50.00, mean: 50.01, cp: 1.67, cpk: 1.52, status: 'in_control' },
    { process: 'Welding – MIG', characteristic: 'Weld Strength (MPa)', usl: 450, lsl: 380, target: 415, mean: 418.5, cp: 1.42, cpk: 1.28, status: 'warning' },
    { process: 'Paint Thickness', characteristic: 'Dry Film (μm)', usl: 85, lsl: 65, target: 75, mean: 74.2, cp: 1.85, cpk: 1.74, status: 'in_control' },
    { process: 'Heat Treatment', characteristic: 'Hardness (HRC)', usl: 62, lsl: 56, target: 59, mean: 58.8, cp: 1.38, cpk: 1.31, status: 'in_control' },
    { process: 'Assembly Torque', characteristic: 'Torque (Nm)', usl: 55, lsl: 45, target: 50, mean: 52.1, cp: 0.92, cpk: 0.74, status: 'out_of_control' },
    { process: 'Injection Molding', characteristic: 'Weight (g)', usl: 105, lsl: 95, target: 100, mean: 100.3, cp: 1.56, cpk: 1.48, status: 'in_control' },
    { process: 'Surface Grinding', characteristic: 'Roughness (Ra μm)', usl: 1.6, lsl: 0.4, target: 1.0, mean: 1.35, cp: 0.85, cpk: 0.68, status: 'out_of_control' },
    { process: 'Brazing', characteristic: 'Joint Strength (kN)', usl: 12.0, lsl: 8.0, target: 10.0, mean: 10.1, cp: 1.33, cpk: 1.30, status: 'in_control' },
  ];
  const filtered = spcData.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.process.toLowerCase().includes(search.toLowerCase()) && !r.characteristic.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Processes Monitored', value: 8, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Control', value: 6, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Out of Control', value: 2, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Cp/Cpk ≥ 1.33', value: 5, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = () => { if (!form.process) { toast.error('Process name is required'); return; } toast.success('SPC process added'); setCreateOpen(false); setForm({ process: '', characteristic: '', usl: '', lsl: '', target: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Statistical Process Control</h1><p className="text-muted-foreground text-sm mt-1">Monitor process stability with SPC charts and capability indices</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />Add Process</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search processes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="in_control">In Control</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="out_of_control">Out of Control</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Process</TableHead><TableHead>Characteristic</TableHead><TableHead className="text-right">USL</TableHead><TableHead className="text-right">LSL</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Current Mean</TableHead><TableHead className="text-right">Cp</TableHead><TableHead className="text-right">Cpk</TableHead><TableHead>Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(r => (
              <TableRow key={r.process}>
                <TableCell className="font-medium text-sm">{r.process}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.characteristic}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.usl}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.lsl}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.target}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.mean}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${cpkColor(r.cp)}`}>{r.cp.toFixed(2)}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${cpkColor(r.cpk)}`}>{r.cpk.toFixed(2)}</TableCell>
                <TableCell><Badge variant="outline" className={spcStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Chart</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add SPC Process</DialogTitle><DialogDescription>Define a new process for statistical monitoring.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Process *</Label><Input value={form.process} onChange={e => setForm(f => ({ ...f, process: e.target.value }))} placeholder="e.g., CNC Turning" /></div>
              <div className="space-y-2"><Label>Characteristic *</Label><Input value={form.characteristic} onChange={e => setForm(f => ({ ...f, characteristic: e.target.value }))} placeholder="e.g., Outer Diameter (mm)" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>USL</Label><Input type="number" step="any" value={form.usl} onChange={e => setForm(f => ({ ...f, usl: e.target.value }))} placeholder="Upper limit" /></div>
              <div className="space-y-2"><Label>LSL</Label><Input type="number" step="any" value={form.lsl} onChange={e => setForm(f => ({ ...f, lsl: e.target.value }))} placeholder="Lower limit" /></div>
              <div className="space-y-2"><Label>Target</Label><Input type="number" step="any" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="Target value" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Process</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QualityCapaPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', type: 'corrective', source: 'ncr', priority: 'medium', owner: '', dueDate: '' });
  const capaPriorityColors: Record<string, string> = { critical: 'bg-red-50 text-red-700 border-red-200', high: 'bg-orange-50 text-orange-700 border-orange-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', low: 'bg-slate-100 text-slate-600 border-slate-200' };
  const capaStatusColors: Record<string, string> = { open: 'bg-amber-50 text-amber-700 border-amber-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', implemented: 'bg-violet-50 text-violet-700 border-violet-200', verified: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: 'bg-slate-100 text-slate-500 border-slate-200' };
  const capaData = [
    { id: 'CAPA-001', title: 'Reduce Weld Defect Rate Below 2%', type: 'corrective', source: 'ncr', priority: 'high', status: 'in_progress', due: '2025-02-15', owner: 'Mike Torres' },
    { id: 'CAPA-002', title: 'Implement Supplier Scorecard System', type: 'preventive', source: 'audit', priority: 'medium', status: 'open', due: '2025-03-01', owner: 'Lisa Wang' },
    { id: 'CAPA-003', title: 'Correct Paint Adhesion Failure – Batch 44', type: 'corrective', source: 'ncr', priority: 'critical', status: 'in_progress', due: '2025-01-30', owner: 'David Kim' },
    { id: 'CAPA-004', title: 'Standardize Torque Procedures', type: 'corrective', source: 'complaint', priority: 'high', status: 'verified', due: '2025-01-20', owner: 'Sarah Chen' },
    { id: 'CAPA-005', title: 'Prevent Calibration Drift', type: 'preventive', source: 'audit', priority: 'medium', status: 'open', due: '2025-02-28', owner: 'James Park' },
    { id: 'CAPA-006', title: 'Address Customer Surface Complaint', type: 'corrective', source: 'customer', priority: 'critical', status: 'in_progress', due: '2025-01-25', owner: 'Mike Torres' },
    { id: 'CAPA-007', title: 'Improve Incoming Inspection Sampling', type: 'preventive', source: 'ncr', priority: 'low', status: 'closed', due: '2025-01-10', owner: 'Lisa Wang' },
    { id: 'CAPA-008', title: 'Fix CNC Tool Wear Monitoring', type: 'corrective', source: 'ncr', priority: 'medium', status: 'verified', due: '2025-01-18', owner: 'David Kim' },
    { id: 'CAPA-009', title: 'Enhance Operator Training Program', type: 'preventive', source: 'audit', priority: 'medium', status: 'open', due: '2025-03-15', owner: 'Sarah Chen' },
    { id: 'CAPA-010', title: 'Resolve Fastener Supplier Non-Conformance', type: 'corrective', source: 'ncr', priority: 'high', status: 'implemented', due: '2025-01-22', owner: 'James Park' },
  ];
  const filtered = capaData.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total CAPAs', value: 19, icon: HardHat, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Open', value: 8, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
    { label: 'In Progress', value: 6, icon: Clock, color: 'text-sky-600 bg-sky-50' },
    { label: 'Verified', value: 5, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = () => { if (!form.title) { toast.error('Title is required'); return; } toast.success('CAPA created'); setCreateOpen(false); setForm({ title: '', description: '', type: 'corrective', source: 'ncr', priority: 'medium', owner: '', dueDate: '' }); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Corrective & Preventive Actions</h1><p className="text-muted-foreground text-sm mt-1">Manage CAPAs for continuous quality improvement</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New CAPA</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search CAPAs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[110px]">CAPA #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="w-[110px]">Due Date</TableHead><TableHead>Owner</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="font-medium text-sm max-w-[250px] truncate">{r.title}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[11px]">{r.type}</Badge></TableCell>
                <TableCell><Badge variant="secondary" className="text-[11px]">{r.source}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={capaPriorityColors[r.priority] || ''}>{r.priority.toUpperCase()}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={capaStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.due)}</TableCell>
                <TableCell className="text-sm">{r.owner}</TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New CAPA</DialogTitle><DialogDescription>Create a corrective or preventive action.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="CAPA title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue and planned actions..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="preventive">Preventive</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Source</Label><Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ncr">NCR</SelectItem><SelectItem value="audit">Audit</SelectItem><SelectItem value="customer">Customer</SelectItem><SelectItem value="complaint">Complaint</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Owner</Label><Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Responsible person" /></div>
            </div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create CAPA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SAFETY SUBPAGES
// ============================================================================

function SafetyIncidentsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'near_miss', severity: 'first_aid', location: '', reportedBy: '', date: '', witnesses: '' });

  const severityBadge: Record<string, string> = {
    near_miss: 'bg-blue-50 text-blue-700 border-blue-200',
    first_aid: 'bg-amber-50 text-amber-700 border-amber-200',
    recordable: 'bg-orange-50 text-orange-700 border-orange-200',
    serious: 'bg-red-50 text-red-700 border-red-200',
    fatal: 'bg-red-100 text-red-900 border-red-300',
  };
  const statusColors: Record<string, string> = {
    reported: 'bg-sky-50 text-sky-700 border-sky-200',
    investigating: 'bg-amber-50 text-amber-700 border-amber-200',
    corrective: 'bg-violet-50 text-violet-700 border-violet-200',
    closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const typeLabel: Record<string, string> = { near_miss: 'Near Miss', first_aid: 'First Aid', recordable: 'Recordable', serious: 'Serious', fatal: 'Fatal' };

  const incidents = useMemo(() => [
    { id: 'INC-001', title: 'Chemical spill in warehouse B', type: 'serious', severity: 'serious', location: 'Warehouse B', date: '2025-01-18T09:30:00', reportedBy: 'James Carter', status: 'investigating', rootCause: 'Improper container storage' },
    { id: 'INC-002', title: 'Slip and fall near loading dock', type: 'recordable', severity: 'recordable', location: 'Loading Dock', date: '2025-01-17T14:15:00', reportedBy: 'Maria Lopez', status: 'corrective', rootCause: 'Wet floor, no signage' },
    { id: 'INC-003', title: 'Near miss – forklift near pedestrian', type: 'near_miss', severity: 'near_miss', location: 'Zone A', date: '2025-01-16T11:00:00', reportedBy: 'Robert Chen', status: 'reported', rootCause: '' },
    { id: 'INC-004', title: 'Minor cut from sharp edge', type: 'first_aid', severity: 'first_aid', location: 'Workshop 1', date: '2025-01-15T08:45:00', reportedBy: 'Sarah Kim', status: 'closed', rootCause: 'Missing guard on machine' },
    { id: 'INC-005', title: 'Electrical shock from exposed wiring', type: 'recordable', severity: 'serious', location: 'Building A', date: '2025-01-14T16:20:00', reportedBy: 'David Park', status: 'closed', rootCause: 'Damaged cable insulation' },
    { id: 'INC-006', title: 'Minor burn from hot pipe', type: 'first_aid', severity: 'first_aid', location: 'Boiler Room', date: '2025-01-13T10:00:00', reportedBy: 'Lisa Nguyen', status: 'closed', rootCause: 'Missing insulation cover' },
    { id: 'INC-007', title: 'Falling object from scaffolding', type: 'serious', severity: 'recordable', location: 'Warehouse D', date: '2025-01-12T13:30:00', reportedBy: 'Tom Harris', status: 'investigating', rootCause: '' },
    { id: 'INC-008', title: 'Near miss – swinging crane load', type: 'near_miss', severity: 'near_miss', location: 'Crane Bay', date: '2025-01-11T09:15:00', reportedBy: 'Emma Wright', status: 'corrective', rootCause: 'Wind gust, no tagline' },
    { id: 'INC-009', title: 'Noise exposure above limit', type: 'recordable', severity: 'recordable', location: 'Production Floor', date: '2025-01-10T15:45:00', reportedBy: 'Mike Johnson', status: 'closed', rootCause: 'Faulty hearing protection' },
    { id: 'INC-010', title: 'Forklift collision with racking', type: 'near_miss', severity: 'near_miss', location: 'Zone C', date: '2025-01-09T07:30:00', reportedBy: 'Anna White', status: 'reported', rootCause: '' },
    { id: 'INC-011', title: 'Confined space oxygen drop', type: 'serious', severity: 'serious', location: 'Tank Farm', date: '2025-01-08T11:00:00', reportedBy: 'Kevin Brooks', status: 'investigating', rootCause: 'Ventilation failure' },
    { id: 'INC-012', title: 'First aid – eye irritation', type: 'first_aid', severity: 'first_aid', location: 'Lab 2', date: '2025-01-07T14:20:00', reportedBy: 'Rachel Adams', status: 'closed', rootCause: 'Splash from chemical mix' },
  ], []);

  const filtered = useMemo(() => incidents.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  }), [incidents, search, typeFilter, statusFilter]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: typeLabel[name] || name, value, fill: name === 'near_miss' ? '#3b82f6' : name === 'first_aid' ? '#f59e0b' : name === 'recordable' ? '#f97316' : name === 'serious' ? '#ef4444' : '#991b1b' }));
  }, [incidents]);
  const severityConfig = useMemo(() => Object.fromEntries(severityCounts.map((s: any) => [s.name, { label: s.name, color: s.fill }])) as any, [severityCounts]);

  const daysSince = Math.floor((Date.now() - new Date('2025-01-18T09:30:00').getTime()) / 86400000);
  const openCount = incidents.filter(i => i.status === 'reported').length;
  const invCount = incidents.filter(i => i.status === 'investigating').length;
  const closedCount = incidents.filter(i => i.status === 'closed').length;

  const kpis = useMemo(() => [
    { label: 'Total Incidents', value: incidents.length, icon: TriangleAlert, color: 'from-red-500 to-orange-500' },
    { label: 'Open', value: openCount, icon: AlertCircle, color: 'from-sky-500 to-blue-500' },
    { label: 'Under Investigation', value: invCount, icon: Search, color: 'from-amber-500 to-yellow-500' },
    { label: 'Closed', value: closedCount, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Days Since Last Incident', value: daysSince, icon: ShieldCheck, color: 'from-teal-500 to-emerald-500' },
  ], [openCount, invCount, closedCount, daysSince]);

  const handleCreate = () => {
    if (!form.title) { toast.error('Title is required'); return; }
    toast.success(`Incident "${form.title}" reported successfully`);
    setDialogOpen(false);
    setForm({ title: '', description: '', type: 'near_miss', severity: 'first_aid', location: '', reportedBy: '', date: '', witnesses: '' });
  };

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Incidents</h1>
          <p className="text-muted-foreground mt-1">Report, investigate, and track safety incidents and near-misses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />Report Incident</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Report New Incident</DialogTitle>
              <DialogDescription>Fill in the details of the safety incident</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Title</Label><Input placeholder="Brief description of incident" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Detailed description..." rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="recordable">Recordable</SelectItem><SelectItem value="serious">Serious</SelectItem><SelectItem value="fatal">Fatal</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Severity</Label>
                    <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="recordable">Recordable</SelectItem><SelectItem value="serious">Serious</SelectItem><SelectItem value="fatal">Fatal</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Location</Label><Input placeholder="e.g. Warehouse B" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Reported By</Label><Input placeholder="Name" value={form.reportedBy} onChange={e => setForm(p => ({ ...p, reportedBy: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Witnesses</Label><Input placeholder="Comma-separated names" value={form.witnesses} onChange={e => setForm(p => ({ ...p, witnesses: e.target.value }))} /></div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Submit Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map(k => { const Icon = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
        ); })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Severity Breakdown</CardTitle><CardDescription className="text-xs">By incident type</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={severityConfig} className="h-[240px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={severityCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" strokeWidth={2} stroke="hsl(var(--background))">
                  {severityCounts.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {severityCounts.map((s: any) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.fill }} />
                  <span className="text-muted-foreground">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm lg:col-span-3">
          <CardContent className="p-4 sm:p-6">
            <div className="filter-row mb-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search incidents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="recordable">Recordable</SelectItem><SelectItem value="serious">Serious</SelectItem><SelectItem value="fatal">Fatal</SelectItem></SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="reported">Reported</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
            </div>
            <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Title</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Location</TableHead><TableHead className="font-semibold">Date</TableHead><TableHead className="font-semibold">Reported By</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold">Root Cause</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? <TableRow><TableCell colSpan={9}><EmptyState icon={TriangleAlert} title="No incidents found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(i => (
                    <TableRow key={i.id} className="cursor-pointer hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold">{i.id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{i.title}</TableCell>
                      <TableCell><Badge variant="outline" className={severityBadge[i.type] || ''}>{typeLabel[i.type] || i.type}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate max-w-[120px]">{i.location}</span></div></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(i.date)}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(i.reportedBy)}</AvatarFallback></Avatar><span className="text-sm whitespace-nowrap">{i.reportedBy}</span></div></TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[i.status] || ''}>{i.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{i.rootCause || '—'}</TableCell>
                      <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Showing {filtered.length} of {incidents.length} incidents</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SafetyInspectionsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState(['', '']);
  const [form, setForm] = useState({ title: '', type: 'routine', area: '', inspector: '', scheduledDate: '' });

  const statusColors: Record<string, string> = { passed: 'bg-emerald-50 text-emerald-700 border-emerald-200', failed: 'bg-red-50 text-red-700 border-red-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', scheduled: 'bg-sky-50 text-sky-700 border-sky-200' };
  const typeColors: Record<string, string> = { routine: 'bg-slate-100 text-slate-600 border-slate-200', special: 'bg-violet-50 text-violet-700 border-violet-200', emergency: 'bg-red-50 text-red-600 border-red-200' };

  const inspections = useMemo(() => [
    { id: 'INSP-001', title: 'Monthly Fire Safety Walkthrough', type: 'routine', area: 'Building A', inspector: 'John Mitchell', date: '2025-01-20', findings: 2, score: 92, status: 'passed' },
    { id: 'INSP-002', title: 'OSHA Compliance Audit – Zone C', type: 'special', area: 'Zone C', inspector: 'Rachel Adams', date: '2025-01-22', findings: 5, score: 78, status: 'failed' },
    { id: 'INSP-003', title: 'Scaffold Safety Check', type: 'emergency', area: 'Warehouse D', inspector: 'Kevin Brooks', date: '2025-01-25', findings: 0, score: 0, status: 'scheduled' },
    { id: 'INSP-004', title: 'Emergency Exit Inspection', type: 'routine', area: 'Building B', inspector: 'Linda Park', date: '2025-01-18', findings: 3, score: 65, status: 'failed' },
    { id: 'INSP-005', title: 'Chemical Storage Compliance', type: 'special', area: 'Lab 2', inspector: 'Tom Wilson', date: '2025-01-28', findings: 0, score: 0, status: 'scheduled' },
    { id: 'INSP-006', title: 'Crane & Lifting Equipment Audit', type: 'special', area: 'Workshop 1', inspector: 'Mike Torres', date: '2025-01-19', findings: 1, score: 88, status: 'in_progress' },
    { id: 'INSP-007', title: 'PPE Condition Assessment', type: 'routine', area: 'All Areas', inspector: 'Anna Lee', date: '2025-01-15', findings: 1, score: 96, status: 'passed' },
    { id: 'INSP-008', title: 'Emergency Response Drill Evaluation', type: 'emergency', area: 'Plant Grounds', inspector: 'Chris Evans', date: '2025-01-21', findings: 4, score: 82, status: 'passed' },
  ], []);

  const filtered = useMemo(() => inspections.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  }), [inspections, search, typeFilter, statusFilter]);

  const passedCount = inspections.filter(i => i.status === 'passed').length;
  const failedCount = inspections.filter(i => i.status === 'failed').length;
  const scheduledCount = inspections.filter(i => i.status === 'scheduled').length;

  const kpis = useMemo(() => [
    { label: 'Total Inspections', value: inspections.length, icon: ClipboardCheck, color: 'from-emerald-500 to-teal-500' },
    { label: 'Passed', value: passedCount, icon: CheckCircle2, color: 'from-emerald-500 to-green-500' },
    { label: 'Failed', value: failedCount, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Scheduled', value: scheduledCount, icon: Calendar, color: 'from-sky-500 to-blue-500' },
  ], [passedCount, failedCount, scheduledCount]);

  const handleCreate = () => {
    if (!form.title) { toast.error('Title is required'); return; }
    toast.success(`Inspection "${form.title}" created successfully`);
    setDialogOpen(false);
    setForm({ title: '', type: 'routine', area: '', inspector: '', scheduledDate: '' });
    setChecklistItems(['', '']);
  };

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Inspections</h1>
          <p className="text-muted-foreground mt-1">Schedule and conduct safety inspections and workplace audits</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />New Inspection</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Create Inspection</DialogTitle><DialogDescription>Schedule a new safety inspection with checklist items</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Title</Label><Input placeholder="Inspection title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="special">Special</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Area</Label><Input placeholder="e.g. Building A" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Inspector</Label><Input placeholder="Assigned inspector" value={form.inspector} onChange={e => setForm(p => ({ ...p, inspector: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Checklist Items</Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs cursor-pointer" onClick={() => setChecklistItems([...checklistItems, ''])}><Plus className="h-3 w-3 mr-1" />Add</Button>
                  </div>
                  <div className="space-y-2">
                    {checklistItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input placeholder={`Checklist item ${idx + 1}`} value={item} onChange={e => { const updated = [...checklistItems]; updated[idx] = e.target.value; setChecklistItems(updated); }} />
                        {checklistItems.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 cursor-pointer" onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const Icon = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
        ); })}
      </div>

      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="filter-row mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inspections..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="routine">Routine</SelectItem><SelectItem value="special">Special</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="passed">Passed</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Title</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Area</TableHead><TableHead className="font-semibold">Inspector</TableHead><TableHead className="font-semibold">Date</TableHead><TableHead className="font-semibold">Findings</TableHead><TableHead className="font-semibold">Score</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={10}><EmptyState icon={ClipboardCheck} title="No inspections found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(i => (
                  <TableRow key={i.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{i.id}</TableCell>
                    <TableCell className="font-medium max-w-[220px] truncate">{i.title}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[i.type] || ''}>{i.type}</Badge></TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[120px]">{i.area}</span></div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-teal-100 text-teal-700">{getInitials(i.inspector)}</AvatarFallback></Avatar><span className="text-sm whitespace-nowrap">{i.inspector}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(i.date)}</TableCell>
                    <TableCell className="text-sm font-medium">{i.findings}</TableCell>
                    <TableCell>
                      {i.score > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${i.score >= 80 ? 'bg-emerald-500' : i.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${i.score}%` }} /></div>
                          <span className={`text-sm font-semibold ${i.score >= 80 ? 'text-emerald-600' : i.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{i.score}%</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[i.status] || ''}>{i.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {inspections.length} inspections</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SafetyTrainingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ courseName: '', type: 'mandatory', requiredFor: '', duration: '', completedBy: '', dueDate: '' });

  const statusColors: Record<string, string> = { completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', overdue: 'bg-red-50 text-red-700 border-red-200', not_started: 'bg-slate-100 text-slate-500 border-slate-200' };
  const typeColors: Record<string, string> = { mandatory: 'bg-red-50 text-red-600 border-red-200', refresher: 'bg-amber-50 text-amber-700 border-amber-200', certification: 'bg-violet-50 text-violet-700 border-violet-200', elective: 'bg-sky-50 text-sky-700 border-sky-200' };

  const trainings = useMemo(() => [
    { id: 'TR-001', courseName: 'Fire Safety & Evacuation', type: 'mandatory', requiredFor: 'All Staff', duration: '4 hours', completedBy: 'Operations', dueDate: '2025-02-15', status: 'completed' },
    { id: 'TR-002', courseName: 'Hazardous Chemical Handling', type: 'certification', requiredFor: 'Lab Technicians', duration: '6 hours', completedBy: 'Lab Team (partial)', dueDate: '2025-01-10', status: 'overdue' },
    { id: 'TR-003', courseName: 'Electrical Safety Awareness', type: 'mandatory', requiredFor: 'Maintenance', duration: '3 hours', completedBy: 'Maintenance Dept', dueDate: '2025-02-28', status: 'in_progress' },
    { id: 'TR-004', courseName: 'Working at Heights Certification', type: 'certification', requiredFor: 'Riggers & Scaffolders', duration: '8 hours', completedBy: 'Scaffold Team', dueDate: '2025-01-20', status: 'completed' },
    { id: 'TR-005', courseName: 'First Aid & CPR', type: 'mandatory', requiredFor: 'All Staff', duration: '5 hours', completedBy: 'Admin & Ops', dueDate: '2025-03-01', status: 'in_progress' },
    { id: 'TR-006', courseName: 'Confined Space Entry', type: 'certification', requiredFor: 'Tank Crew', duration: '4 hours', completedBy: '—', dueDate: '2025-01-25', status: 'not_started' },
    { id: 'TR-007', courseName: 'Lockout/Tagout Procedures', type: 'refresher', requiredFor: 'Electricians', duration: '2 hours', completedBy: 'Electrical Team', dueDate: '2025-01-15', status: 'completed' },
    { id: 'TR-008', courseName: 'Emergency Response Drill', type: 'mandatory', requiredFor: 'All Staff', duration: '3 hours', completedBy: '—', dueDate: '2025-02-10', status: 'not_started' },
    { id: 'TR-009', courseName: 'Crane & Rigging Safety', type: 'certification', requiredFor: 'Crane Operators', duration: '8 hours', completedBy: 'Crane Team', dueDate: '2025-01-05', status: 'overdue' },
    { id: 'TR-010', courseName: 'Ergonomics in the Workplace', type: 'elective', requiredFor: 'Office Staff', duration: '2 hours', completedBy: 'Admin Team', dueDate: '2025-03-15', status: 'in_progress' },
  ], []);

  const filtered = useMemo(() => trainings.filter(t => {
    if (search && !t.courseName.toLowerCase().includes(search.toLowerCase()) && !t.requiredFor.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  }), [trainings, search, statusFilter]);

  const completedCount = trainings.filter(t => t.status === 'completed').length;
  const overdueCount = trainings.filter(t => t.status === 'overdue').length;
  const complianceRate = Math.round((completedCount / trainings.length) * 100);

  const kpis = useMemo(() => [
    { label: 'Total Courses', value: trainings.length, icon: GraduationCap, color: 'from-emerald-500 to-teal-500' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'from-sky-500 to-blue-500' },
    { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'from-red-500 to-orange-500' },
    { label: 'Compliance Rate', value: `${complianceRate}%`, icon: ShieldCheck, color: 'from-amber-500 to-yellow-500' },
  ], [completedCount, overdueCount, complianceRate]);

  const deptCompliance = [
    { dept: 'Operations', rate: 92 }, { dept: 'Maintenance', rate: 78 }, { dept: 'Lab', rate: 60 },
    { dept: 'Admin', rate: 85 }, { dept: 'Warehouse', rate: 70 }, { dept: 'Safety', rate: 95 },
  ];

  const handleCreate = () => {
    if (!form.courseName) { toast.error('Course name is required'); return; }
    toast.success(`Training "${form.courseName}" created successfully`);
    setDialogOpen(false);
    setForm({ courseName: '', type: 'mandatory', requiredFor: '', duration: '', completedBy: '', dueDate: '' });
  };

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Training</h1>
          <p className="text-muted-foreground mt-1">Manage safety training programs, certifications, and compliance</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />New Training</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Create Training Record</DialogTitle><DialogDescription>Add a new safety training course or session</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Course Name</Label><Input placeholder="e.g. Fire Safety Training" value={form.courseName} onChange={e => setForm(p => ({ ...p, courseName: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mandatory">Mandatory</SelectItem><SelectItem value="refresher">Refresher</SelectItem><SelectItem value="certification">Certification</SelectItem><SelectItem value="elective">Elective</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Duration</Label><Input placeholder="e.g. 4 hours" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Required For</Label><Input placeholder="e.g. All Staff" value={form.requiredFor} onChange={e => setForm(p => ({ ...p, requiredFor: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Completed By</Label><Input placeholder="e.g. Operations Team" value={form.completedBy} onChange={e => setForm(p => ({ ...p, completedBy: e.target.value }))} /></div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const Icon = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
        ); })}
      </div>

      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Department Compliance</CardTitle><CardDescription className="text-xs">Training completion rates by department</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptCompliance.map(d => (
              <div key={d.dept} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{d.dept}</span>
                  <span className={`font-semibold ${d.rate >= 85 ? 'text-emerald-600' : d.rate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{d.rate}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${d.rate >= 85 ? 'bg-emerald-500' : d.rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${d.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="filter-row mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search courses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="not_started">Not Started</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">Course Name</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Required For</TableHead><TableHead className="font-semibold">Duration</TableHead><TableHead className="font-semibold">Completed By</TableHead><TableHead className="font-semibold">Due Date</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={GraduationCap} title="No courses found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(t => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-medium max-w-[220px] truncate">{t.courseName}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[t.type] || ''}>{t.type}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.requiredFor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.duration}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{t.completedBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap"><span className={t.status === 'overdue' ? 'text-red-600 font-medium' : ''}>{formatDate(t.dueDate)}</span></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[t.status] || ''}>{t.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {trainings.length} courses</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SafetyEquipmentPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'ppe', location: '', lastInspection: '', nextInspection: '' });

  const statusColors: Record<string, string> = {
    valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expiring: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    not_inspected: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const typeColors: Record<string, string> = {
    ppe: 'bg-sky-50 text-sky-700 border-sky-200',
    fire_extinguisher: 'bg-red-50 text-red-600 border-red-200',
    first_aid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    guard: 'bg-orange-50 text-orange-700 border-orange-200',
    device: 'bg-violet-50 text-violet-700 border-violet-200',
  };

  const equipment = useMemo(() => [
    { id: 'SEQ-001', name: 'Safety Helmet – White (x12)', type: 'ppe', location: 'Stores Room A', lastInspection: '2025-01-10', nextInspection: '2025-04-10', status: 'valid' },
    { id: 'SEQ-002', name: 'ABC Fire Extinguisher', type: 'fire_extinguisher', location: 'Building A – Floor 2', lastInspection: '2025-01-05', nextInspection: '2025-07-05', status: 'valid' },
    { id: 'SEQ-003', name: 'Emergency First Aid Kit', type: 'first_aid', location: 'Workshop 1', lastInspection: '2024-12-20', nextInspection: '2025-01-20', status: 'expiring' },
    { id: 'SEQ-004', name: '4-Gas Detector – Monitor', type: 'device', location: 'Lab 2', lastInspection: '2024-06-15', nextInspection: '2024-12-15', status: 'expired' },
    { id: 'SEQ-005', name: 'Full Body Harness', type: 'ppe', location: 'Warehouse D', lastInspection: '2025-01-08', nextInspection: '2025-07-08', status: 'valid' },
    { id: 'SEQ-006', name: 'CO2 Fire Extinguisher', type: 'fire_extinguisher', location: 'Server Room', lastInspection: '2024-11-01', nextInspection: '2025-01-15', status: 'expired' },
    { id: 'SEQ-007', name: 'Machine Guard – Lathe', type: 'guard', location: 'Workshop 2', lastInspection: '2024-12-01', nextInspection: '2025-01-18', status: 'expiring' },
    { id: 'SEQ-008', name: 'Safety Goggles – Pack (x20)', type: 'ppe', location: 'Stores Room A', lastInspection: '', nextInspection: '', status: 'not_inspected' },
    { id: 'SEQ-009', name: 'Chemical Resistant Gloves', type: 'ppe', location: 'Lab 1', lastInspection: '2025-01-03', nextInspection: '2025-04-03', status: 'valid' },
    { id: 'SEQ-010', name: 'Emergency Escape Respirator', type: 'device', location: 'Building B – Stairwell', lastInspection: '2024-10-15', nextInspection: '2025-01-25', status: 'expiring' },
  ], []);

  const filtered = useMemo(() => equipment.filter(eq => {
    if (search && !eq.name.toLowerCase().includes(search.toLowerCase()) && !eq.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && eq.type !== typeFilter) return false;
    if (statusFilter !== 'all' && eq.status !== statusFilter) return false;
    return true;
  }), [equipment, search, typeFilter, statusFilter]);

  const inspectedCount = equipment.filter(e => e.status === 'valid' || e.status === 'expiring').length;
  const expiredCount = equipment.filter(e => e.status === 'expired').length;
  const dueCount = equipment.filter(e => e.status === 'expiring' || e.status === 'not_inspected').length;

  const kpis = useMemo(() => [
    { label: 'Total Equipment', value: equipment.length, icon: HardHat, color: 'from-emerald-500 to-teal-500' },
    { label: 'Inspected', value: inspectedCount, icon: CheckCircle2, color: 'from-sky-500 to-blue-500' },
    { label: 'Expired', value: expiredCount, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Due for Inspection', value: dueCount, icon: AlertTriangle, color: 'from-amber-500 to-yellow-500' },
  ], [inspectedCount, expiredCount, dueCount]);

  const handleCreate = () => {
    if (!form.name) { toast.error('Equipment name is required'); return; }
    toast.success(`Equipment "${form.name}" registered successfully`);
    setDialogOpen(false);
    setForm({ name: '', type: 'ppe', location: '', lastInspection: '', nextInspection: '' });
  };

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Equipment</h1>
          <p className="text-muted-foreground mt-1">Track PPE, safety devices, and emergency equipment inventory</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />Register Equipment</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Register Equipment</DialogTitle><DialogDescription>Add a new safety equipment item</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Equipment Name</Label><Input placeholder="e.g. Safety Helmet" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ppe">PPE</SelectItem><SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="guard">Guard</SelectItem><SelectItem value="device">Device</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input placeholder="Storage location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Last Inspection</Label><Input type="date" value={form.lastInspection} onChange={e => setForm(p => ({ ...p, lastInspection: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Next Inspection</Label><Input type="date" value={form.nextInspection} onChange={e => setForm(p => ({ ...p, nextInspection: e.target.value }))} /></div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Register</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const Icon = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
        ); })}
      </div>

      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="filter-row mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search equipment..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="ppe">PPE</SelectItem><SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="guard">Guard</SelectItem><SelectItem value="device">Device</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="valid">Valid</SelectItem><SelectItem value="expiring">Expiring</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="not_inspected">Not Inspected</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Equipment Name</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Location</TableHead><TableHead className="font-semibold">Last Inspection</TableHead><TableHead className="font-semibold">Next Inspection</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={HardHat} title="No equipment found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(eq => (
                  <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{eq.id}</TableCell>
                    <TableCell className="font-medium max-w-[220px] truncate">{eq.name}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[eq.type] || ''}>{eq.type.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[140px]">{eq.location}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(eq.lastInspection)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap"><span className={eq.status === 'expired' ? 'text-red-600 font-medium' : eq.status === 'expiring' ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>{formatDate(eq.nextInspection)}</span></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[eq.status] || ''}>{eq.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {equipment.length} items</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SafetyPermitsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [safetyMeasures, setSafetyMeasures] = useState(['', '', '']);
  const [form, setForm] = useState({ type: 'hot_work', description: '', area: '', requestedBy: '', validFrom: '', validUntil: '' });

  const statusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', pending: 'bg-amber-50 text-amber-700 border-amber-200', expired: 'bg-red-50 text-red-700 border-red-200', revoked: 'bg-slate-100 text-slate-500 border-slate-300' };
  const typeColors: Record<string, string> = { hot_work: 'bg-red-50 text-red-600 border-red-200', confined_space: 'bg-orange-50 text-orange-700 border-orange-200', height: 'bg-sky-50 text-sky-700 border-sky-200', electrical: 'bg-violet-50 text-violet-700 border-violet-200', excavation: 'bg-amber-50 text-amber-700 border-amber-200' };

  const permits = useMemo(() => [
    { id: 'PMT-001', type: 'hot_work', description: 'Welding near fuel storage area', status: 'active', requestedBy: 'James Carter', area: 'Tank Farm', validFrom: '2025-01-15', validUntil: '2025-01-20' },
    { id: 'PMT-002', type: 'confined_space', description: 'Tank cleaning in reactor vessel', status: 'active', requestedBy: 'Maria Lopez', area: 'Reactor Bay', validFrom: '2025-01-14', validUntil: '2025-01-18' },
    { id: 'PMT-003', type: 'electrical', description: 'HVAC panel replacement – Building A', status: 'pending', requestedBy: 'Robert Chen', area: 'Building A', validFrom: '2025-01-22', validUntil: '2025-01-25' },
    { id: 'PMT-004', type: 'excavation', description: 'Underground pipe repair near entrance', status: 'pending', requestedBy: 'Sarah Kim', area: 'Main Entrance', validFrom: '2025-01-20', validUntil: '2025-01-23' },
    { id: 'PMT-005', type: 'height', description: 'Roof maintenance on Warehouse D', status: 'active', requestedBy: 'David Park', area: 'Warehouse D', validFrom: '2025-01-16', validUntil: '2025-01-19' },
    { id: 'PMT-006', type: 'hot_work', description: 'Pipe cutting in Workshop 1', status: 'expired', requestedBy: 'Lisa Nguyen', area: 'Workshop 1', validFrom: '2025-01-01', validUntil: '2025-01-05' },
    { id: 'PMT-007', type: 'electrical', description: 'Emergency lighting repair', status: 'revoked', requestedBy: 'Tom Harris', area: 'Corridor B', validFrom: '2024-12-28', validUntil: '2025-01-02' },
    { id: 'PMT-008', type: 'confined_space', description: 'Manhole inspection – Zone C', status: 'expired', requestedBy: 'Emma Wright', area: 'Zone C', validFrom: '2025-01-05', validUntil: '2025-01-08' },
  ], []);

  const filtered = useMemo(() => permits.filter(p => {
    if (search && !p.description.toLowerCase().includes(search.toLowerCase()) && !p.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  }), [permits, search, typeFilter, statusFilter]);

  const activeCount = permits.filter(p => p.status === 'active').length;
  const expiredCount = permits.filter(p => p.status === 'expired').length;
  const pendingCount = permits.filter(p => p.status === 'pending').length;
  const revokedCount = permits.filter(p => p.status === 'revoked').length;

  const kpis = useMemo(() => [
    { label: 'Active Permits', value: activeCount, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Expired', value: expiredCount, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'from-amber-500 to-yellow-500' },
    { label: 'Revoked', value: revokedCount, icon: ShieldAlert, color: 'from-slate-500 to-slate-600' },
  ], [activeCount, expiredCount, pendingCount, revokedCount]);

  const handleCreate = () => {
    if (!form.description) { toast.error('Description is required'); return; }
    toast.success(`Permit for "${form.type.replace(/_/g, ' ')}" submitted successfully`);
    setDialogOpen(false);
    setForm({ type: 'hot_work', description: '', area: '', requestedBy: '', validFrom: '', validUntil: '' });
    setSafetyMeasures(['', '', '']);
  };

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Permits</h1>
          <p className="text-muted-foreground mt-1">Manage work permits including hot work, confined space, and electrical permits</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Plus className="h-4 w-4 mr-2" />Request Permit</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Request Work Permit</DialogTitle><DialogDescription>Submit a new safety work permit request</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-2 pr-3">
                <div className="space-y-2"><Label>Permit Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hot_work">Hot Work</SelectItem><SelectItem value="confined_space">Confined Space</SelectItem><SelectItem value="height">Working at Height</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="excavation">Excavation</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe the work activity..." rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Area</Label><Input placeholder="Work location" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Requested By</Label><Input placeholder="Your name" value={form.requestedBy} onChange={e => setForm(p => ({ ...p, requestedBy: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valid From</Label><Input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} /></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Safety Measures Checklist</Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs cursor-pointer" onClick={() => setSafetyMeasures([...safetyMeasures, ''])}><Plus className="h-3 w-3 mr-1" />Add</Button>
                  </div>
                  <div className="space-y-2">
                    {safetyMeasures.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input type="checkbox" checked={item.length > 0} readOnly className="rounded accent-emerald-600" />
                        <Input placeholder={`Safety measure ${idx + 1}`} value={item} onChange={e => { const updated = [...safetyMeasures]; updated[idx] = e.target.value; setSafetyMeasures(updated); }} />
                        {safetyMeasures.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 cursor-pointer" onClick={() => setSafetyMeasures(safetyMeasures.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={handleCreate}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const Icon = k.icon; return (
          <Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
        ); })}
      </div>

      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="filter-row mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search permits..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="hot_work">Hot Work</SelectItem><SelectItem value="confined_space">Confined Space</SelectItem><SelectItem value="height">Working at Height</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="excavation">Excavation</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="revoked">Revoked</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">Permit #</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Description</TableHead><TableHead className="font-semibold">Area</TableHead><TableHead className="font-semibold">Requested By</TableHead><TableHead className="font-semibold">Valid From</TableHead><TableHead className="font-semibold">Valid Until</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={9}><EmptyState icon={FileCheck} title="No permits found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{p.id}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[p.type] || ''}>{p.type.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.description}</TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[120px]">{p.area}</span></div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(p.requestedBy)}</AvatarFallback></Avatar><span className="text-sm whitespace-nowrap">{p.requestedBy}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(p.validFrom)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap"><span className={p.status === 'expired' || p.status === 'revoked' ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{formatDate(p.validUntil)}</span></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[p.status] || ''}>{p.status}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {permits.length} permits</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// REPORTS SUBPAGES
// ============================================================================

function ReportsAssetPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [filterCriticality, setFilterCriticality] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    api.get<any[]>('/api/assets').then(res => {
      if (res.success && res.data) setAssets(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = assets.filter(a => {
    if (filterCondition !== 'all' && a.condition !== filterCondition) return false;
    if (filterCriticality !== 'all' && a.criticality !== filterCriticality) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const byCondition: Record<string, number> = {};
  const byCriticality: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  assets.forEach(a => {
    const c = a.condition || 'Unknown'; byCondition[c] = (byCondition[c] || 0) + 1;
    const cr = a.criticality || 'Unknown'; byCriticality[cr] = (byCriticality[cr] || 0) + 1;
    const s = a.status || 'Unknown'; byStatus[s] = (byStatus[s] || 0) + 1;
  });

  const conditionColors: Record<string, string> = { excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200', good: 'bg-sky-100 text-sky-700 border-sky-200', fair: 'bg-amber-100 text-amber-700 border-amber-200', poor: 'bg-orange-100 text-orange-700 border-orange-200', critical: 'bg-red-100 text-red-700 border-red-200' };

  const summaryCards = [
    { label: 'Total Assets', value: assets.length, icon: Building2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Conditions', value: Object.keys(byCondition).length, icon: Activity, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Critical Assets', value: byCriticality['critical'] || 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Active Assets', value: byStatus['active'] || byStatus['operational'] || 0, icon: CheckCircle2, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Asset Reports</h1><p className="text-muted-foreground mt-1">Comprehensive reports on asset register, conditions, and lifecycle</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <div className="filter-row flex items-center gap-2 flex-wrap">
          <Select value={filterCondition} onValueChange={setFilterCondition}><SelectTrigger className="w-40"><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="all">All Conditions</SelectItem>{Object.keys(byCondition).map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent></Select>
          <Select value={filterCriticality} onValueChange={setFilterCriticality}><SelectTrigger className="w-40"><SelectValue placeholder="Criticality" /></SelectTrigger><SelectContent><SelectItem value="all">All Criticality</SelectItem>{Object.keys(byCriticality).map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent></Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{Object.keys(byStatus).map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select>
        </div>
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden sm:table-cell">Asset Tag</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead>Condition</TableHead><TableHead className="hidden sm:table-cell">Criticality</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Location</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={Building2} title="No assets found" description="Adjust your filters or add assets to see reports." /></TableCell></TableRow>
          ) : filtered.map(asset => (
            <TableRow key={asset.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{asset.name}</TableCell>
              <TableCell className="font-mono text-xs hidden sm:table-cell">{asset.assetTag || '-'}</TableCell>
              <TableCell className="text-sm hidden md:table-cell">{asset.category || '-'}</TableCell>
              <TableCell><Badge variant="outline" className={conditionColors[asset.condition] || 'bg-slate-100 text-slate-700 border-slate-200'}>{(asset.condition || 'N/A').toUpperCase()}</Badge></TableCell>
              <TableCell className="hidden sm:table-cell"><Badge variant="outline" className={asset.criticality === 'critical' ? 'bg-red-50 text-red-700 border-red-200' : asset.criticality === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>{(asset.criticality || 'N/A').toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={asset.status === 'active' || asset.status === 'operational' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : asset.status === 'inactive' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-red-50 text-red-700 border-red-200'}>{(asset.status || 'N/A').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{asset.location || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
function ReportsMaintenancePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<WorkOrder[]>('/api/work-orders'),
      api.get<MaintenanceRequest[]>('/api/maintenance-requests'),
    ]).then(([statsRes, woRes, mrRes]) => {
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (woRes.success && woRes.data) setWorkOrders(woRes.data);
      if (mrRes.success && mrRes.data) setRequests(mrRes.data);
      setLoading(false);
    });
  }, []);

  const totalWOs = stats?.totalWorkOrders || 0;
  const completedWOs = stats?.completedWorkOrders || 0;
  const completionRate = totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0;
  const avgCost = workOrders.length > 0 ? (workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0) / workOrders.length) : 0;
  const overdue = stats?.overdueWorkOrders || 0;

  const typeBreakdown = [
    { type: 'Preventive', count: stats?.preventiveWO || 0, color: 'bg-emerald-500' },
    { type: 'Corrective', count: stats?.correctiveWO || 0, color: 'bg-amber-500' },
    { type: 'Emergency', count: stats?.emergencyWO || 0, color: 'bg-red-500' },
    { type: 'Inspection', count: stats?.inspectionWO || 0, color: 'bg-sky-500' },
    { type: 'Predictive', count: stats?.predictiveWO || 0, color: 'bg-violet-500' },
  ];

  const priorityCounts = [
    { priority: 'Low', count: workOrders.filter(wo => wo.priority === 'low').length },
    { priority: 'Medium', count: workOrders.filter(wo => wo.priority === 'medium').length },
    { priority: 'High', count: workOrders.filter(wo => wo.priority === 'high').length },
    { priority: 'Critical/Emergency', count: workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'emergency').length },
  ];

  const recentMRs = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  const summaryCards = [
    { label: 'Total Work Orders', value: totalWOs, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Avg WO Cost', value: `$${avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Maintenance Reports</h1><p className="text-muted-foreground mt-1">Reports on work orders, PM compliance, costs, and maintenance performance</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border"><CardHeader><CardTitle className="text-base">WO by Type</CardTitle><CardDescription className="text-xs">Work order type distribution</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {typeBreakdown.filter(t => t.count > 0).map(t => {
                const pct = totalWOs > 0 ? Math.round((t.count / totalWOs) * 100) : 0;
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-28">{t.type}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${t.color} rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
          <Card className="border"><CardHeader><CardTitle className="text-base">Priority Breakdown</CardTitle><CardDescription className="text-xs">Work orders by priority level</CardDescription></CardHeader><CardContent>
            <div className="space-y-3">
              {priorityCounts.map(p => {
                const pct = workOrders.length > 0 ? Math.round((p.count / workOrders.length) * 100) : 0;
                return (
                  <div key={p.priority} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-36">{p.priority}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${p.priority.includes('Critical') ? 'bg-red-500' : p.priority === 'High' ? 'bg-amber-500' : p.priority === 'Medium' ? 'bg-sky-500' : 'bg-slate-400'}`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-sm font-semibold w-16 text-right">{p.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        </div>
        <Card className="border"><CardHeader><CardTitle className="text-base">Recent Maintenance Requests</CardTitle><CardDescription className="text-xs">Latest submitted requests</CardDescription></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>Request #</TableHead><TableHead>Title</TableHead><TableHead className="hidden sm:table-cell">Asset</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Created</TableHead></TableRow></TableHeader><TableBody>
            {recentMRs.length === 0 ? (
              <TableRow><TableCell colSpan={6}><EmptyState icon={ClipboardList} title="No maintenance requests" description="Requests will appear here once submitted." /></TableCell></TableRow>
            ) : recentMRs.map(mr => (
              <TableRow key={mr.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{mr.requestNumber}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{mr.title}</TableCell>
                <TableCell className="text-sm hidden sm:table-cell">{mr.assetName || '-'}</TableCell>
                <TableCell><PriorityBadge priority={mr.priority} /></TableCell>
                <TableCell><StatusBadge status={mr.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(mr.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </CardContent></Card>
      </>)}
    </div>
  );
}
function ReportsInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    api.get<any[]>('/api/inventory').then(res => {
      if (res.success && res.data) setItems(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = searchText.trim() ? items.filter(i => {
    const q = searchText.toLowerCase();
    return (i.name || '').toLowerCase().includes(q) || (i.itemCode || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
  }) : items;

  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.unitCost || 0)), 0);
  const lowStock = items.filter(i => i.currentStock > 0 && i.currentStock <= (i.minStockLevel || 0));
  const outOfStock = items.filter(i => i.currentStock <= 0);

  const summaryCards = [
    { label: 'Total Items', value: totalItems, icon: Package, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Total Value', value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Low Stock', value: lowStock.length, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Out of Stock', value: outOfStock.length, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Inventory Reports</h1><p className="text-muted-foreground mt-1">Reports on stock levels, movements, values, and procurement</p></div>
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="hidden sm:table-cell text-right">Min Stock</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="hidden lg:table-cell">Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={Package} title="No inventory items found" description="Items will appear here once inventory is populated." /></TableCell></TableRow>
          ) : filtered.map(item => {
            const isLow = item.currentStock > 0 && item.currentStock <= (item.minStockLevel || 0);
            const isOut = item.currentStock <= 0;
            const value = (item.currentStock || 0) * (item.unitCost || 0);
            return (
              <TableRow key={item.id} className={`hover:bg-muted/30 ${isOut ? 'bg-red-50/50 dark:bg-red-950/20' : isLow ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-sm hidden md:table-cell">{item.category || '-'}</TableCell>
                <TableCell className={`text-right font-medium ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : ''}`}>{item.currentStock || 0}</TableCell>
                <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{item.minStockLevel || 0}</TableCell>
                <TableCell className="text-right font-medium">${value.toLocaleString()}</TableCell>
                <TableCell className="hidden lg:table-cell">{isOut ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">OUT OF STOCK</Badge> : isLow ? <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">LOW STOCK</Badge> : <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>}</TableCell>
              </TableRow>
            );
          })}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
function ReportsProductionPage() {
  const [monthFilter, setMonthFilter] = useState('all');
  const monthlyData = [
    { month: 'Aug 2024', planned: 2100, actual: 1980, efficiency: 94.3, downtime: 28, waste: 42 },
    { month: 'Sep 2024', planned: 2150, actual: 2010, efficiency: 93.5, downtime: 32, waste: 38 },
    { month: 'Oct 2024', planned: 2200, actual: 2050, efficiency: 93.2, downtime: 35, waste: 45 },
    { month: 'Nov 2024', planned: 2100, actual: 1830, efficiency: 87.1, downtime: 52, waste: 62 },
    { month: 'Dec 2024', planned: 2050, actual: 1780, efficiency: 86.8, downtime: 56, waste: 58 },
    { month: 'Jan 2025', planned: 2200, actual: 1800, efficiency: 81.8, downtime: 48, waste: 40 },
  ];
  const filtered = monthFilter === 'all' ? monthlyData : monthlyData.filter(d => d.month.includes(monthFilter));
  const totalOutput = monthlyData.reduce((s, d) => s + d.actual, 0);
  const avgEfficiency = (monthlyData.reduce((s, d) => s + d.efficiency, 0) / monthlyData.length).toFixed(1);
  const avgDowntime = (monthlyData.reduce((s, d) => s + d.downtime, 0) / monthlyData.length).toFixed(1);
  const avgWaste = ((monthlyData.reduce((s, d) => s + d.waste, 0) / totalOutput) * 100).toFixed(1);
  const maxActual = Math.max(...monthlyData.map(d => d.actual));
  const summaryCards = [
    { label: 'Total Output', value: `${totalOutput.toLocaleString()} units`, icon: Factory, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Efficiency', value: `${avgEfficiency}%`, icon: Target, color: 'bg-sky-50 text-sky-600' },
    { label: 'Avg Downtime', value: `${avgDowntime} hrs/mo`, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Waste Rate', value: `${avgWaste}%`, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];
  const months = ['Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025'];
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Production Reports</h1><p className="text-muted-foreground mt-1">Reports on production output, efficiency, and resource utilization</p></div>
        <div className="w-full sm:w-auto">
          <Select value={monthFilter} onValueChange={setMonthFilter}><SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Filter month" /></SelectTrigger><SelectContent><SelectItem value="all">All Months</SelectItem>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Output (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium">{d.actual.toLocaleString()}</span>
                <div className="w-full bg-emerald-100 rounded-t-md" style={{ height: `${(d.actual / maxActual) * 140}px` }}>
                  <div className="w-full h-full bg-emerald-500 rounded-t-md opacity-80" />
                </div>
                <span className="text-[10px] text-muted-foreground text-center">{d.month.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Planned</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Efficiency</TableHead><TableHead className="hidden sm:table-cell text-right">Downtime (hrs)</TableHead><TableHead className="hidden md:table-cell text-right">Waste (units)</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(d => (
            <TableRow key={d.month} className="hover:bg-muted/30">
              <TableCell className="font-medium">{d.month}</TableCell>
              <TableCell className="text-right text-muted-foreground">{d.planned.toLocaleString()}</TableCell>
              <TableCell className="text-right font-medium">{d.actual.toLocaleString()}</TableCell>
              <TableCell className={`text-right font-medium ${d.efficiency >= 90 ? 'text-emerald-600' : d.efficiency >= 85 ? 'text-amber-600' : 'text-red-600'}`}>{d.efficiency}%</TableCell>
              <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{d.downtime}</TableCell>
              <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.waste}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
    </div>
  );
}
function ReportsQualityPage() {
  const [monthFilter, setMonthFilter] = useState('all');
  const ncrCategories = [
    { name: 'Design', count: 12, color: 'bg-violet-500' },
    { name: 'Material', count: 18, color: 'bg-amber-500' },
    { name: 'Process', count: 25, color: 'bg-sky-500' },
    { name: 'External', count: 8, color: 'bg-red-500' },
  ];
  const totalNCRs = ncrCategories.reduce((s, c) => s + c.count, 0);
  const monthlyData = [
    { month: 'Aug 2024', inspections: 55, passed: 52, failed: 3, passRate: 94.5, ncrs: 3, capas: 2 },
    { month: 'Sep 2024', inspections: 60, passed: 57, failed: 3, passRate: 95.0, ncrs: 4, capas: 3 },
    { month: 'Oct 2024', inspections: 58, passed: 54, failed: 4, passRate: 93.1, ncrs: 5, capas: 4 },
    { month: 'Nov 2024', inspections: 62, passed: 58, failed: 4, passRate: 93.5, ncrs: 6, capas: 5 },
    { month: 'Dec 2024', inspections: 52, passed: 49, failed: 3, passRate: 94.2, ncrs: 4, capas: 3 },
    { month: 'Jan 2025', inspections: 55, passed: 52, failed: 3, passRate: 94.5, ncrs: 3, capas: 2 },
  ];
  const filtered = monthFilter === 'all' ? monthlyData : monthlyData.filter(d => d.month.includes(monthFilter));
  const totalInspections = monthlyData.reduce((s, d) => s + d.inspections, 0);
  const avgPassRate = ((monthlyData.reduce((s, d) => s + d.passed, 0) / totalInspections) * 100).toFixed(1);
  const summaryCards = [
    { label: 'Total Inspections', value: totalInspections.toString(), icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pass Rate', value: `${avgPassRate}%`, icon: ShieldCheck, color: 'bg-sky-50 text-sky-600' },
    { label: 'Open NCRs', value: '9', icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'CAPAs Pending', value: '8', icon: Clock, color: 'bg-red-50 text-red-600' },
  ];
  const months = ['Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025'];
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Reports</h1><p className="text-muted-foreground mt-1">Reports on inspections, NCRs, CAPAs, and quality KPIs</p></div>
        <Select value={monthFilter} onValueChange={setMonthFilter}><SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Filter month" /></SelectTrigger><SelectContent><SelectItem value="all">All Months</SelectItem>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">NCR by Category</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ncrCategories.map(cat => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-sm font-medium w-20">{cat.name}</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className={`h-full ${cat.color} rounded-full`} style={{ width: `${(cat.count / Math.max(...ncrCategories.map(c => c.count))) * 100}%` }} /></div>
                <span className="text-sm font-semibold w-16 text-right">{cat.count} ({Math.round((cat.count / totalNCRs) * 100)}%)</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Inspections</TableHead><TableHead className="hidden sm:table-cell text-right">Passed</TableHead><TableHead className="hidden sm:table-cell text-right">Failed</TableHead><TableHead className="text-right">Pass Rate</TableHead><TableHead className="text-right">NCRs</TableHead><TableHead className="hidden md:table-cell text-right">CAPAs</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(d => (
            <TableRow key={d.month} className="hover:bg-muted/30">
              <TableCell className="font-medium">{d.month}</TableCell>
              <TableCell className="text-right">{d.inspections}</TableCell>
              <TableCell className="text-right text-emerald-600 hidden sm:table-cell">{d.passed}</TableCell>
              <TableCell className="text-right text-red-600 hidden sm:table-cell">{d.failed}</TableCell>
              <TableCell className={`text-right font-medium ${d.passRate >= 95 ? 'text-emerald-600' : d.passRate >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{d.passRate}%</TableCell>
              <TableCell className="text-right">{d.ncrs}</TableCell>
              <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.capas}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
    </div>
  );
}
function ReportsSafetyPage() {
  const [yearFilter, setYearFilter] = useState('2025');
  const incidentTypes = [
    { name: 'Injury', count: 8, color: 'bg-red-500' },
    { name: 'Near Miss', count: 12, color: 'bg-amber-500' },
    { name: 'Property', count: 4, color: 'bg-sky-500' },
    { name: 'Environmental', count: 2, color: 'bg-emerald-500' },
    { name: 'Fire', count: 1, color: 'bg-orange-500' },
  ];
  const maxCount = Math.max(...incidentTypes.map(t => t.count));
  const monthlyData = [
    { month: 'Aug 2024', incidents: 5, nearMisses: 8, trir: 1.2, trainingHrs: 120, inspections: 22, actionsClosed: 18 },
    { month: 'Sep 2024', incidents: 4, nearMisses: 10, trir: 0.9, trainingHrs: 135, inspections: 25, actionsClosed: 20 },
    { month: 'Oct 2024', incidents: 3, nearMisses: 7, trir: 0.7, trainingHrs: 110, inspections: 20, actionsClosed: 17 },
    { month: 'Nov 2024', incidents: 6, nearMisses: 9, trir: 1.4, trainingHrs: 145, inspections: 28, actionsClosed: 22 },
    { month: 'Dec 2024', incidents: 3, nearMisses: 6, trir: 0.6, trainingHrs: 95, inspections: 18, actionsClosed: 15 },
    { month: 'Jan 2025', incidents: 3, nearMisses: 5, trir: 0.5, trainingHrs: 88, inspections: 15, actionsClosed: 12 },
  ];
  const filtered = monthlyData.filter(d => d.month.includes(yearFilter));
  const totalIncidents = monthlyData.reduce((s, d) => s + d.incidents, 0);
  const avgTRIR = (monthlyData.reduce((s, d) => s + d.trir, 0) / monthlyData.length).toFixed(1);
  const summaryCards = [
    { label: 'Incidents', value: totalIncidents.toString(), icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
    { label: 'TRIR', value: avgTRIR, icon: ShieldAlert, color: 'bg-amber-50 text-amber-600' },
    { label: 'Days Without Incident', value: '45', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Training Compliance', value: '92%', icon: GraduationCap, color: 'bg-sky-50 text-sky-600' },
  ];
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Safety Reports</h1><p className="text-muted-foreground mt-1">Reports on incidents, inspections, training, and safety KPIs</p></div>
        <Select value={yearFilter} onValueChange={setYearFilter}><SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent></Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Incidents by Type</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 h-40">
            {incidentTypes.map(t => (
              <div key={t.name} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium">{t.count}</span>
                <div className="w-full rounded-t-md" style={{ height: `${(t.count / maxCount) * 100}px` }}>
                  <div className={`w-full h-full ${t.color} rounded-t-md opacity-80`} />
                </div>
                <span className="text-[10px] text-muted-foreground text-center">{t.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Incidents</TableHead><TableHead className="hidden sm:table-cell text-right">Near Misses</TableHead><TableHead className="text-right">TRIR</TableHead><TableHead className="hidden md:table-cell text-right">Training Hrs</TableHead><TableHead className="hidden lg:table-cell text-right">Inspections</TableHead><TableHead className="hidden lg:table-cell text-right">Actions Closed</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(d => (
            <TableRow key={d.month} className="hover:bg-muted/30">
              <TableCell className="font-medium">{d.month}</TableCell>
              <TableCell className={`text-right font-medium ${d.incidents > 4 ? 'text-red-600' : 'text-foreground'}`}>{d.incidents}</TableCell>
              <TableCell className="text-right text-amber-600 hidden sm:table-cell">{d.nearMisses}</TableCell>
              <TableCell className={`text-right font-medium ${d.trir > 1.0 ? 'text-red-600' : d.trir > 0.7 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.trir}</TableCell>
              <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.trainingHrs}</TableCell>
              <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{d.inspections}</TableCell>
              <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{d.actionsClosed}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
    </div>
  );
}
function ReportsFinancialPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<WorkOrder[]>('/api/work-orders').then(res => {
      if (res.success && res.data) setWorkOrders(res.data);
      setLoading(false);
    });
  }, []);

  const totalCost = workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);
  const materialCost = workOrders.reduce((sum, wo) => sum + (wo.materialCost || 0), 0);
  const laborCost = workOrders.reduce((sum, wo) => sum + (wo.laborCost || 0), 0);
  const avgCost = workOrders.length > 0 ? totalCost / workOrders.length : 0;

  const costByType: Record<string, { cost: number; count: number }> = {};
  workOrders.forEach(wo => {
    const t = wo.type || 'other';
    if (!costByType[t]) costByType[t] = { cost: 0, count: 0 };
    costByType[t].cost += wo.totalCost || 0;
    costByType[t].count += 1;
  });
  const typeEntries = Object.entries(costByType).sort((a, b) => b[1].cost - a[1].cost);

  const highCostWOs = [...workOrders].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0)).slice(0, 15);

  const typeColors: Record<string, string> = { preventive: 'bg-emerald-500', corrective: 'bg-amber-500', emergency: 'bg-red-500', inspection: 'bg-sky-500', predictive: 'bg-violet-500', project: 'bg-teal-500' };

  const summaryCards = [
    { label: 'Total Maintenance Cost', value: `$${totalCost.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Material Cost', value: `$${materialCost.toLocaleString()}`, icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Labor Cost', value: `$${laborCost.toLocaleString()}`, icon: Users, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Avg WO Cost', value: `$${avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1><p className="text-muted-foreground mt-1">Financial reports on maintenance costs, asset values, and budgets</p></div>
      {loading ? <LoadingSkeleton /> : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(k => { const I = k.icon; return (
            <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
          ); })}
        </div>
        <Card className="border"><CardHeader><CardTitle className="text-base">Cost by WO Type</CardTitle><CardDescription className="text-xs">Maintenance expenditure breakdown by type</CardDescription></CardHeader><CardContent>
          <div className="space-y-3">
            {typeEntries.map(([type, data]) => {
              const pct = totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28 capitalize">{type.replace('_', ' ')}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${typeColors[type] || 'bg-slate-400'} rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>
                  <span className="text-sm font-semibold w-28 text-right">${data.cost.toLocaleString()} ({pct}%)</span>
                </div>
              );
            })}
            {typeEntries.length === 0 && <p className="text-sm text-muted-foreground">No cost data available.</p>}
          </div>
        </CardContent></Card>
        <Card className="border"><CardHeader><CardTitle className="text-base">High-Cost Work Orders</CardTitle><CardDescription className="text-xs">Top work orders by total cost</CardDescription></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Title</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Priority</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Material</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>
            {highCostWOs.length === 0 ? (
              <TableRow><TableCell colSpan={8}><EmptyState icon={DollarSign} title="No cost data" description="Cost data will appear once work orders have costs assigned." /></TableCell></TableRow>
            ) : highCostWOs.map(wo => (
              <TableRow key={wo.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                <TableCell className="text-xs capitalize hidden sm:table-cell">{wo.type.replace('_', ' ')}</TableCell>
                <TableCell className="hidden md:table-cell"><PriorityBadge priority={wo.priority} /></TableCell>
                <TableCell><StatusBadge status={wo.status} /></TableCell>
                <TableCell className="text-right text-muted-foreground">${(wo.materialCost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">${(wo.laborCost || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">${(wo.totalCost || 0).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </CardContent></Card>
      </>)}
    </div>
  );
}
function ReportsCustomPage() {
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'table', module: 'Assets', schedule: 'manual' });
  const [reports] = useState([
    { id: '1', name: 'Asset Utilization Summary', type: 'summary', createdBy: 'John Martinez', createdDate: '2025-01-10', lastRun: '2025-01-15 09:00', status: 'scheduled' },
    { id: '2', name: 'Maintenance Cost by Department', type: 'pivot', createdBy: 'Sarah Chen', createdDate: '2025-01-05', lastRun: '2025-01-14 14:30', status: 'published' },
    { id: '3', name: 'Inventory Turnover Analysis', type: 'chart', createdBy: 'Mike Johnson', createdDate: '2024-12-20', lastRun: '2025-01-15 08:00', status: 'scheduled' },
    { id: '4', name: 'Work Order Aging Report', type: 'table', createdBy: 'Emily Davis', createdDate: '2025-01-12', lastRun: '2025-01-12 16:00', status: 'draft' },
    { id: '5', name: 'Safety Compliance Dashboard', type: 'chart', createdBy: 'Robert Wilson', createdDate: '2024-11-15', lastRun: '2025-01-13 10:00', status: 'published' },
    { id: '6', name: 'Production Downtime Analysis', type: 'summary', createdBy: 'Tom Brown', createdDate: '2024-12-01', lastRun: '2025-01-11 11:30', status: 'archived' },
  ]);
  const filtered = searchText.trim() ? reports.filter(r => {
    const q = searchText.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q);
  }) : reports;
  const kpis = [
    { label: 'Total Custom Reports', value: '8', icon: FileSpreadsheet, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Scheduled', value: '3', icon: Clock, color: 'bg-sky-50 text-sky-600' },
    { label: 'Last Run', value: 'Today', icon: Play, color: 'bg-amber-50 text-amber-600' },
    { label: 'Published', value: '2', icon: CheckCircle2, color: 'bg-violet-50 text-violet-600' },
  ];
  const statusColor = (s: string) => s === 'published' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'scheduled' ? 'text-sky-600 bg-sky-50 border-sky-200' : s === 'draft' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-50 border-slate-200';
  const typeColor = (t: string) => t === 'table' ? 'text-sky-600 bg-sky-50 border-sky-200' : t === 'pivot' ? 'text-violet-600 bg-violet-50 border-violet-200' : t === 'chart' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200';
  const handleCreate = () => { setSaving(true); setTimeout(() => { setSaving(false); setCreateOpen(false); setForm({ name: '', description: '', type: 'table', module: 'Assets', schedule: 'manual' }); toast.success('Report created successfully'); }, 800); };
  const handleRun = (name: string) => { toast.success(`Running "${name}"...`); };
  const handleDelete = (name: string) => { toast.success(`"${name}" deleted`); };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Custom Reports</h1><p className="text-muted-foreground mt-1">Build and save custom reports with flexible filters and formatting</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Report</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search reports..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" /></div>
      </div>
      <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Report Name</TableHead><TableHead>Type</TableHead><TableHead className="hidden md:table-cell">Created By</TableHead><TableHead className="hidden sm:table-cell">Created Date</TableHead><TableHead className="hidden lg:table-cell">Last Run</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(r => (
            <TableRow key={r.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell><Badge variant="outline" className={typeColor(r.type)}><span className="capitalize">{r.type}</span></Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{r.createdBy}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{formatDate(r.createdDate)}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{formatDateTime(r.lastRun)}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(r.status)}><span className="capitalize">{r.status}</span></Badge></TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Run" onClick={() => handleRun(r.name)}><Play className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Export"><Download className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" title="Delete" onClick={() => handleDelete(r.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Create Custom Report</DialogTitle><DialogDescription>Define a new custom report for your organization</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Report Name</Label><Input placeholder="e.g. Asset Utilization Summary" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea placeholder="Describe what this report covers..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="table">Table</SelectItem><SelectItem value="pivot">Pivot</SelectItem><SelectItem value="chart">Chart</SelectItem><SelectItem value="summary">Summary</SelectItem></SelectContent></Select></div>
              <div><Label>Module</Label><Select value={form.module} onValueChange={v => setForm(f => ({ ...f, module: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Assets">Assets</SelectItem><SelectItem value="Maintenance">Maintenance</SelectItem><SelectItem value="Inventory">Inventory</SelectItem><SelectItem value="Quality">Quality</SelectItem><SelectItem value="Safety">Safety</SelectItem><SelectItem value="Production">Production</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Schedule</Label><Select value={form.schedule} onValueChange={v => setForm(f => ({ ...f, schedule: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.name}>{saving ? 'Creating...' : 'Create Report'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SETTINGS SUBPAGES
// ============================================================================

function SettingsGeneralPage() {
  const [profile, setProfile] = useState<any>(() => {
    if (typeof window === 'undefined') return { timezone: 'UTC', currency: 'USD', dateFormat: 'MM/DD/YYYY', companyName: '' };
    try { const s = localStorage.getItem('iassetspro_company_profile'); return s ? JSON.parse(s) : { timezone: 'UTC', currency: 'USD', dateFormat: 'MM/DD/YYYY', companyName: '' }; } catch { return { timezone: 'UTC', currency: 'USD', dateFormat: 'MM/DD/YYYY', companyName: '' }; }
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    localStorage.setItem('iassetspro_company_profile', JSON.stringify(profile));
    toast.success('General settings saved');
    setSaving(false);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">General Settings</h1><p className="text-muted-foreground mt-1">Configure system-wide preferences and defaults</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Regional Settings</CardTitle><CardDescription>Timezone, currency, and date format</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Timezone</Label><Select value={profile.timezone} onValueChange={v => setProfile(p => ({ ...p, timezone: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UTC">UTC</SelectItem><SelectItem value="America/New_York">Eastern Time</SelectItem><SelectItem value="America/Chicago">Central Time</SelectItem><SelectItem value="America/Denver">Mountain Time</SelectItem><SelectItem value="America/Los_Angeles">Pacific Time</SelectItem><SelectItem value="Europe/London">London (GMT)</SelectItem><SelectItem value="Africa/Accra">Accra (GMT)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Currency</Label><Select value={profile.currency} onValueChange={v => setProfile(p => ({ ...p, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="EUR">EUR (€)</SelectItem><SelectItem value="GBP">GBP (£)</SelectItem><SelectItem value="GHS">GHS (₵)</SelectItem><SelectItem value="NGN">NGN (₦)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Date Format</Label><Select value={profile.dateFormat} onValueChange={v => setProfile(p => ({ ...p, dateFormat: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem><SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem><SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem><SelectItem value="DD-MMM-YYYY">DD-MMM-YYYY</SelectItem></SelectContent></Select></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">System Information</CardTitle><CardDescription>Current system configuration</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Version', value: '2.0.0' },
              { label: 'Environment', value: 'Production' },
              { label: 'Database', value: 'SQLite' },
              { label: 'Last Backup', value: 'Never' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-2 border-b last:border-0"><span className="text-sm text-muted-foreground">{r.label}</span><span className="text-sm font-medium">{r.value}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Button onClick={handleSave} disabled={saving}>{saving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}</Button>
    </div>
  );
}

function SettingsNotificationsPage() {
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState({ inApp: true, email: true, emailAddr: 'admin@company.com', sms: false, phone: '' });
  const [quietHours, setQuietHours] = useState({ enabled: false, start: '22:00', end: '07:00', timezone: 'UTC' });
  const [notifTypes, setNotifTypes] = useState({
    woAssigned: true, woStatusChange: true, mrApprovedRejected: true, pmDue: true,
    lowStockAlert: true, assetConditionAlert: false, systemNotifications: true,
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
    await new Promise(r => setTimeout(r, 800));
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
function SettingsIntegrationsPage() {
  const [configOpen, setConfigOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [configForm, setConfigForm] = useState({ url: '', apiKey: '', username: '', password: '', webhookUrl: '' });
  const [saving, setSaving] = useState(false);

  const integrations = [
    { id: 'erp', name: 'ERP Integration', description: 'Connect to your enterprise resource planning system for data synchronization', icon: Server, connected: false, fields: ['url', 'apiKey', 'username', 'password'] },
    { id: 'iot', name: 'IoT Platform', description: 'Stream sensor data from IoT devices and gateways into iAssetsPro', icon: Cpu, connected: true, fields: ['url', 'apiKey'] },
    { id: 'email', name: 'Email Server', description: 'Configure SMTP settings for email notifications and reports delivery', icon: Mail, connected: true, fields: ['url', 'username', 'password'] },
    { id: 'sms', name: 'SMS Gateway', description: 'Set up SMS delivery for critical alerts via your preferred gateway', icon: Smartphone, connected: false, fields: ['url', 'apiKey'] },
    { id: 'webhooks', name: 'Webhooks', description: 'Send real-time event notifications to external systems via webhooks', icon: Globe, connected: false, fields: ['webhookUrl'] },
    { id: 'ldap', name: 'LDAP / Active Directory', description: 'Sync users and authenticate via your organization\'s directory service', icon: Shield, connected: false, fields: ['url', 'username', 'password'] },
  ];

  const openConfig = (integ: any) => {
    setSelected(integ);
    setConfigForm({ url: '', apiKey: '', username: '', password: '', webhookUrl: '' });
    setConfigOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success(`${selected.name} configuration saved`);
    setConfigOpen(false);
    setSelected(null);
    setSaving(false);
  };

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
function SettingsBackupPage() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const backupHistory = [
    { id: '1', date: '2025-01-15 03:00', type: 'Automatic', size: '24.5 MB', status: 'completed' },
    { id: '2', date: '2025-01-14 03:00', type: 'Automatic', size: '24.3 MB', status: 'completed' },
    { id: '3', date: '2025-01-13 15:32', type: 'Manual', size: '24.4 MB', status: 'completed' },
    { id: '4', date: '2025-01-13 03:00', type: 'Automatic', size: '24.2 MB', status: 'completed' },
    { id: '5', date: '2025-01-12 03:00', type: 'Automatic', size: '24.1 MB', status: 'failed' },
    { id: '6', date: '2025-01-11 03:00', type: 'Automatic', size: '24.0 MB', status: 'completed' },
    { id: '7', date: '2025-01-10 03:00', type: 'Automatic', size: '23.8 MB', status: 'completed' },
  ];

  const lastBackup = backupHistory.find(b => b.status === 'completed');

  const summaryCards = [
    { label: 'Last Backup', value: lastBackup?.date ? format(new Date(lastBackup.date), 'MMM d, HH:mm') : 'Never', icon: History, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Backup Size', value: lastBackup?.size || '-', icon: Database, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Auto-backup', value: 'Enabled', icon: RefreshCw, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Total Backups', value: backupHistory.filter(b => b.status === 'completed').length.toString(), icon: Layers, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const handleBackup = async () => {
    setBackingUp(true);
    await new Promise(r => setTimeout(r, 2000));
    toast.success('Backup completed successfully');
    setBackingUp(false);
  };

  const handleRestore = async () => {
    setRestoring(true);
    await new Promise(r => setTimeout(r, 2000));
    toast.success('Data restored successfully');
    setRestoring(false);
  };

  const handleExport = (type: string) => {
    toast.success(`${type} export started. Download will begin shortly.`);
  };

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Backup & Restore</h1>
        <p className="text-muted-foreground mt-1">Manage system backups, data exports, and disaster recovery</p>
      </div>

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

function AppShell() {
  const { currentPage, navigate, toggleSidebar, setMobileSidebarOpen, fetchModules } = useNavigationStore();
  const { user, isAuthenticated, isLoading, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    fetchMe();
    fetchModules();
  }, [fetchMe, fetchModules]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      // Core
      case 'dashboard': return <DashboardPage />;
      case 'notifications': return <NotificationsPage />;
      // Assets
      case 'assets-machines': return <AssetsMachinesPage />;
      case 'assets-hierarchy': return <AssetsHierarchyPage />;
      case 'assets-bom': return <AssetsBomPage />;
      case 'assets-condition-monitoring': return <AssetsConditionMonitoringPage />;
      case 'assets-digital-twin': return <AssetsDigitalTwinPage />;
      case 'assets-health': return <AssetHealthPage />;
      // Maintenance
      case 'maintenance-work-orders':
      case 'wo-detail': return <MaintenanceWorkOrdersPage />;
      case 'maintenance-requests':
      case 'mr-detail':
      case 'create-mr': return <MaintenanceRequestsPage />;
      case 'maintenance-dashboard': return <MaintenanceDashboardPage />;
      case 'maintenance-analytics': return <MaintenanceAnalyticsPage />;
      case 'maintenance-calibration': return <MaintenanceCalibrationPage />;
      case 'maintenance-risk-assessment': return <MaintenanceRiskAssessmentPage />;
      case 'maintenance-tools': return <MaintenanceToolsPage />;
      case 'pm-schedules': return <PmSchedulesPage />;
      // IoT
      case 'iot-devices': return <IotDevicesPage />;
      case 'iot-monitoring': return <IotMonitoringPage />;
      case 'iot-rules': return <IotRulesPage />;
      // Analytics
      case 'analytics-kpi': return <AnalyticsKpiPage />;
      case 'analytics-oee': return <AnalyticsOeePage />;
      case 'analytics-downtime': return <AnalyticsDowntimePage />;
      case 'analytics-energy': return <AnalyticsEnergyPage />;
      // Operations
      case 'operations-meter-readings': return <OperationsMeterReadingsPage />;
      case 'operations-training': return <OperationsTrainingPage />;
      case 'operations-surveys': return <OperationsSurveysPage />;
      case 'operations-time-logs': return <OperationsTimeLogsPage />;
      case 'operations-shift-handover': return <OperationsShiftHandoverPage />;
      case 'operations-checklists': return <OperationsChecklistsPage />;
      // Production
      case 'production-work-centers': return <ProductionWorkCentersPage />;
      case 'production-resource-planning': return <ProductionResourcePlanningPage />;
      case 'production-scheduling': return <ProductionSchedulingPage />;
      case 'production-capacity': return <ProductionCapacityPage />;
      case 'production-efficiency': return <ProductionEfficiencyPage />;
      case 'production-bottlenecks': return <ProductionBottlenecksPage />;
      case 'production-orders': return <ProductionOrdersPage />;
      case 'production-batches': return <ProductionBatchesPage />;
      // Quality
      case 'quality-inspections': return <QualityInspectionsPage />;
      case 'quality-ncr': return <QualityNcrPage />;
      case 'quality-audits': return <QualityAuditsPage />;
      case 'quality-control-plans': return <QualityControlPlansPage />;
      case 'quality-spc': return <QualitySpcPage />;
      case 'quality-capa': return <QualityCapaPage />;
      // Safety
      case 'safety-incidents': return <SafetyIncidentsPage />;
      case 'safety-inspections': return <SafetyInspectionsPage />;
      case 'safety-training': return <SafetyTrainingPage />;
      case 'safety-equipment': return <SafetyEquipmentPage />;
      case 'safety-permits': return <SafetyPermitsPage />;
      // Inventory
      case 'inventory-items': return <InventoryItemsPage />;
      case 'inventory-categories': return <InventoryCategoriesPage />;
      case 'inventory-locations': return <InventoryLocationsPage />;
      case 'inventory-transactions': return <InventoryTransactionsPage />;
      case 'inventory-adjustments': return <InventoryAdjustmentsPage />;
      case 'inventory-requests': return <InventoryRequestsPage />;
      case 'inventory-transfers': return <InventoryTransfersPage />;
      case 'inventory-suppliers': return <InventorySuppliersPage />;
      case 'inventory-purchase-orders': return <InventoryPurchaseOrdersPage />;
      case 'inventory-receiving': return <InventoryReceivingPage />;
      // Reports
      case 'reports-asset': return <ReportsAssetPage />;
      case 'reports-maintenance': return <ReportsMaintenancePage />;
      case 'reports-inventory': return <ReportsInventoryPage />;
      case 'reports-production': return <ReportsProductionPage />;
      case 'reports-quality': return <ReportsQualityPage />;
      case 'reports-safety': return <ReportsSafetyPage />;
      case 'reports-financial': return <ReportsFinancialPage />;
      case 'reports-custom': return <ReportsCustomPage />;
      // Settings
      case 'settings-general': return <SettingsGeneralPage />;
      case 'settings-users': return <SettingsUsersPage />;
      case 'settings-roles': return <SettingsRolesPage />;
      case 'settings-modules': return <SettingsModulesPage />;
      case 'settings-company': return <CompanyProfilePage />;
      case 'settings-plants': return <SettingsPlantsPage />;
      case 'settings-departments': return <SettingsDepartmentsPage />;
      case 'settings-notifications': return <SettingsNotificationsPage />;
      case 'settings-integrations': return <SettingsIntegrationsPage />;
      case 'settings-backup': return <SettingsBackupPage />;
      case 'settings-audit': return <AuditLogsPage />;
      // Legacy fallbacks
      case 'assets':
      case 'asset-detail': return <AssetsPage />;
      case 'inventory': return <InventoryPage />;
      case 'analytics': return <AnalyticsPage />;
      default: return <DashboardPage />;
    }
  };

  const pageTitle: Record<string, string> = {
    // Core
    'dashboard': 'Dashboard',
    'notifications': 'Notifications',
    // Assets
    'assets-machines': 'Machines',
    'assets-hierarchy': 'Asset Hierarchy',
    'assets-bom': 'Bill of Materials',
    'assets-condition-monitoring': 'Condition Monitoring',
    'assets-digital-twin': 'Digital Twin',
    'assets-health': 'Asset Health',
    // Maintenance
    'maintenance-work-orders': 'Work Orders',
    'wo-detail': 'Work Order Details',
    'maintenance-requests': 'Requests',
    'mr-detail': 'Request Details',
    'create-mr': 'New Request',
    'maintenance-dashboard': 'Maintenance Dashboard',
    'maintenance-analytics': 'Maintenance Analytics',
    'maintenance-calibration': 'Calibration',
    'maintenance-risk-assessment': 'Risk Assessment',
    'maintenance-tools': 'Tools',
    'pm-schedules': 'PM Schedules',
    // IoT
    'iot-devices': 'IoT Devices',
    'iot-monitoring': 'IoT Monitoring',
    'iot-rules': 'IoT Rules',
    // Analytics
    'analytics-kpi': 'KPI Dashboard',
    'analytics-oee': 'OEE',
    'analytics-downtime': 'Downtime Analysis',
    'analytics-energy': 'Energy Analytics',
    // Operations
    'operations-meter-readings': 'Meter Readings',
    'operations-training': 'Training',
    'operations-surveys': 'Surveys',
    'operations-time-logs': 'Time Logs',
    'operations-shift-handover': 'Shift Handover',
    'operations-checklists': 'Checklists',
    // Production
    'production-work-centers': 'Work Centers',
    'production-resource-planning': 'Resource Planning',
    'production-scheduling': 'Production Scheduling',
    'production-capacity': 'Capacity Management',
    'production-efficiency': 'Production Efficiency',
    'production-bottlenecks': 'Bottleneck Analysis',
    'production-orders': 'Production Orders',
    'production-batches': 'Batch Management',
    // Quality
    'quality-inspections': 'Inspections',
    'quality-ncr': 'Non-Conformance Reports',
    'quality-audits': 'Quality Audits',
    'quality-control-plans': 'Control Plans',
    'quality-spc': 'Statistical Process Control',
    'quality-capa': 'CAPA',
    // Safety
    'safety-incidents': 'Incidents',
    'safety-inspections': 'Safety Inspections',
    'safety-training': 'Safety Training',
    'safety-equipment': 'Safety Equipment',
    'safety-permits': 'Permits',
    // Inventory
    'inventory-items': 'Inventory Items',
    'inventory-categories': 'Categories',
    'inventory-locations': 'Locations',
    'inventory-transactions': 'Transactions',
    'inventory-adjustments': 'Adjustments',
    'inventory-requests': 'Requests',
    'inventory-transfers': 'Transfers',
    'inventory-suppliers': 'Suppliers',
    'inventory-purchase-orders': 'Purchase Orders',
    'inventory-receiving': 'Receiving',
    // Reports
    'reports-asset': 'Asset Reports',
    'reports-maintenance': 'Maintenance Reports',
    'reports-inventory': 'Inventory Reports',
    'reports-production': 'Production Reports',
    'reports-quality': 'Quality Reports',
    'reports-safety': 'Safety Reports',
    'reports-financial': 'Financial Reports',
    'reports-custom': 'Custom Reports',
    // Settings
    'settings-general': 'General Settings',
    'settings-users': 'Users',
    'settings-roles': 'Roles & Permissions',
    'settings-modules': 'Module Management',
    'settings-company': 'Company Profile',
    'settings-plants': 'Plants',
    'settings-departments': 'Departments',
    'settings-notifications': 'Notifications',
    'settings-integrations': 'Integrations',
    'settings-backup': 'Backup & Restore',
    'settings-audit': 'Audit Logs',
    // Legacy
    'assets': 'Asset Register',
    'asset-detail': 'Asset Details',
    'inventory': 'Inventory',
    'analytics': 'Analytics',
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
            <NotificationPopover />
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
