'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function ExternalServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    maintenance_order_id: '',
    vendor_name: '',
    vendor_contact: '',
    service_type: '',
    service_description: '',
    po_number: '',
    estimated_cost: '',
    status: 'requested'
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await api.get('/api/v1/eam/maintenance-orders/external-services');
      const data = res.data;
      if (data.status === 'success') {
        setServices(data.data);
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
      const res = await api.post('/api/v1/eam/maintenance-orders/external-services'),
        body: JSON.stringify(formData)
      });
      const data = res.data;
      if (data.status === 'success') {
        setShowModal(false);
        fetchServices();
        setFormData({
          maintenance_order_id: '',
          vendor_name: '',
          vendor_contact: '',
          service_type: '',
          service_description: '',
          po_number: '',
          estimated_cost: '',
          status: 'requested'
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      requested: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">External Services</h1>
            <p className="text-gray-600 mt-2">Manage contractors and vendors</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
            + Add Service
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
              <tr>
                <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-700">Vendor</th>
                <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-700">Service Type</th>
                <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-700">PO Number</th>
                <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-700">Estimated Cost</th>
                <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-700">Actual Cost</th>
                <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-700">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((service: any) => (
                <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{service.vendor_name}</div>
                    <div className="text-sm text-slate-500">{service.vendor_contact}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{service.service_type}</td>
                  <td className="px-6 py-4 text-slate-700">{service.po_number || '-'}</td>
                  <td className="px-6 py-4 text-slate-700">${(service.estimated_cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-700">${(service.actual_cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${service.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {service.payment_status || 'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-base font-semibold mb-4">Add External Service</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Vendor Name *</label>
                    <input type="text" value={formData.vendor_name} onChange={(e) => setFormData({...formData, vendor_name: e.target.value})} className="w-full px-2 py-1 text-xs border rounded-md" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact</label>
                    <input type="text" value={formData.vendor_contact} onChange={(e) => setFormData({...formData, vendor_contact: e.target.value})} className="w-full px-2 py-1 text-xs border rounded-md" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Service Type *</label>
                    <input type="text" value={formData.service_type} onChange={(e) => setFormData({...formData, service_type: e.target.value})} className="w-full px-2 py-1 text-xs border rounded-md" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">PO Number</label>
                    <input type="text" value={formData.po_number} onChange={(e) => setFormData({...formData, po_number: e.target.value})} className="w-full px-2 py-1 text-xs border rounded-md" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Service Description</label>
                  <textarea value={formData.service_description} onChange={(e) => setFormData({...formData, service_description: e.target.value})} rows={3} className="w-full px-2 py-1 text-xs border rounded-md"></textarea>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Cost</label>
                    <input type="number" step="0.01" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})} className="w-full px-2 py-1 text-xs border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-2 py-1 text-xs border rounded-md">
                      <option value="requested">Requested</option>
                      <option value="approved">Approved</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button type="submit" className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                    Add Service
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
