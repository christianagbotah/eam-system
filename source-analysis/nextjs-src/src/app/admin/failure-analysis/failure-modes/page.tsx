'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Edit, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';

function FailureModesContent() {
  const [search, setSearch] = useState('');
  const [modes, setModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState<any>(null);
  const [formData, setFormData] = useState({ code: '', name: '', category: '', description: '', severity: 5, occurrence: 5, detection: 5 });

  useEffect(() => {
    fetchModes();
  }, []);

  const fetchModes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/failure-modes');
      if (res.data?.status === 'success') {
        setModes(res.data.data || []);
      }
    } catch (error) {
      showToast.error('Failed to load failure modes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = editMode 
        ? await api.put(`/failure-modes/${editMode.id}`, formData)
        : await api.post('/failure-modes', formData);
      if (res.data?.status === 'success') {
        showToast.success(editMode ? 'Updated successfully' : 'Created successfully');
        setShowModal(false);
        setEditMode(null);
        setFormData({ code: '', name: '', category: '', description: '', severity: 5, occurrence: 5, detection: 5 });
        fetchModes();
      }
    } catch (error) {
      showToast.error('Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this failure mode?')) return;
    try {
      await api.delete(`/failure-modes/${id}`);
      showToast.success('Deleted successfully');
      fetchModes();
    } catch (error) {
      showToast.error('Delete failed');
    }
  };

  const handleEdit = (mode: any) => {
    setEditMode(mode);
    setFormData({ code: mode.code, name: mode.name, category: mode.category, description: mode.description, severity: mode.severity, occurrence: mode.occurrence, detection: mode.detection });
    setShowModal(true);
  };

  const filtered = modes.filter((m: any) => m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="min-h-screen bg-gray-50 p-4 md:p-6"><div className="max-w-7xl mx-auto"><TableSkeleton rows={10} /></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link href="/admin/failure-analysis" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></Link>
            <div>
              <h1 className="text-base font-semibold">Failure Modes Library</h1>
              <p className="text-gray-600">FMEA catalog & RPN analysis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchModes} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => { setEditMode(null); setFormData({ code: '', name: '', category: '', description: '', severity: 5, occurrence: 5, detection: 5 }); setShowModal(true); }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"><Plus className="w-4 h-4" />Add Mode</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search failure modes..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-2 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Total Modes</div>
            <div className="text-lg font-semibold">{modes.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">High Risk (RPN &gt; 150)</div>
            <div className="text-lg font-semibold text-red-600">{modes.filter((m: any) => m.rpn > 150).length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Avg RPN</div>
            <div className="text-lg font-semibold">{modes.length ? Math.round(modes.reduce((a: number, b: any) => a + b.rpn, 0) / modes.length) : 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No failure modes found</div>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Failure Mode</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">S</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">O</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">D</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">RPN</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((mode: any) => (
                  <tr key={mode.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{mode.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{mode.name}</div>
                      <div className="text-sm text-gray-600">{mode.description}</div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{mode.category}</span></td>
                    <td className="px-4 py-3 text-center">{mode.severity}</td>
                    <td className="px-4 py-3 text-center">{mode.occurrence}</td>
                    <td className="px-4 py-3 text-center">{mode.detection}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${mode.rpn > 150 ? 'bg-red-100 text-red-800' : mode.rpn > 100 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{mode.rpn}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(mode)} className="p-1 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(mode.id)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">FMEA Risk Priority Number (RPN)</div>
              <div className="text-sm text-blue-700 mt-1">RPN = Severity × Occurrence × Detection. High RPN (&gt;150) requires immediate action.</div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">{editMode ? 'Edit' : 'Add'} Failure Mode</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Code</label>
                <input type="text" required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select...</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Control">Control</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2"></textarea>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Severity (1-10)</label>
                  <input type="number" min="1" max="10" required value={formData.severity} onChange={(e) => setFormData({...formData, severity: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Occurrence (1-10)</label>
                  <input type="number" min="1" max="10" required value={formData.occurrence} onChange={(e) => setFormData({...formData, occurrence: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Detection (1-10)</label>
                  <input type="number" min="1" max="10" required value={formData.detection} onChange={(e) => setFormData({...formData, detection: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="text-sm text-gray-600">RPN: {formData.severity * formData.occurrence * formData.detection}</div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => { setShowModal(false); setEditMode(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FailureModesPage() {
  return (
    <RBACGuard module="failure_analysis" action="view">
      <FailureModesContent />
    </RBACGuard>
  );
}
