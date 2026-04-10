'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import MultiSelectTags from '@/components/MultiSelectTags';

interface WorkOrderEditFormProps {
  workOrderId: string | string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function WorkOrderEditForm({ workOrderId, onSuccess, onCancel }: WorkOrderEditFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [assignType, setAssignType] = useState<'technician' | 'supervisor'>('technician');
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    technical_description: '',
    type: 'corrective',
    priority: 'medium',
    estimated_hours: '',
    estimated_hours_display: '',
    planned_start: '',
    department_ids: [] as (string | number)[],
    technicians: [] as any[],
    supervisors: [] as any[],
    required_parts: [] as (string | number)[],
    required_tools: [] as (string | number)[],
    team_leader_id: '',
    trade_activity: 'mechanical',
    delivery_date_required: '',
    safety_notes: '',
    ppe_required: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [workOrderId]);

  useEffect(() => {
    if (formData.department_ids.length > 0) {
      const deptIds = formData.department_ids.map(id => id.toString());
      setFilteredEmployees(allUsers.filter(u => u.department_id && deptIds.includes(u.department_id.toString())));
      setFilteredSupervisors(supervisors.filter(s => s.department_id && deptIds.includes(s.department_id.toString())));
    } else {
      setFilteredEmployees(allUsers);
      setFilteredSupervisors(supervisors);
    }
  }, [formData.department_ids, allUsers, supervisors]);

  const loadData = async () => {
    try {
      const [woRes, deptRes, usersRes, partsRes, toolsRes] = await Promise.all([
        api.get(`/work-orders/${workOrderId}`),
        api.get('/departments'),
        api.get('/users?limit=1000'),
        api.get('/parts?limit=10000'),
        api.get('/tools?limit=10000')
      ]);
      
      const wo = woRes.data?.data;
      setWorkOrder(wo);
      setDepartments(deptRes.data?.data || []);
      const users = usersRes.data?.data || [];
      setAllUsers(users);
      setSupervisors(users.filter((u: any) => u.role === 'supervisor'));
      setSpareParts(partsRes.data?.data || []);
      setTools(toolsRes.data?.data || []);
      
      const techniciansList = wo.team_members?.map((m: any) => ({ technician_id: m.technician_id || m.user_id || m.id })) || [];
      const technicianIds = techniciansList.map(t => t.technician_id);
      const techDeptIds = users.filter(u => technicianIds.includes(String(u.id))).map(u => u.department_id).filter(Boolean);
      const uniqueTechDeptIds = [...new Set(techDeptIds)];
      let deptIds = uniqueTechDeptIds.length > 0 ? uniqueTechDeptIds : [];
      const hasTeamMembers = techniciansList.length > 0;
      const hasSupervisors = wo.supervisors && wo.supervisors.length > 0;
      
      if (hasTeamMembers) setAssignType('technician');
      else if (hasSupervisors) setAssignType('supervisor');
      
      setFormData({
        title: wo.title || '',
        description: wo.description || '',
        technical_description: wo.technical_description || '',
        type: wo.type || wo.work_type || 'corrective',
        priority: wo.priority || 'medium',
        estimated_hours: wo.estimated_hours || '',
        estimated_hours_display: wo.estimated_hours || '',
        planned_start: wo.planned_start || wo.scheduled_date || '',
        department_ids: deptIds,
        technicians: techniciansList,
        supervisors: wo.supervisors?.map((s: any) => ({ supervisor_id: s.supervisor_id || s.id })) || [],
        required_parts: wo.required_parts?.map((p: any) => p.id || p.part_id) || [],
        required_tools: wo.required_tools?.map((t: any) => t.id || t.tool_id) || [],
        team_leader_id: wo.team_leader_id || '',
        trade_activity: wo.trade_activity || 'mechanical',
        delivery_date_required: wo.delivery_date_required || '',
        safety_notes: wo.safety_notes || '',
        ppe_required: wo.ppe_required || '',
        notes: wo.notes || ''
      });
      
      if (deptIds.length > 0) {
        const deptIdsStr = deptIds.map(id => id.toString());
        setFilteredEmployees(users.filter(u => u.department_id && deptIdsStr.includes(u.department_id.toString())));
        setFilteredSupervisors(supervisors.filter(s => s.department_id && deptIdsStr.includes(s.department_id.toString())));
      } else {
        setFilteredEmployees(users);
        setFilteredSupervisors(supervisors);
      }
    } catch (error) {
      alert.error('Error', 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const addTechnician = () => {
    setFormData({
      ...formData,
      technicians: [...formData.technicians, { technician_id: '' }]
    });
  };

  const removeTechnician = (index: number) => {
    setFormData({ ...formData, technicians: formData.technicians.filter((_, i) => i !== index) });
  };

  const updateTechnician = (index: number, value: any) => {
    const newTechnicians = [...formData.technicians];
    newTechnicians[index] = { technician_id: value };
    setFormData({ ...formData, technicians: newTechnicians });
  };

  const addSupervisor = () => {
    setFormData({
      ...formData,
      supervisors: [...formData.supervisors, { supervisor_id: '' }]
    });
  };

  const removeSupervisor = (index: number) => {
    setFormData({ ...formData, supervisors: formData.supervisors.filter((_, i) => i !== index) });
  };

  const updateSupervisor = (index: number, value: any) => {
    const newSupervisors = [...formData.supervisors];
    newSupervisors[index] = { supervisor_id: value };
    setFormData({ ...formData, supervisors: newSupervisors });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        technical_description: formData.technical_description,
        type: formData.type,
        priority: formData.priority,
        estimated_hours: formData.estimated_hours,
        planned_start: formData.planned_start,
        delivery_date_required: formData.delivery_date_required,
        trade_activity: formData.trade_activity,
        safety_notes: formData.safety_notes,
        ppe_required: formData.ppe_required,
        notes: formData.notes
      };
      await api.put(`/work-orders/${workOrderId}`, payload);
      alert.success('Success', 'Work order updated successfully');
      onSuccess();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to update work order');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Convert HH:MM or HH:MM:SS to decimal hours
    if (value.includes(':')) {
      const parts = value.split(':');
      const hours = parseInt(parts[0] || '0');
      const minutes = parseInt(parts[1] || '0');
      const seconds = parseInt(parts[2] || '0');
      const decimal = hours + (minutes / 60) + (seconds / 3600);
      setFormData({
        ...formData,
        estimated_hours: decimal.toFixed(2),
        estimated_hours_display: value
      });
    } else {
      // Direct decimal input
      setFormData({
        ...formData,
        estimated_hours: value,
        estimated_hours_display: value
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order No</label>
            <input
              type="text"
              value={workOrder?.work_order_number || ''}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Technical Description</label>
            <textarea
              name="technical_description"
              value={formData.technical_description}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Detailed technical information..."
            />
          </div>
        </div>
      </div>

      {/* Work Order Details */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-purple-900 mb-4">🔧 Work Order Details</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="breakdown">Breakdown</option>
              <option value="preventive">Preventive</option>
              <option value="corrective">Corrective</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trade Activity *</label>
            <select
              name="trade_activity"
              value={formData.trade_activity}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="mechanical">Mechanical</option>
              <option value="electrical">Electrical</option>
              <option value="civil">Civil</option>
              <option value="facility">Facility</option>
              <option value="workshop">Workshop</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Planned Start</label>
            <input
              type="datetime-local"
              name="planned_start"
              value={formData.planned_start}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
            <input
              type="date"
              name="delivery_date_required"
              value={formData.delivery_date_required}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
            <input
              type="text"
              name="estimated_hours_display"
              value={formData.estimated_hours_display}
              onChange={handleDurationChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
              placeholder="2.5 or 2:30"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 2.5 hours or 2:30 (HH:MM)</p>
          </div>
        </div>
      </div>

      {/* Resource Assignment */}
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-green-900 mb-4">👥 Resource Assignment</h3>
        <div className="space-y-4">
          <MultiSelectTags
            label="Select Department(s)"
            required
            options={departments.map(d => ({ id: d.id, label: d.department_name || d.name }))}
            value={formData.department_ids}
            onChange={(val) => setFormData({...formData, department_ids: val})}
            placeholder="Select departments..."
          />

          {formData.department_ids.length > 0 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Assign To *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAssignType('technician')}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                      assignType === 'technician'
                        ? 'border-green-600 bg-green-100 text-green-800'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    👥 Technician(s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignType('supervisor')}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                      assignType === 'supervisor'
                        ? 'border-green-600 bg-green-100 text-green-800'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    👔 Supervisor(s)
                  </button>
                </div>
              </div>

              {assignType === 'supervisor' ? (
                <div className="space-y-3">
                  {formData.supervisors.map((sup, index) => {
                    const selectedIds = formData.supervisors.map(s => s.supervisor_id).filter(Boolean);
                    const availableSupervisors = filteredSupervisors.filter(s => !selectedIds.includes(s.id) || s.id == sup.supervisor_id);
                    return (
                    <div key={index} className="flex gap-2">
                      <select
                        value={sup.supervisor_id}
                        onChange={(e) => updateSupervisor(index, e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="">Select Supervisor...</option>
                        {availableSupervisors.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.full_name || s.name || s.username} - {s.email}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSupervisor(index)}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                      >
                        ✕
                      </button>
                    </div>
                  );
                  })}
                  <button
                    type="button"
                    onClick={addSupervisor}
                    className="w-full px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-semibold border-2 border-green-200"
                  >
                    + Add Supervisor
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.technicians.map((tech, index) => {
                    const selectedUser = filteredEmployees.find(e => e.id == tech.technician_id);
                    const selectedIds = formData.technicians.map(t => t.technician_id).filter(Boolean);
                    const availableTechnicians = filteredEmployees.filter(e => !selectedIds.includes(String(e.id)) || String(e.id) == tech.technician_id);
                    return (
                      <div key={index} className="bg-white p-3 rounded-lg border-2 border-green-200 space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <select
                              value={String(tech.technician_id || '')}
                              onChange={(e) => updateTechnician(index, e.target.value)}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              required
                            >
                              <option value="">Select Technician...</option>
                              {availableTechnicians.map(e => (
                                <option key={e.id} value={String(e.id)}>
                                  {e.name || e.username} - {e.email}
                                </option>
                              ))}
                            </select>
                            {tech.technician_id && selectedUser && (
                              <div className="mt-2 px-2.5 py-1.5 text-sm bg-blue-50 rounded-lg border border-blue-200">
                                <span className="text-sm font-semibold text-blue-900">Trade/Skill: </span>
                                <span className="text-sm text-blue-800">{selectedUser.trade_skill_name || 'Not assigned'}</span>
                              </div>
                            )}
                          </div>
                          <label className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                            <input
                              type="radio"
                              name="team_leader"
                              checked={formData.team_leader_id === tech.technician_id}
                              onChange={() => setFormData({...formData, team_leader_id: tech.technician_id})}
                              className="w-4 h-4 text-amber-600"
                              disabled={!tech.technician_id}
                            />
                            <span className="text-sm font-semibold text-amber-900 whitespace-nowrap">Team Leader</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeTechnician(index)}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addTechnician}
                    className="w-full px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-semibold border-2 border-green-200"
                  >
                    + Add Technician
                  </button>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <MultiSelectTags
              label="Required Spare Parts"
              options={spareParts.map(p => ({ id: p.id, label: p.part_name || p.name }))}
              value={formData.required_parts}
              onChange={(val) => setFormData({...formData, required_parts: val})}
              placeholder="Select spare parts..."
            />
            <MultiSelectTags
              label="Required Tools"
              options={tools.map(t => ({ id: t.id, label: t.tool_name || t.name }))}
              value={formData.required_tools}
              onChange={(val) => setFormData({...formData, required_tools: val})}
              placeholder="Select tools..."
            />
          </div>
        </div>
      </div>

      {/* Safety & Notes */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-amber-900 mb-4">⚠️ Safety & Notes</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Safety Precautions</label>
            <textarea
              name="safety_notes"
              value={formData.safety_notes}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              placeholder="Lockout/tagout, permits, hazards, safety procedures..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PPE Required</label>
            <input
              type="text"
              name="ppe_required"
              value={formData.ppe_required || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              placeholder="Hard hat, safety glasses, gloves, respirator..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              placeholder="Additional instructions..."
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold shadow-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
