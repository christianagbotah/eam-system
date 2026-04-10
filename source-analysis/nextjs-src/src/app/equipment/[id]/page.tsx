'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ThreeDViewer from '@/components/equipment/ThreeDViewer';
import PartInfoPanel from '@/components/equipment/PartInfoPanel';
import { api } from '@/lib/api';

interface Equipment {
  id: number;
  equipment_name: string;
  equipment_code: string;
  description: string;
}

interface Part {
  id: number;
  name: string;
  part_code: string;
  description: string;
  last_maintenance: string;
  expected_life: number;
  current_usage: number;
  position: [number, number, number];
  color: string;
  status: 'good' | 'due_soon' | 'overdue' | 'no_pm';
}

export default function EquipmentPage() {
  const params = useParams();
  const equipmentId = parseInt(params.id as string);
  
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEquipmentData();
  }, [equipmentId]);

  const loadEquipmentData = async () => {
    try {
      const [equipmentData, partsData] = await Promise.all([
        api.getEquipment(equipmentId),
        api.getEquipmentParts(equipmentId),
      ]);

      setEquipment(equipmentData.data);
      
      const transformedParts = (partsData.data || []).map((part: any, index: number) => ({
        ...part,
        position: [(index % 3) * 2 - 2, Math.floor(index / 3) * 2, 0] as [number, number, number],
        color: '#3b82f6',
        status: part.status || 'no_pm',
      }));

      setParts(transformedParts);
    } catch (error) {
      setEquipment({
        id: equipmentId,
        equipment_name: 'CNC Machine #5',
        equipment_code: 'CNC-005',
        description: 'High-precision CNC milling machine',
      });

      setParts([
        { id: 1, name: 'Spindle Motor', part_code: 'SPM-001', description: 'Main spindle motor assembly', last_maintenance: '2024-01-10', expected_life: 5000, current_usage: 3200, position: [-2, 0, 0], color: '#3b82f6', status: 'due_soon' },
        { id: 2, name: 'Coolant Pump', part_code: 'CLP-002', description: 'Coolant circulation pump', last_maintenance: '2024-01-15', expected_life: 3000, current_usage: 1200, position: [0, 0, 0], color: '#3b82f6', status: 'good' },
        { id: 3, name: 'Ball Screw', part_code: 'BSC-003', description: 'X-axis ball screw assembly', last_maintenance: '2023-12-20', expected_life: 4000, current_usage: 3800, position: [2, 0, 0], color: '#3b82f6', status: 'overdue' },
        { id: 4, name: 'Linear Guide', part_code: 'LGD-004', description: 'Y-axis linear guide rail', last_maintenance: '', expected_life: 6000, current_usage: 0, position: [-2, 2, 0], color: '#3b82f6', status: 'no_pm' },
        { id: 5, name: 'Tool Changer', part_code: 'TCH-005', description: 'Automatic tool changer mechanism', last_maintenance: '2024-01-18', expected_life: 8000, current_usage: 2500, position: [0, 2, 0], color: '#3b82f6', status: 'good' },
        { id: 6, name: 'Servo Motor', part_code: 'SVM-006', description: 'Z-axis servo motor', last_maintenance: '2024-01-12', expected_life: 5000, current_usage: 4200, position: [2, 2, 0], color: '#3b82f6', status: 'due_soon' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePartClick = (part: Part) => {
    setSelectedPart(part);
    setIsPanelOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading equipment...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{equipment?.equipment_name}</h1>
            <p className="text-gray-600 mt-1">Code: {equipment?.equipment_code}</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              View All Parts
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Generate PM Schedule
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Interactive 3D View:</strong> Click on any part to view details, maintenance history, and assign PM tasks. 
            Parts are color-coded by PM status: Green (Good), Yellow (Due Soon), Red (Overdue), Gray (No PM).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Parts</p>
            <p className="text-2xl font-bold text-gray-900">{parts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">PM Up to Date</p>
            <p className="text-2xl font-bold text-green-600">{parts.filter(p => p.status === 'good').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Due Soon</p>
            <p className="text-2xl font-bold text-yellow-600">{parts.filter(p => p.status === 'due_soon').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{parts.filter(p => p.status === 'overdue').length}</p>
          </div>
        </div>

        <div className="relative h-[600px] rounded-lg overflow-hidden shadow-lg">
          <ThreeDViewer parts={parts} onPartClick={handlePartClick} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Parts List</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last PM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parts.map((part) => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{part.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{part.part_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{part.current_usage} / {part.expected_life} hrs</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        part.status === 'good' ? 'bg-green-100 text-green-800' :
                        part.status === 'due_soon' ? 'bg-yellow-100 text-yellow-800' :
                        part.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {part.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{part.last_maintenance || 'Never'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handlePartClick(part)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PartInfoPanel part={selectedPart} isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </DashboardLayout>
  );
}
