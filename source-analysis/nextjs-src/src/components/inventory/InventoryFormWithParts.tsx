'use client';

import { useState, useEffect } from 'react';
import { Search, Link2, Package, CheckCircle } from 'lucide-react';

interface Part {
  id: number;
  part_name: string;
  part_number: string;
  category: string;
  unit_cost: number;
}

interface InventoryFormData {
  item_name: string;
  item_code: string;
  description: string;
  quantity: number;
  unit: string;
  location: string;
  reorder_level: number;
  auto_link: boolean;
  manual_part_ids: number[];
}

export default function InventoryFormWithParts({ onSubmit, initialData }: any) {
  const [formData, setFormData] = useState<InventoryFormData>({
    item_name: '',
    item_code: '',
    description: '',
    quantity: 0,
    unit: '',
    location: '',
    reorder_level: 0,
    auto_link: true,
    manual_part_ids: [],
    ...initialData
  });

  const [parts, setParts] = useState<Part[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartSearch, setShowPartSearch] = useState(false);
  const [selectedParts, setSelectedParts] = useState<Part[]>([]);
  const [suggestedParts, setSuggestedParts] = useState<Part[]>([]);

  useEffect(() => {
    if (formData.auto_link && formData.item_name.length > 2) {
      fetchSuggestedParts(formData.item_name);
    }
  }, [formData.item_name, formData.auto_link]);

  useEffect(() => {
    if (searchTerm.length > 2) {
      fetchParts(searchTerm);
    }
  }, [searchTerm]);

  const fetchSuggestedParts = async (name: string) => {
    try {
      const response = await fetch(`/api/v1/eam/parts?search=${name}&is_spare_part=1`);
      const data = await response.json();
      setSuggestedParts(data.data || []);
    } catch (error) {
      console.error('Error fetching suggested parts:', error);
    }
  };

  const fetchParts = async (search: string) => {
    try {
      const response = await fetch(`/api/v1/eam/parts?search=${search}&is_spare_part=1`);
      const data = await response.json();
      setParts(data.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      manual_part_ids: selectedParts.map(p => p.id)
    };
    onSubmit(submitData);
  };

  const addPart = (part: Part) => {
    if (!selectedParts.find(p => p.id === part.id)) {
      setSelectedParts([...selectedParts, part]);
    }
    setShowPartSearch(false);
    setSearchTerm('');
  };

  const removePart = (partId: number) => {
    setSelectedParts(selectedParts.filter(p => p.id !== partId));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
          <input
            type="text"
            required
            value={formData.item_name}
            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Code *</label>
          <input
            type="text"
            required
            value={formData.item_code}
            onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
          <input
            type="number"
            required
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
          <input
            type="text"
            required
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
          <input
            type="text"
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
          <input
            type="number"
            value={formData.reorder_level}
            onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="auto_link"
            checked={formData.auto_link}
            onChange={(e) => setFormData({ ...formData, auto_link: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="auto_link" className="ml-2 text-sm font-medium text-gray-700">
            Auto-link to matching spare parts
          </label>
        </div>

        {formData.auto_link && suggestedParts.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Suggested Parts ({suggestedParts.length})
            </h4>
            <div className="space-y-2">
              {suggestedParts.slice(0, 3).map((part) => (
                <div key={part.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="font-medium text-sm">{part.part_name}</p>
                    <p className="text-xs text-gray-600">{part.part_number} | ${part.unit_cost}</p>
                  </div>
                  <span className="text-xs text-green-600">Will be linked</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            Manual Part Selection
          </h3>

          <div className="relative">
            <input
              type="text"
              placeholder="Search spare parts..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowPartSearch(true);
              }}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            
            {showPartSearch && parts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {parts.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => addPart(part)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <p className="font-medium text-gray-900">{part.part_name}</p>
                    <p className="text-sm text-gray-600">
                      {part.part_number} | {part.category} | ${part.unit_cost}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedParts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected Parts ({selectedParts.length})</p>
              {selectedParts.map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{part.part_name}</p>
                    <p className="text-sm text-gray-600">{part.part_number}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePart(part.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Package className="w-5 h-5" />
          Create Inventory Item
        </button>
      </div>
    </form>
  );
}
