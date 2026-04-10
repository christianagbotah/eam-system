'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Search, Download, Calendar, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface AuditLog {
  id: number;
  tool_id: number;
  tool_name: string;
  tool_code: string;
  action: string;
  performed_by: string;
  performed_by_name: string;
  details: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

function ToolAuditContent() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, actionFilter, dateFilter, auditLogs]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tool-audit');
      if (response.status === 'success') {
        setAuditLogs(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      showToast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...auditLogs];

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.tool_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.tool_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(log => new Date(log.created_at) >= filterDate);
    }

    setFilteredLogs(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Tool Code', 'Tool Name', 'Action', 'Performed By', 'Details', 'Old Value', 'New Value'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.tool_code,
      log.tool_name,
      log.action,
      log.performed_by_name,
      log.details,
      log.old_value || '-',
      log.new_value || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionBadge = (action: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      'CREATED': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'UPDATED': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'DELETED': { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      'ISSUED': { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      'RETURNED': { color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
      'TRANSFERRED': { color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle },
      'DAMAGED': { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      'LOST': { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    };

    const badge = badges[action] || { color: 'bg-gray-100 text-gray-800', icon: CheckCircle };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {action}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tool Audit Trail</h1>
            <p className="text-gray-600 mt-1">Complete history of all tool-related activities</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tools, users, actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Actions</option>
              <option value="CREATED">Created</option>
              <option value="UPDATED">Updated</option>
              <option value="DELETED">Deleted</option>
              <option value="ISSUED">Issued</option>
              <option value="RETURNED">Returned</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="DAMAGED">Damaged</option>
              <option value="LOST">Lost</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredLogs.length} of {auditLogs.length} audit logs
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tool
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Changes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.tool_name}</div>
                        <div className="text-sm text-gray-500">{log.tool_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.performed_by_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.details}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.old_value && log.new_value ? (
                          <div>
                            <div className="text-red-600">Old: {log.old_value}</div>
                            <div className="text-green-600">New: {log.new_value}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ToolAuditPage() {
  return <ToolAuditContent />;
}
