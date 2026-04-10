'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface Document {
  id: number;
  title: string;
  category: string;
  version: string;
  status: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

const CATEGORIES = ['Manual', 'SOP', 'Drawing', 'Certificate', 'Report', 'Policy'];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(documents);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? documents.filter(d => selectedIds.includes(d.id)) : documents;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(d => Object.values(d).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowUpload(true),
    onExport: handleExport,
    onClose: () => setShowUpload(false)
  });
  const [uploadData, setUploadData] = useState({
    title: '',
    category: 'Manual',
    asset_id: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchDocuments();
  }, [filter, search]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams({ category: filter, search }).toString();
      const res = await fetch(`/api/v1/eam/documents?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setDocuments(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.file) return;

    const formData = new FormData();
    formData.append('title', uploadData.title);
    formData.append('category', uploadData.category);
    formData.append('asset_id', uploadData.asset_id);
    formData.append('file', uploadData.file);

    const loadingToast = showToast.loading('Uploading document...');
    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast.dismiss(loadingToast);
      showToast.success('Document uploaded successfully!');
      setShowUpload(false);
      fetchDocuments();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Upload failed');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} documents?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} documents...`);
    try {
      const token = localStorage.getItem('access_token');
      await Promise.all(selectedIds.map(id => 
        api.delete(`/documents/${id}`)
      ));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} documents deleted`);
      clearSelection();
      fetchDocuments();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete documents');
    }
  };

  const downloadDocument = async (id: number, fileName: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/eam/documents/${id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      showToast.success('Download started');
    } catch (error) {
      showToast.error('Download failed');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-base font-semibold">Document Management</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded">📥 Export</button>
          <button onClick={() => setShowUpload(true)} className="px-4 py-2 bg-blue-600 text-white rounded">+ Upload Document</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="border rounded px-3 py-2"
          />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded px-3 py-2">
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={documents.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <input type="checkbox" checked={selectedIds.length === documents.length && documents.length > 0} onChange={selectAll} />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={isSelected(doc.id)} onChange={() => toggleSelect(doc.id)} />
                  </td>
                  <td className="px-6 py-4">{doc.title}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">{doc.category}</span>
                </td>
                <td className="px-3 py-2.5 text-sm">v{doc.version}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${doc.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm">{(doc.file_size / 1024).toFixed(1)} KB</td>
                <td className="px-3 py-2.5 text-sm">{formatDate(doc.created_at)}</td>
                <td className="px-3 py-2.5 text-sm space-x-2">
                  <button onClick={() => downloadDocument(doc.id, doc.file_name)} className="text-blue-600 hover:text-blue-800">
                    Download
                  </button>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Upload Document</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={e => setUploadData({...uploadData, title: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  value={uploadData.category}
                  onChange={e => setUploadData({...uploadData, category: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Asset ID (Optional)</label>
                <input
                  type="text"
                  value={uploadData.asset_id}
                  onChange={e => setUploadData({...uploadData, asset_id: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">File</label>
                <input
                  type="file"
                  onChange={e => setUploadData({...uploadData, file: e.target.files?.[0] || null})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
