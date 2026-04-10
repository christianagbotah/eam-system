'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import InteractiveTree from '@/components/hierarchy/InteractiveTree';
import MachineForm from '@/components/forms/MachineForm';
import AssemblyForm from '@/components/forms/AssemblyForm';
import PartForm from '@/components/forms/PartForm';
import { useAlert } from '@/hooks/useAlert';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';

interface AssetNode {
  id: number;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  status: string;
  criticality: string;
  parent_id: number | null;
}

export default function HierarchyPage() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('asset');
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [highlightAsset, setHighlightAsset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const { alert, showSuccess, showError, closeAlert } = useAlert();
  const [formData, setFormData] = useState<any>({
    asset_name: '',
    asset_code: '',
    asset_type: '',
    parent_id: '',
    status: 'active',
    criticality: 'medium'
  });

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onClose: () => { setShowModal(false); setSelectedType(''); }
  });

  useEffect(() => {
    api.get('/assets-unified')
      .then(res => {
        setAssets((res.data as any)?.data || []);
        if (assetId) {
          const asset = ((res.data as any)?.data || []).find((a: AssetNode) => a.id === parseInt(assetId));
          if (asset) {
            setHighlightAsset(asset.asset_name);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Load error:', err);
        setLoading(false);
      });
  }, [assetId]);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setFormData({
      asset_name: '',
      asset_code: '',
      asset_type: type,
      parent_id: '',
      status: 'active',
      criticality: 'medium',
      ...(type === 'machine' && {
        manufacturer: '',
        model: '',
        serial_number: '',
        installation_date: ''
      }),
      ...(type === 'component' && {
        component_type: '',
        specifications: ''
      }),
      ...(type === 'assembly' && {
        assembly_code: '',
        quantity: 1
      }),
      ...(type === 'part' && {
        part_number: '',
        supplier: '',
        unit_cost: 0
      }),
      ...(type === 'subpart' && {
        subpart_code: '',
        material: ''
      })
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Creating asset...');
    try {
      const res = await api.post('/assets-unified', formData);
      if ((res.data as any)?.success) {
        showToast.dismiss(loadingToast);
        showToast.success('Asset created successfully');
        setShowModal(false);
        setSelectedType('');
        window.location.reload();
      } else {
        showToast.dismiss(loadingToast);
        showToast.error((res.data as any)?.message || 'Failed to create asset');
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create asset');
    }
  };

  const renderForm = () => {
    if (!selectedType) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setSelectedType('machine')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="text-4xl mb-2">🏭</div>
            <div className="font-semibold">Machine</div>
            <div className="text-sm text-gray-600">Comprehensive form</div>
          </button>
          <button onClick={() => handleTypeSelect('component')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="text-4xl mb-2">📦</div>
            <div className="font-semibold">Component</div>
            <div className="text-sm text-gray-600">Quick form</div>
          </button>
          <button onClick={() => setSelectedType('assembly')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="text-4xl mb-2">⚙️</div>
            <div className="font-semibold">Assembly</div>
            <div className="text-sm text-gray-600">Comprehensive form</div>
          </button>
          <button onClick={() => setSelectedType('part')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="text-4xl mb-2">🔩</div>
            <div className="font-semibold">Part</div>
            <div className="text-sm text-gray-600">Comprehensive form</div>
          </button>
          <button onClick={() => handleTypeSelect('subpart')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition col-span-2">
            <div className="text-4xl mb-2">🔧</div>
            <div className="font-semibold">Sub-Part</div>
            <div className="text-sm text-gray-600">Quick form</div>
          </button>
        </div>
      );
    }

    // Use comprehensive forms for Machine, Assembly, Part
    if (selectedType === 'machine') {
      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Create Machine</h3>
            <button type="button" onClick={() => setSelectedType('')} className="text-sm text-blue-600 hover:text-blue-800">← Back</button>
          </div>
          <MachineForm 
            onSubmit={async (formData) => {
              try {
                const res = await api.post('/machines', formData);
                if ((res.data as any)?.success || (res.data as any)?.status === 'success') {
                  setShowModal(false);
                  setSelectedType('');
                  window.location.reload();
                } else {
                  showError('Error', (res.data as any)?.message || 'Failed to create machine');
                }
              } catch (error) {
                showError('Network Error', 'Make sure backend server is running');
                console.error(error);
              }
            }}
            loading={false}
            onCancel={() => setSelectedType('')}
          />
        </div>
      );
    }

    if (selectedType === 'assembly') {
      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Create Assembly</h3>
            <button type="button" onClick={() => setSelectedType('')} className="text-sm text-blue-600 hover:text-blue-800">← Back</button>
          </div>
          <AssemblyForm 
            onSubmit={async (formData) => {
              try {
                const res = await api.post('/assemblies', Object.fromEntries(formData)));
                if ((res.data as any)?.success || (res.data as any)?.status === 'success') {
                  setShowModal(false);
                  setSelectedType('');
                  window.location.reload();
                } else {
                  showError('Error', (res.data as any)?.message || 'Failed to create assembly');
                }
              } catch (error) {
                showError('Network Error', 'Make sure WAMP server is running');
                console.error(error);
              }
            }}
            loading={false}
            onCancel={() => setSelectedType('')}
          />
        </div>
      );
    }

    if (selectedType === 'part') {
      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Create Part</h3>
            <button type="button" onClick={() => setSelectedType('')} className="text-sm text-blue-600 hover:text-blue-800">← Back</button>
          </div>
          <PartForm 
            onSubmit={async (formData) => {
              try {
                const res = await api.post('/parts', Object.fromEntries(formData)));
                if ((res.data as any)?.success || (res.data as any)?.status === 'success') {
                  setShowModal(false);
                  setSelectedType('');
                  window.location.reload();
                } else {
                  showError('Error', (res.data as any)?.message || 'Failed to create part');
                }
              } catch (error) {
                showError('Network Error', 'Make sure WAMP server is running');
                console.error(error);
              }
            }}
            loading={false}
            onCancel={() => setSelectedType('')}
          />
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Create {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</h3>
          <button type="button" onClick={() => setSelectedType('')} className="text-sm text-blue-600 hover:text-blue-800">← Back</button>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input type="text" required value={formData.asset_name} onChange={(e) => setFormData({...formData, asset_name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
          <input type="text" required value={formData.asset_code} onChange={(e) => setFormData({...formData, asset_code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
        </div>

        {selectedType === 'machine' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Manufacturer</label>
              <input type="text" value={formData.manufacturer || ''} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
              <input type="text" value={formData.model || ''} onChange={(e) => setFormData({...formData, model: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Serial Number</label>
              <input type="text" value={formData.serial_number || ''} onChange={(e) => setFormData({...formData, serial_number: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Installation Date</label>
              <input type="date" value={formData.installation_date || ''} onChange={(e) => setFormData({...formData, installation_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </>
        )}

        {selectedType === 'component' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Parent Machine ID *</label>
              <input type="number" required value={formData.parent_id} onChange={(e) => setFormData({...formData, parent_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Component Type</label>
              <input type="text" value={formData.component_type} onChange={(e) => setFormData({...formData, component_type: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Motor, Spindle, Control" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Specifications</label>
              <textarea value={formData.specifications} onChange={(e) => setFormData({...formData, specifications: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} />
            </div>
          </>
        )}

        {selectedType === 'assembly' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Parent Component ID *</label>
              <input type="number" required value={formData.parent_id} onChange={(e) => setFormData({...formData, parent_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assembly Code</label>
              <input type="text" value={formData.assembly_code || ''} onChange={(e) => setFormData({...formData, assembly_code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min="1" value={formData.quantity || 1} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </>
        )}

        {selectedType === 'part' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Parent Assembly ID *</label>
              <input type="number" required value={formData.parent_id} onChange={(e) => setFormData({...formData, parent_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Part Number</label>
              <input type="text" value={formData.part_number || ''} onChange={(e) => setFormData({...formData, part_number: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., SKF-6205" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
              <input type="text" value={formData.supplier || ''} onChange={(e) => setFormData({...formData, supplier: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost ($)</label>
              <input type="number" min="0" step="0.01" value={formData.unit_cost || 0} onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </>
        )}

        {selectedType === 'subpart' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Parent Part ID *</label>
              <input type="number" required value={formData.parent_id} onChange={(e) => setFormData({...formData, parent_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sub-Part Code</label>
              <input type="text" value={formData.subpart_code} onChange={(e) => setFormData({...formData, subpart_code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
              <input type="text" value={formData.material} onChange={(e) => setFormData({...formData, material: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Steel, Rubber" />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full border rounded-lg px-3 py-2">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Criticality</label>
          <select value={formData.criticality} onChange={(e) => setFormData({...formData, criticality: e.target.value})} className="w-full border rounded-lg px-3 py-2">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="flex gap-2 pt-4">
          <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Create {selectedType}</button>
          <button type="button" onClick={() => { setShowModal(false); setSelectedType(''); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
        </div>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading hierarchy...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-semibold">Asset Hierarchy</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <span>➕</span> Add Asset
        </button>
      </div>
      {highlightAsset && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">Highlighting: <strong>{highlightAsset}</strong></p>
        </div>
      )}
      <InteractiveTree data={assets} initialSearch={highlightAsset || ''} />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Add Asset</h2>
            {renderForm()}
          </div>
        </div>
      )}

      {alert.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">{alert.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{alert.message}</p>
            <button onClick={closeAlert} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
