'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Wrench, Clock, User, Package, FileText, CheckCircle, ArrowLeft, AlertCircle, History, Paperclip, DollarSign, TrendingUp, UserPlus, Calendar, MapPin, Building2, Users, Timer, Hammer } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import WorkOrderEditForm from '@/components/WorkOrderEditForm';
import AssignWorkOrderModal from '@/components/AssignWorkOrderModal';
import WorkOrderToolsTab from '@/components/WorkOrderToolsTab';

export default function WorkOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [slaStatus, setSlaStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showToolsTab, setShowToolsTab] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadData = async () => {
    try {
      const woRes = await api.get(`/work-orders/${params.id}`);
      
      if (woRes.data?.status === 'success') {
        const wo = woRes.data.data;
        setWorkOrder(wo);
        setMaterials(wo.required_parts || []);
      } else {
        alert.error('Error', 'Failed to load work order');
      }
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Work order not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      closed: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-xl p-4 text-white">
          <button
            onClick={() => router.back()}
            className="mb-2 inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Work Orders
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-1">{workOrder.title}</h1>
              <p className="text-purple-100">WO #{workOrder.work_order_number || workOrder.wo_number}</p>
            </div>
            <div className="flex gap-2">
              {currentUser?.role !== 'technician' && (
                <button
                  onClick={() => setShowToolsTab(!showToolsTab)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium inline-flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  {showToolsTab ? 'Hide Tools' : 'Show Tools'}
                </button>
              )}
              {(workOrder.status === 'open' || workOrder.status === 'draft') && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium inline-flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 font-medium"
              >
                Edit
              </button>
              <span className={`px-4 py-2 rounded-lg font-bold ${getStatusColor(workOrder.status)} shadow-lg`}>
                {workOrder.status?.toUpperCase().replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {showToolsTab && currentUser?.role !== 'technician' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <WorkOrderToolsTab workOrderId={parseInt(params.id as string)} userRole={currentUser?.role || 'planner'} />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Work Order Information */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Work Order Information
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Asset/Machine</label>
                    <p className="text-gray-900 font-medium mt-1">{workOrder.asset_name || 'N/A'}</p>
                    {workOrder.asset_location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {workOrder.asset_location}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                    <p className="text-gray-900 font-medium mt-1 capitalize">{workOrder.type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</label>
                    <span className={`inline-block px-3 py-1 text-xs rounded-full font-semibold mt-1 ${
                      workOrder.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      workOrder.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      workOrder.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {workOrder.priority?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                    <span className={`inline-block px-3 py-1 text-xs rounded-full font-semibold mt-1 ${getStatusColor(workOrder.status)}`}>
                      {workOrder.status?.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  {workOrder.department_name && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
                      <p className="text-gray-900 font-medium mt-1 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {workOrder.department_name}
                      </p>
                    </div>
                  )}
                  {workOrder.request_id && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created From</label>
                      <p className="text-gray-900 font-medium mt-1">Request #{workOrder.request_id}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                    <p className="text-gray-700 mt-2 leading-relaxed">{workOrder.description || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Team & Assignments */}
              {(workOrder.team_members?.length > 0 || workOrder.team_leader_name) && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Team & Assignments
                  </h2>
                  {workOrder.team_leader_name && (
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                      <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Team Leader</label>
                      <p className="text-gray-900 font-medium mt-1">{workOrder.team_leader_name}</p>
                    </div>
                  )}
                  {workOrder.team_members?.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Team Members</label>
                      <div className="space-y-2">
                        {workOrder.team_members.map((member: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{member.name}</p>
                              {member.skill_name && (
                                <p className="text-xs text-gray-500">{member.skill_name}</p>
                              )}
                            </div>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                              {member.role || 'Member'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scheduling & Time Tracking */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Scheduling & Time Tracking
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  {workOrder.planned_start && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Planned Start</label>
                      <p className="text-gray-900 mt-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDateTime(workOrder.planned_start)}
                      </p>
                    </div>
                  )}
                  {workOrder.planned_end && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Planned End</label>
                      <p className="text-gray-900 mt-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDateTime(workOrder.planned_end)}
                      </p>
                    </div>
                  )}
                  {workOrder.actual_start && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actual Start</label>
                      <p className="text-gray-900 mt-1">{formatDateTime(workOrder.actual_start)}</p>
                    </div>
                  )}
                  {workOrder.actual_end && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actual End</label>
                      <p className="text-gray-900 mt-1">{formatDateTime(workOrder.actual_end)}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estimated Hours</label>
                    <p className="text-gray-900 font-medium mt-1 flex items-center gap-1">
                      <Timer className="w-4 h-4 text-gray-400" />
                      {workOrder.estimated_hours || 0}h
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actual Hours</label>
                    <p className="text-gray-900 font-medium mt-1 flex items-center gap-1">
                      <Timer className="w-4 h-4 text-gray-400" />
                      {workOrder.actual_hours || 0}h
                    </p>
                  </div>
                </div>
                {workOrder.time_logs?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Time Logs</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {workOrder.time_logs.map((log: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{log.technician_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(log.start_time)} → {formatDateTime(log.end_time)}
                            </p>
                          </div>
                          <span className="font-bold text-purple-600">{log.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Materials & Parts */}
              {materials.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Materials & Parts ({materials.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Part</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Part Number</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty Required</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {materials.map((mat: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900 font-medium">{mat.part_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-gray-600">{mat.part_number || 'N/A'}</td>
                            <td className="px-4 py-3 text-right text-gray-900">{mat.quantity_required || mat.quantity || 0}</td>
                            <td className="px-4 py-3 text-right text-gray-900">${parseFloat(mat.unit_cost || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-purple-600">
                              ${(parseFloat(mat.unit_cost || 0) * (mat.quantity_required || mat.quantity || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900">Total Cost:</td>
                          <td className="px-4 py-3 text-right font-bold text-purple-600">
                            ${materials.reduce((sum: number, mat: any) => 
                              sum + (parseFloat(mat.unit_cost || 0) * (mat.quantity_required || mat.quantity || 0)), 0
                            ).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Required Tools */}
              {workOrder.required_tools?.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                    <Hammer className="w-5 h-5 text-purple-600" />
                    Required Tools ({workOrder.required_tools.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workOrder.required_tools.map((tool: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{tool.tool_name}</p>
                          <p className="text-xs text-gray-500">{tool.category}</p>
                        </div>
                        <span className="text-sm font-bold text-purple-600">Qty: {tool.quantity || 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg p-6 border border-purple-100">
                <h3 className="text-base font-bold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-purple-100">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-sm font-medium text-gray-900">
                      {workOrder.created_at ? formatDate(workOrder.created_at) : 'N/A'}
                    </span>
                  </div>
                  {workOrder.updated_at && (
                    <div className="flex justify-between items-center pb-3 border-b border-purple-100">
                      <span className="text-sm text-gray-600">Last Updated</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(workOrder.updated_at)}
                      </span>
                    </div>
                  )}
                  {workOrder.created_by_name && (
                    <div className="flex justify-between items-center pb-3 border-b border-purple-100">
                      <span className="text-sm text-gray-600">Created By</span>
                      <span className="text-sm font-medium text-gray-900">
                        {workOrder.created_by_name}
                      </span>
                    </div>
                  )}
                  {workOrder.approved_by_name && (
                    <div className="flex justify-between items-center pb-3 border-b border-purple-100">
                      <span className="text-sm text-gray-600">Approved By</span>
                      <span className="text-sm font-medium text-gray-900">
                        {workOrder.approved_by_name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Plant ID</span>
                    <span className="text-sm font-medium text-gray-900">
                      {workOrder.plant_id || 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-purple-600" />
                    Attachments ({attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {attachments.map((att: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate font-medium">{att.file_name || att.original_name}</p>
                          {att.uploaded_at && (
                            <p className="text-xs text-gray-500">{formatDate(att.uploaded_at)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" />
                    Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {history.slice(0, 8).map((log: any, idx: number) => (
                      <div key={idx} className="flex gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          {log.user_name && (
                            <p className="text-xs text-gray-500">by {log.user_name}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{formatDateTime(log.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showEditModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 flex justify-between items-center rounded-t-xl">
                <h2 className="text-lg font-bold">Edit WO #{workOrder.work_order_number}</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-3 max-h-[calc(100vh-120px)] overflow-y-auto">
                <WorkOrderEditForm
                  workOrderId={params.id}
                  onSuccess={() => {
                    setShowEditModal(false);
                    loadData();
                  }}
                  onCancel={() => setShowEditModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {showAssignModal && (
          <AssignWorkOrderModal
            workOrderId={params.id as string}
            onSuccess={() => {
              setShowAssignModal(false);
              loadData();
            }}
            onCancel={() => setShowAssignModal(false)}
          />
        )}
      </div>
    </div>
  );
}
