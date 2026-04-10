'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionSection } from '@/components/guards/PermissionSection';
import StatusBadge from '@/components/work-orders/StatusBadge';
import { showToast } from '@/lib/toast';
import { formatDateTime } from '@/lib/dateUtils';
import { ArrowLeft, Edit, Users, Package, Clock, FileText, Wrench, AlertTriangle, CheckCircle, Calendar, MapPin, Building2, Timer, Hammer, Paperclip, History } from 'lucide-react';

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchWorkOrder();
    }
  }, [params.id]);

  const fetchWorkOrder = async () => {
    try {
      const response = await api.get(`/work-orders/${params.id}`);
      setWorkOrder(response.data?.data || response.data);
    } catch (error) {
      showToast.error('Failed to fetch work order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action: string) => {
    const loadingToast = showToast.loading('Updating status...');
    try {
      await api.post(`/work-orders/${params.id}/${action}`);
      showToast.dismiss(loadingToast);
      showToast.success('Status updated successfully');
      fetchWorkOrder();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to update status');
    }
  };

  const handleAssign = async (technicianId: number) => {
    const loadingToast = showToast.loading('Assigning technician...');
    try {
      await api.post(`/work-orders/${params.id}/assign`, { assigned_user_id: technicianId });
      showToast.dismiss(loadingToast);
      showToast.success('Technician assigned successfully');
      setShowAssignModal(false);
      fetchWorkOrder();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to assign technician');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Work Order Not Found</h2>
        <button onClick={() => router.back()} className="text-blue-600 hover:underline">
          ← Back to Work Orders
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4">
          <button onClick={() => router.back()} className="mb-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{workOrder.title}</h1>
                <span className="text-sm text-gray-500">WO #{workOrder.wo_number || workOrder.work_order_number}</span>
                {workOrder.is_breakdown && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-bold">🚨 BREAKDOWN</span>
                )}
              </div>
              <div className="flex gap-4 text-sm flex-wrap">
                <span><span className="text-gray-500">Priority:</span> <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(workOrder.priority)}`}>{workOrder.priority?.toUpperCase()}</span></span>
                <span><span className="text-gray-500">Type:</span> <span className="font-medium">{workOrder.type || workOrder.work_order_type}</span></span>
                <span><span className="text-gray-500">Status:</span> <StatusBadge status={workOrder.status} /></span>
              </div>
            </div>
            <PermissionSection permissions={['work_orders.update']}>
              <button onClick={() => setShowEditModal(true)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2">
                <Edit className="w-4 h-4" /> Edit
              </button>
            </PermissionSection>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Work Order Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Work Order Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Asset/Machine</label>
                  <p className="text-gray-900 font-medium mt-1">{workOrder.asset_name || workOrder.machine_name || 'N/A'}</p>
                  {workOrder.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {workOrder.location}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                  <p className="text-gray-900 font-medium mt-1 capitalize">{workOrder.type || workOrder.work_order_type || 'N/A'}</p>
                </div>
                {workOrder.department_name && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Department</label>
                    <p className="text-gray-900 font-medium mt-1 flex items-center gap-1">
                      <Building2 className="w-4 h-4 text-gray-400" /> {workOrder.department_name}
                    </p>
                  </div>
                )}
                {workOrder.trade_activity && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Trade</label>
                    <p className="text-gray-900 font-medium mt-1">{workOrder.trade_activity}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                  <p className="text-gray-700 mt-2">{workOrder.description || 'N/A'}</p>
                </div>
                {workOrder.technical_description && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase">Technical Description</label>
                    <p className="text-gray-700 mt-2">{workOrder.technical_description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Assignment */}
            {(workOrder.team_members?.length > 0 || workOrder.team_leader_name) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> Team Assignment
                </h2>
                {workOrder.team_leader_name && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <label className="text-xs font-semibold text-blue-700 uppercase">Team Leader</label>
                    <p className="text-gray-900 font-medium mt-1">{workOrder.team_leader_name}</p>
                  </div>
                )}
                {workOrder.team_members?.length > 0 && (
                  <div className="space-y-2">
                    {workOrder.team_members.map((member: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{member.name || member.technician_name}</p>
                          {member.skill_name && <p className="text-xs text-gray-500">{member.skill_name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Safety Information */}
            {(workOrder.safety_notes || workOrder.ppe_required) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" /> Safety Information
                </h2>
                <div className="space-y-3">
                  {workOrder.safety_notes && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <h3 className="text-sm font-bold text-red-900 mb-1">⚠️ Safety Precautions</h3>
                      <p className="text-sm text-red-800">{workOrder.safety_notes}</p>
                    </div>
                  )}
                  {workOrder.ppe_required && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                      <h3 className="text-sm font-bold text-orange-900 mb-1">🦺 Required PPE</h3>
                      <p className="text-sm text-orange-800">{workOrder.ppe_required}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scheduling & Time */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" /> Scheduling & Time Tracking
              </h2>
              <div className="grid grid-cols-2 gap-6">
                {workOrder.planned_start && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Planned Start</label>
                    <p className="text-gray-900 mt-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" /> {formatDateTime(workOrder.planned_start)}
                    </p>
                  </div>
                )}
                {workOrder.planned_end && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Planned End</label>
                    <p className="text-gray-900 mt-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" /> {formatDateTime(workOrder.planned_end)}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Estimated Hours</label>
                  <p className="text-gray-900 font-medium mt-1 flex items-center gap-1">
                    <Timer className="w-4 h-4 text-gray-400" /> {workOrder.estimated_hours || 0}h
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Actual Hours</label>
                  <p className="text-gray-900 font-medium mt-1 flex items-center gap-1">
                    <Timer className="w-4 h-4 text-gray-400" /> {workOrder.actual_hours || 0}h
                  </p>
                </div>
              </div>
            </div>

            {/* Materials & Parts */}
            {(workOrder.required_parts?.length > 0 || workOrder.materials?.length > 0) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> Required Materials & Parts
                </h2>
                <div className="space-y-2">
                  {(workOrder.required_parts || workOrder.materials || []).map((part: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{part.part_name}</p>
                        <p className="text-xs text-gray-500">#{part.part_number || part.part_code || 'N/A'}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                        Qty: {part.quantity_required || part.quantity || 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Tools */}
            {workOrder.required_tools?.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Hammer className="w-5 h-5 text-blue-600" /> Required Tools
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workOrder.required_tools.map((tool: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{tool.tool_name}</p>
                        {tool.category && <p className="text-xs text-gray-500">{tool.category}</p>}
                      </div>
                      {tool.quantity && tool.quantity > 1 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">Qty: {tool.quantity}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <PermissionSection permissions={['work_orders.start', 'work_orders.complete', 'work_orders.assign']}>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="space-y-3">
                  <PermissionSection permissions={['work_orders.start']}>
                    {workOrder.status === 'assigned' && (
                      <button onClick={() => handleStatusChange('start')} className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
                        Start Work
                      </button>
                    )}
                  </PermissionSection>
                  <PermissionSection permissions={['work_orders.complete']}>
                    {workOrder.status === 'in_progress' && (
                      <button onClick={() => handleStatusChange('complete')} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                        Complete Work
                      </button>
                    )}
                  </PermissionSection>
                  <PermissionSection permissions={['work_orders.assign']}>
                    {!workOrder.assigned_to && (
                      <button onClick={() => setShowAssignModal(true)} className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700">
                        Assign Technician
                      </button>
                    )}
                  </PermissionSection>
                </div>
              </div>
            </PermissionSection>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm font-medium text-gray-900">
                    {workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                {workOrder.assigned_to && (
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm text-gray-600">Assigned To</span>
                    <span className="text-sm font-medium text-gray-900">{workOrder.assigned_to}</span>
                  </div>
                )}
                {workOrder.created_by_name && (
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm text-gray-600">Created By</span>
                    <span className="text-sm font-medium text-gray-900">{workOrder.created_by_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
