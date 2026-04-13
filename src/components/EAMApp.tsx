'use client';

import React, { Suspense, lazy } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { getInitials } from '@/components/shared/helpers';
import { LoadingScreen, LoadingSkeleton } from '@/components/shared/helpers';
import Sidebar from '@/components/shared/Sidebar';
import NotificationPopover from '@/components/shared/NotificationPopover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Menu, ChevronLeft, ChevronRight, ChevronDown, Sun, Moon, Bell, LogOut,
  LayoutDashboard, Building2, History,
} from 'lucide-react';

// Lazy-loaded module pages
const DashboardPage = lazy(() => import('./modules/DashboardPages').then(m => ({ default: m.DashboardPage })));
const ChatPage = lazy(() => import('./modules/ChatPage').then(m => ({ default: m.ChatPage })));
const NotificationsPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.NotificationsPage })));

// Assets
const AssetsPage = lazy(() => import('./modules/AssetPages').then(m => ({ default: m.AssetsPage })));
const AssetsMachinesPage = lazy(() => import('./modules/AssetPages').then(m => ({ default: m.AssetsMachinesPage })));
const AssetsHierarchyPage = lazy(() => import('./modules/AssetPages').then(m => ({ default: m.AssetsHierarchyPage })));
const AssetsBomPage = lazy(() => import('./modules/AssetPages').then(m => ({ default: m.AssetsBomPage })));
const AssetsConditionMonitoringPage = lazy(() => import('./modules/AssetPages').then(m => ({ default: m.AssetsConditionMonitoringPage })));
const AssetsDigitalTwinPage = lazy(() => import('./modules/AssetPages').then(m => ({ default: m.AssetsDigitalTwinPage })));
const AssetHealthPage = lazy(() => import('./modules/AssetPages').then(m => ({ default: m.AssetHealthPage })));

// Maintenance
const MaintenanceRequestsPage = lazy(() => import('./modules/MaintenancePages').then(m => ({ default: m.MaintenanceRequestsPage })));
const MaintenanceWorkOrdersPage = lazy(() => import('./modules/MaintenancePages').then(m => ({ default: m.MaintenanceWorkOrdersPage })));
const PmSchedulesPage = lazy(() => import('./modules/MaintenancePages').then(m => ({ default: m.PmSchedulesPage })));
const MaintenanceDashboardPage = lazy(() => import('./modules/MaintenancePages').then(m => ({ default: m.MaintenanceDashboardPage })));
const MaintenanceAnalyticsPage = lazy(() => import('./modules/MaintenancePages').then(m => ({ default: m.MaintenanceAnalyticsPage })));
const MaintenanceCalibrationPage = lazy(() => import('./modules/MaintenancePages').then(m => ({ default: m.MaintenanceCalibrationPage })));
const MaintenanceRiskAssessmentPage = lazy(() => import('./modules/MaintenancePages').then(m => ({ default: m.MaintenanceRiskAssessmentPage })));
const MaintenanceToolsPage = lazy(() => import('./modules/MaintenancePages').then(m => ({ default: m.MaintenanceToolsPage })));

// Repairs Module
const RepairMaterialRequestsPage = lazy(() => import('./modules/RepairsPages').then(m => ({ default: m.RepairMaterialRequestsPage })));
const RepairToolRequestsPage = lazy(() => import('./modules/RepairsPages').then(m => ({ default: m.RepairToolRequestsPage })));
const RepairToolTransfersPage = lazy(() => import('./modules/RepairsPages').then(m => ({ default: m.RepairToolTransfersPage })));
const RepairDowntimePage = lazy(() => import('./modules/RepairsPages').then(m => ({ default: m.RepairDowntimePage })));
const RepairCompletionPage = lazy(() => import('./modules/RepairsPages').then(m => ({ default: m.RepairCompletionPage })));
const RepairAnalyticsPage = lazy(() => import('./modules/RepairsPages').then(m => ({ default: m.RepairAnalyticsPage })));

// Inventory
const InventoryPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryPage })));
const InventoryItemsPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryItemsPage })));
const InventoryCategoriesPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryCategoriesPage })));
const InventoryLocationsPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryLocationsPage })));
const InventoryTransactionsPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryTransactionsPage })));
const InventoryAdjustmentsPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryAdjustmentsPage })));
const InventoryRequestsPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryRequestsPage })));
const InventoryTransfersPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryTransfersPage })));
const InventorySuppliersPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventorySuppliersPage })));
const InventoryPurchaseOrdersPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryPurchaseOrdersPage })));
const InventoryReceivingPage = lazy(() => import('./modules/InventoryPages').then(m => ({ default: m.InventoryReceivingPage })));

// IoT
const IotDevicesPage = lazy(() => import('./modules/IoTPages').then(m => ({ default: m.IotDevicesPage })));
const IotMonitoringPage = lazy(() => import('./modules/IoTPages').then(m => ({ default: m.IotMonitoringPage })));
const IotRulesPage = lazy(() => import('./modules/IoTPages').then(m => ({ default: m.IotRulesPage })));

// Analytics
const AnalyticsPage = lazy(() => import('./modules/AnalyticsPages').then(m => ({ default: m.AnalyticsPage })));
const AnalyticsKpiPage = lazy(() => import('./modules/AnalyticsPages').then(m => ({ default: m.AnalyticsKpiPage })));
const AnalyticsOeePage = lazy(() => import('./modules/AnalyticsPages').then(m => ({ default: m.AnalyticsOeePage })));
const AnalyticsDowntimePage = lazy(() => import('./modules/AnalyticsPages').then(m => ({ default: m.AnalyticsDowntimePage })));
const AnalyticsEnergyPage = lazy(() => import('./modules/AnalyticsPages').then(m => ({ default: m.AnalyticsEnergyPage })));

// Operations
const OperationsMeterReadingsPage = lazy(() => import('./modules/OperationsPages').then(m => ({ default: m.OperationsMeterReadingsPage })));
const OperationsTrainingPage = lazy(() => import('./modules/OperationsPages').then(m => ({ default: m.OperationsTrainingPage })));
const OperationsSurveysPage = lazy(() => import('./modules/OperationsPages').then(m => ({ default: m.OperationsSurveysPage })));
const OperationsTimeLogsPage = lazy(() => import('./modules/OperationsPages').then(m => ({ default: m.OperationsTimeLogsPage })));
const OperationsShiftHandoverPage = lazy(() => import('./modules/OperationsPages').then(m => ({ default: m.OperationsShiftHandoverPage })));
const OperationsChecklistsPage = lazy(() => import('./modules/OperationsPages').then(m => ({ default: m.OperationsChecklistsPage })));

// Production
const ProductionWorkCentersPage = lazy(() => import('./modules/ProductionPages').then(m => ({ default: m.ProductionWorkCentersPage })));
const ProductionResourcePlanningPage = lazy(() => import('./modules/ProductionPages').then(m => ({ default: m.ProductionResourcePlanningPage })));
const ProductionSchedulingPage = lazy(() => import('./modules/ProductionPages').then(m => ({ default: m.ProductionSchedulingPage })));
const ProductionCapacityPage = lazy(() => import('./modules/ProductionPages').then(m => ({ default: m.ProductionCapacityPage })));
const ProductionEfficiencyPage = lazy(() => import('./modules/ProductionPages').then(m => ({ default: m.ProductionEfficiencyPage })));
const ProductionBottlenecksPage = lazy(() => import('./modules/ProductionPages').then(m => ({ default: m.ProductionBottlenecksPage })));
const ProductionOrdersPage = lazy(() => import('./modules/ProductionPages').then(m => ({ default: m.ProductionOrdersPage })));
const ProductionBatchesPage = lazy(() => import('./modules/ProductionPages').then(m => ({ default: m.ProductionBatchesPage })));

// Quality
const QualityInspectionsPage = lazy(() => import('./modules/QualityPages').then(m => ({ default: m.QualityInspectionsPage })));
const QualityNcrPage = lazy(() => import('./modules/QualityPages').then(m => ({ default: m.QualityNcrPage })));
const QualityAuditsPage = lazy(() => import('./modules/QualityPages').then(m => ({ default: m.QualityAuditsPage })));
const QualityControlPlansPage = lazy(() => import('./modules/QualityPages').then(m => ({ default: m.QualityControlPlansPage })));
const QualitySpcPage = lazy(() => import('./modules/QualityPages').then(m => ({ default: m.QualitySpcPage })));
const QualityCapaPage = lazy(() => import('./modules/QualityPages').then(m => ({ default: m.QualityCapaPage })));

// Safety
const SafetyIncidentsPage = lazy(() => import('./modules/SafetyPages').then(m => ({ default: m.SafetyIncidentsPage })));
const SafetyInspectionsPage = lazy(() => import('./modules/SafetyPages').then(m => ({ default: m.SafetyInspectionsPage })));
const SafetyTrainingPage = lazy(() => import('./modules/SafetyPages').then(m => ({ default: m.SafetyTrainingPage })));
const SafetyEquipmentPage = lazy(() => import('./modules/SafetyPages').then(m => ({ default: m.SafetyEquipmentPage })));
const SafetyPermitsPage = lazy(() => import('./modules/SafetyPages').then(m => ({ default: m.SafetyPermitsPage })));

// Reports
const ReportsAssetPage = lazy(() => import('./modules/ReportPages').then(m => ({ default: m.ReportsAssetPage })));
const ReportsMaintenancePage = lazy(() => import('./modules/ReportPages').then(m => ({ default: m.ReportsMaintenancePage })));
const ReportsInventoryPage = lazy(() => import('./modules/ReportPages').then(m => ({ default: m.ReportsInventoryPage })));
const ReportsProductionPage = lazy(() => import('./modules/ReportPages').then(m => ({ default: m.ReportsProductionPage })));
const ReportsQualityPage = lazy(() => import('./modules/ReportPages').then(m => ({ default: m.ReportsQualityPage })));
const ReportsSafetyPage = lazy(() => import('./modules/ReportPages').then(m => ({ default: m.ReportsSafetyPage })));
const ReportsFinancialPage = lazy(() => import('./modules/ReportPages').then(m => ({ default: m.ReportsFinancialPage })));
const ReportsCustomPage = lazy(() => import('./modules/ReportPages').then(m => ({ default: m.ReportsCustomPage })));

// Settings
const SettingsGeneralPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsGeneralPage })));
const SettingsUsersPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsUsersPage })));
const SettingsRolesPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsRolesPage })));
const SettingsModulesPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsModulesPage })));
const CompanyProfilePage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.CompanyProfilePage })));
const SettingsPlantsPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsPlantsPage })));
const SettingsDepartmentsPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsDepartmentsPage })));
const SettingsNotificationsPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsNotificationsPage })));
const SettingsIntegrationsPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsIntegrationsPage })));
const SettingsBackupPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.SettingsBackupPage })));
const AuditLogsPage = lazy(() => import('./modules/SettingsPages').then(m => ({ default: m.AuditLogsPage })));

// ============================================================================
// MAIN APP SHELL
// ============================================================================

function AppShell() {
  const { currentPage, navigate, toggleSidebar, setMobileSidebarOpen, fetchModules } = useNavigationStore();
  const { user, isAuthenticated, isLoading, fetchMe, logout } = useAuthStore();

  React.useEffect(() => {
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
      // Repairs
      case 'repairs-material-requests': return <RepairMaterialRequestsPage />;
      case 'repairs-tool-requests': return <RepairToolRequestsPage />;
      case 'repairs-tool-transfers': return <RepairToolTransfersPage />;
      case 'repairs-downtime': return <RepairDowntimePage />;
      case 'repairs-completion': return <RepairCompletionPage />;
      case 'repairs-analytics': return <RepairAnalyticsPage />;
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
    // Repairs Module
    'repairs-material-requests': 'Material Requests',
    'repairs-tool-requests': 'Tool Requests',
    'repairs-tool-transfers': 'Tool Transfers',
    'repairs-downtime': 'Downtime Tracking',
    'repairs-completion': 'Completion & Closure',
    'repairs-analytics': 'Repairs Analytics',
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
                  <ChevronDown className="h-3.5 w-3 text-muted-foreground hidden md:block" />
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

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-in fade-in-0 duration-300">
            <Suspense fallback={<LoadingSkeleton />}>
              {renderPage()}
            </Suspense>
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
