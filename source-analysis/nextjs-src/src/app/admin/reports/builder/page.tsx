'use client';

import { useState } from 'react';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';

const TABLES = ['assets', 'work_orders', 'inventory', 'users', 'iot_devices', 'iot_metrics'];
const AGGREGATIONS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

export default function ReportBuilderPage() {
  const [reportName, setReportName] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState('');
  const [aggregation, setAggregation] = useState('');
  const [filters, setFilters] = useState<any[]>([]);

  const handleExport = () => {
    showToast.success('Report configuration exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: '=', value: '' }]);
  };

  const saveReport = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await api.post('/reports/custom')`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: reportName,
          query_config: {
            table: selectedTable,
            fields: selectedFields,
            groupBy,
            aggregation,
            filters
          }
        })
      });
      showToast.success('Custom report saved');
    } catch (error) {
      showToast.error('Failed to save report');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-base font-semibold">Custom Report Builder</h1>
        <button onClick={saveReport} className="px-4 py-2 bg-blue-600 text-white rounded">
          Save Report
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1">Report Name</label>
          <input
            type="text"
            value={reportName}
            onChange={e => setReportName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="My Custom Report"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Data Source</label>
          <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">Select table...</option>
            {TABLES.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Fields to Display</label>
          <div className="flex flex-wrap gap-2">
            {['id', 'name', 'status', 'created_at', 'updated_at'].map(field => (
              <button
                key={field}
                onClick={() => setSelectedFields(prev => 
                  prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
                )}
                className={`px-3 py-1 rounded ${selectedFields.includes(field) ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                {field}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">Group By</label>
            <input
              type="text"
              value={groupBy}
              onChange={e => setGroupBy(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="status"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Aggregation</label>
            <select value={aggregation} onChange={e => setAggregation(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">None</option>
              {AGGREGATIONS.map(agg => (
                <option key={agg} value={agg}>{agg}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Filters</label>
            <button onClick={addFilter} className="text-sm text-blue-600">+ Add Filter</button>
          </div>
          {filters.map((filter, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
              <input
                type="text"
                value={filter.field}
                onChange={e => {
                  const newFilters = [...filters];
                  newFilters[idx].field = e.target.value;
                  setFilters(newFilters);
                }}
                placeholder="Field"
                className="border rounded px-3 py-2"
              />
              <select
                value={filter.operator}
                onChange={e => {
                  const newFilters = [...filters];
                  newFilters[idx].operator = e.target.value;
                  setFilters(newFilters);
                }}
                className="border rounded px-3 py-2"
              >
                <option value="=">=</option>
                <option value="!=">!=</option>
                <option value=">">{'>'}</option>
                <option value="<">{'<'}</option>
                <option value="LIKE">LIKE</option>
              </select>
              <input
                type="text"
                value={filter.value}
                onChange={e => {
                  const newFilters = [...filters];
                  newFilters[idx].value = e.target.value;
                  setFilters(newFilters);
                }}
                placeholder="Value"
                className="border rounded px-3 py-2"
              />
              <button
                onClick={() => setFilters(filters.filter((_, i) => i !== idx))}
                className="text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
