'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { pmService } from '@/services/pmService';
import { assetService } from '@/services/assetService';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import RBACGuard from '@/components/RBACGuard';

function PMSchedulesContent() {
  const [rules, setRules] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(rules);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? rules.filter((r: any) => selectedIds.includes(r.id)) : rules;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((r: any) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pm-schedules-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowRuleModal(true),
    onExport: handleExport,
    onClose: () => setShowRuleModal(false)
  });

  const [newRule, setNewRule] = useState({
    asset_id: '',
    rule_name: '',
    trigger_type: 'time_based',
    frequency_value: '',
    frequency_unit: 'days',
    is_active: true
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rulesRes, schedulesRes, assetsRes] = await Promise.all([
        pmService.getPMRules(),
        pmService.getPMSchedules(),
        api.get('/assets-unified').then(r => r.data)
      ]);
      setRules(rulesRes.data || []);
      setSchedules(schedulesRes.data || []);
      setAssets(assetsRes.data || []);
    } catch (error: any) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Creating PM rule...');
    try {
      await pmService.createPMRule(newRule);
      showToast.dismiss(loadingToast);
      showToast.success('PM rule created successfully!');
      setShowRuleModal(false);
      setNewRule({ asset_id: '', rule_name: '', trigger_type: 'time_based', frequency_value: '', frequency_unit: 'days', is_active: true });
      loadData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to create rule');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} PM rules?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} rules...`);
    try {
      await Promise.all(selectedIds.map(id => pmService.deletePMRule(id)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} rules deleted`);
      clearSelection();
      loadData();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete rules');
    }
  };

  const handleGenerateSchedules = async () => {
    const loadingToast = showToast.loading('Generating schedules...');
    try {
      await pmService.generateSchedules();
      showToast.dismiss(loadingToast);
      showToast.success('Schedules generated successfully!');
      loadData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to generate schedules');
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-base font-semibold">PM Schedules</h1>
          <div className="space-x-2">
            <button onClick={handleExport} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">📥 Export</button>
            <button onClick={() => setShowRuleModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Create Rule</button>
            <button onClick={handleGenerateSchedules} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Generate Schedules</button>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">PM Rules</h2>
            {loading ? (
              <CardSkeleton count={4} />
            ) : (
              <div className="space-y-3">
                {rules.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No PM rules</p>
                ) : (
                  rules.map((rule: any) => (
                    <div key={rule.id} className="border rounded p-3 relative">
                      <input type="checkbox" checked={isSelected(rule.id)} onChange={() => toggleSelect(rule.id)} className="absolute top-2 right-2" />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{rule.rule_name}</p>
                          <p className="text-sm text-gray-600">{rule.trigger_type}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Upcoming Schedules</h2>
            <div className="space-y-3">
              {schedules.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No schedules</p>
              ) : (
                schedules.slice(0, 10).map((schedule: any) => (
                  <div key={schedule.id} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Schedule #{schedule.id}</p>
                        <p className="text-sm text-gray-600">Due: {schedule.due_date}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                        schedule.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{schedule.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <Modal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title="Create PM Rule">
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Rule Name</label>
              <input type="text" value={newRule.rule_name} onChange={(e) => setNewRule({...newRule, rule_name: e.target.value})} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Asset</label>
              <select value={newRule.asset_id} onChange={(e) => setNewRule({...newRule, asset_id: e.target.value})} className="w-full border rounded px-3 py-2" required>
                <option value="">Select Asset</option>
                {assets.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_name} ({asset.asset_code}) - {asset.asset_type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Trigger Type</label>
              <select value={newRule.trigger_type} onChange={(e) => setNewRule({...newRule, trigger_type: e.target.value})} className="w-full border rounded px-3 py-2">
                <option value="time_based">Time Based</option>
                <option value="meter_based">Meter Based</option>
                <option value="calendar_based">Calendar Based</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Frequency</label>
                <input type="number" value={newRule.frequency_value} onChange={(e) => setNewRule({...newRule, frequency_value: e.target.value})} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Unit</label>
                <select value={newRule.frequency_unit} onChange={(e) => setNewRule({...newRule, frequency_unit: e.target.value})} className="w-full border rounded px-3 py-2">
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Create Rule</button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default function PMSchedulesPage() {
  return (
    <RBACGuard module="pm_schedules" action="view">
      <PMSchedulesContent />
    </RBACGuard>
  );
}
