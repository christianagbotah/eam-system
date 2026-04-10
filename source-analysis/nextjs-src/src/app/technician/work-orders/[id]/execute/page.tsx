'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Wrench, Clock, Package, FileText, ArrowLeft, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import TimeTracker from '@/components/TimeTracker';
import CompletionReportForm from '@/components/CompletionReportForm';
import SearchableSelect from '@/components/SearchableSelect';
import { formatDateTime } from '@/lib/dateUtils';
import WorkOrderTools from '@/components/WorkOrderTools';

export default function ExecuteWorkOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [materials, setMaterials] = useState<any[]>([]);
  const [newMaterial, setNewMaterial] = useState({ part_id: '', quantity_used: 1, notes: '' });
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [showPlannedMaterialsModal, setShowPlannedMaterialsModal] = useState(false);
  const [plannedMaterials, setPlannedMaterials] = useState<any[]>([]);
  const [plannedTools, setPlannedTools] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    loadWorkOrder();
    loadMaterials();
    loadParts();
  }, [id]);

  useEffect(() => {
    if (workOrder) {
      setPlannedMaterials(workOrder.required_parts || []);
      setPlannedTools(workOrder.required_tools || []);
    }
  }, [workOrder]);

  const loadWorkOrder = async () => {
    try {
      const res = await api.get(`/work-orders/${id}`);
      const wo = res.data?.data;
      console.log('Execute Page - Work Order Data:', wo);
      console.log('Team Members:', wo?.team_members);
      console.log('Team Leader:', wo?.team_leader_name);
      setWorkOrder(wo);
    } catch (error) {
      alert.error('Error', 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async () => {
    try {
      const res = await api.get(`/maintenance/work-orders/${id}/materials-used`);
      const materialsData = res.data?.data?.materials || res.data?.data || [];
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
    } catch (error) {
      console.error('Failed to load materials');
      setMaterials([]);
    }
  };

  const loadParts = async () => {
    try {
      const res = await api.get('/parts');
      setAvailableParts(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load parts');
      setAvailableParts([]);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.part_id || newMaterial.quantity_used < 1) {
      alert.error('Required', 'Please select a part and quantity');
      return;
    }

    setIsAddingMaterial(true);
    try {
      await api.post(`/maintenance/work-orders/${id}/materials-used`, newMaterial);
      alert.success('Success', 'Material usage recorded');
      setNewMaterial({ part_id: '', quantity_used: 1, notes: '' });
      loadMaterials();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to record material');
    } finally {
      setIsAddingMaterial(false);
    }
  };

  const tabs = [
    { id: 'details', label: 'Work Order Details', icon: Wrench },
    { id: 'time', label: 'Time Tracking', icon: Clock },
    { id: 'materials', label: 'Materials Used', icon: Package },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'report', label: 'Completion Report', icon: FileText }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if work order is completed
  if (workOrder?.status === 'completed' || workOrder?.status === 'closed') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg border p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Work Order Completed</h1>
            <p className="text-sm text-gray-600 mb-4">
              This work order has been completed and submitted. No further edits are allowed.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <p className="text-xs text-gray-500">Work Order #</p>
                  <p className="text-sm font-semibold text-gray-900">{workOrder.work_order_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold text-green-600">{workOrder.status.toUpperCase()}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/technician/work-orders')}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Work Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <button
            onClick={() => router.back()}
            className="mb-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-5 h-5 text-gray-600" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{workOrder?.title || 'Work Order'}</h1>
                  <p className="text-xs text-gray-500">WO #{workOrder?.work_order_number}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Priority</p>
                  <p className="text-sm font-semibold text-gray-900">{workOrder?.priority?.toUpperCase()}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-semibold text-gray-900">{workOrder?.work_order_type?.toUpperCase()}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold text-gray-900">{workOrder?.status?.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Trade</p>
                  <p className="text-sm font-semibold text-gray-900">{workOrder?.trade_activity?.charAt(0).toUpperCase() + workOrder?.trade_activity?.slice(1)}</p>
                </div>
              </div>
            </div>
            
            {workOrder?.is_breakdown && (
              <div className="bg-red-500 text-white px-3 py-1.5 rounded text-sm font-semibold">
                🚨 BREAKDOWN
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[160px] px-4 py-2.5 text-sm font-medium transition inline-flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white border-b-2 border-blue-800'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-3">
            {activeTab === 'details' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 border-l-2 border-blue-500">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Work Order Information</h3>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Description</label>
                        <p className="text-xs text-gray-900">{workOrder?.description}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Technical Description</label>
                        <p className="text-xs text-gray-900">{workOrder?.technical_description}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Created</label>
                        <p className="text-xs text-gray-900">{formatDateTime(workOrder?.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 border-l-2 border-green-500">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Assignment Details</h3>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Assigned Team</label>
                        {workOrder?.team_members && workOrder.team_members.length > 0 ? (
                          <div className="mt-0.5 space-y-0.5">
                            {workOrder.team_members.map((member: any, idx: number) => (
                              <p key={idx} className="text-xs text-gray-900">• {member.name || member.technician_name}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No team assigned</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Team Leader</label>
                        <p className="text-xs text-gray-900">{workOrder?.team_leader_name || 'Not assigned'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Estimated Hours</label>
                        <p className="text-xs text-gray-900">{workOrder?.estimated_hours || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {workOrder?.safety_notes && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <h3 className="text-xs font-semibold text-amber-900 mb-0.5">⚠️ Safety Precautions</h3>
                        <p className="text-xs text-amber-800">{workOrder.safety_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'time' && <TimeTracker workOrderId={id as string} />}

            {activeTab === 'materials' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/technician/parts-request?work_order_id=${id}`)}
                    className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition inline-flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Request Materials
                  </button>
                  <button
                    onClick={() => setShowPlannedMaterialsModal(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-1"
                  >
                    <Package className="w-3.5 h-3.5" />
                    View Planned Materials & Tools
                  </button>
                </div>

                <div className="bg-white rounded-lg border p-3">
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Record Material Usage</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Select Part *</label>
                      <SearchableSelect
                        value={newMaterial.part_id}
                        onChange={(value) => setNewMaterial({...newMaterial, part_id: value})}
                        options={availableParts.map(part => ({
                          id: part.id,
                          label: `${part.part_name} (${part.part_number || part.part_code})`,
                          sublabel: part.category || part.part_category
                        }))}
                        placeholder="Search parts..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity Used *</label>
                      <input
                        type="number"
                        min="1"
                        value={newMaterial.quantity_used}
                        onChange={(e) => setNewMaterial({...newMaterial, quantity_used: parseInt(e.target.value) || 1})}
                        className="w-full h-[38px] px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={newMaterial.notes}
                        onChange={(e) => setNewMaterial({...newMaterial, notes: e.target.value})}
                        className="w-full h-[38px] px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional notes..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddMaterial}
                    disabled={isAddingMaterial}
                    className="mt-2 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    {isAddingMaterial ? 'Adding...' : 'Add Material'}
                  </button>
                </div>

                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="p-2 border-b bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-900">Materials Used</h3>
                  </div>
                  <div className="divide-y">
                    {!Array.isArray(materials) || materials.length === 0 ? (
                      <div className="p-6 text-center">
                        <Package className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                        <p className="text-xs text-gray-500">No materials recorded yet</p>
                      </div>
                    ) : (
                      materials.map((mat) => (
                        <div key={mat.id} className="p-2 hover:bg-gray-50 transition">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <h4 className="text-xs font-semibold text-gray-900">{mat.part_name}</h4>
                                {mat.is_issued ? (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">✓ Approved</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">⚠ Pending</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-600">Part #: {mat.part_number}</p>
                              {mat.notes && <p className="text-[10px] text-gray-500 mt-0.5">{mat.notes}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-purple-600">{mat.quantity_used}</p>
                              <p className="text-[10px] text-gray-500">units</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tools' && (
              <WorkOrderTools
                workOrderId={Number(id)}
                plantId={workOrder?.plant_id || 1}
                userRole="technician"
                userId={currentUser?.id || 0}
              />
            )}

            {activeTab === 'report' && <CompletionReportForm workOrderId={id as string} />}
          </div>
        </div>
      </div>

      {/* Planned Materials & Tools Modal */}
      {showPlannedMaterialsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-blue-600 p-4 text-white">
              <h2 className="text-lg font-semibold">📋 Planned Materials & Tools</h2>
              <p className="text-blue-100 text-xs">Review what the planner recommended</p>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-160px)] space-y-4">
              {/* Planned Materials */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-600" />
                  Planned Spare Parts
                </h3>
                {plannedMaterials.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No materials planned</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {plannedMaterials.map((part: any, idx: number) => (
                      <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-gray-900">{part.part_name || part.name || part.description}</h4>
                        <p className="text-xs text-gray-600">Part #: {part.part_number || part.part_code || part.gt_code}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Quantity Required</span>
                          <span className="text-base font-semibold text-purple-600">{parseInt(part.quantity_required || part.quantity || 0).toLocaleString()}</span>
                        </div>
                        {part.notes && <p className="text-xs text-gray-500 mt-1">{part.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Planned Tools */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Required Tools
                </h3>
                {plannedTools.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No tools specified</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {plannedTools.map((tool: any) => (
                      <div key={tool.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-gray-900">{tool.tool_name}</h4>
                        <p className="text-xs text-gray-600">Tool #: {tool.tool_number || tool.tool_code}</p>
                        {tool.notes && <p className="text-xs text-gray-500 mt-1">{tool.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="border-t p-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowPlannedMaterialsModal(false)}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
