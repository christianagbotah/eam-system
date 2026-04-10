'use client';

import { useState } from 'react';
import { CheckSquare, XSquare, Trash2 } from 'lucide-react';
import { alert } from '@/components/AlertModalProvider';
import api from '@/lib/api';

// Custom hook for bulk selection
export function useBulkSelection(items: any[]) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item: any) => item.id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: number) => {
    return selectedIds.includes(id);
  };

  return { selectedIds, toggleSelect, selectAll, clearSelection, isSelected };
}

interface BulkActionsProps {
  selectedIds: number[];
  onSuccess: () => void;
  onClearSelection: () => void;
}

export default function BulkActions({ selectedIds, onSuccess, onClearSelection }: BulkActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleBulkApprove = async () => {
    alert.confirm(
      'Bulk Approve',
      `Are you sure you want to approve ${selectedIds.length} request(s)?`,
      async () => {
        setLoading(true);
        try {
          await api.post('/maintenance-requests/bulk-approve', { ids: selectedIds });
          alert.success('Success', `${selectedIds.length} request(s) approved successfully`);
          onSuccess();
          onClearSelection();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to approve requests');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleBulkReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setLoading(true);
    try {
      await api.post('/maintenance-requests/bulk-reject', { ids: selectedIds, reason });
      alert.success('Success', `${selectedIds.length} request(s) rejected successfully`);
      onSuccess();
      onClearSelection();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to reject requests');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    alert.confirm(
      'Bulk Delete',
      `Are you sure you want to delete ${selectedIds.length} request(s)? This action cannot be undone.`,
      async () => {
        setLoading(true);
        try {
          await api.post('/maintenance-requests/bulk-delete', { ids: selectedIds });
          alert.success('Success', `${selectedIds.length} request(s) deleted successfully`);
          onSuccess();
          onClearSelection();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to delete requests');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl border-2 border-blue-200 p-4 z-50">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">
          {selectedIds.length} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleBulkApprove}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium inline-flex items-center gap-2 disabled:opacity-50"
          >
            <CheckSquare className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={handleBulkReject}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-medium inline-flex items-center gap-2 disabled:opacity-50"
          >
            <XSquare className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={onClearSelection}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
