'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/SearchableSelect';
import PlantFacilitySelector from './PlantFacilitySelector';
import api from '@/lib/api';

interface AssemblyFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  initialData?: any;
  onCancel?: () => void;
}

export default function AssemblyForm({ onSubmit, loading, initialData, onCancel }: AssemblyFormProps) {
  const router = useRouter();
  const [machines, setMachines] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    plant_id: initialData?.plant_id,
    facility_id: initialData?.facility_id,
    equipment_id: initialData?.equipment_id || '',
    assembly_name: initialData?.assembly_name || '',
    assembly_code: initialData?.assembly_code || '',
    assembly_category: initialData?.assembly_category || '',
    description: initialData?.description || '',
    criticality: initialData?.criticality || 'medium',
    status: initialData?.status || 'active'
  });

  useEffect(() => {
    fetchMachines();
    if (initialData) {
      setFormData({
        equipment_id: initialData.equipment_id || '',
        assembly_name: initialData.assembly_name || '',
        assembly_code: initialData.assembly_code || '',
        assembly_category: initialData.assembly_category || '',
        description: initialData.description || '',
        criticality: initialData.criticality || 'medium',
        status: initialData.status || 'active'
      });
      if (initialData.assembly_image) {
        setImagePreview(initialData.assembly_image);
      }
    }
  }, [initialData]);

  const fetchMachines = async () => {
    try {
      const response = await api.get('/machines');
      setMachines(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    
    // Add all form fields to FormData
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        data.append(key, value.toString());
      }
    });
    
    // Add image file if selected
    const imageInput = document.querySelector('input[name="assembly_image"]') as HTMLInputElement;
    if (imageInput?.files?.[0]) {
      data.append('assembly_image', imageInput.files[0]);
    }

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Assembly Information</h2>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Location Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlantFacilitySelector
              selectedPlantId={formData.plant_id}
              selectedFacilityId={formData.facility_id}
              onPlantChange={(id) => setFormData(prev => ({ ...prev, plant_id: id, facility_id: undefined }))}
              onFacilityChange={(id) => setFormData(prev => ({ ...prev, facility_id: id || undefined }))}
              required={true}
              showFacility={true}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Machine *</label>
            <SearchableSelect
              name="equipment_id"
              value={formData.equipment_id}
              onChange={(value) => setFormData({ ...formData, equipment_id: value })}
              options={machines.map(machine => ({
                value: machine.id.toString(),
                label: `${machine.machine_name || machine.name || 'Unnamed Machine'} (${machine.machine_code || machine.id})`
              }))}
              placeholder="Select Machine"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Name *</label>
            <input
              type="text"
              name="assembly_name"
              value={formData.assembly_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Code</label>
            <input
              type="text"
              name="assembly_code"
              value={formData.assembly_code}
              onChange={handleChange}
              placeholder="Auto-generated if empty"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Category *</label>
            <SearchableSelect
              value={formData.assembly_category}
              onChange={(value) => setFormData({ ...formData, assembly_category: value })}
              options={[
                { id: 'mechanical', label: 'Mechanical' },
                { id: 'electrical', label: 'Electrical' },
                { id: 'hydraulic', label: 'Hydraulic' },
                { id: 'pneumatic', label: 'Pneumatic' },
                { id: 'electronic', label: 'Electronic' },
                { id: 'structural', label: 'Structural' },
                { id: 'other', label: 'Other' }
              ]}
              placeholder="Select Category"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Criticality *</label>
            <SearchableSelect
              value={formData.criticality}
              onChange={(value) => setFormData({ ...formData, criticality: value })}
              options={[
                { id: 'low', label: 'Low' },
                { id: 'medium', label: 'Medium' },
                { id: 'high', label: 'High' },
                { id: 'critical', label: 'Critical' }
              ]}
              placeholder="Select Criticality"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Image</label>
            <input
              type="file"
              name="assembly_image"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 h-32 w-32 object-cover rounded-lg" />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onCancel && onCancel()}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 transition-colors"
        >
          {loading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}
