'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';

interface NodeDetails {
  id: number;
  node_name: string;
  node_code: string;
  node_type: string;
  description?: string;
  manufacturer?: string;
  serial_number?: string;
  expected_lifespan?: number;
  lifespan_unit?: string;
  image_url?: string;
  pm_tasks?: any[];
  total_usage?: any;
  remaining_life?: any;
  spare_parts?: any[];
}

interface NodeDetailPanelProps {
  node: NodeDetails | null;
  onClose: () => void;
}

export default function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!node) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'specs', label: 'Specs', icon: '⚙️' },
    { id: 'pm', label: 'PM Tasks', icon: '🔧' },
    { id: 'usage', label: 'Usage', icon: '📊' },
    { id: 'history', label: 'History', icon: '📜' },
    { id: 'files', label: 'Files', icon: '📁' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{node.node_name}</h2>
          <p className="text-sm text-gray-500">{node.node_code}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {node.image_url && (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={node.image_url} alt={node.node_name} className="w-full h-48 object-cover" />
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Type</h3>
              <Badge variant="info">{node.node_type.replace('_', ' ').toUpperCase()}</Badge>
            </div>

            {node.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-sm text-gray-600">{node.description}</p>
              </div>
            )}

            {node.manufacturer && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Manufacturer</h3>
                <p className="text-sm text-gray-600">{node.manufacturer}</p>
              </div>
            )}

            {node.serial_number && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Serial Number</h3>
                <p className="text-sm text-gray-600">{node.serial_number}</p>
              </div>
            )}

            {node.remaining_life && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Remaining Life</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          node.remaining_life.percentage > 50 ? 'bg-green-500' :
                          node.remaining_life.percentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${node.remaining_life.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {node.remaining_life.remaining} {node.lifespan_unit}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'specs' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Expected Lifespan</p>
                <p className="text-sm font-medium text-gray-900">
                  {node.expected_lifespan} {node.lifespan_unit}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pm' && (
          <div className="space-y-4">
            {node.pm_tasks && node.pm_tasks.length > 0 ? (
              node.pm_tasks.map((task: any) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{task.task_name}</h4>
                    <Badge variant={task.status === 'active' ? 'success' : 'default'}>
                      {task.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{task.task_description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Frequency: {task.frequency_value} {task.frequency_unit}</span>
                    {task.next_due && <span>Next Due: {new Date(task.next_due).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No PM tasks assigned</p>
            )}
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-4">
            {node.total_usage && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 mb-1">Hours</p>
                  <p className="text-2xl font-bold text-blue-900">{node.total_usage.hours || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-green-600 mb-1">Cycles</p>
                  <p className="text-2xl font-bold text-green-900">{node.total_usage.cycles || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-purple-600 mb-1">Quantity</p>
                  <p className="text-2xl font-bold text-purple-900">{node.total_usage.quantity || 0}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <p className="text-center text-gray-500 py-8">Maintenance history will appear here</p>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            <p className="text-center text-gray-500 py-8">Uploaded files will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
