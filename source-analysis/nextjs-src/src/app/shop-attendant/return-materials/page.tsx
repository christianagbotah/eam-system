'use client';

import { useState } from 'react';
import { RotateCcw, Package, CheckCircle } from 'lucide-react';

export default function ReturnMaterialsPage() {
  const [workOrder, setWorkOrder] = useState('');
  const [items, setItems] = useState<any[]>([]);

  const handleReturn = async () => {
    try {
      await fetch('/api/v1/eam/material-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_order: workOrder, items })
      });
      alert('Materials returned successfully!');
      setWorkOrder('');
      setItems([]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-base md:text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-8 h-8 text-blue-600" />
            Return Materials
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Return unused materials to inventory</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Order *
          </label>
          <input
            type="text"
            value={workOrder}
            onChange={(e) => setWorkOrder(e.target.value)}
            placeholder="Enter work order number"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Items</h2>
          <div className="space-y-4">
            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Enter work order to load issued materials</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleReturn}
            disabled={!workOrder}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Return Materials
          </button>
        </div>
      </div>
    </div>
  );
}
