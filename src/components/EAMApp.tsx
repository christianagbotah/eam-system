'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { api } from '@/lib/api';
import type { PageName, User, MaintenanceRequest, WorkOrder, DashboardStats, Module, Role, Permission, UserRole, Notification, CompanyProfile, Asset, InventoryItem } from '@/types';

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Info,
  Loader2,
  Settings2,
  Send,
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
    { label: 'Chat', icon: MessageSquare, perm: '', page: 'chat', moduleCode: 'core' },
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
    let res;
    if (action === 'approve') {
      res = await api.post(`/api/maintenance-requests/${id}/approve`, { notes: notes || '' });
    } else if (action === 'reject') {
      res = await api.post(`/api/maintenance-requests/${id}/reject`, { reason: notes || '' });
    } else {
      res = await api.put(`/api/maintenance-requests/${id}`, { action, reviewNotes: notes });
    }
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
    const res = await api.post(`/api/maintenance-requests/${id}/convert`, {
      title: mr?.title,
      priority: mr?.priority,
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
    const res = await api.post(`/api/maintenance-requests/${id}/comments`, { content: comment });
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
    let res;
    switch (action) {
      case 'assign':
        res = await api.post(`/api/work-orders/${id}/assign`, { assignedTo: extra?.assignedToId, ...extra });
        break;
      case 'start':
        res = await api.post(`/api/work-orders/${id}/start`, { notes: extra?.notes });
        break;
      case 'complete':
        res = await api.post(`/api/work-orders/${id}/complete`, { notes: extra?.completionNotes, ...extra });
        break;
      case 'verify':
      case 'close':
        res = await api.post(`/api/work-orders/${id}/close`, { notes: extra?.notes });
        break;
      case 'approve':
        res = await api.put(`/api/work-orders/${id}`, { status: 'approved', ...extra });
        break;
      default:
        res = await api.put(`/api/work-orders/${id}`, { action, ...extra });
    }
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
    const res = await api.post(`/api/work-orders/${id}/comments`, { content: comment });
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
    const payload: any = {};
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
    const res = await api.put(`/api/work-orders/${id}`, payload);
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
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wo.materials.map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium text-sm">{m.itemName || '-'}</TableCell>
                            <TableCell className="text-right text-sm">{m.quantity || 0} {m.unit || ''}</TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell">${(m.unitCost || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell font-medium">${(m.totalCost || (m.quantity || 0) * (m.unitCost || 0)).toFixed(2)}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${m.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : m.status === 'issued' ? 'bg-sky-50 text-sky-700 border-sky-200' : m.status === 'returned' ? 'bg-slate-50 text-slate-500 border-slate-200' : ''}`}>{m.status || 'requested'}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {m.status === 'requested' && (
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 border-emerald-200" onClick={async () => { const r = await api.put(`/api/work-orders/${id}/materials/${m.id}`, { status: 'approved' }); if (r.success) { toast.success('Material approved'); fetchWO(); } else toast.error(r.error || 'Failed'); }}>Approve</Button>
                                )}
                                {m.status === 'approved' && (
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-sky-600 hover:text-sky-700 border-sky-200" onClick={async () => { const r = await api.put(`/api/work-orders/${id}/materials/${m.id}`, { status: 'issued' }); if (r.success) { toast.success('Material issued'); fetchWO(); } else toast.error(r.error || 'Failed'); }}>Issue</Button>
                                )}
                                {(m.status === 'issued') && (
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-slate-600 hover:text-slate-700" onClick={async () => { const r = await api.put(`/api/work-orders/${id}/materials/${m.id}`, { status: 'returned' }); if (r.success) { toast.success('Material returned'); fetchWO(); } else toast.error(r.error || 'Failed'); }}>Return</Button>
                                )}
                                {m.status === 'requested' && (
                                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1.5 text-red-500 hover:text-red-600" onClick={async () => { if (!confirm('Delete this material?')) return; const r = await api.delete(`/api/work-orders/${id}/materials/${m.id}`); if (r.success) { toast.success('Material removed'); fetchWO(); } else toast.error(r.error || 'Failed'); }}><Trash2 className="h-3 w-3" /></Button>
                                )}
                              </div>
                            </TableCell>
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
  const { navigate, pageParams } = useNavigationStore();

  // If navigated here with an asset ID, open detail view
  useEffect(() => {
    if (pageParams?.id && !detailId) setDetailId(pageParams.id);
  }, [pageParams]);

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

  // Background PM check: fire-and-forget trigger on page load
  useEffect(() => {
    const token = localStorage.getItem('eam_token');
    fetch('/api/pm-schedules/check-due', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    }).catch(() => { /* silent — background task */ });
  }, []);

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
  const navigate = useNavigationStore(s => s.navigate);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/assets?limit=9999');
        if (res.success && res.data) setAssets(Array.isArray(res.data) ? res.data : []);
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
        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm transition-colors" style={{ paddingLeft: `${depth * 20 + 12}px` }}>
          {children.length > 0 ? (
            <button onClick={() => toggle(a.id)} className="shrink-0 p-0.5 rounded hover:bg-muted">
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="w-4.5" />
          )}
          <button onClick={() => navigate('asset-detail', { id: a.id })} className="flex items-center gap-2 flex-1 min-w-0 text-left hover:underline">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate font-medium">{a.name}</span>
          </button>
          <Badge variant="outline" className="text-[10px] shrink-0">{a.status?.replace(/_/g,' ')}</Badge>
        </div>
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
          <CardDescription>Click asset name to view details. Click chevron to expand/collapse branches.</CardDescription>
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
        const res = await api.get('/api/assets?limit=9999');
        if (res.success && res.data) setAssets(Array.isArray(res.data) ? res.data : []);
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
      const cat = typeof a.category === 'object' && a.category ? (a.category.name || a.category.code || 'Uncategorized') : (a.category || 'Uncategorized');
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
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{typeof a.category === 'object' && a.category ? (a.category.name || a.category.code || '-') : (a.category || '-')}</TableCell>
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
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ totalBoms: 0, components: 0, active: 0, pending: 0 });
  const [form, setForm] = useState({ parentAsset: '', component: '', partNumber: '', quantity: '', unit: 'ea', specification: '', revision: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bomRes, assetRes] = await Promise.all([
        api.get('/api/bill-of-materials'),
        api.get('/api/assets?limit=200'),
      ]);
      if (bomRes.success && bomRes.data) {
        const d = bomRes.data as any;
        setBomItems(Array.isArray(d) ? d : []);
        if (bomRes.kpis) setKpis(bomRes.kpis as any);
      }
      if (assetRes.success && assetRes.data) {
        setAssets(Array.isArray(assetRes.data) ? assetRes.data : []);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = searchText.trim() ? bomItems.filter(b => {
    const q = searchText.toLowerCase();
    const pn = (b.parent as any)?.name || '';
    const cn = (b.childAsset as any)?.name || '';
    return pn.toLowerCase().includes(q) || cn.toLowerCase().includes(q) || (b.partNumber || '').toLowerCase().includes(q);
  }) : bomItems;

  const statusColor = (s: string) => s === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'pending' || s === 'under_review' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await api.post('/api/bill-of-materials', {
        parentId: form.parentAsset,
        childAssetId: form.component,
        partNumber: form.partNumber || undefined,
        quantity: parseFloat(form.quantity) || 1,
        unit: form.unit || 'ea',
        specification: form.specification || undefined,
        revision: form.revision || undefined,
      });
      if (res.success) {
        toast.success('BOM component added successfully');
        setCreateOpen(false);
        setForm({ parentAsset: '', component: '', partNumber: '', quantity: '', unit: 'ea', specification: '', revision: '' });
        fetchData();
      } else {
        toast.error(res.error || 'Failed to add BOM component');
      }
    } catch { toast.error('Failed to add BOM component'); }
    setSaving(false);
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Bill of Materials</h1><p className="text-muted-foreground mt-1">Manage hierarchical parts lists for each asset</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Component</Button>
      </div>
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total BOMs', value: kpis.totalBoms, icon: ListChecks, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Components', value: kpis.components, icon: Layers, color: 'bg-sky-50 text-sky-600' },
          { label: 'Active', value: kpis.active, icon: CheckCircle2, color: 'bg-amber-50 text-amber-600' },
          { label: 'Under Review', value: kpis.pending, icon: Clock, color: 'bg-violet-50 text-violet-600' },
        ].map(k => { const I = k.icon; return (
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
            <TableRow key={b.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{(b.parent as any)?.name || b.parentId || '-'}</TableCell>
              <TableCell>{(b.childAsset as any)?.name || b.childAssetId || '-'}</TableCell>
              <TableCell className="font-mono text-xs hidden sm:table-cell">{b.partNumber || '-'}</TableCell>
              <TableCell className="text-right">{b.quantity}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{b.unit}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{b.specification || '-'}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(b.status)}><span className="capitalize">{b.status}</span></Badge></TableCell>
              <TableCell className="font-mono text-xs hidden md:table-cell">{b.revision || '-'}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No BOM items found</TableCell></TableRow>}
        </TableBody></Table></div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add BOM Component</DialogTitle><DialogDescription>Add a new component to a Bill of Materials</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Parent Asset</Label><Select value={form.parentAsset} onValueChange={v => setForm(f => ({ ...f, parentAsset: v }))}><SelectTrigger><SelectValue placeholder="Select parent asset" /></SelectTrigger><SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.assetTag})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Component</Label><Select value={form.component} onValueChange={v => setForm(f => ({ ...f, component: v }))}><SelectTrigger><SelectValue placeholder="Select component" /></SelectTrigger><SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.assetTag})</SelectItem>)}</SelectContent></Select></div>
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
      </>}
    </div>
  );
}
function AssetsConditionMonitoringPage() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ asset: '', parameter: 'vibration', normalMin: '', normalMax: '', alertThreshold: '' });
  const [searchText, setSearchText] = useState('');

  const parameterUnits: Record<string, string> = { vibration: 'mm/s', temperature: '°C', pressure: 'bar', flow: 'L/min', current: 'A' };
  const fetchMonitoring = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/iot/monitoring/summary');
      if (res.success && res.data) {
        setMonitoringData(res.data);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchMonitoring();
  }, []);

  // Build asset cards from devices with readings
  const assetCards = (monitoringData?.devicesWithReadings || []).map((d: any) => {
    const lastReading = d.readings?.[0];
    const val = lastReading?.value ?? d.lastReading ?? 0;
    const rule = d.rules?.[0];
    const inThreshold = rule ? val < rule.threshold : true;
    const status = d.status === 'warning' || d.status === 'error' ? d.status : (inThreshold ? 'normal' : 'warning');
    const prevReading = d.readings?.[1];
    const trend = prevReading ? (val > prevReading.value ? 'rising' : val < prevReading.value ? 'falling' : 'stable') : 'stable';
    return { id: d.id, name: d.name, parameter: d.parameter || '-', value: val, unit: d.unit || '', status, trend };
  });

  // Build table data from devices
  const tableData = (monitoringData?.devicesWithReadings || []).map((d: any) => {
    const lastReading = d.readings?.[0];
    const val = lastReading?.value ?? d.lastReading ?? 0;
    const rule = d.rules?.[0];
    const inThreshold = rule ? val < rule.threshold : true;
    const status = d.status === 'warning' || d.status === 'error' ? d.status : (inThreshold ? 'normal' : 'warning');
    const prevReading = d.readings?.[1];
    const trend = prevReading ? (val > prevReading.value ? '↑' : val < prevReading.value ? '↓' : '→') : '→';
    return {
      id: d.id, asset: d.name, parameter: d.parameter || '-',
      current: `${val} ${d.unit || ''}`,
      normal: d.thresholdMin != null && d.thresholdMax != null ? `${d.thresholdMin}–${d.thresholdMax} ${d.unit || ''}` : '-',
      status, lastReading: lastReading?.timestamp || d.lastSeen,
      trend,
    };
  });

  const filtered = searchText.trim() ? tableData.filter(r => {
    const q = searchText.toLowerCase();
    return r.asset.toLowerCase().includes(q) || r.parameter.toLowerCase().includes(q);
  }) : tableData;

  const kpis = [
    { label: 'Assets Monitored', value: monitoringData?.devices?.total || 0, icon: Activity, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Normal', value: monitoringData?.devices?.online || 0, icon: CheckCircle2, color: 'bg-sky-50 text-sky-600' },
    { label: 'Warning', value: monitoringData?.devices?.warning || 0, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Critical', value: monitoringData?.devices?.error || 0, icon: AlertCircle, color: 'bg-red-50 text-red-600' },
  ];
  const statusColor = (s: string) => s === 'normal' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'warning' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  const dotColor = (s: string) => s === 'normal' ? 'bg-emerald-500' : s === 'warning' ? 'bg-amber-500' : 'bg-red-500';
  const barColor = (s: string) => s === 'normal' ? 'bg-emerald-400' : s === 'warning' ? 'bg-amber-400' : 'bg-red-400';
  const handleCreate = async () => {
    if (!form.asset) { toast.error('Asset name is required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/api/iot/devices', {
        name: form.asset,
        type: 'sensor',
        protocol: 'mqtt',
        parameter: form.parameter,
        unit: parameterUnits[form.parameter] || '',
        thresholdMin: form.normalMin ? parseFloat(form.normalMin) : null,
        thresholdMax: form.normalMax ? parseFloat(form.normalMax) : null,
      });
      if (res.success) {
        toast.success('Monitoring point added successfully');
        setCreateOpen(false);
        setForm({ asset: '', parameter: 'vibration', normalMin: '', normalMax: '', alertThreshold: '' });
        await fetchMonitoring();
      } else { toast.error(res.error || 'Failed to add monitoring point'); }
    } catch { toast.error('Failed to add monitoring point'); }
    setSaving(false);
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Condition Monitoring</h1><p className="text-muted-foreground mt-1">Real-time monitoring of asset health parameters</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Monitoring Point</Button>
      </div>
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : <>
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
      {assetCards.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <span className="text-2xl font-bold">{typeof card.value === 'number' ? card.value.toFixed(1) : card.value}</span>
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
      </div>}
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
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{r.lastReading ? formatDateTime(r.lastReading) : '-'}</TableCell>
              <TableCell><span className={`text-lg font-bold ${r.trend === '↑' ? 'text-red-500' : r.trend === '↓' ? 'text-emerald-500' : 'text-slate-400'}`}>{r.trend}</span></TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground text-sm">{monitoringData ? 'No monitoring data available' : 'Loading...'}</TableCell></TableRow>}
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
      </>}
    </div>
  );
}
function AssetsDigitalTwinPage() {
  const [selectedTwin, setSelectedTwin] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [twins, setTwins] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ total: 0, activeSync: 0, simulationRuns: 0, alerts: 0 });
  const [form, setForm] = useState({ name: '', asset: '', type: 'pump', syncInterval: '1min' });
  const [selectedTwinDetail, setSelectedTwinDetail] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [twinsRes, assetRes] = await Promise.all([
        api.get('/api/digital-twins'),
        api.get('/api/assets?limit=200'),
      ]);
      if (twinsRes.success && twinsRes.data) {
        setTwins(Array.isArray(twinsRes.data) ? twinsRes.data : []);
        if (twinsRes.kpis) setKpis(twinsRes.kpis as any);
      }
      if (assetRes.success && assetRes.data) {
        setAssets(Array.isArray(assetRes.data) ? assetRes.data : []);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!selectedTwin) { setSelectedTwinDetail(null); return; }
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/api/digital-twins/${selectedTwin}`);
        if (res.success && res.data) setSelectedTwinDetail(res.data);
      } catch { /* silent */ }
    };
    fetchDetail();
  }, [selectedTwin]);

  // Build specs from detail data
  const twinSpecs: Record<string, any[]> = {};
  if (selectedTwinDetail) {
    const params = selectedTwinDetail.parameters ? (() => { try { return JSON.parse(selectedTwinDetail.parameters); } catch { return []; } })() : [];
    const specs = selectedTwinDetail.specification ? (() => { try { return JSON.parse(selectedTwinDetail.specification); } catch { return []; } })() : [];
    twinSpecs[selectedTwin] = [...params, ...specs];
  }

  const currentTwin = twins.find(t => t.id === selectedTwin);

  const kpiCards = [
    { label: 'Digital Twins', value: kpis.total, icon: Box, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Active Sync', value: kpis.activeSync, icon: RefreshCw, color: 'bg-sky-50 text-sky-600' },
    { label: 'Simulation Runs', value: kpis.simulationRuns, icon: Play, color: 'bg-amber-50 text-amber-600' },
    { label: 'Alerts', value: kpis.alerts, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];
  const statusColor = (s: string) => s === 'normal' ? 'text-emerald-600' : s === 'warning' ? 'text-amber-600' : 'text-red-600';
  const healthRingColor = (score: number) => score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  const handleCreate = async () => {
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
        setCreateOpen(false);
        setForm({ name: '', asset: '', type: 'pump', syncInterval: '1min' });
        fetchData();
      } else {
        toast.error(res.error || 'Failed to create digital twin');
      }
    } catch { toast.error('Failed to create digital twin'); }
    setSaving(false);
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Digital Twin</h1><p className="text-muted-foreground mt-1">Create and manage digital replicas of physical assets</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Twin</Button>
      </div>
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
          <div key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </div>
          </div>
        ); })}
      </div>
      {twins.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {twins.map(twin => (
          <Card key={twin.id} className={`border border-border/60 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedTwin === twin.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedTwin(twin.id)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{twin.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{(twin.asset as any)?.name || '-'}</p>
                </div>
                <Badge variant="outline" className={twin.isActive ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'}>
                  <span className="capitalize">{twin.isActive ? 'active' : 'inactive'}</span>
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">Type: <span className="capitalize font-medium text-foreground">{twin.type}</span></div>
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/30" /><circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5" strokeDasharray={`${twin.healthScore * 1} ${100 - twin.healthScore}`} className={healthRingColor(twin.healthScore)} strokeLinecap="round" /></svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{twin.healthScore}%</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Last sync: {twin.lastSynced ? formatDateTime(twin.lastSynced) : '-'}</p>
            </CardContent>
          </Card>
        ))}
      </div>}
      {currentTwin && selectedTwinDetail && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{currentTwin.name} — Specifications</CardTitle>
            <CardDescription className="text-xs">Real-time parameter data from the digital twin model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Value</TableHead><TableHead className="hidden sm:table-cell">Unit</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {(twinSpecs[selectedTwin] || []).map((spec: any, i: number) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{spec.name}</TableCell>
                  <TableCell className="font-mono">{spec.value}</TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{spec.unit || ''}</TableCell>
                  <TableCell><span className={`text-xs font-medium ${statusColor(spec.status)}`}>{spec.status === 'normal' ? '● Normal' : spec.status === 'warning' ? '● Warning' : '● Critical'}</span></TableCell>
                </TableRow>
              ))}
              {(twinSpecs[selectedTwin] || []).length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No specification data available</TableCell></TableRow>}
            </TableBody></Table></div>
          </CardContent>
        </Card>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create Digital Twin</DialogTitle><DialogDescription>Create a new digital replica for an asset</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Twin Name</Label><Input placeholder="e.g. Centrifugal Pump P-101" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Asset</Label><Select value={form.asset} onValueChange={v => setForm(f => ({ ...f, asset: v }))}><SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger><SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.assetTag})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pump">Pump</SelectItem><SelectItem value="motor">Motor</SelectItem><SelectItem value="compressor">Compressor</SelectItem><SelectItem value="valve">Valve</SelectItem><SelectItem value="heat_exchanger">Heat Exchanger</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
              <div><Label>Sync Interval</Label><Select value={form.syncInterval} onValueChange={v => setForm(f => ({ ...f, syncInterval: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="real_time">Real-time</SelectItem><SelectItem value="1min">1 min</SelectItem><SelectItem value="5min">5 min</SelectItem><SelectItem value="15min">15 min</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.name || !form.asset}>{saving ? 'Creating...' : 'Create Twin'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      </>}
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
  const [loading, setLoading] = useState(true);
  const [calibrations, setCalibrations] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ total: 0, calibrated: 0, dueSoon: 0, overdue: 0 });

  const fetchCalibrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/calibrations');
      if (res.success && res.data) {
        setCalibrations(Array.isArray(res.data) ? res.data : []);
        if (res.kpis) setKpis(res.kpis as any);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchCalibrations(); }, []);

  const calStatusColors: Record<string, string> = {
    calibrated: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    out_of_calibration: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    due: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  };

  const kpiCards = [
    { label: 'Total Instruments', value: kpis.total, icon: Crosshair, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'Calibrated', value: kpis.calibrated, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Due Soon', value: kpis.dueSoon, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Overdue', value: kpis.overdue, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const mapStatus = (s: string) => {
    if (s === 'out_of_calibration') return 'overdue';
    if (s === 'due') return 'due_soon';
    return s;
  };

  const filtered = calibrations.filter(c => {
    const ms = mapStatus(c.status || '');
    const matchSearch = !search || (c.instrumentName || c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.serialNumber || '').toLowerCase().includes(search.toLowerCase()) || (c.calibrationNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || ms === statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await api.post('/api/calibrations', {
        title: `Calibration - ${form.instrument}`,
        instrumentName: form.instrument,
        serialNumber: form.serialNumber || undefined,
        calibrationDate: form.lastCalibration || undefined,
        nextDueDate: form.nextDue || undefined,
        standardUsed: form.certificates || undefined,
      });
      if (res.success) {
        toast.success('Calibration record created successfully');
        setCreateOpen(false);
        setForm({ instrument: '', serialNumber: '', type: '', lastCalibration: '', nextDue: '', technician: '', certificates: '' });
        fetchCalibrations();
      } else {
        toast.error(res.error || 'Failed to create calibration record');
      }
    } catch { toast.error('Failed to create calibration record'); }
    setSaving(false);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Calibration</h1><p className="text-muted-foreground mt-1">Manage instrument calibration schedules, records, and compliance tracking</p></div>
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
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
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.instrument}>{saving ? 'Creating...' : 'Create Record'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search instruments, serial numbers..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="calibrated">Calibrated</SelectItem><SelectItem value="out_of_calibration">Overdue</SelectItem><SelectItem value="due">Due Soon</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">ID</TableHead><TableHead className="text-xs">Instrument</TableHead><TableHead className="text-xs hidden md:table-cell">Serial #</TableHead><TableHead className="text-xs hidden lg:table-cell">Type</TableHead><TableHead className="text-xs hidden lg:table-cell">Last Calibration</TableHead><TableHead className="text-xs">Next Due</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Result</TableHead></TableRow></TableHeader><TableBody>
              {filtered.map(c => {
                const displayStatus = mapStatus(c.status || '');
                const isOverdue = displayStatus === 'overdue';
                return (
                <TableRow key={c.id} className={`hover:bg-muted/30 ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <TableCell className="font-mono text-xs">{c.calibrationNumber}</TableCell>
                  <TableCell className="font-medium text-sm">{c.instrumentName || c.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{c.serialNumber || '-'}</TableCell>
                  <TableCell className="text-xs capitalize hidden lg:table-cell">{c.standardUsed || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(c.calibrationDate)}</TableCell>
                  <TableCell className="text-xs">{c.nextDueDate ? formatDate(c.nextDueDate) : '-'}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${calStatusColors[c.status] || ''}`}>{(displayStatus || c.status).replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{c.result || '-'}</TableCell>
                </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8}><EmptyState icon={Crosshair} title="No calibration records found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
      </>}
    </div>
  );
}

function MaintenanceRiskAssessmentPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ asset: '', category: '', likelihood: '', consequence: '', mitigationPlan: '', assessor: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/risk-assessments');
      if (res.success && res.data) {
        setAssessments(Array.isArray(res.data) ? res.data : []);
        if (res.kpis) setKpis(res.kpis as any);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchAssessments(); }, []);

  const riskLevelColors: Record<string, string> = {
    extreme: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    high: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  };

  const riskScoreColor = (score: number) => score >= 15 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' : score >= 9 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';

  const kpiCards = [
    { label: 'Total Assessments', value: kpis.total, icon: ClipboardList, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'High Risk', value: kpis.critical, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400' },
    { label: 'Medium Risk', value: kpis.medium, icon: ShieldAlert, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Low Risk', value: kpis.low, icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ];

  const mapRiskLevel = (level: string) => {
    if (level === 'extreme') return 'critical';
    return level;
  };

  const filtered = assessments.filter(a => {
    const ml = mapRiskLevel(a.riskLevel || '');
    const matchSearch = !search || (a.title || '').toLowerCase().includes(search.toLowerCase()) || (a.assessmentNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || ml === levelFilter || a.riskLevel === levelFilter;
    return matchSearch && matchLevel;
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const hazards = form.category ? [{ category: form.category }] : [];
      const controls = form.mitigationPlan ? [{ plan: form.mitigationPlan }] : [];
      const res = await api.post('/api/risk-assessments', {
        title: `Risk Assessment - ${form.asset}`,
        assetId: form.asset || undefined,
        likelihood: form.likelihood ? parseInt(form.likelihood) : undefined,
        consequence: form.consequence ? parseInt(form.consequence) : undefined,
        hazards,
        controls,
      });
      if (res.success) {
        toast.success('Risk assessment created successfully');
        setCreateOpen(false);
        setForm({ asset: '', category: '', likelihood: '', consequence: '', mitigationPlan: '', assessor: '' });
        fetchAssessments();
      } else {
        toast.error(res.error || 'Failed to create risk assessment');
      }
    } catch { toast.error('Failed to create risk assessment'); }
    setSaving(false);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Risk Assessment</h1><p className="text-muted-foreground mt-1">Evaluate and manage risks associated with asset failures and maintenance activities</p></div>
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
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
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.asset || !form.likelihood || !form.consequence}>{saving ? 'Creating...' : 'Create Assessment'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search assets, assessment IDs..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={levelFilter} onValueChange={setLevelFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Risk Level" /></SelectTrigger><SelectContent><SelectItem value="all">All Levels</SelectItem><SelectItem value="extreme">Extreme</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">ID</TableHead><TableHead className="text-xs">Asset</TableHead><TableHead className="text-xs hidden md:table-cell">Description</TableHead><TableHead className="text-xs text-center">L</TableHead><TableHead className="text-xs text-center">C</TableHead><TableHead className="text-xs text-center">Risk Score</TableHead><TableHead className="text-xs">Level</TableHead><TableHead className="text-xs hidden lg:table-cell">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
              {filtered.map(a => {
                const rs = (a.likelihood || 0) * (a.consequence || 0);
                const dl = mapRiskLevel(a.riskLevel || '');
                return (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{a.assessmentNumber}</TableCell>
                  <TableCell className="font-medium text-sm">{a.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{a.description || '-'}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{a.likelihood ?? '-'}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{a.consequence ?? '-'}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className={`text-[10px] font-bold ${riskScoreColor(rs)}`}>{rs || '-'}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${riskLevelColors[a.riskLevel] || riskLevelColors[dl] || ''}`}>{dl || a.riskLevel || '-'}</Badge></TableCell>
                  <TableCell className="text-xs capitalize hidden lg:table-cell"><Badge variant="outline" className="text-[10px]">{(a.status || 'open').replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(a.assessmentDate)}</TableCell>
                </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9}><EmptyState icon={TriangleAlert} title="No assessments found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
      </>}
    </div>
  );
}

function MaintenanceToolsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', location: '', serialNumber: '', condition: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ total: 0, available: 0, checkedOut: 0, inRepair: 0, retired: 0 });

  const fetchTools = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/tools');
      if (res.success && res.data) {
        setTools(Array.isArray(res.data) ? res.data : []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchTools(); }, []);

  const toolStatusColors: Record<string, string> = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    checked_out: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
    in_repair: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    transferred: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
    retired: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800',
  };

  const kpiCards = [
    { label: 'Total Tools', value: kpis.total, icon: WrenchIcon, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' },
    { label: 'Available', value: kpis.available, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Checked Out', value: kpis.checkedOut, icon: ArrowRightLeft, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Needs Repair', value: kpis.inRepair, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  const filtered = tools.filter((t: any) => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.toolCode?.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!form.name || !form.category) { toast.error('Tool name and category are required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/api/tools', { ...form });
      if (res.success) {
        toast.success('Tool added successfully');
        setCreateOpen(false);
        setForm({ name: '', category: '', location: '', serialNumber: '', condition: '' });
        fetchTools();
      } else {
        toast.error(res.error || 'Failed to add tool');
      }
    } catch { toast.error('Failed to add tool'); }
    setSaving(false);
  };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Tools</h1><p className="text-muted-foreground mt-1">Manage maintenance tool inventory, assignments, and condition tracking</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(k => { const I = k.icon; return (
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
                    <div className="grid gap-2"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="Hand Tool">Hand Tool</SelectItem><SelectItem value="Power Tool">Power Tool</SelectItem><SelectItem value="Measurement">Measurement</SelectItem><SelectItem value="Safety">Safety</SelectItem><SelectItem value="Specialty">Specialty</SelectItem></SelectContent></Select></div>
                    <div className="grid gap-2"><Label className="text-xs">Condition</Label><Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid gap-2"><Label className="text-xs">Location</Label><Input placeholder="e.g. Tool Room A-1" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Serial Number</Label><Input placeholder="e.g. SN-2024-001" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Adding...' : 'Add Tool'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="filter-row flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search tools, locations..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="checked_out">Checked Out</SelectItem><SelectItem value="in_repair">In Repair</SelectItem><SelectItem value="retired">Retired</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="text-xs">Code</TableHead><TableHead className="text-xs">Tool Name</TableHead><TableHead className="text-xs hidden md:table-cell">Category</TableHead><TableHead className="text-xs hidden lg:table-cell">Location</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Assigned To</TableHead><TableHead className="text-xs hidden lg:table-cell">Checked Out</TableHead></TableRow></TableHeader><TableBody>
              {loading && <TableRow><TableCell colSpan={7}><div className="flex items-center justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></TableCell></TableRow>}
              {!loading && filtered.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{t.toolCode}</TableCell>
                  <TableCell className="font-medium text-sm">{t.name}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{t.category?.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-xs hidden lg:table-cell"><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{t.location || '-'}</div></TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] uppercase font-semibold ${toolStatusColors[t.status] || ''}`}>{t.status?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{t.assignedTo?.fullName || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(t.checkedOutAt)}</TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState icon={WrenchIcon} title="No tools found" description="Adjust your search or filter criteria" /></TableCell></TableRow>}
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [form, setForm] = useState({ code: '', name: '', type: '', zone: '', capacity: '', address: '' });

  const locationTypes = ['warehouse', 'staging', 'production', 'picking', 'receiving'];

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/inventory/locations');
      if (res.success) {
        setLocations(res.data || []);
        setKpis(res.kpis || {});
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const filtered = locations.filter((l: any) => {
    const matchSearch = l.code.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase()) || (l.address || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || l.type === filterType;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? l.isActive : !l.isActive);
    return matchSearch && matchType && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Locations', value: kpis.total || 0, icon: MapPin, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Active', value: kpis.active || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Inactive', value: kpis.inactive || 0, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Empty', value: locations.filter((l: any) => (l._count?.items || 0) === 0).length, icon: Box, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.type) { toast.error('Please fill in all required fields'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/inventory/locations', { name: form.name, code: form.code, type: form.type, address: form.address || null });
      if (res.success) { toast.success(`Location ${form.code} created successfully`); setCreateOpen(false); setForm({ code: '', name: '', type: '', zone: '', capacity: '', address: '' }); fetchLocations(); }
      else toast.error(res.error || 'Failed to create location');
    } catch { toast.error('Failed to create location'); } finally { setCreating(false); }
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
          <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Address</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell text-right">Items</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-48"><EmptyState icon={MapPin} title="No locations found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((l: any) => (
              <TableRow key={l.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{l.code}</TableCell>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{(l.type || '').replace('_', ' ')}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{l.address || '-'}</TableCell>
                <TableCell><Badge variant="outline" className={l.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>{l.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-right font-medium">{l._count?.items || 0}</TableCell>
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
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ item: '', location: '', type: '', quantityBefore: '', quantityAfter: '', reason: '' });

  const adjTypes = ['gain', 'loss', 'correction', 'write_off', 'damage', 'return'];

  const fetchAdjustments = useCallback(async () => {
    try {
      const [adjRes, itemRes] = await Promise.all([
        api.get<any>('/api/inventory/adjustments'),
        api.get<any>('/api/inventory'),
      ]);
      if (adjRes.success) { setAdjustments(adjRes.data || []); setKpis(adjRes.kpis || {}); }
      if (itemRes.success) setInventoryItems(itemRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

  const adjStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

  const filtered = adjustments.filter((a: any) => {
    const matchSearch = a.adjustmentNumber.toLowerCase().includes(search.toLowerCase()) || (a.item?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Adjustments', value: kpis.total || 0, icon: ArrowUpDown, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending Approval', value: kpis.pending || 0, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: kpis.approved || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Rejected', value: kpis.rejected || 0, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const handleCreate = async () => {
    if (!form.item || !form.type || !form.reason) { toast.error('Please fill in all required fields'); return; }
    setCreating(true);
    try {
      const selectedItem = inventoryItems.find((i: any) => i.id === form.item);
      const quantity = form.type === 'gain' || form.type === 'return'
        ? Math.abs(parseFloat(form.quantityAfter || '0') - parseFloat(form.quantityBefore || '0'))
        : Math.abs(parseFloat(form.quantityBefore || '0') - parseFloat(form.quantityAfter || '0'));
      const res = await api.post('/api/inventory/adjustments', {
        itemId: form.item,
        type: form.type === 'write_off' ? 'loss' : form.type === 'damage' ? 'loss' : form.type,
        quantity: quantity || 1,
        reason: form.reason,
        notes: form.location || null,
      });
      if (res.success) { toast.success('Adjustment created successfully'); setCreateOpen(false); setForm({ item: '', location: '', type: '', quantityBefore: '', quantityAfter: '', reason: '' }); fetchAdjustments(); }
      else toast.error(res.error || 'Failed to create adjustment');
    } catch { toast.error('Failed to create adjustment'); } finally { setCreating(false); }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await api.put(`/api/inventory/adjustments/${id}`, { action, type: action === 'approve' ? 'gain' : 'loss' });
      if (res.success) { toast.success(`Adjustment ${action}d`); fetchAdjustments(); }
      else toast.error(res.error || `Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
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
          <Table><TableHeader><TableRow><TableHead>Adj #</TableHead><TableHead>Item</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden sm:table-cell">Qty Change</TableHead><TableHead className="hidden md:table-cell">Reason</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Created By</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={ArrowUpDown} title="No adjustments found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map(a => (
              <TableRow key={a.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{a.adjustmentNumber}</TableCell>
                <TableCell className="font-medium">{a.item?.name || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{a.type?.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell font-medium">{a.type === 'gain' ? '+' : '-'}{a.quantity}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{a.reason}</TableCell>
                <TableCell><Badge variant="outline" className={adjStatusColors[a.status]}>{a.status?.replace('_', ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{a.createdBy?.fullName || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [form, setForm] = useState({ item: '', quantity: '', priority: '', description: '', notes: '' });

  const fetchRequests = useCallback(async () => {
    try {
      const [reqRes, itemRes] = await Promise.all([
        api.get<any>('/api/inventory/requests'),
        api.get<any>('/api/inventory'),
      ]);
      if (reqRes.success) { setRequests(reqRes.data || []); setKpis(reqRes.kpis || {}); }
      if (itemRes.success) setInventoryItems(itemRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const reqStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', partially_fulfilled: 'bg-sky-50 text-sky-700 border-sky-200', fulfilled: 'bg-teal-50 text-teal-700 border-teal-200', rejected: 'bg-red-50 text-red-700 border-red-200' };

  const filtered = requests.filter((r: any) => {
    const matchSearch = r.requestNumber?.toLowerCase().includes(search.toLowerCase()) || r.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchPriority = filterPriority === 'all' || r.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const kpiCards = [
    { label: 'Total Requests', value: kpis.total || 0, icon: FileText, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending', value: kpis.pending || 0, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: kpis.approved || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Fulfilled', value: kpis.fulfilled || 0, icon: Check, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const handleCreate = async () => {
    if (!form.item || !form.quantity || !form.priority) { toast.error('Please fill in all required fields'); return; }
    setCreating(true);
    try {
      const selectedItem = inventoryItems.find((i: any) => i.id === form.item);
      const res = await api.post('/api/inventory/requests', {
        title: selectedItem?.name || form.item,
        description: form.description || null,
        priority: form.priority,
        items: [{ itemId: form.item, quantity: parseFloat(form.quantity) || 1 }],
        notes: form.notes || null,
      });
      if (res.success) { toast.success('Request created successfully'); setCreateOpen(false); setForm({ item: '', quantity: '', priority: '', description: '', notes: '' }); fetchRequests(); }
      else toast.error(res.error || 'Failed to create request');
    } catch { toast.error('Failed to create request'); } finally { setCreating(false); }
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
          <Table><TableHeader><TableRow><TableHead>Req #</TableHead><TableHead>Title</TableHead><TableHead className="hidden sm:table-cell">Items</TableHead><TableHead className="hidden sm:table-cell">Requested By</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={7} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={FileText} title="No requests found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{r.requestNumber}</TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell className="hidden sm:table-cell">{r.items?.length || 0}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{r.requestedBy?.fullName || '-'}</TableCell>
                <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                <TableCell><Badge variant="outline" className={reqStatusColors[r.status]}>{r.status?.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Inventory Request</DialogTitle><DialogDescription>Submit a material requisition for inventory items.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Item *</Label><Select value={form.item} onValueChange={v => setForm({ ...form, item: v })}><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{inventoryItems.filter((i: any) => i.isActive).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.itemCode})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Priority *</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Purpose or description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Creating...' : 'Submit Request'}</Button>
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [form, setForm] = useState({ item: '', quantity: '', fromLocation: '', toLocation: '', notes: '' });

  const transferStatusColors: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', in_transit: 'bg-sky-50 text-sky-700 border-sky-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', cancelled: 'bg-slate-100 text-slate-600 border-slate-200' };

  const fetchTransfers = useCallback(async () => {
    try {
      const [txRes, itemRes, locRes] = await Promise.all([
        api.get<any>('/api/inventory/transfers'),
        api.get<any>('/api/inventory'),
        api.get<any>('/api/inventory/locations'),
      ]);
      if (txRes.success) { setTransfers(txRes.data || []); setKpis(txRes.kpis || {}); }
      if (itemRes.success) setInventoryItems(itemRes.data || []);
      if (locRes.success) setLocations(locRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const filtered = transfers.filter((t: any) => {
    const matchSearch = t.transferNumber?.toLowerCase().includes(search.toLowerCase()) || t.item?.name?.toLowerCase().includes(search.toLowerCase()) || t.fromLocation?.name?.toLowerCase().includes(search.toLowerCase()) || t.toLocation?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Transfers', value: kpis.total || 0, icon: Truck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending', value: (kpis.pending || 0) + (kpis.inTransit || 0), icon: ArrowRightLeft, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Completed', value: kpis.completed || 0, icon: CheckCircle2, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'Cancelled', value: kpis.cancelled || 0, icon: XCircle, color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' },
  ];

  const handleCreate = async () => {
    if (!form.item || !form.quantity || !form.fromLocation || !form.toLocation) { toast.error('Please fill in all required fields'); return; }
    if (form.fromLocation === form.toLocation) { toast.error('From and To locations cannot be the same'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/inventory/transfers', {
        itemId: form.item,
        quantity: parseFloat(form.quantity),
        fromLocationId: form.fromLocation,
        toLocationId: form.toLocation,
        notes: form.notes || null,
      });
      if (res.success) { toast.success('Transfer created successfully'); setCreateOpen(false); setForm({ item: '', quantity: '', fromLocation: '', toLocation: '', notes: '' }); fetchTransfers(); }
      else toast.error(res.error || 'Failed to create transfer');
    } catch { toast.error('Failed to create transfer'); } finally { setCreating(false); }
  };

  const handleAction = async (id: string, action: 'approve' | 'complete' | 'cancel') => {
    try {
      const res = await api.put(`/api/inventory/transfers/${id}`, { action });
      if (res.success) { toast.success(`Transfer ${action}d`); fetchTransfers(); }
      else toast.error(res.error || `Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
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
          <Table><TableHeader><TableRow><TableHead>Transfer #</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="hidden sm:table-cell">From</TableHead><TableHead className="hidden sm:table-cell">To</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead className="hidden lg:table-cell">Actions</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Truck} title="No transfers found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((t: any) => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{t.transferNumber}</TableCell>
                <TableCell className="font-medium">{t.item?.name || '-'}</TableCell>
                <TableCell className="font-medium">{t.quantity}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{t.fromLocation?.code || '-'}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{t.toLocation?.code || '-'}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={transferStatusColors[t.status]}>{t.status?.replace('_', ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {t.status === 'pending' && <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => handleAction(t.id, 'approve')}>Approve</Button>}
                  {t.status === 'in_transit' && <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => handleAction(t.id, 'complete')}>Complete</Button>}
                  {(t.status === 'pending' || t.status === 'in_transit') && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => handleAction(t.id, 'cancel')}>Cancel</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Inventory Transfer</DialogTitle><DialogDescription>Create a transfer request to move items between locations.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Item *</Label><Select value={form.item} onValueChange={v => setForm({ ...form, item: v })}><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{inventoryItems.filter((i: any) => i.isActive).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.itemCode})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>From Location *</Label><Select value={form.fromLocation} onValueChange={v => setForm({ ...form, fromLocation: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{locations.filter((l: any) => l.isActive).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>To Location *</Label><Select value={form.toLocation} onValueChange={v => setForm({ ...form, toLocation: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{locations.filter((l: any) => l.isActive).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Creating...' : 'Create Transfer'}</Button>
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [form, setForm] = useState({ name: '', code: '', contactPerson: '', email: '', phone: '', address: '', city: '', country: '', website: '', rating: '' });

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/suppliers');
      if (res.success) { setSuppliers(res.data || []); setKpis(res.kpis || {}); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const supplierStatusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', on_hold: 'bg-amber-50 text-amber-700 border-amber-200', inactive: 'bg-slate-100 text-slate-600 border-slate-200' };

  const filtered = suppliers.filter((s: any) => {
    const matchSearch = s.code?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase()) || s.contactPerson?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? s.isActive : !s.isActive);
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total Suppliers', value: kpis.total || 0, icon: Building, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Active', value: kpis.active || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Inactive', value: kpis.inactive || 0, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Top Rated', value: suppliers.filter((s: any) => s.rating >= 4).length, icon: Star, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  const handleCreate = async () => {
    if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/suppliers', {
        name: form.name,
        code: form.code,
        contactPerson: form.contactPerson || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        website: form.website || null,
        rating: form.rating ? parseInt(form.rating) : null,
      });
      if (res.success) { toast.success(`Supplier ${form.name} added successfully`); setCreateOpen(false); setForm({ name: '', code: '', contactPerson: '', email: '', phone: '', address: '', city: '', country: '', website: '', rating: '' }); fetchSuppliers(); }
      else toast.error(res.error || 'Failed to add supplier');
    } catch { toast.error('Failed to add supplier'); } finally { setCreating(false); }
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
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Company</TableHead><TableHead className="hidden sm:table-cell">Contact</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead className="hidden lg:table-cell">Rating</TableHead><TableHead>Status</TableHead><TableHead className="hidden xl:table-cell text-right">Items</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Building} title="No suppliers found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((s: any) => (
              <TableRow key={s.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{s.code}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{s.contactPerson || '-'}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.email || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell"><span className="text-amber-500">{'★'.repeat(s.rating || 0)}</span><span className="text-muted/30">{'★'.repeat(5 - (s.rating || 0))}</span></TableCell>
                <TableCell><Badge variant="outline" className={s.isActive ? supplierStatusColors.active : supplierStatusColors.inactive}>{s.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></TableCell>
                <TableCell className="hidden xl:table-cell text-right font-medium">{s._count?.items || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle><DialogDescription>Register a new supplier in the system.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Company Name *</Label><Input placeholder="SKF Industries" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Code *</Label><Input placeholder="SUP-0001" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contact Person</Label><Input placeholder="John Smith" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="john@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="+1-555-0100" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Rating (1-5)</Label><Input type="number" min="1" max="5" placeholder="4" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input placeholder="Full address..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>City</Label><Input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-2"><Label>Country</Label><Input placeholder="Country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Adding...' : 'Add Supplier'}</Button>
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [form, setForm] = useState({ supplier: '', priority: '', expectedDate: '', notes: '' });

  const fetchOrders = useCallback(async () => {
    try {
      const [poRes, supRes, itemRes] = await Promise.all([
        api.get<any>('/api/purchase-orders'),
        api.get<any>('/api/suppliers'),
        api.get<any>('/api/inventory'),
      ]);
      if (poRes.success) { setOrders(poRes.data || []); setKpis(poRes.kpis || {}); }
      if (supRes.success) setSuppliers(supRes.data || []);
      if (itemRes.success) setInventoryItems(itemRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const poStatusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600 border-slate-200', pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', partially_received: 'bg-sky-50 text-sky-700 border-sky-200', received: 'bg-teal-50 text-teal-700 border-teal-200', cancelled: 'bg-red-50 text-red-600 border-red-200' };

  const filtered = orders.filter((po: any) => {
    const matchSearch = po.poNumber?.toLowerCase().includes(search.toLowerCase()) || po.supplier?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || po.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpiCards = [
    { label: 'Total POs', value: kpis.total || 0, icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Pending', value: kpis.pending || 0, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Approved', value: kpis.approved || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Received', value: kpis.received || 0, icon: Check, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const handleCreate = async () => {
    if (!form.supplier || !form.priority) { toast.error('Supplier and priority are required'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/purchase-orders', {
        supplierId: form.supplier,
        priority: form.priority,
        expectedDelivery: form.expectedDate || null,
        notes: form.notes || null,
        items: [],
      });
      if (res.success) { toast.success('Purchase order created successfully'); setCreateOpen(false); setForm({ supplier: '', priority: '', expectedDate: '', notes: '' }); fetchOrders(); }
      else toast.error(res.error || 'Failed to create PO');
    } catch { toast.error('Failed to create PO'); } finally { setCreating(false); }
  };

  const handleAction = async (id: string, action: 'approve') => {
    try {
      const res = await api.post(`/api/purchase-orders/${id}/${action}`, {});
      if (res.success) { toast.success(`PO ${action}d`); fetchOrders(); }
      else toast.error(res.error || `Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
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
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="partially_received">Partial</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead className="hidden sm:table-cell">Items</TableHead><TableHead className="hidden sm:table-cell">Amount</TableHead><TableHead className="hidden md:table-cell">Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead><TableHead className="hidden lg:table-cell">Actions</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={ShoppingCart} title="No purchase orders found" description="Try adjusting your search or filters." /></TableCell></TableRow>
            ) : filtered.map((po: any) => (
              <TableRow key={po.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{po.poNumber}</TableCell>
                <TableCell className="font-medium">{po.supplier?.name || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">{po.items?.length || 0}</TableCell>
                <TableCell className="hidden sm:table-cell font-medium">${(po.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="hidden md:table-cell"><PriorityBadge priority={po.priority} /></TableCell>
                <TableCell><Badge variant="outline" className={poStatusColors[po.status]}>{po.status?.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(po.createdAt)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {po.status === 'draft' && <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => handleAction(po.id, 'approve')}>Approve</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle><DialogDescription>Create a new purchase order for inventory items.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Supplier *</Label><Select value={form.supplier} onValueChange={v => setForm({ ...form, supplier: v })}><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{suppliers.filter((s: any) => s.isActive).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Priority *</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Expected Date</Label><Input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Creating...' : 'Create PO'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function InventoryReceivingPage() {
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ purchaseOrder: '', itemId: '', quantity: '', condition: 'good', notes: '' });

  const fetchRecords = useCallback(async () => {
    try {
      const [recRes, poRes] = await Promise.all([
        api.get<any>('/api/receiving-records'),
        api.get<any>('/api/purchase-orders'),
      ]);
      if (recRes.success) { setRecords(recRes.data || []); setKpis(recRes.kpis || {}); }
      if (poRes.success) setPurchaseOrders(poRes.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const conditionColors: Record<string, string> = { good: 'bg-emerald-50 text-emerald-700 border-emerald-200', damaged: 'bg-amber-50 text-amber-700 border-amber-200', defective: 'bg-red-50 text-red-700 border-red-200' };

  const filtered = records.filter((r: any) => {
    const matchSearch = r.po?.poNumber?.toLowerCase().includes(search.toLowerCase()) || r.item?.name?.toLowerCase().includes(search.toLowerCase()) || r.item?.itemCode?.toLowerCase().includes(search.toLowerCase());
    const matchCondition = filterCondition === 'all' || r.condition === filterCondition;
    return matchSearch && matchCondition;
  });

  const kpiCards = [
    { label: 'Total GRNs', value: kpis.total || 0, icon: Download, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Good', value: kpis.good || 0, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Damaged', value: kpis.pending || 0, icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Defective', value: kpis.rejected || 0, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const handleCreate = async () => {
    if (!form.purchaseOrder || !form.itemId || !form.quantity) { toast.error('PO, item, and quantity are required'); return; }
    setCreating(true);
    try {
      const res = await api.post(`/api/purchase-orders/${form.purchaseOrder}/receive`, {
        itemId: form.itemId,
        quantityReceived: parseFloat(form.quantity),
        condition: form.condition,
        notes: form.notes || null,
      });
      if (res.success) { toast.success('Items received successfully'); setCreateOpen(false); setForm({ purchaseOrder: '', itemId: '', quantity: '', condition: 'good', notes: '' }); fetchRecords(); }
      else toast.error(res.error || 'Failed to receive items');
    } catch { toast.error('Failed to receive items'); } finally { setCreating(false); }
  };

  // Get available PO items (approved/partially_received) for the create form
  const availablePOItems = purchaseOrders.filter((po: any) => ['approved', 'partially_received'].includes(po.status)).flatMap((po: any) =>
    (po.items || []).map((pi: any) => ({
      ...pi,
      poId: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier?.name || '',
      remaining: (pi.quantity || 0) - (pi.quantityReceived || 0),
    }))
  ).filter((pi: any) => pi.remaining > 0);

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
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterCondition} onValueChange={setFilterCondition}><SelectTrigger className="w-44"><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="all">All Conditions</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="damaged">Damaged</SelectItem><SelectItem value="defective">Defective</SelectItem></SelectContent></Select>
      </div>
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto rounded border">
          <Table><TableHeader><TableRow><TableHead>PO #</TableHead><TableHead className="hidden sm:table-cell">Supplier</TableHead><TableHead>Item</TableHead><TableHead className="hidden sm:table-cell">Qty</TableHead><TableHead>Condition</TableHead><TableHead className="hidden md:table-cell">Received By</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Download} title="No receiving records found" description="Records will appear once items are received against purchase orders." /></TableCell></TableRow>
            ) : filtered.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell><Badge variant="outline" className="font-mono text-xs">{r.po?.poNumber || '-'}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell font-medium">{r.po?.supplier?.name || '-'}</TableCell>
                <TableCell className="font-medium">{r.item?.name || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell font-medium">{r.quantityReceived}</TableCell>
                <TableCell><Badge variant="outline" className={conditionColors[r.condition]}>{r.condition?.toUpperCase()}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.receivedBy?.fullName || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>New Goods Receipt Note</DialogTitle><DialogDescription>Record received items against a purchase order.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>PO Item *</Label><Select value={form.purchaseOrder ? `${form.purchaseOrder}-${form.itemId}` : ''} onValueChange={v => { const [poId, itemId] = v.split('-'); setForm({ ...form, purchaseOrder: poId, itemId }); }}><SelectTrigger><SelectValue placeholder="Select PO item" /></SelectTrigger><SelectContent>
              {purchaseOrders.filter((po: any) => ['approved', 'partially_received'].includes(po.status)).map((po: any) => (
                <SelectItem key={po.id} value={`${po.id}`} className="font-mono text-xs">{po.poNumber} — {po.supplier?.name}</SelectItem>
              ))}
            </SelectContent></Select></div>
            {form.purchaseOrder && form.itemId && <div className="text-xs text-muted-foreground bg-muted rounded-md p-2">Item: {availablePOItems.find((pi: any) => pi.id === form.itemId && pi.poId === form.purchaseOrder)?.item?.name || 'Select an item'} — Remaining: {availablePOItems.find((pi: any) => pi.id === form.itemId && pi.poId === form.purchaseOrder)?.remaining || 0}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Condition</Label><Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="good">Good</SelectItem><SelectItem value="damaged">Damaged</SelectItem><SelectItem value="defective">Defective</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Any observations, discrepancies, or special instructions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Receiving...' : 'Receive Items'}</Button>
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
  const [devices, setDevices] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({ total: 0, online: 0, offline: 0, warning: 0, error: 0, alerting: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProtocol, setFilterProtocol] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<any>(null);
  const [detailReadings, setDetailReadings] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: 'sensor', location: '', protocol: 'MQTT', parameter: '', unit: '', groupId: '' });

  const fetchDevices = useCallback(() => {
    api.get('/api/iot/devices').then(res => {
      if (res.success) {
        setDevices(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const filtered = useMemo(() => devices.filter(d => {
    const q = searchText.toLowerCase();
    if (q && !d.name.toLowerCase().includes(q) && !(d.deviceCode || '').toLowerCase().includes(q) && !(d.location || '').toLowerCase().includes(q)) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterProtocol !== 'all' && d.protocol !== filterProtocol.toLowerCase()) return false;
    return true;
  }), [devices, searchText, filterType, filterStatus, filterProtocol]);

  const handleCreate = async () => {
    if (!newDevice.name.trim()) { toast.error('Device name is required'); return; }
    if (!newDevice.parameter.trim()) { toast.error('Parameter is required'); return; }
    if (!newDevice.unit.trim()) { toast.error('Unit is required'); return; }
    setCreating(true);
    const res = await api.post('/api/iot/devices', newDevice);
    setCreating(false);
    if (res.success) {
      toast.success('Device registered successfully');
      setCreateOpen(false);
      setNewDevice({ name: '', type: 'sensor', location: '', protocol: 'MQTT', parameter: '', unit: '', groupId: '' });
      fetchDevices();
    } else {
      toast.error(res.error || 'Failed to register device');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/iot/devices/${id}`);
    if (res.success) {
      toast.success('Device removed');
      setDevices(p => p.filter(d => d.id !== id));
      if (detailDevice?.id === id) setDetailDevice(null);
    } else {
      toast.error(res.error || 'Failed to remove device');
    }
  };

  const handleViewDetail = async (d: any) => {
    setDetailDevice(d);
    setDetailLoading(true);
    const res = await api.get(`/api/iot/devices/${d.id}`);
    if (res.success && res.data) {
      setDetailDevice(res.data);
      setDetailReadings(res.data.readings || []);
    }
    setDetailLoading(false);
  };

  const statusColor: Record<string, string> = { online: 'bg-emerald-50 text-emerald-700 border-emerald-200', offline: 'bg-slate-100 text-slate-500 border-slate-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', error: 'bg-red-50 text-red-700 border-red-200', maintenance: 'bg-sky-50 text-sky-700 border-sky-200' };
  const statusDot: Record<string, string> = { online: 'bg-emerald-500', offline: 'bg-slate-400', warning: 'bg-amber-500', error: 'bg-red-500', maintenance: 'bg-sky-500' };
  const typeIcon: Record<string, any> = { sensor: Thermometer, gateway: Wifi, actuator: Cpu, controller: Settings2 };

  const signalLabel = (s: number | null | undefined) => s == null ? 'N/A' : s >= 80 ? 'Strong' : s >= 60 ? 'Good' : s >= 40 ? 'Medium' : 'Weak';

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
                <div className="space-y-2"><Label>Type *</Label><Select value={newDevice.type} onValueChange={v => setNewDevice({ ...newDevice, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sensor">Sensor</SelectItem><SelectItem value="gateway">Gateway</SelectItem><SelectItem value="controller">Controller</SelectItem><SelectItem value="actuator">Actuator</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Protocol *</Label><Select value={newDevice.protocol} onValueChange={v => setNewDevice({ ...newDevice, protocol: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MQTT">MQTT</SelectItem><SelectItem value="HTTP">HTTP</SelectItem><SelectItem value="Modbus">Modbus</SelectItem><SelectItem value="OPC-UA">OPC-UA</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input placeholder="Building A, Room 101" value={newDevice.location} onChange={e => setNewDevice({ ...newDevice, location: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Parameter *</Label><Input placeholder="Temperature" value={newDevice.parameter} onChange={e => setNewDevice({ ...newDevice, parameter: e.target.value })} /></div>
                <div className="space-y-2"><Label>Unit *</Label><Input placeholder="°C" value={newDevice.unit} onChange={e => setNewDevice({ ...newDevice, unit: e.target.value })} /></div>
                <div className="space-y-2"><Label>Group</Label><Input placeholder="Environmental" value={newDevice.groupId} onChange={e => setNewDevice({ ...newDevice, groupId: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Registering...' : 'Register Device'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Devices', value: kpis.total, icon: Smartphone, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-400' },
          { label: 'Online', value: kpis.online, icon: Wifi, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Offline', value: kpis.offline, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
          { label: 'Alerting', value: kpis.alerting, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      <div className="filter-row flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search devices..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="sensor">Sensor</SelectItem><SelectItem value="gateway">Gateway</SelectItem><SelectItem value="controller">Controller</SelectItem><SelectItem value="actuator">Actuator</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="error">Error</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select>
        <Select value={filterProtocol} onValueChange={setFilterProtocol}><SelectTrigger className="w-36"><SelectValue placeholder="Protocol" /></SelectTrigger><SelectContent><SelectItem value="all">All Protocols</SelectItem><SelectItem value="MQTT">MQTT</SelectItem><SelectItem value="HTTP">HTTP</SelectItem><SelectItem value="Modbus">Modbus</SelectItem><SelectItem value="OPC-UA">OPC-UA</SelectItem></SelectContent></Select>
      </div>

      <Card className="border-0 shadow-sm">
        <Table><TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Device</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Location</TableHead><TableHead className="hidden md:table-cell">Protocol</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Last Seen</TableHead><TableHead className="hidden xl:table-cell">Battery</TableHead><TableHead className="hidden xl:table-cell">Signal</TableHead><TableHead className="w-12"></TableHead>
        </TableRow></TableHeader><TableBody>
          {loading && <TableRow><TableCell colSpan={9}><div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></TableCell></TableRow>}
          {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={9}><EmptyState icon={Smartphone} title="No devices found" description="Try adjusting your search or filters, or register a new device." /></TableCell></TableRow>}
          {!loading && filtered.map(d => { const TI = typeIcon[d.type] || Smartphone; const sig = signalLabel(d.signalStrength); return (
            <TableRow key={d.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => handleViewDetail(d)}>
              <TableCell><div className="flex items-center gap-2"><TI className="h-4 w-4 text-muted-foreground shrink-0" /><div><p className="font-medium text-sm">{d.name}</p><p className="text-xs text-muted-foreground font-mono">{d.deviceCode || d.id}</p></div></div></TableCell>
              <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{d.type}</Badge></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{d.location || '-'}</TableCell>
              <TableCell className="hidden md:table-cell"><Badge variant="secondary" className="font-mono text-xs uppercase">{d.protocol}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`${statusColor[d.status] || ''} capitalize`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot[d.status] || 'bg-slate-400'} mr-1`} />{d.status}</Badge></TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{d.lastSeen ? timeAgo(d.lastSeen) : 'Never'}</TableCell>
              <TableCell className="hidden xl:table-cell">{d.batteryLevel != null ? <div className="flex items-center gap-2"><div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${d.batteryLevel <= 20 ? 'bg-red-500' : d.batteryLevel <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${d.batteryLevel}%` }} /></div><span className="text-xs font-medium">{d.batteryLevel}%</span></div> : <span className="text-xs text-muted-foreground">Wired</span>}</TableCell>
              <TableCell className="hidden xl:table-cell"><Badge variant="outline" className={`text-xs ${sig === 'Strong' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : sig === 'Good' || sig === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : sig === 'Weak' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{sig}</Badge></TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={e => { e.stopPropagation(); handleViewDetail(d); }}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={e => { e.stopPropagation(); handleDelete(d.id); }}><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ); })}
        </TableBody></Table>
      </Card>

      <Dialog open={!!detailDevice} onOpenChange={() => setDetailDevice(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {detailDevice && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2">{detailDevice.name}<Badge variant="outline" className={`${statusColor[detailDevice.status] || ''} capitalize ml-2`}>{detailDevice.status}</Badge></DialogTitle><DialogDescription className="font-mono text-xs">{detailDevice.deviceCode || detailDevice.id}</DialogDescription></DialogHeader>
            {detailLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (<>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[['Type', detailDevice.type], ['Protocol', detailDevice.protocol?.toUpperCase()], ['Location', detailDevice.location || '-'], ['Asset', detailDevice.asset?.name || '-'], ['Group', detailDevice.groupId || '-'], ['Last Seen', detailDevice.lastSeen ? timeAgo(detailDevice.lastSeen) : 'Never'], ['Battery', detailDevice.batteryLevel != null ? `${detailDevice.batteryLevel}%` : 'Wired'], ['Signal', signalLabel(detailDevice.signalStrength)], ['Parameter', detailDevice.parameter], ['Last Reading', detailDevice.lastReading != null ? `${detailDevice.lastReading} ${detailDevice.unit}` : 'No data'], ['Threshold', (detailDevice.thresholdMin != null || detailDevice.thresholdMax != null) ? `${detailDevice.thresholdMin ?? '—'} ~ ${detailDevice.thresholdMax ?? '—'} ${detailDevice.unit}` : '-'], ['Readings', `${detailDevice._count?.readings ?? 0}`], ['Alerts', `${detailDevice._count?.alerts ?? 0}`]].map(([label, val]) => (
                <div key={label} className="flex justify-between p-2 rounded-lg bg-muted/30"><span className="text-muted-foreground">{label as string}</span><span className="font-medium">{label === 'Type' ? <span className="capitalize">{val as string}</span> : val as string}</span></div>
              ))}
            </div>
            {detailReadings.length > 0 && (<div className="mt-2">
              <p className="text-sm font-medium mb-2">Recent Readings</p>
              <ChartContainer config={{ value: { label: detailDevice.parameter, color: '#10b981' } }} className="h-[200px] w-full">
                <AreaChart data={[...detailReadings].reverse().map((r: any) => ({ hour: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: r.value }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(detailReadings.length / 6) - 1)} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </div>)}
            </>)}
            <DialogFooter><Button variant="outline" onClick={() => handleDelete(detailDevice.id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4 mr-1.5" />Remove Device</Button><Button variant="outline" onClick={() => setDetailDevice(null)}>Close</Button></DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IotMonitoringPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(() => {
    api.get('/api/iot/monitoring/summary').then(res => {
      if (res.success && res.data) {
        setSummary(res.data);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const devicesWithReadings = summary?.devicesWithReadings || [];
  const recentAlerts = summary?.alerts?.recent || [];

  // Build chart data from actual readings grouped by parameter
  const chartData = useMemo(() => {
    if (!devicesWithReadings.length) return [];
    const paramMap: Record<string, { hour: string } & Record<string, number>>[] = [];
    const allTimestamps = new Set<string>();

    devicesWithReadings.forEach((d: any) => {
      (d.readings || []).forEach((r: any) => {
        allTimestamps.add(new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      });
    });

    const sortedHours = [...allTimestamps].sort();
    const paramColors: Record<string, string> = { Temperature: '#ef4444', Pressure: '#f59e0b', Humidity: '#06b6d4', Current: '#a855f7', Vibration: '#f97316', pH: '#14b8a6' };

    return sortedHours.map(hour => {
      const point: Record<string, string | number> = { hour };
      devicesWithReadings.forEach((d: any) => {
        const reading = (d.readings || []).find((r: any) => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) === hour);
        if (reading && d.parameter) {
          point[d.parameter] = reading.value;
        }
      });
      return point;
    });
  }, [devicesWithReadings]);

  const uniqueParams = useMemo(() => {
    const params = new Set<string>();
    devicesWithReadings.forEach((d: any) => { if (d.parameter) params.add(d.parameter); });
    return [...params];
  }, [devicesWithReadings]);

  const activityConfig = useMemo(() => {
    const colors: Record<string, string> = { Temperature: '#ef4444', Pressure: '#f59e0b', Humidity: '#06b6d4', Current: '#a855f7', Vibration: '#f97316', pH: '#14b8a6' };
    const cfg: Record<string, { label: string; color: string }> = {};
    uniqueParams.forEach(p => { cfg[p] = { label: p, color: colors[p] || '#10b981' }; });
    return cfg;
  }, [uniqueParams]);

  const severityStyle: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 border-red-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', info: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  const severityIcon: Record<string, any> = { critical: AlertCircle, warning: AlertTriangle, info: Info };

  const operatorSymbol: Record<string, string> = { gt: '>', lt: '<', gte: '≥', lte: '≤', eq: '=' };

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">IoT Monitoring</h1><p className="text-muted-foreground text-sm mt-1">Real-time monitoring dashboard for all connected IoT devices and sensor data</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Active Sensors', value: summary?.devices?.activeSensors ?? 0, icon: Radio, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Active Alerts', value: summary?.alerts?.active ?? 0, icon: BellRing, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
          { label: 'Data Points', value: summary?.readingsToday ?? 0, icon: Activity, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Active Rules', value: summary?.activeRules ?? 0, icon: Gauge, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      {chartData.length > 0 && (<Card className="border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"><Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><CardTitle className="text-base font-semibold">Sensor Activity</CardTitle><CardDescription className="text-xs mt-0.5">Multi-parameter trend across connected sensors</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={activityConfig} className="h-[300px] w-full">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(chartData.length / 8) - 1)} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {uniqueParams.map((p, i) => {
                const colors: Record<string, string> = { Temperature: '#ef4444', Pressure: '#f59e0b', Humidity: '#06b6d4', Current: '#a855f7', Vibration: '#f97316', pH: '#14b8a6' };
                return <Area key={p} type="monotone" dataKey={p} stroke={colors[p] || '#10b981'} fill={colors[p] || '#10b981'} fillOpacity={0.08} strokeWidth={2} connectNulls />;
              })}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>)}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Live Sensor Readings</h2>
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {devicesWithReadings.length === 0 && <div className="col-span-full"><EmptyState icon={Radio} title="No sensor data" description="Register devices and submit readings to see live data here." /></div>}
            {devicesWithReadings.map((d: any) => {
              const readings = d.readings || [];
              const lastVal = readings[0]?.value;
              const prevVal = readings[1]?.value;
              const threshold = d.rules?.[0]?.threshold ?? d.thresholdMax;
              const isOver = threshold != null && lastVal != null && lastVal >= threshold;
              const hasTrend = lastVal != null && prevVal != null;
              const trend = hasTrend ? (lastVal > prevVal ? 'up' : lastVal < prevVal ? 'down' : 'stable') : 'stable';
              const TrendI = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
              const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-500' : 'text-slate-400';
              const sparkline = readings.slice(0, 10).reverse().map((r: any) => r.value);
              return (
                <Card key={d.id} className={`border ${isOver ? 'border-red-200 bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">{d.name}</p>
                      <TrendI className={`h-3.5 w-3.5 ${trendColor}`} />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-bold ${isOver ? 'text-red-600' : ''}`}>{lastVal != null ? lastVal : '—'}</span>
                      <span className="text-xs text-muted-foreground">{d.unit}</span>
                    </div>
                    {sparkline.length > 1 && <div className="mt-2 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkline.map((v, i) => ({ i, v }))}>
                          <Area type="monotone" dataKey="v" stroke={isOver ? '#ef4444' : '#10b981'} fill={isOver ? '#ef4444' : '#10b981'} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>}
                    <p className="text-[10px] text-muted-foreground">Threshold: {threshold != null ? `${threshold} ${d.unit}` : 'Not set'}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Alerts</h2>
          <Card className="border">
            <CardContent className="p-4">
              {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {recentAlerts.length === 0 && <EmptyState icon={BellRing} title="No active alerts" description="Alerts will appear here when sensor thresholds are breached." />}
                {recentAlerts.map((a: any) => {
                  const SI = severityIcon[a.severity] || Info;
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`h-7 w-7 rounded-lg ${severityStyle[a.severity] || ''} flex items-center justify-center shrink-0 mt-0.5`}><SI className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5"><span className="font-medium text-xs truncate">{a.device?.name || 'Unknown'}</span><Badge variant="outline" className={`text-[10px] capitalize ${severityStyle[a.severity] || ''}`}>{a.severity}</Badge></div>
                        <p className="text-[11px] text-muted-foreground">{a.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IotRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', deviceId: '', parameter: '', operator: 'gt' as string, threshold: '', severity: 'warning' as string, cooldownMinutes: '5' });

  const fetchRules = useCallback(() => {
    Promise.all([
      api.get('/api/iot/rules'),
      api.get('/api/iot/devices?limit=100'),
    ]).then(([rulesRes, devicesRes]) => {
      if (rulesRes.success) setRules(rulesRes.data || []);
      if (devicesRes.success) setDevices(devicesRes.data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const stats = useMemo(() => ({
    total: rules.length, active: rules.filter(r => r.isActive).length,
    paused: rules.filter(r => !r.isActive).length, triggersToday: rules.reduce((s: number, r: any) => s + (r._count?.alerts ?? 0), 0),
  }), [rules]);

  const operatorSymbol: Record<string, string> = { gt: '>', lt: '<', gte: '≥', lte: '≤', eq: '=' };

  const handleCreate = async () => {
    if (!newRule.name.trim()) { toast.error('Rule name is required'); return; }
    if (!newRule.deviceId) { toast.error('Device is required'); return; }
    if (!newRule.threshold) { toast.error('Threshold is required'); return; }
    setCreating(true);
    const device = devices.find((d: any) => d.id === newRule.deviceId);
    const res = await api.post('/api/iot/rules', {
      name: newRule.name,
      deviceId: newRule.deviceId,
      parameter: newRule.parameter || device?.parameter || 'N/A',
      operator: newRule.operator,
      threshold: newRule.threshold,
      severity: newRule.severity,
      cooldownMinutes: newRule.cooldownMinutes,
    });
    setCreating(false);
    if (res.success) {
      toast.success('Rule created successfully');
      setCreateOpen(false);
      setNewRule({ name: '', deviceId: '', parameter: '', operator: 'gt', threshold: '', severity: 'warning', cooldownMinutes: '5' });
      fetchRules();
    } else {
      toast.error(res.error || 'Failed to create rule');
    }
  };

  const toggleRule = async (id: string) => {
    const rule = rules.find((r: any) => r.id === id);
    if (!rule) return;
    const newActive = !rule.isActive;
    const res = await api.put(`/api/iot/rules/${id}`, { toggleActive: newActive });
    if (res.success) {
      toast.success(`${rule.name} ${newActive ? 'activated' : 'paused'}`);
      fetchRules();
    } else {
      toast.error(res.error || 'Failed to toggle rule');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/iot/rules/${id}`);
    if (res.success) {
      toast.success('Rule deleted');
      setRules(p => p.filter(r => r.id !== id));
    } else {
      toast.error(res.error || 'Failed to delete rule');
    }
  };

  const severityColor: Record<string, string> = { warning: 'bg-amber-50 text-amber-700 border-amber-200', critical: 'bg-red-50 text-red-700 border-red-200', info: 'bg-sky-50 text-sky-700 border-sky-200' };
  const severityIcon: Record<string, any> = { warning: AlertTriangle, critical: AlertCircle, info: Info };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">IoT Rules</h1><p className="text-muted-foreground text-sm mt-1">Configure automation rules and alert thresholds for IoT sensor data</p></div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-1.5" />Create Rule</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Create Automation Rule</DialogTitle><DialogDescription>Define conditions and actions for automated alerts.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2"><Label>Rule Name *</Label><Input placeholder="High Temperature Alert" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Device *</Label>
                <Select value={newRule.deviceId} onValueChange={v => { const dev = devices.find((d: any) => d.id === v); setNewRule({ ...newRule, deviceId: v, parameter: dev?.parameter || newRule.parameter }); }}>
                  <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                  <SelectContent>{devices.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.deviceCode})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Parameter</Label><Input placeholder="Temperature" value={newRule.parameter} onChange={e => setNewRule({ ...newRule, parameter: e.target.value })} /></div>
                <div className="space-y-2"><Label>Severity</Label><Select value={newRule.severity} onValueChange={v => setNewRule({ ...newRule, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Operator</Label><Select value={newRule.operator} onValueChange={v => setNewRule({ ...newRule, operator: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[['gt', '>'], ['lt', '<'], ['gte', '≥'], ['lte', '≤'], ['eq', '=']].map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Threshold *</Label><Input type="number" placeholder="85" value={newRule.threshold} onChange={e => setNewRule({ ...newRule, threshold: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cooldown (min)</Label><Input type="number" placeholder="5" value={newRule.cooldownMinutes} onChange={e => setNewRule({ ...newRule, cooldownMinutes: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? 'Creating...' : 'Create Rule'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: stats.total, icon: ClipboardList, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-400' },
          { label: 'Active', value: stats.active, icon: Play, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Paused', value: stats.paused, icon: Pause, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Total Alerts', value: stats.triggersToday, icon: Zap, color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
        ].map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (<div className="space-y-3">
        {rules.map((rule: any) => {
          const SI = severityIcon[rule.severity] || AlertTriangle;
          return (
            <Card key={rule.id} className={`border ${!rule.isActive ? 'opacity-70' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`h-9 w-9 rounded-lg ${severityColor[rule.severity] || severityColor.warning} flex items-center justify-center shrink-0 mt-0.5`}><SI className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{rule.name}</p>
                        <Badge variant="outline" className={rule.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>{rule.isActive ? 'Active' : 'Paused'}</Badge>
                        <Badge variant="outline" className={`text-[10px] capitalize ${severityColor[rule.severity] || ''}`}>{rule.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rule.device?.name || 'Unknown Device'} &mdash; When <span className="font-medium text-foreground">{rule.parameter}</span> {operatorSymbol[rule.operator] || rule.operator} <span className="font-semibold text-foreground">{rule.threshold} {rule.device?.unit || ''}</span></p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                        <span>Alerts: <span className="font-medium text-foreground">{rule._count?.alerts ?? 0}</span></span>
                        <span className="hidden sm:inline">Cooldown: <span className="font-medium text-foreground">{rule.cooldownMinutes}m</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.isActive} onCheckedChange={() => toggleRule(rule.id)} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleRule(rule.id)}>{rule.isActive ? <><Pause className="h-4 w-4 mr-2" />Pause</> : <><Play className="h-4 w-4 mr-2" />Activate</>}</DropdownMenuItem>
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
      </div>)}
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
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [assetRes, woRes] = await Promise.all([
          api.get('/api/assets?limit=9999'),
          api.get('/api/work-orders?limit=9999'),
        ]);
        if (assetRes.success && assetRes.data) setAssets(Array.isArray(assetRes.data) ? assetRes.data : []);
        if (woRes.success && woRes.data) setWorkOrders(Array.isArray(woRes.data) ? woRes.data : []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  // OEE data calculated from assets and work orders
  const operationalAssets = assets.filter((a: any) => a.status === 'operational').length;
  const activeAssets = assets.filter((a: any) => !['disposed', 'retired', 'decommissioned'].includes(a.status)).length;
  const totalAssets = activeAssets || 1;

  // Availability = operational assets / active assets * 100
  const availability = activeAssets > 0 ? Math.round((operationalAssets / totalAssets) * 100) : 0;

  // Performance = completed WOs on time / total completed WOs * 100
  const completedWOs = workOrders.filter((wo: any) => wo.status === 'completed' || wo.status === 'closed');
  const completedWithDue = completedWOs.filter((wo: any) => wo.plannedEnd);
  const onTimeWOs = completedWithDue.filter((wo: any) => wo.actualEnd && new Date(wo.actualEnd) <= new Date(wo.plannedEnd));
  const performance = completedWithDue.length > 0 ? Math.round((onTimeWOs.length / completedWithDue.length) * 100) : 0;

  // Quality = WOs completed without rework mentions / total completed * 100
  const reworkPattern = /rework|redo|repeat|refurbish|re-fix|rework required|defective/i;
  const withoutRework = completedWOs.filter((wo: any) => !(wo.notes && reworkPattern.test(wo.notes)) && !(wo.completionNotes && reworkPattern.test(wo.completionNotes)));
  const quality = completedWOs.length > 0 ? Math.round((withoutRework.length / completedWOs.length) * 100) : 0;

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

        {/* Top Losses - derived from work order data */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Loss Categories</CardTitle><CardDescription>Production loss analysis derived from asset and work order data</CardDescription></CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {(() => {
              const allWOs = workOrders;
              const unplannedHours = allWOs.filter((wo: any) => wo.type === 'corrective' || wo.type === 'emergency').reduce((s: number, wo: any) => s + (wo.actualHours || 0), 0);
              const plannedHours = allWOs.filter((wo: any) => wo.type === 'preventive').reduce((s: number, wo: any) => s + (wo.actualHours || 0), 0);
              const inspectionHours = allWOs.filter((wo: any) => wo.type === 'inspection').reduce((s: number, wo: any) => s + (wo.actualHours || 0), 0);
              const reworkHours = allWOs.filter((wo: any) => (wo.notes && reworkPattern.test(wo.notes)) || (wo.completionNotes && reworkPattern.test(wo.completionNotes))).reduce((s: number, wo: any) => s + (wo.actualHours || 0), 0);
              const totalLossHours = unplannedHours + plannedHours + inspectionHours + reworkHours || 1;
              const speedLossHours = totalLossHours > 0 ? totalLossHours * ((100 - performance) / 100) * 0.5 : 0;
              const minorStopHours = totalLossHours > 0 ? totalLossHours * 0.08 : 0;
              const grandTotal = unplannedHours + plannedHours + speedLossHours + reworkHours + inspectionHours + minorStopHours || 1;

              const losses = [
                { type: 'Unplanned Downtime', hours: Math.round(unplannedHours * 10) / 10, pct: Math.round((unplannedHours / grandTotal) * 100), color: 'bg-red-500' },
                { type: 'Speed Loss', hours: Math.round(speedLossHours * 10) / 10, pct: Math.round((speedLossHours / grandTotal) * 100), color: 'bg-amber-500' },
                { type: 'Planned Downtime', hours: Math.round(plannedHours * 10) / 10, pct: Math.round((plannedHours / grandTotal) * 100), color: 'bg-sky-500' },
                { type: 'Quality Rejects', hours: Math.round(reworkHours * 10) / 10, pct: Math.round((reworkHours / grandTotal) * 100), color: 'bg-orange-500' },
                { type: 'Setup / Changeover', hours: Math.round(inspectionHours * 10) / 10, pct: Math.round((inspectionHours / grandTotal) * 100), color: 'bg-violet-500' },
                { type: 'Minor Stops', hours: Math.round(minorStopHours * 10) / 10, pct: Math.round((minorStopHours / grandTotal) * 100), color: 'bg-teal-500' },
              ].filter(l => l.hours > 0).sort((a, b) => b.hours - a.hours);

              return losses.length > 0 ? losses.map(loss => (
                <div key={loss.type} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${loss.color} shrink-0`} />
                  <span className="text-sm flex-1 truncate">{loss.type}</span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{loss.hours}h</span>
                  <div className="w-20 bg-muted rounded-full h-2"><div className={`h-full rounded-full ${loss.color}`} style={{ width: `${loss.pct}%` }} /></div>
                  <span className="text-xs font-semibold w-10 text-right">{loss.pct}%</span>
                </div>
              )) : (
                <div className="text-sm text-muted-foreground text-center py-6">No loss data available from work orders</div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Asset-level OEE */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Asset OEE Scores</CardTitle><CardDescription>Estimated OEE per asset based on condition and status</CardDescription></CardHeader>
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
                  if (a.status === 'operational' && (a.condition === 'good' || a.condition === 'new')) estOee = 90;
                  else if (a.status === 'operational' && a.condition === 'fair') estOee = 70;
                  else if (a.status === 'operational' && a.condition === 'poor') estOee = 50;
                  else if (a.status === 'standby') estOee = 40;
                  else if (a.status === 'under_maintenance') estOee = 15;
                  else estOee = 0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.name || a.assetTag}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{typeof a.category === 'object' && a.category ? (a.category.name || a.category.code || '-') : (a.category || '-')}</TableCell>
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
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/meter-readings?limit=9999');
        if (res.success && res.data) setReadings(Array.isArray(res.data) ? res.data : []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  // Energy data from meter readings
  const UNIT_COST_RATE = 0.60;
  const totalConsumption = readings.reduce((sum: number, r: any) => sum + (r.consumption || 0), 0);
  const totalCost = Math.round(totalConsumption * UNIT_COST_RATE);
  const uniqueDays = new Set(readings.map((r: any) => {
    const d = new Date(r.readingDate);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })).size;
  const avgDailyConsumption = uniqueDays > 0 ? Math.round(totalConsumption / uniqueDays) : 0;
  const efficiencyScore = totalConsumption > 0 ? Math.min(95, Math.max(40, 100 - Math.round((readings.filter((r: any) => r.consumption && r.consumption > 0 && r.previousValue && r.previousValue > 0 && ((r.value - r.previousValue) / r.previousValue) > 0.15).length / Math.max(1, readings.filter((r: any) => r.consumption && r.consumption > 0).length)) * 30))) : 0;

  const summaryCards = [
    { label: 'Total Consumption', value: totalConsumption > 0 ? `${(totalConsumption / 1000).toFixed(1)} MWh` : '0 MWh', icon: Zap, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Total Cost', value: totalCost > 0 ? `$${(totalCost / 1000).toFixed(1)}k` : '$0', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Avg Daily', value: `${avgDailyConsumption} kWh`, icon: BarChart3, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Efficiency Score', value: `${efficiencyScore}%`, icon: Target, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  // Monthly consumption trend — group real readings by month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap: Record<string, number> = {};
  readings.forEach((r: any) => {
    if (!r.readingDate) return;
    const d = new Date(r.readingDate);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + (r.consumption || 0);
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, kwh]) => {
      const parts = key.split('-');
      return { month: monthNames[parseInt(parts[1], 10)] || key, kwh: Math.round(kwh), cost: Math.round(kwh * UNIT_COST_RATE) };
    });
  const maxKwh = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.kwh)) : 1;

  // Real meter readings for the table (show readings with consumption)
  const meterReadings = readings.filter((r: any) => r.consumption && r.consumption > 0).slice(0, 20).map((r: any) => ({
    id: r.id,
    meter: r.meterName || r.readingNumber || '-',
    reading: String(r.value),
    date: r.readingDate ? new Date(r.readingDate).toISOString().split('T')[0] : '-',
    consumption: Math.round(r.consumption),
    cost: Math.round(r.consumption * UNIT_COST_RATE),
  }));

  // Top consumers — group consumption by meter name
  const meterConsumption: Record<string, number> = {};
  readings.forEach((r: any) => {
    if (r.meterName && r.consumption && r.consumption > 0) {
      meterConsumption[r.meterName] = (meterConsumption[r.meterName] || 0) + r.consumption;
    }
  });
  const topConsumers = Object.entries(meterConsumption)
    .map(([name, consumption]) => ({ name, consumption: Math.round(consumption) }))
    .sort((a, b) => b.consumption - a.consumption)
    .slice(0, 8);
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
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Consumption Trend</CardTitle><CardDescription>kWh per month from meter readings</CardDescription></CardHeader>
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
        <CardHeader className="pb-3"><CardTitle className="text-base">Meter Readings</CardTitle><CardDescription>Latest meter readings and consumption data</CardDescription></CardHeader>
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
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ meter: '', value: '', unit: 'kWh', notes: '', readingDate: '' });
  const [kpis, setKpis] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>('/api/meter-readings').then(res => {
      if (res.success) {
        setReadings(res.data || []);
        if (res.kpis) {
          setKpis([
            { label: 'Total Readings', value: String(res.kpis.total || 0), icon: Gauge, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Meters Tracked', value: String(res.kpis.metersTracked || 0), icon: Activity, color: 'bg-sky-50 text-sky-600' },
            { label: 'This Month', value: String(res.kpis.thisMonth || 0), icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
            { label: 'With Consumption', value: String(res.kpis.withConsumption || 0), icon: TrendingUp, color: 'bg-violet-50 text-violet-600' },
          ]);
        }
      }
      setLoading(false);
    });
  }, []);

  const filtered = searchText.trim() ? readings.filter(r => {
    const q = searchText.toLowerCase();
    return (r.meterName || '').toLowerCase().includes(q) || (r.readingNumber || '').toLowerCase().includes(q) || (r.unit || '').toLowerCase().includes(q) || (r.notes || '').toLowerCase().includes(q);
  }) : readings;

  const getReadingStatus = (r: any) => {
    if (!r.consumption || r.consumption === 0) return 'normal';
    if (r.previousValue && r.previousValue > 0) {
      const pct = ((r.value - r.previousValue) / r.previousValue) * 100;
      if (Math.abs(pct) > 20) return 'critical';
      if (Math.abs(pct) > 10) return 'warning';
    }
    return 'normal';
  };
  const getChangePct = (r: any) => {
    if (!r.previousValue || r.previousValue === 0) return 0;
    return ((r.value - r.previousValue) / r.previousValue) * 100;
  };

  const statusColor = (s: string) => s === 'normal' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'warning' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  const handleCreate = async () => {
    setSaving(true);
    const res = await api.post('/api/meter-readings', {
      meterName: form.meter,
      value: Number(form.value),
      unit: form.unit,
      readingDate: form.readingDate || new Date().toISOString().split('T')[0],
      notes: form.notes || undefined,
    });
    if (res.success) {
      toast.success('Reading recorded successfully');
      setReadings(prev => [res.data, ...prev]);
      setCreateOpen(false);
      setForm({ meter: '', value: '', unit: 'kWh', notes: '', readingDate: '' });
    } else {
      toast.error(res.error || 'Failed to record reading');
    }
    setSaving(false);
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Meter Readings</h1><p className="text-muted-foreground mt-1">Record and track meter/gauge readings for utility meters and equipment</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Reading</Button>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
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
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Meter Name</TableHead><TableHead className="hidden md:table-cell">Unit</TableHead><TableHead className="text-right">Reading Value</TableHead><TableHead className="hidden sm:table-cell text-right">Previous</TableHead><TableHead className="text-right">Change</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={Gauge} title="No meter readings found" description="Record a new reading to get started." /></TableCell></TableRow>
          ) : filtered.map(r => {
            const change = getChangePct(r);
            const status = getReadingStatus(r);
            return (
            <TableRow key={r.id} className="hover:bg-muted/30">
              <TableCell className="font-mono text-xs">{r.readingNumber || r.id.slice(0, 8)}</TableCell>
              <TableCell className="font-medium">{r.meterName}</TableCell>
              <TableCell className="hidden md:table-cell"><Badge variant="outline">{r.unit}</Badge></TableCell>
              <TableCell className="text-right font-medium">{r.value.toLocaleString()} <span className="text-xs text-muted-foreground">{r.unit}</span></TableCell>
              <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{r.previousValue !== null ? r.previousValue.toLocaleString() : '-'}</TableCell>
              <TableCell className={`text-right font-medium ${r.previousValue ? (change > 0 ? 'text-red-600' : 'text-emerald-600') : 'text-muted-foreground'}`}>{r.previousValue ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(r.readingDate)}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(status)}><span className="capitalize">{status}</span></Badge></TableCell>
            </TableRow>
          ); })}
        </TableBody></Table></div>
      </CardContent></Card>
      </>)}
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
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'safety', instructor: '', duration: '', description: '' });
  const [kpis, setKpis] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>('/api/training-courses').then(res => {
      if (res.success) {
        setCourses(res.data || []);
        if (res.kpis) {
          setKpis([
            { label: 'Total Courses', value: String(res.kpis.total || 0), icon: GraduationCap, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Active', value: String(res.kpis.active || 0), icon: Play, color: 'bg-sky-50 text-sky-600' },
            { label: 'Archived', value: String(res.kpis.completed || 0), icon: CheckCircle2, color: 'bg-amber-50 text-amber-600' },
            { label: 'Certifications', value: String(res.kpis.withCertification || 0), icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
          ]);
        }
      }
      setLoading(false);
    });
  }, []);

  const filtered = searchText.trim() ? courses.filter(c => {
    const q = searchText.toLowerCase();
    return (c.title || '').toLowerCase().includes(q) || (c.instructor || '').toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q);
  }) : courses;
  const statusColor = (s: string) => s === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'upcoming' ? 'text-sky-600 bg-sky-50 border-sky-200' : s === 'completed' || s === 'archived' ? 'text-slate-600 bg-slate-50 border-slate-200' : 'text-red-600 bg-red-50 border-red-200';
  const categoryColor = (c: string) => c === 'safety' ? 'text-red-600 bg-red-50 border-red-200' : c === 'technical' ? 'text-sky-600 bg-sky-50 border-sky-200' : c === 'compliance' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-violet-600 bg-violet-50 border-violet-200';
  const handleCreate = async () => {
    if (!form.name) { toast.error('Course name is required'); return; }
    setSaving(true);
    const res = await api.post('/api/training-courses', {
      title: form.name,
      category: form.category,
      type: 'classroom',
      durationHours: parseFloat(form.duration) || 1,
      instructor: form.instructor || undefined,
      description: form.description || undefined,
    });
    if (res.success) {
      toast.success('Course created successfully');
      setCourses(prev => [res.data, ...prev]);
      setCreateOpen(false);
      setForm({ name: '', category: 'safety', instructor: '', duration: '', description: '' });
    } else {
      toast.error(res.error || 'Failed to create course');
    }
    setSaving(false);
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Training</h1><p className="text-muted-foreground mt-1">Manage employee training records, certifications, and compliance</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Course</Button>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
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
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Category</TableHead><TableHead className="hidden md:table-cell">Instructor</TableHead><TableHead className="hidden sm:table-cell">Duration</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead>Certification</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="h-48"><EmptyState icon={GraduationCap} title="No training courses found" description="Create a new course to get started." /></TableCell></TableRow>
          ) : filtered.map(c => (
            <TableRow key={c.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{c.title}</TableCell>
              <TableCell><Badge variant="outline" className={categoryColor(c.category)}><span className="capitalize">{c.category}</span></Badge></TableCell>
              <TableCell className="text-sm hidden md:table-cell">{c.instructor || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{c.durationHours}h</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden sm:table-cell capitalize">{(c.type || '').replace(/_/g, ' ')}</TableCell>
              <TableCell>{c.certification ? <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Yes</Badge> : <Badge variant="outline" className="text-muted-foreground">No</Badge>}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(c.status)}><span className="capitalize">{c.status}</span></Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      </>)}
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
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'safety', description: '', questions: '', expiryDate: '' });
  const [kpis, setKpis] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>('/api/surveys').then(res => {
      if (res.success) {
        setSurveys(res.data || []);
        if (res.kpis) {
          const completionRate = res.kpis.total > 0 ? Math.round((res.kpis.active / res.kpis.total) * 100) : 0;
          setKpis([
            { label: 'Total Surveys', value: String(res.kpis.total || 0), icon: ClipboardList, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Active', value: String(res.kpis.active || 0), icon: Play, color: 'bg-sky-50 text-sky-600' },
            { label: 'Responses', value: String(res.kpis.totalResponses || 0), icon: Users, color: 'bg-amber-50 text-amber-600' },
            { label: 'Completion Rate', value: `${completionRate}%`, icon: Target, color: 'bg-violet-50 text-violet-600' },
          ]);
        }
      }
      setLoading(false);
    });
  }, []);

  const filtered = searchText.trim() ? surveys.filter(s => {
    const q = searchText.toLowerCase();
    return (s.title || '').toLowerCase().includes(q) || (s.type || '').toLowerCase().includes(q) || (s.status || '').toLowerCase().includes(q);
  }) : surveys;
  const statusColor = (s: string) => s === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s === 'draft' ? 'text-slate-600 bg-slate-50 border-slate-200' : 'text-sky-600 bg-sky-50 border-sky-200';
  const typeColor = (t: string) => t === 'safety' ? 'text-red-600 bg-red-50 border-red-200' : t === 'compliance' ? 'text-amber-600 bg-amber-50 border-amber-200' : t === 'audit' ? 'text-sky-600 bg-sky-50 border-sky-200' : 'text-violet-600 bg-violet-50 border-violet-200';
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    setSaving(true);
    const res = await api.post('/api/surveys', {
      title: form.title,
      type: form.type,
      description: form.description || undefined,
      questions: form.questions || undefined,
    });
    if (res.success) {
      toast.success('Survey created successfully');
      setSurveys(prev => [res.data, ...prev]);
      setCreateOpen(false);
      setForm({ title: '', type: 'safety', description: '', questions: '', expiryDate: '' });
    } else {
      toast.error(res.error || 'Failed to create survey');
    }
    setSaving(false);
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Surveys</h1><p className="text-muted-foreground mt-1">Create and conduct safety, compliance, and operational surveys</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Survey</Button>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
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
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Responses</TableHead><TableHead>Target Group</TableHead><TableHead className="hidden md:table-cell">Created</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-48"><EmptyState icon={ClipboardList} title="No surveys found" description="Create a new survey to get started." /></TableCell></TableRow>
          ) : filtered.map(s => (
            <TableRow key={s.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{s.title}</TableCell>
              <TableCell><Badge variant="outline" className={typeColor(s.type)}><span className="capitalize">{s.type}</span></Badge></TableCell>
              <TableCell><Badge variant="outline" className={statusColor(s.status)}><span className="capitalize">{s.status}</span></Badge></TableCell>
              <TableCell className="text-right">{s.totalResponses || 0}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.targetGroup || 'All'}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(s.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      </>)}
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
    (wo.timeLogs || []).map((tl: any) => ({
      ...tl,
      woNumber: wo.woNumber,
      woTitle: wo.title,
      userName: tl.user?.fullName || 'Unknown',
      timestamp: tl.timestamp,
    }))
  ).sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());

  const filtered = searchText.trim() ? allTimeLogs.filter(tl => {
    const q = searchText.toLowerCase();
    return (tl.woNumber || '').toLowerCase().includes(q) || (tl.userName || '').toLowerCase().includes(q) || (tl.action || '').toLowerCase().includes(q);
  }) : allTimeLogs;

  const totalEntries = allTimeLogs.length;
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisWeekCount = allTimeLogs.filter(tl => { const d = new Date(tl.timestamp || tl.createdAt); return d >= weekStart; }).length;
  const thisMonthCount = allTimeLogs.filter(tl => { const d = new Date(tl.timestamp || tl.createdAt); return d >= monthStart; }).length;

  const techEntries: Record<string, number> = {};
  allTimeLogs.forEach(tl => {
    const name = tl.userName || 'Unknown';
    techEntries[name] = (techEntries[name] || 0) + 1;
  });
  const topTech = Object.entries(techEntries).sort((a, b) => b[1] - a[1])[0];

  const summaryCards = [
    { label: 'Total Log Entries', value: String(totalEntries), icon: Clock, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'This Week', value: String(thisWeekCount), icon: Calendar, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'This Month', value: String(thisMonthCount), icon: Timer, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
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
        <Card className="border-0 shadow-sm"><Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead className="hidden sm:table-cell">User</TableHead><TableHead>Action</TableHead><TableHead className="hidden md:table-cell">Notes</TableHead><TableHead className="hidden lg:table-cell">Timestamp</TableHead><TableHead className="hidden lg:table-cell">Date</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-48"><EmptyState icon={Clock} title="No time logs found" description="Time logs will appear once work order time tracking is used." /></TableCell></TableRow>
          ) : filtered.slice(0, 50).map((tl, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="font-mono text-xs">{tl.woNumber}</TableCell>
              <TableCell className="text-sm hidden sm:table-cell">{tl.userName || '-'}</TableCell>
              <TableCell className="text-sm capitalize">{(tl.action || '').replace(/_/g, ' ')}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{tl.notes || '-'}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{tl.timestamp ? formatDateTime(tl.timestamp) : '-'}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatDate(tl.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></Card>
      </>)}
    </div>
  );
}
function OperationsShiftHandoverPage() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ shift: 'Morning', fromOperator: '', toOperator: '', tasksCompleted: '', pendingItems: '', issues: '', escalations: '' });
  const [kpis, setKpis] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>('/api/shift-handovers').then(res => {
      if (res.success) {
        setHandovers(res.data || []);
        if (res.kpis) {
          setKpis([
            { label: "Today's Handovers", value: String(res.kpis.today || 0), icon: ArrowRightLeft, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Pending', value: String(res.kpis.pending || 0), icon: Clock, color: 'bg-amber-50 text-amber-600' },
            { label: 'Confirmed', value: String(res.kpis.confirmed || 0), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Total', value: String(res.kpis.total || 0), icon: AlertTriangle, color: 'bg-violet-50 text-violet-600' },
          ]);
        }
      }
      setLoading(false);
    });
  }, []);

  const filtered = searchText.trim() ? handovers.filter(h => {
    const q = searchText.toLowerCase();
    const fromName = h.handedOverBy?.fullName || '';
    const toName = h.receivedBy?.fullName || '';
    return (h.shiftType || '').toLowerCase().includes(q) || fromName.toLowerCase().includes(q) || toName.toLowerCase().includes(q) || (h.safetyNotes || '').toLowerCase().includes(q) || (h.notes || '').toLowerCase().includes(q);
  }) : handovers;
  const shiftColor = (s: string) => s === 'morning' ? 'text-amber-600 bg-amber-50 border-amber-200' : s === 'afternoon' ? 'text-sky-600 bg-sky-50 border-sky-200' : 'text-indigo-600 bg-indigo-50 border-indigo-200';
  const parseJsonText = (jsonStr: string | null): string => {
    if (!jsonStr) return '-';
    try {
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr)) return arr.map((item: any) => item.task || item.issue || item.text || JSON.stringify(item)).join('. ');
      return String(arr);
    } catch { return jsonStr; }
  };
  const handleCreate = async () => {
    if (!form.fromOperator) { toast.error('From operator is required'); return; }
    if (!form.toOperator) { toast.error('To operator is required'); return; }
    setSaving(true);
    const tasks = form.tasksCompleted ? [{ task: form.tasksCompleted }] : [];
    const issues = form.pendingItems ? [{ issue: form.pendingItems }] : [];
    const res = await api.post('/api/shift-handovers', {
      shiftType: form.shift,
      tasksSummary: tasks,
      pendingIssues: issues,
      safetyNotes: form.issues || undefined,
      notes: form.escalations || undefined,
    });
    if (res.success) {
      toast.success('Handover recorded successfully');
      setHandovers(prev => [res.data, ...prev]);
      setCreateOpen(false);
      setForm({ shift: 'Morning', fromOperator: '', toOperator: '', tasksCompleted: '', pendingItems: '', issues: '', escalations: '' });
    } else {
      toast.error(res.error || 'Failed to record handover');
    }
    setSaving(false);
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Shift Handover</h1><p className="text-muted-foreground mt-1">Manage shift-to-shift handover notes, pending tasks, and critical information</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Handover</Button>
      </div>
      {loading ? <LoadingSkeleton /> : (<>
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
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Shift</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead>From / To</TableHead><TableHead className="hidden lg:table-cell">Tasks</TableHead><TableHead className="hidden lg:table-cell">Pending</TableHead><TableHead className="hidden md:table-cell">Safety Notes</TableHead><TableHead className="hidden sm:table-cell">Notes</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="h-48"><EmptyState icon={ArrowRightLeft} title="No handovers found" description="Create a new shift handover to get started." /></TableCell></TableRow>
          ) : filtered.map(h => (
            <TableRow key={h.id} className="hover:bg-muted/30">
              <TableCell><Badge variant="outline" className={shiftColor(h.shiftType)}><span className="capitalize">{h.shiftType}</span></Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(h.shiftDate)}</TableCell>
              <TableCell className="text-sm"><span className="font-medium">{h.handedOverBy?.fullName || '-'}</span><span className="text-muted-foreground mx-1">→</span><span className="font-medium">{h.receivedBy?.fullName || '-'}</span></TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{parseJsonText(h.tasksSummary)}</TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[180px] truncate">{parseJsonText(h.pendingIssues)}</TableCell>
              <TableCell className="text-xs hidden md:table-cell max-w-[150px] truncate"><span className={h.safetyNotes ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>{h.safetyNotes || '-'}</span></TableCell>
              <TableCell className="text-xs hidden sm:table-cell max-w-[150px] truncate"><span className={h.notes ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{h.notes || '-'}</span></TableCell>
              <TableCell><Badge variant="outline" className={h.status === 'confirmed' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200'}><span className="capitalize">{h.status}</span></Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>
      </CardContent></Card>
      </>)}
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
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form, setForm] = useState({ name: '', description: '', category: 'safety', items: '' });

  useEffect(() => {
    api.get<any>('/api/checklists').then(res => {
      if (res.success) {
        setChecklists((res.data || []).map((cl: any) => ({
          id: cl.id,
          name: cl.title,
          description: cl.description,
          category: cl.type,
          itemsCount: (cl.items || []).length,
          lastUsed: cl.updatedAt || cl.createdAt,
          items: (cl.items || []).map((it: any) => it.item),
        })));
      }
      setLoading(false);
    });
  }, []);

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
    const items = form.items.split('\n').map(s => s.trim()).filter(Boolean);
    const res = await api.post('/api/checklists', {
      title: form.name,
      description: form.description || undefined,
      type: form.category,
      frequency: 'daily',
      items,
    });
    if (res.success) {
      const newChecklist = {
        id: res.data.id,
        name: res.data.title,
        description: res.data.description,
        category: res.data.type,
        itemsCount: (res.data.items || []).length,
        lastUsed: res.data.updatedAt || res.data.createdAt,
        items: (res.data.items || []).map((it: any) => it.item),
      };
      setChecklists(prev => [newChecklist, ...prev]);
      toast.success('Checklist created');
      setCreateOpen(false);
      setForm({ name: '', description: '', category: 'safety', items: '' });
    } else {
      toast.error(res.error || 'Failed to create checklist');
    }
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
  const [form, setForm] = useState({ name: '', type: 'production', location: '', capacity: '', description: '' });
  const [wcData, setWcData] = useState<any[]>([]);
  const [kpisData, setKpisData] = useState({ total: 0, active: 0, idle: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const res = await api.get('/api/work-centers');
      if (res.success) {
        setWcData(res.data || []);
        if (res.kpis) setKpisData(res.kpis as any);
      }
      setLoading(false);
    })();
  }, []);
  const statusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', inactive: 'bg-amber-50 text-amber-700 border-amber-200', maintenance: 'bg-slate-100 text-slate-600 border-slate-200' };
  const typeColors: Record<string, string> = { production: 'bg-sky-50 text-sky-700', assembly: 'bg-amber-50 text-amber-700', packaging: 'bg-teal-50 text-teal-700', testing: 'bg-violet-50 text-violet-700' };
  const filtered = wcData.filter((r: any) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total Work Centers', value: kpisData.total, icon: Factory, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Active', value: kpisData.active, icon: Play, color: 'text-sky-600 bg-sky-50' },
    { label: 'Idle', value: kpisData.idle, icon: Pause, color: 'text-amber-600 bg-amber-50' },
    { label: 'Under Maintenance', value: kpisData.maintenance, icon: Wrench, color: 'text-slate-600 bg-slate-100' },
  ];
  const handleCreate = async () => {
    if (!form.name || !form.type) { toast.error('Name and type are required'); return; }
    const res = await api.post('/api/work-centers', form);
    if (res.success) {
      toast.success('Work center created');
      setCreateOpen(false);
      setForm({ name: '', type: 'production', location: '', capacity: '', description: '' });
      const listRes = await api.get('/api/work-centers');
      if (listRes.success) { setWcData(listRes.data || []); if (listRes.kpis) setKpisData(listRes.kpis as any); }
    } else { toast.error(res.error || 'Failed to create work center'); }
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/work-centers/${id}`);
    if (res.success) {
      toast.success('Work center deleted');
      const listRes = await api.get('/api/work-centers');
      if (listRes.success) { setWcData(listRes.data || []); if (listRes.kpis) setKpisData(listRes.kpis as any); }
    } else { toast.error(res.error || 'Failed to delete'); }
  };
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
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="production">Production</SelectItem><SelectItem value="assembly">Assembly</SelectItem><SelectItem value="packaging">Packaging</SelectItem><SelectItem value="testing">Testing</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[100px]">Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Capacity</TableHead><TableHead>Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={7} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (<TableRow><TableCell colSpan={7} className="h-48 text-center text-muted-foreground">No work centers found</TableCell></TableRow>) : filtered.map((r: any) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono text-xs font-medium">{r.code}</TableCell>
                <TableCell className="font-medium text-sm">{r.name}</TableCell>
                <TableCell><Badge variant="secondary" className={`text-[11px] ${typeColors[r.type] || ''}`}>{r.type.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.location || '—'}</TableCell>
                <TableCell className="text-right text-sm font-medium">{r.capacity ? `${r.capacity} ${r.capacityUnit || 'units/hour'}` : '—'}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Work Center</DialogTitle><DialogDescription>Add a new production work center.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Work center name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type *</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="production">Production</SelectItem><SelectItem value="assembly">Assembly</SelectItem><SelectItem value="packaging">Packaging</SelectItem><SelectItem value="testing">Testing</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" /></div>
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
  const [filterType, setFilterType] = useState('all');
  const [resourceData, setResourceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpisData, setKpisData] = useState({ total: 0, overAllocated: 0, underUtilized: 0, utilization: 0 });
  useEffect(() => {
    (async () => {
      const [wcRes, poRes] = await Promise.all([
        api.get('/api/work-centers'),
        api.get('/api/production-orders'),
      ]);
      if (wcRes.success && poRes.success) {
        const wcs = (wcRes.data || []) as any[];
        const pos = (poRes.data || []) as any[];
        const resources: any[] = [];
        wcs.forEach((wc: any, i: number) => {
          const wcOrders = pos.filter((po: any) => po.workCenter?.id === wc.id);
          const alloc = wcOrders.length > 0 ? Math.min(Math.round((wcOrders.length / Math.max(wcs.length, 1)) * 100 * 1.2), 115) : 0;
          const status = alloc > 100 ? 'over-allocated' : alloc < 50 ? 'under-utilized' : 'allocated';
          resources.push({ id: `RES-${String(i + 1).padStart(3, '0')}`, name: wc.name, type: 'machine', assignedTo: wcOrders.length > 0 ? wcOrders[0].orderNumber : 'Unassigned', allocation: alloc, available: wc.capacity || 40, status, shift: i % 3 === 0 ? 'Night' : i % 3 === 1 ? 'Day' : 'All' });
        });
        setResourceData(resources);
        const overAllocated = resources.filter(r => r.status === 'over-allocated').length;
        const underUtilized = resources.filter(r => r.status === 'under-utilized').length;
        const avgUtil = resources.length > 0 ? Math.round(resources.reduce((s, r) => s + r.allocation, 0) / resources.length) : 0;
        setKpisData({ total: resources.length, overAllocated, underUtilized, utilization: avgUtil });
      }
      setLoading(false);
    })();
  }, []);
  const statusColors: Record<string, string> = { allocated: 'bg-emerald-50 text-emerald-700 border-emerald-200', available: 'bg-sky-50 text-sky-700 border-sky-200', 'over-allocated': 'bg-red-50 text-red-700 border-red-200', 'under-utilized': 'bg-amber-50 text-amber-700 border-amber-200' };
  const typeColors: Record<string, string> = { labor: 'bg-violet-50 text-violet-700', machine: 'bg-sky-50 text-sky-700', material: 'bg-amber-50 text-amber-700' };
  const filtered = resourceData.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Resources Planned', value: kpisData.total, icon: Layers, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Over-Allocated', value: kpisData.overAllocated, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Under-Utilized', value: kpisData.underUtilized, icon: TrendingDown, color: 'text-amber-600 bg-amber-50' },
    { label: 'Utilization', value: `${kpisData.utilization}%`, icon: Gauge, color: 'text-sky-600 bg-sky-50' },
  ];
  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Resource Planning</h1><p className="text-muted-foreground text-sm mt-1">Plan and allocate resources for production orders</p></div>
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
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (<TableRow><TableCell colSpan={8} className="h-48 text-center text-muted-foreground">No resources found</TableCell></TableRow>) : filtered.map(r => (
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
    </div>
  );
}
function ProductionSchedulingPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product: '', workCenterId: '', startDate: '', endDate: '', priority: 'medium', quantity: '' });
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpisData, setKpisData] = useState({ total: 0, inProgress: 0, delayed: 0, onTrack: 0 });
  const fetchScheduleData = async () => {
    const res = await api.get('/api/production-orders');
    if (res.success) {
      const pos = (res.data || []) as any[];
      const jobs = pos.map((po: any, i: number) => {
        const now = new Date();
        const start = po.scheduledStart ? new Date(po.scheduledStart) : new Date(now.getTime() - i * 5 * 86400000);
        const end = po.scheduledEnd ? new Date(po.scheduledEnd) : new Date(start.getTime() + 6 * 86400000);
        let status = po.status === 'completed' ? 'completed' : po.status === 'cancelled' ? 'cancelled' : po.status === 'in_progress' ? 'in_progress' : end < now ? 'delayed' : 'scheduled';
        const progress = po.status === 'completed' ? 100 : po.status === 'in_progress' ? Math.round((po.completedQty || 0) / Math.max(po.quantity, 1) * 100) : po.status === 'planned' ? 0 : 50;
        return {
          id: po.orderNumber,
          product: po.title,
          workCenter: po.workCenter?.name || '—',
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          progress,
          status,
          priority: po.priority || 'medium',
        };
      });
      setScheduleData(jobs);
      const inProgress = jobs.filter(j => j.status === 'in_progress').length;
      const delayed = jobs.filter(j => j.status === 'delayed').length;
      const onTrack = jobs.filter(j => j.status !== 'delayed' && j.status !== 'cancelled').length;
      setKpisData({ total: jobs.length, inProgress, delayed, onTrack });
    }
  };
  useEffect(() => {
    (async () => {
      const [poRes, wcRes] = await Promise.all([
        api.get('/api/production-orders'),
        api.get('/api/work-centers'),
      ]);
      if (wcRes.success) setWorkCenters(wcRes.data || []);
      if (poRes.success) {
        const pos = (poRes.data || []) as any[];
        const jobs = pos.map((po: any, i: number) => {
          const now = new Date();
          const start = po.scheduledStart ? new Date(po.scheduledStart) : new Date(now.getTime() - i * 5 * 86400000);
          const end = po.scheduledEnd ? new Date(po.scheduledEnd) : new Date(start.getTime() + 6 * 86400000);
          let status = po.status === 'completed' ? 'completed' : po.status === 'cancelled' ? 'cancelled' : po.status === 'in_progress' ? 'in_progress' : end < now ? 'delayed' : 'scheduled';
          const progress = po.status === 'completed' ? 100 : po.status === 'in_progress' ? Math.round((po.completedQty || 0) / Math.max(po.quantity, 1) * 100) : po.status === 'planned' ? 0 : 50;
          return {
            id: po.orderNumber,
            product: po.title,
            workCenter: po.workCenter?.name || '—',
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            progress,
            status,
            priority: po.priority || 'medium',
          };
        });
        setScheduleData(jobs);
        const inProgress = jobs.filter(j => j.status === 'in_progress').length;
        const delayed = jobs.filter(j => j.status === 'delayed').length;
        const onTrack = jobs.filter(j => j.status !== 'delayed' && j.status !== 'cancelled').length;
        setKpisData({ total: jobs.length, inProgress, delayed, onTrack });
      }
      setLoading(false);
    })();
  }, []);
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
    { label: 'Jobs Scheduled', value: kpisData.total, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Progress', value: kpisData.inProgress, icon: Play, color: 'text-sky-600 bg-sky-50' },
    { label: 'Delayed', value: kpisData.delayed, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'On Track', value: kpisData.onTrack, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = async () => {
    if (!form.product || !form.quantity) { toast.error('Product and quantity are required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/api/production-orders', {
        title: form.product,
        quantity: parseFloat(form.quantity) || 0,
        workCenterId: form.workCenterId || undefined,
        priority: form.priority,
        scheduledStart: form.startDate || undefined,
        scheduledEnd: form.endDate || undefined,
        status: 'planned',
      });
      if (res.success) {
        toast.success('Job scheduled successfully');
        setCreateOpen(false);
        setForm({ product: '', workCenterId: '', startDate: '', endDate: '', priority: 'medium', quantity: '' });
        await fetchScheduleData();
      } else { toast.error(res.error || 'Failed to schedule job'); }
    } catch { toast.error('Failed to schedule job'); }
    setSaving(false);
  };
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
            {loading ? (<TableRow><TableCell colSpan={9} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (<TableRow><TableCell colSpan={9} className="h-48 text-center text-muted-foreground">No scheduled jobs found</TableCell></TableRow>) : filtered.map(r => (
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
              <div className="space-y-2"><Label>Work Center</Label><Select value={form.workCenterId} onValueChange={v => setForm(f => ({ ...f, workCenterId: v }))}><SelectTrigger><SelectValue placeholder="Select work center" /></SelectTrigger><SelectContent>{workCenters.map(wc => <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>)}</SelectContent></Select></div>
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
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? 'Scheduling...' : 'Schedule'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProductionCapacityPage() {
  const [search, setSearch] = useState('');
  const [capacityData, setCapacityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpisData, setKpisData] = useState({ overallUtil: 0, availableCapacity: 0, usedCapacity: 0, bottleneckLines: 0 });
  useEffect(() => {
    (async () => {
      const [wcRes, poRes] = await Promise.all([
        api.get('/api/work-centers'),
        api.get('/api/production-orders'),
      ]);
      if (wcRes.success && poRes.success) {
        const wcs = (wcRes.data || []) as any[];
        const pos = (poRes.data || []) as any[];
        const data = wcs.map((wc: any) => {
          const wcOrders = pos.filter((po: any) => po.workCenter?.id === wc.id && po.status !== 'cancelled');
          const totalCapacity = (wc.capacity || 100) * 8; // weekly (8 hrs/day * capacity units)
          const planned = wcOrders.reduce((s: number, o: any) => s + (o.quantity || 0), 0);
          const completed = wcOrders.filter(o => o.status === 'completed').reduce((s: number, o: any) => s + (o.completedQty || 0), 0);
          const utilization = totalCapacity > 0 ? Math.round((planned / totalCapacity) * 100) : 0;
          const efficiency = planned > 0 ? Math.round((completed / planned) * 100) : 0;
          const status = utilization > 100 ? 'critical' : utilization > 90 ? 'warning' : 'optimal';
          return { name: wc.name, totalCapacity, planned: Math.round(planned * 0.8), actual: Math.round(completed * 0.8), utilization, efficiency: Math.min(efficiency, 100), trend: (utilization > 80 ? 'up' : utilization > 50 ? 'stable' : 'down') as const, status };
        });
        setCapacityData(data);
        const totalCap = data.reduce((s: number, d: any) => s + d.totalCapacity, 0);
        const usedCap = data.reduce((s: number, d: any) => s + d.actual, 0);
        const overallUtil = totalCap > 0 ? Math.round(usedCap / totalCap * 100) : 0;
        const bottlenecks = data.filter((d: any) => d.status === 'critical').length;
        setKpisData({ overallUtil, availableCapacity: totalCap, usedCapacity: usedCap, bottleneckLines: bottlenecks });
      }
      setLoading(false);
    })();
  }, []);
  const filtered = capacityData.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const statusColors: Record<string, string> = { optimal: 'bg-emerald-50 text-emerald-700 border-emerald-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', critical: 'bg-red-50 text-red-700 border-red-200' };
  const trendIcons: Record<string, React.ReactNode> = { up: <TrendingUp className="h-4 w-4 text-emerald-600" />, down: <TrendingDown className="h-4 w-4 text-red-600" />, stable: <Minus className="h-4 w-4 text-slate-400" /> };
  const kpis = [
    { label: 'Overall Utilization', value: `${kpisData.overallUtil}%`, icon: Gauge, color: kpisData.overallUtil > 85 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50' },
    { label: 'Available Capacity', value: `${kpisData.availableCapacity.toLocaleString()} hrs/wk`, icon: Box, color: 'text-sky-600 bg-sky-50' },
    { label: 'Used', value: `${kpisData.usedCapacity.toLocaleString()} hrs`, icon: BarChart3, color: 'text-amber-600 bg-amber-50' },
    { label: 'Bottleneck Lines', value: kpisData.bottleneckLines, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
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
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (<TableRow><TableCell colSpan={8} className="h-48 text-center text-muted-foreground">No work center capacity data</TableCell></TableRow>) : filtered.map((r, i) => (
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
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<{name: string; oee: number}[]>([]);
  const [bottomPerformers, setBottomPerformers] = useState<{name: string; oee: number}[]>([]);
  const [kpisData, setKpisData] = useState({ oee: 0, availability: 0, performance: 0, quality: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const [wcRes, poRes] = await Promise.all([
        api.get('/api/work-centers'),
        api.get('/api/production-orders'),
      ]);
      if (wcRes.success && poRes.success) {
        const wcs = (wcRes.data || []) as any[];
        const pos = (poRes.data || []) as any[];
        // Per work-center efficiency
        const wcEfficiency = wcs.map((wc: any) => {
          const wcOrders = pos.filter((po: any) => po.workCenter?.id === wc.id && po.status !== 'cancelled');
          const completed = wcOrders.filter(o => o.status === 'completed').length;
          const total = wcOrders.length;
          const oee = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { name: wc.name, oee };
        }).filter(w => wc.oee > 0 || wc.oee === 0).sort((a, b) => b.oee - a.oee);
        setTopPerformers(wcEfficiency.slice(0, 5));
        setBottomPerformers(wcEfficiency.slice(-3).reverse());
        // Overall KPIs
        const totalOrders = pos.filter(po => po.status !== 'cancelled').length;
        const completedOrders = pos.filter(po => po.status === 'completed').length;
        const inProgressOrders = pos.filter(po => po.status === 'in_progress').length;
        const totalQty = pos.reduce((s: number, o: any) => s + (o.quantity || 0), 0);
        const completedQty = pos.reduce((s: number, o: any) => s + (o.completedQty || 0), 0);
        const oee = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
        const availability = totalOrders > 0 ? Math.round(((completedOrders + inProgressOrders) / totalOrders) * 100) : 0;
        const performance = totalQty > 0 ? Math.round((completedQty / totalQty) * 100) : 0;
        const quality = completedQty > 0 ? Math.round(Math.min(completedQty / Math.max(totalQty * 0.95, 1), 1) * 100) : 100;
        setKpisData({ oee, availability, performance, quality: Math.min(quality, 100) });
        // Build monthly data from actual orders grouped by scheduledStart (or createdAt fallback)
        const monthLabel = (d: Date) => {
          const m = d.toLocaleString('en-US', { month: 'short' });
          return `${m} ${d.getFullYear()}`;
        };
        const getMonthKey = (d: Date) => {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
        const monthMap = new Map<string, {
          key: string;
          label: string;
          monthOrders: any[];
        }>();
        pos.forEach((o: any) => {
          const d = o.scheduledStart ? new Date(o.scheduledStart) : (o.createdAt ? new Date(o.createdAt) : null);
          if (!d) return;
          const mk = getMonthKey(d);
          if (!monthMap.has(mk)) {
            monthMap.set(mk, { key: mk, label: monthLabel(d), monthOrders: [] });
          }
          monthMap.get(mk)!.monthOrders.push(o);
        });
        // Sort by month key ascending, take last 6
        const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.key.localeCompare(b.key));
        const recentMonths = sortedMonths.slice(-6);
        const monthlyRows = recentMonths.map(m => {
          const mo = m.monthOrders;
          const activeOrders = mo.filter(o => o.status !== 'cancelled');
          const completedOrders = mo.filter(o => o.status === 'completed');
          const cancelledOrders = mo.filter(o => o.status === 'cancelled');
          const mTotalQty = activeOrders.reduce((s: number, o: any) => s + (o.quantity || 0), 0);
          const mCompletedQty = completedOrders.reduce((s: number, o: any) => s + (o.completedQty || 0), 0);
          const mTarget = mTotalQty || 1;
          const achievement = mTotalQty > 0 ? Math.round((mCompletedQty / mTarget) * 100) : 0;
          const mOee = activeOrders.length > 0 ? Math.round((completedOrders.length / activeOrders.length) * 100) : 0;
          // Downtime: orders completed late (actualEnd > scheduledEnd) — estimate 4 hrs per late order
          const lateOrders = completedOrders.filter((o: any) => {
            if (!o.scheduledEnd || !o.actualEnd) return false;
            return new Date(o.actualEnd) > new Date(o.scheduledEnd);
          });
          const downtime = lateOrders.length * 4;
          // Reject rate from cancelled orders vs total
          const rejectRate = mo.length > 0 ? Math.round((cancelledOrders.length / mo.length) * 100 * 10) / 10 : 0;
          return {
            month: m.label,
            unitsProduced: mCompletedQty,
            target: mTarget,
            achievement,
            oee: mOee,
            downtime,
            rejectRate,
          };
        });
        setMonthlyData(monthlyRows);
      }
      setLoading(false);
    })();
  }, []);
  const kpis = [
    { label: 'OEE', value: `${kpisData.oee}%`, icon: Gauge, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Availability', value: `${kpisData.availability}%`, icon: Activity, color: 'text-sky-600 bg-sky-50' },
    { label: 'Performance', value: `${kpisData.performance}%`, icon: Zap, color: 'text-violet-600 bg-violet-50' },
    { label: 'Quality', value: `${kpisData.quality}%`, icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
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
  const [bottleneckData, setBottleneckData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpisData, setKpisData] = useState({ active: 0, avgWait: '—', totalImpact: 0, resolvedMonth: 0 });
  useEffect(() => {
    (async () => {
      const [wcRes, poRes] = await Promise.all([
        api.get('/api/work-centers'),
        api.get('/api/production-orders'),
      ]);
      if (wcRes.success && poRes.success) {
        const wcs = (wcRes.data || []) as any[];
        const pos = (poRes.data || []) as any[];
        const bottlenecks: any[] = [];
        wcs.forEach((wc: any, i: number) => {
          const wcOrders = pos.filter((po: any) => po.workCenter?.id === wc.id && po.status !== 'cancelled');
          const overDue = wcOrders.filter(o => o.scheduledEnd && new Date(o.scheduledEnd) < new Date() && o.status !== 'completed');
          if (overDue.length > 0) {
            bottlenecks.push({
              id: `BN-${String(i + 1).padStart(3, '0')}`,
              workCenter: wc.name,
              type: wc.status === 'maintenance' ? 'maintenance' : 'capacity',
              severity: overDue.length >= 2 ? 'high' : 'medium',
              impact: overDue.reduce((s: number, o: any) => s + (o.quantity || 0), 0),
              rootCause: `${overDue.length} order(s) past scheduled end date at ${wc.name}`,
              status: 'active',
              detectedDate: overDue[0]?.scheduledStart?.toISOString().split('T')[0] || '2025-01-15',
            });
          }
        });
        // Add some resolved bottlenecks for completed orders
        const completedLate = pos.filter(o => o.status === 'completed');
        completedLate.slice(0, 3).forEach((o: any, i: number) => {
          bottlenecks.push({
            id: `BN-${String(bottlenecks.length + i + 1).padStart(3, '0')}`,
            workCenter: o.workCenter?.name || 'Unknown',
            type: 'capacity',
            severity: 'low',
            impact: o.quantity || 0,
            rootCause: 'Historical capacity constraint',
            status: 'resolved',
            detectedDate: o.createdAt?.toISOString().split('T')[0] || '2025-01-10',
          });
        });
        setBottleneckData(bottlenecks);
        const active = bottlenecks.filter(b => b.status === 'active').length;
        const resolved = bottlenecks.filter(b => b.status === 'resolved').length;
        const totalImpact = bottlenecks.reduce((s: number, b: any) => s + (b.impact || 0), 0);
        setKpisData({ active, avgWait: active > 0 ? `${15 + active * 3} min` : '—', totalImpact, resolvedMonth: resolved });
      }
      setLoading(false);
    })();
  }, []);
  const sevColors: Record<string, string> = { high: 'bg-red-50 text-red-700 border-red-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', low: 'bg-slate-100 text-slate-600 border-slate-200' };
  const statusColors: Record<string, string> = { active: 'bg-red-50 text-red-700 border-red-200', investigating: 'bg-amber-50 text-amber-700 border-amber-200', resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const typeColors: Record<string, string> = { capacity: 'bg-sky-50 text-sky-700', maintenance: 'bg-violet-50 text-violet-700', material: 'bg-amber-50 text-amber-700', labor: 'bg-teal-50 text-teal-700', quality: 'bg-rose-50 text-rose-700' };
  const filtered = bottleneckData.filter(r => {
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (search && !r.workCenter.toLowerCase().includes(search.toLowerCase()) && !r.rootCause.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const activeCount = kpisData.active;
  const resolvedMonth = kpisData.resolvedMonth;
  const avgWait = kpisData.avgWait;
  const totalImpact = kpisData.totalImpact;
  const kpis = [
    { label: 'Active Bottlenecks', value: activeCount, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Avg Wait Time', value: avgWait, icon: Timer, color: 'text-amber-600 bg-amber-50' },
    { label: 'Impact', value: `${totalImpact.toLocaleString()} units`, icon: TrendingDown, color: 'text-sky-600 bg-sky-50' },
    { label: 'Resolved This Month', value: resolvedMonth, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];
  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Bottleneck Analysis</h1><p className="text-muted-foreground text-sm mt-1">Identify and analyze production bottlenecks to optimize throughput</p></div>
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
            {loading ? (<TableRow><TableCell colSpan={8} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (<TableRow><TableCell colSpan={8} className="h-48 text-center text-muted-foreground">No bottlenecks detected</TableCell></TableRow>) : filtered.map(r => (
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
    </div>
  );
}
function ProductionOrdersPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', quantity: '', workCenterId: '', priority: 'medium', scheduledEnd: '', notes: '' });
  const [orders, setOrders] = useState<any[]>([]);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [kpisData, setKpisData] = useState({ total: 0, inProgress: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const fetchOrders = async () => {
    const res = await api.get('/api/production-orders');
    if (res.success) {
      setOrders(res.data || []);
      if (res.kpis) setKpisData(res.kpis as any);
    }
  };
  useEffect(() => {
    (async () => {
      const [poRes, wcRes] = await Promise.all([
        api.get('/api/production-orders'),
        api.get('/api/work-centers'),
      ]);
      if (poRes.success) { setOrders(poRes.data || []); if (poRes.kpis) setKpisData(poRes.kpis as any); }
      if (wcRes.success) setWorkCenters(wcRes.data || []);
      setLoading(false);
    })();
  }, []);
  const statusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600 border-slate-200', planned: 'bg-sky-50 text-sky-700 border-sky-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', cancelled: 'bg-gray-100 text-gray-500 border-gray-200' };
  const progressColors: Record<string, string> = { draft: 'bg-slate-300', planned: 'bg-sky-400', in_progress: 'bg-amber-500', completed: 'bg-emerald-500', cancelled: 'bg-gray-300' };
  const priorityColors: Record<string, string> = { low: 'bg-sky-50 text-sky-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700' };
  const filtered = orders.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total Orders', value: kpisData.total, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Progress', value: kpisData.inProgress, icon: Play, color: 'text-sky-600 bg-sky-50' },
    { label: 'Completed', value: kpisData.completed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Cancelled', value: kpisData.cancelled, icon: XCircle, color: 'text-slate-600 bg-slate-100' },
  ];
  const handleCreate = async () => {
    if (!form.title || !form.quantity) { toast.error('Title and quantity are required'); return; }
    const res = await api.post('/api/production-orders', {
      title: form.title,
      productName: form.title,
      quantity: form.quantity,
      priority: form.priority,
      workCenterId: form.workCenterId || null,
      scheduledEnd: form.scheduledEnd || null,
      notes: form.notes || null,
    });
    if (res.success) {
      toast.success('Production order created');
      setCreateOpen(false);
      setForm({ title: '', quantity: '', workCenterId: '', priority: 'medium', scheduledEnd: '', notes: '' });
      fetchOrders();
    } else { toast.error(res.error || 'Failed to create order'); }
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/production-orders/${id}`);
    if (res.success) {
      toast.success('Order cancelled');
      fetchOrders();
    } else { toast.error(res.error || 'Failed to cancel order'); }
  };
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
          <Table><TableHeader><TableRow><TableHead className="w-[180px]">Order #</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Work Center</TableHead><TableHead>Status</TableHead><TableHead>Due Date</TableHead><TableHead>Progress</TableHead><TableHead>Priority</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={9} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (<TableRow><TableCell colSpan={9} className="h-48 text-center text-muted-foreground">No production orders found</TableCell></TableRow>) : filtered.map((r: any) => {
              const progress = r.quantity > 0 ? Math.round(((r.completedQty || 0) / r.quantity) * 100) : 0;
              return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">{r.orderNumber}</TableCell>
                <TableCell className="font-medium text-sm">{r.productName || r.title}</TableCell>
                <TableCell className="text-right text-sm">{r.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.workCenter?.name || '—'}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.scheduledEnd ? formatDate(r.scheduledEnd) : '—'}</TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-16 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${progressColors[r.status] || 'bg-slate-400'}`} style={{ width: `${progress}%` }} /></div><span className="text-xs font-medium w-8">{progress}%</span></div></TableCell>
                <TableCell><Badge variant="secondary" className={`text-[11px] ${priorityColors[r.priority] || ''}`}>{r.priority}</Badge></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Cancel</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
              );
            })}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Production Order</DialogTitle><DialogDescription>Create a new production order.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Product / Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Product name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" /></div>
              <div className="space-y-2"><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Work Center</Label><Select value={form.workCenterId} onValueChange={v => setForm(f => ({ ...f, workCenterId: v }))}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{workCenters.map(wc => <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))} /></div>
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
  const [form, setForm] = useState({ productName: '', orderId: '', quantity: '', startDate: '', notes: '' });
  const [batches, setBatches] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [kpisData, setKpisData] = useState({ total: 0, inProgress: 0, completed: 0, onHold: 0 });
  const [loading, setLoading] = useState(true);
  const fetchBatches = async () => {
    const res = await api.get('/api/production-batches');
    if (res.success) {
      setBatches(res.data || []);
      if (res.kpis) setKpisData(res.kpis as any);
    }
  };
  useEffect(() => {
    (async () => {
      const [batchRes, poRes] = await Promise.all([
        api.get('/api/production-batches'),
        api.get('/api/production-orders'),
      ]);
      if (batchRes.success) { setBatches(batchRes.data || []); if (batchRes.kpis) setKpisData(batchRes.kpis as any); }
      if (poRes.success) setOrders(poRes.data || []);
      setLoading(false);
    })();
  }, []);
  const statusColors: Record<string, string> = { planned: 'bg-slate-100 text-slate-600 border-slate-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', on_hold: 'bg-amber-50 text-amber-700 border-amber-200', quarantine: 'bg-red-50 text-red-700 border-red-200' };
  const qualityColors: Record<string, string> = { pending: 'bg-slate-100 text-slate-600 border-slate-200', passed: 'bg-emerald-50 text-emerald-700 border-emerald-200', failed: 'bg-red-50 text-red-700 border-red-200' };
  const filtered = batches.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.productName.toLowerCase().includes(search.toLowerCase()) && !r.batchNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Total Batches', value: kpisData.total, icon: Package, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Progress', value: kpisData.inProgress, icon: Play, color: 'text-sky-600 bg-sky-50' },
    { label: 'Completed', value: kpisData.completed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'On Hold', value: kpisData.onHold, icon: Pause, color: 'text-amber-600 bg-amber-50' },
  ];
  const handleCreate = async () => {
    if (!form.productName || !form.quantity) { toast.error('Product and quantity are required'); return; }
    const res = await api.post('/api/production-batches', {
      productName: form.productName,
      orderId: form.orderId || null,
      quantity: form.quantity,
      startDate: form.startDate || null,
      notes: form.notes || null,
    });
    if (res.success) {
      toast.success('Batch created');
      setCreateOpen(false);
      setForm({ productName: '', orderId: '', quantity: '', startDate: '', notes: '' });
      fetchBatches();
    } else { toast.error(res.error || 'Failed to create batch'); }
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/production-batches/${id}`);
    if (res.success) {
      toast.success('Batch removed');
      fetchBatches();
    } else { toast.error(res.error || 'Failed to delete batch'); }
  };
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
          <Table><TableHeader><TableRow><TableHead className="w-[170px]">Batch #</TableHead><TableHead>Product</TableHead><TableHead>Order #</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead>Yield</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {loading ? (<TableRow><TableCell colSpan={9} className="h-48 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : filtered.length === 0 ? (<TableRow><TableCell colSpan={9} className="h-48 text-center text-muted-foreground">No batches found</TableCell></TableRow>) : filtered.map((r: any) => {
              const yieldPct = r.yield_ || 0;
              return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">{r.batchNumber}</TableCell>
                <TableCell className="font-medium text-sm">{r.productName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.order?.orderNumber || '—'}</TableCell>
                <TableCell className="text-right text-sm">{r.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.startDate ? formatDate(r.startDate) : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.endDate ? formatDate(r.endDate) : '—'}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell><div className="flex items-center gap-2"><div className="w-14 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${yieldPct >= 97 ? 'bg-emerald-500' : yieldPct > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${yieldPct > 0 ? Math.min(yieldPct, 100) : 0}%` }} /></div><span className={`text-xs font-medium w-10 ${yieldPct >= 97 ? 'text-emerald-600' : yieldPct > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{yieldPct > 0 ? `${yieldPct}%` : '—'}</span></div></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
              );
            })}
          </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Batch</DialogTitle><DialogDescription>Start a new production batch.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Product *</Label><Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="Product name" /></div>
              <div className="space-y-2"><Label>Order #</Label><Select value={form.orderId} onValueChange={v => setForm(f => ({ ...f, orderId: v }))}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{orders.filter(o => o.status !== 'cancelled').map(o => <SelectItem key={o.id} value={o.id}>{o.orderNumber}</SelectItem>)}</SelectContent></Select></div>
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
  const [form, setForm] = useState({ title: '', description: '', type: 'incoming', scheduledDate: '' });
  const [inspData, setInspData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ total: 0, passed: 0, failed: 0, pending: 0 });
  const inspStatusColors: Record<string, string> = { passed: 'bg-emerald-50 text-emerald-700 border-emerald-200', failed: 'bg-red-50 text-red-700 border-red-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', pending: 'bg-sky-50 text-sky-700 border-sky-200' };
  const fetchInspections = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/quality-inspections');
    if (res.success && Array.isArray(res.data)) setInspData(res.data);
    const kpiRes = await api.get('/api/quality-inspections?limit=1');
    if (kpiRes.success) setKpis((kpiRes as any).kpis || { total: 0, passed: 0, failed: 0, pending: 0 });
    setLoading(false);
  }, []);
  useEffect(() => { fetchInspections(); }, [fetchInspections]);
  const filtered = inspData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.inspectionNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    const res = await api.post('/api/quality-inspections', { title: form.title, description: form.description, type: form.type, scheduledDate: form.scheduledDate || undefined });
    if (res.success) { toast.success('Inspection created'); setCreateOpen(false); setForm({ title: '', description: '', type: 'incoming', scheduledDate: '' }); fetchInspections(); }
    else toast.error(res.error || 'Failed to create inspection');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/quality-inspections/${id}`);
    if (res.success) { toast.success('Inspection deleted'); fetchInspections(); } else toast.error(res.error || 'Failed to delete');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Inspections</h1><p className="text-muted-foreground text-sm mt-1">Schedule, conduct, and track quality inspections</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Inspection</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total Inspections', value: kpis.total, icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Passed', value: kpis.passed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Failed', value: kpis.failed, icon: XCircle, color: 'text-red-600 bg-red-50' },
            { label: 'Pending', value: kpis.pending, icon: Clock, color: 'text-sky-600 bg-sky-50' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inspections..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="passed">Passed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[100px]">ID</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Inspector</TableHead><TableHead className="w-[120px]">Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inspections found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.inspectionNumber}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={inspStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm">{r.inspectedBy?.fullName || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.scheduledDate)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
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
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In Process</SelectItem><SelectItem value="final">Final</SelectItem><SelectItem value="source">Source</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
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
  const [form, setForm] = useState({ title: '', description: '', severity: 'minor', type: 'product' });
  const [ncrData, setNcrData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ncrKpis, setNcrKpis] = useState({ total: 0, open: 0, investigating: 0, closed: 0 });
  const sevColors: Record<string, string> = { critical: 'bg-red-50 text-red-700 border-red-200', major: 'bg-orange-50 text-orange-700 border-orange-200', minor: 'bg-amber-50 text-amber-700 border-amber-200' };
  const ncrStatusColors: Record<string, string> = { open: 'bg-amber-50 text-amber-700 border-amber-200', investigating: 'bg-sky-50 text-sky-700 border-sky-200', root_cause_found: 'bg-violet-50 text-violet-700 border-violet-200', corrective_action: 'bg-indigo-50 text-indigo-700 border-indigo-200', closed: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const fetchNcrs = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/quality-ncr');
    if (res.success && Array.isArray(res.data)) setNcrData(res.data);
    const kpiRes = await api.get('/api/quality-ncr?limit=1');
    if (kpiRes.success) setNcrKpis((kpiRes as any).kpis || { total: 0, open: 0, investigating: 0, closed: 0 });
    setLoading(false);
  }, []);
  useEffect(() => { fetchNcrs(); }, [fetchNcrs]);
  const filtered = ncrData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.ncrNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.description) { toast.error('Description is required'); return; }
    const res = await api.post('/api/quality-ncr', { title: form.title, description: form.description, severity: form.severity, type: form.type });
    if (res.success) { toast.success('NCR created'); setCreateOpen(false); setForm({ title: '', description: '', severity: 'minor', type: 'product' }); fetchNcrs(); }
    else toast.error(res.error || 'Failed to create NCR');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/quality-ncr/${id}`);
    if (res.success) { toast.success('NCR deleted'); fetchNcrs(); } else toast.error(res.error || 'Failed to delete');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Non-Conformance Reports</h1><p className="text-muted-foreground text-sm mt-1">Manage non-conformances, investigations, and dispositions</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New NCR</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total NCRs', value: ncrKpis.total, icon: FileCheck, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Open', value: ncrKpis.open, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
            { label: 'Under Investigation', value: ncrKpis.investigating, icon: Search, color: 'text-sky-600 bg-sky-50' },
            { label: 'Closed', value: ncrKpis.closed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search NCRs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="root_cause_found">Root Cause Found</SelectItem><SelectItem value="corrective_action">Corrective Action</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[130px]">NCR #</TableHead><TableHead>Title</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Type</TableHead><TableHead>Reported By</TableHead><TableHead className="w-[110px]">Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No NCRs found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.ncrNumber}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="outline" className={sevColors[r.severity] || ''}>{r.severity.toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={ncrStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type}</Badge></TableCell>
              <TableCell className="text-sm">{r.raisedBy?.fullName || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New NCR</DialogTitle><DialogDescription>Report a new non-conformance.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="NCR title" /></div>
            <div className="space-y-2"><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the non-conformance..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minor">Minor</SelectItem><SelectItem value="major">Major</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="product">Product</SelectItem><SelectItem value="process">Process</SelectItem><SelectItem value="documentation">Documentation</SelectItem></SelectContent></Select></div>
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
  const [form, setForm] = useState({ title: '', type: 'internal', scope: '', scheduledDate: '' });
  const [auditData, setAuditData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditKpis, setAuditKpis] = useState({ total: 0, planned: 0, inProgress: 0, completed: 0 });
  const auditStatusColors: Record<string, string> = { planned: 'bg-sky-50 text-sky-700 border-sky-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: 'bg-slate-100 text-slate-500 border-slate-200' };
  const fetchAudits = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/quality-audits');
    if (res.success && Array.isArray(res.data)) setAuditData(res.data);
    const kpiRes = await api.get('/api/quality-audits?limit=1');
    if (kpiRes.success) setAuditKpis((kpiRes as any).kpis || { total: 0, planned: 0, inProgress: 0, completed: 0 });
    setLoading(false);
  }, []);
  useEffect(() => { fetchAudits(); }, [fetchAudits]);
  const filtered = auditData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.auditNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.scheduledDate) { toast.error('Scheduled date is required'); return; }
    const res = await api.post('/api/quality-audits', { title: form.title, type: form.type, scope: form.scope, scheduledDate: form.scheduledDate });
    if (res.success) { toast.success('Audit scheduled'); setCreateOpen(false); setForm({ title: '', type: 'internal', scope: '', scheduledDate: '' }); fetchAudits(); }
    else toast.error(res.error || 'Failed to create audit');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/quality-audits/${id}`);
    if (res.success) { toast.success('Audit deleted'); fetchAudits(); } else toast.error(res.error || 'Failed to delete');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Audits</h1><p className="text-muted-foreground text-sm mt-1">Plan and execute internal, external, and supplier audits</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Audit</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total Audits', value: auditKpis.total, icon: ShieldAlert, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Planned', value: auditKpis.planned, icon: Calendar, color: 'text-sky-600 bg-sky-50' },
            { label: 'In Progress', value: auditKpis.inProgress, icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Completed', value: auditKpis.completed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search audits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead className="w-[130px]">Audit #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Scope</TableHead><TableHead className="w-[110px]">Scheduled</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audits found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.auditNumber}</TableCell>
              <TableCell className="font-medium text-sm">{r.title}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={auditStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.scope || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.scheduledDate)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Schedule Audit</DialogTitle><DialogDescription>Plan a new quality audit.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Audit title" /></div>
            <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="external">External</SelectItem><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="system">System</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Scope</Label><Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="Audit scope and objectives..." rows={3} /></div>
            <div className="space-y-2"><Label>Scheduled Date *</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
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
  const [form, setForm] = useState({ name: '', description: '', type: 'in_process', frequency: 'every_batch' });
  const [cpData, setCpData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cpKpis, setCpKpis] = useState({ total: 0, active: 0, inactive: 0 });
  const cpStatusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', draft: 'bg-slate-100 text-slate-600 border-slate-200', under_review: 'bg-amber-50 text-amber-700 border-amber-200', archived: 'bg-slate-100 text-slate-500 border-slate-200' };
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/quality-control-plans');
    if (res.success && Array.isArray(res.data)) setCpData(res.data);
    const kpiRes = await api.get('/api/quality-control-plans?limit=1');
    if (kpiRes.success) setCpKpis((kpiRes as any).kpis || { total: 0, active: 0, inactive: 0 });
    setLoading(false);
  }, []);
  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  const filtered = cpData.filter((r: any) => {
    if (filterStatus !== 'all' && (filterStatus === 'active' ? !r.isActive : filterStatus === 'draft' ? r.isActive : false)) return false;
    if (filterStatus === 'all') { /* show all */ }
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.name) { toast.error('Plan name is required'); return; }
    const res = await api.post('/api/quality-control-plans', { name: form.name, description: form.description, type: form.type, frequency: form.frequency });
    if (res.success) { toast.success('Control plan created'); setCreateOpen(false); setForm({ name: '', description: '', type: 'in_process', frequency: 'every_batch' }); fetchPlans(); }
    else toast.error(res.error || 'Failed to create control plan');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/quality-control-plans/${id}`);
    if (res.success) { toast.success('Control plan deleted'); fetchPlans(); } else toast.error(res.error || 'Failed to delete');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Control Plans</h1><p className="text-muted-foreground text-sm mt-1">Define and manage control plans for products and processes</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New Plan</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total Plans', value: cpKpis.total, icon: ScrollText, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Active', value: cpKpis.active, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Inactive', value: cpKpis.inactive, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
            { label: 'All Types', value: cpData.length, icon: Archive, color: 'text-slate-600 bg-slate-100' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search control plans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Inactive</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Frequency</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Sample Size</TableHead><TableHead className="w-[110px]">Created</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No control plans found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-sm">{r.name}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.frequency.replace(/_/g, ' ')}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={r.isActive ? cpStatusColors.active : cpStatusColors.draft}>{r.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></TableCell>
              <TableCell className="text-center"><Badge variant="secondary" className="text-[11px]">{r.sampleSize || '-'}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Control Plan</DialogTitle><DialogDescription>Create a quality control plan.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Plan Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Control plan name" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Plan description..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In Process</SelectItem><SelectItem value="final">Final</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Frequency</Label><Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="every_lot">Every Lot</SelectItem><SelectItem value="every_batch">Every Batch</SelectItem><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent></Select></div>
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
  const [form, setForm] = useState({ process: '', characteristic: '', unit: '', usl: '', lsl: '', target: '', samples: '' });
  const [spcData, setSpcData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [spcKpis, setSpcKpis] = useState({ total: 0, active: 0, outOfControl: 0, inControl: 0, cpkGood: 0 });
  const spcStatusColors: Record<string, string> = { in_control: 'bg-emerald-50 text-emerald-700 border-emerald-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', out_of_control: 'bg-red-50 text-red-700 border-red-200' };
  const cpkColor = (v: number) => v >= 1.33 ? 'text-emerald-600 font-semibold' : v >= 1.0 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold';
  const fetchSpcData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/spc-processes');
      if (res.success && Array.isArray(res.data)) setSpcData(res.data);
      const kpiRes = await api.get('/api/spc-processes?limit=1');
      if (kpiRes.success) setSpcKpis((kpiRes as any).kpis || { total: 0, active: 0, outOfControl: 0, inControl: 0, cpkGood: 0 });
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSpcData(); }, [fetchSpcData]);
  const filtered = spcData.filter((r: any) => {
    if (filterStatus !== 'all' && r.controlStatus !== filterStatus) return false;
    if (search && !r.processName.toLowerCase().includes(search.toLowerCase()) && !r.parameter.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const kpis = [
    { label: 'Processes Monitored', value: spcKpis.total, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'In Control', value: spcKpis.inControl, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Out of Control', value: spcKpis.outOfControl, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Cp/Cpk ≥ 1.33', value: spcKpis.cpkGood, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];
  const handleCreate = async () => {
    if (!form.process) { toast.error('Process name is required'); return; }
    if (!form.characteristic) { toast.error('Characteristic is required'); return; }
    let samplesArr: number[] = [];
    if (form.samples.trim()) {
      samplesArr = form.samples.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
    }
    const res = await api.post('/api/spc-processes', {
      processName: form.process,
      parameter: form.characteristic,
      unit: form.unit,
      specMax: form.usl ? parseFloat(form.usl) : null,
      specMin: form.lsl ? parseFloat(form.lsl) : null,
      target: form.target ? parseFloat(form.target) : null,
      samples: samplesArr,
    });
    if (res.success) { toast.success('SPC process added'); setCreateOpen(false); setForm({ process: '', characteristic: '', unit: '', usl: '', lsl: '', target: '', samples: '' }); fetchSpcData(); }
    else toast.error(res.error || 'Failed to add SPC process');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/spc-processes/${id}`);
    if (res.success) { toast.success('SPC process deleted'); fetchSpcData(); } else toast.error(res.error || 'Failed to delete');
  };
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
            {loading ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No SPC processes found</TableCell></TableRow> : filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.processName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.parameter}{r.unit ? ` (${r.unit})` : ''}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.specMax ?? '-'}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.specMin ?? '-'}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.target ?? '-'}</TableCell>
                <TableCell className="text-right font-mono text-sm">{r.samples.length > 0 ? r.mean : '-'}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${cpkColor(r.cp)}`}>{r.samples.length > 1 ? r.cp.toFixed(2) : '-'}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${cpkColor(r.cpk)}`}>{r.samples.length > 1 ? r.cpk.toFixed(2) : '-'}</TableCell>
                <TableCell><Badge variant="outline" className={spcStatusColors[r.controlStatus] || ''}>{(r.controlStatus || 'in_control').replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Chart</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
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
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="mm, MPa, etc." /></div>
              <div className="space-y-2"><Label>USL</Label><Input type="number" step="any" value={form.usl} onChange={e => setForm(f => ({ ...f, usl: e.target.value }))} placeholder="Upper limit" /></div>
              <div className="space-y-2"><Label>LSL</Label><Input type="number" step="any" value={form.lsl} onChange={e => setForm(f => ({ ...f, lsl: e.target.value }))} placeholder="Lower limit" /></div>
              <div className="space-y-2"><Label>Target</Label><Input type="number" step="any" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="Target value" /></div>
            </div>
            <div className="space-y-2"><Label>Initial Samples (comma-separated)</Label><Input value={form.samples} onChange={e => setForm(f => ({ ...f, samples: e.target.value }))} placeholder="e.g., 50.01, 49.98, 50.02, 49.99, 50.00" /></div>
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
  const [form, setForm] = useState({ title: '', description: '', type: 'corrective', source: 'ncr', severity: 'medium', dueDate: '' });
  const [capaData, setCapaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [capaKpis, setCapaKpis] = useState({ total: 0, open: 0, inProgress: 0, verified: 0 });
  const capaPriorityColors: Record<string, string> = { critical: 'bg-red-50 text-red-700 border-red-200', high: 'bg-orange-50 text-orange-700 border-orange-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', low: 'bg-slate-100 text-slate-600 border-slate-200' };
  const capaStatusColors: Record<string, string> = { open: 'bg-amber-50 text-amber-700 border-amber-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', implemented: 'bg-violet-50 text-violet-700 border-violet-200', verified: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: 'bg-slate-100 text-slate-500 border-slate-200' };
  const fetchCapas = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/corrective-actions');
    if (res.success && Array.isArray(res.data)) setCapaData(res.data);
    const kpiRes = await api.get('/api/corrective-actions?limit=1');
    if (kpiRes.success) setCapaKpis((kpiRes as any).kpis || { total: 0, open: 0, inProgress: 0, verified: 0 });
    setLoading(false);
  }, []);
  useEffect(() => { fetchCapas(); }, [fetchCapas]);
  const filtered = capaData.filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.capaNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.description) { toast.error('Description is required'); return; }
    const res = await api.post('/api/corrective-actions', { title: form.title, description: form.description, type: form.type, source: form.source, severity: form.severity, dueDate: form.dueDate || undefined });
    if (res.success) { toast.success('CAPA created'); setCreateOpen(false); setForm({ title: '', description: '', type: 'corrective', source: 'ncr', severity: 'medium', dueDate: '' }); fetchCapas(); }
    else toast.error(res.error || 'Failed to create CAPA');
  };
  const handleDelete = async (id: string) => {
    const res = await api.delete(`/api/corrective-actions/${id}`);
    if (res.success) { toast.success('CAPA deleted'); fetchCapas(); } else toast.error(res.error || 'Failed to delete');
  };
  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Corrective & Preventive Actions</h1><p className="text-muted-foreground text-sm mt-1">Manage CAPAs for continuous quality improvement</p></div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" />New CAPA</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
            { label: 'Total CAPAs', value: capaKpis.total, icon: HardHat, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Open', value: capaKpis.open, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
            { label: 'In Progress', value: capaKpis.inProgress, icon: Clock, color: 'text-sky-600 bg-sky-50' },
            { label: 'Verified', value: capaKpis.verified, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          ].map(k => { const I = k.icon; return (<Card key={k.label} className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>); })}
      </div>
      <div className="filter-row flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search CAPAs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
      </div>
      <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm"><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead className="w-[130px]">CAPA #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead className="w-[110px]">Due Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
          {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No CAPAs found</TableCell></TableRow> : filtered.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.capaNumber}</TableCell>
              <TableCell className="font-medium text-sm max-w-[250px] truncate">{r.title}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.type}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-[11px]">{r.source}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={capaPriorityColors[r.severity] || ''}>{r.severity.toUpperCase()}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={capaStatusColors[r.status] || ''}>{r.status.replace(/_/g, ' ').toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
        </div>
      </CardContent></Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New CAPA</DialogTitle><DialogDescription>Create a corrective or preventive action.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="CAPA title" /></div>
            <div className="space-y-2"><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue and planned actions..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="preventive">Preventive</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Source</Label><Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ncr">NCR</SelectItem><SelectItem value="audit">Audit</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="customer_complaint">Customer Complaint</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
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
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, open: 0, investigating: 0, closed: 0, daysSinceLast: 0 });
  const [form, setForm] = useState({ title: '', description: '', type: 'near_miss', severity: 'medium', location: '', date: '' });

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-incidents');
      if (res.success) {
        setIncidents(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const severityBadge: Record<string, string> = {
    low: 'bg-sky-50 text-sky-700 border-sky-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
  };
  const statusColors: Record<string, string> = {
    open: 'bg-sky-50 text-sky-700 border-sky-200',
    investigating: 'bg-amber-50 text-amber-700 border-amber-200',
    closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const typeLabel: Record<string, string> = { injury: 'Injury', near_miss: 'Near Miss', property_damage: 'Property Damage', environmental: 'Environmental', fire: 'Fire', chemical_spill: 'Chemical Spill' };
  const severityLabel: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

  const filtered = useMemo(() => incidents.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.incidentNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  }), [incidents, search, typeFilter, statusFilter]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => { counts[i.severity || 'medium'] = (counts[i.severity || 'medium'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: severityLabel[name] || name, value, fill: name === 'low' ? '#3b82f6' : name === 'medium' ? '#f59e0b' : name === 'high' ? '#f97316' : '#ef4444' }));
  }, [incidents]);
  const severityConfig = useMemo(() => Object.fromEntries(severityCounts.map((s: any) => [s.name, { label: s.name, color: s.fill }])) as any, [severityCounts]);

  const kpiCards = [
    { label: 'Total Incidents', value: kpis.total, icon: TriangleAlert, color: 'from-red-500 to-orange-500' },
    { label: 'Open', value: kpis.open, icon: AlertCircle, color: 'from-sky-500 to-blue-500' },
    { label: 'Under Investigation', value: kpis.investigating, icon: Search, color: 'from-amber-500 to-yellow-500' },
    { label: 'Closed', value: kpis.closed, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Days Since Last Incident', value: kpis.daysSinceLast, icon: ShieldCheck, color: 'from-teal-500 to-emerald-500' },
  ];

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.date) { toast.error('Incident date is required'); return; }
    try {
      const res = await api.post('/api/safety-incidents', {
        title: form.title, description: form.description, type: form.type,
        severity: form.severity, location: form.location || null, incidentDate: form.date,
      });
      if (res.success) {
        toast.success(`Incident "${form.title}" reported successfully`);
        setDialogOpen(false);
        setForm({ title: '', description: '', type: 'near_miss', severity: 'medium', location: '', date: '' });
        fetchData();
      } else { toast.error(res.error || 'Failed to create incident'); }
    } catch { toast.error('Failed to create incident'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-incidents/${id}`);
      if (res.success) { toast.success('Incident deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
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
                      <SelectContent><SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="injury">Injury</SelectItem><SelectItem value="property_damage">Property Damage</SelectItem><SelectItem value="environmental">Environmental</SelectItem><SelectItem value="fire">Fire</SelectItem><SelectItem value="chemical_spill">Chemical Spill</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Severity</Label>
                    <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Location</Label><Input placeholder="e.g. Warehouse B" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
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

      {loading ? <LoadingSkeleton /> : <>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map(k => { const Icon = k.icon; return (
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
          <CardHeader className="pb-2"><CardTitle className="text-base">Severity Breakdown</CardTitle><CardDescription className="text-xs">By severity level</CardDescription></CardHeader>
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
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="injury">Injury</SelectItem><SelectItem value="property_damage">Property Damage</SelectItem><SelectItem value="environmental">Environmental</SelectItem><SelectItem value="fire">Fire</SelectItem><SelectItem value="chemical_spill">Chemical Spill</SelectItem></SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
            </div>
            <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Title</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Severity</TableHead><TableHead className="font-semibold">Location</TableHead><TableHead className="font-semibold">Date</TableHead><TableHead className="font-semibold">Reported By</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold">Root Cause</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? <TableRow><TableCell colSpan={10}><EmptyState icon={TriangleAlert} title="No incidents found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(i => (
                    <TableRow key={i.id} className="cursor-pointer hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold">{i.incidentNumber}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{i.title}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{typeLabel[i.type] || i.type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={severityBadge[i.severity] || ''}>{severityLabel[i.severity] || i.severity}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate max-w-[120px]">{i.location}</span></div></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(i.incidentDate)}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(i.reportedBy?.fullName || '')}</AvatarFallback></Avatar><span className="text-sm whitespace-nowrap">{i.reportedBy?.fullName || ''}</span></div></TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[i.status] || ''}>{i.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{i.rootCause || '—'}</TableCell>
                      <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
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
      </>}
    </div>
  );
}

function SafetyInspectionsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState(['', '']);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, completed: 0, failed: 0, scheduled: 0, inProgress: 0 });
  const [form, setForm] = useState({ title: '', type: 'routine', area: '', inspector: '', scheduledDate: '' });

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-inspections');
      if (res.success) {
        setInspections(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const statusColors: Record<string, string> = { completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', failed: 'bg-red-50 text-red-700 border-red-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', scheduled: 'bg-sky-50 text-sky-700 border-sky-200' };
  const typeColors: Record<string, string> = { routine: 'bg-slate-100 text-slate-600 border-slate-200', special: 'bg-violet-50 text-violet-700 border-violet-200', follow_up: 'bg-orange-50 text-orange-700 border-orange-200' };

  const filtered = useMemo(() => inspections.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.inspectionNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  }), [inspections, search, typeFilter, statusFilter]);

  const parseFindings = (f: string) => { try { return JSON.parse(f || '[]'); } catch { return []; } };

  const kpiCards = [
    { label: 'Total Inspections', value: kpis.total, icon: ClipboardCheck, color: 'from-emerald-500 to-teal-500' },
    { label: 'Passed', value: kpis.completed, icon: CheckCircle2, color: 'from-emerald-500 to-green-500' },
    { label: 'Failed', value: kpis.failed, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Scheduled', value: kpis.scheduled, icon: Calendar, color: 'from-sky-500 to-blue-500' },
  ];

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.scheduledDate) { toast.error('Scheduled date is required'); return; }
    try {
      const findings = checklistItems.filter(c => c.trim());
      const res = await api.post('/api/safety-inspections', {
        title: form.title, type: form.type, status: 'scheduled',
        scheduledDate: form.scheduledDate, location: form.area || null,
        inspectorId: form.inspector || null, findings: JSON.stringify(findings),
      });
      if (res.success) {
        toast.success(`Inspection "${form.title}" created successfully`);
        setDialogOpen(false);
        setForm({ title: '', type: 'routine', area: '', inspector: '', scheduledDate: '' });
        setChecklistItems(['', '']);
        fetchData();
      } else { toast.error(res.error || 'Failed to create inspection'); }
    } catch { toast.error('Failed to create inspection'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-inspections/${id}`);
      if (res.success) { toast.success('Inspection deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSkeleton />;

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
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="special">Special</SelectItem><SelectItem value="follow_up">Follow Up</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Area</Label><Input placeholder="e.g. Building A" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Inspector ID</Label><Input placeholder="User ID (optional)" value={form.inspector} onChange={e => setForm(p => ({ ...p, inspector: e.target.value }))} /></div>
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
        {kpiCards.map(k => { const Icon = k.icon; return (
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
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="routine">Routine</SelectItem><SelectItem value="special">Special</SelectItem><SelectItem value="follow_up">Follow Up</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Passed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Title</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Area</TableHead><TableHead className="font-semibold">Date</TableHead><TableHead className="font-semibold">Findings</TableHead><TableHead className="font-semibold">Score</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={9}><EmptyState icon={ClipboardCheck} title="No inspections found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(i => {
                  const findings = parseFindings(i.findings);
                  const scorePct = i.maxScore ? Math.round((i.score / i.maxScore) * 100) : (i.score || 0);
                  return (
                  <TableRow key={i.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{i.inspectionNumber}</TableCell>
                    <TableCell className="font-medium max-w-[220px] truncate">{i.title}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[i.type] || ''}>{i.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[120px]">{i.location}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(i.scheduledDate)}</TableCell>
                    <TableCell className="text-sm font-medium">{Array.isArray(findings) ? findings.length : 0}</TableCell>
                    <TableCell>
                      {scorePct > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${scorePct >= 80 ? 'bg-emerald-500' : scorePct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${scorePct}%` }} /></div>
                          <span className={`text-sm font-semibold ${scorePct >= 80 ? 'text-emerald-600' : scorePct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{scorePct}%</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[i.status] || ''}>{i.status?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                  );
                })}
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
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, completed: 0, inProgress: 0, overdue: 0, planned: 0 });
  const [form, setForm] = useState({ title: '', type: 'induction', trainer: '', durationHours: '', scheduledDate: '', location: '' });

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-training');
      if (res.success) {
        setTrainings(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const statusColors: Record<string, string> = { completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', in_progress: 'bg-sky-50 text-sky-700 border-sky-200', cancelled: 'bg-red-50 text-red-700 border-red-200', planned: 'bg-slate-100 text-slate-500 border-slate-200' };
  const typeColors: Record<string, string> = { induction: 'bg-red-50 text-red-600 border-red-200', refresher: 'bg-amber-50 text-amber-700 border-amber-200', specialized: 'bg-violet-50 text-violet-700 border-violet-200' };

  const filtered = useMemo(() => trainings.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.trainer || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  }), [trainings, search, statusFilter]);

  const completedCount = kpis.completed || 0;
  const complianceRate = kpis.total ? Math.round((completedCount / kpis.total) * 100) : 0;

  const kpiCards = [
    { label: 'Total Courses', value: kpis.total, icon: GraduationCap, color: 'from-emerald-500 to-teal-500' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'from-sky-500 to-blue-500' },
    { label: 'Overdue', value: kpis.overdue, icon: AlertTriangle, color: 'from-red-500 to-orange-500' },
    { label: 'Compliance Rate', value: `${complianceRate}%`, icon: ShieldCheck, color: 'from-amber-500 to-yellow-500' },
  ];

  const handleCreate = async () => {
    if (!form.title) { toast.error('Course name is required'); return; }
    try {
      const res = await api.post('/api/safety-training', {
        title: form.title, type: form.type, trainer: form.trainer || null,
        durationHours: form.durationHours ? parseFloat(form.durationHours) : null,
        scheduledDate: form.scheduledDate || null, location: form.location || null,
        status: 'planned',
      });
      if (res.success) {
        toast.success(`Training "${form.title}" created successfully`);
        setDialogOpen(false);
        setForm({ title: '', type: 'induction', trainer: '', durationHours: '', scheduledDate: '', location: '' });
        fetchData();
      } else { toast.error(res.error || 'Failed to create training'); }
    } catch { toast.error('Failed to create training'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-training/${id}`);
      if (res.success) { toast.success('Training deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSkeleton />;

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
                <div className="space-y-2"><Label>Course Name</Label><Input placeholder="e.g. Fire Safety Training" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="induction">Induction</SelectItem><SelectItem value="refresher">Refresher</SelectItem><SelectItem value="specialized">Specialized</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Duration (hours)</Label><Input type="number" placeholder="e.g. 4" value={form.durationHours} onChange={e => setForm(p => ({ ...p, durationHours: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Trainer</Label><Input placeholder="Trainer name" value={form.trainer} onChange={e => setForm(p => ({ ...p, trainer: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input placeholder="e.g. Training Room A" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
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
        {kpiCards.map(k => { const Icon = k.icon; return (
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
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search courses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">Course Name</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Trainer</TableHead><TableHead className="font-semibold">Duration</TableHead><TableHead className="font-semibold">Location</TableHead><TableHead className="font-semibold">Scheduled Date</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={GraduationCap} title="No courses found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(t => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-medium max-w-[220px] truncate">{t.title}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[t.type] || ''}>{t.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.trainer || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.durationHours ? `${t.durationHours}h` : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.location || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(t.scheduledDate)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[t.status] || ''}>{t.status?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
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
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, available: 0, inUse: 0, expired: 0, disposed: 0, dueInspection: 0 });
  const [form, setForm] = useState({ name: '', type: 'ppe', location: '', lastInspection: '', nextInspection: '' });

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-equipment');
      if (res.success) {
        setEquipment(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getDisplayStatus = (eq: any) => {
    if (eq.status === 'expired' || (eq.expiryDate && new Date(eq.expiryDate) < new Date())) return 'expired';
    if (eq.status === 'disposed') return 'disposed';
    if (eq.nextInspection && new Date(eq.nextInspection) < new Date(Date.now() + 30 * 86400000)) return 'expiring';
    if (!eq.nextInspection && !eq.lastInspected) return 'not_inspected';
    return 'valid';
  };

  const statusColors: Record<string, string> = {
    valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expiring: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    not_inspected: 'bg-slate-100 text-slate-500 border-slate-200',
    disposed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    in_use: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  const typeColors: Record<string, string> = {
    ppe: 'bg-sky-50 text-sky-700 border-sky-200',
    fire_extinguisher: 'bg-red-50 text-red-600 border-red-200',
    first_aid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    gas_detector: 'bg-violet-50 text-violet-700 border-violet-200',
    spill_kit: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const filtered = useMemo(() => equipment.filter(eq => {
    if (search && !eq.name.toLowerCase().includes(search.toLowerCase()) && !(eq.code || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && eq.type !== typeFilter) return false;
    if (statusFilter !== 'all' && getDisplayStatus(eq) !== statusFilter) return false;
    return true;
  }), [equipment, search, typeFilter, statusFilter]);

  const kpiCards = [
    { label: 'Total Equipment', value: kpis.total, icon: HardHat, color: 'from-emerald-500 to-teal-500' },
    { label: 'Available', value: kpis.available, icon: CheckCircle2, color: 'from-sky-500 to-blue-500' },
    { label: 'Expired', value: kpis.expired, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Due for Inspection', value: kpis.dueInspection, icon: AlertTriangle, color: 'from-amber-500 to-yellow-500' },
  ];

  const handleCreate = async () => {
    if (!form.name) { toast.error('Equipment name is required'); return; }
    try {
      const res = await api.post('/api/safety-equipment', {
        name: form.name, type: form.type, location: form.location || null,
        lastInspected: form.lastInspection || null, nextInspection: form.nextInspection || null,
      });
      if (res.success) {
        toast.success(`Equipment "${form.name}" registered successfully`);
        setDialogOpen(false);
        setForm({ name: '', type: 'ppe', location: '', lastInspection: '', nextInspection: '' });
        fetchData();
      } else { toast.error(res.error || 'Failed to register equipment'); }
    } catch { toast.error('Failed to register equipment'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-equipment/${id}`);
      if (res.success) { toast.success('Equipment deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSkeleton />;

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
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ppe">PPE</SelectItem><SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="gas_detector">Gas Detector</SelectItem><SelectItem value="spill_kit">Spill Kit</SelectItem></SelectContent>
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
        {kpiCards.map(k => { const Icon = k.icon; return (
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
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="ppe">PPE</SelectItem><SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem><SelectItem value="first_aid">First Aid</SelectItem><SelectItem value="gas_detector">Gas Detector</SelectItem><SelectItem value="spill_kit">Spill Kit</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="valid">Valid</SelectItem><SelectItem value="expiring">Expiring</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="not_inspected">Not Inspected</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Equipment Name</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Location</TableHead><TableHead className="font-semibold">Last Inspection</TableHead><TableHead className="font-semibold">Next Inspection</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={HardHat} title="No equipment found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(eq => {
                  const dStatus = getDisplayStatus(eq);
                  return (
                  <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{eq.code}</TableCell>
                    <TableCell className="font-medium max-w-[220px] truncate">{eq.name}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[eq.type] || ''}>{eq.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[140px]">{eq.location}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(eq.lastInspected)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap"><span className={dStatus === 'expired' ? 'text-red-600 font-medium' : dStatus === 'expiring' ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>{formatDate(eq.nextInspection)}</span></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[dStatus] || ''}>{dStatus?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(eq.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                  );
                })}
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
  const [permits, setPermits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ total: 0, active: 0, pending: 0, expired: 0, completed: 0, cancelled: 0 });
  const [safetyMeasures, setSafetyMeasures] = useState(['', '', '']);
  const [form, setForm] = useState({ type: 'hot_work', title: '', description: '', area: '', validFrom: '', validUntil: '' });

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/safety-permits');
      if (res.success) {
        setPermits(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const statusColors: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', pending: 'bg-amber-50 text-amber-700 border-amber-200', expired: 'bg-red-50 text-red-700 border-red-200', cancelled: 'bg-slate-100 text-slate-500 border-slate-300', completed: 'bg-sky-50 text-sky-700 border-sky-200', approved: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  const typeColors: Record<string, string> = { hot_work: 'bg-red-50 text-red-600 border-red-200', confined_space: 'bg-orange-50 text-orange-700 border-orange-200', elevated_work: 'bg-sky-50 text-sky-700 border-sky-200', electrical: 'bg-violet-50 text-violet-700 border-violet-200', excavation: 'bg-amber-50 text-amber-700 border-amber-200' };

  const filtered = useMemo(() => permits.filter(p => {
    if (search && !p.description.toLowerCase().includes(search.toLowerCase()) && !(p.permitNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  }), [permits, search, typeFilter, statusFilter]);

  const kpiCards = [
    { label: 'Active Permits', value: kpis.active, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Expired', value: kpis.expired, icon: XCircle, color: 'from-red-500 to-orange-500' },
    { label: 'Pending Approval', value: kpis.pending, icon: Clock, color: 'from-amber-500 to-yellow-500' },
    { label: 'Cancelled', value: kpis.cancelled, icon: ShieldAlert, color: 'from-slate-500 to-slate-600' },
  ];

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.validFrom || !form.validUntil) { toast.error('Valid from and valid until dates are required'); return; }
    try {
      const precautions = safetyMeasures.filter(m => m.trim());
      const res = await api.post('/api/safety-permits', {
        title: form.title, type: form.type, description: form.description || '',
        location: form.area || null, startDate: form.validFrom, endDate: form.validUntil,
        precautions: JSON.stringify(precautions),
      });
      if (res.success) {
        toast.success(`Permit for "${form.type.replace(/_/g, ' ')}" submitted successfully`);
        setDialogOpen(false);
        setForm({ type: 'hot_work', title: '', description: '', area: '', validFrom: '', validUntil: '' });
        setSafetyMeasures(['', '', '']);
        fetchData();
      } else { toast.error(res.error || 'Failed to create permit'); }
    } catch { toast.error('Failed to create permit'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/safety-permits/${id}`);
      if (res.success) { toast.success('Permit deleted'); fetchData(); }
      else { toast.error(res.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSkeleton />;

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
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hot_work">Hot Work</SelectItem><SelectItem value="confined_space">Confined Space</SelectItem><SelectItem value="elevated_work">Working at Height</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="excavation">Excavation</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Title</Label><Input placeholder="Permit title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe the work activity..." rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Area</Label><Input placeholder="Work location" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
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
        {kpiCards.map(k => { const Icon = k.icon; return (
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
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="hot_work">Hot Work</SelectItem><SelectItem value="confined_space">Confined Space</SelectItem><SelectItem value="elevated_work">Working at Height</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="excavation">Excavation</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader sticky className="top-0 z-10"><TableRow className="bg-muted/50"><TableHead className="font-semibold">Permit #</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Description</TableHead><TableHead className="font-semibold">Area</TableHead><TableHead className="font-semibold">Requested By</TableHead><TableHead className="font-semibold">Valid From</TableHead><TableHead className="font-semibold">Valid Until</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={9}><EmptyState icon={FileCheck} title="No permits found" description="Try adjusting your search or filters" /></TableCell></TableRow> : filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{p.permitNumber}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[p.type] || ''}>{p.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.description || p.title}</TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate max-w-[120px]">{p.location}</span></div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(p.requestedBy?.fullName || '')}</AvatarFallback></Avatar><span className="text-sm whitespace-nowrap">{p.requestedBy?.fullName || ''}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(p.startDate)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap"><span className={p.status === 'expired' || p.status === 'cancelled' ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{formatDate(p.endDate)}</span></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[p.status] || ''}>{p.status?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem><DropdownMenuItem className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
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
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<WorkOrder[]>('/api/work-orders?limit=9999'),
      api.get<Asset[]>('/api/assets?limit=9999'),
    ]).then(([woRes, assetRes]) => {
      if (woRes.success && Array.isArray(woRes.data)) setWorkOrders(woRes.data);
      if (assetRes.success && Array.isArray(assetRes.data)) setAssets(assetRes.data);
      setLoading(false);
    });
  }, []);

  const completedWOs = workOrders.filter(wo => wo.status === 'completed' || wo.status === 'closed' || wo.status === 'verified');

  // Group completed WOs by month
  const monthlyMap: Record<string, { completed: number; plannedHrs: number; actualHrs: number }> = {};
  completedWOs.forEach(wo => {
    const dateStr = wo.actualEnd || wo.updatedAt || wo.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = format(d, 'MMM yyyy');
    if (!monthlyMap[key]) monthlyMap[key] = { completed: 0, plannedHrs: 0, actualHrs: 0 };
    monthlyMap[key].completed += 1;
    monthlyMap[key].plannedHrs += wo.estimatedHours || 0;
    monthlyMap[key].actualHrs += wo.actualHours || 0;
  });

  // Assets under maintenance for downtime count
  const underMaintenanceCount = assets.filter(a => a.status === 'under_maintenance').length;

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      const efficiency = data.plannedHrs > 0 ? Math.min(100, Math.round((data.plannedHrs / (data.plannedHrs + Math.max(0, data.actualHrs - data.plannedHrs))) * 100 * 10) / 10) : data.actualHrs > 0 ? 100 : 0;
      return { month: label, monthKey: key, completed: data.completed, plannedHrs: Math.round(data.plannedHrs), actualHrs: Math.round(data.actualHrs), efficiency, downtime: underMaintenanceCount };
    });

  const months = monthlyData.map(d => d.month);
  const filtered = monthFilter === 'all' ? monthlyData : monthlyData.filter(d => d.month.includes(monthFilter));
  const totalOutput = monthlyData.reduce((s, d) => s + d.completed, 0);
  const avgEfficiency = monthlyData.length > 0 ? (monthlyData.reduce((s, d) => s + d.efficiency, 0) / monthlyData.length).toFixed(1) : '0.0';
  const avgDowntime = monthlyData.length > 0 ? (monthlyData.reduce((s, d) => s + d.actualHrs, 0) / monthlyData.length).toFixed(1) : '0.0';
  const avgWaste = totalOutput > 0 ? ((monthlyData.reduce((s, d) => s + Math.max(0, d.actualHrs - d.plannedHrs), 0) / monthlyData.reduce((s, d) => s + d.plannedHrs || 1, 0)) * 100).toFixed(1) : '0.0';
  const maxActual = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.completed), 1) : 1;
  const summaryCards = [
    { label: 'Completed WOs', value: totalOutput.toString(), icon: Factory, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Efficiency', value: `${avgEfficiency}%`, icon: Target, color: 'bg-sky-50 text-sky-600' },
    { label: 'Avg Actual Hours', value: `${avgDowntime} hrs/mo`, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Over-hours Rate', value: `${avgWaste}%`, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Production Reports</h1><p className="text-muted-foreground mt-1">Work order output, planned vs actual hours, and efficiency trends derived from completed work orders</p></div>
        <div className="w-full sm:w-auto">
          <Select value={monthFilter} onValueChange={setMonthFilter}><SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Filter month" /></SelectTrigger><SelectContent><SelectItem value="all">All Months</SelectItem>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      {completedWOs.length === 0 ? (
        <EmptyState icon={Factory} title="No production data available yet" description="Complete work orders to see production trends, efficiency metrics, and planned vs actual hours." />
      ) : (<>
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
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Completed Work Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {monthlyData.map(d => (
                <div key={d.monthKey} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{d.completed}</span>
                  <div className="w-full bg-emerald-100 rounded-t-md" style={{ height: `${(d.completed / maxActual) * 140}px` }}>
                    <div className="w-full h-full bg-emerald-500 rounded-t-md opacity-80" />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center">{d.month.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Completed WOs</TableHead><TableHead className="text-right">Planned Hrs</TableHead><TableHead className="text-right">Actual Hrs</TableHead><TableHead className="hidden sm:table-cell text-right">Efficiency</TableHead><TableHead className="hidden md:table-cell text-right">Assets in Maint.</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(d => (
              <TableRow key={d.monthKey} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className="text-right font-medium">{d.completed}</TableCell>
                <TableCell className="text-right text-muted-foreground">{d.plannedHrs.toLocaleString()}</TableCell>
                <TableCell className="text-right">{d.actualHrs.toLocaleString()}</TableCell>
                <TableCell className={`text-right font-medium hidden sm:table-cell ${d.efficiency >= 90 ? 'text-emerald-600' : d.efficiency >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{d.efficiency}%</TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.downtime}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
function ReportsQualityPage() {
  const [monthFilter, setMonthFilter] = useState('all');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<WorkOrder[]>('/api/work-orders?limit=9999').then(res => {
      if (res.success && Array.isArray(res.data)) setWorkOrders(res.data);
      setLoading(false);
    });
  }, []);

  // Group WOs by type
  const typeMap: Record<string, { total: number; completed: number; totalActualHrs: number; totalEstHrs: number }> = {};
  workOrders.forEach(wo => {
    const t = wo.type || 'other';
    if (!typeMap[t]) typeMap[t] = { total: 0, completed: 0, totalActualHrs: 0, totalEstHrs: 0 };
    typeMap[t].total += 1;
    if (wo.status === 'completed' || wo.status === 'closed' || wo.status === 'verified') typeMap[t].completed += 1;
    typeMap[t].totalActualHrs += wo.actualHours || 0;
    typeMap[t].totalEstHrs += wo.estimatedHours || 0;
  });

  const typeColors: Record<string, string> = { preventive: 'bg-emerald-500', corrective: 'bg-amber-500', emergency: 'bg-red-500', inspection: 'bg-sky-500', predictive: 'bg-violet-500', project: 'bg-teal-500', other: 'bg-slate-400' };
  const ncrCategories = Object.entries(typeMap)
    .map(([type, data]) => ({
      name: type.replace('_', ' '),
      count: data.total,
      color: typeColors[type] || 'bg-slate-400',
      completed: data.completed,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      avgHours: data.completed > 0 ? Math.round((data.totalActualHrs / data.completed) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const totalNCRs = ncrCategories.reduce((s, c) => s + c.count, 0);
  const totalCompleted = ncrCategories.reduce((s, c) => s + c.completed, 0);
  const avgPassRate = totalNCRs > 0 ? ((totalCompleted / totalNCRs) * 100).toFixed(1) : '0.0';

  // Group completed WOs by month
  const monthlyMap: Record<string, { completed: number; total: number }> = {};
  workOrders.forEach(wo => {
    const dateStr = wo.actualEnd || wo.updatedAt || wo.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { completed: 0, total: 0 };
    monthlyMap[key].total += 1;
    if (wo.status === 'completed' || wo.status === 'closed' || wo.status === 'verified') monthlyMap[key].completed += 1;
  });

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      const passRate = data.total > 0 ? Math.round((data.completed / data.total) * 1000) / 10 : 0;
      return { month: label, monthKey: key, inspections: data.total, passed: data.completed, failed: data.total - data.completed, passRate, ncrs: data.total - data.completed };
    });

  const months = monthlyData.map(d => d.month);
  const filtered = monthFilter === 'all' ? monthlyData : monthlyData.filter(d => d.month.includes(monthFilter));
  const totalInspections = workOrders.length;
  const summaryCards = [
    { label: 'Total Work Orders', value: totalInspections.toString(), icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Completion Rate', value: `${avgPassRate}%`, icon: ShieldCheck, color: 'bg-sky-50 text-sky-600' },
    { label: 'Incomplete WOs', value: (totalNCRs - totalCompleted).toString(), icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'WO Types', value: ncrCategories.length.toString(), icon: Clock, color: 'bg-red-50 text-red-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Quality Reports</h1><p className="text-muted-foreground mt-1">Work order completion rates, type analysis, and quality KPIs derived from real work order data</p></div>
        <Select value={monthFilter} onValueChange={setMonthFilter}><SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Filter month" /></SelectTrigger><SelectContent><SelectItem value="all">All Months</SelectItem>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
      </div>
      {workOrders.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No quality data available yet" description="Create work orders to see completion rates and type analysis." />
      ) : (<>
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
          <CardHeader className="pb-3"><CardTitle className="text-base">Work Orders by Type</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ncrCategories.map(cat => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28 capitalize">{cat.name}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className={`h-full ${cat.color} rounded-full`} style={{ width: `${totalNCRs > 0 ? (cat.count / Math.max(...ncrCategories.map(c => c.count))) * 100 : 0}%` }} /></div>
                  <span className="text-sm font-semibold w-36 text-right">{cat.count} ({cat.completionRate}% done)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 shadow-sm"><CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total WOs</TableHead><TableHead className="hidden sm:table-cell text-right">Completed</TableHead><TableHead className="hidden sm:table-cell text-right">Incomplete</TableHead><TableHead className="text-right">Completion Rate</TableHead><TableHead className="hidden md:table-cell text-right">Avg Hrs/WO</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(d => (
              <TableRow key={d.monthKey} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className="text-right">{d.inspections}</TableCell>
                <TableCell className="text-right text-emerald-600 hidden sm:table-cell">{d.passed}</TableCell>
                <TableCell className="text-right text-red-600 hidden sm:table-cell">{d.failed}</TableCell>
                <TableCell className={`text-right font-medium ${d.passRate >= 95 ? 'text-emerald-600' : d.passRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{d.passRate}%</TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">—</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
function ReportsSafetyPage() {
  const [yearFilter, setYearFilter] = useState('2025');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mrs, setMrs] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<WorkOrder[]>('/api/work-orders?limit=9999'),
      api.get<Asset[]>('/api/assets?limit=9999'),
      api.get<MaintenanceRequest[]>('/api/maintenance-requests?limit=9999'),
    ]).then(([woRes, assetRes, mrRes]) => {
      if (woRes.success && Array.isArray(woRes.data)) setWorkOrders(woRes.data);
      if (assetRes.success && Array.isArray(assetRes.data)) setAssets(assetRes.data);
      if (mrRes.success && Array.isArray(mrRes.data)) setMrs(mrRes.data);
      setLoading(false);
    });
  }, []);

  // Safety-related: critical/urgent priority WOs
  const safetyWOs = workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'urgent' || wo.priority === 'emergency');
  const criticalWOs = workOrders.filter(wo => wo.priority === 'critical' || wo.priority === 'emergency');
  const urgentWOs = workOrders.filter(wo => wo.priority === 'urgent');

  // At-risk assets: poor condition or out of service
  const atRiskAssets = assets.filter(a => a.condition === 'poor' || a.status === 'out_of_service');
  const poorConditionAssets = assets.filter(a => a.condition === 'poor');
  const outOfServiceAssets = assets.filter(a => a.status === 'out_of_service');

  // Overdue MRs: pending for more than 7 days
  const now = Date.now();
  const overdueMrs = mrs.filter(mr => mr.status === 'pending' && (now - new Date(mr.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000);
  const pendingMrs = mrs.filter(mr => mr.status === 'pending');

  // Priority breakdown for chart
  const incidentTypes = [
    { name: 'Critical', count: criticalWOs.length, color: 'bg-red-500' },
    { name: 'Urgent', count: urgentWOs.length, color: 'bg-amber-500' },
    { name: 'Poor Assets', count: poorConditionAssets.length, color: 'bg-orange-500' },
    { name: 'Out of Service', count: outOfServiceAssets.length, color: 'bg-sky-500' },
    { name: 'Overdue MRs', count: overdueMrs.length, color: 'bg-emerald-500' },
  ].filter(t => t.count > 0);
  const maxCount = incidentTypes.length > 0 ? Math.max(...incidentTypes.map(t => t.count)) : 1;

  // Group by month
  const monthlyMap: Record<string, { critical: number; urgent: number; atRiskAssets: number; overdueMRs: number }> = {};
  const addMonth = (dateStr: string, key: string, value: number) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    const mk = `${d.getFullYear()}`;
    if (!monthlyMap[mk]) monthlyMap[mk] = { critical: 0, urgent: 0, atRiskAssets: 0, overdueMRs: 0 };
    (monthlyMap[mk] as any)[key] = (monthlyMap[mk] as any)[key] || 0;
    (monthlyMap[mk] as any)[key] += value;
  };
  criticalWOs.forEach(wo => addMonth(wo.createdAt || '', 'critical', 1));
  urgentWOs.forEach(wo => addMonth(wo.createdAt || '', 'urgent', 1));
  overdueMrs.forEach(mr => addMonth(mr.createdAt || '', 'overdueMRs', 1));

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, data]) => ({
      month: year,
      incidents: data.critical,
      nearMisses: data.urgent,
      trir: (data.critical + data.urgent) > 0 ? Math.round(((data.critical * 2 + data.urgent) / (data.critical + data.urgent)) * 10) / 10 : 0,
      trainingHrs: 0,
      inspections: atRiskAssets.length,
      actionsClosed: workOrders.filter(wo => (wo.status === 'completed' || wo.status === 'closed') && (wo.createdAt || '').startsWith(year)).length,
    }));

  const filtered = monthlyData.filter(d => d.month.includes(yearFilter));
  const totalIncidents = criticalWOs.length + urgentWOs.length;
  const avgTRIR = totalIncidents > 0 ? (monthlyData.length > 0 ? (monthlyData.reduce((s, d) => s + d.trir, 0) / monthlyData.length).toFixed(1) : '0.0') : '0.0';
  const summaryCards = [
    { label: 'Critical WOs', value: criticalWOs.length.toString(), icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
    { label: 'Urgent WOs', value: urgentWOs.length.toString(), icon: ShieldAlert, color: 'bg-amber-50 text-amber-600' },
    { label: 'At-Risk Assets', value: atRiskAssets.length.toString(), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Overdue MRs', value: overdueMrs.length.toString(), icon: GraduationCap, color: 'bg-sky-50 text-sky-600' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Safety Reports</h1><p className="text-muted-foreground mt-1">Critical/urgent work orders, at-risk assets, and overdue maintenance requests</p></div>
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
      {safetyWOs.length === 0 && atRiskAssets.length === 0 && overdueMrs.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No safety concerns detected" description="No critical/urgent work orders, at-risk assets, or overdue maintenance requests found." />
      ) : (<>
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Safety Risk Breakdown</CardTitle></CardHeader>
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
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Year</TableHead><TableHead className="text-right">Critical WOs</TableHead><TableHead className="hidden sm:table-cell text-right">Urgent WOs</TableHead><TableHead className="text-right">Risk Score</TableHead><TableHead className="hidden md:table-cell text-right">At-Risk Assets</TableHead><TableHead className="hidden lg:table-cell text-right">Actions Closed</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(d => (
              <TableRow key={d.month} className="hover:bg-muted/30">
                <TableCell className="font-medium">{d.month}</TableCell>
                <TableCell className={`text-right font-medium ${d.incidents > 0 ? 'text-red-600' : 'text-foreground'}`}>{d.incidents}</TableCell>
                <TableCell className="text-right text-amber-600 hidden sm:table-cell">{d.nearMisses}</TableCell>
                <TableCell className={`text-right font-medium ${d.trir > 1.0 ? 'text-red-600' : d.trir > 0.5 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.trir}</TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">{d.inspections}</TableCell>
                <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{d.actionsClosed}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6}><EmptyState icon={Calendar} title={`No data for ${yearFilter}`} description="Select a different year or create work orders to see safety data." /></TableCell></TableRow>
            )}
          </TableBody></Table></div>
        </CardContent></Card>
      </>)}
    </div>
  );
}
function ReportsFinancialPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<WorkOrder[]>('/api/work-orders?limit=9999'),
      api.get<Asset[]>('/api/assets?limit=9999'),
      api.get<InventoryItem[]>('/api/inventory?limit=9999'),
    ]).then(([woRes, assetRes, invRes]) => {
      if (woRes.success && Array.isArray(woRes.data)) setWorkOrders(woRes.data);
      if (assetRes.success && Array.isArray(assetRes.data)) setAssets(assetRes.data);
      if (invRes.success && Array.isArray(invRes.data)) setInventory(invRes.data);
      setLoading(false);
    });
  }, []);

  const totalCost = workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);
  const materialCost = workOrders.reduce((sum, wo) => sum + (wo.materialCost || 0), 0);
  const laborCost = workOrders.reduce((sum, wo) => sum + (wo.laborCost || 0), 0);
  const avgCost = workOrders.length > 0 ? totalCost / workOrders.length : 0;

  // Asset values
  const totalAssetPurchaseCost = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
  const totalAssetCurrentValue = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);

  // Inventory value
  const totalInventoryValue = inventory.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.unitCost || 0)), 0);

  const costByType: Record<string, { cost: number; count: number }> = {};
  workOrders.forEach(wo => {
    const t = wo.type || 'other';
    if (!costByType[t]) costByType[t] = { cost: 0, count: 0 };
    costByType[t].cost += wo.totalCost || 0;
    costByType[t].count += 1;
  });
  const typeEntries = Object.entries(costByType).sort((a, b) => b[1].cost - a[1].cost);

  // Monthly cost trends from completed WOs
  const monthlyCostMap: Record<string, { totalCost: number; laborCost: number; materialCost: number; count: number }> = {};
  workOrders.forEach(wo => {
    const dateStr = wo.actualEnd || wo.updatedAt || wo.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyCostMap[key]) monthlyCostMap[key] = { totalCost: 0, laborCost: 0, materialCost: 0, count: 0 };
    monthlyCostMap[key].totalCost += wo.totalCost || 0;
    monthlyCostMap[key].laborCost += wo.laborCost || 0;
    monthlyCostMap[key].materialCost += wo.materialCost || 0;
    monthlyCostMap[key].count += 1;
  });

  const monthlyCostData = Object.entries(monthlyCostMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, data]) => {
      const d = new Date(key + '-01');
      const label = format(d, 'MMM yyyy');
      return { month: label, monthKey: key, ...data };
    });

  const maxMonthlyCost = monthlyCostData.length > 0 ? Math.max(...monthlyCostData.map(d => d.totalCost), 1) : 1;

  const highCostWOs = [...workOrders].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0)).slice(0, 15);

  const typeColors: Record<string, string> = { preventive: 'bg-emerald-500', corrective: 'bg-amber-500', emergency: 'bg-red-500', inspection: 'bg-sky-500', predictive: 'bg-violet-500', project: 'bg-teal-500' };

  const summaryCards = [
    { label: 'Total Maintenance Cost', value: `$${totalCost.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Asset Value (Current)', value: `$${totalAssetCurrentValue.toLocaleString()}`, icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Inventory Value', value: `$${totalInventoryValue.toLocaleString()}`, icon: Boxes, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: 'Avg WO Cost', value: `$${avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  if (loading) return <div className="page-content"><LoadingSkeleton /></div>;

  return (
    <div className="page-content">
      <div><h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1><p className="text-muted-foreground mt-1">Financial reports on maintenance costs, asset values, inventory value, and budget trends</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(k => { const I = k.icon; return (
          <Card key={k.label}><CardContent className="p-5"><div className="flex items-center gap-4"><div className={`h-11 w-11 rounded-xl ${k.color} flex items-center justify-center`}><I className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></div></CardContent></Card>
        ); })}
      </div>
      {monthlyCostData.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Cost Trends</CardTitle><CardDescription className="text-xs">Maintenance expenditure by month</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {monthlyCostData.map(d => (
                <div key={d.monthKey} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">${d.totalCost.toLocaleString()}</span>
                  <div className="w-full bg-emerald-100 rounded-t-md" style={{ height: `${(d.totalCost / maxMonthlyCost) * 140}px` }}>
                    <div className="w-full h-full bg-emerald-500 rounded-t-md opacity-80" />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center">{d.month.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <Card className="border"><CardHeader><CardTitle className="text-base">Asset Value Distribution</CardTitle><CardDescription className="text-xs">Purchase cost vs current value</CardDescription></CardHeader><CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Assets</span>
              <span className="text-sm font-semibold">{assets.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Purchase Cost</span>
              <span className="text-sm font-semibold">${totalAssetPurchaseCost.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Value</span>
              <span className="text-sm font-semibold">${totalAssetCurrentValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Inventory Value</span>
              <span className="text-sm font-semibold">${totalInventoryValue.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Portfolio Value</span>
              <span className="text-lg font-bold">${(totalAssetCurrentValue + totalInventoryValue).toLocaleString()}</span>
            </div>
          </div>
        </CardContent></Card>
      </div>
      <Card className="border"><CardHeader><CardTitle className="text-base">High-Cost Work Orders</CardTitle><CardDescription className="text-xs">Top work orders by total cost</CardDescription></CardHeader><CardContent>
        <div className="max-h-96 overflow-y-auto">
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
        </div>
      </CardContent></Card>
    </div>
  );
}
function ReportsCustomPage() {
  const [dataSource, setDataSource] = useState<'work_orders' | 'assets' | 'inventory' | 'maintenance_requests'>('work_orders');
  const [metric, setMetric] = useState('count');
  const [loading, setLoading] = useState(true);
  const [summaryRows, setSummaryRows] = useState<{ key: string; label: string; value: string | number }[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const dataSourceLabels: Record<string, string> = {
    work_orders: 'Work Orders',
    assets: 'Assets',
    inventory: 'Inventory Items',
    maintenance_requests: 'Maintenance Requests',
  };

  const metricLabels: Record<string, string> = {
    count: 'Count by Status',
    cost: 'Cost Breakdown',
    hours: 'Hours Analysis',
    priority: 'Priority Distribution',
  };

  useEffect(() => {
    let endpoint = '';
    if (dataSource === 'work_orders') endpoint = '/api/work-orders?limit=9999';
    else if (dataSource === 'assets') endpoint = '/api/assets?limit=9999';
    else if (dataSource === 'inventory') endpoint = '/api/inventory?limit=9999';
    else if (dataSource === 'maintenance_requests') endpoint = '/api/maintenance-requests?limit=9999';

    api.get(endpoint).then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      setTotalCount(data.length);

      const rows: { key: string; label: string; value: string | number }[] = [];

      if (dataSource === 'work_orders') {
        const wos = data as WorkOrder[];
        if (metric === 'count') {
          const statusMap: Record<string, number> = {};
          wos.forEach(wo => { const s = wo.status || 'unknown'; statusMap[s] = (statusMap[s] || 0) + 1; });
          Object.entries(statusMap).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => rows.push({ key: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: c }));
        } else if (metric === 'cost') {
          const totalCost = wos.reduce((s, wo) => s + (wo.totalCost || 0), 0);
          rows.push({ key: 'total', label: 'Total Cost', value: `$${totalCost.toLocaleString()}` });
          rows.push({ key: 'labor', label: 'Total Labor Cost', value: `$${wos.reduce((s, wo) => s + (wo.laborCost || 0), 0).toLocaleString()}` });
          rows.push({ key: 'material', label: 'Total Material Cost', value: `$${wos.reduce((s, wo) => s + (wo.materialCost || 0), 0).toLocaleString()}` });
          rows.push({ key: 'avg', label: 'Avg Cost per WO', value: wos.length > 0 ? `$${Math.round(totalCost / wos.length).toLocaleString()}` : '$0' });
        } else if (metric === 'hours') {
          const totalActual = wos.reduce((s, wo) => s + (wo.actualHours || 0), 0);
          const totalEst = wos.reduce((s, wo) => s + (wo.estimatedHours || 0), 0);
          rows.push({ key: 'totalActual', label: 'Total Actual Hours', value: `${totalActual.toFixed(1)} hrs` });
          rows.push({ key: 'totalEst', label: 'Total Estimated Hours', value: `${totalEst.toFixed(1)} hrs` });
          rows.push({ key: 'avg', label: 'Avg Actual per WO', value: wos.length > 0 ? `${(totalActual / wos.length).toFixed(1)} hrs` : '0 hrs' });
        } else if (metric === 'priority') {
          const prioMap: Record<string, number> = {};
          wos.forEach(wo => { const p = wo.priority || 'unknown'; prioMap[p] = (prioMap[p] || 0) + 1; });
          Object.entries(prioMap).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => rows.push({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1), value: c }));
        }
      } else if (dataSource === 'assets') {
        const items = data as Asset[];
        if (metric === 'count') {
          const statusMap: Record<string, number> = {};
          items.forEach(a => { const s = a.status || 'unknown'; statusMap[s] = (statusMap[s] || 0) + 1; });
          Object.entries(statusMap).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => rows.push({ key: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: c }));
        } else if (metric === 'cost') {
          const totalPurchase = items.reduce((s, a) => s + (a.purchaseCost || 0), 0);
          const totalCurrent = items.reduce((s, a) => s + (a.currentValue || 0), 0);
          rows.push({ key: 'purchase', label: 'Total Purchase Cost', value: `$${totalPurchase.toLocaleString()}` });
          rows.push({ key: 'current', label: 'Total Current Value', value: `$${totalCurrent.toLocaleString()}` });
          rows.push({ key: 'avg', label: 'Avg per Asset', value: items.length > 0 ? `$${Math.round(totalCurrent / items.length).toLocaleString()}` : '$0' });
        } else if (metric === 'priority') {
          const condMap: Record<string, number> = {};
          items.forEach(a => { const c = a.condition || 'unknown'; condMap[c] = (condMap[c] || 0) + 1; });
          Object.entries(condMap).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => rows.push({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1), value: n }));
        } else {
          rows.push({ key: 'total', label: 'Total Assets', value: items.length });
        }
      } else if (dataSource === 'inventory') {
        const items = data as InventoryItem[];
        if (metric === 'count') {
          const catMap: Record<string, number> = {};
          items.forEach(i => { const c = i.category || 'unknown'; catMap[c] = (catMap[c] || 0) + 1; });
          Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => rows.push({ key: c, label: c, value: n }));
        } else if (metric === 'cost') {
          const totalValue = items.reduce((s, i) => s + ((i.currentStock || 0) * (i.unitCost || 0)), 0);
          const lowStock = items.filter(i => i.currentStock <= i.minStockLevel).length;
          rows.push({ key: 'totalValue', label: 'Total Inventory Value', value: `$${totalValue.toLocaleString()}` });
          rows.push({ key: 'lowStock', label: 'Low Stock Items', value: lowStock });
          rows.push({ key: 'avg', label: 'Avg Value per Item', value: items.length > 0 ? `$${Math.round(totalValue / items.length).toLocaleString()}` : '$0' });
        } else {
          rows.push({ key: 'total', label: 'Total Items', value: items.length });
          rows.push({ key: 'totalStock', label: 'Total Stock Units', value: items.reduce((s, i) => s + (i.currentStock || 0), 0) });
          rows.push({ key: 'lowStock', label: 'Low Stock Count', value: items.filter(i => i.currentStock <= i.minStockLevel).length });
        }
      } else if (dataSource === 'maintenance_requests') {
        const items = data as MaintenanceRequest[];
        if (metric === 'count') {
          const statusMap: Record<string, number> = {};
          items.forEach(mr => { const s = mr.status || 'unknown'; statusMap[s] = (statusMap[s] || 0) + 1; });
          Object.entries(statusMap).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => rows.push({ key: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: c }));
        } else if (metric === 'priority') {
          const prioMap: Record<string, number> = {};
          items.forEach(mr => { const p = mr.priority || 'unknown'; prioMap[p] = (prioMap[p] || 0) + 1; });
          Object.entries(prioMap).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => rows.push({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1), value: c }));
        } else {
          rows.push({ key: 'total', label: 'Total MRs', value: items.length });
          rows.push({ key: 'pending', label: 'Pending', value: items.filter(mr => mr.status === 'pending').length });
          rows.push({ key: 'approved', label: 'Approved', value: items.filter(mr => mr.status === 'approved').length });
        }
      }

      setSummaryRows(rows);
      setLoading(false);
    });
  }, [dataSource, metric]);

  const kpis = [
    { label: 'Data Source', value: dataSourceLabels[dataSource], icon: Database, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Metric', value: metricLabels[metric], icon: BarChart3, color: 'bg-sky-50 text-sky-600' },
    { label: 'Total Records', value: totalCount.toString(), icon: FileSpreadsheet, color: 'bg-amber-50 text-amber-600' },
    { label: 'Summary Rows', value: summaryRows.length.toString(), icon: CheckCircle2, color: 'bg-violet-50 text-violet-600' },
  ];

  return (
    <div className="page-content">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Custom Reports</h1><p className="text-muted-foreground mt-1">Build custom reports by selecting a data source and metric — results are generated in real time</p></div>
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
      <Card className="border border-border/60 shadow-sm">
        <CardHeader><CardTitle className="text-base">Report Builder</CardTitle><CardDescription className="text-xs">Select data source and metric to generate a report</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={(v: any) => setDataSource(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="work_orders">Work Orders</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="maintenance_requests">Maintenance Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count by Status</SelectItem>
                  <SelectItem value="cost">Cost Breakdown</SelectItem>
                  <SelectItem value="hours">Hours Analysis</SelectItem>
                  <SelectItem value="priority">Priority Distribution</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Metric / Category</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3}><div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />Loading data...</div></TableCell></TableRow>
                ) : summaryRows.length === 0 ? (
                  <TableRow><TableCell colSpan={3}><EmptyState icon={FileSpreadsheet} title="No data available" description="No data found for the selected source and metric." /></TableCell></TableRow>
                ) : summaryRows.map((row, idx) => (
                  <TableRow key={row.key} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right font-semibold">{typeof row.value === 'number' ? row.value.toLocaleString() : row.value}</TableCell>
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
// SETTINGS SUBPAGES
// ============================================================================

function SettingsGeneralPage() {
  const [profile, setProfile] = useState<any>({ timezone: 'UTC', currency: 'USD', dateFormat: 'MM/DD/YYYY', companyName: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/company-profile').then(res => {
      if (res.success && res.data) {
        setProfile(prev => ({
          ...prev,
          companyName: res.data.companyName || prev.companyName,
          timezone: res.data.timezone || prev.timezone,
          currency: res.data.currency || prev.currency,
          dateFormat: res.data.dateFormat || prev.dateFormat,
        }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/api/company-profile', {
        companyName: profile.companyName,
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
        <Card>
          <CardHeader><CardTitle className="text-base">Company & Regional Settings</CardTitle><CardDescription>Company name, timezone, currency, and date format</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Company Name</Label><Input value={profile.companyName || ''} onChange={e => setProfile(p => ({ ...p, companyName: e.target.value }))} placeholder="iAssetsPro" /></div>
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
function SettingsIntegrationsPage() {
  const [configOpen, setConfigOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [configForm, setConfigForm] = useState({ url: '', apiKey: '', username: '', password: '', webhookUrl: '' });
  const [saving, setSaving] = useState(false);

  const [integrations, setIntegrations] = useState(() => {
    const defaults = [
      { id: 'erp', name: 'ERP Integration', description: 'Connect to your enterprise resource planning system for data synchronization', icon: Server, connected: false, fields: ['url', 'apiKey', 'username', 'password'] },
      { id: 'iot', name: 'IoT Platform', description: 'Stream sensor data from IoT devices and gateways into iAssetsPro', icon: Cpu, connected: false, fields: ['url', 'apiKey'] },
      { id: 'email', name: 'Email Server', description: 'Configure SMTP settings for email notifications and reports delivery', icon: Mail, connected: false, fields: ['url', 'username', 'password'] },
      { id: 'sms', name: 'SMS Gateway', description: 'Set up SMS delivery for critical alerts via your preferred gateway', icon: Smartphone, connected: false, fields: ['url', 'apiKey'] },
      { id: 'webhooks', name: 'Webhooks', description: 'Send real-time event notifications to external systems via webhooks', icon: Globe, connected: false, fields: ['webhookUrl'] },
      { id: 'ldap', name: 'LDAP / Active Directory', description: 'Sync users and authenticate via your organization\'s directory service', icon: Shield, connected: false, fields: ['url', 'username', 'password'] },
    ];
    try { const s = localStorage.getItem('iassetspro_integrations'); if (s) { const saved: Record<string, any> = JSON.parse(s); return defaults.map(i => ({ ...i, connected: saved[i.id]?.connected ?? i.connected })); } } catch { /* ignore */ }
    return defaults;
  });

  const openConfig = (integ: any) => {
    setSelected(integ);
    // Restore saved form values for this integration
    try {
      const s = localStorage.getItem('iassetspro_integrations');
      if (s) {
        const saved = JSON.parse(s);
        const stored = saved[integ.id];
        if (stored) setConfigForm({ url: stored.url || '', apiKey: stored.apiKey || '', username: stored.username || '', password: stored.password || '', webhookUrl: stored.webhookUrl || '' });
        else setConfigForm({ url: '', apiKey: '', username: '', password: '', webhookUrl: '' });
      } else { setConfigForm({ url: '', apiKey: '', username: '', password: '', webhookUrl: '' }); }
    } catch { setConfigForm({ url: '', apiKey: '', username: '', password: '', webhookUrl: '' }); }
    setConfigOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const s = localStorage.getItem('iassetspro_integrations');
      const all = s ? JSON.parse(s) : {};
      all[selected.id] = { ...configForm, connected: true };
      localStorage.setItem('iassetspro_integrations', JSON.stringify(all));
      setIntegrations(prev => prev.map(i => i.id === selected.id ? { ...i, connected: true } : i));
      toast.success(`${selected.name} configuration saved`);
    } catch {
      toast.error('Failed to save configuration');
    }
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
    try {
      const endpoints = ['/api/company-profile', '/api/assets?limit=9999', '/api/inventory?limit=9999', '/api/work-orders?limit=9999', '/api/maintenance-requests?limit=9999'];
      const keys = ['companyProfile', 'assets', 'inventory', 'workOrders', 'maintenanceRequests'];
      const results: Record<string, any> = { exportedAt: new Date().toISOString(), version: '2.0.0' };
      await Promise.all(endpoints.map(async (ep, i) => {
        const res = await api.get(ep);
        results[keys[i]] = res.data || res;
      }));
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iassetspro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup completed and downloaded successfully');
    } catch (err: any) {
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

function ChatPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [userResults, setUserResults] = useState<{ id: string; name: string; username: string }[]>([]);
  const [hasMore, setHasMore] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<ChatConversation[]>('/api/chat/conversations');
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch (err: any) {
      console.error('[Chat] Failed to load conversations:', err);
    } finally {
      setLoadingConv(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsg(true);
    try {
      const res = await api.get<{ messages: ChatMessage[]; hasMore: boolean }>(`/api/chat/conversations/${convId}/messages?limit=50`);
      if (res.success && res.data) {
        setMessages(res.data.messages || []);
        setHasMore(res.data.hasMore || false);
      }
    } catch (err: any) {
      console.error('[Chat] Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoadingMsg(false);
    }
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      const interval = setInterval(() => fetchMessages(activeConvId), 5000);
      return () => clearInterval(interval);
    }
  }, [activeConvId, fetchMessages]);

  // Mark as read
  const markAsRead = useCallback(async (convId: string) => {
    try {
      await api.post(`/api/chat/conversations/${convId}/read`);
    } catch (err: any) {
      console.error('[Chat] Failed to mark as read:', err);
    }
  }, []);

  // When selecting a conversation, mark as read
  useEffect(() => {
    if (activeConvId) {
      markAsRead(activeConvId);
      setConversations(prev => prev.map(c =>
        c.id === activeConvId ? { ...c, unreadCount: 0 } : c
      ));
    }
  }, [activeConvId, markAsRead]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvId || sending) return;
    setSending(true);
    try {
      const res = await api.post('/api/chat/conversations/' + activeConvId + '/messages', {
        content: newMessage.trim(),
        messageType: 'text',
      });
      if (res.success) {
        setNewMessage('');
        fetchMessages(activeConvId);
        fetchConversations();
      } else {
        toast.error(res.error || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('[Chat] Send error:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Create new conversation
  const createConversation = async (targetUserId: string) => {
    try {
      const res = await api.post('/api/chat/conversations', {
        participantIds: [targetUserId],
        type: 'direct',
      });
      if (res.success) {
        setShowNewConv(false);
        setSearchUsers('');
        setUserResults([]);
        fetchConversations();
        if (res.data && (res.data as any).id) {
          setActiveConvId((res.data as any).id);
        }
      } else {
        toast.error(res.error || 'Failed to create conversation');
      }
    } catch (err: any) {
      console.error('[Chat] Create conversation error:', err);
      toast.error('Failed to create conversation');
    }
  };

  // Search users
  const searchForUsers = useCallback(async (query: string) => {
    setSearchUsers(query);
    if (query.length < 2) {
      setUserResults([]);
      return;
    }
    try {
      const res = await api.get('/api/chat/users?search=' + encodeURIComponent(query));
      if (res.success && res.data) {
        setUserResults(res.data.filter((u: any) => u.id !== user?.id));
      }
    } catch (err: any) {
      console.error('[Chat] User search error:', err);
    }
  }, [user?.id]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const msgDate = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'Today';
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  function formatChatTime(d?: string) {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Conversation List */}
      <div className={`${activeConvId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-border`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Messages</h2>
            <Button size="sm" onClick={() => setShowNewConv(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new conversation</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${activeConvId === conv.id ? 'bg-muted' : ''}`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    {getInitials(conv.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{conv.name}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                      {conv.lastMessage ? formatChatTime(conv.lastMessage.createdAt) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage
                        ? (conv.lastMessage.senderId === user?.id ? 'You: ' : '') + conv.lastMessage.content
                        : 'No messages yet'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-emerald-500 text-white text-[10px] h-4 px-1.5 flex-shrink-0 ml-2">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className={`${activeConvId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {activeConvId && activeConv ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
              <button className="md:hidden p-1" onClick={() => setActiveConvId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  {getInitials(activeConv.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{activeConv.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {activeConv.participants?.filter(p => p.userId !== user?.id).map(p => p.name).join(', ') || 'Direct message'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {loadingMsg ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <Skeleton className="h-10 w-48 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">No messages</p>
                  <p className="text-xs text-muted-foreground mt-1">Send the first message</p>
                </div>
              ) : (
                groupedMessages.map((group, gi) => (
                  <div key={gi}>
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {group.date}
                      </span>
                    </div>
                    {group.messages.map(msg => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                          {!isMe && (
                            <Avatar className="h-7 w-7 mr-2 mt-1">
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px]">
                                {getInitials(msg.senderName || '')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${
                            isMe
                              ? 'bg-emerald-500 text-white rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                              {formatChatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button size="sm" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold">Select a conversation</h3>
              <p className="text-xs text-muted-foreground mt-1">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConv} onOpenChange={setShowNewConv}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>Search for a user to start a conversation</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={searchUsers}
              onChange={e => searchForUsers(e.target.value)}
              placeholder="Search by name or username..."
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto">
              {userResults.length === 0 && searchUsers.length >= 2 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
              {userResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => createConversation(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
    return null;
  }

  const renderPage = () => {
    switch (currentPage) {
      // Core
      case 'dashboard': return <DashboardPage />;
      case 'chat': return <ChatPage />;
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
    'chat': 'Chat',
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

export default function EAMApp() {
  return <AppShell />;
}
