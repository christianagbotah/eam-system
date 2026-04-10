'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Material {
  id: number;
  inventory_item_id: number;
  part_name: string;
  part_code: string;
  quantity_required: number;
  quantity_issued: number;
  unit_cost: number;
  status: 'required' | 'reserved' | 'issued' | 'returned';
}

interface MaterialsCardProps {
  workOrderId: string;
}

export default function MaterialsCard({ workOrderId }: MaterialsCardProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, [workOrderId]);

  const fetchMaterials = async () => {
    try {
      const response = await api.get(`/work-orders/${workOrderId}/materials`);
      setMaterials(response.data.data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (materialId: number) => {
    try {
      await api.post(`/work-orders/${workOrderId}/materials/${materialId}/issue`, {
        quantity: materials.find(m => m.id === materialId)?.quantity_required
      });
      fetchMaterials();
    } catch (error) {
      console.error('Error issuing material:', error);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">Loading materials...</div>;
  }

  const getStatusColor = (status: string) => {
    const colors = {
      required: 'bg-gray-100 text-gray-800',
      reserved: 'bg-blue-100 text-blue-800',
      issued: 'bg-green-100 text-green-800',
      returned: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const totalCost = materials.reduce((sum, material) => 
    sum + (material.quantity_required * material.unit_cost), 0
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Materials</h3>
        <div className="text-sm text-gray-500">
          Total Cost: ${totalCost.toFixed(2)}
        </div>
      </div>

      {materials.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No materials required</p>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <div key={material.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{material.part_name}</h4>
                  <p className="text-sm text-gray-500">Code: {material.part_code}</p>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Required:</span>
                      <span className="ml-1 font-medium">{material.quantity_required}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Issued:</span>
                      <span className="ml-1 font-medium">{material.quantity_issued}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Unit Cost:</span>
                      <span className="ml-1 font-medium">${material.unit_cost}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(material.status)}`}>
                    {material.status.toUpperCase()}
                  </span>
                  {material.status === 'required' && (
                    <button
                      onClick={() => handleIssue(material.id)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Issue
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
