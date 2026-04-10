'use client';

import { useState } from 'react';
import { PMTrigger } from '@/services/pmService';

interface PMTriggerEditorProps {
  triggers: PMTrigger[];
  onChange: (triggers: PMTrigger[]) => void;
}

export default function PMTriggerEditor({ triggers, onChange }: PMTriggerEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newTrigger, setNewTrigger] = useState<PMTrigger>({
    trigger_type: 'time',
    period_days: 30
  });

  const addTrigger = () => {
    onChange([...triggers, { ...newTrigger }]);
    setNewTrigger({ trigger_type: 'time', period_days: 30 });
  };

  const updateTrigger = (index: number, trigger: PMTrigger) => {
    const updated = [...triggers];
    updated[index] = trigger;
    onChange(updated);
    setEditingIndex(null);
  };

  const removeTrigger = (index: number) => {
    onChange(triggers.filter((_, i) => i !== index));
  };

  const TriggerForm = ({ trigger, onSave, onCancel }: {
    trigger: PMTrigger;
    onSave: (trigger: PMTrigger) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState(trigger);

    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Trigger Type</label>
            <select
              value={formData.trigger_type}
              onChange={(e) => setFormData({
                ...formData,
                trigger_type: e.target.value as PMTrigger['trigger_type']
              })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="time">Time-based</option>
              <option value="usage">Usage-based</option>
              <option value="production">Production-based</option>
              <option value="event">Event-based</option>
            </select>
          </div>

          {formData.trigger_type === 'time' && (
            <div>
              <label className="block text-sm font-medium mb-1">Period (Days)</label>
              <input
                type="number"
                value={formData.period_days || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  period_days: parseInt(e.target.value) || undefined
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="30"
              />
            </div>
          )}

          {formData.trigger_type === 'usage' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Meter ID</label>
                <input
                  type="number"
                  value={formData.usage_meter_id || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    usage_meter_id: parseInt(e.target.value) || undefined
                  })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Usage Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.usage_threshold || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    usage_threshold: parseFloat(e.target.value) || undefined
                  })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="1000"
                />
              </div>
            </>
          )}

          {formData.trigger_type === 'production' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Production Metric</label>
                <input
                  type="text"
                  value={formData.production_metric || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    production_metric: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="produced_qty"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.usage_threshold || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    usage_threshold: parseFloat(e.target.value) || undefined
                  })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="5000"
                />
              </div>
            </>
          )}

          {formData.trigger_type === 'event' && (
            <div>
              <label className="block text-sm font-medium mb-1">Event Name</label>
              <input
                type="text"
                value={formData.event_name || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  event_name: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="after_breakdown"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">PM Triggers</h3>
        <p className="text-sm text-gray-600">Configure when this PM should be executed</p>
      </div>

      {/* Existing Triggers */}
      <div className="space-y-3">
        {triggers.map((trigger, index) => (
          <div key={index}>
            {editingIndex === index ? (
              <TriggerForm
                trigger={trigger}
                onSave={(updatedTrigger) => updateTrigger(index, updatedTrigger)}
                onCancel={() => setEditingIndex(null)}
              />
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium capitalize">{trigger.trigger_type}</div>
                  <div className="text-sm text-gray-600">
                    {trigger.trigger_type === 'time' && `Every ${trigger.period_days} days`}
                    {trigger.trigger_type === 'usage' && `Every ${trigger.usage_threshold} units (Meter ${trigger.usage_meter_id})`}
                    {trigger.trigger_type === 'production' && `Every ${trigger.usage_threshold} ${trigger.production_metric}`}
                    {trigger.trigger_type === 'event' && trigger.event_name}
                  </div>
                </div>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingIndex(index)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTrigger(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Trigger */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Add New Trigger</h4>
        <TriggerForm
          trigger={newTrigger}
          onSave={addTrigger}
          onCancel={() => setNewTrigger({ trigger_type: 'time', period_days: 30 })}
        />
      </div>
    </div>
  );
}
