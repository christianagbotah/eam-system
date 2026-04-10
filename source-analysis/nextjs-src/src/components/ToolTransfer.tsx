'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import { Users, ArrowRightLeft, CheckCircle, XCircle, Clock, Package } from 'lucide-react';

interface ToolTransfer {
  id: number;
  transfer_number: string;
  from_technician_id: number;
  from_technician_name: string;
  to_technician_id: number;
  to_technician_name: string;
  transfer_status: string;
  transfer_reason: string;
  transfer_location?: string;
  requested_at: string;
  approved_at?: string;
  completed_at?: string;
  items: any[];
  items_count: number;
}

interface ToolTransferProps {
  userRole: string;
  userId?: number;
}

export default function ToolTransferComponent({ userRole, userId }: ToolTransferProps) {
  const [transfers, setTransfers] = useState<ToolTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myTools, setMyTools] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTools, setSelectedTools] = useState<any[]>([]);
  const [transferData, setTransferData] = useState({
    to_technician_id: '',
    transfer_reason: '',
    transfer_location: ''
  });

  useEffect(() => {
    loadTransfers();
    if (userRole === 'technician') {
      loadMyTools();
      loadTechnicians();
    }
  }, []);

  const loadTransfers = async () => {
    try {
      const response = await api.get('/tool-transfers');
      setTransfers(response.data.data || []);
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyTools = async () => {
    try {
      const response = await api.get('/tool-transfers/my-tools');
      setMyTools(response.data.data || []);
    } catch (error) {
      console.error('Error loading tools:', error);
    }
  };

  const loadTechnicians = async () => {
    try {
      const response = await api.get('/users?role=technician&limit=1000');
      setTechnicians(response.data.data || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const handleCreateTransfer = async () => {
    if (!transferData.to_technician_id || !transferData.transfer_reason || selectedTools.length === 0) {
      alert.error('Error', 'Please fill all required fields and select at least one tool');
      return;
    }

    try {
      await api.post('/tool-transfers', {
        ...transferData,
        tools: selectedTools
      });
      alert.success('Success', 'Transfer request created successfully');
      setShowCreateModal(false);
      resetForm();
      loadTransfers();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to create transfer');
    }
  };

  const handleApprove = async (id: number) => {
    const confirmed = await alert.confirm('Approve Transfer', 'Approve this tool transfer?');
    if (!confirmed) return;

    try {
      await api.post(`/tool-transfers/${id}/approve`);
      alert.success('Success', 'Transfer approved successfully');
      loadTransfers();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to approve transfer');
    }
  };

  const handleReject = async (id: number) => {
    const reason = await alert.prompt('Reject Transfer', 'Enter rejection reason:');
    if (!reason) return;

    try {
      await api.post(`/tool-transfers/${id}/reject`, { reason });
      alert.success('Success', 'Transfer rejected');
      loadTransfers();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to reject transfer');
    }
  };

  const handleComplete = async (id: number) => {
    const confirmed = await alert.confirm('Complete Transfer', 'Confirm you have received the tools?');
    if (!confirmed) return;

    try {
      await api.post(`/tool-transfers/${id}/complete`);
      alert.success('Success', 'Transfer completed successfully');
      loadTransfers();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to complete transfer');
    }
  };

  const toggleToolSelection = (tool: any) => {
    const exists = selectedTools.find(t => t.tool_id === tool.tool_id);
    if (exists) {
      setSelectedTools(selectedTools.filter(t => t.tool_id !== tool.tool_id));
    } else {
      setSelectedTools([...selectedTools, {
        tool_id: tool.tool_id,
        quantity: 1,
        condition: tool.condition_on_issue || 'GOOD',
        notes: ''
      }]);
    }
  };

  const resetForm = () => {
    setTransferData({ to_technician_id: '', transfer_reason: '', transfer_location: '' });
    setSelectedTools([]);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-blue-100 text-blue-800 border-blue-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
      COMPLETED: 'bg-green-100 text-green-800 border-green-300'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return <div className="text-center py-8">Loading transfers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">🔄 Tool Transfers</h2>
        {userRole === 'technician' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Transfer Tools
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {transfers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ArrowRightLeft className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tool transfers yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-blue-600">{transfer.transfer_number}</span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(transfer.transfer_status)}`}>
                        {transfer.transfer_status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>From: <strong>{transfer.from_technician_name}</strong> → To: <strong>{transfer.to_technician_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{transfer.items_count} tool(s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(transfer.requested_at).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700 mt-2">{transfer.transfer_reason}</p>
                      {transfer.transfer_location && (
                        <p className="text-gray-500 text-xs">📍 {transfer.transfer_location}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {userRole === 'shop-attendant' && transfer.transfer_status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(transfer.id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(transfer.id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {userRole === 'technician' && transfer.transfer_status === 'APPROVED' && userId && transfer.to_technician_id == userId && (
                      <button
                        onClick={() => handleComplete(transfer.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Confirm Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Transfer Tools to Another Technician"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Tools to Transfer *</label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {myTools.length === 0 ? (
                <p className="text-gray-500 text-sm">No tools currently issued to you</p>
              ) : (
                myTools.map((tool) => (
                  <label key={tool.tool_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTools.some(t => t.tool_id === tool.tool_id)}
                      onChange={() => toggleToolSelection(tool)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{tool.tool_name}</div>
                      <div className="text-xs text-gray-500">{tool.tool_code} • Qty: {tool.quantity}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Transfer To *</label>
            <select
              value={transferData.to_technician_id}
              onChange={(e) => setTransferData({...transferData, to_technician_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select technician...</option>
              {technicians.filter(t => t.id != userId).map((tech) => (
                <option key={tech.id} value={tech.id}>{tech.full_name || tech.name || tech.username}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Transfer Reason *</label>
            <textarea
              value={transferData.transfer_reason}
              onChange={(e) => setTransferData({...transferData, transfer_reason: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Why are you transferring these tools?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Transfer Location</label>
            <input
              type="text"
              value={transferData.transfer_location}
              onChange={(e) => setTransferData({...transferData, transfer_location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Where will the transfer happen?"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreateTransfer}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Submit Transfer Request
            </button>
            <button
              onClick={() => { setShowCreateModal(false); resetForm(); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
