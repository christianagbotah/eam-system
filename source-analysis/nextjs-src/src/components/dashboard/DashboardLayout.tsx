'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import PlantSelector from '@/components/PlantSelector';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUIStore } from '@/stores/uiStore';
import { checkAuth, logout } from '@/middleware/auth';
import { usePermissions } from '@/hooks/usePermissions';

interface DashboardLayoutProps {
  children: ReactNode;
  role: string;
}

interface MenuItem {
  icon: string;
  label: string;
  href?: string;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  submenu?: MenuItem[];
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [systemName, setSystemName] = useState<string>('iFactory EAM System');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { setCommandPaletteOpen } = useUIStore();
  const { hasPermission, hasAnyPermission, userRole } = usePermissions();

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
    fetchSettings();
  }, [router]);

  useEffect(() => {
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
      if (!apiUrl) return;
      
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
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
      // Silently fail
    }
  };

  const toggleSubmenu = (label: string) => {
    setOpenMenus(prev => 
      prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label]
    );
  };

  // Permission-based menu structure
  const menuItems: MenuItem[] = [
    { 
      icon: '📊', 
      label: 'Dashboard', 
      href: '/dashboard', 
      permission: 'dashboard.view' 
    },
    { 
      icon: '🏭', 
      label: 'Assets',
      permission: 'assets.view',
      submenu: [
        { icon: '🏭', label: 'Machines', href: '/assets/machines', permission: 'assets.view' },
        { icon: '🌳', label: 'Hierarchy', href: '/assets/hierarchy', permission: 'assets.view' },
        { icon: '📋', label: 'Bill of Materials', href: '/assets/bom', permission: 'assets.view' },
        { icon: '📡', label: 'Condition Monitoring', href: '/assets/condition-monitoring', permission: 'assets.view' },
        { icon: '🔮', label: 'Digital Twin', href: '/assets/digital-twin', permission: 'assets.view' },
        { icon: '💚', label: 'Asset Health', href: '/assets/health', permission: 'assets.view' },
      ]
    },
    { 
      icon: '🔧', 
      label: 'Maintenance',
      permission: 'maintenance.view',
      submenu: [
        { icon: '📋', label: 'Work Orders', href: '/maintenance/work-orders', permission: 'maintenance.view' },
        { icon: '📝', label: 'Requests', href: '/maintenance/requests', permission: 'maintenance.view' },
        { icon: '📊', label: 'Dashboard', href: '/maintenance/dashboard', permission: 'maintenance.view' },
        { icon: '📈', label: 'Analytics', href: '/maintenance/analytics', permission: 'maintenance.view' },
        { icon: '🎯', label: 'Calibration', href: '/maintenance/calibration', permission: 'maintenance.view' },
        { icon: '⚠️', label: 'Risk Assessment', href: '/maintenance/risk-assessment', permission: 'maintenance.view' },
        { icon: '🛠️', label: 'Tools', href: '/maintenance/tools', permission: 'tools.view' },
        { icon: '📅', label: 'PM Schedules', href: '/pm-schedules', permission: 'pm_schedules.view' },
      ]
    },
    { 
      icon: '📡', 
      label: 'IoT',
      permission: 'iot.view',
      submenu: [
        { icon: '📱', label: 'Devices', href: '/iot/devices', permission: 'iot.view' },
        { icon: '📊', label: 'Monitoring', href: '/iot/monitoring', permission: 'iot.view' },
        { icon: '⚙️', label: 'Rules', href: '/iot/rules', permission: 'iot.view' },
      ]
    },
    { 
      icon: '📈', 
      label: 'Analytics',
      permission: 'analytics.view',
      submenu: [
        { icon: '📊', label: 'KPI Dashboard', href: '/analytics/kpi', permission: 'analytics.view' },
        { icon: '📊', label: 'OEE', href: '/analytics/oee', permission: 'analytics.view' },
        { icon: '⏱️', label: 'Downtime', href: '/analytics/downtime', permission: 'analytics.view' },
        { icon: '⚡', label: 'Energy', href: '/analytics/energy', permission: 'analytics.view' },
      ]
    },
    { 
      icon: '📋', 
      label: 'Operations',
      permission: 'operations.view',
      submenu: [
        { icon: '📏', label: 'Meter Readings', href: '/operations/meter-readings', permission: 'operations.view' },
        { icon: '🎓', label: 'Training', href: '/operations/training', permission: 'operations.view' },
        { icon: '📊', label: 'Surveys', href: '/operations/surveys', permission: 'operations.view' },
        { icon: '⏱️', label: 'Time Logs', href: '/operations/time-logs', permission: 'operations.view' },
        { icon: '📋', label: 'Shift Handover', href: '/operations/shift-handover', permission: 'operations.view' },
        { icon: '✅', label: 'Checklists', href: '/operations/checklists', permission: 'operations.view' },
      ]
    },
    { 
      icon: '🏭', 
      label: 'Production',
      permission: 'production.view',
      submenu: [
        { icon: '🏢', label: 'Work Centers', href: '/production/work-centers', permission: 'production.view' },
        { icon: '👥', label: 'Resource Planning', href: '/production/resource-planning', permission: 'production.view' },
        { icon: '📅', label: 'Scheduling', href: '/production/scheduling', permission: 'production.view' },
        { icon: '📊', label: 'Capacity', href: '/production/capacity', permission: 'production.view' },
        { icon: '📈', label: 'Efficiency', href: '/production/efficiency', permission: 'production.view' },
        { icon: '🚧', label: 'Bottlenecks', href: '/production/bottlenecks', permission: 'production.view' },
        { icon: '📋', label: 'Orders', href: '/production/orders', permission: 'production.view' },
        { icon: '📦', label: 'Batches', href: '/production/batches', permission: 'production.view' },
      ]
    },
    { 
      icon: '✅', 
      label: 'Quality',
      permission: 'quality.view',
      submenu: [
        { icon: '🔍', label: 'Inspections', href: '/quality/inspections', permission: 'quality.view' },
        { icon: '⚠️', label: 'NCR', href: '/quality/ncr', permission: 'quality.view' },
        { icon: '📋', label: 'Audits', href: '/quality/audits', permission: 'quality.view' },
        { icon: '📄', label: 'Control Plans', href: '/quality/control-plans', permission: 'quality.view' },
        { icon: '📊', label: 'SPC', href: '/quality/spc', permission: 'quality.view' },
        { icon: '🔧', label: 'CAPA', href: '/quality/capa', permission: 'quality.view' },
      ]
    },
    { 
      icon: '🦺', 
      label: 'Safety',
      permission: 'safety.view',
      submenu: [
        { icon: '⚠️', label: 'Incidents', href: '/safety/incidents', permission: 'safety.view' },
        { icon: '🔍', label: 'Inspections', href: '/safety/inspections', permission: 'safety.view' },
        { icon: '🎓', label: 'Training', href: '/safety/training', permission: 'safety.view' },
        { icon: '🦺', label: 'Equipment', href: '/safety/equipment', permission: 'safety.view' },
        { icon: '📋', label: 'Permits', href: '/safety/permits', permission: 'safety.view' },
      ]
    },
    { 
      icon: '📦', 
      label: 'Inventory',
      permission: 'inventory.view',
      submenu: [
        { icon: '📦', label: 'Items', href: '/inventory/items', permission: 'inventory.view' },
        { icon: '📂', label: 'Categories', href: '/inventory/categories', permission: 'inventory.view' },
        { icon: '📍', label: 'Locations', href: '/inventory/locations', permission: 'inventory.view' },
        { icon: '📊', label: 'Transactions', href: '/inventory/transactions', permission: 'inventory.view' },
        { icon: '🔧', label: 'Adjustments', href: '/inventory/adjustments', permission: 'inventory.view' },
        { icon: '📝', label: 'Requests', href: '/inventory/requests', permission: 'inventory.view' },
        { icon: '🔄', label: 'Transfers', href: '/inventory/transfers', permission: 'inventory.view' },
        { icon: '🤝', label: 'Suppliers', href: '/inventory/suppliers', permission: 'inventory.view' },
        { icon: '📋', label: 'Purchase Orders', href: '/inventory/purchase-orders', permission: 'inventory.view' },
        { icon: '📥', label: 'Receiving', href: '/inventory/receiving', permission: 'inventory.view' },
      ]
    },
    { 
      icon: '📊', 
      label: 'Reports',
      permission: 'reports.view',
      submenu: [
        { icon: '🏭', label: 'Asset Reports', href: '/reports/asset-reports', permission: 'reports.view' },
        { icon: '🔧', label: 'Maintenance Reports', href: '/reports/maintenance-reports', permission: 'reports.view' },
        { icon: '📦', label: 'Inventory Reports', href: '/reports/inventory-reports', permission: 'reports.view' },
        { icon: '🏭', label: 'Production Reports', href: '/reports/production-reports', permission: 'reports.view' },
        { icon: '✅', label: 'Quality Reports', href: '/reports/quality-reports', permission: 'reports.view' },
        { icon: '🦺', label: 'Safety Reports', href: '/reports/safety-reports', permission: 'reports.view' },
        { icon: '💰', label: 'Financial Reports', href: '/reports/financial-reports', permission: 'reports.view' },
        { icon: '🔧', label: 'Custom Reports', href: '/reports/custom-reports', permission: 'reports.view' },
      ]
    },
    { 
      icon: '⚙️', 
      label: 'Settings', 
      permission: 'settings.view',
      submenu: [
        { icon: '⚙️', label: 'General', href: '/settings/general', permission: 'settings.view' },
        { icon: '👥', label: 'Users', href: '/settings/users', permission: 'users.view' },
        { icon: '🛡️', label: 'Roles', href: '/settings/roles', permission: 'roles.view' },
        { icon: '🔐', label: 'Permissions', href: '/settings/permissions', permission: 'permissions.view' },
        { icon: '🔔', label: 'Notifications', href: '/settings/notifications', permission: 'settings.view' },
        { icon: '🔗', label: 'Integrations', href: '/settings/integrations', permission: 'settings.view' },
        { icon: '💾', label: 'Backup', href: '/settings/backup', permission: 'settings.view' },
        { icon: '📋', label: 'Audit Log', href: '/settings/audit-log', permission: 'settings.view' },
      ]
    },
  ];

  // Filter menu items based on permissions
  const getFilteredMenuItems = () => {
    return menuItems.filter(item => {
      // Check if user has permission for this menu item
      if (item.permission && !hasPermission(item.permission)) {
        return false;
      }
      if (item.permissions && !hasAnyPermission(item.permissions)) {
        return false;
      }
      
      // Filter submenu items
      if (item.submenu) {
        item.submenu = item.submenu.filter(subItem => {
          if (subItem.permission && !hasPermission(subItem.permission)) {
            return false;
          }
          if (subItem.permissions && !hasAnyPermission(subItem.permissions)) {
            return false;
          }
          return true;
        });
        
        // Hide parent if no submenu items visible
        if (item.submenu.length === 0) {
          return false;
        }
      }
      
      return true;
    });
  };

  const filteredMenuItems = getFilteredMenuItems();

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
            <h1 className="font-semibold text-lg">{systemName}</h1>
          </div>
          <div className="flex items-center space-x-6">
            <PlantSelector />
            <span className="bg-slate-700 px-3 py-1 rounded-full capitalize text-sm">{userRole || role}</span>
            <NotificationCenter />
            <DarkModeToggle />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold">
                {currentUser?.name?.[0]?.toUpperCase() || userRole?.[0]?.toUpperCase() || 'U'}
              </div>
              <button onClick={logout} className="hover:bg-slate-700 px-3 py-1 rounded text-sm" title="Logout">
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
              {filteredMenuItems.map((item) => (
                <div key={item.label}>
                  {item.submenu ? (
                    <>
                      <button
                        onClick={() => toggleSubmenu(item.label)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-blue-50 transition-colors ${
                          item.submenu?.some(sub => pathname === sub.href || (sub.href && pathname?.startsWith(sub.href))) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-2xl">{item.icon}</span>
                          {sidebarOpen && <span className="ml-3 text-gray-700 font-medium">{item.label}</span>}
                        </div>
                        {sidebarOpen && (
                          <svg className={`w-5 h-5 transition-transform ${openMenus.includes(item.label) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                      {openMenus.includes(item.label) && sidebarOpen && item.submenu && (
                        <div className="bg-gray-50">
                          {item.submenu.map((subItem) => (
                            <Link
                              key={subItem.href || subItem.label}
                              href={subItem.href || '#'}
                              className={`flex items-center px-4 py-3 pl-12 hover:bg-blue-50 transition-colors ${
                                pathname === subItem.href || (subItem.href && pathname?.startsWith(subItem.href)) ? 'bg-blue-100 border-r-4 border-blue-600 text-blue-700 font-medium' : 'text-gray-600'
                              }`}
                            >
                              <span className="mr-2 text-lg">{subItem.icon}</span>
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
                      <span className="text-2xl">{item.icon}</span>
                      {sidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
                    </Link>
                  ) : null}
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
          <div className="text-gray-500 text-xs">
            <span>© 2024 Lightworld Technologies Limited • iFactory EAM System v2.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
