'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { modelService } from '@/services/modelService';
import { useAlert } from '@/hooks/useAlert';

interface UploadProgress {
  modelId?: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message: string;
}

export default function ModelUploadPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = useCallback(async (files: FileList | null, machineId: number) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['glb', 'gltf', 'svg', 'zip'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      showAlert('Invalid File Type', 'Please upload GLB, GLTF, SVG, or ZIP files.', 'error');
      return;
    }

    setUploadProgress({
      progress: 0,
      status: 'uploading',
      message: 'Uploading model...'
    });

    try {
      const result = await modelService.uploadModel(machineId, file, (progress) => {
        setUploadProgress(prev => prev ? { ...prev, progress } : null);
      });

      setUploadProgress({
        modelId: result.model_id,
        progress: 100,
        status: 'processing',
        message: 'Processing model...'
      });

      // Poll for processing status
      if (result.processing_job_id) {
        pollProcessingStatus(result.processing_job_id);
      } else {
        setUploadProgress({
          modelId: result.model_id,
          progress: 100,
          status: 'completed',
          message: 'Model uploaded successfully!'
        });
      }

    } catch (error) {
      setUploadProgress({
        progress: 0,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  }, [showAlert]);

  const pollProcessingStatus = useCallback(async (jobId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const status = await modelService.getProcessingStatus(jobId);
        
        if (status.status === 'success') {
          setUploadProgress(prev => prev ? {
            ...prev,
            status: 'completed',
            message: 'Model processed successfully!'
          } : null);
          return;
        }

        if (status.status === 'failed') {
          setUploadProgress(prev => prev ? {
            ...prev,
            status: 'failed',
            message: status.logs || 'Processing failed'
          } : null);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setUploadProgress(prev => prev ? {
            ...prev,
            status: 'failed',
            message: 'Processing timeout'
          } : null);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setTimeout(poll, 5000);
      }
    };

    poll();
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (selectedMachine && e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files, selectedMachine);
    }
  }, [selectedMachine, handleFileUpload]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Upload 3D/2D Models</h1>
        <p className="text-gray-600">Upload GLB, GLTF, SVG, or ZIP files for machine visualization</p>
      </div>

      <Card className="mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Select Machine</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { id: 1, name: 'CNC Machine #1', code: 'CNC-001' },
              { id: 2, name: 'Hydraulic Press #2', code: 'HP-002' },
              { id: 3, name: 'Assembly Line #3', code: 'AL-003' },
            ].map((machine) => (
              <div
                key={machine.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedMachine === machine.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedMachine(machine.id)}
              >
                <h3 className="font-semibold">{machine.name}</h3>
                <p className="text-sm text-gray-600">{machine.code}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {selectedMachine && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Model File</h2>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your model file here, or click to browse
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Supports GLB, GLTF, SVG, and ZIP files up to 100MB
              </p>
              
              <input
                type="file"
                className="hidden"
                id="file-upload"
                accept=".glb,.gltf,.svg,.zip"
                onChange={(e) => handleFileUpload(e.target.files, selectedMachine)}
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Choose File
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>GLB (3D)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>GLTF (3D)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>SVG (2D)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                <span>ZIP (Archive)</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {uploadProgress && (
        <Modal
          isOpen={true}
          onClose={() => uploadProgress.status === 'completed' && setUploadProgress(null)}
          title="Model Upload Progress"
        >
          <div className="p-6">
            <div className="mb-4">
              <div className="flex justify-between text-sm font-medium text-gray-900 mb-2">
                <span>{uploadProgress.message}</span>
                <span>{uploadProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    uploadProgress.status === 'failed' ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>
            </div>

            {uploadProgress.status === 'processing' && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Processing model...</span>
              </div>
            )}

            {uploadProgress.status === 'completed' && (
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setUploadProgress(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (uploadProgress.modelId) {
                      router.push(`/models/${uploadProgress.modelId}`);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  View Model
                </button>
              </div>
            )}

            {uploadProgress.status === 'failed' && (
              <div className="flex justify-end">
                <button
                  onClick={() => setUploadProgress(null)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
