import React, { useState, useEffect } from 'react';

interface AuditLog {
  id: number;
  tool_name: string;
  tool_code: string;
  action: string;
  username: string;
  created_at: string;
  old_values: any;
  new_values: any;
}

interface ComplianceItem {
  id: number;
  tool_name: string;
  tool_code: string;
  requirement_name: string;
  regulation_type: string;
  status: string;
  last_check_date: string;
  next_due_date: string;
  checked_by_name: string;
}

const ToolAuditCompliance: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('audit');
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [complianceData, setComplianceData] = useState({
    tool_id: '',
    requirement_id: '',
    status: 'COMPLIANT',
    notes: ''
  });
  const [reportData, setReportData] = useState({
    report_type: 'USAGE',
    date_from: '',
    date_to: '',
    report_name: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
    fetchCompliance();
    fetchRequirements();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-audit/logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setAuditLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const fetchCompliance = async () => {
    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-audit/compliance', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setCompliance(data.data);
      }
    } catch (error) {
      console.error('Error fetching compliance:', error);
    }
  };

  const fetchRequirements = async () => {
    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-audit/requirements', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRequirements(data.data);
      }
    } catch (error) {
      console.error('Error fetching requirements:', error);
    }
  };

  const recordComplianceCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-audit/compliance-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(complianceData)
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Compliance check recorded successfully');
        setShowComplianceModal(false);
        fetchCompliance();
        setComplianceData({ tool_id: '', requirement_id: '', status: 'COMPLIANT', notes: '' });
      } else {
        alert(data.message || 'Failed to record compliance check');
      }
    } catch (error) {
      console.error('Error recording compliance:', error);
      alert('Error recording compliance check');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-audit/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reportData)
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Report generated successfully');
        setShowReportModal(false);
        // Download or display report data
        console.log('Report data:', data.data);
      } else {
        alert(data.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED': return '➕';
      case 'UPDATED': return '✏️';
      case 'ISSUED': return '📤';
      case 'RETURNED': return '📥';
      case 'TRANSFERRED': return '🔄';
      case 'MAINTAINED': return '🔧';
      case 'DAMAGED': return '⚠️';
      case 'DISPOSED': return '🗑️';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return 'bg-green-100 text-green-800';
      case 'DUE': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'NON_COMPLIANT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
      <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Tool Audit & Compliance</h1>
        
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { key: 'audit', label: 'Audit Logs' },
            { key: 'compliance', label: 'Compliance' },
            { key: 'reports', label: 'Reports' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === tab.key 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowComplianceModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            ✅ Record Compliance
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            📊 Generate Report
          </button>
        </div>
      </div>

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Audit Trail</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getActionIcon(log.action)}</span>
                        <span className="text-sm font-medium text-gray-900">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.tool_name}</div>
                      <div className="text-sm text-gray-500">{log.tool_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.username || 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Compliance Status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requirement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Check</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {compliance.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.tool_name}</div>
                      <div className="text-sm text-gray-500">{item.tool_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.requirement_name}</div>
                      <div className="text-sm text-gray-500">{item.regulation_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.last_check_date || 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.next_due_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Usage Report</h3>
            <p className="text-sm text-gray-600 mb-4">Tool usage patterns and statistics</p>
            <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Generate
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Compliance Report</h3>
            <p className="text-sm text-gray-600 mb-4">Regulatory compliance status</p>
            <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Generate
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Maintenance Report</h3>
            <p className="text-sm text-gray-600 mb-4">Maintenance activities and costs</p>
            <button className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700">
              Generate
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Security Report</h3>
            <p className="text-sm text-gray-600 mb-4">Security events and access logs</p>
            <button className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
              Generate
            </button>
          </div>
        </div>
      )}

      {/* Compliance Check Modal */}
      {showComplianceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Record Compliance Check</h3>
            
            <form onSubmit={recordComplianceCheck}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tool ID</label>
                <input
                  type="number"
                  value={complianceData.tool_id}
                  onChange={(e) => setComplianceData({...complianceData, tool_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Requirement</label>
                <select
                  value={complianceData.requirement_id}
                  onChange={(e) => setComplianceData({...complianceData, requirement_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Requirement</option>
                  {requirements.map(req => (
                    <option key={req.id} value={req.id}>{req.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={complianceData.status}
                  onChange={(e) => setComplianceData({...complianceData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="COMPLIANT">Compliant</option>
                  <option value="NON_COMPLIANT">Non-Compliant</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={complianceData.notes}
                  onChange={(e) => setComplianceData({...complianceData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowComplianceModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Generate Report</h3>
            
            <form onSubmit={generateReport}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select
                  value={reportData.report_type}
                  onChange={(e) => setReportData({...reportData, report_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USAGE">Usage Report</option>
                  <option value="COMPLIANCE">Compliance Report</option>
                  <option value="MAINTENANCE">Maintenance Report</option>
                  <option value="SECURITY">Security Report</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={reportData.date_from}
                    onChange={(e) => setReportData({...reportData, date_from: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={reportData.date_to}
                    onChange={(e) => setReportData({...reportData, date_to: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
                <input
                  type="text"
                  value={reportData.report_name}
                  onChange={(e) => setReportData({...reportData, report_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional custom name"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
  );
};

export default ToolAuditCompliance;