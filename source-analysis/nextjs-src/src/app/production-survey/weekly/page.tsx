'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function SurveyReport() {
  const [activeTab, setActiveTab] = useState('record');
  const [date, setDate] = useState('2016-01-03');
  const [weekNumber] = useState(1);
  const [month] = useState('JANUARY 2016');
  const [machines, setMachines] = useState<any[]>([]);
  const [surveyData, setSurveyData] = useState<any[]>([]);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const response = await fetch(`/api/v1/eam/assets`);
      const data = await response.json();
      if (data.status === 'success') {
        const machineList = data.data.map((asset: any) => ({
          id: asset.id,
          code: asset.asset_code,
          name: asset.name
        }));
        setMachines(machineList);
        setSurveyData(machineList.map(m => ({
          machine_id: m.id,
          code: m.code,
          name: m.name,
          units_per_day: 1,
          hours_per_shift: 8,
          target_per_unit: 0,
          total_available: 480,
          break_mins: 0,
          repair_maint: 0,
          input_delivery: 0,
          change_over: 0,
          startup_cleaning: 0,
          others: 0,
          preventive_maint: 0,
          total_downtime: 0,
          productive_time: 480
        })));
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const updateSurveyData = (index: number, field: string, value: any) => {
    const updated = [...surveyData];
    updated[index][field] = parseFloat(value) || 0;
    
    const row = updated[index];
    row.total_downtime = row.break_mins + row.repair_maint + row.input_delivery + 
                         row.change_over + row.startup_cleaning + row.others + row.preventive_maint;
    row.productive_time = row.total_available - row.total_downtime;
    
    setSurveyData(updated);
  };

  const saveSurvey = async () => {
    try {
      const response = await fetch(`/api/v1/eam/production-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, surveys: surveyData })
      });
      if (response.ok) alert('Survey saved successfully');
    } catch (error) {
      console.error('Error saving survey:', error);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-800">Survey Report</h1>
          <p className="text-xs text-gray-600 mt-0.5">MONTH: {month} | WEEK: {weekNumber} | {date}</p>
        </div>

        <div className="mb-6 flex gap-2 border-b">
          <button onClick={() => setActiveTab('record')}
            className={`px-6 py-3 font-semibold ${activeTab === 'record' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>
            Record Survey
          </button>
          <button onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 font-semibold ${activeTab === 'summary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>
            Survey Summary
          </button>
        </div>

        {activeTab === 'record' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <label className="font-semibold">Date:</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="px-2 py-1 text-xs border rounded-md" />
              </div>
              <button onClick={saveSurvey}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Survey
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-50">
                  <tr>
                    <th rowSpan={2} className="px-2 py-3 border text-left min-w-[150px]">WORK CENTER</th>
                    <th rowSpan={2} className="px-2 py-3 border text-left">CODES</th>
                    <th rowSpan={2} className="px-2 py-3 border">No. Of<br/>Units<br/>Per Day</th>
                    <th rowSpan={2} className="px-2 py-3 border">No. Of<br/>Hours Per<br/>Unit Shift</th>
                    <th rowSpan={2} className="px-2 py-3 border">Target<br/>Per<br/>Machine</th>
                    <th rowSpan={2} className="px-2 py-3 border">Total Time<br/>Available<br/>(A)</th>
                    <th colSpan={7} className="px-2 py-3 border bg-yellow-50">S T O P P A G E S</th>
                    <th rowSpan={2} className="px-2 py-3 border bg-red-50">Total<br/>Down Time<br/>Mins (B)</th>
                    <th rowSpan={2} className="px-2 py-3 border bg-green-50">Productive<br/>Time<br/>(C=A-B)</th>
                  </tr>
                  <tr className="bg-yellow-50">
                    <th className="px-2 py-2 border">Break<br/>(Mins)</th>
                    <th className="px-2 py-2 border">Repair<br/>Maint.<br/>(Mins)</th>
                    <th className="px-2 py-2 border">Input/Del.<br/>Problems<br/>(Mins)</th>
                    <th className="px-2 py-2 border">Change<br/>Over<br/>(Mins)</th>
                    <th className="px-2 py-2 border">Start-up<br/>Cleaning<br/>(Mins)</th>
                    <th className="px-2 py-2 border">Others<br/>(Mins)</th>
                    <th className="px-2 py-2 border">Preventive<br/>Maint.<br/>(Mins)</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-2 py-2 border font-medium">{row.name}</td>
                      <td className="px-2 py-2 border">{row.code}</td>
                      <td className="px-2 py-2 border">
                        <input type="number" value={row.units_per_day}
                          onChange={(e) => updateSurveyData(idx, 'units_per_day', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border">
                        <input type="number" value={row.hours_per_shift}
                          onChange={(e) => updateSurveyData(idx, 'hours_per_shift', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border">
                        <input type="number" value={row.target_per_unit}
                          onChange={(e) => updateSurveyData(idx, 'target_per_unit', e.target.value)}
                          className="w-20 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border">
                        <input type="number" value={row.total_available}
                          onChange={(e) => updateSurveyData(idx, 'total_available', e.target.value)}
                          className="w-20 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border bg-yellow-50">
                        <input type="number" value={row.break_mins}
                          onChange={(e) => updateSurveyData(idx, 'break_mins', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border bg-yellow-50">
                        <input type="number" value={row.repair_maint}
                          onChange={(e) => updateSurveyData(idx, 'repair_maint', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border bg-yellow-50">
                        <input type="number" value={row.input_delivery}
                          onChange={(e) => updateSurveyData(idx, 'input_delivery', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border bg-yellow-50">
                        <input type="number" value={row.change_over}
                          onChange={(e) => updateSurveyData(idx, 'change_over', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border bg-yellow-50">
                        <input type="number" value={row.startup_cleaning}
                          onChange={(e) => updateSurveyData(idx, 'startup_cleaning', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border bg-yellow-50">
                        <input type="number" value={row.others}
                          onChange={(e) => updateSurveyData(idx, 'others', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border bg-yellow-50">
                        <input type="number" value={row.preventive_maint}
                          onChange={(e) => updateSurveyData(idx, 'preventive_maint', e.target.value)}
                          className="w-16 px-1 py-1 border rounded text-center" />
                      </td>
                      <td className="px-2 py-2 border bg-red-50 font-bold text-center">{row.total_downtime}</td>
                      <td className="px-2 py-2 border bg-green-50 font-bold text-center">{row.productive_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <h2 className="text-xl font-bold p-4 bg-gray-50 border-b">Stoppages Summary</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Work Center</th>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3">Total Time (mins)</th>
                    <th className="px-4 py-3">Total Stoppages (mins)</th>
                    <th className="px-4 py-3 bg-green-50">Productive Time (mins)</th>
                    <th className="px-4 py-3">Utilization %</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyData.map((row, idx) => {
                    const utilization = row.total_available > 0 ? ((row.productive_time / row.total_available) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3">{row.code}</td>
                        <td className="px-4 py-3 text-center">{row.total_available}</td>
                        <td className="px-4 py-3 text-center text-red-600 font-bold">{row.total_downtime}</td>
                        <td className="px-4 py-3 text-center bg-green-50 font-bold">{row.productive_time}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${parseFloat(utilization as string) >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                            {utilization}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="text-sm text-gray-600">Total Available Time</div>
                <div className="text-base font-semibold text-blue-600">
                  {surveyData.reduce((sum, s) => sum + s.total_available, 0)} mins
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                <div className="text-sm text-gray-600">Total Downtime</div>
                <div className="text-base font-semibold text-red-600">
                  {surveyData.reduce((sum, s) => sum + s.total_downtime, 0)} mins
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <div className="text-sm text-gray-600">Total Productive Time</div>
                <div className="text-base font-semibold text-green-600">
                  {surveyData.reduce((sum, s) => sum + s.productive_time, 0)} mins
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
