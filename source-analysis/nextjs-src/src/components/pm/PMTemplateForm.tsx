'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PMTemplate } from '@/services/pmService';
import PMTriggerEditor from './PMTriggerEditor';
import PMChecklistBuilder from './PMChecklistBuilder';
import SearchableSelect from '../SearchableSelect';

interface PMTemplateFormProps {
  initialData?: PMTemplate;
  onSubmit: (data: any) => void;
  loading: boolean;
  onCancel: () => void;
}

export default function PMTemplateForm({ initialData, onSubmit, loading, onCancel }: PMTemplateFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [triggers, setTriggers] = useState(initialData?.triggers || []);
  const [checklists, setChecklists] = useState(initialData?.checklists || []);
  const [assetType, setAssetType] = useState(initialData?.asset_node_type || 'machine');
  const [maintenanceType, setMaintenanceType] = useState(initialData?.maintenance_type || 'inspection');
  const [priority, setPriority] = useState(initialData?.priority || 'medium');

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      asset_node_type: initialData?.asset_node_type || 'machine',
      asset_node_id: initialData?.asset_node_id || '',
      maintenance_type: initialData?.maintenance_type || 'inspection',
      priority: initialData?.priority || 'medium',
      estimated_hours: initialData?.estimated_hours || 1,
      active: initialData?.active ?? true
    }
  });

  const steps = [
    { id: 1, title: 'Basic Info', description: 'Template details' },
    { id: 2, title: 'Triggers', description: 'When to execute' },
    { id: 3, title: 'Checklists', description: 'Tasks to perform' },
    { id: 4, title: 'Review', description: 'Confirm details' }
  ];

  const onFormSubmit = (data: any) => {
    const payload = {
      ...data,
      asset_node_type: assetType,
      maintenance_type: maintenanceType,
      priority: priority,
      triggers,
      checklists
    };
    onSubmit(payload);
  };

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, 4));
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1));

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Step Indicator */}
      <div className="px-6 py-4 border-b">
        <nav className="flex space-x-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center ${
                step.id === currentStep
                  ? 'text-blue-600'
                  : step.id < currentStep
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step.id === currentStep
                    ? 'border-blue-600 bg-blue-50'
                    : step.id < currentStep
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300'
                }`}
              >
                {step.id < currentStep ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs">{step.description}</div>
              </div>
            </div>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <input
                    {...register('title', { required: 'Title is required' })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter template title"
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>

                <SearchableSelect
                  value={assetType}
                  onChange={(val) => setAssetType(val)}
                  options={[
                    { id: 'machine', label: 'Machine' },
                    { id: 'assembly', label: 'Assembly' },
                    { id: 'part', label: 'Part' },
                    { id: 'subpart', label: 'Subpart' }
                  ]}
                  placeholder="Select Asset Type"
                  label="Asset Type"
                />

                <SearchableSelect
                  value={maintenanceType}
                  onChange={(val) => setMaintenanceType(val)}
                  options={[
                    { id: 'inspection', label: 'Inspection' },
                    { id: 'lubrication', label: 'Lubrication' },
                    { id: 'replace', label: 'Replace' },
                    { id: 'clean', label: 'Clean' },
                    { id: 'calibration', label: 'Calibration' },
                    { id: 'other', label: 'Other' }
                  ]}
                  placeholder="Select Maintenance Type"
                  label="Maintenance Type"
                />

                <SearchableSelect
                  value={priority}
                  onChange={(val) => setPriority(val)}
                  options={[
                    { id: 'low', label: 'Low' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'high', label: 'High' },
                    { id: 'critical', label: 'Critical' }
                  ]}
                  placeholder="Select Priority"
                  label="Priority"
                />

                <div>
                  <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    {...register('estimated_hours', { min: 0 })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Asset ID</label>
                  <input
                    type="number"
                    {...register('asset_node_id')}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Optional asset ID"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter template description"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('active')}
                  className="mr-2"
                />
                <label className="text-sm font-medium">Active</label>
              </div>
            </div>
          )}

          {/* Step 2: Triggers */}
          {currentStep === 2 && (
            <PMTriggerEditor
              triggers={triggers}
              onChange={setTriggers}
            />
          )}

          {/* Step 3: Checklists */}
          {currentStep === 3 && (
            <PMChecklistBuilder
              checklists={checklists}
              onChange={setChecklists}
            />
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Review Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div><dt className="font-medium">Title:</dt><dd>{watch('title')}</dd></div>
                    <div><dt className="font-medium">Asset Type:</dt><dd className="capitalize">{watch('asset_node_type')}</dd></div>
                    <div><dt className="font-medium">Maintenance Type:</dt><dd className="capitalize">{watch('maintenance_type')}</dd></div>
                    <div><dt className="font-medium">Priority:</dt><dd className="capitalize">{watch('priority')}</dd></div>
                    <div><dt className="font-medium">Estimated Hours:</dt><dd>{watch('estimated_hours')}h</dd></div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Configuration</h4>
                  <div className="text-sm space-y-2">
                    <div>Triggers: {triggers.length}</div>
                    <div>Checklists: {checklists.length}</div>
                    <div>Total Items: {checklists.reduce((sum, cl) => sum + (cl.items?.length || 0), 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Previous
              </button>
            )}
          </div>
          <div className="space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : initialData ? 'Update Template' : 'Create Template'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
