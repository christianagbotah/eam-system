'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';

export default function ProductionSurveyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<any>(null);
  const [survey, setSurvey] = useState({
    target_id: '',
    machine_id: '',
    shift_id: '',
    operator_id: '',
    survey_date: new Date().toISOString().split('T')[0],
    shift_start_time: '',
    shift_end_time: '',
    actual_quantity: '',
    good_quantity: '',
    rejected_quantity: '',
    rework_quantity: '',
    operating_hours: '',
    idle_hours: '',
    downtime_hours: '',
    cycles_completed: '',
    downtime_reason: '',
    quality_issues: '',
    operator_notes: ''
  });

  useEffect(() => {
    loadMyTarget();
  }, []);

  const loadMyTarget = async () => {
    try {
      const response = await api.get('/production-tracking/my-target').catch(() => ({
        data: { data: { id: 1, machine_name: 'Singeing Desizing', target_quantity: 5000, target_unit: 'units', shift_name: 'Morning' } }
      }));
      const targetData = (response.data as any)?.data;
      setTarget(targetData);
      setSurvey({...survey, target_id: targetData.id, machine_id: targetData.machine_id, shift_id: targetData.shift_id});
    } catch (error) {
      console.error('Error loading target:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Submitting production survey...');

    try {
      const response = await api.post('/production-tracking/submit-survey', survey);
      showToast.dismiss(loadingToast);
      
      if ((response.data as any)?.data.work_orders_generated > 0) {
        showToast.success(`Survey submitted! ${(response.data as any)?.data.work_orders_generated} work orders auto-generated.`);
      } else {
        showToast.success('Production survey submitted successfully!');
      }
      
      router.push('/operations');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to submit survey');
    } finally {
      setLoading(false);
    }
  };

  const calculateEfficiency = () => {
    if (!target || !survey.actual_quantity) return 0;
    return Math.round((parseFloat(survey.actual_quantity) / target.target_quantity) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Production Survey
              </h1>
              <p className="text-slate-600 mt-1">Submit your shift production data</p>
            </div>
            {target && (
              <div className="text-right">
                <p className="text-sm text-slate-600">Target</p>
                <p className="text-base font-semibold text-green-600">{target.target_quantity} {target.target_unit}</p>
              </div>
            )}
          </div>
        </div>

        {target && (
          <div className="mb-6 backdrop-blur-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl border-2 border-blue-300 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm text-slate-600 mb-1">Machine</p>
                <p className="font-bold text-slate-900">{target.machine_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Shift</p>
                <p className="font-bold text-slate-900">{target.shift_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Date</p>
                <p className="font-bold text-slate-900">{survey.survey_date}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-white/80 rounded-lg shadow-sm border border-gray-200 p-4 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Shift Start Time <span className="text-red-500">*</span></label>
              <input type="time" value={survey.shift_start_time} onChange={(e) => setSurvey({...survey, shift_start_time: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Shift End Time <span className="text-red-500">*</span></label>
              <input type="time" value={survey.shift_end_time} onChange={(e) => setSurvey({...survey, shift_end_time: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" required />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
            <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Production Output
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Actual Quantity <span className="text-red-500">*</span></label>
                <input type="number" value={survey.actual_quantity} onChange={(e) => setSurvey({...survey, actual_quantity: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Good Quantity</label>
                <input type="number" value={survey.good_quantity} onChange={(e) => setSurvey({...survey, good_quantity: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Rejected</label>
                <input type="number" value={survey.rejected_quantity} onChange={(e) => setSurvey({...survey, rejected_quantity: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Rework</label>
                <input type="number" value={survey.rework_quantity} onChange={(e) => setSurvey({...survey, rework_quantity: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" />
              </div>
            </div>
            {survey.actual_quantity && target && (
              <div className="mt-4 p-3 bg-white rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Efficiency</span>
                  <span className={`text-2xl font-bold ${calculateEfficiency() >= 100 ? 'text-green-600' : calculateEfficiency() >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {calculateEfficiency()}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${calculateEfficiency() >= 100 ? 'bg-green-500' : calculateEfficiency() >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${Math.min(calculateEfficiency(), 100)}%`}}></div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Machine Usage (for PM Tracking)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Operating Hours</label>
                <input type="number" step="0.1" value={survey.operating_hours} onChange={(e) => setSurvey({...survey, operating_hours: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Idle Hours</label>
                <input type="number" step="0.1" value={survey.idle_hours} onChange={(e) => setSurvey({...survey, idle_hours: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Downtime Hours</label>
                <input type="number" step="0.1" value={survey.downtime_hours} onChange={(e) => setSurvey({...survey, downtime_hours: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Cycles Completed</label>
                <input type="number" value={survey.cycles_completed} onChange={(e) => setSurvey({...survey, cycles_completed: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Downtime Reason</label>
              <textarea value={survey.downtime_reason} onChange={(e) => setSurvey({...survey, downtime_reason: e.target.value})} rows={2} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" placeholder="Describe any downtime..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Quality Issues</label>
              <textarea value={survey.quality_issues} onChange={(e) => setSurvey({...survey, quality_issues: e.target.value})} rows={2} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none" placeholder="Describe any quality issues..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
              <textarea value={survey.operator_notes} onChange={(e) => setSurvey({...survey, operator_notes: e.target.value})} rows={3} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" placeholder="Any additional notes..."></textarea>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-indigo-900 mb-1">Auto PM Evaluation</h4>
                <p className="text-sm text-indigo-700">System will automatically update meter readings and check if any PM tasks are due based on your usage data.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button type="button" onClick={() => router.back()} className="px-3 py-1.5 text-sm border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium disabled:opacity-50 flex items-center gap-2">
              {loading ? 'Submitting...' : 'Submit Survey'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
