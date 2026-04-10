'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function PendingApprovalsPage() {
  const router = useRouter();
  const [maintenanceCount, setMaintenanceCount] = useState(0);
  const [toolRequestsCount, setToolRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [maintenanceRes, toolRes] = await Promise.all([
        api.get('/maintenance-requests'),
        api.get('/tool-requests')
      ]);

      const maintenanceRequests = maintenanceRes.data?.data || [];
      const pendingMaintenance = maintenanceRequests.filter((r: any) => 
        r.workflow_status === 'pending' || r.workflow_status === 'supervisor_review'
      ).length;

      const toolRequests = toolRes.data?.data || [];
      const pendingTools = toolRequests.filter((r: any) => r.request_status === 'PENDING').length;

      setMaintenanceCount(pendingMaintenance);
      setToolRequestsCount(pendingTools);
    } catch (error) {
      console.error('Error fetching counts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pending Approvals</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => router.push('/planner/maintenance-requests')}
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-4xl font-bold text-blue-600">{maintenanceCount}</div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Maintenance Requests</h2>
            <p className="text-sm text-gray-600">Review and approve maintenance work requests</p>
          </button>

          <button
            onClick={() => router.push('/planner/tool-requests')}
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-orange-500 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div className="text-4xl font-bold text-orange-600">{toolRequestsCount}</div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tool Requests</h2>
            <p className="text-sm text-gray-600">Approve tool requests for work orders</p>
          </button>
        </div>

        <button
          onClick={() => router.back()}
          className="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
