'use client';

import { useState, useEffect } from 'react';
import { X, Package, MapPin, Calendar, DollarSign, Link2 } from 'lucide-react';
import AvailabilityBadge from './AvailabilityBadge';
import StockLevelIndicator from './StockLevelIndicator';

interface InventoryQuickViewProps {
  inventoryId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface InventoryDetails {
  id: number;
  item_name: string;
  item_code: string;
  description: string;
  quantity: number;
  unit: string;
  location: string;
  reorder_level: number;
  unit_cost: number;
  last_updated: string;
  linked_parts: Array<{
    id: number;
    part_name: string;
    part_number: string;
  }>;
}

export default function InventoryQuickView({ inventoryId, isOpen, onClose }: InventoryQuickViewProps) {
  const [inventory, setInventory] = useState<InventoryDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && inventoryId) {
      fetchInventoryDetails();
    }
  }, [isOpen, inventoryId]);

  const fetchInventoryDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/eam/inventory/${inventoryId}`);
      const data = await response.json();
      setInventory(data.data);
    } catch (error) {
      console.error('Error fetching inventory details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Inventory Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading inventory details...</p>
            </div>
          ) : inventory ? (
            <>
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{inventory.item_name}</h3>
                <p className="text-sm text-gray-600">Code: {inventory.item_code}</p>
                {inventory.description && (
                  <p className="mt-2 text-gray-700">{inventory.description}</p>
                )}
              </div>

              {/* Stock Status */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Stock</span>
                  <AvailabilityBadge
                    available={inventory.quantity}
                    required={inventory.reorder_level}
                    unit={inventory.unit}
                  />
                </div>

                <StockLevelIndicator
                  current={inventory.quantity}
                  reorderLevel={inventory.reorder_level}
                  unit={inventory.unit}
                />
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-sm text-gray-900">{inventory.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Unit Cost</p>
                    <p className="text-sm text-gray-900">${inventory.unit_cost.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Value</p>
                    <p className="text-sm text-gray-900">
                      ${(inventory.quantity * inventory.unit_cost).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Last Updated</p>
                    <p className="text-sm text-gray-900">
                      {new Date(inventory.last_updated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Linked Parts */}
              {inventory.linked_parts && inventory.linked_parts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Linked Spare Parts ({inventory.linked_parts.length})
                  </h4>
                  <div className="space-y-2">
                    {inventory.linked_parts.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{part.part_name}</p>
                          <p className="text-sm text-gray-600">Part #: {part.part_number}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => window.location.href = `/inventory/${inventory.id}/edit`}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Inventory
                </button>
                <button
                  onClick={() => window.location.href = `/inventory/${inventory.id}/transactions`}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  View Transactions
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Failed to load inventory details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
