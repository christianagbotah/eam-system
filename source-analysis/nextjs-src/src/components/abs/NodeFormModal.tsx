'use client';

import { useState, useEffect } from 'react';

interface NodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  machineId: number;
  parentNode?: any;
  editNode?: any;
}

export default function NodeFormModal({ isOpen, onClose, onSubmit, machineId, parentNode, editNode }: NodeFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    machine_id: machineId,
    parent_id: parentNode?.id || '',
    node_type: 'part',
    node_name: '',
    node_code: '',
    description: '',
    manufacturer: '',
    serial_number: '',
    expected_lifespan: '',
    lifespan_unit: 'hours',
  });

  useEffect(() => {
    if (editNode) {
      setFormData({
        machine_id: editNode.machine_id,
        parent_id: editNode.parent_id || '',
        node_type: editNode.node_type,
        node_name: editNode.node_name,
        node_code: editNode.node_code,
        description: editNode.description || '',
        manufacturer: editNode.manufacturer || '',
        serial_number: editNode.serial_number || '',
        expected_lifespan: editNode.expected_lifespan || '',
        lifespan_unit: editNode.lifespan_unit || 'hours',
      });
    }
  }, [editNode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value.toString());
    });

    const imageInput = document.querySelector('input[name="image"]') as HTMLInputElement;
    if (imageInput?.files?.[0]) {
      data.append('image', imageInput.files[0]);
    }

    try {
      await onSubmit(data);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {editNode ? 'Edit Node' : 'Add New Node'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Node Type *</label>
              <select
                value={formData.node_type}
                onChange={(e) => setFormData({ ...formData, node_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="assembly">Assembly</option>
                <option value="component">Component</option>
                <option value="sub_component">Sub Component</option>
                <option value="part">Part</option>
                <option value="sub_part">Sub Part</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Node Name *</label>
              <input
                type="text"
                value={formData.node_name}
                onChange={(e) => setFormData({ ...formData, node_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Node Code</label>
              <input
                type="text"
                value={formData.node_code}
                onChange={(e) => setFormData({ ...formData, node_code: e.target.value })}
                placeholder="Auto-generated if empty"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Lifespan</label>
              <input
                type="number"
                value={formData.expected_lifespan}
                onChange={(e) => setFormData({ ...formData, expected_lifespan: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lifespan Unit</label>
              <select
                value={formData.lifespan_unit}
                onChange={(e) => setFormData({ ...formData, lifespan_unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="hours">Hours</option>
                <option value="cycles">Cycles</option>
                <option value="quantity">Quantity</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : editNode ? 'Update Node' : 'Create Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
