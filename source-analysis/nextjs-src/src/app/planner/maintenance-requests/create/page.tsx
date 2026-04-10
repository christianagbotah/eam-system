'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import { Eye, Edit, Trash2, Clock, MapPin, AlertCircle, Archive } from 'lucide-react';
import WorkflowTimeline from '@/components/WorkflowTimeline';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PlannerMaintenanceRequestsCreatePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    machine_down_status: 'No',
    item_type: 'machine',
    asset_id: '',
    asset_name: '',
    location: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadMachines();
  }, []);

  useEffect(() => {
    if (formData.asset_id) {
      const machine = machines.find(m => m.id == formData.asset_id);
      setSelectedMachine(machine);
      if (machine?.location) {
        setFormData(prev => ({ ...prev, location: machine.location }));
      }
    } else {
      setSelectedMachine(null);
    }
  }, [formData.asset_id, machines]);

  const loadData = async () => {
    try {
      const response = await api.get('/maintenance-requests');
      setRequests(response.data?.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMachines = async () => {
    setLoadingMachines(true);
    try {
      const response = await api.get('/machines');
      setMachines(response.data?.data || []);
    } catch (error) {
      console.error('Error loading machines:', error);
    } finally {
      setLoadingMachines(false);
    }
  };

  const handleViewDetails = (request: any) => {
    setViewingRequest(request);
    setShowDetailsModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'converted': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEdit = async (request: any) => {
    setEditingRequest(request);
    setFormData({
      title: request.title || '',
      description: request.description || '',
      machine_down_status: request.machine_down_status || 'No',
      item_type: request.item_type || 'machine',
      asset_id: request.asset_id || '',
      asset_name: request.asset_name || '',
      location: request.location || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    alert.confirm(
      'Delete Request',
      'Are you sure you want to delete this request? This action cannot be undone.',
      async () => {
        try {
          await api.delete(`/maintenance/requests/${id}`);
          alert.success('Deleted', 'Request deleted successfully');
          loadData();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to delete request');
        }
      }
    );
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', machine_down_status: 'No', item_type: 'machine', asset_id: '', asset_name: '', location: '' });
    setEditingRequest(null);
    setSelectedMachine(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const requestData = {
        title: formData.title,
        description: formData.description,
        machine_down_status: formData.item_type === 'machine' ? formData.machine_down_status : 'No',
        item_type: formData.item_type,
        asset_id: formData.item_type === 'machine' ? formData.asset_id || null : null,
        asset_name: formData.item_type === 'manual' ? formData.asset_name : null,
        location: formData.location || null
      };
      
      if (editingRequest) {
        await api.put(`/maintenance/requests/${editingRequest.id}`, requestData);
        setShowModal(false);
        alert.success('Success', 'Request updated successfully!');
      } else {
        await api.post('/maintenance-requests', requestData);
        setShowModal(false);
        alert.success('Success', 'Request created successfully!');
      }
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Request error:', error);
      alert.error('Error', error.response?.data?.message || 'Failed to save request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Maintenance Requests</h1>
            <p className="text-purple-100">Submit and track maintenance requests</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/planner/maintenance-requests/archive"
              className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all font-semibold inline-flex items-center gap-2 border-2 border-white/30"
            >
              <Archive className="w-4 h-4" />
              View Archive
            </a>
            <button
              onClick={() => { setShowModal(true); setEditingRequest(null); }}
              className="bg-white text-purple-600 px-3 py-1.5 text-sm rounded-lg hover:bg-purple-50 transition-all font-semibold shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Request
            </button>
          </div>
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingRequest ? 'Edit Maintenance Request' : 'Create Maintenance Request'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Request Title *</label>
            <input
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Brief title of the maintenance issue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Request Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              placeholder="Detailed description of the maintenance issue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose Option *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, item_type: 'machine'})}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  formData.item_type === 'machine'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Select Asset
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, item_type: 'manual'})}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  formData.item_type === 'manual'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Enter Item Manually
              </button>
            </div>
          </div>
          {formData.item_type === 'machine' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Asset *</label>
                  <select
                    required
                    value={formData.asset_id}
                    onChange={(e) => setFormData({...formData, asset_id: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={loadingMachines}
                  >
                    <option value="">Select Asset</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.machine_name || machine.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Machine is Down</label>
                  <div className="flex items-center h-[42px]">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.machine_down_status === 'Yes'}
                        onChange={(e) => setFormData({...formData, machine_down_status: e.target.checked ? 'Yes' : 'No'})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700">{formData.machine_down_status}</span>
                    </label>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Location or area"
                  />
                </div>
              </div>
              {selectedMachine?.criticality && (
                <p className="text-sm text-gray-600">
                  Machine Criticality: <span className={`font-semibold ${selectedMachine.criticality === 'High' ? 'text-red-600' : selectedMachine.criticality === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {selectedMachine.criticality}
                  </span>
                </p>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={formData.asset_name}
                  onChange={(e) => setFormData({...formData, asset_name: e.target.value})}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter asset name..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Location or area"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-purple-700 transition-all font-semibold disabled:opacity-50 shadow-lg"
            >
              {submitting ? 'Saving...' : (editingRequest ? 'Update Request' : 'Create Request')}
            </button>
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModal>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl p-6 h-32" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-3 text-gray-300">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No maintenance requests found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first maintenance request.</p>
              <button
                onClick={() => { setShowModal(true); setEditingRequest(null); }}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Request
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{req.title || 'Untitled Request'}</h3>
                          <p className="text-gray-600 text-sm line-clamp-2">{req.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(req.status || 'pending')}`}>
                          {(req.status || 'pending').replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(req.priority || 'medium')}`}>
                          {(req.priority || 'medium').toUpperCase()}
                        </span>
                        {req.location && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {req.location}
                          </span>
                        )}
                        {req.created_at && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(req.created_at)} {new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        )}
                      </div>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(req)}
                          className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors font-medium inline-flex items-center gap-2 border border-purple-200"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(req)}
                          className="px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 transition-colors font-medium inline-flex items-center gap-2 border border-amber-200"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors font-medium inline-flex items-center gap-2 border border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                    {(req.status === 'approved' || req.status === 'rejected' || req.workflow_status !== 'pending') && (
                      <button
                        onClick={() => handleViewDetails(req)}
                        className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors font-medium inline-flex items-center gap-2 border border-purple-200"
                      >
                        <Eye className="w-4 h-4" />
                        View Status
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
