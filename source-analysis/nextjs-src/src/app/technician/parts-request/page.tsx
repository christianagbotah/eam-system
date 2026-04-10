'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import SearchableSelect from '@/components/SearchableSelect';
import { Plus, Trash2 } from 'lucide-react';

export default function PartsRequestPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [hasPendingMaterials, setHasPendingMaterials] = useState(false);
  const [selectedWO, setSelectedWO] = useState('');
  const [priority, setPriority] = useState('normal');
  const [requestItems, setRequestItems] = useState<any[]>([{ inventory_item_id: '', quantity: 1, purpose: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (inventoryItems.length > 0) {
      loadPendingMaterials();
    }
  }, [inventoryItems]);

  const loadMaterialsForWO = async (woId: string) => {
    try {
      const res = await api.get(`/maintenance/work-orders/${woId}/materials-used`);
      const usedMaterials = res.data?.data?.materials || [];
      
      if (usedMaterials.length > 0) {
        setHasPendingMaterials(true);
        const usedParts = usedMaterials.map((mat: any) => ({
          id: mat.part_id,
          item_name: mat.part_name,
          item_code: mat.part_number,
          quantity_on_hand: 0,
          unit_of_measure: 'units'
        }));
        setAvailableItems(usedParts);
        
        const items = usedMaterials.map((mat: any) => ({
          inventory_item_id: mat.part_id,
          quantity: mat.quantity_used,
          purpose: `Required for WO - ${mat.notes || 'Material usage'}`,
        }));
        setRequestItems(items);
      } else {
        setHasPendingMaterials(false);
        setAvailableItems(inventoryItems);
        setRequestItems([{ inventory_item_id: '', quantity: 1, purpose: '' }]);
      }
    } catch (error) {
      console.error('Failed to load materials for WO');
      setAvailableItems(inventoryItems);
    }
  };

  const loadPendingMaterials = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const woId = params.get('work_order_id');
      
      if (woId) {
        await loadMaterialsForWO(woId);
      } else {
        setAvailableItems(inventoryItems);
      }
    } catch (error) {
      console.error('Failed to load pending materials');
      setAvailableItems(inventoryItems);
    }
  };

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const woIdFromUrl = params.get('work_order_id');
      
      const woRes = await api.get('/work-orders?limit=1000');
      const allWorkOrders = woRes.data?.data || [];
      
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id || userData.user_id;
      
      let myOrders = allWorkOrders.filter((wo: any) => {
        if (wo.assigned_to == userId) return true;
        if (wo.team_members?.some((m: any) => m.technician_id == userId || m.user_id == userId)) return true;
        return false;
      });
      
      // If work_order_id is in URL, filter to show only that work order
      if (woIdFromUrl) {
        myOrders = myOrders.filter((wo: any) => wo.id == woIdFromUrl);
        setSelectedWO(woIdFromUrl);
      }
      
      setWorkOrders(myOrders);
      
      const invRes = await api.get('/parts?limit=10000');
      const items = invRes.data?.data || [];
      setInventoryItems(items);
      setAvailableItems(items);
      
      if (woIdFromUrl) {
        await loadMaterialsForWO(woIdFromUrl);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const addItem = () => {
    setRequestItems([...requestItems, { inventory_item_id: '', quantity: 1, purpose: '' }]);
  };

  const removeItem = (index: number) => {
    setRequestItems(requestItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...requestItems];
    updated[index] = { ...updated[index], [field]: value };
    setRequestItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = requestItems.filter(item => item.inventory_item_id && item.quantity);
    if (validItems.length === 0) {
      alert.error('Error', 'Please add at least one item');
      return;
    }

    if (!selectedWO) {
      alert.error('Error', 'Please select a work order');
      return;
    }

    setLoading(true);
    try {
      const items = validItems.map(item => ({
        part_id: item.inventory_item_id,
        quantity: parseFloat(item.quantity)
      }));
      
      await api.post('/material-requests', {
        work_order_id: selectedWO,
        priority: priority,
        notes: validItems.map(i => i.purpose).filter(Boolean).join('; '),
        items: items
      });
      
      alert.success('Success', 'Material request submitted successfully');
      setSelectedWO('');
      setPriority('normal');
      setRequestItems([{ inventory_item_id: '', quantity: 1, purpose: '' }]);
      setHasPendingMaterials(false);
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
          <h1 className="text-lg font-semibold mb-2">Request Materials</h1>
          <p className="text-purple-100">Submit material request for maintenance work</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Work Order *</label>
              <select
                value={selectedWO}
                onChange={(e) => {
                  setSelectedWO(e.target.value);
                  if (e.target.value) {
                    loadMaterialsForWO(e.target.value);
                  } else {
                    setAvailableItems(inventoryItems);
                    setHasPendingMaterials(false);
                    setRequestItems([{ inventory_item_id: '', quantity: 1, purpose: '' }]);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
                required
                disabled={workOrders.length === 1}
              >
                <option value="">Select work order</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>WO #{wo.work_order_number} - {wo.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Materials Required</h3>
                {hasPendingMaterials && (
                  <p className="text-sm text-amber-600 mt-1">
                    ⚠️ Requesting approval for materials already selected in work order
                  </p>
                )}
              </div>
              <button type="button" onClick={addItem} className="px-2 py-1 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />Add Item
              </button>
            </div>

            <div className="space-y-3">
              {requestItems.map((item, index) => {
                // Filter out already selected items from other rows
                const selectedIds = requestItems.map((ri, i) => i !== index ? ri.inventory_item_id : null).filter(Boolean);
                const filteredItems = availableItems.filter(inv => !selectedIds.includes(inv.id));
                
                return (
                <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <SearchableSelect
                      value={item.inventory_item_id}
                      onChange={(val) => updateItem(index, 'inventory_item_id', val)}
                      options={filteredItems.map(inv => ({
                        id: inv.id,
                        label: inv.item_name || inv.part_name || inv.name || 'Item',
                        sublabel: `${inv.item_code || inv.part_number || 'N/A'} - Stock: ${inv.quantity_on_hand || inv.quantity || 0} ${inv.unit_of_measure || inv.unit || 'units'}`
                      }))}
                      placeholder="Select item"
                    />
                  </div>
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="w-24 border border-gray-300 rounded-lg px-3 py-2" placeholder="Qty" min="1" required />
                  <input type="text" value={item.purpose} onChange={(e) => updateItem(index, 'purpose', e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2" placeholder="Purpose" />
                  {requestItems.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800 p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )})}
            </div>
          </div>

          <button type="submit" disabled={loading} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
