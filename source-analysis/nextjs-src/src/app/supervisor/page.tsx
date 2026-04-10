'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function SupervisorDashboard() {
  const [stats, setStats] = useState({
    assignedWorkOrders: 0,
    pendingApprovals: 0,
    activeTeamMembers: 0,
    completedToday: 0,
    overdueWorkOrders: 0,
    equipmentIssues: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [teamStatus, setTeamStatus] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const plantId = localStorage.getItem('current_plant_id') || 1;
      // Fetch real stats from API
      const [workOrdersRes, requestsRes, usersRes, toolApprovalsRes] = await Promise.all([
        api.get('/work-orders'),
        api.get('/maintenance-requests'),
        api.get('/users'),
        api.get('/tool-requests').catch(() => ({ data: { data: [] } }))
      ]);

      const workOrders = workOrdersRes.data?.data || [];
      const requests = requestsRes.data?.data || [];
      const users = usersRes.data?.data || [];
      const allToolRequests = toolApprovalsRes.data?.data || [];
      
      console.log('All tool requests:', allToolRequests);
      console.log('Tool requests count:', allToolRequests.length);
      
      // Filter tool requests to only show PENDING ones from team members
      const toolApprovals = allToolRequests.filter((tr: any) => tr.request_status === 'PENDING');
      
      // Group by work_order_id + requested_by to count unique requests
      const uniqueToolRequests = new Set(
        toolApprovals.map((r: any) => `${r.work_order_id}_${r.requested_by}`)
      );
      const toolRequestsCount = uniqueToolRequests.size;

      const today = new Date().toISOString().split('T')[0];
      
      setStats({
        assignedWorkOrders: workOrders.filter((wo: any) => 
          wo.status === 'assigned_to_supervisor'
        ).length,
        pendingApprovals: requests.filter((r: any) => 
          r.workflow_status === 'pending' || r.workflow_status === 'supervisor_review'
        ).length + toolRequestsCount,
        activeTeamMembers: users.filter((u: any) => 
          u.role === 'technician' || u.role === 'operator'
        ).length,
        completedToday: workOrders.filter((wo: any) => 
          wo.status === 'completed' && wo.completed_at?.startsWith(today)
        ).length,
        overdueWorkOrders: workOrders.filter((wo: any) => 
          wo.due_date && new Date(wo.due_date) < new Date() && 
          wo.status !== 'completed' && wo.status !== 'closed'
        ).length,
        equipmentIssues: requests.filter((r: any) => 
          r.machine_down_status === 'Yes' && r.status !== 'closed'
        ).length
      });

      console.log('Maintenance requests pending:', requests.filter((r: any) => 
        r.workflow_status === 'pending' || r.workflow_status === 'supervisor_review'
      ).length);
      console.log('Tool requests pending:', toolApprovals.length);
      console.log('Total pending approvals:', requests.filter((r: any) => 
        r.workflow_status === 'pending' || r.workflow_status === 'supervisor_review'
      ).length + toolApprovals.length);

      // Get recent work orders for activity
      const recentWOs = workOrders.slice(0, 5).map((wo: any) => ({
        id: wo.id,
        type: 'work_order',
        title: wo.title || `Work Order ${wo.work_order_number}`,
        description: wo.description || 'No description',
        time: getTimeAgo(wo.updated_at || wo.created_at),
        status: wo.status === 'completed' ? 'completed' : 
                wo.status === 'in_progress' ? 'info' : 'warning'
      }));
      setRecentActivity(recentWOs);

      // Get technicians with their current work orders
      const technicians = users.filter((u: any) => u.role === 'technician');
      const teamData = technicians.slice(0, 5).map((tech: any) => {
        const currentWO = workOrders.find((wo: any) => 
          wo.assigned_to === tech.id && 
          (wo.status === 'in_progress' || wo.status === 'assigned')
        );
        return {
          id: tech.id,
          name: tech.name,
          role: tech.role,
          status: currentWO ? 'active' : 'idle',
          currentTask: currentWO ? currentWO.work_order_number : 'None',
          progress: currentWO?.status === 'in_progress' ? 50 : 0
        };
      });
      setTeamStatus(teamData);

      // Get pending maintenance requests for approval
      const pendingMaintenance = requests.filter((r: any) => 
        r.workflow_status === 'pending' || r.workflow_status === 'supervisor_review'
      ).slice(0, 5);
      setPendingRequests(pendingMaintenance);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Supervisor Dashboard</h1>
        <p className="text-xs text-gray-600 mt-0.5">Monitor team performance and work orders</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            <Link href="/supervisor/work-orders" className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Assigned Work Orders</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{stats.assignedWorkOrders}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link href="/supervisor/tool-requests" className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{stats.pendingApprovals}</p>
                  <p className="text-xs text-gray-500 mt-1">Maintenance + Tools</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link href="/supervisor/team" className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Team</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{stats.activeTeamMembers}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link href="/supervisor/work-orders" className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{stats.completedToday}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link href="/supervisor/work-orders" className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{stats.overdueWorkOrders}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link href="/supervisor/maintenance-requests" className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Equipment Issues</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{stats.equipmentIssues}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Pending Approvals */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
                  <Link href="/supervisor/maintenance-requests" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All →
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {pendingRequests.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending approvals</p>
                  ) : (
                    pendingRequests.map((request) => (
                      <div key={request.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm">{request.request_number}</div>
                              {request.machine_down_status === 'Yes' && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">🔴 CRITICAL</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{request.title}</div>
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            PENDING
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Team Status */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Team Status</h2>
                  <Link href="/supervisor/roster" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All →
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {teamStatus.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No team members found</p>
                  ) : (
                    teamStatus.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {member.name ? member.name.split(' ').map((n: string) => n[0]).join('') : 'NA'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.role} • {member.currentTask}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{member.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${member.progress}%` }}></div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            member.status === 'active' ? 'bg-green-100 text-green-800' :
                            member.status === 'break' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {member.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity - Full Width */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              {recentActivity.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {recentActivity.map((activity, index) => (
                    <Link 
                      key={activity.id} 
                      href={`/supervisor/work-orders/${activity.id}`}
                      className={`flex items-center gap-4 hover:bg-gray-50 transition-colors rounded-lg -mx-2 px-2 ${index === 0 ? 'pb-4' : 'py-4'}`}
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        activity.status === 'completed' ? 'bg-green-500' :
                        activity.status === 'warning' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 text-sm truncate hover:text-blue-600 transition-colors">{activity.title}</p>
                          <p className="text-xs text-gray-500 ml-4 flex-shrink-0">{activity.time}</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Link href="/supervisor/assignments" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">New Assignment</p>
                  <p className="text-sm text-gray-600">Assign work orders</p>
                </div>
              </div>
            </Link>

            <Link href="/supervisor/maintenance-requests" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2">
                <div className="bg-green-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Work Orders</p>
                  <p className="text-sm text-gray-600">View all orders</p>
                </div>
              </div>
            </Link>

            <Link href="/supervisor/roster" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Shift Roster</p>
                  <p className="text-sm text-gray-600">Manage schedules</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/reports" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Reports</p>
                  <p className="text-sm text-gray-600">View analytics</p>
                </div>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
