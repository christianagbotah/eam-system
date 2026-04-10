'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Database, Download, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BackupPage() {
  const backups = [
    { id: 1, name: 'Daily Backup', date: '2024-01-20 02:00', size: '2.5 GB', status: 'completed' },
    { id: 2, name: 'Weekly Backup', date: '2024-01-15 02:00', size: '2.4 GB', status: 'completed' },
    { id: 3, name: 'Monthly Backup', date: '2024-01-01 02:00', size: '2.3 GB', status: 'completed' }
  ];

  const createBackup = () => {
    toast.success('Creating backup...');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backup & Restore</h1>
            <p className="text-gray-600 mt-1">Manage system backups</p>
          </div>
          <button onClick={createBackup} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
            <Database className="w-4 h-4" />
            Create Backup
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{backup.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{backup.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{backup.size}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {backup.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
