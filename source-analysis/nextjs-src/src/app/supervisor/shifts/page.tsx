'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { shiftService } from '@/services/shiftService';
import { userService } from '@/services/userService';
import { toast } from '@/lib/toast';

export default function SupervisorShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [assignment, setAssignment] = useState({ user_id: '', shift_id: '', department_id: '', start_date: '', end_date: '' });
  const [bulkAssignments, setBulkAssignments] = useState([{ user_id: '', shift_id: '', department_id: '', start_date: '', end_date: '' }]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [shiftsRes, usersRes] = await Promise.all([shiftService.getShifts(), userService.getUsers()]);
      setShifts(shiftsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load data');
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await shiftService.assignShift(assignment);
      toast.success('Assigned');
      setShowAssignModal(false);
      setAssignment({ user_id: '', shift_id: '', department_id: '', start_date: '', end_date: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const valid = bulkAssignments.filter(a => a.user_id && a.shift_id && a.department_id && a.start_date);
      const result = await shiftService.bulkAssign(valid);
      toast.success(result.message);
      if (result.data.errors.length > 0) result.data.errors.forEach((err: string) => toast.error(err));
      setShowBulkModal(false);
      setBulkAssignments([{ user_id: '', shift_id: '', department_id: '', start_date: '', end_date: '' }]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => setBulkAssignments([...bulkAssignments, { user_id: '', shift_id: '', department_id: '', start_date: '', end_date: '' }]);
  const removeRow = (i: number) => setBulkAssignments(bulkAssignments.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: string, value: string) => {
    const updated = [...bulkAssignments];
    updated[i] = { ...updated[i], [field]: value };
    setBulkAssignments(updated);
  };

  return (
    <DashboardLayout role="supervisor">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-base font-semibold">Shift Assignment</h1>
          <div className="space-x-2">
            <button onClick={() => setShowAssignModal(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Assign Shift</button>
            <button onClick={() => setShowBulkModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Bulk Assign</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shifts.map((shift: any) => (
                <tr key={shift.id}>
                  <td className="px-6 py-4">{shift.name}</td>
                  <td className="px-6 py-4">{shift.start_time}</td>
                  <td className="px-6 py-4">{shift.end_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Shift">
          <form onSubmit={handleAssignShift} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">User</label>
              <select value={assignment.user_id} onChange={(e) => setAssignment({...assignment, user_id: e.target.value})} className="w-full border rounded px-3 py-2" required>
                <option value="">Select User</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Shift</label>
              <select value={assignment.shift_id} onChange={(e) => setAssignment({...assignment, shift_id: e.target.value})} className="w-full border rounded px-3 py-2" required>
                <option value="">Select Shift</option>
                {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Department ID</label>
              <input type="number" value={assignment.department_id} onChange={(e) => setAssignment({...assignment, department_id: e.target.value})} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Start Date</label>
              <input type="date" value={assignment.start_date} onChange={(e) => setAssignment({...assignment, start_date: e.target.value})} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Date (Optional)</label>
              <input type="date" value={assignment.end_date} onChange={(e) => setAssignment({...assignment, end_date: e.target.value})} className="w-full border rounded px-3 py-2" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </form>
        </Modal>

        <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Assign">
          <form onSubmit={handleBulkAssign} className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-4">
              {bulkAssignments.map((item, i) => (
                <div key={i} className="border p-4 rounded relative">
                  {bulkAssignments.length > 1 && <button type="button" onClick={() => removeRow(i)} className="absolute top-2 right-2 text-red-600">×</button>}
                  <div className="grid grid-cols-2 gap-2">
                    <select value={item.user_id} onChange={(e) => updateRow(i, 'user_id', e.target.value)} className="border rounded px-2 py-1 text-sm" required>
                      <option value="">User</option>
                      {users.map((u: any) => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                    <select value={item.shift_id} onChange={(e) => updateRow(i, 'shift_id', e.target.value)} className="border rounded px-2 py-1 text-sm" required>
                      <option value="">Shift</option>
                      {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input type="number" placeholder="Dept ID" value={item.department_id} onChange={(e) => updateRow(i, 'department_id', e.target.value)} className="border rounded px-2 py-1 text-sm" required />
                    <input type="date" value={item.start_date} onChange={(e) => updateRow(i, 'start_date', e.target.value)} className="border rounded px-2 py-1 text-sm" required />
                    <input type="date" placeholder="End (Optional)" value={item.end_date} onChange={(e) => updateRow(i, 'end_date', e.target.value)} className="border rounded px-2 py-1 text-sm col-span-2" />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addRow} className="w-full border-2 border-dashed py-2 rounded">+ Add Row</button>
            <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50">
              {loading ? 'Assigning...' : 'Bulk Assign'}
            </button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
