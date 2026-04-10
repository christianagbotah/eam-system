'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function DailyProductionSurvey() {
  const [activeTab, setActiveTab] = useState('record');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('morning');
  const [companyName, setCompanyName] = useState('GTP');
  const [machines, setMachines] = useState<any[]>([]);
  const [surveyData, setSurveyData] = useState<any[]>([]);

  const getWeekNumber = (d: Date) => {
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    return Math.ceil((d.getDate() + firstDay.getDay()) / 7);
  };

  const getMonthYear = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const weekNumber = getWeekNumber(new Date(date));
  const month = getMonthYear(date);

  useEffect(() => {
    fetchMachines();
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch(`/api/v1/eam/settings/company`);
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        setCompanyName(data.data.company_name || 'GTP');
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

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
          productive_time: 480,
          morning_production: 0,
          afternoon_production: 0,
          night_production: 0,
          total_production: 0,
          target_production: 0,
          actual_speed: 0,
          standard_speed: 130
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
    row.total_production = row.morning_production + row.afternoon_production + row.night_production;
    row.actual_speed = row.productive_time > 0 ? (row.total_production / row.productive_time).toFixed(2) : 0;
    
    setSurveyData(updated);
  };

  const saveSurvey = async () => {
    try {
      const response = await fetch(`/api/v1/eam/production-survey/daily`, {
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Daily Production Survey</h1>
            <p className="text-xs text-gray-600 mt-0.5">MONTH: {month} | WEEK: {weekNumber} | {date}</p>
          </div>
          <div className="flex gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="px-2 py-1 text-xs border rounded-md" />
            <select value={shift} onChange={(e) => setShift(e.target.value)}
              className="px-2 py-1 text-xs border rounded-md">
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="night">Night</option>
            </select>
          </div>
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="text-xl font-bold">{companyName} - DAILY PRODUCTION DATA SHEET</h2>
              <p className="text-sm text-gray-600">MONTH: {month} | WEEK: {weekNumber} | {date} | SHIFT: {shift.toUpperCase()}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-50">
                  <tr>
                    <th rowSpan={3} className="px-2 py-3 border text-left">WORK CENTER</th>
                    <th rowSpan={3} className="px-2 py-3 border text-left">CODES</th>
                    <th rowSpan={3} className="px-2 py-3 border">Total<br/>Time<br/>(Mins)<br/>(A)</th>
                    <th rowSpan={3} className="px-2 py-3 border">Total<br/>Stoppages<br/>(Mins)<br/>(B)</th>
                    <th rowSpan={3} className="px-2 py-3 border bg-green-50">Productive<br/>Time<br/>(Mins)<br/>(C)</th>
                    <th colSpan={4} className="px-2 py-3 border bg-yellow-50">P R O D U C T I O N (Yards)</th>
                    <th rowSpan={3} className="px-2 py-3 border">Total<br/>Production<br/>(Yards)<br/>(D)</th>
                    <th rowSpan={3} className="px-2 py-3 border">Target<br/>(Yards)<br/>(E)</th>
                    <th colSpan={2} className="px-2 py-3 border bg-purple-50">UTILIZATION %</th>
                    <th colSpan={2} className="px-2 py-3 border bg-orange-50">Speed (yds/min)</th>
                    <th rowSpan={3} className="px-2 py-3 border">Productivity<br/>J=(D/A)</th>
                    <th rowSpan={3} className="px-2 py-3 border">Efficiency<br/>K=(A-B/A*100)<br/>(%)</th>
                    <th rowSpan={3} className="px-2 py-3 border">Cumulative<br/>Production<br/>(Yards)</th>
                  </tr>
                  <tr className="bg-yellow-50">
                    <th className="px-2 py-2 border">Morning</th>
                    <th className="px-2 py-2 border">Afternoon</th>
                    <th className="px-2 py-2 border">Night</th>
                    <th className="px-2 py-2 border">Engineering</th>
                  </tr>
                  <tr className="bg-blue-100">
                    <th className="px-2 py-2 border bg-purple-50">Actual<br/>(F=C/A)</th>
                    <th className="px-2 py-2 border bg-purple-50">Standard<br/>(G)</th>
                    <th className="px-2 py-2 border bg-orange-50">Actual<br/>(H=D/C)</th>
                    <th className="px-2 py-2 border bg-orange-50">Standard<br/>(I)</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyData.map((row, idx) => {
                    const utilizationActual = row.total_available > 0 ? ((row.productive_time / row.total_available) * 100).toFixed(1) : 0;
                    const efficiency = row.total_available > 0 ? (((row.total_available - row.total_downtime) / row.total_available) * 100).toFixed(1) : 0;
                    const productivity = row.total_available > 0 ? (row.total_production / row.total_available).toFixed(2) : 0;
                    
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-2 border font-medium">{row.name}</td>
                        <td className="px-2 py-2 border">{row.code}</td>
                        <td className="px-2 py-2 border text-center">{row.total_available}</td>
                        <td className="px-2 py-2 border text-center text-red-600 font-bold">{row.total_downtime}</td>
                        <td className="px-2 py-2 border text-center bg-green-50 font-bold">{row.productive_time}</td>
                        <td className="px-2 py-2 border text-center">
                          <input type="number" value={row.morning_production}
                            onChange={(e) => updateSurveyData(idx, 'morning_production', e.target.value)}
                            className="w-20 px-1 py-1 border rounded text-center" />
                        </td>
                        <td className="px-2 py-2 border text-center">
                          <input type="number" value={row.afternoon_production}
                            onChange={(e) => updateSurveyData(idx, 'afternoon_production', e.target.value)}
                            className="w-20 px-1 py-1 border rounded text-center" />
                        </td>
                        <td className="px-2 py-2 border text-center">
                          <input type="number" value={row.night_production}
                            onChange={(e) => updateSurveyData(idx, 'night_production', e.target.value)}
                            className="w-20 px-1 py-1 border rounded text-center" />
                        </td>
                        <td className="px-2 py-2 border text-center">0</td>
                        <td className="px-2 py-2 border text-center font-bold text-blue-600">{row.total_production}</td>
                        <td className="px-2 py-2 border text-center">
                          <input type="number" value={row.target_production}
                            onChange={(e) => updateSurveyData(idx, 'target_production', e.target.value)}
                            className="w-20 px-1 py-1 border rounded text-center" />
                        </td>
                        <td className="px-2 py-2 border text-center bg-purple-50 font-bold">{utilizationActual}%</td>
                        <td className="px-2 py-2 border text-center bg-purple-50">80%</td>
                        <td className="px-2 py-2 border text-center bg-orange-50 font-bold">{row.actual_speed}</td>
                        <td className="px-2 py-2 border text-center bg-orange-50">
                          <input type="number" value={row.standard_speed}
                            onChange={(e) => updateSurveyData(idx, 'standard_speed', e.target.value)}
                            className="w-16 px-1 py-1 border rounded text-center" />
                        </td>
                        <td className="px-2 py-2 border text-center font-bold">{productivity}</td>
                        <td className="px-2 py-2 border text-center">
                          <span className={`font-bold ${parseFloat(efficiency as string) >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                            {efficiency}%
                          </span>
                        </td>
                        <td className="px-2 py-2 border text-center">{row.total_production}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
