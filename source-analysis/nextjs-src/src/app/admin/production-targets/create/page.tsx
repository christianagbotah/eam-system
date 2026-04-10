'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';

interface TargetRow {
  id: string;
  machine_id: string;
  shift_id: string;
  operator_ids: string[];
  target_date: string;
  target_quantity: string;
  target_unit: string;
}

export default function CreateProductionTarget() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [targets, setTargets] = useState<TargetRow[]>([
    {
      id: Date.now().toString(),
      machine_id: '',
      shift_id: '',
      operator_ids: [],
      target_date: new Date().toISOString().split('T')[0],
      target_quantity: '',
      target_unit: 'yards'
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [machinesRes, shiftsRes, operatorsRes] = await Promise.all([
        api.get('/machines').catch(() => ({ data: { data: [] } })),
        api.get('/shifts').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);
      setMachines(machinesRes.data?.data || []);
      setShifts(shiftsRes.data?.data || []);
      setOperators(operatorsRes.data?.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getAvailableMachines = (currentRowId: string) => {
    const selectedMachineIds = targets
      .filter(t => t.id !== currentRowId && t.machine_id)
      .map(t => t.machine_id);
    return machines.filter((m: any) => !selectedMachineIds.includes(m.id.toString()));
  };

  const getAvailableOperators = (currentRowId: string) => {
    // Get operators already assigned to OTHER machines (not current row)
    const selectedOperatorIds = targets
      .filter(t => t.id !== currentRowId)
      .flatMap(t => t.operator_ids);
    
    // Get operators already selected in current row
    const currentRow = targets.find(t => t.id === currentRowId);
    const currentRowOperatorIds = currentRow?.operator_ids || [];
    
    // Filter out operators assigned to other machines OR already in current row
    return operators.filter((o: any) => 
      !selectedOperatorIds.includes(o.id.toString()) && 
      !currentRowOperatorIds.includes(o.id.toString())
    );
  };

  const addRow = () => {
    setTargets([...targets, {
      id: Date.now().toString(),
      machine_id: '',
      shift_id: '',
      operator_ids: [],
      target_date: new Date().toISOString().split('T')[0],
      target_quantity: '',
      target_unit: 'yards'
    }]);
  };

  const removeRow = (id: string) => {
    if (targets.length > 1) {
      setTargets(targets.filter(t => t.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof TargetRow, value: any) => {
    setTargets(targets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const toggleOperator = (rowId: string, operatorId: string) => {
    setTargets(targets.map(t => {
      if (t.id === rowId) {
        const ids = t.operator_ids.includes(operatorId)
          ? t.operator_ids.filter(id => id !== operatorId)
          : [...t.operator_ids, operatorId];
        return { ...t, operator_ids: ids };
      }
      return t;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all rows
    const invalidRows = targets.filter(t => 
      !t.machine_id || !t.shift_id || t.operator_ids.length === 0 || !t.target_quantity
    );
    
    if (invalidRows.length > 0) {
      showToast.error('Please fill all required fields in all rows');
      return;
    }

    setLoading(true);
    const loadingToast = showToast.loading(`Creating ${targets.length} production target(s)...`);

    try {
      // Create targets for each operator in each row
      const promises = targets.flatMap(target => 
        target.operator_ids.map(operator_id =>
          api.post('/production-tracking/set-target', {
            machine_id: target.machine_id,
            shift_id: target.shift_id,
            operator_id,
            target_date: target.target_date,
            target_quantity: target.target_quantity,
            target_unit: target.target_unit
          })
        )
      );
      
      await Promise.all(promises);
      showToast.dismiss(loadingToast);
      showToast.success(`${promises.length} production target(s) created successfully!`);
      router.push('/admin/production-targets');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to create targets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Set Production Target
              </h1>
              <p className="text-slate-600 mt-1">Assign production targets to operators for specific shifts</p>
            </div>
            <button onClick={() => router.back()} className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-white/80 rounded-lg shadow-sm border border-gray-200 border border-white/20 p-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Production Targets</h2>
              <p className="text-sm text-slate-600 mt-1">Add multiple machines and assign operators</p>
            </div>
            <button type="button" onClick={addRow} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Row
            </button>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Machine *</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Shift *</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Operators *</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date *</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Quantity *</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Unit</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target, index) => (
                  <tr key={target.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-600">{index + 1}</td>
                    <td className="px-4 py-3">
                      <select value={target.machine_id} onChange={(e) => updateRow(target.id, 'machine_id', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" required>
                        <option value="">Select</option>
                        {getAvailableMachines(target.id).map((m: any) => <option key={m.id} value={m.id}>{m.machine_name || m.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={target.shift_id} onChange={(e) => updateRow(target.id, 'shift_id', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" required>
                        <option value="">Select</option>
                        {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <div className="flex flex-wrap gap-1 min-h-[38px] px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white">
                          {target.operator_ids.length === 0 ? (
                            <span className="text-sm text-slate-400">Select operators</span>
                          ) : (
                            target.operator_ids.map(opId => {
                              const op = operators.find((o: any) => o.id.toString() === opId);
                              return op ? (
                                <span key={opId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {op.username}
                                  <button type="button" onClick={() => toggleOperator(target.id, opId)} className="hover:text-blue-900">
                                    ×
                                  </button>
                                </span>
                              ) : null;
                            })
                          )}
                        </div>
                        <select onChange={(e) => { if(e.target.value) toggleOperator(target.id, e.target.value); e.target.value = ''; }} className="absolute inset-0 w-full opacity-0 cursor-pointer">
                          <option value="">Add operator</option>
                          {getAvailableOperators(target.id).map((o: any) => <option key={o.id} value={o.id}>{o.username}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input type="date" value={target.target_date} onChange={(e) => updateRow(target.id, 'target_date', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" required />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" value={target.target_quantity} onChange={(e) => updateRow(target.id, 'target_quantity', e.target.value)} placeholder="5000" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" required />
                    </td>
                    <td className="px-4 py-3">
                      <select value={target.target_unit} onChange={(e) => updateRow(target.id, 'target_unit', e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm">
                        <option value="yards">Yards</option>
                        <option value="units">Units</option>
                        <option value="pieces">Pieces</option>
                        <option value="kg">Kilograms</option>
                        <option value="tons">Tons</option>
                        <option value="liters">Liters</option>
                        <option value="meters">Meters</option>
                        <option value="boxes">Boxes</option>
                        <option value="pallets">Pallets</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => removeRow(target.id)} disabled={targets.length === 1} className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Bulk Target Creation</h4>
                <p className="text-sm text-blue-700">Assign multiple operators to work together on one machine per shift. Each operator can only be assigned to one machine per shift.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              <span className="font-semibold">{targets.length}</span> row(s) • 
              <span className="font-semibold">{targets.reduce((sum, t) => sum + t.operator_ids.length, 0)}</span> target(s) will be created
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => router.back()} className="px-3 py-1.5 text-sm border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium">Cancel</button>
              <button type="submit" disabled={loading} className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium disabled:opacity-50 flex items-center gap-2">
                {loading ? 'Creating...' : `Create ${targets.reduce((sum, t) => sum + t.operator_ids.length, 0)} Target(s)`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
