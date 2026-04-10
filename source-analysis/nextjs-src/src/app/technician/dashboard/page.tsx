'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Wrench, Clock, CheckCircle, AlertTriangle, Package, ClipboardList, TrendingUp, Calendar } from 'lucide-react';

export default function TechnicianDashboard() {
  const [stats, setStats] = useState<any>({});
  const [myWorkOrders, setMyWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const statsRes = await api.get('/dashboard/technician');
      setStats(statsRes.data?.data || {});
      
      const woRes = await api.get('/work-orders?limit=100');
      const allWorkOrders = woRes.data?.data || [];
      
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id || userData.user_id;
      
      const myOrders = allWorkOrders.filter((wo: any) => {
        if (wo.assigned_to == userId) return true;
        if (wo.team_members?.some((m: any) => m.technician_id == userId || m.user_id == userId)) return true;
        return false;
      });
      
      setMyWorkOrders(myOrders);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Assigned to Me', value: stats.assigned || 0, icon: Wrench, color: 'blue', link: '/technician/my-work-orders' },
    { label: 'In Progress', value: stats.in_progress || 0, icon: Clock, color: 'yellow', link: '/technician/my-work-orders?status=in_progress' },
    { label: 'Completed Today', value: stats.completed_today || 0, icon: CheckCircle, color: 'green', link: '/technician/my-work-orders?status=completed' },
    { label: 'Overdue', value: stats.overdue || 0, icon: AlertTriangle, color: 'red', link: '/technician/my-work-orders?overdue=true' }
  ];

  const quickActions = [
    { label: 'My Work Orders', icon: ClipboardList, link: '/technician/my-work-orders', color: 'blue' },
    { label: 'Tool Requests', icon: Wrench, link: '/technician/tool-requests', color: 'indigo' },
    { label: 'Request Parts', icon: Package, link: '/technician/parts-request', color: 'purple' },
    { label: 'Time Logs', icon: Clock, link: '/technician/time-logs', color: 'green' },
    { label: 'PM Schedule', icon: Calendar, link: '/technician/pm-schedule', color: 'orange' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-blue-600 rounded-lg shadow-sm p-4 text-white">
          <h1 className="text-lg font-semibold mb-2">Technician Portal</h1>
          <p className="text-blue-100">Welcome back! Here's your work overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat, idx) => (
            <Link key={idx} href={stat.link}>
              <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 border-${stat.color}-500 hover:shadow-xl transition-shadow cursor-pointer`}>
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className={`w-8 h-8 text-${stat.color}-600`} />
                  <span className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {quickActions.map((action, idx) => (
              <Link key={idx} href={action.link}>
                <div className={`p-4 rounded-lg bg-white shadow-md hover:shadow-lg border border-gray-100 hover:border-${action.color}-200 transition-all cursor-pointer text-center`}>
                  <action.icon className={`w-8 h-8 text-${action.color}-600 mx-auto mb-2`} />
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">My Recent Work Orders</h2>
            <Link href="/technician/my-work-orders" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              View All →
            </Link>
          </div>
          {myWorkOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {myWorkOrders.map((wo) => (
                <Link key={wo.id} href={`/technician/my-work-orders/${wo.id}`}>
                  <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg border border-gray-100 hover:border-blue-200 transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{wo.title}</h3>
                        <p className="text-sm text-gray-500">WO #{wo.work_order_number}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        wo.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        wo.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {wo.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{wo.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Priority: <span className="font-medium capitalize">{wo.priority}</span></span>
                      <span>Type: <span className="font-medium capitalize">{wo.type}</span></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <p className="text-gray-500">No work orders assigned</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
