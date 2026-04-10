'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, Pause, Play, StopCircle, Package, FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react';

export default function WorkOrderCompletionPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = params.id;
  const [activeLog, setActiveLog] = useState<any>(null);
  const [timeLogs, setTimeLogs] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [report, setReport] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const [materialForm, setMaterialForm] = useState({
    part_id: '',
    quantity_used: '',
    unit_cost: '',
    notes: ''
  });

  const [reportForm, setReportForm] = useState({
    work_performed: '',
    root_cause: '',
    corrective_actions: '',
    observations: '',
    recommendations: '',
    quality_check_passed: true
  });

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const [logsRes, materialsRes, reportRes, summaryRes] = await Promise.all([
      fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/time-logs`, { headers: { 'Authorization': `Bearer ${token}` }}),
      fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/materials-used`, { headers: { 'Authorization': `Bearer ${token}` }}),
      fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/completion-report`, { headers: { 'Authorization': `Bearer ${token}` }}),
      fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/time-logs/summary`, { headers: { 'Authorization': `Bearer ${token}` }})
    ]);

    const logsData = await logsRes.json();
    const materialsData = await materialsRes.json();
    const reportData = await reportRes.json();
    const summaryData = await summaryRes.json();

    if (logsData.status === 'success') {
      setTimeLogs(logsData.data);
      const active = logsData.data.find((log: any) => log.status === 'active');
      if (active) setActiveLog(active);
    }
    if (materialsData.status === 'success') setMaterials(materialsData.data);
    if (reportData.status === 'success' && reportData.data) setReport(reportData.data);
    if (summaryData.status === 'success') setSummary(summaryData.data);
  };

  const startTimeLog = async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/time-logs/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (data.status === 'success') {
      setActiveLog(data.data);
      await loadData();
    }
    setLoading(false);
  };

  const pauseTimeLog = async () => {
    await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/time-logs/pause`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    await loadData();
  };

  const resumeTimeLog = async () => {
    await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/time-logs/resume`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    await loadData();
  };

  const stopTimeLog = async () => {
    const breakDuration = prompt('Break duration (minutes):') || '0';
    const activityDescription = prompt('Activity description:') || '';
    
    await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/time-logs/stop`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        break_duration: parseInt(breakDuration), 
        activity_description: activityDescription,
        work_type: 'repair' 
      })
    });
    setActiveLog(null);
    await loadData();
  };

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalCost = parseFloat(materialForm.quantity_used) * parseFloat(materialForm.unit_cost);
    
    await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/materials-used`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...materialForm, total_cost: totalCost })
    });
    
    setShowMaterialForm(false);
    setMaterialForm({ part_id: '', quantity_used: '', unit_cost: '', notes: '' });
    await loadData();
  };

  const saveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/completion-report`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reportForm)
    });
    await loadData();
  };

  const submitReport = async () => {
    if (!confirm('Submit completion report? This will mark the work order as completed.')) return;
    
    await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/completion-report/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    alert('Work order completed successfully!');
    router.push('/admin/work-orders');
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Work Order #{workOrderId}</h1>
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800">← Back</button>
      </div>

      {/* Time Tracking */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" /> Time Tracking
        </h2>
        <div className="flex gap-4 mb-4">
          {!activeLog ? (
            <button onClick={startTimeLog} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50">
              <Play className="w-5 h-5" /> Start Work
            </button>
          ) : (
            <>
              {activeLog.status === 'active' ? (
                <button onClick={pauseTimeLog} className="bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-yellow-700">
                  <Pause className="w-5 h-5" /> Pause
                </button>
              ) : (
                <button onClick={resumeTimeLog} className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                  <Play className="w-5 h-5" /> Resume
                </button>
              )}
              <button onClick={stopTimeLog} className="bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-red-700">
                <StopCircle className="w-5 h-5" /> Stop Work
              </button>
            </>
          )}
        </div>
        
        {activeLog && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800 font-semibold">⏱️ Timer {activeLog.status === 'paused' ? 'Paused' : 'Active'}</p>
            <p className="text-sm text-green-700">Started: {new Date(activeLog.clock_in).toLocaleString()}</p>
          </div>
        )}

        {summary && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">{summary.total_hours}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Sessions</p>
              <p className="text-2xl font-bold text-purple-600">{summary.total_sessions}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Break Time</p>
              <p className="text-2xl font-bold text-orange-600">{summary.total_break_minutes} min</p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-semibold mb-3">Time Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">Technician</th>
                  <th className="px-4 py-2 text-left text-sm">Clock In</th>
                  <th className="px-4 py-2 text-left text-sm">Clock Out</th>
                  <th className="px-4 py-2 text-left text-sm">Hours</th>
                  <th className="px-4 py-2 text-left text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.map((log: any) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2">{log.technician_name}</td>
                    <td className="px-4 py-2 text-sm">{new Date(log.clock_in).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">{log.clock_out ? new Date(log.clock_out).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 font-semibold">{log.actual_hours || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${log.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Materials Used */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" /> Materials Used
          </h2>
          <button onClick={() => setShowMaterialForm(!showMaterialForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Add Material
          </button>
        </div>

        {showMaterialForm && (
          <form onSubmit={addMaterial} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Part ID" value={materialForm.part_id} onChange={(e) => setMaterialForm({...materialForm, part_id: e.target.value})} className="border rounded px-3 py-2" required />
              <input type="number" placeholder="Quantity" value={materialForm.quantity_used} onChange={(e) => setMaterialForm({...materialForm, quantity_used: e.target.value})} className="border rounded px-3 py-2" required />
              <input type="number" step="0.01" placeholder="Unit Cost" value={materialForm.unit_cost} onChange={(e) => setMaterialForm({...materialForm, unit_cost: e.target.value})} className="border rounded px-3 py-2" required />
              <input type="text" placeholder="Notes" value={materialForm.notes} onChange={(e) => setMaterialForm({...materialForm, notes: e.target.value})} className="border rounded px-3 py-2" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Save</button>
              <button type="button" onClick={() => setShowMaterialForm(false)} className="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
            </div>
          </form>
        )}

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm">Part</th>
              <th className="px-4 py-2 text-left text-sm">Quantity</th>
              <th className="px-4 py-2 text-left text-sm">Unit Cost</th>
              <th className="px-4 py-2 text-left text-sm">Total</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((mat: any) => (
              <tr key={mat.id} className="border-t">
                <td className="px-4 py-2">{mat.part_name || `Part #${mat.part_id}`}</td>
                <td className="px-4 py-2">{mat.quantity_used}</td>
                <td className="px-4 py-2">${mat.unit_cost}</td>
                <td className="px-4 py-2 font-semibold">${mat.total_cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Completion Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" /> Completion Report
        </h2>

        {report && report.report_status !== 'draft' ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold text-blue-800">{report.report_status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Work Performed</p>
              <p className="mt-1">{report.work_performed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Corrective Actions</p>
              <p className="mt-1">{report.corrective_actions}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={saveReport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Work Performed *</label>
              <textarea value={reportForm.work_performed} onChange={(e) => setReportForm({...reportForm, work_performed: e.target.value})} className="w-full border rounded px-3 py-2" rows={3} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Root Cause</label>
              <textarea value={reportForm.root_cause} onChange={(e) => setReportForm({...reportForm, root_cause: e.target.value})} className="w-full border rounded px-3 py-2" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Corrective Actions *</label>
              <textarea value={reportForm.corrective_actions} onChange={(e) => setReportForm({...reportForm, corrective_actions: e.target.value})} className="w-full border rounded px-3 py-2" rows={3} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Observations</label>
              <textarea value={reportForm.observations} onChange={(e) => setReportForm({...reportForm, observations: e.target.value})} className="w-full border rounded px-3 py-2" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recommendations</label>
              <textarea value={reportForm.recommendations} onChange={(e) => setReportForm({...reportForm, recommendations: e.target.value})} className="w-full border rounded px-3 py-2" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={reportForm.quality_check_passed} onChange={(e) => setReportForm({...reportForm, quality_check_passed: e.target.checked})} />
              <label className="text-sm">Quality check passed</label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Save Report</button>
              {report && (
                <button type="button" onClick={submitReport} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Submit & Complete
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
