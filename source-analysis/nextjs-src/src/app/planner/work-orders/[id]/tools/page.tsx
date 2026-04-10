'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import WorkOrderTools from '@/components/WorkOrderTools';
import api from '@/lib/api';

export default function WorkOrderToolsPage() {
  const params = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    loadWorkOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadWorkOrder = async () => {
    try {
      const res = await api.get(`/work-orders/${params.id}`);
      if (res.data?.status === 'success') {
        setWorkOrder(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load work order', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-xl p-4 text-white">
          <button
            onClick={() => router.push(`/planner/work-orders/${params.id}`)}
            className="mb-2 inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Work Order Details
          </button>
          <div>
            <h1 className="text-2xl font-bold">Tool Management</h1>
            <p className="text-purple-100">WO #{workOrder?.work_order_number || workOrder?.wo_number || params.id}</p>
          </div>
        </div>

        {workOrder && (
          <WorkOrderTools
            workOrderId={Number(params.id)}
            plantId={workOrder.plant_id || 1}
            userRole="planner"
            userId={currentUser?.id || 0}
          />
        )}
      </div>
    </div>
  );
}
