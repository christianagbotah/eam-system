'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import StatusBadge from '@/components/work-orders/StatusBadge';
import MaterialsCard from '@/components/work-orders/MaterialsCard';
import AttachmentsCard from '@/components/work-orders/AttachmentsCard';
import WorkOrderTimeline from '@/components/work-orders/WorkOrderTimeline';
import AssignTechnicianModal from '@/components/work-orders/AssignTechnicianModal';
import Modal from '@/components/Modal';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function WorkOrderDetailsPage() {
  const params = useParams();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [assets, setAssets] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([{ part_name: '', quantity: '', unit_cost: '' }]);
  const [activeTab, setActiveTab] = useState('general');

  useKeyboardShortcuts({ onClose: () => { setShowAssignModal(false); setShowEditModal(false); } });

  useEffect(() => {
    if (params.id) {
      fetchWorkOrder();
      fetchDropdownData();
    }
  }, [params.id]);

  const fetchDropdownData = async () => {
    try {
      const [assetsRes, deptsRes, usersRes] = await Promise.all([
        api.get('/assets'),
        api.get('/departments'),
        api.get('/users')
      ]);
      setAssets(assetsRes.data.data || assetsRes.data || []);
      setDepartments(deptsRes.data.data || deptsRes.data || []);
      setUsers(usersRes.data.data || usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  const fetchWorkOrder = async () => {
    try {
      const response = await api.get(`/work-orders/${params.id}`);
      console.log('Work Order API Response:', response.data);
      setWorkOrder((response.data as any)?.data || response.data);
    } catch (error) {
      showToast.error('Failed to fetch work order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const loadingToast = showToast.loading('Updating status...');
    try {
      await api.post(`/work-orders/${params.id}/${newStatus}`, formData);
      showToast.dismiss(loadingToast);
      showToast.success('Status updated');
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
      showToast.success('Technician assigned');
      setShowAssignModal(false);
      fetchWorkOrder();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to assign technician');
    }
  };

  const handleEdit = () => {
    setEditData({
      title: workOrder.title || '',
      description: workOrder.description || '',
      priority: workOrder.priority || 'medium',
      type: workOrder.type || 'corrective',
      status: workOrder.status || 'open',
      asset_id: workOrder.asset_id || '',
      department_id: workOrder.department_id || '',
      assigned_to: workOrder.assigned_to || '',
      planned_start: workOrder.planned_start?.slice(0, 16) || '',
      planned_end: workOrder.planned_end?.slice(0, 16) || '',
      estimated_hours: workOrder.estimated_hours || '',
      estimated_cost: workOrder.estimated_cost || '',
      failure_code: workOrder.failure_code || '',
      work_instructions: workOrder.work_instructions || '',
      safety_notes: workOrder.safety_notes || ''
    });
    setMaterials(workOrder.materials?.length > 0 ? workOrder.materials : [{ part_name: '', quantity: '', unit_cost: '' }]);
    setActiveTab('general');
    setShowEditModal(true);
  };

  const handleUpdateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Updating work order...');
    try {
      const payload = {
        ...editData,
        materials: materials.filter(m => m.part_name && m.quantity)
      };
      await api.put(`/work-orders/${params.id}`, payload);
      showToast.dismiss(loadingToast);
      showToast.success('Work order updated successfully');
      setShowEditModal(false);
      fetchWorkOrder();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to update work order');
    }
  };

  const addMaterial = () => setMaterials([...materials, { part_name: '', quantity: '', unit_cost: '' }]);
  const removeMaterial = (index: number) => setMaterials(materials.filter((_, i) => i !== index));
  const updateMaterial = (index: number, field: string, value: string) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  if (loading) return <CardSkeleton count={6} />;

  if (!workOrder) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Work Order Not Found</h2>
        <Link href="/admin/work-orders" className="text-blue-600 hover:underline">
          ← Back to Work Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{workOrder.title}</h1>
          <p className="text-gray-600">WO #{workOrder.wo_number || params.id}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleEdit}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <Link
            href="/admin/work-orders"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Order Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Work Order Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <StatusBadge status={workOrder.status || 'open'} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Asset</label>
                    <p className="text-gray-800">{workOrder.asset_name || workOrder.asset || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <p className="text-gray-800 capitalize">{workOrder.type || workOrder.work_order_type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Priority</label>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium capitalize ${
                      (workOrder.priority || 'medium').toLowerCase() === 'critical' ? 'bg-red-100 text-red-800' :
                      (workOrder.priority || 'medium').toLowerCase() === 'high' ? 'bg-orange-100 text-orange-800' :
                      (workOrder.priority || 'medium').toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {workOrder.priority || 'medium'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Assignment & Timing</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Assigned To</label>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-gray-800">{workOrder.assigned_to || 'Unassigned'}</p>
                      {!workOrder.assigned_to && (
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estimated Hours</label>
                    <p className="text-gray-800">{workOrder.estimated_hours || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Planned Start</label>
                    <p className="text-gray-800">
                      {workOrder.planned_start ? formatDateTime(workOrder.planned_start) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Actual Hours</label>
                    <p className="text-gray-800">{workOrder.actual_hours || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {workOrder.description && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-gray-800 mt-1">{workOrder.description}</p>
              </div>
            )}
          </div>

          {/* Materials */}
          <MaterialsCard workOrderId={params.id as string} />

          {/* Attachments */}
          <AttachmentsCard workOrderId={params.id as string} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="space-y-3">
              {workOrder.status === 'assigned' && (
                <button
                  onClick={() => handleStatusChange('start')}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Start Work
                </button>
              )}
              {workOrder.status === 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('complete')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Complete Work
                </button>
              )}
              {!workOrder.assigned_to && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700"
                >
                  Assign Technician
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <WorkOrderTimeline workOrderId={params.id as string} />
        </div>
      </div>

      {/* Assign Technician Modal */}
      <AssignTechnicianModal
        isOpen={showAssignModal}
        workOrderId={Number(params.id?.toString().replace(/\D/g, '')) || 0}
        onAssign={handleAssign}
        onClose={() => setShowAssignModal(false)}
      />

      {/* Edit Work Order Modal - Enterprise Grade */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Work Order</h2>
                <p className="text-blue-100 text-sm mt-1">WO #{workOrder.wo_number || params.id}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-white/80 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex space-x-1 px-6">
                {['general', 'asset', 'scheduling', 'materials', 'notes'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleUpdateWorkOrder} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                      <input
                        type="text"
                        value={editData.title || ''}
                        onChange={(e) => setEditData({...editData, title: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={editData.description || ''}
                        onChange={(e) => setEditData({...editData, description: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Priority *</label>
                        <select
                          value={editData.priority || 'medium'}
                          onChange={(e) => setEditData({...editData, priority: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
                        <select
                          value={editData.type || 'corrective'}
                          onChange={(e) => setEditData({...editData, type: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="breakdown">Breakdown</option>
                          <option value="preventive">Preventive</option>
                          <option value="corrective">Corrective</option>
                          <option value="inspection">Inspection</option>
                          <option value="project">Project</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                        <select
                          value={editData.status || 'open'}
                          onChange={(e) => setEditData({...editData, status: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="assigned">Assigned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="on_hold">On Hold</option>
                          <option value="completed">Completed</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Failure Code</label>
                      <input
                        type="text"
                        value={editData.failure_code || ''}
                        onChange={(e) => setEditData({...editData, failure_code: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., MECH-001, ELEC-045"
                      />
                    </div>
                  </div>
                )}

                {/* Asset Tab */}
                {activeTab === 'asset' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Asset / Machine *</label>
                      <select
                        value={editData.asset_id || ''}
                        onChange={(e) => setEditData({...editData, asset_id: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Asset</option>
                        {assets.map(asset => (
                          <option key={asset.id} value={asset.id}>
                            {asset.name} - {asset.asset_tag || asset.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Department *</label>
                      <select
                        value={editData.department_id || ''}
                        onChange={(e) => setEditData({...editData, department_id: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Technician</label>
                      <select
                        value={editData.assigned_to || ''}
                        onChange={(e) => setEditData({...editData, assigned_to: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Unassigned</option>
                        {users.filter(u => u.role === 'technician').map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Scheduling Tab */}
                {activeTab === 'scheduling' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Planned Start</label>
                        <input
                          type="datetime-local"
                          value={editData.planned_start || ''}
                          onChange={(e) => setEditData({...editData, planned_start: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Planned End</label>
                        <input
                          type="datetime-local"
                          value={editData.planned_end || ''}
                          onChange={(e) => setEditData({...editData, planned_end: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editData.estimated_hours || ''}
                          onChange={(e) => setEditData({...editData, estimated_hours: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                          placeholder="0.0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Cost ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editData.estimated_cost || ''}
                          onChange={(e) => setEditData({...editData, estimated_cost: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Materials Tab */}
                {activeTab === 'materials' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-gray-700">Required Materials & Parts</h3>
                      <button
                        type="button"
                        onClick={addMaterial}
                        className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        + Add Material
                      </button>
                    </div>
                    <div className="space-y-3">
                      {materials.map((material, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={material.part_name}
                              onChange={(e) => updateMaterial(index, 'part_name', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="Part Name / Code"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="Qty"
                            />
                          </div>
                          <div className="w-28">
                            <input
                              type="number"
                              step="0.01"
                              value={material.unit_cost}
                              onChange={(e) => updateMaterial(index, 'unit_cost', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="Unit $"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMaterial(index)}
                            className="text-red-600 hover:text-red-800 p-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Total Estimated Material Cost:</strong> $
                        {materials.reduce((sum, m) => sum + (parseFloat(m.quantity || '0') * parseFloat(m.unit_cost || '0')), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Work Instructions</label>
                      <textarea
                        value={editData.work_instructions || ''}
                        onChange={(e) => setEditData({...editData, work_instructions: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                        rows={5}
                        placeholder="Step-by-step instructions for completing this work order..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Safety Notes</label>
                      <textarea
                        value={editData.safety_notes || ''}
                        onChange={(e) => setEditData({...editData, safety_notes: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 border-orange-300"
                        rows={4}
                        placeholder="Safety precautions, PPE requirements, lockout/tagout procedures..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">* Required fields</p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg"
                  >
                    Update Work Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}