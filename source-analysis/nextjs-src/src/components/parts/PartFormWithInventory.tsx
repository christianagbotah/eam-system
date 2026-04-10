'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Package, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: number;
  item_name: string;
  item_code: string;
  quantity: number;
  unit: string;
  location: string;
}

interface PartFormData {
  part_name: string;
  part_number: string;
  description: string;
  category: string;
  unit_cost: string;
  is_spare_part: boolean;
  linked_inventory_id?: number;
  create_inventory: boolean;
}

export default function PartFormWithInventory({ onSubmit, initialData }: any) {
  const [formData, setFormData] = useState<PartFormData>({
    part_name: '',
    part_number: '',
    description: '',
    category: '',
    unit_cost: '',
    is_spare_part: false,
    create_inventory: false,
    ...initialData
  });

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (searchTerm.length > 2) {
      fetchInventoryItems(searchTerm);
    }
  }, [searchTerm]);

  const fetchInventoryItems = async (search: string) => {
    try {
      const response = await fetch(`/api/inventory?search=${search}`);
      const data = await response.json();
      setInventoryItems(data.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const selectInventory = (item: InventoryItem) => {
    setSelectedInventory(item);
    setFormData({ ...formData, linked_inventory_id: item.id });
    setShowInventorySearch(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Part Name *</label>
          <input
            type="text"
            required
            value={formData.part_name}
            onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Part Number *</label>
          <input
            type="text"
            required
            value={formData.part_number}
            onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Category</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Electrical">Electrical</option>
            <option value="Hydraulic">Hydraulic</option>
            <option value="Pneumatic">Pneumatic</option>
            <option value="Electronic">Electronic</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.unit_cost}
            onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="is_spare_part"
            checked={formData.is_spare_part}
            onChange={(e) => setFormData({ ...formData, is_spare_part: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_spare_part" className="ml-2 text-sm font-medium text-gray-700">
            This is a spare part
          </label>
        </div>

        {formData.is_spare_part && (
          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Inventory Integration
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Existing Inventory
              </label>
              
              {selectedInventory ? (
                <div className="flex items-center justify-between p-3 bg-white border border-green-300 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{selectedInventory.item_name}</p>
                    <p className="text-sm text-gray-600">
                      Code: {selectedInventory.item_code} | Stock: {selectedInventory.quantity} {selectedInventory.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInventory(null);
                      setFormData({ ...formData, linked_inventory_id: undefined });
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search inventory items..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowInventorySearch(true);
                    }}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  
                  {showInventorySearch && inventoryItems.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {inventoryItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectInventory(item)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">{item.item_name}</p>
                          <p className="text-sm text-gray-600">
                            {item.item_code} | Stock: {item.quantity} {item.unit} | {item.location}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="create_inventory"
                checked={formData.create_inventory}
                onChange={(e) => setFormData({ ...formData, create_inventory: e.target.checked })}
                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="create_inventory" className="ml-2 text-sm text-gray-700">
                <span className="font-medium">Create new inventory item</span>
                <p className="text-gray-600">Automatically create an inventory item for this spare part</p>
              </label>
            </div>

            {!selectedInventory && !formData.create_inventory && (
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  This spare part will not be linked to inventory. You can link it later.
                </p>
              </div>
            )}
          </div>
        )}
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
          <Plus className="w-5 h-5" />
          Create Part
        </button>
      </div>
    </form>
  );
}
