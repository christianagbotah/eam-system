'use client';

import { useState } from 'react';
import SearchableSelect from '../SearchableSelect';

interface SurveyFormProps {
  runId: number;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export default function SurveyForm({ runId, onSubmit, loading = false }: SurveyFormProps) {
  const [surveyType, setSurveyType] = useState('quality_inspection');
  const [inspectorName, setInspectorName] = useState('');
  const [items, setItems] = useState([
    { parameter: '', specification: '', actual: '', status: 'pass', remarks: '' }
  ]);

  const addItem = () => setItems([...items, { parameter: '', specification: '', actual: '', status: 'pass', remarks: '' }]);
  
  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const surveyData = {
      survey_type: surveyType,
      inspector_name: inspectorName,
      inspection_date: new Date().toISOString().split('T')[0],
      items: items.filter(item => item.parameter)
    };
    onSubmit(surveyData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect
          value={surveyType}
          onChange={(val) => setSurveyType(val)}
          options={[
            { id: 'quality_inspection', label: 'Quality Inspection' },
            { id: 'performance_test', label: 'Performance Test' },
            { id: 'safety_inspection', label: 'Safety Inspection' }
          ]}
          placeholder="Select Survey Type"
          label="Survey Type"
        />
        <div>
          <label className="block text-sm font-medium mb-1">Inspector Name</label>
          <input type="text" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">Inspection Items</h3>
          <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800">+ Add Item</button>
        </div>
        
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="border rounded p-4 relative">
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 text-red-600 hover:text-red-800">×</button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Parameter" value={item.parameter} onChange={(e) => updateItem(index, 'parameter', e.target.value)} className="border rounded px-3 py-2 text-sm" required />
                <input type="text" placeholder="Specification" value={item.specification} onChange={(e) => updateItem(index, 'specification', e.target.value)} className="border rounded px-3 py-2 text-sm" />
                <input type="text" placeholder="Actual Value" value={item.actual} onChange={(e) => updateItem(index, 'actual', e.target.value)} className="border rounded px-3 py-2 text-sm" />
                <SearchableSelect
                  value={item.status}
                  onChange={(val) => updateItem(index, 'status', val)}
                  options={[
                    { id: 'pass', label: 'Pass' },
                    { id: 'fail', label: 'Fail' },
                    { id: 'na', label: 'N/A' }
                  ]}
                  placeholder="Status"
                />
                <input type="text" placeholder="Remarks" value={item.remarks} onChange={(e) => updateItem(index, 'remarks', e.target.value)} className="border rounded px-3 py-2 text-sm col-span-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
        {loading ? 'Submitting...' : 'Submit Survey'}
      </button>
    </form>
  );
}
