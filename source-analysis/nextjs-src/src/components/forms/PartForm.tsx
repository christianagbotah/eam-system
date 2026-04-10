'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/SearchableSelect';
import PlantFacilitySelector from './PlantFacilitySelector';
import api from '@/lib/api';

interface PartFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  initialData?: any;
  onCancel?: () => void;
}

export default function PartForm({ onSubmit, loading, initialData, onCancel }: PartFormProps) {
  const router = useRouter();
  const [machines, setMachines] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    plant_id: initialData?.plant_id,
    facility_id: initialData?.facility_id,
    machine_id: initialData?.machine_id || '',
    component_id: initialData?.component_id || '',
    parent_part_id: initialData?.parent_part_id || '',
    part_number: initialData?.part_number || '',
    part_code: initialData?.part_code || '',
    part_name: initialData?.part_name || '',
    part_category: initialData?.part_category || '',
    description: initialData?.description || '',
    manufacturer: initialData?.manufacturer || '',
    material: initialData?.material || '',
    dimensions: initialData?.dimensions || '',
    expected_lifespan: initialData?.expected_lifespan || '',
    spare_availability: initialData?.spare_availability || 'no',
    current_stock_qty: initialData?.current_stock_qty || '0',
    safety_notes: initialData?.safety_notes || '',
    failure_modes: initialData?.failure_modes || '',
    unit_cost: initialData?.unit_cost || '',
    status: initialData?.status || 'active'
  });

  useEffect(() => {
    fetchMachines();
    fetchParts();
    if (initialData) {
      setFormData({
        machine_id: initialData.machine_id || '',
        component_id: initialData.component_id || '',
        parent_part_id: initialData.parent_part_id || '',
        part_number: initialData.part_number || '',
        part_code: initialData.part_code || '',
        part_name: initialData.part_name || '',
        part_category: initialData.part_category || '',
        description: initialData.description || '',
        manufacturer: initialData.manufacturer || '',
        material: initialData.material || '',
        dimensions: initialData.dimensions || '',
        expected_lifespan: initialData.expected_lifespan || '',
        spare_availability: initialData.spare_availability || 'no',
        current_stock_qty: initialData.current_stock_qty || '0',
        safety_notes: initialData.safety_notes || '',
        failure_modes: initialData.failure_modes || '',
        unit_cost: initialData.unit_cost || '',
        status: initialData.status || 'active'
      });
      if (initialData.part_image) {
        setImagePreview(initialData.part_image);
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (formData.machine_id) {
      setAssemblies([]); // Clear assemblies first
      fetchAssemblies(formData.machine_id);
    } else {
      setAssemblies([]);
    }
  }, [formData.machine_id]);

  const fetchMachines = async () => {
    try {
      const response = await api.get('/machines');
      setMachines(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchAssemblies = async (machineId: string) => {
    try {
      const response = await api.get(`/assemblies?equipment_id=${machineId}`);
      setAssemblies(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching assemblies:', error);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await api.get('/parts');
      setParts(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
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
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));
    
    const imageInput = document.querySelector('input[name="part_image"]') as HTMLInputElement;
    if (imageInput?.files?.[0]) {
      data.append('part_image', imageInput.files[0]);
    }

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Location Assignment */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Location Assignment</h2>
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
      
      {/* Part Hierarchy Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Part Hierarchy</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine *</label>
            <SearchableSelect
              value={formData.machine_id}
              onChange={(value) => setFormData({ ...formData, machine_id: value })}
              options={machines.map(machine => ({
                id: String(machine.id),
                label: `${machine.machine_name || machine.asset_name || machine.name} (${machine.machine_code || machine.asset_code || machine.id})`
              }))}
              placeholder="Select Machine"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assembly *</label>
              <SearchableSelect
                value={formData.component_id}
                onChange={(value) => setFormData({ ...formData, component_id: value })}
                options={assemblies.length > 0 ? assemblies.map(assembly => ({
                  id: String(assembly.id),
                  label: `${assembly.assembly_name} (${assembly.assembly_code})`
                })) : []}
                placeholder={formData.machine_id ? "Select Assembly" : "Select Machine first"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Part (Optional - for sub-parts)</label>
              <SearchableSelect
                value={formData.parent_part_id}
                onChange={(value) => setFormData({ ...formData, parent_part_id: value })}
                options={[
                  { id: '', label: 'None (Top-level part)' },
                  ...parts.map(part => ({
                    id: String(part.id),
                    label: `${part.part_name} (${part.part_number})`
                  }))
                ]}
                placeholder="Select Parent Part"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Part Information Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Part Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Number *</label>
            <input
              type="text"
              name="part_number"
              value={formData.part_number}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Name *</label>
            <input
              type="text"
              name="part_name"
              value={formData.part_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Code</label>
            <input
              type="text"
              name="part_code"
              value={formData.part_code}
              onChange={handleChange}
              placeholder="Auto-generated if empty"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Category *</label>
            <SearchableSelect
              value={formData.part_category}
              onChange={(value) => setFormData({ ...formData, part_category: value })}
              options={[
                { id: '', label: 'Select Category' },
                { id: 'bearing', label: 'Bearing' },
                { id: 'motor', label: 'Motor' },
                { id: 'sensor', label: 'Sensor' },
                { id: 'valve', label: 'Valve' },
                { id: 'pump', label: 'Pump' },
                { id: 'belt', label: 'Belt' },
                { id: 'gear', label: 'Gear' },
                { id: 'seal', label: 'Seal' },
                { id: 'filter', label: 'Filter' },
                { id: 'electrical', label: 'Electrical Component' },
                { id: 'fastener', label: 'Fastener' },
                { id: 'other', label: 'Other' }
              ]}
              placeholder="Select Category"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <input
              type="text"
              name="material"
              value={formData.material}
              onChange={handleChange}
              placeholder="e.g., Stainless Steel, Aluminum"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
            <input
              type="text"
              name="dimensions"
              value={formData.dimensions}
              onChange={handleChange}
              placeholder="e.g., 50mm x 30mm x 20mm"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Lifespan</label>
            <input
              type="text"
              name="expected_lifespan"
              value={formData.expected_lifespan}
              onChange={handleChange}
              placeholder="e.g., 5000 hours, 10000 cycles"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
            <input
              type="number"
              step="0.01"
              name="unit_cost"
              value={formData.unit_cost}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="obsolete">Obsolete</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Image</label>
            <input
              type="file"
              name="part_image"
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

      {/* Inventory & Safety Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Inventory & Safety</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spare Availability *</label>
            <select
              name="spare_availability"
              value={formData.spare_availability}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock Quantity</label>
            <input
              type="number"
              name="current_stock_qty"
              value={formData.current_stock_qty}
              onChange={handleChange}
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Safety Notes</label>
            <textarea
              name="safety_notes"
              value={formData.safety_notes}
              onChange={handleChange}
              rows={2}
              placeholder="Safety precautions and handling instructions"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Failure Modes</label>
            <textarea
              name="failure_modes"
              value={formData.failure_modes}
              onChange={handleChange}
              rows={3}
              placeholder="Common failure modes and symptoms"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
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
