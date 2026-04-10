'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiDownload, FiFilter, FiX } from 'react-icons/fi';

interface WorkOrder {
  id: number;
  wo_number: string;
  title: string;
  description: string;
  asset_name: string;
  priority: string;
  status: string;
  assigned_to_name: string;
  created_at: string;
  due_date: string;
}

interface Stats {
  total: number;
  open: number;
  in_progress: number;
  completed: number;
}

export default function WorkOrdersPage() {
  const { hasPermission } = usePermissions();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, in_progress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });

  const canCreate = hasPermission('work_orders.create');
  const canEdit = hasPermission('work_orders.edit');
  const canDelete = hasPermission('work_orders.delete');
  const canAssign = hasPermission('work_orders.assign');
  const canApprove = hasPermission('work_orders.approve');
  const canExecute = hasPermission('work_orders.execute');

  useEffect(() => {
    fetchWorkOrders();
  }, [filters]);

  const fetchWorkOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`http://localhost/factorymanager/public/index.php/api/v1/eam/work-orders?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setWorkOrders(data.data);
        calculateStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orders: WorkOrder[]) => {
    setStats({
      total: orders.length,
      open: orders.filter(wo => wo.status === 'Open').length,
      in_progress: orders.filter(wo => wo.status === 'In Progress').length,
      completed: orders.filter(wo => wo.status === 'Completed').length
    });
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (!confirm('Delete this work order?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost/factorymanager/public/index.php/api/v1/eam/work-orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        fetchWorkOrders();
      }
    } catch (error) {
      console.error('Error deleting work order:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['WO Number', 'Title', 'Asset', 'Priority', 'Status', 'Assigned To', 'Due Date'],
      ...workOrders.map(wo => [wo.wo_number, wo.title, wo.asset_name, wo.priority, wo.status, wo.assigned_to_name, wo.due_date])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Work Orders</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <FiDownload /> Export
          </button>
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <FiPlus /> Create Work Order
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Open</div>
          <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-2xl font-bold text-purple-600">{stats.in_progress}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <FiFilter className="text-gray-600" />
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-3 py-2 border rounded-lg flex-1 min-w-[200px]"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Priority</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          {(filters.status || filters.priority || filters.search) && (
            <button onClick={() => setFilters({ status: '', priority: '', search: '' })} className="text-gray-600 hover:text-gray-800">
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workOrders.map((wo) => (
              <tr key={wo.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{wo.wo_number}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{wo.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wo.asset_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(wo.priority)}`}>
                    {wo.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>
                    {wo.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wo.assigned_to_name || 'Unassigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wo.due_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    {canAssign && (
                      <button onClick={() => { setSelectedWO(wo); setShowAssignModal(true); }} className="text-blue-600 hover:text-blue-900">
                        <FiUser />
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => { setSelectedWO(wo); setShowCreateModal(true); }} className="text-indigo-600 hover:text-indigo-900">
                        <FiEdit2 />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(wo.id)} className="text-red-600 hover:text-red-900">
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateWorkOrderModal
          workOrder={selectedWO}
          onClose={() => { setShowCreateModal(false); setSelectedWO(null); }}
          onSuccess={() => { fetchWorkOrders(); setShowCreateModal(false); setSelectedWO(null); }}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedWO && (
        <AssignWorkOrderModal
          workOrder={selectedWO}
          onClose={() => { setShowAssignModal(false); setSelectedWO(null); }}
          onSuccess={() => { fetchWorkOrders(); setShowAssignModal(false); setSelectedWO(null); }}
        />
      )}
    </div>
  );
}

function CreateWorkOrderModal({ workOrder, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    asset_id: workOrder?.asset_id || '',
    priority: workOrder?.priority || 'Medium',
    due_date: workOrder?.due_date || ''
  });
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') setAssets(data.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = workOrder
        ? `http://localhost/factorymanager/public/index.php/api/v1/eam/work-orders/${workOrder.id}`
        : 'http://localhost/factorymanager/public/index.php/api/v1/eam/work-orders';
      
      const response = await fetch(url, {
        method: workOrder ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving work order:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{workOrder ? 'Edit' : 'Create'} Work Order</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
              <select
                value={formData.asset_id}
                onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Select Asset</option>
                {assets.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>{asset.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {workOrder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignWorkOrderModal({ workOrder, onClose, onSuccess }: any) {
  const [assignedTo, setAssignedTo] = useState(workOrder.assigned_to || '');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') setUsers(data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost/factorymanager/public/index.php/api/v1/eam/work-orders/${workOrder.id}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assigned_to: assignedTo })
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        onSuccess();
      }
    } catch (error) {
      console.error('Error assigning work order:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Assign Work Order</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select User</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
