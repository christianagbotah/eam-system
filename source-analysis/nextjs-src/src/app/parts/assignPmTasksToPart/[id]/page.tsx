'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface TaskRow {
  id: number;
  pm_task_id: string;
  frequency_value: string;
  pm_trigger_id: string;
  estimated_duration: string;
  pm_type_id: string;
  pm_mode_id: string;
  pm_inspection_type_id: string;
}

export default function AssignPmTasksPage() {
  const router = useRouter();
  const params = useParams();
  const partId = params.id;
  const [loading, setLoading] = useState(false);
  const [partName, setPartName] = useState<string>('');
  const [partCode, setPartCode] = useState<string>('');
  const [pmTasks, setPmTasks] = useState<any[]>([]);
  const [pmTypes, setPmTypes] = useState<any[]>([]);
  const [pmTriggers, setPmTriggers] = useState<any[]>([]);
  const [pmModes, setPmModes] = useState<any[]>([]);
  const [pmInspectionTypes, setPmInspectionTypes] = useState<any[]>([]);
  const [existingTasks, setExistingTasks] = useState<any[]>([]);
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [taskCounter, setTaskCounter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [pageLoading, setPageLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deletingTask, setDeletingTask] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setPageLoading(true);
      await Promise.all([fetchPmData(), fetchExistingTasks()]);
      setPageLoading(false);
    };
    loadData();
  }, [partId]);



  const fetchExistingTasks = async () => {
    try {
      const response = await api.get(`/part-pm-tasks/part/${partId}`);
      const result = response.data;
      console.log('Tasks result:', result);
      setExistingTasks(result.data || []);
      if (result.data && result.data.length > 0) {
        console.log('First task:', result.data[0]);
        setPartName(result.data[0].part_name || '');
        setPartCode(result.data[0].part_code || '');
      }
    } catch (error) {
      console.error('Error fetching existing tasks:', error);
    }
  };

  const fetchPmData = async () => {
    try {
      const [tasksRes, typesRes, triggersRes, modesRes, inspectionsRes] = await Promise.all([
        api.get('/pm-tasks'),
        api.get('/pm-types'),
        api.get('/pm-trigger-types'),
        api.get('/pm-modes'),
        api.get('/pm-inspection-types')
      ]);

      const tasks = tasksRes.data;
      const types = typesRes.data;
      const triggers = triggersRes.data;
      const modes = modesRes.data;
      const inspections = inspectionsRes.data;

      setPmTasks(tasks.data || []);
      setPmTypes(types.data || []);
      setPmTriggers(triggers.data || []);
      setPmModes(modes.data || []);
      setPmInspectionTypes(inspections.data || []);
    } catch (error) {
      console.error('Error fetching PM data:', error);
      showToast.error('Failed to load PM data');
    }
  };

  const addTaskRow = () => {
    const newTask: TaskRow = {
      id: taskCounter + 1,
      pm_task_id: '',
      frequency_value: '',
      pm_trigger_id: '',
      estimated_duration: '',
      pm_type_id: '',
      pm_mode_id: '',
      pm_inspection_type_id: ''
    };
    setTaskRows([...taskRows, newTask]);
    setTaskCounter(taskCounter + 1);
  };

  const removeTaskRow = (id: number) => {
    setTaskRows(taskRows.filter(task => task.id !== id));
  };

  const updateTaskRow = (id: number, field: keyof TaskRow, value: string) => {
    setTaskRows(taskRows.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const formatDuration = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) cleaned = cleaned.slice(0, -2) + ':' + cleaned.slice(-2);
    if (cleaned.length >= 5) cleaned = cleaned.slice(0, -5) + ':' + cleaned.slice(-5);
    return cleaned;
  };

  const handleEdit = (task: any) => {
    console.log('Editing task:', task);
    setEditingTask({
      id: task.id,
      pm_task_id: task.pm_task_id?.toString() || '',
      frequency_value: task.frequency_value?.toString() || '',
      pm_trigger_id: task.trigger_id?.toString() || task.pm_trigger_id?.toString() || '',
      estimated_duration: task.estimated_duration || '',
      pm_type_id: task.type_id?.toString() || task.pm_type_id?.toString() || '',
      pm_mode_id: task.mode_id?.toString() || task.pm_mode_id?.toString() || '',
      pm_inspection_type_id: task.inspection_type_id?.toString() || task.pm_inspection_type_id?.toString() || ''
    });
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    setLoading(true);
    const loadingToast = showToast.loading('Deleting task...');

    try {
      const response = await api.delete(`/part-pm-tasks/${deletingTask.id}`);

      const result = response.data;
      showToast.dismiss(loadingToast);
      
      if (result.status === 'success') {
        showToast.success('Task deleted successfully!');
        fetchExistingTasks();
        setDeletingTask(null);
      } else {
        showToast.error(result.message || 'Failed to delete task');
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Error deleting task');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Updating task...');

    try {
      const response = await api.put(`/part-pm-tasks/${editingTask.id}`),
        body: JSON.stringify(editingTask)
      });

      const result = response.data;
      showToast.dismiss(loadingToast);
      
      if (result.status === 'success') {
        showToast.success('Task updated successfully!');
        fetchExistingTasks();
        setEditingTask(null);
      } else {
        showToast.error(result.message || 'Failed to update task');
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Error updating task');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Creating tasks...');

    const payload = {
      part_id: partId,
      tasks: taskRows
    };
    console.log('Sending payload:', payload);

    try {
      const response = await api.post('/part-pm-tasks/batch'),
        body: JSON.stringify(payload)
      });

      const result = response.data;
      showToast.dismiss(loadingToast);
      
      if (result.status === 'success') {
        showToast.success(result.message || 'PM Tasks created successfully!');
        fetchExistingTasks();
        setTaskRows([]);
        setShowModal(false);
      } else {
        showToast.error(result.message || 'Failed to create tasks');
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Error creating tasks');
    } finally {
      setLoading(false);
    }
  };

  const bgColors = ['bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50', 'bg-pink-50', 'bg-indigo-50'];
  const borderColors = ['border-blue-200', 'border-green-200', 'border-yellow-200', 'border-purple-200', 'border-pink-200', 'border-indigo-200'];

  if (pageLoading) {
    return (
      <div className="bg-gray-50 p-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 rounded w-24"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {partName && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
            <h3 className="font-bold text-lg">{partName}</h3>
            <p className="text-sm text-gray-600">{partCode}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">PM Task History</h2>
              <p className="text-sm text-gray-600 mt-1">{existingTasks.length} tasks assigned</p>
            </div>
            <div className="flex gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-white shadow' : ''}`}
                >
                  Table
                </button>
              </div>
              <button
                onClick={() => { setShowModal(true); addTaskRow(); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create PM Task
              </button>
            </div>
          </div>

          {existingTasks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500 mb-4">No PM tasks assigned yet</p>
              <button
                onClick={() => { setShowModal(true); addTaskRow(); }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first PM task →
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {existingTasks.map((task: any) => (
                <div key={task.id} className="border rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900">{task.task_name}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(task)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingTask(task)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frequency:</span>
                      <span className="font-medium">{task.frequency_value} {task.trigger_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{task.type_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mode:</span>
                      <span className="font-medium">{task.mode_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{task.estimated_duration}</span>
                    </div>
                  </div>
                  {(task.trigger_id === 2 || task.trigger_name?.toLowerCase().includes('usage')) ? (
                    (task.next_due_meter_reading || task.next_due_date) && (
                      <div className="mt-3 pt-3 border-t">
                        {task.next_due_meter_reading && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Next Due Reading:</span>
                            <span className="text-xs font-semibold text-orange-600">{task.next_due_meter_reading} {task.meter_unit || 'units'}</span>
                          </div>
                        )}
                        {task.next_due_date && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-600">Next Due Date:</span>
                            <span className="text-xs font-semibold text-orange-600">{new Date(task.next_due_date).toLocaleDateString('en-GB')}</span>
                          </div>
                        )}
                        {task.last_meter_reading && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-600">Last Reading:</span>
                            <span className="text-xs text-gray-700">{task.last_meter_reading}</span>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    task.next_due_date && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Next Due:</span>
                          <span className="text-xs font-semibold text-orange-600">{new Date(task.next_due_date).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Task Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Frequency</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Mode</th>
                    <th className="px-4 py-3 text-left font-semibold">Duration</th>
                    <th className="px-4 py-3 text-left font-semibold">Next Due</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {existingTasks.map((task: any) => (
                    <tr key={task.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{task.task_name}</td>
                      <td className="px-4 py-3">{task.frequency_value} {task.trigger_name}</td>
                      <td className="px-4 py-3">{task.type_name}</td>
                      <td className="px-4 py-3">{task.mode_name}</td>
                      <td className="px-4 py-3">{task.estimated_duration}</td>
                      <td className="px-4 py-3">
                        {(task.trigger_id === 2 || task.trigger_name?.toLowerCase().includes('usage')) ? (
                          <div>
                            {task.next_due_meter_reading && (
                              <div className="text-orange-600 font-medium">{task.next_due_meter_reading} {task.meter_unit || 'units'}</div>
                            )}
                            {task.next_due_date && (
                              <div className="text-xs text-gray-600">{new Date(task.next_due_date).toLocaleDateString('en-GB')}</div>
                            )}
                            {!task.next_due_meter_reading && !task.next_due_date && '-'}
                          </div>
                        ) : (
                          task.next_due_date ? (
                            <span className="text-orange-600 font-medium">{new Date(task.next_due_date).toLocaleDateString('en-GB')}</span>
                          ) : '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingTask(task)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Create PM Tasks</h3>
                {partName && <p className="text-sm text-gray-800 font-semibold mt-1">{partName} ({partCode})</p>}
              </div>
              <button onClick={() => { setShowModal(false); setTaskRows([]); }} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {taskRows.map((task) => (
                  <div key={task.id}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Task #{task.id}</h4>
                      {taskRows.length > 1 && (
                        <button type="button" onClick={() => removeTaskRow(task.id)} className="text-red-600 hover:text-red-800">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Task Name</label>
                        <select
                          value={task.pm_task_id}
                          onChange={(e) => updateTaskRow(task.id, 'pm_task_id', e.target.value)}
                          className="w-full border rounded-lg px-3 py-2"
                          required
                        >
                          <option value="">Select Task</option>
                          {pmTasks.map(t => (
                            <option key={t.task_id} value={t.task_id}>{t.task_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Frequency Value</label>
                          <input
                            type="number"
                            value={task.frequency_value}
                            onChange={(e) => updateTaskRow(task.id, 'frequency_value', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Trigger</label>
                          <select
                            value={task.pm_trigger_id}
                            onChange={(e) => updateTaskRow(task.id, 'pm_trigger_id', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                          >
                            <option value="">Select</option>
                            {pmTriggers.map(t => (
                              <option key={t.trigger_id} value={t.trigger_id}>{t.trigger_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Duration</label>
                          <input
                            type="text"
                            value={task.estimated_duration}
                            onChange={(e) => updateTaskRow(task.id, 'estimated_duration', formatDuration(e.target.value))}
                            placeholder="HH:MM:SS"
                            className="w-full border rounded-lg px-3 py-2"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">PM Type</label>
                          <select
                            value={task.pm_type_id}
                            onChange={(e) => updateTaskRow(task.id, 'pm_type_id', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                          >
                            <option value="">Select</option>
                            {pmTypes.map(t => (
                              <option key={t.type_id} value={t.type_id}>{t.type_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">PM Mode</label>
                          <select
                            value={task.pm_mode_id}
                            onChange={(e) => updateTaskRow(task.id, 'pm_mode_id', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                          >
                            <option value="">Select</option>
                            {pmModes.map(m => (
                              <option key={m.mode_id} value={m.mode_id}>{m.mode_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Inspection Type</label>
                          <select
                            value={task.pm_inspection_type_id}
                            onChange={(e) => updateTaskRow(task.id, 'pm_inspection_type_id', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                          >
                            <option value="">Select</option>
                            {pmInspectionTypes.map(i => (
                              <option key={i.inspection_id} value={i.inspection_id}>{i.inspection_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    {taskRows.length > 1 && task.id !== taskRows[taskRows.length - 1].id && <hr className="my-6" />}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={addTaskRow}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Another Task
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setTaskRows([]); }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || taskRows.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Save Tasks
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Edit PM Task</h3>
                {partName && <p className="text-sm text-gray-800 font-semibold mt-1">{partName} ({partCode})</p>}
              </div>
              <button onClick={() => setEditingTask(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Task Name</label>
                  <select
                    value={editingTask.pm_task_id}
                    onChange={(e) => setEditingTask({...editingTask, pm_task_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Task</option>
                    {pmTasks.map(t => (
                      <option key={t.task_id} value={t.task_id}>{t.task_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Frequency Value</label>
                    <input
                      type="number"
                      value={editingTask.frequency_value}
                      onChange={(e) => setEditingTask({...editingTask, frequency_value: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Trigger</label>
                    <select
                      value={editingTask.pm_trigger_id}
                      onChange={(e) => setEditingTask({...editingTask, pm_trigger_id: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select</option>
                      {pmTriggers.map(t => (
                        <option key={t.trigger_id} value={t.trigger_id}>{t.trigger_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration</label>
                    <input
                      type="text"
                      value={editingTask.estimated_duration}
                      onChange={(e) => setEditingTask({...editingTask, estimated_duration: formatDuration(e.target.value)})}
                      placeholder="HH:MM:SS"
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">PM Type</label>
                    <select
                      value={editingTask.pm_type_id}
                      onChange={(e) => setEditingTask({...editingTask, pm_type_id: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select</option>
                      {pmTypes.map(t => (
                        <option key={t.type_id} value={t.type_id}>{t.type_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">PM Mode</label>
                    <select
                      value={editingTask.pm_mode_id}
                      onChange={(e) => setEditingTask({...editingTask, pm_mode_id: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select</option>
                      {pmModes.map(m => (
                        <option key={m.mode_id} value={m.mode_id}>{m.mode_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Inspection Type</label>
                    <select
                      value={editingTask.pm_inspection_type_id}
                      onChange={(e) => setEditingTask({...editingTask, pm_inspection_type_id: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select</option>
                      {pmInspectionTypes.map(i => (
                        <option key={i.inspection_id} value={i.inspection_id}>{i.inspection_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete PM Task</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">{deletingTask.task_name}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingTask(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
