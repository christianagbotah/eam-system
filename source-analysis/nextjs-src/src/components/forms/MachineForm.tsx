'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Machine, MachineFormData } from '@/types/asset';
import PlantFacilitySelector from './PlantFacilitySelector';

type TabType = 'basic' | 'technical' | 'financial' | 'maintenance' | 'safety' | 'lifecycle';

interface MachineFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  initialData?: Machine;
  onCancel?: () => void;
}

export default function MachineForm({ onSubmit, loading, initialData, onCancel }: MachineFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState<MachineFormData>({
    machine_name: initialData?.machine_name || '',
    machine_code: initialData?.machine_code || '',
    machine_category: initialData?.machine_category || '',
    model: initialData?.model || '',
    manufacturer: initialData?.manufacturer || '',
    serial_number: initialData?.serial_number || '',
    plant_location: initialData?.plant_location || '',
    department: initialData?.department || '',
    description: initialData?.description || '',
    installation_date: initialData?.installation_date || '',
    purchase_date: initialData?.purchase_date || '',
    warranty_expiry: initialData?.warranty_expiry || '',
    status: (initialData?.status as 'active' | 'inactive' | 'out_of_service') || 'active',
    criticality: (initialData?.criticality as 'low' | 'medium' | 'high' | 'critical') || 'medium',
    plant_id: initialData?.plant_id || undefined,
    facility_id: initialData?.facility_id || undefined
  });

  const handlePlantChange = (plantId: number) => {
    setFormData(prev => ({ ...prev, plant_id: plantId, facility_id: undefined }));
  };

  const handleFacilityChange = (facilityId: number | null) => {
    setFormData(prev => ({ ...prev, facility_id: facilityId || undefined }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'pm_frequency' ? (value ? parseInt(value) : undefined) : value 
    }));
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
    
    const imageInput = document.querySelector('input[name="machine_photo"]') as HTMLInputElement;
    if (imageInput?.files?.[0]) {
      data.append('machine_photo', imageInput.files[0]);
    }

    await onSubmit(data);
  };

  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Information', icon: '📋' },
    { id: 'technical' as TabType, label: 'Technical Specs', icon: '⚙️' },
    { id: 'financial' as TabType, label: 'Financial Data', icon: '💰' },
    { id: 'maintenance' as TabType, label: 'Maintenance', icon: '🔧' },
    { id: 'safety' as TabType, label: 'Safety & Compliance', icon: '🛡️' },
    { id: 'lifecycle' as TabType, label: 'Lifecycle', icon: '📅' },
  ];
  
  const [showIntegrationHint, setShowIntegrationHint] = useState(false);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      {/* Basic Information Tab */}
      {activeTab === 'basic' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Machine Information</h2>
        
        {/* Plant & Facility Selection - Prominent Position */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-800">Location Assignment</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlantFacilitySelector
              selectedPlantId={formData.plant_id}
              selectedFacilityId={formData.facility_id}
              onPlantChange={handlePlantChange}
              onFacilityChange={handleFacilityChange}
              required={true}
              showFacility={true}
            />
          </div>
          <p className="mt-2 text-xs text-gray-600">
            💡 Machine will be assigned to the selected plant. Facility is optional for more specific location tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Name *</label>
            <input
              type="text"
              name="machine_name"
              value={formData.machine_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Code / Asset ID *</label>
            <input
              type="text"
              name="machine_code"
              value={formData.machine_code || ''}
              onChange={handleChange}
              placeholder="Auto-generated if empty"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Category *</label>
            <select
              name="machine_category"
              value={formData.machine_category || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Category</option>
              <option value="production">Production Equipment</option>
              <option value="packaging">Packaging Machine</option>
              <option value="material_handling">Material Handling</option>
              <option value="quality_control">Quality Control</option>
              <option value="utility">Utility Equipment</option>
              <option value="hvac">HVAC System</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              name="model"
              value={formData.model || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
            <input
              type="text"
              name="serial_number"
              value={formData.serial_number || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plant / Facility Location *</label>
            <input
              type="text"
              name="plant_location"
              value={formData.plant_location || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
            <select
              name="department"
              value={formData.department || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Department</option>
              <option value="Production">Production</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Quality Control">Quality Control</option>
              <option value="Packaging">Packaging</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Utilities">Utilities</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operation Type *</label>
            <select
              name="operation_type"
              value={formData.operation_type || 'continuous'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="continuous">Continuous</option>
              <option value="batch">Batch</option>
              <option value="manual">Manual</option>
              <option value="automated">Automated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
            <input
              type="date"
              name="purchase_date"
              value={formData.purchase_date || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Installation Date</label>
            <input
              type="date"
              name="installation_date"
              value={formData.installation_date || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
            <input
              type="date"
              name="warranty_expiry"
              value={formData.warranty_expiry || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Photo</label>
            <input
              type="file"
              name="machine_photo"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 h-32 w-32 object-cover rounded-lg" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <select
              name="status"
              value={formData.status || 'active'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_service">Out of Service</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Class</label>
            <select
              name="asset_class"
              value={formData.asset_class || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Asset Class</option>
              <option value="rotating">Rotating Equipment</option>
              <option value="static">Static Equipment</option>
              <option value="electrical">Electrical</option>
              <option value="instrumentation">Instrumentation</option>
              <option value="civil">Civil/Structural</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Functional Location</label>
            <input
              type="text"
              name="functional_location"
              value={formData.functional_location || ''}
              onChange={handleChange}
              placeholder="e.g., PLANT-AREA-LINE"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Center</label>
            <input
              type="text"
              name="cost_center"
              value={formData.cost_center || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Production Line</label>
            <input
              type="text"
              name="production_line"
              value={formData.production_line || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      )}

      {/* Technical Specification Tab */}
      {activeTab === 'technical' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Technical Specifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rated Power (kW)</label>
            <input
              type="text"
              name="rated_power"
              value={formData.rated_power || ''}
              onChange={handleChange}
              placeholder="e.g., 75 kW"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voltage (V)</label>
            <input
              type="text"
              name="voltage"
              value={formData.voltage || ''}
              onChange={handleChange}
              placeholder="e.g., 380V"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input
              type="text"
              name="capacity"
              value={formData.capacity || ''}
              onChange={handleChange}
              placeholder="e.g., 1000 units/hr"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Time (seconds)</label>
            <input
              type="text"
              name="cycle_time"
              value={formData.cycle_time || ''}
              onChange={handleChange}
              placeholder="e.g., 3.6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Speed / Throughput</label>
            <input
              type="text"
              name="speed_throughput"
              value={formData.speed_throughput || ''}
              onChange={handleChange}
              placeholder="e.g., 120 m/min"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Criticality *</label>
            <select
              name="criticality"
              value={formData.criticality || 'medium'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Weight</label>
            <input
              type="text"
              name="operating_weight"
              value={formData.operating_weight || ''}
              onChange={handleChange}
              placeholder="e.g., 5000 kg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions (L x W x H)</label>
            <input
              type="text"
              name="dimensions"
              value={formData.dimensions || ''}
              onChange={handleChange}
              placeholder="e.g., 5m x 3m x 2.5m"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Temperature Range</label>
            <input
              type="text"
              name="operating_temperature_range"
              value={formData.operating_temperature_range || ''}
              onChange={handleChange}
              placeholder="e.g., -10°C to 50°C"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Pressure</label>
            <input
              type="text"
              name="operating_pressure"
              value={formData.operating_pressure || ''}
              onChange={handleChange}
              placeholder="e.g., 10 bar"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      )}

      {/* Financial Data Tab */}
      {activeTab === 'financial' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Financial Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Cost</label>
            <input
              type="number"
              step="0.01"
              name="acquisition_cost"
              value={formData.acquisition_cost || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
            <input
              type="number"
              step="0.01"
              name="current_value"
              value={formData.current_value || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Method</label>
            <select
              name="depreciation_method"
              value={formData.depreciation_method || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Method</option>
              <option value="straight_line">Straight Line</option>
              <option value="declining_balance">Declining Balance</option>
              <option value="units_of_production">Units of Production</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (Years)</label>
            <input
              type="number"
              name="useful_life_years"
              value={formData.useful_life_years || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salvage Value</label>
            <input
              type="number"
              step="0.01"
              name="salvage_value"
              value={formData.salvage_value || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MTBF (Hours)</label>
            <input
              type="number"
              step="0.01"
              name="mtbf_hours"
              value={formData.mtbf_hours || ''}
              onChange={handleChange}
              placeholder="Mean Time Between Failures"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MTTR (Hours)</label>
            <input
              type="number"
              step="0.01"
              name="mttr_hours"
              value={formData.mttr_hours || ''}
              onChange={handleChange}
              placeholder="Mean Time To Repair"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Design Life (Years)</label>
            <input
              type="number"
              name="design_life_years"
              value={formData.design_life_years || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OEE Target (%)</label>
            <input
              type="number"
              step="0.01"
              name="oee_target"
              value={formData.oee_target || ''}
              onChange={handleChange}
              placeholder="Overall Equipment Effectiveness"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Planned Date</label>
            <input
              type="date"
              name="replacement_planned_date"
              value={formData.replacement_planned_date || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Cost Estimate</label>
            <input
              type="number"
              step="0.01"
              name="replacement_cost_estimate"
              value={formData.replacement_cost_estimate || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      )}

      {/* Maintenance Configuration Tab */}
      {activeTab === 'maintenance' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Maintenance Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Strategy *</label>
            <select
              name="maintenance_strategy"
              value={formData.maintenance_strategy || 'time-based'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="time-based">Time-based</option>
              <option value="usage-based">Usage-based</option>
              <option value="condition-based">Condition-based</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Alerts</label>
            <select
              name="warranty_alerts"
              value={formData.warranty_alerts || 'no'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Technician Group</label>
            <input
              type="text"
              name="default_technician_group"
              value={formData.default_technician_group || ''}
              onChange={handleChange}
              placeholder="e.g., Mechanical Team"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PM Frequency (days)</label>
            <input
              type="number"
              name="pm_frequency"
              value={formData.pm_frequency?.toString() || ''}
              onChange={handleChange}
              placeholder="e.g., 30"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage Unit *</label>
            <select
              name="usage_unit"
              value={formData.usage_unit || 'hours'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="hours">Hours</option>
              <option value="cycles">Cycles</option>
              <option value="meters">Meters</option>
              <option value="quantity_produced">Quantity Produced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calibration Required</label>
            <select
              name="calibration_required"
              value={formData.calibration_required || 'no'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calibration Frequency (Days)</label>
            <input
              type="number"
              name="calibration_frequency_days"
              value={formData.calibration_frequency_days || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Redundancy Available</label>
            <select
              name="redundancy_available"
              value={formData.redundancy_available || 'no'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Downtime Impact</label>
            <select
              name="downtime_impact"
              value={formData.downtime_impact || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Impact</option>
              <option value="production_stop">Production Stop</option>
              <option value="reduced_capacity">Reduced Capacity</option>
              <option value="quality_impact">Quality Impact</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
        </div>
      </div>
      )}

      {/* Safety & Compliance Tab */}
      {activeTab === 'safety' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Safety & Compliance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Safety Class</label>
            <select
              name="safety_class"
              value={formData.safety_class || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Safety Class</option>
              <option value="class_1">Class 1 - High Risk</option>
              <option value="class_2">Class 2 - Medium Risk</option>
              <option value="class_3">Class 3 - Low Risk</option>
              <option value="non_classified">Non-Classified</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hazardous Area Classification</label>
            <input
              type="text"
              name="hazardous_area_classification"
              value={formData.hazardous_area_classification || ''}
              onChange={handleChange}
              placeholder="e.g., Zone 1, Division 2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permit Required</label>
            <select
              name="permit_required"
              value={formData.permit_required || 'no'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lockout/Tagout Required</label>
            <select
              name="lockout_tagout_required"
              value={formData.lockout_tagout_required || 'no'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">PPE Requirements</label>
            <textarea
              name="ppe_requirements"
              value={formData.ppe_requirements || ''}
              onChange={handleChange}
              rows={3}
              placeholder="e.g., Safety glasses, gloves, hearing protection"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      )}

      {/* Lifecycle Tab */}
      {activeTab === 'lifecycle' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Lifecycle Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commissioning Date</label>
            <input
              type="date"
              name="commissioning_date"
              value={formData.commissioning_date || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Type</label>
            <select
              name="warranty_type"
              value={formData.warranty_type || 'none'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="none">None</option>
              <option value="manufacturer">Manufacturer Warranty</option>
              <option value="extended">Extended Warranty</option>
              <option value="service_contract">Service Contract</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Contract Number</label>
            <input
              type="text"
              name="service_contract_number"
              value={formData.service_contract_number || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Contract Expiry</label>
            <input
              type="date"
              name="service_contract_expiry"
              value={formData.service_contract_expiry || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Installation Notes</label>
            <textarea
              name="installation_notes"
              value={formData.installation_notes || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
            <textarea
              name="special_instructions"
              value={formData.special_instructions || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      )}

      {/* Integration Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">IoT & ERP Integration</h4>
            <p className="text-sm text-blue-700 mb-2">
              After creating this machine, you can configure:
            </p>
            <ul className="text-sm text-blue-600 space-y-1 ml-4">
              <li>• <strong>IoT Monitoring:</strong> Sensors, alerts, and real-time data (auto-enabled for critical machines)</li>
              <li>• <strong>ERP Sync:</strong> Automatic sync to financial system (queued automatically)</li>
              <li>• <strong>Predictive Maintenance:</strong> AI-powered failure prediction</li>
            </ul>
            <p className="text-xs text-blue-500 mt-2">
              💡 These integrations are configured separately by system administrators
            </p>
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
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
}
