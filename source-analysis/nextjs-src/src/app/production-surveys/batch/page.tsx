'use client';
import { useState } from 'react';
import { productionSurveyAdvancedService } from '@/services/productionSurveyAdvanced';
import { CheckSquare, XSquare, Download } from 'lucide-react';

export default function BatchOperationsPage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleBatchOperation = async (operation: 'approve' | 'reject' | 'export') => {
    if (selectedIds.length === 0) {
      alert('Please select surveys');
      return;
    }

    setProcessing(true);
    try {
      await productionSurveyAdvancedService.batchOperation({
        operation_type: operation,
        survey_ids: selectedIds
      });
      alert(`Batch ${operation} completed`);
      setSelectedIds([]);
    } catch (error) {
      alert('Batch operation failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Batch Operations</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Selected Surveys: {selectedIds.length}</h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleBatchOperation('approve')}
            disabled={processing || selectedIds.length === 0}
            className="bg-green-600 text-white px-6 py-3 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <CheckSquare size={20} /> Batch Approve
          </button>
          
          <button
            onClick={() => handleBatchOperation('reject')}
            disabled={processing || selectedIds.length === 0}
            className="bg-red-600 text-white px-6 py-3 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <XSquare size={20} /> Batch Reject
          </button>
          
          <button
            onClick={() => handleBatchOperation('export')}
            disabled={processing || selectedIds.length === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={20} /> Batch Export
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
        <p className="text-sm text-yellow-800">
          Select surveys from the main list page, then return here to perform batch operations.
        </p>
      </div>
    </div>
  );
}
