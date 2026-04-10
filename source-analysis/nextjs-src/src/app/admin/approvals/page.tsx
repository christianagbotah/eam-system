'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { maintenanceService } from '@/services/maintenanceService';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      const res = await maintenanceService.getPendingApprovals();
      setApprovals((res.data as any)?.data || []);
    } catch (error) {
      showToast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await maintenanceService.approveApproval(id);
      showToast.success('Approved');
      loadApprovals();
    } catch (error) {
      showToast.error('Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    const notes = prompt('Rejection reason:');
    if (!notes) return;
    try {
      await maintenanceService.rejectApproval(id, notes);
      showToast.success('Rejected');
      loadApprovals();
    } catch (error) {
      showToast.error('Failed to reject');
    }
  };

  return (
    <DashboardLayout role="manager">
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">Pending Approvals</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Approval Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {approvals.map((approval: any) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">{approval.entity_type}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      {approval.request_title || approval.wo_number || `#${approval.entity_id}`}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">{approval.approval_type}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                        {approval.approval_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm space-x-2">
                      <button onClick={() => handleApprove(approval.id)} className="text-green-600 hover:text-green-900 text-xs">
                        Approve
                      </button>
                      <button onClick={() => handleReject(approval.id)} className="text-red-600 hover:text-red-900 text-xs">
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {approvals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">
                      No pending approvals
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
