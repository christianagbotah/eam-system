'use client';

import { useState } from 'react';
import { Package, Scan, Minus, Plus, CheckCircle } from 'lucide-react';

export default function IssueMaterialsPage() {
  const [workOrder, setWorkOrder] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const addItem = () => {
    setItems([...items, { part: '', quantity: 1, available: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleIssue = async () => {
    try {
      await fetch('/api/v1/eam/material-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_order: workOrder, items })
      });
      alert('Materials issued successfully!');
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
            <Package className="w-8 h-8 text-blue-600" />
            Issue Materials
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Issue materials to work orders</p>
        </div>

        {/* Work Order Selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Order *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={workOrder}
              onChange={(e) => setWorkOrder(e.target.value)}
              placeholder="Enter or scan work order number"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setScanning(!scanning)}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Scan className="w-4 h-4" />
              <span className="hidden md:inline">Scan</span>
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Materials</h2>
            <button
              onClick={addItem}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Part
                    </label>
                    <select
                      value={item.part}
                      onChange={(e) => updateItem(index, 'part', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select part...</option>
                      <option value="1">Bearing 6205 (Available: 50)</option>
                      <option value="2">Oil Filter (Available: 30)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                >
                  <Minus className="w-4 h-4" />
                  Remove
                </button>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No items added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleIssue}
            disabled={!workOrder || items.length === 0}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Issue Materials
          </button>
        </div>
      </div>
    </div>
  );
}
