'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import SearchableSelect from '@/components/SearchableSelect';

interface ToolRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: number;
  onSuccess: () => void;
}

export default function ToolRequestModal({ isOpen, onClose, workOrderId, onSuccess }: ToolRequestModalProps) {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tool_id: '',
    quantity: 1,
    reason: '',
    expected_return_date: ''
  });
  const [requestDate] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (isOpen) {
      loadTools();
    }
  }, [isOpen]);

  const loadTools = async () => {
    try {
      const res = await api.get('/tools?limit=1000');
      const availableTools = (res.data?.data || []).filter((t: any) => 
        t.is_active && t.availability_status === 'AVAILABLE'
      );
      setTools(availableTools);
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/tool-requests', {
        work_order_id: workOrderId,
        ...formData
      });

      alert.success('Success', 'Tool request submitted successfully');
      setFormData({
        tool_id: '',
        quantity: 1,
        reason: '',
        expected_return_date: ''
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Request Tool" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tool *</label>
          <SearchableSelect
            value={formData.tool_id}
            onChange={(val) => setFormData({...formData, tool_id: val})}
            options={tools.map(t => ({
              value: t.id,
              label: `${t.tool_code} - ${t.tool_name}`,
              sublabel: `${t.category || ''} | ${t.location || 'N/A'}`
            }))}
            placeholder="Select tool..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Reason *</label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            rows={3}
            placeholder="Why do you need this tool?"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Request Date</label>
          <input
            type="datetime-local"
            value={requestDate}
            readOnly
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Return Date</label>
          <input
            type="datetime-local"
            value={formData.expected_return_date}
            onChange={(e) => setFormData({...formData, expected_return_date: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </FormModal>
  );
}
