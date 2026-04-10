'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import SearchableSelect from '@/components/SearchableSelect';
import MultiSelectTags from '@/components/MultiSelectTags';

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [assignType, setAssignType] = useState<'technician' | 'supervisor'>('technician');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    asset_id: '',
    type: 'corrective',
    priority: 'medium',
    estimated_hours: '',
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

  useKeyboardShortcuts({ onClose: () => router.back() });

  useEffect(() => {
    fetchAssets();
    fetchDepartments();
    fetchUsers();
    fetchResources();
  }, []);

  useEffect(() => {
    if (formData.department_ids.length > 0) {
      const deptIds = formData.department_ids.map(id => id.toString());
      setFilteredEmployees(allUsers.filter(u => u.department_id && deptIds.includes(u.department_id.toString())));
      setFilteredSupervisors(supervisors.filter(s => s.department_id && deptIds.includes(s.department_id.toString())));
    } else {
      setFilteredEmployees([]);
      setFilteredSupervisors([]);
    }
  }, [formData.department_ids, allUsers, supervisors]);

  const fetchAssets = async () => {
    try {
      const response = await api.get('/eam/equipment');
      setAssets((response.data as any)?.data || []);
    } catch (error) {
      showToast.error('Failed to fetch assets');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments((response.data as any)?.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const users = (response.data as any)?.data || [];
      setAllUsers(users);
      setSupervisors(users.filter((u: any) => u.role === 'supervisor'));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const [partsRes, toolsRes] = await Promise.all([
        api.get('/parts'),
        api.get('/tools')
      ]);
      setSpareParts((partsRes.data as any)?.data || []);
      setTools((toolsRes.data as any)?.data || []);
    } catch (error) {
      console.error('Error loading resources:', error);
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
    setLoading(true);
    const loadingToast = showToast.loading('Creating work order...');

    try {
      const response = await api.post('/eam/work-orders', formData);
      if ((response.data as any)?.success) {
        const woNumber = (response.data as any)?.data.work_order_number || (response.data as any)?.data.id;
        showToast.dismiss(loadingToast);
        showToast.success(`Work Order Created: WO #${woNumber}`);
        router.push(`/admin/work-orders/${(response.data as any)?.data.id}`);
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to create work order');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800">Create Work Order</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Section 1: Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Asset *</label>
              <select
                name="asset_id"
                value={formData.asset_id}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_name} ({asset.asset_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Work Order Details */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-purple-900 mb-4">🔧 Section 2: Work Order Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="mechanical">Mechanical</option>
                <option value="electrical">Electrical</option>
                <option value="civil">Civil</option>
                <option value="facility">Facility</option>
                <option value="workshop">Workshop</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Planned Start</label>
              <input
                type="datetime-local"
                name="planned_start"
                value={formData.planned_start}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
              <input
                type="date"
                name="delivery_date_required"
                value={formData.delivery_date_required}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
              <input
                type="number"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                step="0.5"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Resource Assignment */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-green-900 mb-4">👥 Section 3: Resource Assignment</h3>
          <div className="space-y-4">
            <div>
              <MultiSelectTags
                label="Select Department(s)"
                required
                options={departments.map(d => ({ id: d.id, label: d.department_name || d.name }))}
                value={formData.department_ids}
                onChange={(val) => setFormData({...formData, department_ids: val, technicians: [], supervisors: []})}
                placeholder="Select departments..."
              />
            </div>

            {formData.department_ids.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Assign To *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignType('technician');
                        setFormData({...formData, technicians: [], supervisors: []});
                      }}
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
                      onClick={() => {
                        setAssignType('supervisor');
                        setFormData({...formData, technicians: [], supervisors: []});
                      }}
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
                    {formData.supervisors.map((sup, index) => (
                      <div key={index} className="flex gap-2">
                        <select
                          value={sup.supervisor_id}
                          onChange={(e) => updateSupervisor(index, e.target.value)}
                          className="flex-1 px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                          required
                        >
                          <option value="">Select Supervisor...</option>
                          {filteredSupervisors.map(s => (
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
                    ))}
                    <button
                      type="button"
                      onClick={addSupervisor}
                      className="w-full px-2 py-1 text-xs.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors font-semibold border-2 border-green-200"
                    >
                      + Add Supervisor
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.technicians.map((tech, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border-2 border-green-200 space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <select
                              value={tech.technician_id}
                              onChange={(e) => updateTechnician(index, e.target.value)}
                              className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                              required
                            >
                              <option value="">Select Technician...</option>
                              {filteredEmployees.map(e => (
                                <option key={e.id} value={e.id}>
                                  {e.name || e.username} - {e.email}
                                </option>
                              ))}
                            </select>
                          </div>
                          <label className="flex items-center gap-2 px-2.5 py-1.5 text-sm.5 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
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
                    ))}
                    <button
                      type="button"
                      onClick={addTechnician}
                      className="w-full px-2 py-1 text-xs.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors font-semibold border-2 border-green-200"
                    >
                      + Add Technician
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <MultiSelectTags
                  label="Required Spare Parts"
                  options={spareParts.map(p => ({ id: p.id, label: p.part_name || p.name }))}
                  value={formData.required_parts}
                  onChange={(val) => setFormData({...formData, required_parts: val})}
                  placeholder="Select spare parts..."
                />
              </div>

              <div>
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
        </div>

        {/* Section 4: Safety & Notes */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-amber-900 mb-4">⚠️ Section 4: Safety & Additional Notes</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Safety Precautions</label>
              <textarea
                name="safety_notes"
                value={formData.safety_notes}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Lockout/tagout, permits, hazards, safety procedures..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PPE Required</label>
              <input
                type="text"
                name="ppe_required"
                value={formData.ppe_required}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Additional instructions..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
