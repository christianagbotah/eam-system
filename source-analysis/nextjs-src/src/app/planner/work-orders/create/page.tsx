'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import MultiSelectTags from '@/components/MultiSelectTags';

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    maintenance_order_code: '',
    work_order_type: 'corrective',
    priority: 'medium',
    technical_description: '',
    trade_activity: 'Mechanical',
    assigned_technicians: [] as (string | number)[],
    required_skills: [] as (string | number)[],
    required_spare_parts: [] as (string | number)[],
    required_tools: [] as (string | number)[],
    delivery_date_required: '',
    planned_start_date: '',
    is_breakdown: false,
    estimated_hours: '',
    safety_notes: '',
    ppe_required: ''
  });

  useEffect(() => {
    loadData();
  }, [requestId]);

  const loadData = async () => {
    try {
      if (requestId) {
        const res = await api.get(`/maintenance/requests/${requestId}`);
        setRequest(res.data?.data);
        setFormData(prev => ({
          ...prev,
          is_breakdown: res.data?.data?.machine_down_status === 'Yes'
        }));
      }
      const [techRes, partsRes, toolsRes, skillsRes] = await Promise.all([
        api.get('/users?role=technician'),
        api.get('/spare-parts'),
        api.get('/tools'),
        api.get('/skills')
      ]);
      setTechnicians(techRes.data?.data || []);
      setSpareParts(partsRes.data?.data || []);
      setTools(toolsRes.data?.data || []);
      setSkills(skillsRes.data?.data || []);
    } catch (error) {
      alert.error('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        technician_ids: formData.assigned_technicians,
        skill_ids: formData.required_skills,
        spare_part_ids: formData.required_spare_parts,
        tool_ids: formData.required_tools
      };
      
      const response = await api.post(`/maintenance/requests/${requestId}/create-work-order`, payload);
      const woNumber = response.data?.data?.work_order_number || response.data?.data?.id;
      alert.success('Success', `Work Order Created: WO #${woNumber}`);
      router.push('/planner/work-orders');
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white mb-6">
          <h1 className="text-lg font-semibold mb-2">Create Work Order</h1>
          <p className="text-purple-100">Plant Maintenance Order - Professional Form</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Request Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 border-blue-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Request Information
            </h2>
            {request && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-blue-50 p-4 rounded-lg">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Request Number</label>
                  <p className="text-sm font-medium text-gray-900">{request.request_number}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Machine</label>
                  <p className="text-sm font-medium text-gray-900">{request.machine_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Location</label>
                  <p className="text-sm font-medium text-gray-900">{request.location || 'N/A'}</p>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Problem Description</label>
                  <p className="text-sm text-gray-700">{request.title}</p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Work Order Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 border-purple-500">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Work Order Details
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Maintenance Order Code</label>
                <input
                  type="text"
                  value={formData.maintenance_order_code}
                  onChange={(e) => setFormData({...formData, maintenance_order_code: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., MO-2025-001"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Work Order Type *</label>
                <select
                  required
                  value={formData.work_order_type}
                  onChange={(e) => setFormData({...formData, work_order_type: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="breakdown">Breakdown</option>
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective/Project</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority *</label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="lg:col-span-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Technical Description of Task *</label>
                <textarea
                  required
                  value={formData.technical_description}
                  onChange={(e) => setFormData({...formData, technical_description: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Detailed technical description of the work to be performed..."
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Trade Activity *</label>
                <select
                  required
                  value={formData.trade_activity}
                  onChange={(e) => setFormData({...formData, trade_activity: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Civil">Civil</option>
                  <option value="Facility">Facility</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Planned Start Date</label>
                <input
                  type="date"
                  value={formData.planned_start_date}
                  onChange={(e) => setFormData({...formData, planned_start_date: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Date Required</label>
                <input
                  type="date"
                  value={formData.delivery_date_required}
                  onChange={(e) => setFormData({...formData, delivery_date_required: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., 4.5"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="flex items-center gap-3 cursor-pointer bg-red-50 p-3 rounded-lg border-2 border-red-200 hover:bg-red-100 transition-colors h-full">
                  <input
                    type="checkbox"
                    checked={formData.is_breakdown}
                    onChange={(e) => setFormData({...formData, is_breakdown: e.target.checked})}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-red-900">Breakdown / Machine Down</span>
                    <p className="text-xs text-red-700">Emergency breakdown requiring immediate attention</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Resource Assignment */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 border-green-500">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Resource Assignment
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <MultiSelectTags
                  label="Assign Technicians"
                  required
                  options={technicians.map(t => ({ id: t.id, label: t.name || t.username }))}
                  value={formData.assigned_technicians}
                  onChange={(val) => setFormData({...formData, assigned_technicians: val})}
                  placeholder="Select technicians..."
                />
              </div>

              <div>
                <MultiSelectTags
                  label="Required Skills"
                  options={skills.map(s => ({ id: s.id, label: s.skill_name || s.name }))}
                  value={formData.required_skills}
                  onChange={(val) => setFormData({...formData, required_skills: val})}
                  placeholder="Select required skills..."
                />
              </div>

              <div>
                <MultiSelectTags
                  label="Required Spare Parts"
                  options={spareParts.map(p => ({ id: p.id, label: p.part_name || p.name }))}
                  value={formData.required_spare_parts}
                  onChange={(val) => setFormData({...formData, required_spare_parts: val})}
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

          {/* Section 4: Safety Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 border-amber-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              Safety & Additional Notes
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Safety Precautions</label>
                <textarea
                  value={formData.safety_notes}
                  onChange={(e) => setFormData({...formData, safety_notes: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={2}
                  placeholder="Lockout/tagout, permits, hazards, safety procedures..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">PPE Required</label>
                <input
                  type="text"
                  value={formData.ppe_required}
                  onChange={(e) => setFormData({...formData, ppe_required: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Hard hat, safety glasses, gloves, respirator..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
