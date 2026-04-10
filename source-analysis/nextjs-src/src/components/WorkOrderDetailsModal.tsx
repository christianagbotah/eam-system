'use client';

import { formatDateTime } from '@/lib/dateUtils';

interface WorkOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
}

export default function WorkOrderDetailsModal({ isOpen, onClose, workOrder }: WorkOrderDetailsModalProps) {
  if (!isOpen || !workOrder) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'planned': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const teamLeader = workOrder.team_members?.find((m: any) => m.is_leader === '1' || m.is_leader === 1 || m.role === 'leader') || 
                     (workOrder.team_leader_id ? { 
                       user_id: workOrder.team_leader_id, 
                       technician_id: workOrder.team_leader_id,
                       name: workOrder.team_leader_name,
                       skill_name: workOrder.team_leader_skill,
                       trade: workOrder.team_leader_skill,
                       is_leader: true 
                     } : null);
  
  const teamMembers = workOrder.team_members?.filter((m: any) => m.is_leader !== '1' && m.is_leader !== 1 && m.role !== 'leader') || [];

  console.log('Work Order Data:', workOrder);
  console.log('Team Leader:', teamLeader);
  console.log('Team Members:', teamMembers);
  console.log('All team_members array:', workOrder.team_members);
  console.log('Team member 0 details:', workOrder.team_members?.[0]);
  console.log('Team member 1 details:', workOrder.team_members?.[1]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-3xl">🔧</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold">Work Order #{workOrder.work_order_number || workOrder.id}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(workOrder.status)}`}>
                    {workOrder.status?.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getPriorityColor(workOrder.priority)}`}>
                    {workOrder.priority?.toUpperCase()} PRIORITY
                  </span>
                  {workOrder.is_breakdown && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white border-2 border-red-400">
                      🔴 BREAKDOWN
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content - 2 Column Layout: Left 40%, Right 60% */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 py-8 pb-12">
            {/* LEFT COLUMN - Work Order Info & Schedule (40% width - 2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Work Order Information */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📄</span>
                  <h3 className="text-lg font-bold text-blue-900">Work Order Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/70 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Work Type</p>
                    <p className="text-sm font-bold text-gray-900 capitalize mt-1">{workOrder.work_type || workOrder.type || 'N/A'}</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Trade Activity</p>
                    <p className="text-sm font-bold text-gray-900 capitalize mt-1">{workOrder.trade_activity || 'N/A'}</p>
                  </div>
                  {workOrder.estimated_hours && (
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Estimated Hours</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{workOrder.estimated_hours} hours</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule Information */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📅</span>
                  <h3 className="text-lg font-bold text-purple-900">Schedule</h3>
                </div>
                <div className="space-y-3">
                  {workOrder.created_at && (
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Created</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formatDateTime(workOrder.created_at)}</p>
                    </div>
                  )}
                  {workOrder.scheduled_date && (
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Scheduled</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formatDateTime(workOrder.scheduled_date)}</p>
                    </div>
                  )}
                  {workOrder.delivery_date_required && (
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Delivery Date</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formatDateTime(workOrder.delivery_date_required)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Asset Information */}
              {(workOrder.asset_name || workOrder.machine_name || workOrder.location) && (
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5 border-2 border-teal-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">⚡</span>
                    <h3 className="text-lg font-bold text-teal-900">Asset Details</h3>
                  </div>
                  <div className="space-y-3">
                    {(workOrder.asset_name || workOrder.machine_name) && (
                      <div className="bg-white/70 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Asset/Machine</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{workOrder.asset_name || workOrder.machine_name}</p>
                      </div>
                    )}
                    {workOrder.location && (
                      <div className="bg-white/70 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Location</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{workOrder.location}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Technical Description */}
              {workOrder.technical_description && (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border-2 border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📝</span>
                    <h3 className="text-lg font-bold text-slate-900">Technical Description</h3>
                  </div>
                  <p className="text-sm text-slate-800 bg-white/70 rounded-lg p-4 leading-relaxed">
                    {workOrder.technical_description}
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN - Team & Resources (60% width - 3 cols) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Team Leader */}
              {teamLeader && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border-2 border-amber-300">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🏆</span>
                    <h3 className="text-lg font-bold text-amber-900">Team Leader</h3>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-amber-300 shadow-sm">
                    <p className="text-lg font-bold text-gray-900 mb-3">{teamLeader.name || teamLeader.technician_name || 'Team Leader'}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {(teamLeader.name || teamLeader.technician_name || 'L')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Avatar</p>
                        </div>
                      </div>
                      {(teamLeader.skill_name || teamLeader.trade) && (
                        <div className="flex items-center gap-2 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
                          <span className="text-sm">💼</span>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Skill</p>
                            <p className="text-sm font-bold text-amber-800">{teamLeader.skill_name || teamLeader.trade}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members */}
              {teamMembers.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">👥</span>
                    <h3 className="text-lg font-bold text-green-900">Team Members ({teamMembers.length})</h3>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {teamMembers.map((member: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                        <p className="text-base font-bold text-gray-900 mb-3">{member.name || member.technician_name || `Technician ${idx + 1}`}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {(member.name || member.technician_name || `T${idx + 1}`)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Avatar</p>
                            </div>
                          </div>
                          {(member.skill_name || member.trade) && (
                            <div className="flex items-center gap-2 bg-green-50 rounded-md px-3 py-2 border border-green-200">
                              <span className="text-xs">💼</span>
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Skill</p>
                                <p className="text-xs font-bold text-green-800">{member.skill_name || member.trade}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supervisors */}
              {workOrder.supervisors?.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 border-2 border-indigo-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🛡️</span>
                    <h3 className="text-lg font-bold text-indigo-900">Supervisors</h3>
                  </div>
                  <div className="space-y-3">
                    {workOrder.supervisors.map((sup: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-indigo-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                            S
                          </div>
                          <p className="text-sm font-bold text-gray-900">{sup.name || sup.supervisor_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials Requested */}
              {workOrder.materials_requested?.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-5 border-2 border-cyan-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📦</span>
                    <h3 className="text-lg font-bold text-cyan-900">Materials Requested by Technician</h3>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {workOrder.materials_requested.map((material: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{material.material_name || material.part_name || material.name || 'Material'}</p>
                            {material.part_number && (
                              <p className="text-xs text-gray-600 font-mono">{material.part_number}</p>
                            )}
                          </div>
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded text-xs font-bold">
                            Qty: {material.quantity || 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Spare Parts (Planner) */}
              {workOrder.required_parts?.length > 0 && (
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-5 border-2 border-pink-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📦</span>
                    <h3 className="text-lg font-bold text-pink-900">Spare Parts</h3>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {workOrder.required_parts.map((part: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-pink-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{part.part_name || part.name}</p>
                            {part.part_number && (
                              <p className="text-xs text-gray-600 font-mono truncate">{part.part_number}</p>
                            )}
                            {part.category && (
                              <p className="text-xs text-pink-700 capitalize">{part.category}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Tools (Planner) */}
              {workOrder.required_tools?.length > 0 && (
                <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-5 border-2 border-violet-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🔧</span>
                    <h3 className="text-lg font-bold text-violet-900">Tools Required</h3>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {workOrder.required_tools.map((tool: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-violet-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{tool.tool_name || tool.name}</p>
                            {tool.category && (
                              <p className="text-xs text-violet-700 capitalize">{tool.category}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Precautions */}
              {workOrder.safety_notes && (
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border-2 border-red-300">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🛡️</span>
                    <h3 className="text-lg font-bold text-red-900">Safety Precautions</h3>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-sm text-red-900 leading-relaxed whitespace-pre-wrap">{workOrder.safety_notes}</p>
                  </div>
                </div>
              )}

              {/* PPE Required */}
              {workOrder.ppe_required && (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border-2 border-orange-300">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🦺</span>
                    <h3 className="text-lg font-bold text-orange-900">PPE Required</h3>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-sm text-orange-900 leading-relaxed whitespace-pre-wrap">{workOrder.ppe_required}</p>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {workOrder.notes && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border-2 border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📝</span>
                    <h3 className="text-lg font-bold text-gray-900">Additional Notes</h3>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{workOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 pb-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-bold shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
