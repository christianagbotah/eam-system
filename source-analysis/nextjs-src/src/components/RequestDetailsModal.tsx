'use client';

import { useState, useEffect } from 'react';
import FormModal from '@/components/ui/FormModal';
import WorkflowTimeline from '@/components/WorkflowTimeline';
import WorkOrderDetailsModal from '@/components/WorkOrderDetailsModal';
import { formatDateTime } from '@/lib/dateUtils';
import api from '@/lib/api';
import { Eye } from 'lucide-react';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  getStatusColor: (status: string) => string;
}

export default function RequestDetailsModal({ isOpen, onClose, request, getStatusColor }: RequestDetailsModalProps) {
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loadingWO, setLoadingWO] = useState(false);

  useEffect(() => {
    if (isOpen && request?.work_order_id) {
      loadWorkOrder();
    }
  }, [isOpen, request]);

  const loadWorkOrder = async () => {
    if (!request?.work_order_id) return;
    setLoadingWO(true);
    try {
      // Ensure we have a valid token before making the request
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
        return;
      }
      
      const response = await api.get(`/work-orders/${request.work_order_id}`);
      console.log('Work Order Full Response:', response.data);
      console.log('Work Order Data:', response.data?.data);
      setWorkOrder(response.data?.data);
    } catch (error: any) {
      console.error('Error loading work order:', error);
      if (error.response?.status === 401) {
        console.error('Authentication failed - token may be invalid');
      }
    } finally {
      setLoadingWO(false);
    }
  };

  if (!request) return null;

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Request Details" size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Workflow Timeline - Left Side (1/3 width on desktop) - Non-scrollable */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <h3 className="font-bold text-gray-600 mb-2 uppercase" style={{ fontSize: '0.6875rem' }}>Workflow</h3>
            <WorkflowTimeline 
              currentStatus={request.workflow_status || 'pending'} 
              isRejected={request.workflow_status === 'rejected'}
            />
          </div>
        </div>

        {/* All Details - Right Side (2/3 width on desktop) - Scrollable */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto max-h-[75vh] pr-2">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-3 hover:border-blue-400 transition-colors">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Request #</label>
              <p className="text-base font-bold text-gray-900">{request.request_number || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg border-2 border-gray-200 p-3 hover:border-blue-400 transition-colors">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status || 'pending')}`}>
                {(request.status || 'pending').replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Machine Status */}
          {request.item_type === 'machine' && request.machine_down_status && (
            <div className="bg-white rounded-lg border-2 border-gray-200 p-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Machine Status</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${
                request.machine_down_status === 'Yes' 
                  ? 'bg-red-100 text-red-800 border-red-200' 
                  : 'bg-green-100 text-green-800 border-green-200'
              }`}>
                {request.machine_down_status === 'Yes' ? '🔴 CRITICAL' : '✅ NORMAL'}
              </span>
            </div>
          )}

          {/* Asset/Machine Details */}
          {request.item_type === 'machine' && request.machine_name && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border-l-4 border-blue-500">
              <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Asset Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Machine</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{request.machine_name}</p>
                </div>
                {request.location && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Location</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{request.location}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {request.item_type === 'manual' && request.asset_name && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border-l-4 border-blue-500">
              <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Asset Information</h3>
              <p className="text-sm font-bold text-gray-900">{request.asset_name}</p>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-lg p-3 border-2 border-gray-200">
            <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Description</h3>
            <p className="text-sm text-gray-800 leading-relaxed">{request.title || request.description || 'N/A'}</p>
          </div>

          {/* Request Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wide block mb-1">Requested By</label>
              <p className="text-sm font-semibold text-gray-900">{request.requested_by_name || 'N/A'}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wide block mb-1">Date</label>
              <p className="text-sm font-semibold text-gray-900">
                {request.requested_date ? formatDateTime(request.requested_date) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">Created</label>
              <p className="text-sm font-semibold text-gray-900">
                {request.created_at ? formatDateTime(request.created_at) : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">Updated</label>
              <p className="text-sm font-semibold text-gray-900">
                {request.updated_at ? formatDateTime(request.updated_at) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Supervisor Notes */}
          {request.review_notes && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border-l-4 border-orange-400">
              <h3 className="text-xs font-bold text-orange-800 mb-2 uppercase tracking-wide">⚠️ Supervisor Instructions</h3>
              <p className="text-sm text-gray-900 font-medium leading-relaxed">{request.review_notes}</p>
            </div>
          )}

          {/* Notes */}
          {request.notes && (
            <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-400">
              <h3 className="text-xs font-bold text-yellow-800 mb-2 uppercase tracking-wide">📝 Notes</h3>
              <p className="text-sm text-gray-800 leading-relaxed">{request.notes}</p>
            </div>
          )}

          {/* Work Order Link */}
          {request.work_order_id && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-purple-900 mb-1">Work Order Created</h3>
                  <p className="text-xs text-purple-700">
                    WO #{workOrder?.work_order_number || request.work_order_number || request.work_order_id}
                  </p>
                </div>
                <button
                  onClick={() => setShowWorkOrderModal(true)}
                  disabled={loadingWO}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold inline-flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {loadingWO ? 'Loading...' : 'View Details'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
        >
          Close
        </button>
      </div>

      <WorkOrderDetailsModal
        isOpen={showWorkOrderModal}
        onClose={() => setShowWorkOrderModal(false)}
        workOrder={workOrder}
      />
    </FormModal>
  );
}
