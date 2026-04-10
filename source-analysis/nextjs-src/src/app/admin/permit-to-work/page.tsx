'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, Users, FileText, TrendingUp, XCircle, Plus, Filter, Download } from 'lucide-react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import RBACGuard from '@/components/RBACGuard';

function PermitToWorkContent() {
  const [permits, setPermits] = useState<any[]>([]);
  const [stats, setStats] = useState({ active: 0, pending: 0, expiring: 0, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    permit_type: 'hot_work',
    location: '',
    equipment_id: '',
    work_description: '',
    hazards_identified: '',
    risk_level: 'medium',
    control_measures: '',
    ppe_required: '',
    emergency_procedures: '',
    valid_from: '',
    valid_until: '',
    authorized_workers: []
  });

  useEffect(() => {
    loadPermits();
    loadStats();
  }, [filter]);

  const loadPermits = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/permits-to-work${params}`);
      setPermits(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load permits');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/permits-to-work/dashboard');
      setStats(res.data?.data || { active: 0, pending: 0, expiring: 0, total: 0 });
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/permits-to-work', formData);
      alert.success('Success', 'Permit created successfully');
      setShowForm(false);
      resetForm();
      loadPermits();
      loadStats();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to create permit');
    }
  };

  const handleSubmitForApproval = async (id: number) => {
    alert.confirm(
      'Submit for Approval',
      'Submit this permit for approval? Risk assessment must be complete.',
      async () => {
        try {
          await api.post(`/permits-to-work/${id}/submit`);
          alert.success('Success', 'Permit submitted for approval');
          loadPermits();
          loadStats();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to submit');
        }
      }
    );
  };

  const handleApprove = async (id: number) => {
    alert.confirm(
      'Approve Permit',
      'Approve this permit to work?',
      async () => {
        try {
          await api.post(`/permits-to-work/${id}/approve`, { comments: 'Approved' });
          alert.success('Success', 'Permit approved');
          loadPermits();
          loadStats();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to approve');
        }
      }
    );
  };

  const handleReject = async (id: number) => {
    alert.confirm(
      'Reject Permit',
      'Reject this permit? Please provide reason.',
      async () => {
        try {
          await api.post(`/permits-to-work/${id}/reject`, { reason: 'Rejected' });
          alert.success('Success', 'Permit rejected');
          loadPermits();
          loadStats();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to reject');
        }
      }
    );
  };

  const resetForm = () => {
    setFormData({
      permit_type: 'hot_work',
      location: '',
      equipment_id: '',
      work_description: '',
      hazards_identified: '',
      risk_level: 'medium',
      control_measures: '',
      ppe_required: '',
      emergency_procedures: '',
      valid_from: '',
      valid_until: '',
      authorized_workers: []
    });
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      active: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-purple-100 text-purple-800 border-purple-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getRiskColor = (risk: string) => {
    const colors: any = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[risk] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPermitTypeIcon = (type: string) => {
    const icons: any = {
      hot_work: '🔥',
      confined_space: '🚪',
      electrical: '⚡',
      height: '🪜',
      excavation: '⛏️',
      cold_work: '🔧'
    };
    return icons[type] || '📋';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-700 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Shield className="w-12 h-12" />
                Permit to Work System
              </h1>
              <p className="text-red-100 text-lg">Safety-critical work authorization and control</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-1.5 text-sm bg-white text-red-600 rounded-lg hover:bg-red-50 transition-all font-bold shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Permit
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-semibold">Active Permits</p>
                  <p className="text-lg font-semibold">{stats.active}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-white/60" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-semibold">Pending Approval</p>
                  <p className="text-lg font-semibold">{stats.pending}</p>
                </div>
                <Clock className="w-10 h-10 text-white/60" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-semibold">Expiring Today</p>
                  <p className="text-lg font-semibold">{stats.expiring}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-white/60" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-semibold">Total This Month</p>
                  <p className="text-lg font-semibold">{stats.total}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-white/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="flex gap-2 flex-wrap">
            {['all', 'draft', 'pending_approval', 'approved', 'active', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filter === status
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
          <button className="ml-auto px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors font-semibold inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Permits List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            </div>
          ) : permits.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-16 h-16 mx-auto text-gray-300 mb-3" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Permits Found</h3>
              <p className="text-gray-500">Create your first permit to get started</p>
            </div>
          ) : (
            <div className="divide-y">
              {permits.map((permit) => (
                <div key={permit.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{getPermitTypeIcon(permit.permit_type)}</span>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{permit.permit_number}</h3>
                          <p className="text-sm text-gray-500">{permit.permit_type.replace('_', ' ').toUpperCase()}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{permit.work_description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(permit.status)}`}>
                          {permit.status.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRiskColor(permit.risk_level)}`}>
                          {permit.risk_level.toUpperCase()} RISK
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border-2 border-gray-300">
                          📍 {permit.location}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Valid: {new Date(permit.valid_from).toLocaleDateString()} - {new Date(permit.valid_until).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {permit.requested_by_name}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {permit.status === 'draft' && (
                        <button
                          onClick={() => handleSubmitForApproval(permit.id)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold whitespace-nowrap"
                        >
                          Submit for Approval
                        </button>
                      )}
                      {permit.status === 'pending_approval' && (
                        <>
                          <button
                            onClick={() => handleApprove(permit.id)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold whitespace-nowrap inline-flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(permit.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold whitespace-nowrap inline-flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedPermit(permit)}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors font-semibold whitespace-nowrap inline-flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Permit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-t-2xl z-10">
                <h2 className="text-base font-semibold flex items-center gap-3">
                  <Shield className="w-8 h-8" />
                  Create Permit to Work
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Permit Type & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Permit Type *</label>
                    <select
                      value={formData.permit_type}
                      onChange={(e) => setFormData({...formData, permit_type: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="hot_work">🔥 Hot Work (Welding, Cutting, Grinding)</option>
                      <option value="confined_space">🚪 Confined Space Entry</option>
                      <option value="electrical">⚡ Electrical Work</option>
                      <option value="height">🪜 Work at Height</option>
                      <option value="excavation">⛏️ Excavation</option>
                      <option value="cold_work">🔧 Cold Work</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Location *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., Boiler Room, Area 3"
                      required
                    />
                  </div>
                </div>

                {/* Work Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Work Description *</label>
                  <textarea
                    value={formData.work_description}
                    onChange={(e) => setFormData({...formData, work_description: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder="Describe the work to be performed in detail..."
                    required
                  />
                </div>

                {/* Risk Assessment Section */}
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    Risk Assessment (Mandatory)
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Hazards Identified *</label>
                      <textarea
                        value={formData.hazards_identified}
                        onChange={(e) => setFormData({...formData, hazards_identified: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="List all identified hazards (e.g., fire risk, toxic fumes, electrical shock...)"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Risk Level *</label>
                      <select
                        value={formData.risk_level}
                        onChange={(e) => setFormData({...formData, risk_level: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        required
                      >
                        <option value="low">🟢 Low - Minimal risk, standard controls</option>
                        <option value="medium">🟡 Medium - Moderate risk, enhanced controls</option>
                        <option value="high">🟠 High - Significant risk, strict controls required</option>
                        <option value="critical">🔴 Critical - Severe risk, maximum controls + Plant Manager approval</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Control Measures *</label>
                      <textarea
                        value={formData.control_measures}
                        onChange={(e) => setFormData({...formData, control_measures: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="Describe control measures to mitigate risks (e.g., fire extinguisher on site, ventilation, isolation...)"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">PPE Required *</label>
                      <input
                        type="text"
                        value={formData.ppe_required}
                        onChange={(e) => setFormData({...formData, ppe_required: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g., Hard hat, Safety glasses, Gloves, Fire-resistant clothing, Respirator"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Emergency Procedures</label>
                      <textarea
                        value={formData.emergency_procedures}
                        onChange={(e) => setFormData({...formData, emergency_procedures: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={2}
                        placeholder="Emergency response procedures and contact numbers..."
                      />
                    </div>
                  </div>
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Valid From *</label>
                    <input
                      type="datetime-local"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Valid Until *</label>
                    <input
                      type="datetime-local"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-1.5 text-sm bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all font-bold shadow-lg hover:shadow-xl"
                  >
                    Create Permit
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

export default function PermitToWorkPage() {
  return (
    <RBACGuard module="permit_to_work" action="view">
      <PermitToWorkContent />
    </RBACGuard>
  );
}
