'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface Part {
  id: number;
  part_name: string;
  part_number: string;
  description: string;
  manufacturer: string;
  unit_cost: number;
  status: string;
  current_stock_qty: string;
  spare_availability: string;
}

interface Assembly {
  id: number;
  assembly_name: string;
  assembly_code: string;
  description: string;
  equipment_id: number;
  parts_count: string;
  status: string;
  parts: Part[];
  total_parts: number;
}

export default function AssemblyDetailsPage() {
  const params = useParams();
  const id = params.id;
  const [assembly, setAssembly] = useState<Assembly | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssemblyDetails();
  }, [id]);

  const fetchAssemblyDetails = async () => {
    try {
      // Fetch assembly details
      const assemblyResponse = await fetch(`/api/v1/eam/assemblies/${id}`);
      if (assemblyResponse.ok) {
        const assemblyData = await assemblyResponse.json();
        const assemblyInfo = assemblyData.data;
        
        // Fetch parts for this assembly
        const partsResponse = await fetch(`/api/v1/eam/parts?component_id=${id}`);
        if (partsResponse.ok) {
          const partsData = await partsResponse.json();
          assemblyInfo.parts = partsData.data || [];
          assemblyInfo.total_parts = partsData.data?.length || 0;
        }
        
        setAssembly(assemblyInfo);
      }
    } catch (error) {
      console.error('Error fetching assembly:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPart = (part: Part, level = 0) => (
    <div key={part.id} className={`border-l-2 border-gray-200 ${level > 0 ? 'ml-6 pl-4' : 'pl-4'}`}>
      <div className="bg-gray-50 rounded-lg p-4 mb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Link href={`/parts/${part.id}`} className="text-lg font-semibold text-blue-600 hover:text-blue-800">
              {part.part_name}
            </Link>
            <p className="text-sm text-gray-600 mt-1">{part.part_number}</p>
            <p className="text-gray-700 mt-2">{part.description || 'No description available'}</p>
          </div>
          <div className="text-right ml-4">
            <span className={`px-2 py-1 rounded-full text-xs ${
              part.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {part.status}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <span className="text-gray-500">Stock Qty:</span>
            <p className="font-medium">{part.current_stock_qty}</p>
          </div>
          <div>
            <span className="text-gray-500">Unit Cost:</span>
            <p className="font-medium">{part.unit_cost ? `$${parseFloat(part.unit_cost).toFixed(2)}` : 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Spare Available:</span>
            <p className="font-medium">{part.spare_availability === 'yes' ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="text-gray-500">Manufacturer:</span>
            <p className="font-medium">{part.manufacturer || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!assembly) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Assembly Not Found</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p>Assembly with ID {id} could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:relative">
      <BackButton />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{assembly.assembly_name}</h1>
        <span className={`px-3 py-1 rounded-full text-sm ${
          assembly.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {assembly.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Assembly Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Assembly Code:</span>
                <p className="font-medium">{assembly.assembly_code}</p>
              </div>
              <div>
                <span className="text-gray-500">Machine ID:</span>
                <Link href={`/machine/show/${assembly.equipment_id}`} className="font-medium text-blue-600 hover:text-blue-800">
                  Machine {assembly.equipment_id}
                </Link>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-500">Description:</span>
                <p className="font-medium mt-1">{assembly.description || 'No description available'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Parts:</span>
              <span className="font-medium">{assembly.parts_count || assembly.total_parts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Parts Available:</span>
              <span className="font-medium">{assembly.parts?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Parts & Components</h2>
        </div>
        <div className="p-6">
          {assembly.parts?.length > 0 ? (
            <div className="space-y-4">
              {assembly.parts.map(part => renderPart(part))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No parts found for this assembly.</p>
          )}
        </div>
      </div>
    </div>
  );
}