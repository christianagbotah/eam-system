'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [machines, setMachines] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    shift_name: '', start_time: '', end_time: '',
    operator_id: '', machine_id: '', shift_id: '',
    target_quantity: '', start_date: '', end_date: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [shiftsRes, usersRes, machinesRes, assignRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/users'),
        api.get('/machines'),
        api.get('/shift-assignments')
      ]);
      setShifts(shiftsRes.data.data || []);
      setOperators((usersRes.data.data || []).filter((u: any) => u.role === 'operator'));
      setMachines(machinesRes.data.data || machinesRes.data || []);
      setAssignments(assignRes.data.data || []);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Creating shift...');
    try {
      await api.post('/shifts', {
        name: formData.shift_name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        created_by: 1
      });
      showToast.dismiss(loadingToast);
      showToast.success('Shift created');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create shift');
    }
  };

  const handleAssignOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Assigning operator...');
    try {
      await api.post('/shift-assignments', {
        user_id: formData.operator_id,
        shift_id: formData.shift_id,
        machine_id: formData.machine_id,
        target_quantity: formData.target_quantity,
        start_date: formData.start_date,
        end_date: formData.end_date
      });
      showToast.dismiss(loadingToast);
      showToast.success('Operator assigned');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to assign operator');
    }
  };

  const resetForm = () => {
    setFormData({
      shift_name: '', start_time: '', end_time: '',
      operator_id: '', machine_id: '', shift_id: '',
      target_quantity: '', start_date: '', end_date: ''
    });
  };

  const openModal = (type: string) => {
    setModalType(type);
    setShowModal(true);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Shift Management</h1>
        <div className="flex gap-3">
          <button onClick={() => openModal('shift')} className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700">
            Create Shift
          </button>
          <button onClick={() => openModal('assign')} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">
            Assign Operator
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Shifts</h2>
          <div className="space-y-3">
            {shifts.map((shift: any) => (
              <div key={shift.id} className="border rounded-lg p-4">
                <h3 className="font-semibold">{shift.name}</h3>
                <p className="text-sm text-gray-600">{shift.start_time} - {shift.end_time}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Assignments</h2>
          <div className="space-y-3">
            {assignments.map((assign: any) => (
              <div key={assign.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{assign.operator_name}</p>
                    <p className="text-sm text-gray-600">Machine: {assign.machine_name}</p>
                    <p className="text-sm text-gray-600">Shift: {assign.shift_name}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    Target: {assign.target_quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {modalType === 'shift' ? 'Create Shift' : 'Assign Operator'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalType === 'shift' ? (
              <form onSubmit={handleCreateShift} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Shift Name</label>
                  <input type="text" value={formData.shift_name} onChange={(e) => setFormData({...formData, shift_name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Start Time</label>
                    <input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">End Time</label>
                    <input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700">Create</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAssignOperator} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Operator</label>
                  <select value={formData.operator_id} onChange={(e) => setFormData({...formData, operator_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                    <option value="">Select Operator</option>
                    {operators.map((op: any) => <option key={op.id} value={op.id}>{op.username}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Machine</label>
                  <select value={formData.machine_id} onChange={(e) => setFormData({...formData, machine_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                    <option value="">Select Machine</option>
                    {machines.map((m: any) => <option key={m.id} value={m.id}>{m.machine_name || m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Shift</label>
                  <select value={formData.shift_id} onChange={(e) => setFormData({...formData, shift_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                    <option value="">Select Shift</option>
                    {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Target Quantity</label>
                  <input type="number" value={formData.target_quantity} onChange={(e) => setFormData({...formData, target_quantity: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Start Date</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">End Date</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700">Assign</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
