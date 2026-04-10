'use client';

import { useState, useEffect } from 'react';
import { maintenanceService } from '@/services/maintenanceService';
import { showToast } from '@/lib/toast';

interface Attachment {
  id: number;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

interface AttachmentsProps {
  entityType: string;
  entityId: number;
  currentUserId: number;
}

export default function Attachments({ entityType, entityId, currentUserId }: AttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  const loadAttachments = async () => {
    try {
      const res = await maintenanceService.getAttachments(entityType, entityId);
      setAttachments(res.data.data || []);
    } catch (error) {
      showToast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId.toString());
    formData.append('user_id', currentUserId.toString());

    setUploading(true);
    try {
      await maintenanceService.uploadAttachment(formData);
      showToast.success('File uploaded');
      loadAttachments();
      e.target.value = '';
    } catch (error) {
      showToast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      const res = await maintenanceService.downloadAttachment(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast.error('Failed to download file');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await maintenanceService.deleteAttachment(id);
      showToast.success('Attachment deleted');
      loadAttachments();
    } catch (error) {
      showToast.error('Failed to delete attachment');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (loading) return <div className="text-gray-500">Loading attachments...</div>;

  return (
    <div className="space-y-4">
      <div>
        <label className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer inline-block">
          {uploading ? 'Uploading...' : '📎 Upload File'}
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="space-y-2">
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
            <div className="flex-1">
              <p className="font-medium text-gray-800">{a.file_name}</p>
              <p className="text-sm text-gray-500">
                {formatSize(a.file_size)} • {a.uploaded_by} • {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(a.id, a.file_name)}
                className="text-blue-600 hover:text-blue-700"
              >
                Download
              </button>
              <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-700">
                Delete
              </button>
            </div>
          </div>
        ))}
        {attachments.length === 0 && <p className="text-gray-500 text-center py-4">No attachments yet</p>}
      </div>
    </div>
  );
}
