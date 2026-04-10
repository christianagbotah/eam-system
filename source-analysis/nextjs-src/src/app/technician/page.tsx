'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function TechnicianDashboard() {
  const [stats, setStats] = useState({ assigned: 0, in_progress: 0, completed_today: 0 });
  const technicianId = 1;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/pm-work-orders');
      const data = response.data;
      const myOrders = data.data?.filter((wo: any) => wo.assigned_to == technicianId) || [];
      
      setStats({
        assigned: myOrders.filter((wo: any) => wo.status === 'assigned').length,
        in_progress: myOrders.filter((wo: any) => wo.status === 'in_progress').length,
        completed_today: myOrders.filter((wo: any) => 
          wo.status === 'completed' && 
          new Date(wo.completed_at).toDateString() === new Date().toDateString()
        ).length
      });
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-base md:text-3xl font-semibold mb-2">Technician Dashboard</h1>
          <p className="text-blue-100">Welcome back! Here's your work summary</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Assigned</span>
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-lg font-semibold text-blue-600">{stats.assigned}</p>
            <p className="text-xs text-gray-500 mt-1">Pending start</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">In Progress</span>
              <span className="text-2xl">⚙️</span>
            </div>
            <p className="text-lg font-semibold text-orange-600">{stats.in_progress}</p>
            <p className="text-xs text-gray-500 mt-1">Active tasks</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Completed Today</span>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-lg font-semibold text-green-600">{stats.completed_today}</p>
            <p className="text-xs text-gray-500 mt-1">Great work!</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Link
            href="/technician/my-work-orders"
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-blue-500"
          >
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                📝
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">My Work Orders</h3>
                <p className="text-sm text-gray-600">View and execute assigned tasks</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/technician/history"
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-green-500"
          >
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Work History</h3>
                <p className="text-sm text-gray-600">View completed work orders</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Quick Tips</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-xl">💡</span>
              <div>
                <p className="font-medium text-sm">Start work orders promptly</p>
                <p className="text-xs text-gray-600">Click "Start Work" to begin tracking time</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-xl">✓</span>
              <div>
                <p className="font-medium text-sm">Complete all checklist items</p>
                <p className="text-xs text-gray-600">Ensure quality by checking off each task</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <span className="text-xl">📝</span>
              <div>
                <p className="font-medium text-sm">Record accurate parameters</p>
                <p className="text-xs text-gray-600">Document measurements and observations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
