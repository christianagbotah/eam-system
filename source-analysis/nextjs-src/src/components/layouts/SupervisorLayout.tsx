'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { checkAuth, logout } from '@/middleware/auth';

interface MenuItem {
  icon: string;
  label: string;
  href?: string;
  submenu?: MenuItem[];
}

const supervisorMenuItems: MenuItem[] = [
  { icon: '📊', label: 'Dashboard', href: '/supervisor' },
  { icon: '📋', label: 'Maintenance Requests', href: '/supervisor/maintenance-requests' },
  { icon: '🛠️', label: 'Tool Requests', href: '/supervisor/tool-requests' },
  { icon: '🔗', label: 'Assignments', href: '/supervisor/assignments' },
  { icon: '👥', label: 'My Team', href: '/supervisor/team' },
  { icon: '📅', label: 'Shift Roster', href: '/supervisor/roster' },
  { 
    icon: '📋', 
    label: 'Operations',
    submenu: [
      { icon: '🎯', label: 'Skills', href: '/supervisor/skills' },
      { icon: '🎓', label: 'Training', href: '/admin/training' },
    ]
  },
  { icon: '🏭', label: 'Assets', href: '/machine/machineLists' },
  { icon: '📈', label: 'Reports', href: '/supervisor/reports' },
];

export default function SupervisorLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const auth = checkAuth();
    if (!auth) {
      router.push('/login');
      return;
    }
    setCurrentUser(auth.user);
  }, [router]);

  useEffect(() => {
    const activeParent = supervisorMenuItems.find(item => 
      item.submenu?.some(sub => pathname === sub.href || (sub.href && pathname?.startsWith(sub.href)))
    );
    if (activeParent && !openMenus.includes(activeParent.label)) {
      setOpenMenus(prev => [...prev, activeParent.label]);
    }
  }, [pathname]);

  const toggleSubmenu = (label: string) => {
    setOpenMenus(prev => 
      prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg fixed w-full z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-700 rounded">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">Supervisor Dashboard</h1>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-sm bg-slate-700 px-3 py-1 rounded-full">Supervisor</span>
            <NotificationCenter />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold">
                {currentUser?.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <button onClick={logout} className="text-sm hover:bg-slate-700 px-3 py-1 rounded">🚪</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all z-40 fixed h-full p-2`}>
          <div className="bg-white shadow-2xl rounded-2xl h-[calc(100vh-5rem)] overflow-y-auto">
          <nav className="mt-4 pb-20">
            {supervisorMenuItems.map((item) => (
              <div key={item.label}>
                {item.submenu ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors ${
                        item.submenu?.some(sub => pathname === sub.href || (sub.href && pathname?.startsWith(sub.href))) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl">{item.icon}</span>
                        {sidebarOpen && <span className="ml-3 text-gray-700 font-medium">{item.label}</span>}
                      </div>
                      {sidebarOpen && (
                        <svg className={`w-4 h-4 transition-transform ${openMenus.includes(item.label) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            className={`flex items-center px-4 py-2 pl-12 hover:bg-blue-50 transition-colors text-sm ${
                              pathname === subItem.href || (subItem.href && pathname?.startsWith(subItem.href)) ? 'bg-blue-100 border-r-4 border-blue-600 text-blue-700 font-medium' : 'text-gray-600'
                            }`}
                          >
                            <span className="mr-2">{subItem.icon}</span>
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 hover:bg-blue-50 transition-colors ${
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
        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} p-6 transition-all`}>{children}</main>
      </div>
    </div>
  );
}
