'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/separator';
import {
  Upload,
  FileIcon,
  ImageIcon,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Download,
  Trash2,
  X,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  entityType: string;
  entityId: string;
  uploadedById: string;
  uploadedAt: string;
  description?: string;
  uploadedBy: {
    id: string;
    fullName: string;
    username: string;
  };
}

interface FileUploadProps {
  entityType: string;
  entityId: string;
  canDelete?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-emerald-600" />;
  if (fileType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
  if (
    fileType.includes('spreadsheet') ||
    fileType.includes('excel') ||
    fileType === 'text/csv'
  ) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (
    fileType === 'application/zip' ||
    fileType === 'application/x-zip-compressed' ||
    fileType === 'application/gzip' ||
    fileType === 'application/x-rar-compressed' ||
    fileType === 'application/x-7z-compressed'
  ) return <FileArchive className="h-4 w-4 text-amber-600" />;
  return <FileIcon className="h-4 w-4 text-slate-500" />;
}

function getFileExtensionColor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf': return 'bg-red-100 text-red-700';
    case 'doc':
    case 'docx': return 'bg-blue-100 text-blue-700';
    case 'xls':
    case 'xlsx':
    case 'csv': return 'bg-green-100 text-green-700';
    case 'ppt':
    case 'pptx': return 'bg-orange-100 text-orange-700';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp': return 'bg-emerald-100 text-emerald-700';
    case 'zip':
    case 'rar':
    case '7z':
    case 'gz': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export function FileUpload({ entityType, entityId, canDelete: canDeleteProp }: FileUploadProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasPermission, isAdmin } = useAuthStore();

  const canDelete = canDeleteProp !== undefined
    ? canDeleteProp
    : isAdmin() || hasPermission('attachments.delete');

  // Fetch existing attachments
  const fetchAttachments = useCallback(async () => {
    try {
      const res = await api.get<Attachment[]>(
        `/api/attachments?entityType=${entityType}&entityId=${entityId}`
      );
      if (res.success && res.data) {
        setAttachments(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  React.useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) {
        toast.error(`"${file.name}" exceeds 10MB limit`);
        continue;
      }
      validFiles.push(file);
    }
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  // Remove file from selection
  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 15, 90));
      }, 200);

      const res = await api.post<Attachment[]>('/api/attachments', formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.success) {
        const count = Array.isArray(res.data) ? res.data.length : 0;
        toast.success(`${count} file${count !== 1 ? 's' : ''} uploaded`);
        setSelectedFiles([]);
        fetchAttachments();
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Download file
  const handleDownload = async (attachment: Attachment) => {
    try {
      const token = localStorage.getItem('eam_token');
      const link = document.createElement('a');
      link.href = `/api/attachments/${attachment.id}`;
      link.download = attachment.fileName;
      if (token) {
        // We'll open in new tab since direct download with auth header requires fetch
        const response = await fetch(`/api/attachments/${attachment.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          toast.error('Failed to download file');
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      toast.error('Download failed');
    }
  };

  // Delete file
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/api/attachments/${deleteTarget.id}`);
      if (res.success) {
        toast.success('Attachment deleted');
        setAttachments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      } else {
        toast.error(res.error || 'Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Attachments</CardTitle>
            <CardDescription className="text-xs">
              {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 hover:border-slate-300'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.rar,.7z,.gz"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drop files here or <span className="text-emerald-600 font-medium">browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Images, PDFs, docs, spreadsheets, ZIP — max 10MB each
          </p>
        </div>

        {/* Selected Files Queue */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</p>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </span>
                )}
              </Button>
            </div>
            {uploading && <Progress value={uploadProgress} className="h-1.5" />}
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-1.5">
                  {getFileIcon(file.type)}
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-muted-foreground text-xs shrink-0">{formatFileSize(file.size)}</span>
                  <button
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeSelectedFile(idx); }}
                    disabled={uploading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Attachments List */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No attachments yet</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 text-sm bg-muted/30 hover:bg-muted/50 rounded-lg px-3 py-2 transition-colors group"
              >
                {/* File icon */}
                <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center shrink-0">
                  {getFileIcon(att.fileType)}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{att.fileName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(att.fileSize)}</span>
                    <span>·</span>
                    <span>{att.uploadedBy?.fullName || 'Unknown'}</span>
                  </div>
                </div>

                {/* File extension badge */}
                <span
                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${getFileExtensionColor(att.fileName)}`}
                >
                  {att.fileName.split('.').pop()}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleDownload(att)}
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(att)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Attachment"
        description={`Are you sure you want to delete "${deleteTarget?.fileName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
