'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';

export default function EditMaintenanceOrder() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    order_type: 'corrective',
    priority: 'medium',
    title: '',
    description: '',
    asset_id: '',
    asset_type: 'machine',
    location: '',
    failure_code: '',
    downtime_impact: 'none',
    safety_risk: false,
    scheduled_start: '',
    scheduled_end: '',
    estimated_hours: '',
    estimated_cost: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/api/v1/eam/maintenance-orders/${params.id}`);
      const data = res.data;
      if (data.status === 'success') {
        setFormData(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/v1/eam/maintenance-orders/${params.id}`),
        body: JSON.stringify(formData)
      });
      const data = res.data;
      if (data.status === 'success') {
        router.push(`/admin/maintenance-orders/${params.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Edit Maintenance Order</h1>
          <p className="text-gray-600 mt-2">Update order details</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Order Type *</label>
              <select value={formData.order_type} onChange={(e) => setFormData({...formData, order_type: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="breakdown">Breakdown</option>
                <option value="inspection">Inspection</option>
                <option value="modification">Modification</option>
                <option value="calibration">Calibration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority *</label>
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} className="w-full px-4 py-2 border rounded-lg"></textarea>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Status *</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Downtime Impact</label>
              <select value={formData.downtime_impact} onChange={(e) => setFormData({...formData, downtime_impact: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Scheduled Start</label>
              <input type="datetime-local" value={formData.scheduled_start} onChange={(e) => setFormData({...formData, scheduled_start: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Scheduled End</label>
              <input type="datetime-local" value={formData.scheduled_end} onChange={(e) => setFormData({...formData, scheduled_end: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Estimated Hours</label>
              <input type="number" step="0.1" value={formData.estimated_hours} onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Estimated Cost</label>
              <input type="number" step="0.01" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="flex items-center">
            <input type="checkbox" checked={formData.safety_risk} onChange={(e) => setFormData({...formData, safety_risk: e.target.checked})} className="w-4 h-4 mr-2" />
            <label className="text-sm font-medium">Safety Risk Involved</label>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
              Update Order
            </button>
            <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
