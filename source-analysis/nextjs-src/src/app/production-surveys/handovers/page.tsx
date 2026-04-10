'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function ShiftHandoversPage() {
  const [handovers] = useState<any[]>([]);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">📝 Shift Handovers</h1>

        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-800">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Handovers are created automatically when surveys are approved. View and acknowledge handovers from previous shifts.</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Survey</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {handovers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No handovers yet</td></tr>
              ) : (
                handovers.map((h) => (
                  <tr key={h.id}>
                    <td className="px-6 py-4">{h.date}</td>
                    <td className="px-6 py-4">{h.survey_code}</td>
                    <td className="px-6 py-4">{h.machine}</td>
                    <td className="px-6 py-4">{h.issues}</td>
                    <td className="px-6 py-4">{h.acknowledged ? '✅' : '⏳'}</td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
