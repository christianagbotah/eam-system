'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { maintenanceService } from '@/services/maintenanceService';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      const res = await maintenanceService.getPendingVerifications();
      setVerifications((res.data as any)?.data || []);
    } catch (error) {
      showToast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (id: number) => {
    router.push(`/admin/work-orders/${id}?action=verify`);
  };

  return (
    <DashboardLayout role="manager">
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">Pending Verifications</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">WO Number</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {verifications.map((wo: any) => (
                  <tr key={wo.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">{wo.wo_number}</td>
                    <td className="px-3 py-2.5 text-sm">{wo.title}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      <button onClick={() => handleVerify(wo.id)} className="text-blue-600 hover:text-blue-900 text-xs">
                        Verify
                      </button>
                    </td>
                  </tr>
                ))}
                {verifications.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500">
                      No pending verifications
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
