'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { maintenanceService } from '@/services/maintenanceService';

export default function TechnicianDashboard() {
  const [mounted, setMounted] = useState(false);
  const [myTeamOrders, setMyTeamOrders] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    loadMyTeamOrders();
  }, []);

  const loadMyTeamOrders = async () => {
    try {
      const res = await maintenanceService.getTeam(0);
      setMyTeamOrders(res.data.data || []);
    } catch (error) {
      console.error('Failed to load team orders:', error);
    }
  };

  return (
    <DashboardLayout role="technician">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-800">Technician Dashboard</h1>
          <div className="text-sm text-gray-500">{mounted ? new Date().toLocaleDateString() : ''}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/admin/work-orders?assigned=me&status=pending" className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow-lg text-white hover:shadow-xl transition-shadow">
            <div>
              <p className="text-orange-100 text-sm">Assigned to Me</p>
              <p className="text-4xl font-bold mt-2">8</p>
              <p className="text-orange-100 text-xs mt-2">3 urgent</p>
            </div>
          </Link>

          <Link href="/admin/work-orders?assigned=me&status=in_progress" className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg text-white hover:shadow-xl transition-shadow">
            <div>
              <p className="text-blue-100 text-sm">In Progress</p>
              <p className="text-4xl font-bold mt-2">3</p>
              <p className="text-blue-100 text-xs mt-2">Active tasks</p>
            </div>
          </Link>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
            <div>
              <p className="text-purple-100 text-sm">Team Assignments</p>
              <p className="text-4xl font-bold mt-2">{myTeamOrders.length}</p>
              <p className="text-purple-100 text-xs mt-2">Multi-tech work</p>
            </div>
          </div>

          <Link href="/admin/work-orders?assigned=me&status=completed&date=today" className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg text-white hover:shadow-xl transition-shadow">
            <div>
              <p className="text-green-100 text-sm">Completed Today</p>
              <p className="text-4xl font-bold mt-2">5</p>
              <p className="text-green-100 text-xs mt-2">Great work!</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Work Orders</h3>
            <div className="space-y-3">
              {[
                { id: 'WO-1234', asset: 'Compressor #3', type: 'Corrective', priority: 'high', time: '09:00 AM', status: 'in_progress' },
                { id: 'WO-1235', asset: 'Pump #7', type: 'Preventive', priority: 'medium', time: '11:00 AM', status: 'pending' },
                { id: 'WO-1236', asset: 'Motor #12', type: 'Inspection', priority: 'low', time: '02:00 PM', status: 'pending' }
              ].map((wo, i) => (
                <div key={i} className={`p-4 rounded-lg border-l-4 ${
                  wo.status === 'in_progress' ? 'bg-blue-50 border-blue-500' :
                  wo.priority === 'high' ? 'bg-red-50 border-red-500' :
                  'bg-yellow-50 border-yellow-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{wo.id}</p>
                      <p className="text-sm text-gray-700">{wo.asset}</p>
                    </div>
                    <button className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700">
                      {wo.status === 'in_progress' ? 'Complete' : 'Start'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-semibold">
                  Request Help
                </button>
                <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold">
                  Request Parts
                </button>
                <button className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold">
                  View Procedures
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
