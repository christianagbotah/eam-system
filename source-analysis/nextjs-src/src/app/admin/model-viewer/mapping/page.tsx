'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function ModelMappingManagementPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useKeyboardShortcuts({
    onClose: () => window.history.back()
  });

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Mesh Mapping Management</h1>
          <p className="text-gray-600">Manage mesh-to-part mappings for all models</p>
        </div>
        <Link
          href="/models/upload"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Upload New Model
        </Link>
      </div>

      <Card>
        <div className="p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Mesh Mapping Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a specific model to manage its mesh-to-part mappings.
          </p>
          <div className="mt-6 space-y-2">
            <p className="text-sm text-gray-600">Available actions:</p>
            <div className="flex justify-center gap-2">
              <Link
                href="/admin/model-viewer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View All Models
              </Link>
              <Link
                href="/models/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Upload Model
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">How to Access Mesh Mapping</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
              <div>
                <p className="font-medium text-gray-900">Go to Model Viewer Management</p>
                <p>Navigate to the main model viewer page to see all uploaded models.</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
              <div>
                <p className="font-medium text-gray-900">Select a Model</p>
                <p>Click on any model card to access its specific mapping interface.</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
              <div>
                <p className="font-medium text-gray-900">Use the Map Button</p>
                <p>Click the "Map" button on any model to access its mesh-to-part mapping interface.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
