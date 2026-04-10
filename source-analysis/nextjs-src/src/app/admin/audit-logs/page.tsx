'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  table_name: string;
  record_id: number;
  old_values: any;
  new_values: any;
  ip_address: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', table: '', user: '' });
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(logs);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? logs.filter(l => selectedIds.includes(l.id)) : logs;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(l => Object.values(l).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Audit logs exported successfully');
  };

  useKeyboardShortcuts({
    onExport: handleExport
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams(filters as any).toString();
      const res = await fetch(`/api/v1/eam/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setLogs(data.data || []);
    } catch (error) {
      showToast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-6"><TableSkeleton rows={10} /></div>;

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Audit Trail</h1>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">Action</label>
            <select value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Table</label>
            <select value={filters.table} onChange={e => setFilters({...filters, table: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="">All Tables</option>
              <option value="work_orders">Work Orders</option>
              <option value="assets">Assets</option>
              <option value="inventory">Inventory</option>
              <option value="iot_devices">IoT Devices</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">User ID</label>
            <input type="text" value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})} placeholder="Filter by user" className="w-full border rounded px-3 py-2" />
          </div>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={logs.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input type="checkbox" checked={selectedIds.length === logs.length && logs.length > 0} onChange={selectAll} className="rounded" />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Record ID</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input type="checkbox" checked={isSelected(log.id)} onChange={() => toggleSelect(log.id)} className="rounded" />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm">{formatDateTime(log.created_at)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm">User #{log.user_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded capitalize ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm capitalize">{log.table_name.replace('_', ' ')}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm">#{log.record_id}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500">{log.ip_address}</td>
                <td className="px-3 py-2.5 text-sm">
                  {log.new_values && (
                    <details className="cursor-pointer">
                      <summary className="text-blue-600 hover:text-blue-800">View</summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-w-md">
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
