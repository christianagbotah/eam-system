'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function TestSidebar() {
  return (
    <DashboardLayout role="admin">
      <div className="p-6">
        <h1 className="text-lg font-semibold">Sidebar Test - Admin Role</h1>
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Expected Sidebar Structure:</h2>
          <ul className="space-y-3">
            <li className="flex items-center">
              <span className="text-2xl mr-3">📊</span>
              <span className="font-medium">Dashboard</span>
              <span className="ml-2 text-sm text-gray-500">(direct link)</span>
            </li>
            <li className="flex items-center">
              <span className="text-2xl mr-3">🏭</span>
              <span className="font-medium">Assets</span>
              <span className="ml-2 text-sm text-blue-600">(click to expand)</span>
            </li>
            <li className="flex items-center pl-8">
              <span className="text-xl mr-2">📋</span>
              <span className="text-sm">All Assets</span>
            </li>
            <li className="flex items-center pl-8">
              <span className="text-xl mr-2">🎮</span>
              <span className="text-sm">3D Explorer</span>
            </li>
            <li className="flex items-center">
              <span className="text-2xl mr-3">🔧</span>
              <span className="font-medium">Maintenance</span>
              <span className="ml-2 text-sm text-blue-600">(click to expand)</span>
            </li>
            <li className="flex items-center pl-8">
              <span className="text-xl mr-2">📝</span>
              <span className="text-sm">Work Orders</span>
            </li>
            <li className="flex items-center pl-8">
              <span className="text-xl mr-2">📅</span>
              <span className="text-sm">PM Schedule</span>
            </li>
            <li className="flex items-center">
              <span className="text-2xl mr-3">📊</span>
              <span className="font-medium">Production</span>
              <span className="ml-2 text-sm text-blue-600">(click to expand)</span>
            </li>
            <li className="flex items-center pl-8">
              <span className="text-xl mr-2">📋</span>
              <span className="text-sm">Daily Survey</span>
            </li>
            <li className="flex items-center pl-8">
              <span className="text-xl mr-2">📈</span>
              <span className="text-sm">Weekly Report</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
