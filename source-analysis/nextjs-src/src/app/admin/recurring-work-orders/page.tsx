'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function RecurringWorkOrdersPage() {
  const [recurring, setRecurring] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<any>(null);
  const [formData, setFormData] = useState({
    template_id: '',
    title: '',
    description: '',
    machine_id: '',
    department_id: '',
    assigned_to: '',
    frequency: 'monthly',
    start_date: '',
    end_date: '',
    priority: 'medium',
    type: 'preventive',
    estimated_hours: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [recurringRes, templatesRes, machinesRes, deptsRes, usersRes] = await Promise.all([
        api.get('/recurring-work-orders'),
        api.get('/work-order-templates'),
        api.get('/machines'),
        api.get('/departments'),
        api.get('/users')
      ]);
      setRecurring(recurringRes.data.data || []);
      setTemplates(templatesRes.data.data || []);
      setMachines(machinesRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toast = showToast.loading(editingRecurring ? 'Updating...' : 'Creating...');
    try {
      if (editingRecurring) {
        await api.put(`/recurring-work-orders/${editingRecurring.id}`, formData);
        showToast.success('Recurring work order updated');
      } else {
        await api.post('/recurring-work-orders', formData);
        showToast.success('Recurring work order created');
      }
      showToast.dismiss(toast);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      showToast.dismiss(toast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    const toast = showToast.loading(isActive ? 'Deactivating...' : 'Activating...');
    try {
      await api.patch(`/recurring-work-orders/${id}/toggle`, { is_active: !isActive });
      showToast.dismiss(toast);
      showToast.success(isActive ? 'Deactivated' : 'Activated');
      loadData();
    } catch (error) {
      showToast.dismiss(toast);
      showToast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this recurring work order?')) return;
    const toast = showToast.loading('Deleting...');
    try {
      await api.delete(`/recurring-work-orders/${id}`);
      showToast.dismiss(toast);
      showToast.success('Deleted successfully');
      loadData();
    } catch (error) {
      showToast.dismiss(toast);
      showToast.error('Failed to delete');
    }
  };

  const handleEdit = (item: any) => {
    setEditingRecurring(item);
    setFormData({
      template_id: item.template_id || '',
      title: item.title,
      description: item.description || '',
      machine_id: item.machine_id || '',
      department_id: item.department_id,
      assigned_to: item.assigned_to || '',
      frequency: item.frequency,
      start_date: item.start_date,
      end_date: item.end_date || '',
      priority: item.priority,
      type: item.type,
      estimated_hours: item.estimated_hours || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingRecurring(null);
    setFormData({
      template_id: '',
      title: '',
      description: '',
      machine_id: '',
      department_id: '',
      assigned_to: '',
      frequency: 'monthly',
      start_date: '',
      end_date: '',
      priority: 'medium',
      type: 'preventive',
      estimated_hours: ''
    });
  };

  const getFrequencyBadge = (freq: string) => {
    const colors: any = {
      daily: 'bg-purple-100 text-purple-700',
      weekly: 'bg-blue-100 text-blue-700',
      biweekly: 'bg-cyan-100 text-cyan-700',
      monthly: 'bg-green-100 text-green-700',
      quarterly: 'bg-yellow-100 text-yellow-700',
      semiannual: 'bg-orange-100 text-orange-700',
      annual: 'bg-red-100 text-red-700'
    };
    return colors[freq] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Recurring Work Orders</h1>
            <p className="text-slate-600 mt-1">Automate preventive maintenance scheduling</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Recurring WO
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {recurring.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getFrequencyBadge(item.frequency)}`}>
                        {item.frequency.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-slate-600 mb-4">{item.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Next Due</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(item.next_due_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Department</p>
                        <p className="text-sm font-semibold text-slate-900">{departments.find(d => d.id == item.department_id)?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                        <p className="text-sm font-semibold text-slate-900">{users.find(u => u.id == item.assigned_to)?.name || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Est. Hours</p>
                        <p className="text-sm font-semibold text-slate-900">{item.estimated_hours || 0}h</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button onClick={() => toggleActive(item.id, item.is_active)} className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${item.is_active ? 'bg-orange-50 hover:bg-orange-100 text-orange-600' : 'bg-green-50 hover:bg-green-100 text-green-600'}`}>
                      {item.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleEdit(item)} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors text-sm">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-md font-medium transition-colors text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                <h2 className="text-base font-semibold text-white">{editingRecurring ? 'Edit Recurring WO' : 'Create Recurring WO'}</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-white/80 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Use Template (Optional)</label>
                    <select value={formData.template_id} onChange={(e) => setFormData({...formData, template_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">No Template</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Title *</label>
                    <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., Monthly HVAC Filter Replacement" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe the recurring task..." />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Frequency *</label>
                    <select required value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="semiannual">Semi-annual</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Priority *</label>
                    <select required value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Type *</label>
                    <select required value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="preventive">Preventive</option>
                      <option value="inspection">Inspection</option>
                      <option value="corrective">Corrective</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Machine</label>
                    <select value={formData.machine_id} onChange={(e) => setFormData({...formData, machine_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select Machine</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.machine_name || m.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Department *</label>
                    <select required value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Assign To</label>
                    <select value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Unassigned</option>
                      {users.filter(u => u.role === 'technician').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date *</label>
                    <input type="date" required value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">End Date (Optional)</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Estimated Hours</label>
                    <input type="number" step="0.5" value={formData.estimated_hours} onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0.0" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                    {editingRecurring ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
