'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';

export default function CreateMaintenanceOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [parts, setParts] = useState([]);
  const [failureCodes, setFailureCodes] = useState([]);
  const [formData, setFormData] = useState({
    order_type: 'corrective',
    title: '',
    description: '',
    asset_id: '',
    asset_type: 'machine',
    priority: 'medium',
    failure_code: '',
    scheduled_start: '',
    scheduled_end: '',
    estimated_hours: '',
    estimated_cost: '',
    safety_risk: false,
    downtime_impact: 'none'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [machinesRes, partsRes, codesRes] = await Promise.all([
        api.get('/machines'),
        api.get('/parts'),
        api.get('/failure-codes')
      ]);
      
      const machinesData = machinesRes.data;
      const partsData = partsRes.data;
      const codesData = codesRes.data;
      
      setMachines(machinesData.data || []);
      setParts(partsData.data || []);
      setFailureCodes(codesData.data || []);
    } catch (error) {
      console.error('Failed to load data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Creating order...');

    try {
      const response = await api.post('/maintenance-orders'),
        body: JSON.stringify(formData)
      });

      const result = response.data;
      showToast.dismiss(loadingToast);

      if (result.status === 'success') {
        showToast.success('Order created successfully!');
        router.push('/admin/maintenance-orders');
      } else {
        showToast.error(result.message || 'Failed to create order');
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Error creating order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Create Maintenance Order</h1>
          <p className="text-slate-600 mt-1">Fill in the details to create a new maintenance work order</p>
        </div>

        <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-lg border border-white/20 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Order Type *</label>
              <select value={formData.order_type} onChange={(e) => setFormData({...formData, order_type: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300" required>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="breakdown">Breakdown</option>
                <option value="inspection">Inspection</option>
                <option value="modification">Modification</option>
                <option value="calibration">Calibration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority *</label>
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300" required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300"></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Asset Type</label>
              <select value={formData.asset_type} onChange={(e) => setFormData({...formData, asset_type: e.target.value, asset_id: ''})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300">
                <option value="machine">Machine</option>
                <option value="part">Part</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Asset</label>
              <select value={formData.asset_id} onChange={(e) => setFormData({...formData, asset_id: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300">
                <option value="">Select Asset</option>
                {formData.asset_type === 'machine' ? (
                  machines.map((m: any) => <option key={m.id} value={m.id}>{m.machine_name}</option>)
                ) : (
                  parts.map((p: any) => <option key={p.id} value={p.id}>{p.part_name}</option>)
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Failure Code</label>
              <select value={formData.failure_code} onChange={(e) => setFormData({...formData, failure_code: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300">
                <option value="">Select Code</option>
                {failureCodes.map((fc: any) => <option key={fc.id} value={fc.code}>{fc.code} - {fc.description}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Downtime Impact</label>
              <select value={formData.downtime_impact} onChange={(e) => setFormData({...formData, downtime_impact: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300">
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Scheduled Start</label>
              <input type="datetime-local" value={formData.scheduled_start} onChange={(e) => setFormData({...formData, scheduled_start: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Scheduled End</label>
              <input type="datetime-local" value={formData.scheduled_end} onChange={(e) => setFormData({...formData, scheduled_end: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Hours</label>
              <input type="number" step="0.1" value={formData.estimated_hours} onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Cost ($)</label>
              <input type="number" step="0.01" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})} className="w-full px-2 py-1 text-xs rounded-md border border-slate-300" />
            </div>
          </div>

          <div className="flex items-center">
            <input type="checkbox" checked={formData.safety_risk} onChange={(e) => setFormData({...formData, safety_risk: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
            <label className="ml-2 text-sm font-medium text-slate-700">Safety Risk Involved</label>
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
