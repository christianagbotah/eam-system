'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import Modal from '@/components/Modal';
import FormModal from '@/components/ui/FormModal';
import AssemblyForm from '@/components/forms/AssemblyForm';
import PartForm from '@/components/forms/PartForm';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function AssetDetailsPage() {
  const params = useParams();
  const assetId = params.id;
  const [asset, setAsset] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showAddAssemblyModal, setShowAddAssemblyModal] = useState(false);
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [showCreateWOModal, setShowCreateWOModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useKeyboardShortcuts({
    onClose: () => { setShowAddAssemblyModal(false); setShowAddPartModal(false); setShowCreateWOModal(false); }
  });

  const getEditUrl = () => {
    const type = asset.asset_type?.toLowerCase();
    if (type === 'machine' || type === 'equipment') return `/admin/assets/edit/${assetId}`;
    if (type === 'assembly') return `/assembly/edit/${assetId}`;
    if (type === 'part') return `/admin/inventory/edit/${assetId}`;
    return `/admin/assets/edit/${assetId}`;
  };

  useEffect(() => {
    fetchAsset();
    fetchKPIs();
    fetchWorkOrders();
    fetchAssemblies();
    fetchParts();
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      const response = await api.get(`/assets-unified/${assetId}`);
      const result = response.data;
      setAsset(result.data);
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const fetchKPIs = async () => {
    try {
      const response = await api.get(`/analytics/assets/${assetId}/kpis`);
      const result = response.data;
      setKpis(result.data);
    } catch (error) {
      console.error('KPIs load error:', error);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      const response = await api.get(`/work-orders?asset_id=${assetId}`);
      const result = response.data;
      setWorkOrders(result.data || []);
    } catch (error) {
      console.error('Work orders load error:', error);
    }
  };

  const fetchAssemblies = async () => {
    try {
      const response = await api.get(`/api/v1/eam/machine/assemblies/${assetId}`);
      const result = response.data;
      setAssemblies(result || []);
    } catch (error) {
      console.error('Assemblies load error:', error);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await api.get(`/inventory?asset_id=${assetId}`);
      const result = response.data;
      setParts(result.data || []);
    } catch (error) {
      console.error('Parts load error:', error);
    }
  };

  if (!asset) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading asset details...</p>
      </div>
    </div>
  );

  const images = asset.images || [asset.image].filter(Boolean);
  const statusColor = asset.status === 'active' || asset.status === 'operational' ? 'green' : 
                      asset.status === 'maintenance' ? 'yellow' : 
                      asset.status === 'down' ? 'red' : 'gray';
  const criticalityColor = asset.criticality === 'critical' ? 'red' : 
                          asset.criticality === 'high' ? 'orange' : 
                          asset.criticality === 'medium' ? 'yellow' : 'blue';

  return (
    <div className="min-h-screen bg-gray-50">
      <BackButton />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{asset.asset_name || asset.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-${statusColor}-500 bg-opacity-20 border border-${statusColor}-300`}>
                  {asset.status?.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-${criticalityColor}-500 bg-opacity-20 border border-${criticalityColor}-300`}>
                  {asset.criticality?.toUpperCase()}
                </span>
              </div>
              <p className="text-blue-100 text-lg mb-4">{asset.asset_code || asset.code}</p>
              <div className="grid grid-cols-4 gap-6 mt-6">
                <div>
                  <p className="text-blue-200 text-sm">Type</p>
                  <p className="text-white font-semibold">{asset.asset_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Manufacturer</p>
                  <p className="text-white font-semibold">{asset.manufacturer || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Model</p>
                  <p className="text-white font-semibold">{asset.model_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Serial Number</p>
                  <p className="text-white font-semibold">{asset.serial_number || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href={`/admin/hierarchy?asset=${assetId}`} className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-lg">
                🔗 View Hierarchy
              </Link>
              <Link href={getEditUrl()} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 font-semibold shadow-lg">
                ✏️ Edit Asset
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">MTBF</span>
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{kpis?.mtbf_hours || asset.mtbf_hours || 0}h</div>
            <div className="text-xs text-gray-500 mt-1">Mean Time Between Failures</div>
            <div className="mt-3 flex items-center text-xs text-green-600">
              <span>↑ 12% vs last month</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">MTTR</span>
              <span className="text-2xl">🔧</span>
            </div>
            <div className="text-3xl font-bold text-orange-600">{kpis?.mttr_hours || asset.mttr_hours || 0}h</div>
            <div className="text-xs text-gray-500 mt-1">Mean Time To Repair</div>
            <div className="mt-3 flex items-center text-xs text-green-600">
              <span>↓ 8% improvement</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Availability</span>
              <span className="text-2xl">✅</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{kpis?.availability_percent || 0}%</div>
            <div className="text-xs text-gray-500 mt-1">Uptime Percentage</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div className="bg-green-500 h-2 rounded-full" style={{width: `${kpis?.availability_percent || 0}%`}}></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">OEE</span>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{kpis?.oee_percent || asset.oee_percent || 0}%</div>
            <div className="text-xs text-gray-500 mt-1">Overall Equipment Effectiveness</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div className="bg-purple-500 h-2 rounded-full" style={{width: `${kpis?.oee_percent || asset.oee_percent || 0}%`}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {images.length > 0 ? (
                  <img src={images[selectedImage]} alt={asset.asset_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 text-center">
                    <svg className="w-24 h-24 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm">No image available</p>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="p-3 flex gap-2 overflow-x-auto">
                  {images.map((img: string, idx: number) => (
                    <button key={idx} onClick={() => setSelectedImage(idx)} className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${selectedImage === idx ? 'border-blue-500' : 'border-gray-200'}`}>
                      <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Asset Information */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>📋</span> Asset Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Department</span>
                  <span className="font-semibold">{asset.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Location</span>
                  <span className="font-semibold">{asset.location || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Installation Date</span>
                  <span className="font-semibold">{asset.installation_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Acquisition Cost</span>
                  <span className="font-semibold">${asset.acquisition_cost?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Health Score</span>
                  <span className="font-semibold text-green-600">{asset.health_score || 85}%</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Last Maintenance</span>
                  <span className="font-semibold">{asset.last_maintenance || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg">
              {/* Tab Navigation */}
              <div className="border-b">
                <div className="flex gap-1 p-2">
                  {['overview', 'workorders', 'assemblies', 'parts', 'maintenance'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-3">Description</h3>
                      <p className="text-gray-600">{asset.description || 'No description available for this asset.'}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3">Specifications</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Capacity</p>
                          <p className="font-semibold">{asset.capacity || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Power Rating</p>
                          <p className="font-semibold">{asset.power_rating || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Weight</p>
                          <p className="font-semibold">{asset.weight || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Dimensions</p>
                          <p className="font-semibold">{asset.dimensions || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'workorders' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Work Orders ({workOrders.length})</h3>
                      <button onClick={() => setShowCreateWOModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
                        + Create Work Order
                      </button>
                    </div>
                    <div className="space-y-3">
                      {workOrders.length > 0 ? workOrders.map(wo => (
                        <Link key={wo.id} href={`/admin/work-orders/${wo.id}`} className="block p-4 border rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-lg">WO-{wo.id}</div>
                              <div className="text-sm text-gray-600 mt-1">{wo.work_type || wo.type}</div>
                              <div className="text-xs text-gray-500 mt-1">{wo.created_at}</div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              wo.status === 'completed' ? 'bg-green-100 text-green-800' :
                              wo.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {wo.status}
                            </span>
                          </div>
                        </Link>
                      )) : (
                        <div className="text-center py-12 text-gray-500">
                          <p>No work orders found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'assemblies' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Assemblies ({assemblies.length})</h3>
                      <button onClick={() => setShowAddAssemblyModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
                        + Add Assembly
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assemblies.length > 0 ? assemblies.map(assembly => (
                        <Link key={assembly.id} href={`/admin/assets/${assembly.id}`} className="block p-4 border rounded-lg hover:shadow-md transition-shadow hover:border-blue-500">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-lg">{assembly.assembly_name}</div>
                              <div className="text-sm text-gray-600 mt-1">{assembly.assembly_code}</div>
                              <div className="text-xs text-gray-500 mt-2">Type: {assembly.asset_type || 'Assembly'}</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      )) : (
                        <div className="col-span-2 text-center py-12 text-gray-500">
                          <p>No assemblies found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'parts' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Parts & Components ({parts.length})</h3>
                      <button onClick={() => setShowAddPartModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
                        + Add Part
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {parts.length > 0 ? parts.map(part => (
                        <Link key={part.id} href={`/admin/inventory/${part.id}`} className="block p-4 border rounded-lg hover:shadow-md transition-shadow hover:border-blue-500">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-lg">{part.part_name}</div>
                              <div className="text-sm text-gray-600 mt-1">{part.part_code}</div>
                              <div className="flex gap-4 mt-2 text-xs">
                                <span className="text-gray-500">Qty: <strong>{part.quantity}</strong></span>
                                <span className="text-gray-500">Min: <strong>{part.reorder_point}</strong></span>
                                <span className={part.quantity <= part.reorder_point ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                  {part.quantity <= part.reorder_point ? '⚠️ Low Stock' : '✓ In Stock'}
                                </span>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      )) : (
                        <div className="col-span-2 text-center py-12 text-gray-500">
                          <p>No parts found for this asset</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'maintenance' && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Maintenance History</h3>
                    <div className="text-center py-12 text-gray-500">
                      <p>Maintenance history will be displayed here</p>
                    </div>
                  </div>
                )}


              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Assembly Modal */}
      <FormModal
        isOpen={showAddAssemblyModal}
        onClose={() => setShowAddAssemblyModal(false)}
        title={`Add Assembly to ${asset.asset_name}`}
        size="xl"
      >
        <AssemblyFormWrapper
          assetId={assetId as string}
          assetName={asset.asset_name}
          onSuccess={() => {
            setShowAddAssemblyModal(false);
            fetchAssemblies();
          }}
          onCancel={() => setShowAddAssemblyModal(false)}
          loading={formLoading}
          setLoading={setFormLoading}
        />
      </FormModal>

      {/* Add Part Modal */}
      <FormModal
        isOpen={showAddPartModal}
        onClose={() => setShowAddPartModal(false)}
        title={`Add Part to ${asset.asset_name}`}
        size="2xl"
      >
        <PartFormWrapper
          assetId={assetId as string}
          assetName={asset.asset_name}
          onSuccess={() => {
            setShowAddPartModal(false);
            fetchParts();
          }}
          onCancel={() => setShowAddPartModal(false)}
          loading={formLoading}
          setLoading={setFormLoading}
        />
      </FormModal>

      {/* Create Work Order Modal */}
      <Modal isOpen={showCreateWOModal} onClose={() => setShowCreateWOModal(false)} title={`Create Work Order for ${asset.asset_name}`}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setFormLoading(true);
          const formData = new FormData(e.currentTarget);
          formData.append('asset_id', assetId as string);
          try {
            const response = await api.post('/work-orders', formData);
            if (response.ok) {
              setShowCreateWOModal(false);
              fetchWorkOrders();
            }
          } finally {
            setFormLoading(false);
          }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Asset</label>
            <input type="text" value={asset.asset_name} disabled className="w-full border rounded px-3 py-2 bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input type="text" name="title" required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select name="type" required className="w-full border rounded px-3 py-2">
              <option value="">Select type</option>
              <option value="breakdown">Breakdown</option>
              <option value="corrective">Corrective</option>
              <option value="inspection">Inspection</option>
              <option value="lubrication">Lubrication</option>
              <option value="emergency">Emergency</option>
              <option value="safety">Safety</option>
              <option value="improvement">Improvement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priority *</label>
            <select name="priority" required className="w-full border rounded px-3 py-2">
              <option value="">Select priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" rows={3} className="w-full border rounded px-3 py-2"></textarea>
          </div>
          <button type="submit" disabled={formLoading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {formLoading ? 'Creating...' : 'Create Work Order'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

// Wrapper component for AssemblyForm with pre-populated machine
function AssemblyFormWrapper({ assetId, assetName, onSuccess, onCancel, loading, setLoading }: any) {
  return (
    <div>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">Parent Machine: <strong>{assetName}</strong></p>
      </div>
      <AssemblyForm
        onSubmit={async (formData) => {
          setLoading(true);
          formData.set('equipment_id', assetId);
          try {
            const response = await api.post('/assemblies', formData);
            if (response.ok) {
              onSuccess();
            }
          } finally {
            setLoading(false);
          }
        }}
        loading={loading}
        initialData={{ equipment_id: assetId }}
        onCancel={onCancel}
      />
    </div>
  );
}

// Wrapper component for PartForm with pre-populated machine
function PartFormWrapper({ assetId, assetName, onSuccess, onCancel, loading, setLoading }: any) {
  return (
    <div>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">Machine: <strong>{assetName}</strong></p>
      </div>
      <PartForm
        onSubmit={async (formData) => {
          setLoading(true);
          formData.set('machine_id', assetId);
          try {
            const response = await api.post('/parts', formData);
            if (response.ok) {
              onSuccess();
            }
          } finally {
            setLoading(false);
          }
        }}
        loading={loading}
        initialData={{ machine_id: assetId }}
        onCancel={onCancel}
      />
    </div>
  );
}
