'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';

export default function CreateProductionTarget() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [target, setTarget] = useState({
    machine_id: '',
    shift_id: '',
    operator_id: '',
    target_date: new Date().toISOString().split('T')[0],
    target_quantity: '',
    target_unit: 'units'
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Creating production target...');

    try {
      await api.post('/production-tracking/set-target', target);
      showToast.dismiss(loadingToast);
      showToast.success('Production target created successfully!');
      router.push('/planner');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to create target');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
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
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Machine <span className="text-red-500">*</span></label>
              <select value={target.machine_id} onChange={(e) => setTarget({...target, machine_id: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" required>
                <option value="">Select Machine</option>
                {machines.map((m: any) => <option key={m.id} value={m.id}>{m.machine_name || m.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Shift <span className="text-red-500">*</span></label>
                <select value={target.shift_id} onChange={(e) => setTarget({...target, shift_id: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" required>
                  <option value="">Select Shift</option>
                  {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Operator <span className="text-red-500">*</span></label>
                <select value={target.operator_id} onChange={(e) => setTarget({...target, operator_id: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" required>
                  <option value="">Select Operator</option>
                  {operators.map((o: any) => <option key={o.id} value={o.id}>{o.username}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Date <span className="text-red-500">*</span></label>
                <input type="date" value={target.target_date} onChange={(e) => setTarget({...target, target_date: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Quantity <span className="text-red-500">*</span></label>
                <input type="number" value={target.target_quantity} onChange={(e) => setTarget({...target, target_quantity: e.target.value})} placeholder="5000" className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Unit</label>
                <select value={target.target_unit} onChange={(e) => setTarget({...target, target_unit: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none">
                  <option value="units">Units</option>
                  <option value="kg">Kilograms</option>
                  <option value="meters">Meters</option>
                </select>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Production Target Info</h4>
                  <p className="text-sm text-blue-700">Operator will submit actual production data. System auto-updates meter readings and evaluates PM tasks.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
            <button type="button" onClick={() => router.back()} className="px-3 py-1.5 text-sm border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium disabled:opacity-50 flex items-center gap-2">
              {loading ? 'Creating...' : 'Create Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
