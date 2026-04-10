'use client';

import { useState } from 'react';
import { Edit3, Plus, Minus, CheckCircle } from 'lucide-react';

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<any[]>([]);

  const addAdjustment = () => {
    setAdjustments([...adjustments, { item: '', type: 'add', quantity: 0, reason: '' }]);
  };

  const handleSubmit = async () => {
    try {
      await fetch('/api/v1/eam/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments })
      });
      alert('Adjustments saved successfully!');
      setAdjustments([]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-base md:text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <Edit3 className="w-8 h-8 text-blue-600" />
            Stock Adjustments
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Adjust inventory quantities</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Adjustments</h2>
            <button
              onClick={addAdjustment}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-4">
            {adjustments.map((adj, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                    <select className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg">
                      <option>Select item...</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg">
                      <option value="add">Add</option>
                      <option value="remove">Remove</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                    <input
                      type="text"
                      placeholder="e.g., Physical count"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <button className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Save Adjustments
          </button>
        </div>
      </div>
    </div>
  );
}
