'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';

export default function WorkOrderTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    type: 'preventive',
    priority: 'medium',
    estimated_hours: '',
    instructions: '',
    safety_notes: '',
    checklist: [] as string[],
    required_parts: [] as string[]
  });

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/work-order-templates');
      setTemplates((res.data as any)?.data || []);
    } catch (error) {
      showToast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toast = showToast.loading(editingTemplate ? 'Updating...' : 'Creating...');
    try {
      if (editingTemplate) {
        await api.put(`/work-order-templates/${editingTemplate.id}`, formData);
        showToast.success('Template updated');
      } else {
        await api.post('/work-order-templates', formData);
        showToast.success('Template created');
      }
      showToast.dismiss(toast);
      setShowModal(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      showToast.dismiss(toast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    const toast = showToast.loading('Deleting...');
    try {
      await api.delete(`/work-order-templates/${id}`);
      showToast.dismiss(toast);
      showToast.success('Template deleted');
      loadTemplates();
    } catch (error) {
      showToast.dismiss(toast);
      showToast.error('Failed to delete');
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description || '',
      type: template.type,
      priority: template.priority,
      estimated_hours: template.estimated_hours || '',
      instructions: template.instructions || '',
      safety_notes: template.safety_notes || '',
      checklist: template.checklist ? JSON.parse(template.checklist) : [],
      required_parts: template.required_parts ? JSON.parse(template.required_parts) : []
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      description: '',
      type: 'preventive',
      priority: 'medium',
      estimated_hours: '',
      instructions: '',
      safety_notes: '',
      checklist: [],
      required_parts: []
    });
  };

  const addChecklistItem = () => setFormData({...formData, checklist: [...formData.checklist, '']});
  const updateChecklistItem = (i: number, val: string) => {
    const updated = [...formData.checklist];
    updated[i] = val;
    setFormData({...formData, checklist: updated});
  };
  const removeChecklistItem = (i: number) => setFormData({...formData, checklist: formData.checklist.filter((_, idx) => idx !== i)});

  const addPart = () => setFormData({...formData, required_parts: [...formData.required_parts, '']});
  const updatePart = (i: number, val: string) => {
    const updated = [...formData.required_parts];
    updated[i] = val;
    setFormData({...formData, required_parts: updated});
  };
  const removePart = (i: number) => setFormData({...formData, required_parts: formData.required_parts.filter((_, idx) => idx !== i)});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Work Order Templates</h1>
            <p className="text-slate-600 mt-1">Create reusable templates for common maintenance tasks</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-slate-200 overflow-hidden group">
              <div className={`h-2 ${template.priority === 'critical' ? 'bg-red-500' : template.priority === 'high' ? 'bg-orange-500' : template.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{template.template_name}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{template.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${template.type === 'preventive' ? 'bg-blue-100 text-blue-700' : template.type === 'corrective' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                    {template.type}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{template.estimated_hours || 0} hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>{template.checklist ? JSON.parse(template.checklist).length : 0} checklist items</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => handleEdit(template)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs rounded-md font-medium transition-colors text-sm">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 text-xs rounded-md font-medium transition-colors text-sm">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                <h2 className="text-base font-semibold text-white">{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-white/80 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Template Name *</label>
                    <input type="text" required value={formData.template_name} onChange={(e) => setFormData({...formData, template_name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., Monthly HVAC Inspection" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe the maintenance task..." />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Type *</label>
                    <select required value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="preventive">Preventive</option>
                      <option value="corrective">Corrective</option>
                      <option value="inspection">Inspection</option>
                      <option value="breakdown">Breakdown</option>
                      <option value="project">Project</option>
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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Estimated Hours</label>
                    <input type="number" step="0.5" value={formData.estimated_hours} onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0.0" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Work Instructions</label>
                    <textarea value={formData.instructions} onChange={(e) => setFormData({...formData, instructions: e.target.value})} rows={4} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Step-by-step instructions..." />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Safety Notes</label>
                    <textarea value={formData.safety_notes} onChange={(e) => setFormData({...formData, safety_notes: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Safety precautions and PPE requirements..." />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-700">Checklist Items</label>
                      <button type="button" onClick={addChecklistItem} className="text-blue-600 hover:text-blue-700 text-sm font-medium">+ Add Item</button>
                    </div>
                    <div className="space-y-2">
                      {formData.checklist.map((item, i) => (
                        <div key={i} className="flex gap-2">
                          <input type="text" value={item} onChange={(e) => updateChecklistItem(i, e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Checklist item..." />
                          <button type="button" onClick={() => removeChecklistItem(i)} className="text-red-600 hover:text-red-700 px-3">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-700">Required Parts</label>
                      <button type="button" onClick={addPart} className="text-blue-600 hover:text-blue-700 text-sm font-medium">+ Add Part</button>
                    </div>
                    <div className="space-y-2">
                      {formData.required_parts.map((part, i) => (
                        <div key={i} className="flex gap-2">
                          <input type="text" value={part} onChange={(e) => updatePart(i, e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Part name or number..." />
                          <button type="button" onClick={() => removePart(i)} className="text-red-600 hover:text-red-700 px-3">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                    {editingTemplate ? 'Update Template' : 'Create Template'}
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
