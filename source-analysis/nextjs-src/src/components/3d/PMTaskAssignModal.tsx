'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Wrench } from 'lucide-react';

interface Hotspot {
  id: number;
  label: string;
  node_type: 'machine' | 'assembly' | 'part' | 'subpart';
  node_id: number;
  node_data?: any;
}

interface PMTemplate {
  id: number;
  name: string;
  description: string;
  estimated_duration: number;
  frequency_type: string;
}

interface PMTaskAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotspot: Hotspot | null;
  onAssign: (data: {
    hotspot_id: number;
    pm_template_id: number;
    frequency_days: number;
    assigned_technician?: number;
    priority?: string;
    notes?: string;
  }) => Promise<void>;
}

export default function PMTaskAssignModal({
  isOpen,
  onClose,
  hotspot,
  onAssign
}: PMTaskAssignModalProps) {
  const [pmTemplates, setPmTemplates] = useState<PMTemplate[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pm_template_id: 0,
    frequency_days: 30,
    assigned_technician: 0,
    priority: 'medium',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPMTemplates();
      loadTechnicians();
    }
  }, [isOpen]);

  const loadPMTemplates = async () => {
    try {
      // TODO: Replace with actual API call
      const mockTemplates: PMTemplate[] = [
        {
          id: 1,
          name: 'Basic Inspection',
          description: 'Visual inspection and basic checks',
          estimated_duration: 30,
          frequency_type: 'days'
        },
        {
          id: 2,
          name: 'Lubrication Service',
          description: 'Lubricate moving parts and check oil levels',
          estimated_duration: 45,
          frequency_type: 'days'
        },
        {
          id: 3,
          name: 'Calibration Check',
          description: 'Verify calibration and adjust if necessary',
          estimated_duration: 60,
          frequency_type: 'days'
        }
      ];
      setPmTemplates(mockTemplates);
    } catch (error) {
      console.error('Failed to load PM templates:', error);
    }
  };

  const loadTechnicians = async () => {
    try {
      // TODO: Replace with actual API call
      const mockTechnicians = [
        { id: 1, name: 'John Smith', specialization: 'Mechanical' },
        { id: 2, name: 'Jane Doe', specialization: 'Electrical' },
        { id: 3, name: 'Mike Johnson', specialization: 'Hydraulic' }
      ];
      setTechnicians(mockTechnicians);
    } catch (error) {
      console.error('Failed to load technicians:', error);
    }
  };

  if (!isOpen || !hotspot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pm_template_id) {
      alert('Please select a PM template');
      return;
    }

    setLoading(true);
    try {
      await onAssign({
        hotspot_id: hotspot.id,
        pm_template_id: formData.pm_template_id,
        frequency_days: formData.frequency_days,
        assigned_technician: formData.assigned_technician || undefined,
        priority: formData.priority,
        notes: formData.notes || undefined
      });
      
      // Reset form
      setFormData({
        pm_template_id: 0,
        frequency_days: 30,
        assigned_technician: 0,
        priority: 'medium',
        notes: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to assign PM task:', error);
      alert('Failed to assign PM task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = pmTemplates.find(t => t.id === formData.pm_template_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Assign PM Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Hotspot Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Target Component</h3>
            <div className="text-sm text-gray-600">
              <div><strong>Label:</strong> {hotspot.label}</div>
              <div><strong>Type:</strong> {hotspot.node_type}</div>
              <div><strong>ID:</strong> {hotspot.node_id}</div>
            </div>
          </div>

          {/* PM Template Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Wrench size={16} className="inline mr-1" />
              PM Template
            </label>
            <select
              value={formData.pm_template_id}
              onChange={(e) => setFormData({ ...formData, pm_template_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value={0}>Select a PM template...</option>
              {pmTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.estimated_duration}min)
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="mt-2 text-sm text-gray-600">
                {selectedTemplate.description}
              </div>
            )}
          </div>

          {/* Frequency */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Frequency (Days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.frequency_days}
              onChange={(e) => setFormData({ ...formData, frequency_days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="mt-1 text-sm text-gray-500">
              Next due: {new Date(Date.now() + formData.frequency_days * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </div>
          </div>

          {/* Assigned Technician */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User size={16} className="inline mr-1" />
              Assigned Technician (Optional)
            </label>
            <select
              value={formData.assigned_technician}
              onChange={(e) => setFormData({ ...formData, assigned_technician: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Auto-assign</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} ({tech.specialization})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional instructions or notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.pm_template_id}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Clock size={16} />
                  Assign PM Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
