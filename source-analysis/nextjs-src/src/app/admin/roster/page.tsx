'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { shiftService } from '@/services/shiftService';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';

export default function RosterPage() {
  const [departmentId, setDepartmentId] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(roster);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? roster.filter((r: any) => selectedIds.includes(r.id)) : roster;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((r: any) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onExport: handleExport,
    onClose: () => {}
  });

  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    setLoading(true);
    const loadingToast = showToast.loading('Loading roster...');
    try {
      const result = await shiftService.getDepartmentRoster(parseInt(departmentId), date);
      setRoster(result.data.roster || []);
      showToast.dismiss(loadingToast);
      showToast.success('Roster loaded');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Remove ${selectedIds.length} roster entries?`)) return;
    const loadingToast = showToast.loading(`Removing ${selectedIds.length} entries...`);
    try {
      await Promise.all(selectedIds.map(id => shiftService.deleteRosterEntry(id)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} entries removed`);
      clearSelection();
      loadRoster();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to remove entries');
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-base font-semibold">Department Roster</h1>
          <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded">📥 Export</button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Department ID</label>
              <input
                type="number"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <button
              onClick={loadRoster}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load Roster'}
            </button>
          </div>
        </div>

        <BulkActions
          selectedIds={selectedIds}
          totalCount={roster.length}
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
                    <input type="checkbox" checked={selectedIds.length === roster.length && roster.length > 0} onChange={selectAll} />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-200">
                {roster.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No roster data for this date
                    </td>
                  </tr>
                ) : (
                  roster.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <input type="checkbox" checked={isSelected(item.id)} onChange={() => toggleSelect(item.id)} />
                      </td>
                      <td className="px-6 py-4">{item.username} ({item.full_name})</td>
                    <td className="px-6 py-4">{item.email}</td>
                    <td className="px-6 py-4">{item.shift_name}</td>
                    <td className="px-6 py-4">{item.start_time} - {item.end_time}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">
                      {item.start_date} {item.end_date ? `to ${item.end_date}` : '(ongoing)'}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
