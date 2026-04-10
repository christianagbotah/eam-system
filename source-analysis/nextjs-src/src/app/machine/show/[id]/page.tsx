'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import FormModal from '@/components/ui/FormModal';
import MachineForm from '@/components/forms/MachineForm';
import AlertModal from '@/components/AlertModal';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function MachineShowPage() {
  const params = useParams();
  const [machine, setMachine] = useState<any>(null);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error'; title: string; message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });
  const [stats, setStats] = useState({
    assemblies: 0,
    parts: 0,
    activeWorkOrders: 0,
    uptime: 95.2,
    lastMaintenance: null
  });

  useEffect(() => {
    if (params.id) {
      fetchMachine(params.id as string);
      fetchAssemblies(params.id as string);
      fetchParts(params.id as string);
      fetchWorkOrders(params.id as string);
    }
  }, [params.id]);

  const fetchMachine = async (id: string) => {
    try {
      const response = await api.get(`/equipment/${id}`);
      const result = response.data;
      setMachine(result.data || result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssemblies = async (machineId: string) => {
    try {
      const response = await api.get(`/assemblies?machine_id=${machineId}`);
      const result = response.data;
      const assemblyData = result.data || [];
      setAssemblies(assemblyData);
      setStats(prev => ({ ...prev, assemblies: assemblyData.length }));
    } catch (error) {
      console.error('Error fetching assemblies:', error);
    }
  };

  const fetchParts = async (machineId: string) => {
    try {
      const response = await api.get(`/parts?machine_id=${machineId}`);
      const result = response.data;
      const partData = result.data || [];
      setParts(partData);
      setStats(prev => ({ ...prev, parts: partData.length }));
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const fetchWorkOrders = async (machineId: string) => {
    try {
      const response = await api.get(`/work-orders?machine_id=${machineId}`);
      const result = response.data;
      const woData = result.data || [];
      setWorkOrders(woData);
      const activeWOs = woData.filter((wo: any) => wo.status === 'open' || wo.status === 'in_progress').length;
      setStats(prev => ({ ...prev, activeWorkOrders: activeWOs }));
    } catch (error) {
      console.error('Error fetching work orders:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'operational': return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'down': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Machine Not Found</h2>
        <Link href="/machine/machineLists" className="text-blue-600 hover:underline">
          ← Back to Machines
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{machine.asset_name || machine.name}</h1>
            <p className="text-gray-600 font-mono">{machine.asset_code || machine.code || `M-${machine.id}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Edit Machine
          </button>
          <Link href="/machine/machineLists" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Machines
          </Link>
        </div>
      </div>

      {/* Status & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border mt-2 ${getStatusColor(machine.status)}`}>
                {machine.status || 'Unknown'}
              </span>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Assemblies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.assemblies}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Parts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.parts}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Work Orders</p>
              <p className="text-2xl font-bold text-orange-600">{stats.activeWorkOrders}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-green-600">{stats.uptime}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Image & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Image */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Machine Image</h3>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {machine.machine_photo || machine.image ? (
              <img 
                src={machine.machine_photo || machine.image} 
                alt={machine.asset_name || machine.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                <svg className="w-20 h-20 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Basic Information
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Machine Name</span>
              <span className="text-sm text-gray-900">{machine.asset_name || machine.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Machine Code</span>
              <span className="text-sm text-gray-900 font-mono">{machine.asset_code || machine.code || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Type</span>
              <span className="text-sm text-gray-900">{machine.asset_type || 'Equipment'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Location</span>
              <span className="text-sm text-gray-900">{machine.location || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Criticality</span>
              {machine.criticality ? (
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCriticalityColor(machine.criticality)}`}>
                  {machine.criticality}
                </span>
              ) : (
                <span className="text-sm text-gray-500">N/A</span>
              )}
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-600">Last Updated</span>
              <span className="text-sm text-gray-900">
                {machine.updated_at ? formatDate(machine.updated_at) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href={`/assembly/assemblyLists?machine_id=${machine.id}`}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">View Assemblies</p>
                  <p className="text-xs text-gray-500">{stats.assemblies} assemblies</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href={`/parts/partLists?machine_id=${machine.id}`}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">View Parts</p>
                  <p className="text-xs text-gray-500">{stats.parts} parts</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href={`/admin/hierarchy?machine=${machine.id}`}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Asset Hierarchy</p>
                  <p className="text-xs text-gray-500">View complete structure</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href={`/machine/viewer3d/${machine.id}`}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">3D Viewer</p>
                  <p className="text-xs text-gray-500">Interactive 3D visualization</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Assemblies & Parts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Assemblies</h3>
            <Link href={`/assembly/assemblyLists?machine_id=${machine.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {assemblies.slice(0, 5).map(assembly => (
              <div key={assembly.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{assembly.assembly_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{assembly.assembly_code}</p>
                  {assembly.parts_count && (
                    <p className="text-xs text-blue-600 mt-1">{assembly.parts_count} parts</p>
                  )}
                </div>
                <Link href={`/assembly/${assembly.id}`} className="text-blue-600 hover:text-blue-700 text-sm">
                  View
                </Link>
              </div>
            ))}
            {assemblies.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No assemblies found</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Parts</h3>
            <Link href={`/parts/partLists?machine_id=${machine.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {parts.slice(0, 5).map(part => (
              <div key={part.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{part.part_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{part.part_number}</p>
                </div>
                <Link href={`/parts/${part.id}`} className="text-blue-600 hover:text-blue-700 text-sm">
                  View
                </Link>
              </div>
            ))}
            {parts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No parts found</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Machine"
        size="xl"
      >
        <MachineForm
          initialData={machine}
          onSubmit={async (formData) => {
            setFormLoading(true);
            try {
              const response = await api.put(`/equipment/${machine.id}`, formData);
              if ((response.data as any)?.success) {
                setAlert({
                  show: true,
                  type: 'success',
                  title: 'Success',
                  message: 'Machine updated successfully!'
                });
                setShowEditModal(false);
                fetchMachine(params.id as string);
              } else {
                setAlert({
                  show: true,
                  type: 'error',
                  title: 'Error',
                  message: result.message || 'Failed to update machine. Please try again.'
                });
              }
            } catch (error) {
              setAlert({
                show: true,
                type: 'error',
                title: 'Error',
                message: 'Network error. Please check your connection and try again.'
              });
            } finally {
              setFormLoading(false);
            }
          }}
          loading={formLoading}
        />
      </FormModal>
      <AlertModal
        isOpen={alert.show}
        onClose={() => setAlert({ ...alert, show: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </div>
  );
}