'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';

export default function CreateProductionSurvey() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  
  const [formData, setFormData] = useState({
    work_center: '',
    code: '',
    date: new Date().toISOString().split('T')[0],
    shift: 'morning',
    units_per_day: '',
    hours_per_unit_shift: '',
    target_per_machine: '',
    total_time_available: '',
    break_mins: '',
    repair_maint_mins: '',
    input_delivery_problems_mins: '',
    change_over_mins: '',
    startup_mins: '',
    cleaning_mins: '',
    others_mins: '',
    preventive_maint_mins: '',
    morning_production: '',
    afternoon_production: '',
    night_production: '',
    target_yards: '',
    standard_utilization: '',
    standard_speed: '',
  });

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const res = await api.get('/machines');
      const data = res.data;
      setMachines(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const calculateTotalDowntime = () => {
    const stoppages = [
      formData.break_mins, formData.repair_maint_mins, formData.input_delivery_problems_mins,
      formData.change_over_mins, formData.startup_mins, formData.cleaning_mins,
      formData.others_mins, formData.preventive_maint_mins
    ];
    return stoppages.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const calculateProductiveTime = () => {
    return (parseFloat(formData.total_time_available) || 0) - calculateTotalDowntime();
  };

  const calculateTotalProduction = () => {
    return (parseFloat(formData.morning_production) || 0) +
           (parseFloat(formData.afternoon_production) || 0) +
           (parseFloat(formData.night_production) || 0);
  };

  const calculateActualUtilization = () => {
    const productive = calculateProductiveTime();
    const available = parseFloat(formData.total_time_available) || 0;
    return available > 0 ? ((productive / available) * 100).toFixed(2) : '0';
  };

  const calculateActualSpeed = () => {
    const production = calculateTotalProduction();
    const productive = calculateProductiveTime();
    return productive > 0 ? (production / productive).toFixed(2) : '0';
  };

  const calculateProductivity = () => {
    const production = calculateTotalProduction();
    const available = parseFloat(formData.total_time_available) || 0;
    return available > 0 ? (production / available).toFixed(2) : '0';
  };

  const calculateEfficiency = () => {
    const production = calculateTotalProduction();
    const target = parseFloat(formData.target_yards) || 0;
    return target > 0 ? ((production / target) * 100).toFixed(2) : '0';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Saving production survey...');

    try {
      const surveyData = {
        ...formData,
        total_downtime: calculateTotalDowntime(),
        productive_time: calculateProductiveTime(),
        total_production: calculateTotalProduction(),
        actual_utilization: calculateActualUtilization(),
        actual_speed: calculateActualSpeed(),
        productivity: calculateProductivity(),
        efficiency: calculateEfficiency()
      };

      await api.post('/production-surveys'),
        body: JSON.stringify(surveyData)
      });

      showToast.dismiss(loadingToast);
      showToast.success('Production survey saved!');
      router.push('/admin/production-survey');
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to save survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Daily Production Survey</h1>
          <p className="text-xs text-gray-600 mt-0.5">Complete production data sheet</p>
        </div>
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">← Back</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Work Center *</label>
              <select value={formData.work_center} onChange={(e) => setFormData({...formData, work_center: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                <option value="">Select</option>
                {machines.map((m: any) => <option key={m.id} value={m.machine_name}>{m.machine_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shift *</label>
              <select value={formData.shift} onChange={(e) => setFormData({...formData, shift: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Time & Capacity</h2>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Units Per Day</label>
              <input type="number" value={formData.units_per_day} onChange={(e) => setFormData({...formData, units_per_day: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hours Per Unit Shift</label>
              <input type="number" step="0.1" value={formData.hours_per_unit_shift} onChange={(e) => setFormData({...formData, hours_per_unit_shift: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Per Machine</label>
              <input type="number" value={formData.target_per_machine} onChange={(e) => setFormData({...formData, target_per_machine: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Time Available (Mins) *</label>
              <input type="number" value={formData.total_time_available} onChange={(e) => setFormData({...formData, total_time_available: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Stoppages (Minutes)</h2>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Break</label>
              <input type="number" value={formData.break_mins} onChange={(e) => setFormData({...formData, break_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Repair Maint.</label>
              <input type="number" value={formData.repair_maint_mins} onChange={(e) => setFormData({...formData, repair_maint_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Input/Del. Problems</label>
              <input type="number" value={formData.input_delivery_problems_mins} onChange={(e) => setFormData({...formData, input_delivery_problems_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Change Over</label>
              <input type="number" value={formData.change_over_mins} onChange={(e) => setFormData({...formData, change_over_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start-up</label>
              <input type="number" value={formData.startup_mins} onChange={(e) => setFormData({...formData, startup_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cleaning</label>
              <input type="number" value={formData.cleaning_mins} onChange={(e) => setFormData({...formData, cleaning_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Others</label>
              <input type="number" value={formData.others_mins} onChange={(e) => setFormData({...formData, others_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preventive Maint.</label>
              <input type="number" value={formData.preventive_maint_mins} onChange={(e) => setFormData({...formData, preventive_maint_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-2 gap-2">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Total Downtime (B):</span>
              <span className="font-bold text-red-600">{calculateTotalDowntime()} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Productive Time (C=A-B):</span>
              <span className="font-bold text-green-600">{calculateProductiveTime()} mins</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Production (Yards)</h2>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Morning</label>
              <input type="number" value={formData.morning_production} onChange={(e) => setFormData({...formData, morning_production: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Afternoon</label>
              <input type="number" value={formData.afternoon_production} onChange={(e) => setFormData({...formData, afternoon_production: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Night</label>
              <input type="number" value={formData.night_production} onChange={(e) => setFormData({...formData, night_production: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Production (D)</label>
              <input type="number" value={calculateTotalProduction()} className="w-full border rounded-lg px-3 py-2 bg-gray-50 font-bold" readOnly />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Targets & Standards</h2>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target (Yards) (E)</label>
              <input type="number" value={formData.target_yards} onChange={(e) => setFormData({...formData, target_yards: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Standard Utilization (%) (G)</label>
              <input type="number" step="0.01" value={formData.standard_utilization} onChange={(e) => setFormData({...formData, standard_utilization: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Standard Speed (yds/min) (I)</label>
              <input type="number" step="0.01" value={formData.standard_speed} onChange={(e) => setFormData({...formData, standard_speed: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border-2 border-blue-200">
          <h2 className="text-lg font-bold text-blue-900 mb-4">Calculated Metrics</h2>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Actual Utilization (F=C/A)</p>
              <p className="text-base font-semibold text-blue-600">{calculateActualUtilization()}%</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Actual Speed (H=D/C)</p>
              <p className="text-base font-semibold text-green-600">{calculateActualSpeed()} yds/min</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Productivity (J=D/A)</p>
              <p className="text-base font-semibold text-purple-600">{calculateProductivity()}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Efficiency (K=A-R/A*100)</p>
              <p className="text-base font-semibold text-orange-600">{calculateEfficiency()}%</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-3 py-1.5 text-sm border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Survey'}
          </button>
        </div>
      </form>
    </div>
  );
}
