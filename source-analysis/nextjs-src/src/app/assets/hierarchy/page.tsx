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

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onClose: () => { setShowModal(false); setSelectedType(''); }
  });

  useEffect(() => {
    api.get('/assets-unified')
      .then(res => {
        setAssets(res.data?.data || []);
        if (assetId) {
          const asset = (res.data?.data || []).find((a: AssetNode) => a.id === parseInt(assetId));
          if (asset) setHighlightAsset(asset.asset_name);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Load error:', err);
        setLoading(false);
      });
  }, [assetId]);

  const renderForm = () => {
    if (!selectedType) {
      return (
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setSelectedType('machine')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="text-4xl mb-2">🏭</div>
            <div className="font-semibold">Machine</div>
            <div className="text-sm text-gray-600">Top-level equipment</div>
          </button>
          <button onClick={() => setSelectedType('component')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="text-4xl mb-2">📦</div>
            <div className="font-semibold">Component</div>
            <div className="text-sm text-gray-600">Machine component</div>
          </button>
          <button onClick={() => setSelectedType('assembly')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="text-4xl mb-2">⚙️</div>
            <div className="font-semibold">Assembly</div>
            <div className="text-sm text-gray-600">Component assembly</div>
          </button>
          <button onClick={() => setSelectedType('part')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="text-4xl mb-2">🔩</div>
            <div className="font-semibold">Part</div>
            <div className="text-sm text-gray-600">Assembly part</div>
          </button>
        </div>
      );
    }

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
                if (res.data?.success || res.data?.status === 'success') {
                  setShowModal(false);
                  setSelectedType('');
                  window.location.reload();
                } else {
                  showError('Error', res.data?.message || 'Failed to create machine');
                }
              } catch (error) {
                showError('Network Error', 'Failed to create machine');
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
                const res = await api.post('/assemblies', Object.fromEntries(formData));
                if (res.data?.success || res.data?.status === 'success') {
                  setShowModal(false);
                  setSelectedType('');
                  window.location.reload();
                } else {
                  showError('Error', res.data?.message || 'Failed to create assembly');
                }
              } catch (error) {
                showError('Network Error', 'Failed to create assembly');
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
                const res = await api.post('/parts', Object.fromEntries(formData));
                if (res.data?.success || res.data?.status === 'success') {
                  setShowModal(false);
                  setSelectedType('');
                  window.location.reload();
                } else {
                  showError('Error', res.data?.message || 'Failed to create part');
                }
              } catch (error) {
                showError('Network Error', 'Failed to create part');
                console.error(error);
              }
            }}
            loading={false}
            onCancel={() => setSelectedType('')}
          />
        </div>
      );
    }

    return null;
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
        <div>
          <h1 className="text-2xl font-bold">Asset Hierarchy</h1>
          <p className="text-gray-600 mt-1">Manage asset structure and relationships</p>
        </div>
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
            <button onClick={closeAlert} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
