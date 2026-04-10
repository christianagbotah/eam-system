'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function HotspotManagementPage() {
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
          <h1 className="text-lg font-semibold text-gray-900">Hotspot Management</h1>
          <p className="text-gray-600">Manage interactive hotspots for all models</p>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M9 10l-4.553-2.276A1 1 0 013 8.618v6.764a1 1 0 001.447.894L9 14m0-4v4m0 0v6m0-6l6-4" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Hotspot Editor</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a specific model to create and edit interactive hotspots.
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
          <h3 className="text-lg font-semibold mb-4">How to Edit Hotspots</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
              <div>
                <p className="font-medium text-gray-900">Go to Model Viewer Management</p>
                <p>Navigate to the main model viewer page to see all uploaded models.</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
              <div>
                <p className="font-medium text-gray-900">Select a Model</p>
                <p>Click on any model card to access its hotspot editor.</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
              <div>
                <p className="font-medium text-gray-900">Use the Edit Button</p>
                <p>Click the "Edit" button on any model to access its hotspot editor interface.</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
              <div>
                <p className="font-medium text-gray-900">Create Interactive Areas</p>
                <p>Use the drawing tools to create clickable hotspots that can assign PM tasks.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Click to Create</h3>
            <p className="text-sm text-gray-600">Click anywhere on your 2D/3D model to create interactive hotspots</p>
          </div>
        </Card>
        <Card>
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Auto-Generate</h3>
            <p className="text-sm text-gray-600">Automatically create hotspots based on mesh names and part mappings</p>
          </div>
        </Card>
        <Card>
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">PM Integration</h3>
            <p className="text-sm text-gray-600">Link hotspots directly to PM tasks for seamless maintenance workflow</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
