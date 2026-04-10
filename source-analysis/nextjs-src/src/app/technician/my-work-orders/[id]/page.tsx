'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { ArrowLeft, Users, Shield, Package, Wrench, AlertTriangle, Clock, CheckCircle, FileText, User } from 'lucide-react';
import { formatDateTime } from '@/lib/dateUtils';
import WorkOrderTools from '@/components/WorkOrderTools';

export default function TechnicianWorkOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    loadWorkOrder();
  }, [params.id]);

  const loadWorkOrder = async () => {
    try {
      const res = await api.get(`/work-orders/${params.id}`);
      const wo = res.data?.data;
      setWorkOrder(wo);
    } catch (error) {
      alert.error('Error', 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = () => {
    router.push(`/technician/work-orders/${params.id}/execute`);
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
      <div className="p-6 text-center">
        <p className="text-gray-500">Work order not found</p>
      </div>
    );
  }

  const isTeamLeader = workOrder.team_leader_id && workOrder.team_leader_id == currentUser?.id;
  const teamMembers = workOrder.team_members || [];
  const requiredParts = workOrder.required_parts || [];
  const requiredTools = workOrder.required_tools || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow border p-4">
          <button
            onClick={() => router.back()}
            className="mb-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-gray-900">{workOrder.title || 'Work Order'}</h1>
                <span className="text-sm text-gray-500">WO #{workOrder.work_order_number}</span>
                {workOrder.is_breakdown && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-bold">
                    🚨 BREAKDOWN
                  </span>
                )}
              </div>
              
              <div className="flex gap-4 text-sm">
                <span><span className="text-gray-500">Priority:</span> <span className="font-medium">{workOrder.priority?.toUpperCase()}</span></span>
                <span><span className="text-gray-500">Type:</span> <span className="font-medium">{workOrder.work_order_type?.toUpperCase()}</span></span>
                <span><span className="text-gray-500">Status:</span> <span className="font-medium">{workOrder.status?.replace('_', ' ').toUpperCase()}</span></span>
                <span><span className="text-gray-500">Trade:</span> <span className="font-medium">{workOrder.trade_activity}</span></span>
              </div>
            </div>
          </div>
        </div>


        {/* Work Order Details */}
        <div className="bg-white rounded-lg shadow border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="text-sm font-bold text-gray-900">Work Order Details</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-xs font-medium text-gray-500">Machine/Asset</label>
                <p className="text-gray-900 font-medium">{workOrder.machine_name || workOrder.asset_name || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Location</label>
                <p className="text-gray-900">{workOrder.location || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Planned Start</label>
                <p className="text-gray-900">{workOrder.planned_start ? formatDateTime(workOrder.planned_start) : 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Estimated Hours</label>
                <p className="text-lg font-bold text-blue-600">{workOrder.estimated_hours || 0}h</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{workOrder.description || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500">Technical Description</label>
                <p className="text-gray-900">{workOrder.technical_description || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Assignment */}
        <div className="bg-white rounded-lg shadow border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="text-sm font-bold text-gray-900">Team Assignment</h2>
          </div>
          <div className="p-4">
            {isTeamLeader && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="text-sm font-bold text-amber-900">👤 You are the Team Leader</p>
              </div>
            )}
            
            {teamMembers.length > 0 ? (
              <div className="space-y-2">
                {teamMembers.map((member: any, index: number) => {
                  const isMemberLeader = workOrder.team_leader_id && (member.technician_id == workOrder.team_leader_id || member.user_id == workOrder.team_leader_id);
                  return (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded border text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{member.name || member.technician_name}</p>
                      {member.skill_name && <p className="text-xs text-gray-500">{member.skill_name}</p>}
                    </div>
                    {isMemberLeader && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">LEADER</span>}
                  </div>
                );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No team members assigned</p>
            )}
          </div>
        </div>

        {/* Safety Information */}
        {(workOrder.safety_notes || workOrder.ppe_required) && (
          <div className="bg-white rounded-lg shadow border">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h2 className="text-sm font-bold text-gray-900">Safety Information</h2>
            </div>
            <div className="p-4 space-y-3">
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

        {/* Required Materials & Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow border">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h2 className="text-sm font-bold text-gray-900">Required Spare Parts</h2>
            </div>
            <div className="p-4">
              {requiredParts.length > 0 ? (
                <div className="space-y-2">
                  {requiredParts.map((part: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{part.part_name}</p>
                        <p className="text-xs text-gray-500">#{part.part_number || part.part_code}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-bold">Qty: {part.quantity_required || part.quantity || 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No parts required</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h2 className="text-sm font-bold text-gray-900">Required Tools</h2>
            </div>
            <div className="p-4">
              {requiredTools.length > 0 ? (
                <div className="space-y-2">
                  {requiredTools.map((tool: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-sm">
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
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No tools specified</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        {workOrder.notes && (
          <div className="bg-white rounded-lg shadow border">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h2 className="text-sm font-bold text-gray-900">Additional Notes</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-900">{workOrder.notes}</p>
            </div>
          </div>
        )}

        {/* Execute Button */}
        {workOrder.status !== 'completed' && workOrder.status !== 'closed' && (
          <button
            onClick={handleExecute}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow text-base inline-flex items-center justify-center gap-2"
          >
            <Clock className="w-5 h-5" />
            {workOrder.status === 'in_progress' ? 'Resume Work Execution' : 'Start Work Execution'}
          </button>
        )}

        {/* Completed Badge */}
        {(workOrder.status === 'completed' || workOrder.status === 'closed') && (
          <div className="bg-white rounded-lg shadow border p-4">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-lg font-bold text-green-600">Work Order Completed</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
