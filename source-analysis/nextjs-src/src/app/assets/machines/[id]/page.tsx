'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import MeterWidget from '@/components/MeterWidget';
import FormModal from '@/components/ui/FormModal';
import AssemblyForm from '@/components/forms/AssemblyForm';
import PartForm from '@/components/forms/PartForm';

export default function MachineDetailsPage() {
  const params = useParams();
  const [machine, setMachine] = useState<any>(null);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showCreateAssemblyModal, setShowCreateAssemblyModal] = useState(false);
  const [showCreatePartModal, setShowCreatePartModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchMachine();
      fetchAssemblies();
    }
  }, [params.id]);

  const fetchMachine = async () => {
    try {
      const response = await api.get(`/eam/assets/machines/${params.id}`);
      setMachine((response.data as any)?.data);
    } catch (error) {
      console.error('Error fetching machine:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssemblies = async () => {
    try {
      const response = await api.get(`/eam/assets/machines/${params.id}/assemblies`);
      setAssemblies((response.data as any)?.data || []);
    } catch (error) {
      console.error('Error fetching assemblies:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!machine) {
    return <div className="text-center py-12">Machine not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{machine.name}</h1>
          <p className="text-gray-600">Asset Tag: {machine.asset_tag}</p>
        </div>
        <span className={`px-3 py-1 rounded text-sm ${
          machine.status === 'active' ? 'bg-green-100 text-green-800' :
          machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {machine.status}
        </span>
      </div>

      <div className="border-b">
        <nav className="flex space-x-8">
          {['overview', 'assemblies', 'bom', 'meters', 'documents', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Machine Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Model</label>
                <p className="font-medium">{machine.model || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Manufacturer</label>
                <p className="font-medium">{machine.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Serial Number</label>
                <p className="font-medium">{machine.serial_number || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Category</label>
                <p className="font-medium">{machine.category || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Criticality</label>
                <p className="font-medium">{machine.criticality || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Install Date</label>
                <p className="font-medium">{machine.install_date || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Purchase Date</label>
                <p className="font-medium">{machine.purchase_date || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Warranty Expiry</label>
                <p className="font-medium">{machine.warranty_expiry || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Components Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">Assemblies</p>
                    <p className="text-2xl font-bold text-blue-600">{assemblies.length}</p>
                  </div>
                  <a href={`/assembly/assemblyLists?machine_id=${machine.id}`} className="text-blue-600 hover:underline">
                    View All →
                  </a>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">Total Parts</p>
                    <p className="text-2xl font-bold text-green-600">{assemblies.reduce((sum, a) => sum + (a.parts_count || 0), 0)}</p>
                  </div>
                  <a href={`/parts/partLists?machine_id=${machine.id}`} className="text-green-600 hover:underline">
                    View All →
                  </a>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowCreateAssemblyModal(true)}
                  className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Assembly
                </button>
                <button
                  onClick={() => setShowCreatePartModal(true)}
                  className="block w-full text-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Add Part
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assemblies' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Assemblies ({assemblies.length})</h2>
            <button
              onClick={() => setShowCreateAssemblyModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Assembly
            </button>
          </div>
          <div className="space-y-3">
            {assemblies.map((assembly) => (
              <div key={assembly.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium">{assembly.assembly_name}</h3>
                    <p className="text-sm text-gray-600">{assembly.assembly_code}</p>
                    {assembly.assembly_category && (
                      <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs rounded">
                        {assembly.assembly_category}
                      </span>
                    )}
                    {assembly.criticality && (
                      <span className={`inline-block mt-1 ml-2 px-2 py-1 text-xs rounded ${
                        assembly.criticality === 'critical' ? 'bg-red-100 text-red-800' :
                        assembly.criticality === 'high' ? 'bg-orange-100 text-orange-800' :
                        assembly.criticality === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {assembly.criticality}
                      </span>
                    )}
                    {assembly.description && (
                      <p className="text-sm text-gray-500 mt-1">{assembly.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <a href={`/parts/partLists?assembly_id=${assembly.id}`} className="text-blue-600 hover:underline text-sm">
                      View Parts
                    </a>
                    <a href={`/assembly/${assembly.id}`} className="text-green-600 hover:underline text-sm">
                      Details
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {assemblies.length === 0 && (
              <p className="text-center text-gray-500 py-8">No assemblies yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bom' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Bill of Materials</h2>
          <p className="text-gray-500">BOM tree view will be displayed here</p>
        </div>
      )}

      {activeTab === 'meters' && (
        <div className="bg-white rounded-lg shadow p-6">
          <MeterWidget nodeType="machine" nodeId={parseInt(params.id as string, 10)} />
        </div>
      )}

      {/* Create Assembly Modal */}
      <FormModal
        isOpen={showCreateAssemblyModal}
        onClose={() => setShowCreateAssemblyModal(false)}
        title="Add Assembly to Machine"
        size="xl"
      >
        <AssemblyForm
          onSubmit={async (formData) => {
            setFormLoading(true);
            formData.append('machine_id', machine.id);
            try {
              const response = await api.post('/assemblies', formData);
              if ((response.data as any)?.success) {
                setShowCreateAssemblyModal(false);
                fetchAssemblies();
              }
            } catch (error) {
              console.error('Error creating assembly:', error);
            } finally {
              setFormLoading(false);
            }
          }}
          loading={formLoading}
        />
      </FormModal>

      {/* Create Part Modal */}
      <FormModal
        isOpen={showCreatePartModal}
        onClose={() => setShowCreatePartModal(false)}
        title="Add Part to Machine"
        size="2xl"
      >
        <PartForm
          onSubmit={async (formData) => {
            setFormLoading(true);
            formData.append('machine_id', machine.id);
            try {
              const response = await api.post('/parts', formData);
              if ((response.data as any)?.success) {
                setShowCreatePartModal(false);
                fetchAssemblies();
              }
            } catch (error) {
              console.error('Error creating part:', error);
            } finally {
              setFormLoading(false);
            }
          }}
          loading={formLoading}
        />
      </FormModal>
    </div>
  );
}
