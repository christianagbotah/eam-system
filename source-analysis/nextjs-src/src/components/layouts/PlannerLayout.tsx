'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { checkAuth, logout } from '@/middleware/auth';

const plannerMenuItems = [
  { icon: '📊', label: 'Dashboard', href: '/planner/dashboard' },
  { icon: '🎯', label: 'Production Targets', href: '/planner/production-targets' },
  { icon: '📋', label: 'Production Survey', href: '/planner/production-surveys' },
  { icon: '📝', label: 'Maintenance Requests', href: '/planner/maintenance-requests' },
  { icon: '🛠️', label: 'Tool Requests', href: '/planner/tool-requests' },
  { icon: '📅', label: 'PM Calendar', href: '/planner/pm-calendar' },
  { icon: '🔧', label: 'PM Monitoring', href: '/planner/pm-monitoring' },
  { icon: '📋', label: 'PM Work Orders', href: '/planner/work-orders' },
  { icon: '🏭', label: 'Equipment', href: '/planner/equipment' },
  { icon: '📦', label: 'Spare Parts', href: '/inventory/spare-parts' },
  { icon: '🔨', label: 'Tools', href: '/inventory/tools' },
  { icon: '📈', label: 'Analytics', href: '/planner/analytics' },
];

export default function PlannerLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
            <h1 className="text-xl font-bold">Production Planner</h1>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-sm bg-slate-700 px-3 py-1 rounded-full">Planner</span>
            <NotificationCenter />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center font-bold">
                {currentUser?.name?.[0]?.toUpperCase() || 'P'}
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
            {plannerMenuItems.map((item) => (
              <Link key={item.href} href={item.href} className={`flex items-center px-4 py-3 hover:bg-green-50 transition-colors ${pathname === item.href ? 'bg-green-100 border-r-4 border-green-600 text-green-700 font-semibold' : 'text-gray-700'}`}>
                <span className="text-2xl">{item.icon}</span>
                {sidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
              </Link>
            ))}
          </nav>
          </div>
        </aside>
        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} p-6 transition-all`}>{children}</main>
      </div>
    </div>
  );
}
