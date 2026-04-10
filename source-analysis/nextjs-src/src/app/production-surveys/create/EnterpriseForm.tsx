'use client';

import { useState } from 'react';

interface EnterpriseFormProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function EnterpriseForm({ formData, setFormData }: EnterpriseFormProps) {
  const [activeTab, setActiveTab] = useState('safety');

  const tabs = [
    { id: 'safety', label: '⚠️ Safety', icon: '🛡️' },
    { id: 'quality', label: '✅ Quality', icon: '✓' },
    { id: 'tools', label: '🔧 Tools', icon: '🔨' },
    { id: 'energy', label: '⚡ Energy', icon: '💡' },
    { id: 'changeover', label: '⏱️ Setup', icon: '🔄' },
    { id: 'performance', label: '📊 Performance', icon: '📈' }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-lg font-semibold mb-4">Enterprise Features</h2>
      
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'safety' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.safety_incident || false}
                onChange={(e) => setFormData({...formData, safety_incident: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="font-medium">Safety Incident Occurred</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.ppe_compliant !== false}
                onChange={(e) => setFormData({...formData, ppe_compliant: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="font-medium">PPE Compliant</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.loto_verified || false}
                onChange={(e) => setFormData({...formData, loto_verified: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="font-medium">LOTO Verified</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.environmental_incident || false}
                onChange={(e) => setFormData({...formData, environmental_incident: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="font-medium">Environmental Incident</label>
            </div>
          </div>
          {formData.safety_incident && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Incident Type</label>
                <select
                  value={formData.safety_incident_type || ''}
                  onChange={(e) => setFormData({...formData, safety_incident_type: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select type</option>
                  <option value="near_miss">Near Miss</option>
                  <option value="injury">Injury</option>
                  <option value="spill">Spill</option>
                  <option value="equipment_damage">Equipment Damage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Safety Notes *</label>
                <textarea
                  required
                  value={formData.safety_notes || ''}
                  onChange={(e) => setFormData({...formData, safety_notes: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Describe the incident..."
                />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-2">Scrap Quantity</label>
            <input
              type="number"
              min="0"
              value={formData.scrap_quantity || 0}
              onChange={(e) => setFormData({...formData, scrap_quantity: parseInt(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rework Quantity</label>
            <input
              type="number"
              min="0"
              value={formData.rework_quantity || 0}
              onChange={(e) => setFormData({...formData, rework_quantity: parseInt(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          {formData.scrap_quantity > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Scrap Reason *</label>
              <input
                type="text"
                required
                value={formData.scrap_reason || ''}
                onChange={(e) => setFormData({...formData, scrap_reason: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Batch Number</label>
            <input
              type="text"
              value={formData.batch_number || ''}
              onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Lot Number</label>
            <input
              type="text"
              value={formData.lot_number || ''}
              onChange={(e) => setFormData({...formData, lot_number: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.first_article_pass || false}
              onChange={(e) => setFormData({...formData, first_article_pass: e.target.checked})}
              className="w-4 h-4"
            />
            <label className="font-medium">First Article Inspection Pass</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.quality_hold || false}
              onChange={(e) => setFormData({...formData, quality_hold: e.target.checked})}
              className="w-4 h-4"
            />
            <label className="font-medium text-red-600">Quality Hold</label>
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Tools Changed (JSON)</label>
            <textarea
              value={formData.tools_changed || ''}
              onChange={(e) => setFormData({...formData, tools_changed: e.target.value})}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={3}
              placeholder='[{"tool": "Drill Bit #5", "qty": 2}]'
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Consumables Used (JSON)</label>
            <textarea
              value={formData.consumables_used || ''}
              onChange={(e) => setFormData({...formData, consumables_used: e.target.value})}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={3}
              placeholder='[{"item": "Coolant", "qty": 5, "unit": "liters"}]'
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cost Per Unit</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_per_unit || 0}
              onChange={(e) => setFormData({...formData, cost_per_unit: parseFloat(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      )}

      {activeTab === 'energy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-2">Power (kWh)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.power_consumption_kwh || 0}
              onChange={(e) => setFormData({...formData, power_consumption_kwh: parseFloat(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Compressed Air (m³)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.compressed_air_m3 || 0}
              onChange={(e) => setFormData({...formData, compressed_air_m3: parseFloat(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Water (liters)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.water_consumption_liters || 0}
              onChange={(e) => setFormData({...formData, water_consumption_liters: parseFloat(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gas (m³)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.gas_consumption_m3 || 0}
              onChange={(e) => setFormData({...formData, gas_consumption_m3: parseFloat(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Carbon Footprint (kg CO₂)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.carbon_footprint_kg || 0}
              onChange={(e) => setFormData({...formData, carbon_footprint_kg: parseFloat(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Energy Cost</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.energy_cost || 0}
              onChange={(e) => setFormData({...formData, energy_cost: parseFloat(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      )}

      {activeTab === 'changeover' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-2">Setup Start Time</label>
            <input
              type="time"
              value={formData.setup_start_time || ''}
              onChange={(e) => setFormData({...formData, setup_start_time: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Setup End Time</label>
            <input
              type="time"
              value={formData.setup_end_time || ''}
              onChange={(e) => setFormData({...formData, setup_end_time: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Previous Job</label>
            <input
              type="text"
              value={formData.previous_job || ''}
              onChange={(e) => setFormData({...formData, previous_job: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Next Job</label>
            <input
              type="text"
              value={formData.next_job || ''}
              onChange={(e) => setFormData({...formData, next_job: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Tooling Changeover Notes</label>
            <textarea
              value={formData.tooling_changeover_notes || ''}
              onChange={(e) => setFormData({...formData, tooling_changeover_notes: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-2">Target Units</label>
            <input
              type="number"
              min="0"
              value={formData.target_units || 0}
              onChange={(e) => setFormData({...formData, target_units: parseInt(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Target Cycle Time (sec)</label>
            <input
              type="number"
              min="0"
              value={formData.target_cycle_time_seconds || 0}
              onChange={(e) => setFormData({...formData, target_cycle_time_seconds: parseInt(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Actual Cycle Time (sec)</label>
            <input
              type="number"
              min="0"
              value={formData.actual_cycle_time_seconds || 0}
              onChange={(e) => setFormData({...formData, actual_cycle_time_seconds: parseInt(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Operator Skill Level</label>
            <select
              value={formData.skill_level || 'competent'}
              onChange={(e) => setFormData({...formData, skill_level: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="trainee">Trainee</option>
              <option value="competent">Competent</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.bonus_eligible || false}
              onChange={(e) => setFormData({...formData, bonus_eligible: e.target.checked})}
              className="w-4 h-4"
            />
            <label className="font-medium">Bonus Eligible</label>
          </div>
        </div>
      )}
    </div>
  );
}
