'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import PlantSelector from '@/components/PlantSelector';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUIStore } from '@/stores/uiStore';
import { setCurrencySymbol } from '@/lib/currency';
import { checkAuth, logout } from '@/middleware/auth';
import { moduleService } from '@/lib/moduleService';

interface DashboardLayoutProps {
  children: ReactNode;
  role: string;
}

interface MenuItem {
  icon: string;
  label: string;
  href?: string;
  roles: string[];
  module?: string;
  submenu?: MenuItem[];
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [systemName, setSystemName] = useState<string>('iFactory EAM System');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [isVendorAdmin, setIsVendorAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { setCommandPaletteOpen } = useUIStore();

  useKeyboardShortcuts([
    { key: 'k', ctrl: true, callback: () => setCommandPaletteOpen(true) },
    { key: 'b', ctrl: true, callback: () => setSidebarOpen(!sidebarOpen) },
  ]);

  useEffect(() => {
    const auth = checkAuth();
    if (!auth) {
      router.push('/login');
      return;
    }
    setCurrentUser(auth.user);
    setIsVendorAdmin(auth.user.is_vendor_admin === 1 || auth.user.is_vendor_admin === true);
    fetchSettings();
    loadActiveModules();
  }, [router]);

  const loadActiveModules = async () => {
    try {
      const modules = await moduleService.getActiveModules();
      setActiveModules(modules.map(m => m.code));
    } catch (error) {
      console.error('Failed to load active modules:', error);
    }
  };

  useEffect(() => {
    if (pathname?.includes('/assignPmTasksToPart/') || pathname?.includes('/parts/')) {
      setOpenMenus([]);
      return;
    }
    const activeParent = menuItems.find(item => 
      item.submenu?.some(sub => pathname === sub.href || (sub.href && pathname?.startsWith(sub.href)))
    );
    if (activeParent && !openMenus.includes(activeParent.label)) {
      setOpenMenus(prev => [...prev, activeParent.label]);
    }
  }, [pathname]);

  const fetchSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        console.warn('API URL not configured');
        return;
      }
      
      const token = localStorage.getItem('access_token');
      if (!token) return; // Skip if not authenticated
      
      const companyRes = await fetch(`${apiUrl}/settings/company`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!companyRes.ok) return;
      const companyData = await companyRes.json();
      if (companyData.status === 'success' && companyData.data?.logo) {
        setCompanyLogo(companyData.data.logo);
      }
    } catch (error) {
      // Silently fail - settings are optional
    }
  };

  const toggleSubmenu = (label: string) => {
    setOpenMenus(prev => 
      prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label]
    );
  };

  const getMenuItems = (): MenuItem[] => {
    // Technician-specific menu
    if (role === 'technician') {
      return [
        { icon: '📊', label: 'Dashboard', href: '/dashboard', roles: ['technician'] },
        { icon: '📋', label: 'My Work Orders', href: '/technician/my-work-orders', roles: ['technician'] },
        { icon: '📱', label: 'Mobile Work Orders', href: '/technician/mobile-wo', roles: ['technician'] },
        { icon: '🛠️', label: 'Tool Requests', href: '/technician/tool-requests', roles: ['technician'] },
        { icon: '📱', label: 'QR Scanner', href: '/mobile/qr-scanner', roles: ['technician'] },
        { icon: '🔄', label: 'Tool Transfers', href: '/technician/tool-transfers', roles: ['technician'] },
        { icon: '📦', label: 'Request Parts', href: '/technician/parts-request', roles: ['technician'] },
        { icon: '⏱️', label: 'Time Logs', href: '/technician/time-logs', roles: ['technician'] },
        { icon: '📅', label: 'PM Schedule', href: '/technician/pm-schedule', roles: ['technician'] },
        { icon: '🔔', label: 'Notifications', href: '/admin/notifications', roles: ['technician'] },
      ];
    }

    // Operator-specific menu
    if (role === 'operator') {
      return [
        { icon: '📊', label: 'Dashboard', href: '/dashboard', roles: ['operator'] },
        { icon: '📝', label: 'Maintenance Requests', href: '/operator/maintenance-requests', roles: ['operator'] },
        { icon: '📊', label: 'Production Data', href: '/operator/production-data', roles: ['operator'] },
        { icon: '📋', label: 'Production Survey', href: '/operator/production-survey', roles: ['operator'] },
        { icon: '⏱️', label: 'Downtime', href: '/admin/downtime', roles: ['operator'] },
        { icon: '📏', label: 'Meter Readings', href: '/admin/meter-readings', roles: ['operator'] },
        { icon: '📋', label: 'Shift Handover', href: '/admin/shift-handover', roles: ['operator'] },
        { icon: '🔔', label: 'Notifications', href: '/admin/notifications', roles: ['operator'] },
      ];
    }

    // Shop Attendant-specific menu
    if (role === 'shop_attendant') {
      return [
        { icon: '📊', label: 'Dashboard', href: '/dashboard', roles: ['shop_attendant'] },
        { 
          icon: '🛠️', 
          label: 'Tool Requests',
          roles: ['shop_attendant'],
          submenu: [
            { icon: '🛠️', label: 'Tool Issuance', href: '/shop-attendant/tool-issuance', roles: ['shop_attendant'] },
            { icon: '📋', label: 'Tool History', href: '/shop-attendant/tool-history', roles: ['shop_attendant'] },
            { icon: '🔄', label: 'Tool Transfers', href: '/shop-attendant/tool-transfers', roles: ['shop_attendant'] },
          ]
        },
        { icon: '🔧', label: 'Tools', href: '/shop-attendant/tools', roles: ['shop_attendant'] },
        { icon: '📦', label: 'Inventory', href: '/shop-attendant/inventory', roles: ['shop_attendant'] },
        { 
          icon: '📋', 
          label: 'Manage Material',
          roles: ['shop_attendant'],
          submenu: [
            { icon: '📤', label: 'Issue Materials', href: '/shop-attendant/issue-materials', roles: ['shop_attendant'] },
            { icon: '📥', label: 'Return Materials', href: '/shop-attendant/return-materials', roles: ['shop_attendant'] },
            { icon: '✅', label: 'Material Approvals', href: '/shop-attendant/material-approvals', roles: ['shop_attendant'] },
          ]
        },
        { icon: '📊', label: 'Stock Adjustments', href: '/shop-attendant/stock-adjustments', roles: ['shop_attendant'] },
        { icon: '🔔', label: 'Notifications', href: '/admin/notifications', roles: ['shop_attendant'] },
      ];
    }

    const baseItems: MenuItem[] = [
      { icon: '📊', label: 'Dashboard', href: '/dashboard', roles: ['admin', 'manager', 'supervisor', 'planner'] },
      { 
        icon: '🏭', 
        label: 'Assets',
        module: 'ASSET',
        roles: ['admin', 'supervisor', 'technician', 'operator'],
        submenu: [
          { icon: '🏭', label: 'Assets', href: '/assets', roles: ['admin', 'supervisor', 'technician'] },
          { icon: '🌳', label: 'Hierarchy', href: '/admin/hierarchy', roles: ['admin', 'supervisor', 'technician'] },
          { icon: '📋', label: 'Bill of Materials', href: '/admin/bom', roles: ['admin', 'supervisor'] },
          { icon: '🎮', label: '3D Viewer', href: '/admin/3d-viewer', roles: ['admin', 'supervisor', 'technician'] },
          { icon: '📐', label: 'Model Viewer', href: '/admin/model-viewer', roles: ['admin', 'supervisor'] },
          { icon: '🏢', label: 'Facilities', href: '/admin/facilities', roles: ['admin', 'supervisor'] },
          { icon: '🏛️', label: 'Departments', href: '/departments', roles: ['admin', 'supervisor'] },
        ]
      },
      { 
        icon: '🔧', 
        label: 'Maintenance',
        module: 'RWOP',
        roles: ['admin', 'supervisor', 'technician', 'planner', 'manager', 'operator'],
        submenu: [
          { icon: '📊', label: 'Maintenance Dashboard', href: '/admin/maintenance-dashboard', roles: ['admin', 'manager', 'supervisor'] },
          { icon: '📝', label: 'Maintenance Requests', href: '/maintenance/requests', roles: ['operator', 'admin', 'supervisor', 'technician', 'planner'] },
          { icon: '📋', label: 'Work Orders', href: '/maintenance/work-orders', roles: ['admin', 'supervisor', 'planner', 'technician'] },
          { icon: '👨🔧', label: 'My Work Orders', href: '/technician/dashboard', roles: ['technician'] },
          { icon: '📱', label: 'Mobile Work Orders', href: '/technician/mobile-wo', roles: ['technician'] },
          { icon: '📊', label: 'Backlog Management', href: '/admin/backlog', roles: ['admin', 'manager', 'supervisor', 'planner'] },
          { icon: '📊', label: 'Maintenance Analytics', href: '/admin/maintenance-analytics', roles: ['admin', 'manager'] },
          { icon: '🔧', label: 'Maintenance Orders', href: '/admin/maintenance-orders', roles: ['admin', 'supervisor', 'technician', 'planner', 'manager'] },
          { icon: '📊', label: 'MO Reports', href: '/admin/maintenance-orders/reports', roles: ['admin', 'manager'] },
          { icon: '🤝', label: 'External Services', href: '/admin/maintenance-orders/external-services', roles: ['admin', 'supervisor'] },
          { icon: '🚦', label: 'PM Monitoring', href: '/admin/pm-monitoring', roles: ['admin', 'manager', 'planner'] },
          { icon: '📅', label: 'PM Schedules', href: '/pm-schedules', roles: ['admin', 'supervisor', 'planner', 'manager'] },
          { icon: '📋', label: 'PM Work Orders', href: '/admin/pm-work-orders', roles: ['admin', 'manager', 'technician'] },
          { icon: '🎯', label: 'Calibration', href: '/admin/calibration', roles: ['admin', 'supervisor', 'planner'] },
          { icon: '⚠️', label: 'Risk Assessment', href: '/admin/risk-assessment', roles: ['admin', 'supervisor'] },
          { icon: '🛡️', label: 'RCM', href: '/admin/rcm', roles: ['admin', 'manager', 'planner'] },
          { icon: '📄', label: 'Documents', href: '/admin/documents', roles: ['admin', 'supervisor', 'technician'] },
        ]
      },
      { 
        icon: '🛠️', 
        label: 'Tool Requests',
        module: 'RWOP',
        roles: ['admin', 'manager', 'supervisor', 'planner'],
        submenu: [
          { icon: '🛠️', label: 'Tool Requests', href: '/planner/tool-requests', roles: ['planner'] },
          { icon: '🛠️', label: 'Tool Requests', href: '/supervisor/tool-requests', roles: ['supervisor'] },
          { icon: '🛠️', label: 'Tool Requests', href: '/manager/tool-requests', roles: ['manager'] },
          { icon: '🛠️', label: 'Tool Requests', href: '/admin/tool-requests', roles: ['admin'] },
          { icon: '📋', label: 'Tool History', href: '/admin/tool-history', roles: ['admin', 'manager', 'supervisor', 'planner'] },
          { icon: '📊', label: 'Tool Statistics', href: '/admin/tool-statistics', roles: ['admin', 'manager'] },
          { icon: '📈', label: 'Tool Performance', href: '/admin/tool-performance', roles: ['admin', 'manager'] },
          { icon: '🔧', label: 'Tool Maintenance', href: '/admin/tool-maintenance', roles: ['admin', 'supervisor'] },
          { icon: '📅', label: 'Tool Calendar', href: '/admin/tool-calendar', roles: ['admin', 'supervisor'] },
          { icon: '📍', label: 'Tool Locations', href: '/admin/tool-location', roles: ['admin', 'supervisor'] },
          { icon: '📋', label: 'Tool Audit', href: '/admin/tool-audit', roles: ['admin', 'supervisor'] },
        ]
      },
      { 
        icon: '🏭', 
        label: 'Production',
        module: 'MPMP',
        roles: ['operator', 'supervisor', 'admin', 'planner', 'manager'],
        submenu: [
          { icon: '📊', label: 'Planner Dashboard', href: '/admin/production-planner', roles: ['admin', 'manager', 'planner'] },
          { icon: '🎯', label: 'Set Targets', href: '/admin/production-targets/enhanced', roles: ['admin', 'manager', 'planner'] },
          { icon: '📋', label: 'Production Records', href: '/production', roles: ['admin', 'manager', 'operator', 'supervisor', 'planner'] },
          { icon: '📄', label: 'Production Reports', href: '/admin/production-reports', roles: ['admin', 'manager', 'planner'] },
          { icon: '🏢', label: 'Work Centers', href: '/admin/work-centers', roles: ['admin', 'manager'] },
          { icon: '👥', label: 'Resource Planning', href: '/admin/resource-planning', roles: ['admin', 'manager', 'planner'] },
          { icon: '📅', label: 'Scheduler', href: '/admin/scheduler', roles: ['admin', 'supervisor', 'planner'] },
          { icon: '👔', label: 'Shifts', href: '/admin/shifts', roles: ['admin', 'manager'] },
          { icon: '📅', label: 'Roster', href: '/admin/roster', roles: ['admin', 'manager', 'supervisor'] },
          { icon: '🔧', label: 'Assignments', href: '/admin/assignments', roles: ['admin', 'manager', 'supervisor'] },
          { icon: '📋', label: 'Shift Handover', href: '/admin/shift-handover', roles: ['operator', 'supervisor', 'admin'] },
          { icon: '✅', label: 'Quality', href: '/admin/quality', roles: ['admin', 'supervisor'] },
        ]
      },
      { 
        icon: '📈', 
        label: 'Analytics',
        module: 'REPORTS',
        roles: ['admin', 'supervisor', 'manager'],
        submenu: [
          { icon: '💚', label: 'Asset Health', href: '/admin/asset-health', roles: ['admin', 'supervisor', 'manager'] },
          { icon: '📊', label: 'KPI Dashboard', href: '/admin/kpi-dashboard', roles: ['admin', 'manager', 'supervisor', 'planner'] },
          { icon: '📊', label: 'OEE Dashboard', href: '/admin/oee-dashboard', roles: ['admin', 'supervisor', 'manager'] },
          { icon: '⏱️', label: 'Downtime Tracker', href: '/admin/downtime', roles: ['admin', 'supervisor', 'manager'] },
          { icon: '📏', label: 'Meter Readings', href: '/admin/meter-readings', roles: ['admin', 'supervisor', 'manager', 'operator'] },
          { icon: '📡', label: 'Condition Monitoring', href: '/admin/condition-monitoring', roles: ['admin', 'manager', 'supervisor', 'technician', 'planner'] },
          { icon: '📊', label: 'PM Analytics', href: '/admin/pm-analytics', roles: ['admin', 'manager'] },
          { icon: '🤖', label: 'Predictive AI', href: '/admin/predictive', roles: ['admin', 'supervisor'] },
          { icon: '🔮', label: 'Digital Twin', href: '/admin/digital-twin', roles: ['admin', 'supervisor'] },
          { icon: '⚡', label: 'Energy', href: '/admin/energy', roles: ['admin', 'supervisor'] },
          { icon: '📊', label: 'Reports Hub', href: '/admin/reports', roles: ['admin', 'supervisor'] },
          { icon: '🎯', label: 'Executive', href: '/admin/executive', roles: ['admin'] },
        ]
      },
      { 
        icon: '📋', 
        label: 'Operations',
        module: 'HRMS',
        roles: ['admin', 'supervisor', 'technician', 'operator', 'manager', 'planner'],
        submenu: [
          { icon: '🎓', label: 'Training Records', href: '/admin/training', roles: ['admin', 'supervisor'] },
          { icon: '🎯', label: 'Skills', href: '/supervisor/skills', roles: ['supervisor', 'manager', 'planner'] },
          { icon: '📂', label: 'Skill Categories', href: '/supervisor/skill-categories', roles: ['supervisor'] },
          { icon: '📂', label: 'Skill Categories', href: '/manager/skill-categories', roles: ['manager'] },
          { icon: '📂', label: 'Skill Categories', href: '/planner/skill-categories', roles: ['planner'] },
        ]
      },
      { 
        icon: '📦', 
        label: 'Inventory',
        module: 'IMS',
        roles: ['admin', 'supervisor', 'shop_attendant', 'manager', 'planner'],
        submenu: [
          { icon: '📦', label: 'Inventory', href: '/inventory', roles: ['admin', 'supervisor', 'shop_attendant', 'manager', 'planner'] },
          { icon: '📈', label: 'Forecast', href: '/admin/inventory-forecast', roles: ['admin', 'supervisor'] },
          { icon: '📊', label: 'Parts Optimization', href: '/admin/parts-optimization', roles: ['admin', 'manager', 'planner', 'shop_attendant'] },
        ]
      },
      { 
        icon: '📋', 
        label: 'Manage Material',
        module: 'IMS',
        roles: ['admin', 'manager', 'supervisor', 'planner'],
        submenu: [
          { icon: '📤', label: 'Issue Materials', href: '/admin/issue-materials', roles: ['admin', 'manager', 'supervisor', 'planner'] },
          { icon: '📥', label: 'Return Materials', href: '/admin/return-materials', roles: ['admin', 'manager', 'supervisor', 'planner'] },
          { icon: '✅', label: 'Material Approvals', href: '/admin/material-approvals', roles: ['admin', 'manager', 'supervisor', 'planner'] },
        ]
      },
      { icon: '🤝', label: 'Vendors', href: '/admin/vendors', module: 'IMS', roles: ['admin', 'supervisor'] },
      { 
        icon: '⚠️', 
        label: 'Failure Analysis',
        module: 'TRAC',
        roles: ['admin', 'manager', 'supervisor', 'technician', 'planner'],
        submenu: [
          { icon: '🔬', label: 'RCA Tools', href: '/admin/failure-analysis/rca-tools', roles: ['admin', 'manager', 'supervisor', 'technician', 'planner'] },
          { icon: '📊', label: 'Statistics', href: '/admin/failure-analysis/statistics', roles: ['admin', 'manager', 'supervisor', 'technician', 'planner'] },
          { icon: '⚠️', label: 'Failure Modes', href: '/admin/failure-analysis/failure-modes', roles: ['admin', 'manager', 'supervisor', 'technician', 'planner'] },
        ]
      },
      { icon: '🔔', label: 'Notifications', href: '/admin/notifications', roles: ['admin', 'manager', 'supervisor', 'technician', 'operator', 'planner', 'shop_attendant'] },
      { 
        icon: '🌐', 
        label: 'IoT & Integration',
        module: 'IOT',
        roles: ['admin'],
        submenu: [
          { icon: '📡', label: 'IoT Devices', href: '/admin/iot-devices', roles: ['admin'] },
          { icon: '📊', label: 'IoT Monitoring', href: '/admin/iot-monitoring', roles: ['admin'] },
          { icon: '⚙️', label: 'IoT Rules', href: '/admin/iot-rules', roles: ['admin'] },
          { icon: '🔗', label: 'ERP Integration', href: '/admin/erp-integration', roles: ['admin'] },
          { icon: '🗺️', label: 'ERP Mapping', href: '/admin/erp-mapping', roles: ['admin'] },
        ]
      },
      { 
        icon: '⚙️', 
        label: 'Settings', 
        roles: ['admin'],
        submenu: [
          { icon: '👥', label: 'Users', href: '/users', roles: ['admin'] },
          { icon: '🛡️', label: 'Roles & Permissions', href: '/admin/rbac', roles: ['admin'] },
          { icon: '🎯', label: 'Skills', href: '/admin/skills', roles: ['admin'] },
          { icon: '📂', label: 'Skill Categories', href: '/admin/skill-categories', roles: ['admin'] },
          { icon: '🏢', label: 'Company', href: '/admin/settings/company', roles: ['admin'] },
          { icon: '⚙️', label: 'System', href: '/admin/settings/system', roles: ['admin'] },
          ...(isVendorAdmin ? [
            { icon: '🛡️', label: 'System Modules', href: '/admin/system/modules', roles: ['admin'] },
          ] : []),
          { icon: '🏢', label: 'Company Modules', href: '/admin/company/modules', roles: ['admin'] },
          { icon: '💚', label: 'System Health', href: '/admin/system-health', roles: ['admin'] },
          { icon: '📋', label: 'Audit Logs', href: '/admin/audit-logs', roles: ['admin'] },
        ]
      },
    ];
    return baseItems.filter(item => {
      if (!item.roles.includes(role)) return false;
      if (item.module && !activeModules.includes(item.module)) return false;
      return true;
    });
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <nav className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg fixed w-full z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-700 rounded">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {companyLogo && (
              <div className="h-10 w-10 rounded-full border-2 border-white overflow-hidden flex items-center justify-center bg-white">
                <img src={companyLogo} alt="Company Logo" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
            )}
            <h1 className="font-semibold" style={{ fontSize: '1.125rem' }}>{systemName}</h1>
          </div>
          <div className="flex items-center space-x-6">
            <PlantSelector />
            <span className="bg-slate-700 px-3 py-1 rounded-full capitalize" style={{ fontSize: '0.8125rem' }}>{role}</span>
            <NotificationCenter />
            <DarkModeToggle />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold">
                {currentUser?.name?.[0]?.toUpperCase() || role?.[0]?.toUpperCase() || 'U'}
              </div>
              <button onClick={logout} className="hover:bg-slate-700 px-3 py-1 rounded" style={{ fontSize: '0.8125rem' }} title="Logout">
                🚪
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 z-40 fixed h-full p-2`}>
          <div className="bg-white shadow-2xl rounded-2xl h-[calc(100vh-5rem)] overflow-y-auto">
          <nav className="mt-4 pb-20">
            {menuItems.map((item) => (
              <div key={item.label}>
                {item.submenu ? (
                  <>
                    <button
                      onClick={() => {
                        try {
                          toggleSubmenu(item.label);
                        } catch (error) {
                          console.error('Error toggling submenu:', error);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-blue-50 transition-colors ${
                        item.submenu?.some(sub => pathname === sub.href || (sub.href && pathname?.startsWith(sub.href))) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <span style={{ fontSize: '1.375rem' }}>{item.icon}</span>
                        {sidebarOpen && <span className="ml-3 text-gray-700 font-medium" style={{ fontSize: '1rem' }}>{item.label}</span>}
                      </div>
                      {sidebarOpen && (
                        <svg className={`w-5 h-5 transition-transform ${openMenus.includes(item.label) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                    {openMenus.includes(item.label) && sidebarOpen && item.submenu && (
                      <div className="bg-gray-50">
                        {item.submenu
                          .filter(sub => {
                            if (!sub.roles || !sub.roles.includes(role)) return false;
                            if (sub.module && !activeModules.includes(sub.module)) return false;
                            return true;
                          })
                          .map((subItem) => (
                            <Link
                              key={subItem.href || subItem.label}
                              href={subItem.href || '#'}
                              className={`flex items-center px-4 py-3 pl-12 hover:bg-blue-50 transition-colors ${
                                pathname === subItem.href || (subItem.href && pathname?.startsWith(subItem.href)) ? 'bg-blue-100 border-r-4 border-blue-600 text-blue-700 font-medium' : 'text-gray-600'
                              }`}
                              style={{ fontSize: '0.9375rem' }}
                            >
                              <span className="mr-2" style={{ fontSize: '1.125rem' }}>{subItem.icon}</span>
                              {subItem.label}
                            </Link>
                          ))}
                      </div>
                    )}
                  </>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3.5 hover:bg-blue-50 transition-colors ${
                      pathname === item.href ? 'bg-blue-100 border-r-4 border-blue-600 text-blue-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <span style={{ fontSize: '1.375rem' }}>{item.icon}</span>
                    {sidebarOpen && <span className="ml-3 font-medium" style={{ fontSize: '1rem' }}>{item.label}</span>}
                  </Link>
                ) : (
                  <div className="flex items-center px-4 py-3.5 text-gray-400">
                    <span style={{ fontSize: '1.375rem' }}>{item.icon}</span>
                    {sidebarOpen && <span className="ml-3 font-medium" style={{ fontSize: '1rem' }}>{item.label}</span>}
                  </div>
                )}
              </div>
            ))}
          </nav>
          </div>
        </aside>

        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} p-6 pb-28 transition-all duration-300 overflow-y-auto overflow-x-hidden h-screen`}>
          <div className="max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-white py-3 px-6 text-right z-30">
        <div className="text-gray-500" style={{ fontSize: '0.6875rem' }}>
          <span>© 2024 Lightworld Technologies Limited • iFactory EAM System v0.1.0</span>
        </div>
      </footer>
      </div>
    </div>
  );
}
