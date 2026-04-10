'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Box } from 'lucide-react';

interface ModelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, modelType: '2D' | '3D', machineId: number) => Promise<void>;
  machineId: number;
  machineName: string;
}

export default function ModelUploadModal({
  isOpen,
  onClose,
  onUpload,
  machineId,
  machineName
}: ModelUploadModalProps) {
  const [modelType, setModelType] = useState<'2D' | '3D'>('3D');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const acceptedTypes = {
    '2D': '.svg,.png,.jpg,.jpeg',
    '3D': '.glb,.gltf'
  };

  const handleFileSelect = (file: File) => {
    const validTypes = {
      '2D': ['image/svg+xml', 'image/png', 'image/jpeg'],
      '3D': ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
    };

    if (!validTypes[modelType].includes(file.type) && 
        !(modelType === '3D' && (file.name.endsWith('.glb') || file.name.endsWith('.gltf')))) {
      alert(`Invalid file type for ${modelType} model`);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await onUpload(selectedFile, modelType, machineId);
      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Upload Model</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Machine: {machineName}
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="modelType"
                  value="2D"
                  checked={modelType === '2D'}
                  onChange={(e) => setModelType(e.target.value as '2D' | '3D')}
                  className="mr-2"
                />
                <FileText size={20} className="mr-2" />
                2D Diagram
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="modelType"
                  value="3D"
                  checked={modelType === '3D'}
                  onChange={(e) => setModelType(e.target.value as '2D' | '3D')}
                  className="mr-2"
                />
                <Box size={20} className="mr-2" />
                3D Model
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes[modelType]}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="text-center">
                  <div className="text-green-600 mb-2">
                    <Upload size={32} className="mx-auto" />
                  </div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload size={32} className="mx-auto mb-2" />
                  <div>Drop your {modelType} file here or click to browse</div>
                  <div className="text-sm mt-1">
                    Supported formats: {acceptedTypes[modelType]}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-6">
            <h4 className="font-medium mb-2">File Requirements:</h4>
            <ul className="list-disc list-inside space-y-1">
              {modelType === '2D' ? (
                <>
                  <li>SVG files with clickable elements (recommended)</li>
                  <li>PNG/JPEG images for reference diagrams</li>
                  <li>Maximum file size: 10MB</li>
                </>
              ) : (
                <>
                  <li>GLTF/GLB format with proper mesh naming</li>
                  <li>Optimized for web viewing (&lt;50MB)</li>
                  <li>Include materials and textures</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Model
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
