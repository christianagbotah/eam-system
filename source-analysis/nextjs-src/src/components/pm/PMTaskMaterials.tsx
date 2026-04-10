'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';

interface Part {
  id: number;
  part_name: string;
  part_number: string;
  unit_cost: number;
}

interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  unit: string;
  location: string;
}

interface Material {
  part_id: number;
  part_name: string;
  part_number: string;
  quantity: number;
  unit_cost: number;
  is_critical: boolean;
  inventory_id?: number;
  available_quantity?: number;
  location?: string;
}

export default function PMTaskMaterials({ taskId, onChange }: { taskId?: number; onChange: (materials: Material[]) => void }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isCritical, setIsCritical] = useState(false);
  const [inventory, setInventory] = useState<Record<number, InventoryItem>>({});

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    materials.forEach(material => {
      if (material.part_id && !inventory[material.part_id]) {
        fetchInventoryForPart(material.part_id);
      }
    });
  }, [materials]);

  useEffect(() => {
    onChange(materials);
  }, [materials]);

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/v1/eam/parts?is_spare_part=1');
      const data = await response.json();
      setParts(data.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const fetchInventoryForPart = async (partId: number) => {
    try {
      const response = await fetch(`/api/v1/eam/parts/${partId}/inventory`);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const inv = data.data[0];
        setInventory(prev => ({
          ...prev,
          [partId]: inv
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const addMaterial = () => {
    if (!selectedPart) return;

    const part = parts.find(p => p.id === selectedPart);
    if (!part) return;

    const inv = inventory[selectedPart];
    const newMaterial: Material = {
      part_id: part.id,
      part_name: part.part_name,
      part_number: part.part_number,
      quantity,
      unit_cost: part.unit_cost,
      is_critical: isCritical,
      inventory_id: inv?.id,
      available_quantity: inv?.quantity,
      location: inv?.location
    };

    setMaterials([...materials, newMaterial]);
    setSelectedPart(null);
    setQuantity(1);
    setIsCritical(false);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    const updated = [...materials];
    updated[index].quantity = newQuantity;
    setMaterials(updated);
  };

  const toggleCritical = (index: number) => {
    const updated = [...materials];
    updated[index].is_critical = !updated[index].is_critical;
    setMaterials(updated);
  };

  const totalCost = materials.reduce((sum, m) => sum + (m.quantity * m.unit_cost), 0);

  const getAvailabilityStatus = (material: Material) => {
    if (!material.available_quantity) return 'unknown';
    if (material.available_quantity >= material.quantity) return 'available';
    if (material.available_quantity > 0) return 'partial';
    return 'unavailable';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Required Materials
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <span className="font-medium">Total: ${totalCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Add Material Form */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Part</label>
            <select
              value={selectedPart || ''}
              onChange={(e) => setSelectedPart(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a spare part...</option>
              {parts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.part_name} ({part.part_number}) - ${part.unit_cost}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={addMaterial}
              disabled={!selectedPart}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Material
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_critical"
            checked={isCritical}
            onChange={(e) => setIsCritical(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_critical" className="ml-2 text-sm text-gray-700">
            Mark as critical material
          </label>
        </div>
      </div>

      {/* Materials List */}
      {materials.length > 0 ? (
        <div className="space-y-2">
          {materials.map((material, index) => {
            const status = getAvailabilityStatus(material);
            return (
              <div key={index} className="bg-white border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{material.part_name}</h4>
                      {material.is_critical && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Part #: {material.part_number} | Unit Cost: ${material.unit_cost}
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <label className="text-gray-600">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={material.quantity}
                          onChange={(e) => updateQuantity(index, Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {status === 'available' && (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700">
                              Available: {material.available_quantity} @ {material.location}
                            </span>
                          </>
                        )}
                        {status === 'partial' && (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-700">
                              Only {material.available_quantity} available
                            </span>
                          </>
                        )}
                        {status === 'unavailable' && (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-red-700">Out of stock</span>
                          </>
                        )}
                        {status === 'unknown' && (
                          <span className="text-gray-500">No inventory linked</span>
                        )}
                      </div>

                      <div className="font-medium text-gray-900">
                        Subtotal: ${(material.quantity * material.unit_cost).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCritical(index)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {material.is_critical ? 'Unmark' : 'Mark'} Critical
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No materials added yet</p>
          <p className="text-sm">Add spare parts required for this PM task</p>
        </div>
      )}
    </div>
  );
}
