'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import { Calendar, Clock, AlertTriangle, CheckCircle, Plus, Wrench } from 'lucide-react';

interface MaintenanceSchedule {
  id: number;
  tool_id: number;
  tool_name: string;
  tool_code: string;
  category: string;
  maintenance_type: string;
  frequency_days: number;
  last_maintenance_date?: string;
  next_due_date: string;
  assigned_to_name?: string;
  days_until_due: number;
  instructions?: string;
}

export default function ToolMaintenanceSchedule() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [overdueItems, setOverdueItems] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [scheduleData, setScheduleData] = useState({
    tool_id: '',
    maintenance_type: 'CALIBRATION',
    frequency_days: 30,
    last_maintenance_date: '',
    assigned_to: '',
    instructions: ''
  });

  const [recordData, setRecordData] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    status: 'COMPLETED',
    notes: '',
    cost: ''
  });

  useEffect(() => {
    loadData();
    loadTools();
    loadUsers();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesRes, overdueRes] = await Promise.all([
        api.get('/tool-maintenance/schedules'),
        api.get('/tool-maintenance/overdue')
      ]);
      
      setSchedules(schedulesRes.data.data || []);
      setOverdueItems(overdueRes.data.data || []);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async () => {
    try {
      const response = await api.get('/tools?limit=1000');
      setTools(response.data.data || []);
    } catch (error) {
      console.error('Error loading tools:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users?limit=1000');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      await api.post('/tool-maintenance/schedules', scheduleData);
      alert.success('Success', 'Maintenance schedule created');
      setShowCreateModal(false);
      resetScheduleForm();
      loadData();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to create schedule');
    }
  };

  const handleRecordMaintenance = async () => {
    if (!selectedSchedule) return;

    try {
      await api.post('/tool-maintenance/records', {
        ...recordData,
        schedule_id: selectedSchedule.id
      });
      alert.success('Success', 'Maintenance recorded successfully');
      setShowRecordModal(false);
      resetRecordForm();
      loadData();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to record maintenance');
    }
  };

  const resetScheduleForm = () => {
    setScheduleData({
      tool_id: '',
      maintenance_type: 'CALIBRATION',
      frequency_days: 30,
      last_maintenance_date: '',
      assigned_to: '',
      instructions: ''
    });
  };

  const resetRecordForm = () => {
    setRecordData({
      maintenance_date: new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      notes: '',
      cost: ''
    });
  };

  const getDueBadge = (daysUntilDue: number) => {
    if (daysUntilDue < 0) {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (daysUntilDue <= 7) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else {
      return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center py-8">Loading maintenance schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔧 Tool Maintenance Schedule</h1>
          <p className="text-sm text-gray-600 mt-1">Manage tool maintenance schedules and track compliance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Schedule
        </button>
      </div>

      {/* Overdue Items Alert */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Overdue Maintenance ({overdueItems.length})</h3>
          </div>
          <div className="space-y-2">
            {overdueItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-red-700">{item.tool_name} - {item.maintenance_type}</span>
                <span className="text-red-600 font-medium">{Math.abs(item.days_until_due)} days overdue</span>
              </div>
            ))}
            {overdueItems.length > 3 && (
              <p className="text-xs text-red-600">...and {overdueItems.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Schedules Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedules</h3>
        </div>
        
        {schedules.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No maintenance schedules yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Done</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{schedule.tool_name}</div>
                        <div className="text-sm text-gray-500">{schedule.tool_code} • {schedule.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                        {schedule.maintenance_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Every {schedule.frequency_days} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {schedule.last_maintenance_date ? formatDate(schedule.last_maintenance_date) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{formatDate(schedule.next_due_date)}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getDueBadge(schedule.days_until_due)}`}>
                          {schedule.days_until_due < 0 ? `${Math.abs(schedule.days_until_due)}d overdue` :
                           schedule.days_until_due === 0 ? 'Due today' :
                           `${schedule.days_until_due}d left`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {schedule.assigned_to_name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setShowRecordModal(true);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Schedule Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetScheduleForm(); }}
        title="Create Maintenance Schedule"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tool *</label>
            <select
              value={scheduleData.tool_id}
              onChange={(e) => setScheduleData({...scheduleData, tool_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select tool...</option>
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id}>{tool.tool_name} ({tool.tool_code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Maintenance Type *</label>
              <select
                value={scheduleData.maintenance_type}
                onChange={(e) => setScheduleData({...scheduleData, maintenance_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="CALIBRATION">Calibration</option>
                <option value="INSPECTION">Inspection</option>
                <option value="REPAIR">Repair</option>
                <option value="REPLACEMENT">Replacement</option>
                <option value="CLEANING">Cleaning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency (Days) *</label>
              <input
                type="number"
                min="1"
                value={scheduleData.frequency_days}
                onChange={(e) => setScheduleData({...scheduleData, frequency_days: parseInt(e.target.value) || 30})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Maintenance Date</label>
              <input
                type="date"
                value={scheduleData.last_maintenance_date}
                onChange={(e) => setScheduleData({...scheduleData, last_maintenance_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Assign To</label>
              <select
                value={scheduleData.assigned_to}
                onChange={(e) => setScheduleData({...scheduleData, assigned_to: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name || user.name || user.username}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
            <textarea
              value={scheduleData.instructions}
              onChange={(e) => setScheduleData({...scheduleData, instructions: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Maintenance instructions..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreateSchedule}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Schedule
            </button>
            <button
              onClick={() => { setShowCreateModal(false); resetScheduleForm(); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </FormModal>

      {/* Record Maintenance Modal */}
      <FormModal
        isOpen={showRecordModal}
        onClose={() => { setShowRecordModal(false); resetRecordForm(); }}
        title={`Record Maintenance - ${selectedSchedule?.tool_name}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Maintenance Date *</label>
              <input
                type="date"
                value={recordData.maintenance_date}
                onChange={(e) => setRecordData({...recordData, maintenance_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status *</label>
              <select
                value={recordData.status}
                onChange={(e) => setRecordData({...recordData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cost</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={recordData.cost}
              onChange={(e) => setRecordData({...recordData, cost: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              value={recordData.notes}
              onChange={(e) => setRecordData({...recordData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Maintenance notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleRecordMaintenance}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Record Maintenance
            </button>
            <button
              onClick={() => { setShowRecordModal(false); resetRecordForm(); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}