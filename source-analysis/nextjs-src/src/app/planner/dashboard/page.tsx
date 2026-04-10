'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function ProductionPlannerDashboard() {
  const [stats, setStats] = useState({
    activeTargets: 0,
    completedToday: 0,
    pmTasksDue: 0,
    workOrders: 0,
    inProgressWO: 0,
    pendingRequests: 0,
    overdueWO: 0,
    criticalAssets: 0,
    avgEfficiency: 0,
    scheduledPM: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching planner dashboard stats...');
      const response = await api.get('/dashboard/planner');
      console.log('Dashboard response:', response.data);
      const data = response.data?.data;
      
      const toolRequestsRes = await api.get('/tool-requests').catch(() => ({ data: { data: [] } }));
      console.log('Tool Requests API Response:', toolRequestsRes.data);
      const toolRequests = (toolRequestsRes.data as any)?.data || [];
      console.log('All Tool Requests:', toolRequests);
      
      // Group by work_order_id + requested_by to count unique requests
      const uniqueRequests = new Set(
        toolRequests
          .filter((r: any) => r.request_status === 'PENDING')
          .map((r: any) => `${r.work_order_id}_${r.requested_by}`)
      );
      const pendingToolRequests = uniqueRequests.size;
      
      console.log('Tool Requests Count:', pendingToolRequests);
      console.log('Maintenance Requests Count:', data?.pendingRequests || 0);
      
      if (data) {
        setStats({
          activeTargets: data.activeTargets || 0,
          completedToday: data.completedToday || 0,
          pmTasksDue: data.pmTasksDue || 0,
          workOrders: data.workOrders || 0,
          inProgressWO: data.inProgressWO || 0,
          pendingRequests: (data.pendingRequests || 0) + pendingToolRequests,
          overdueWO: data.overdueWO || 0,
          criticalAssets: data.criticalAssets || 0,
          avgEfficiency: data.avgEfficiency || 0,
          scheduledPM: data.scheduledPM || 0
        });
        setRecentActivity(data.recentActivity || []);
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'target': return 'M12 4v16m8-8H4';
      case 'survey': return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'request': return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      case 'pm': return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'wo': return 'M13 10V3L4 14h7v7l9-11h-7z';
      default: return 'M12 4v16m8-8H4';
    }
  };

  const getActivityColor = (color: string) => {
    switch(color) {
      case 'blue': return { bg: 'bg-blue-50', icon: 'bg-blue-600' };
      case 'green': return { bg: 'bg-green-50', icon: 'bg-green-600' };
      case 'red': return { bg: 'bg-red-50', icon: 'bg-red-600' };
      case 'orange': return { bg: 'bg-orange-50', icon: 'bg-orange-600' };
      case 'purple': return { bg: 'bg-purple-50', icon: 'bg-purple-600' };
      default: return { bg: 'bg-gray-50', icon: 'bg-gray-600' };
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Glassmorphism */}
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Production Planner</h1>
              <p className="text-slate-600 mt-1 text-sm">Real-time production monitoring & PM task management</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                System Active
              </div>
              <div className="text-sm text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* KPI Cards with Modern Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          <Link href="/planner/production-targets" className="group relative overflow-hidden backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Active Targets</span>
                <div className="p-2 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.activeTargets}</p>
              <span className="text-xs text-slate-500">Today's targets</span>
            </div>
          </Link>

          <Link href="/planner/pending-approvals" className="group relative overflow-hidden backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Pending Approvals</span>
                <div className="p-2 bg-red-100 rounded-xl group-hover:scale-110 group-hover:rotate-12 transition-all">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.pendingRequests}</p>
              <span className="text-xs text-red-600 font-medium">⚠ Maintenance + Tools</span>
            </div>
          </Link>

          <Link href="/planner/work-orders?status=in_progress" className="group relative overflow-hidden backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">WO In Progress</span>
                <div className="p-2 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.inProgressWO}</p>
              <span className="text-xs text-blue-600 font-medium">Being worked on</span>
            </div>
          </Link>

          <Link href="/assets" className="group relative overflow-hidden backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Critical Assets</span>
                <div className="p-2 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.criticalAssets}</p>
              <span className="text-xs text-purple-600 font-medium">Down/Maintenance</span>
            </div>
          </Link>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
          <Link href="/planner/pm-calendar" className="group relative overflow-hidden backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Scheduled PM</span>
                <div className="p-2 bg-indigo-100 rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.scheduledPM || 0}</p>
              <span className="text-xs text-slate-500">Planned/Scheduled</span>
            </div>
          </Link>

          <Link href="/planner/work-orders?status=completed" className="group relative overflow-hidden backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Completed Today</span>
                <div className="p-2 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.completedToday}</p>
              <span className="text-xs text-green-600 font-medium">Work orders</span>
            </div>
          </Link>

          <Link href="/planner/pm-monitoring" className="group relative overflow-hidden backdrop-blur-xl bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">PM Tasks Due</span>
                <div className="p-2 bg-orange-100 rounded-xl group-hover:scale-110 group-hover:rotate-12 transition-all">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.pmTasksDue}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-600 font-medium">⚠ Attention</span>
                <span className="text-xs text-slate-500">required</span>
              </div>
            </div>
          </Link>

          <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 text-white">
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Efficiency</span>
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold mb-1">{stats.avgEfficiency}%</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{width: `${stats.avgEfficiency}%`}}></div>
                </div>
                <span className="text-xs font-medium">Target: 95%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions with Hover Effects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
          <Link href="/planner/production-targets/create" className="group backdrop-blur-xl bg-white/80 hover:bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-blue-300 hover:-translate-y-1">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Set Production Target</h3>
                <p className="text-sm text-slate-600">Assign targets to operators</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/planner/pm-monitoring" className="group backdrop-blur-xl bg-white/80 hover:bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-orange-300 hover:-translate-y-1">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">Monitor PM Tasks</h3>
                <p className="text-sm text-slate-600">Track usage-based maintenance</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/planner/production-surveys" className="group backdrop-blur-xl bg-white/80 hover:bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-green-300 hover:-translate-y-1">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 group-hover:text-green-600 transition-colors">Review Surveys</h3>
                <p className="text-sm text-slate-600">Approve production data</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Recent Activity with Timeline */}
        <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
            <Link href="/planner/work-orders" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => {
                const colors = getActivityColor(activity.color);
                return (
                  <div key={index} className={`flex items-center gap-4 p-4 ${colors.bg} rounded-lg`}>
                    <div className={`${colors.icon} text-white p-2 rounded-full`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getActivityIcon(activity.type)} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                    <span className="text-sm text-gray-500">{getTimeAgo(activity.time)}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
