'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Clock, CheckCircle, XCircle, Search } from 'lucide-react';

interface MaterialRequest {
  id: number;
  work_order_id: number;
  work_order_title: string;
  part_id: number;
  part_name: string;
  part_number: string;
  quantity_requested: number;
  quantity_issued: number;
  status: 'pending' | 'approved' | 'issued' | 'rejected';
  requested_by: string;
  requested_at: string;
  notes: string;
}

export default function MaterialRequestsPage() {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' 
        ? '/api/v1/eam/material-requests' 
        : `/api/v1/eam/material-requests?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setRequests(data.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      issued: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };

    const config = configs[status as keyof typeof configs];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            Material Requests
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Request materials for work orders</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'issued', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.part_name}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Part #: {request.part_number} | WO: {request.work_order_title}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Requested</p>
                  <p className="font-medium text-gray-900">{request.quantity_requested} units</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issued</p>
                  <p className="font-medium text-gray-900">{request.quantity_issued} units</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Requested By</p>
                  <p className="font-medium text-gray-900">{request.requested_by}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(request.requested_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {request.notes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">{request.notes}</p>
                </div>
              )}

              {request.status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                    Cancel Request
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No material requests found</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create First Request
          </button>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <CreateMaterialRequestModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}

function CreateMaterialRequestModal({ onClose, onSuccess }: any) {
  const [workOrders, setWorkOrders] = useState([]);
  const [parts, setParts] = useState([]);
  const [formData, setFormData] = useState({
    work_order_id: '',
    part_id: '',
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    fetchWorkOrders();
    fetchParts();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const response = await fetch('/api/v1/eam/work-orders?status=in_progress');
      const data = await response.json();
      setWorkOrders(data.data || []);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/v1/eam/parts?is_spare_part=1');
      const data = await response.json();
      setParts(data.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/v1/eam/material-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <h2 className="text-xl font-semibold mb-4">New Material Request</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Work Order *</label>
            <select
              required
              value={formData.work_order_id}
              onChange={(e) => setFormData({ ...formData, work_order_id: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Work Order</option>
              {workOrders.map((wo: any) => (
                <option key={wo.id} value={wo.id}>{wo.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Spare Part *</label>
            <select
              required
              value={formData.part_id}
              onChange={(e) => setFormData({ ...formData, part_id: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Part</option>
              {parts.map((part: any) => (
                <option key={part.id} value={part.id}>
                  {part.part_name} ({part.part_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
