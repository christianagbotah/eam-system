'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { shiftService } from '@/services/shiftService';
import { userService } from '@/services/userService';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(shifts);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? shifts.filter((s: any) => selectedIds.includes(s.id)) : shifts;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((s: any) => Object.values(s).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shifts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowCreateModal(true),
    onExport: handleExport,
    onClose: () => { setShowCreateModal(false); setShowAssignModal(false); setShowBulkModal(false); }
  });

  const [newShift, setNewShift] = useState({ name: '', start_time: '', end_time: '', created_by: 1 });
  const [assignment, setAssignment] = useState({ user_id: '', shift_id: '', department_id: '', machine_id: '', start_date: '', end_date: '' });
  const [bulkAssignments, setBulkAssignments] = useState([{ user_id: '', shift_id: '', department_id: '', start_date: '', end_date: '' }]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (showAssignModal) {
      console.log('Modal opened - Machines count:', machines.length);
      console.log('Modal opened - Departments count:', departments.length);
      console.log('Machines data:', machines);
      console.log('Departments data:', departments);
    }
  }, [showAssignModal, machines, departments]);

  const loadData = async () => {
    try {
      const [shiftsRes, usersRes, machinesRes, deptsRes] = await Promise.all([
        shiftService.getShifts(),
        userService.getUsers(),
        api.get('/machines').catch(e => { console.error('Machines API error:', e); return { data: { success: false, data: [] } }; }),
        api.get('/departments').catch(e => { console.error('Departments API error:', e); return { data: { status: 'error', data: [] } }; })
      ]);
      
      console.log('Raw Machines Response:', machinesRes);
      console.log('Raw Departments Response:', deptsRes);
      
      setShifts(shiftsRes.data || []);
      setUsers(usersRes.data || []);
      
      // Machines: { success: true, data: [...] }
      let machinesData = [];
      if (machinesRes.data?.success && Array.isArray(machinesRes.data.data)) {
        machinesData = machinesRes.data.data;
      } else if (Array.isArray(machinesRes.data)) {
        machinesData = machinesRes.data;
      }
      
      // Departments: { status: 'success', data: [...] }
      let deptsData = [];
      if (deptsRes.data?.status === 'success' && Array.isArray(deptsRes.data.data)) {
        deptsData = deptsRes.data.data;
      } else if (Array.isArray(deptsRes.data)) {
        deptsData = deptsRes.data;
      }
      
      console.log('Processed Machines:', machinesData, 'Count:', machinesData.length);
      console.log('Processed Departments:', deptsData, 'Count:', deptsData.length);
      
      setMachines(machinesData);
      setDepartments(deptsData);
    } catch (error: any) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Creating shift...');
    try {
      await shiftService.createShift(newShift);
      showToast.dismiss(loadingToast);
      showToast.success('Shift created successfully!');
      setShowCreateModal(false);
      setNewShift({ name: '', start_time: '', end_time: '', created_by: 1 });
      loadData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to create shift');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} shifts?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} shifts...`);
    try {
      await Promise.all(selectedIds.map(id => shiftService.deleteShift(id)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} shifts deleted`);
      clearSelection();
      loadData();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete shifts');
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Assigning shift...');
    try {
      await shiftService.assignShift(assignment);
      showToast.dismiss(loadingToast);
      showToast.success('Shift assigned successfully!');
      setShowAssignModal(false);
      setAssignment({ user_id: '', shift_id: '', department_id: '', machine_id: '', start_date: '', end_date: '' });
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to assign shift');
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Bulk assigning...');
    try {
      const valid = bulkAssignments.filter(a => a.user_id && a.shift_id && a.department_id && a.start_date);
      const result = await shiftService.bulkAssign(valid);
      showToast.dismiss(loadingToast);
      showToast.success(result.message);
      if (result.data.errors.length > 0) result.data.errors.forEach((err: string) => showToast.error(err));
      setShowBulkModal(false);
      setBulkAssignments([{ user_id: '', shift_id: '', department_id: '', start_date: '', end_date: '' }]);
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to bulk assign');
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
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-base font-semibold">Shift Management</h1>
          <div className="flex items-center space-x-2">
            <button onClick={handleExport} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">📥 Export</button>
            <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Shift</button>
            <button onClick={() => setShowAssignModal(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Assign Shift</button>
            <button onClick={() => setShowBulkModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Bulk Assign</button>
          </div>
        </div>

        <BulkActions
          selectedIds={selectedIds}
          totalCount={shifts.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleExport}
        />

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    <input type="checkbox" checked={selectedIds.length === shifts.length && shifts.length > 0} onChange={selectAll} />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-200">
                {shifts.map((shift: any) => (
                  <tr key={shift.id}>
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={isSelected(shift.id)} onChange={() => toggleSelect(shift.id)} />
                    </td>
                    <td className="px-6 py-4">{shift.name}</td>
                  <td className="px-6 py-4">{shift.start_time}</td>
                  <td className="px-6 py-4">{shift.end_time}</td>
                </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Shift">
          <form onSubmit={handleCreateShift} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Shift Name</label>
              <input type="text" value={newShift.name} onChange={(e) => setNewShift({...newShift, name: e.target.value})} className="w-full border rounded px-3 py-2" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Start Time</label>
                <input type="time" value={newShift.start_time} onChange={(e) => setNewShift({...newShift, start_time: e.target.value})} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">End Time</label>
                <input type="time" value={newShift.end_time} onChange={(e) => setNewShift({...newShift, end_time: e.target.value})} className="w-full border rounded px-3 py-2" required />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                Create
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Shift">
          <form onSubmit={handleAssignShift} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Operator</label>
                <select value={assignment.user_id} onChange={(e) => setAssignment({...assignment, user_id: e.target.value})} className="w-full border rounded px-3 py-2" required>
                  <option value="">Select Operator</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Machine</label>
                <select value={assignment.machine_id} onChange={(e) => setAssignment({...assignment, machine_id: e.target.value})} className="w-full border rounded px-3 py-2" required>
                  <option value="">Select Machine ({machines.length} available)</option>
                  {machines.map((m: any) => <option key={m.id} value={m.id}>{m.machine_name || m.name || `Machine ${m.id}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Department</label>
                <select value={assignment.department_id} onChange={(e) => setAssignment({...assignment, department_id: e.target.value})} className="w-full border rounded px-3 py-2" required>
                  <option value="">Select Department ({departments.length} available)</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name || `Department ${d.id}`}</option>)}
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
                <label className="block text-xs font-medium mb-1">Start Date</label>
                <input type="date" value={assignment.start_date} onChange={(e) => setAssignment({...assignment, start_date: e.target.value})} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">End Date (Optional)</label>
                <input type="date" value={assignment.end_date} onChange={(e) => setAssignment({...assignment, end_date: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                Assign
              </button>
            </div>
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
  );
}
