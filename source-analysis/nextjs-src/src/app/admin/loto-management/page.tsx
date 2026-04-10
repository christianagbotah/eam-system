'use client';

import { useState, useEffect } from 'react';
import { Lock, Plus, CheckCircle, AlertCircle } from 'lucide-react';

export default function LOTOManagementPage() {
  const [procedures, setProcedures] = useState([]);
  const [activeLockouts, setActiveLockouts] = useState([]);
  const [locks, setLocks] = useState([]);
  const [showProcedureForm, setShowProcedureForm] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);

  const [procedureForm, setProcedureForm] = useState({
    equipment_id: '',
    procedure_name: '',
    procedure_code: '',
    energy_sources: '',
    isolation_steps: '',
    verification_steps: '',
    restoration_steps: ''
  });

  const [applyForm, setApplyForm] = useState({
    equipment_id: '',
    procedure_id: '',
    work_order_id: '',
    lock_numbers: '',
    tag_numbers: ''
  });

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const [procRes, activeRes, locksRes] = await Promise.all([
      fetch('/api/v1/eam/loto-procedures', { headers: { 'Authorization': `Bearer ${token}` }}),
      fetch('/api/v1/eam/loto/active', { headers: { 'Authorization': `Bearer ${token}` }}),
      fetch('/api/v1/eam/loto-locks', { headers: { 'Authorization': `Bearer ${token}` }})
    ]);
    const procData = await procRes.json();
    const activeData = await activeRes.json();
    const locksData = await locksRes.json();
    if (procData.status === 'success') setProcedures(procData.data);
    if (activeData.status === 'success') setActiveLockouts(activeData.data);
    if (locksData.status === 'success') setLocks(locksData.data);
  };

  const createProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    const energySources = procedureForm.energy_sources.split(',').map(s => s.trim());
    await fetch('/api/v1/eam/loto-procedures', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...procedureForm, energy_sources: energySources })
    });
    setShowProcedureForm(false);
    await loadData();
  };

  const applyLOTO = async (e: React.FormEvent) => {
    e.preventDefault();
    const lockNumbers = applyForm.lock_numbers.split(',').map(s => s.trim());
    const tagNumbers = applyForm.tag_numbers.split(',').map(s => s.trim());
    await fetch('/api/v1/eam/loto/apply', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...applyForm, lock_numbers: lockNumbers, tag_numbers: tagNumbers })
    });
    setShowApplyForm(false);
    await loadData();
  };

  const verifyLOTO = async (id: number) => {
    const notes = prompt('Verification notes:');
    if (!notes) return;
    await fetch(`/api/v1/eam/loto/${id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_notes: notes })
    });
    await loadData();
  };

  const removeLOTO = async (id: number) => {
    if (!confirm('Remove LOTO? Ensure all work is complete.')) return;
    const notes = prompt('Removal notes:');
    await fetch(`/api/v1/eam/loto/${id}/remove`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment_tested: true, removal_notes: notes })
    });
    await loadData();
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold flex items-center gap-2">
        <Lock className="w-8 h-8" /> LOTO Management
      </h1>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Active Lockouts</p>
          <p className="text-lg font-semibold text-red-600">{activeLockouts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Procedures</p>
          <p className="text-lg font-semibold text-blue-600">{procedures.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Available Locks</p>
          <p className="text-lg font-semibold text-green-600">{locks.filter((l: any) => l.status === 'available').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Active Lockouts</h2>
            <button onClick={() => setShowApplyForm(!showApplyForm)} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
              Apply LOTO
            </button>
          </div>

          {showApplyForm && (
            <form onSubmit={applyLOTO} className="mb-4 p-4 bg-gray-50 rounded space-y-3">
              <input type="number" placeholder="Equipment ID" value={applyForm.equipment_id} onChange={(e) => setApplyForm({...applyForm, equipment_id: e.target.value})} className="w-full border rounded px-3 py-2" required />
              <input type="number" placeholder="Procedure ID" value={applyForm.procedure_id} onChange={(e) => setApplyForm({...applyForm, procedure_id: e.target.value})} className="w-full border rounded px-3 py-2" required />
              <input type="text" placeholder="Lock Numbers (comma-separated)" value={applyForm.lock_numbers} onChange={(e) => setApplyForm({...applyForm, lock_numbers: e.target.value})} className="w-full border rounded px-3 py-2" required />
              <input type="text" placeholder="Tag Numbers (comma-separated)" value={applyForm.tag_numbers} onChange={(e) => setApplyForm({...applyForm, tag_numbers: e.target.value})} className="w-full border rounded px-3 py-2" required />
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm">Apply</button>
                <button type="button" onClick={() => setShowApplyForm(false)} className="bg-gray-300 px-4 py-2 rounded text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {activeLockouts.map((lockout: any) => (
              <div key={lockout.id} className="p-4 border rounded-lg">
                <div className="font-semibold">{lockout.equipment_name}</div>
                <div className="text-sm text-gray-600">Applied by: {lockout.applied_by}</div>
                <div className="text-sm text-gray-600">Status: <span className="font-medium">{lockout.status}</span></div>
                <div className="mt-2 flex gap-2">
                  {lockout.status === 'applied' && (
                    <button onClick={() => verifyLOTO(lockout.id)} className="text-blue-600 hover:text-blue-800 text-sm">Verify</button>
                  )}
                  {(lockout.status === 'verified' || lockout.status === 'active') && (
                    <button onClick={() => removeLOTO(lockout.id)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Procedures</h2>
            <button onClick={() => setShowProcedureForm(!showProcedureForm)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              + New
            </button>
          </div>

          {showProcedureForm && (
            <form onSubmit={createProcedure} className="mb-4 p-4 bg-gray-50 rounded space-y-3">
              <input type="text" placeholder="Procedure Name" value={procedureForm.procedure_name} onChange={(e) => setProcedureForm({...procedureForm, procedure_name: e.target.value})} className="w-full border rounded px-3 py-2" required />
              <input type="text" placeholder="Procedure Code" value={procedureForm.procedure_code} onChange={(e) => setProcedureForm({...procedureForm, procedure_code: e.target.value})} className="w-full border rounded px-3 py-2" required />
              <input type="text" placeholder="Energy Sources (comma-separated)" value={procedureForm.energy_sources} onChange={(e) => setProcedureForm({...procedureForm, energy_sources: e.target.value})} className="w-full border rounded px-3 py-2" required />
              <textarea placeholder="Isolation Steps" value={procedureForm.isolation_steps} onChange={(e) => setProcedureForm({...procedureForm, isolation_steps: e.target.value})} className="w-full border rounded px-3 py-2" rows={2} required />
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm">Create</button>
                <button type="button" onClick={() => setShowProcedureForm(false)} className="bg-gray-300 px-4 py-2 rounded text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {procedures.map((proc: any) => (
              <div key={proc.id} className="p-4 border rounded-lg">
                <div className="font-semibold">{proc.procedure_name}</div>
                <div className="text-sm text-gray-600 font-mono">{proc.procedure_code}</div>
                <div className="text-xs text-gray-500 mt-1">Equipment ID: {proc.equipment_id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
