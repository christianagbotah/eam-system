'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';

export default function IoTRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(rules);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? rules.filter(r => selectedIds.includes(r.id)) : rules;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iot-rules-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => { setEditingRule(null); setFormData({ asset_id: '', metric_type: 'vibration', warning_threshold: '', critical_threshold: '', action: 'alert', is_active: true }); setShowModal(true); },
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });

  const [formData, setFormData] = useState({
    asset_id: '',
    metric_type: 'vibration',
    warning_threshold: '',
    critical_threshold: '',
    action: 'alert',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, assetsRes] = await Promise.all([
        fetch(`/api/v1/eam/iot/rules`).then(r => r.json()),
        fetch(`/api/v1/eam/equipment`).then(r => r.json())
      ]);
      setRules(rulesRes.data || []);
      setAssets(assetsRes.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading(editingRule ? 'Updating rule...' : 'Creating rule...');
    try {
      const url = editingRule ? `/api/v1/eam/iot/rules/${editingRule.id}` : `/api/v1/eam/iot/rules`;
      await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      showToast.dismiss(loadingToast);
      showToast.success(editingRule ? 'Rule updated successfully!' : 'Rule created successfully!');
      setShowModal(false);
      setEditingRule(null);
      setFormData({ asset_id: '', metric_type: 'vibration', warning_threshold: '', critical_threshold: '', action: 'alert', is_active: true });
      loadData();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to save rule');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} rules?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} rules...`);
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/v1/eam/iot/rules/${id}`, { method: 'DELETE' })));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} rules deleted`);
      clearSelection();
      loadData();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete rules');
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setFormData(rule);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    const loadingToast = showToast.loading('Deleting...');
    try {
      await fetch(`/api/v1/eam/iot/rules/${id}`, { method: 'DELETE' });
      showToast.dismiss(loadingToast);
      showToast.success('Rule deleted');
      loadData();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete rule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">IoT Alert Rules</h1>
          <p className="text-xs text-gray-600 mt-0.5">Configure automated alerts and actions based on sensor thresholds</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
          <button onClick={() => { setEditingRule(null); setFormData({ asset_id: '', metric_type: 'vibration', warning_threshold: '', critical_threshold: '', action: 'alert', is_active: true }); setShowModal(true); }} className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700">
            + Add Rule
          </button>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={rules.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      {loading ? (
        <CardSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{rule.asset_name || `Asset ${rule.asset_id}`}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {rule.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Metric:</span>
                  <span className="font-medium">{rule.metric_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Warning:</span>
                  <span className="font-medium text-yellow-600">{rule.warning_threshold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Critical:</span>
                  <span className="font-medium text-red-600">{rule.critical_threshold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Action:</span>
                  <span className="font-medium">{rule.action}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleEdit(rule)} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded hover:bg-blue-100">Edit</button>
                <button onClick={() => handleDelete(rule.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded hover:bg-red-100">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingRule ? 'Edit Rule' : 'Add Rule'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Asset</label>
            <select value={formData.asset_id} onChange={(e) => setFormData({...formData, asset_id: e.target.value})} className="w-full border rounded px-3 py-2" required>
              <option value="">Select Asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Metric Type</label>
            <select value={formData.metric_type} onChange={(e) => setFormData({...formData, metric_type: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="vibration">Vibration (mm/s)</option>
              <option value="temperature">Temperature (°C)</option>
              <option value="pressure">Pressure (bar)</option>
              <option value="rpm">RPM</option>
              <option value="power">Power (kW)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Warning Threshold</label>
              <input type="number" step="0.01" value={formData.warning_threshold} onChange={(e) => setFormData({...formData, warning_threshold: e.target.value})} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Critical Threshold</label>
              <input type="number" step="0.01" value={formData.critical_threshold} onChange={(e) => setFormData({...formData, critical_threshold: e.target.value})} className="w-full border rounded px-3 py-2" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Action</label>
            <select value={formData.action} onChange={(e) => setFormData({...formData, action: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="alert">Alert Only</option>
              <option value="alert_and_email">Alert + Email</option>
              <option value="alert_and_wo">Alert + Create Work Order</option>
              <option value="shutdown">Emergency Shutdown</option>
            </select>
          </div>
          <div className="flex items-center">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="mr-2" />
            <label className="text-sm font-medium">Active</label>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            {editingRule ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
