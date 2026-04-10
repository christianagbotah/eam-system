'use client';

import { useState, useEffect } from 'react';
import { DocumentIcon, PhotoIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';

interface Attachment {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface AttachmentsCardProps {
  workOrderId: string;
}

export default function AttachmentsCard({ workOrderId }: AttachmentsCardProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttachments();
  }, [workOrderId]);

  const fetchAttachments = async () => {
    try {
      const response = await api.get(`/work-orders/${workOrderId}/attachments`);
      setAttachments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className="h-5 w-5 text-blue-500" />;
    }
    return <DocumentIcon className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files[]', file);
      });

      await api.post(`/work-orders/${workOrderId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      fetchAttachments();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachmentId: number) => {
    try {
      window.open(`/api/v1/eam/attachments/${attachmentId}/download`, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">Loading attachments...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
        <label className="bg-blue-600 text-white px-3 py-1 rounded text-sm cursor-pointer hover:bg-blue-700">
          {uploading ? 'Uploading...' : 'Upload Files'}
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-8">
          <PaperClipIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
              {getFileIcon(attachment.mime_type)}
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{attachment.original_name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={() => handleDownload(attachment.id)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
