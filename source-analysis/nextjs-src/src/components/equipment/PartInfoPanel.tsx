'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import UsageGauge from './UsageGauge';
import UsageTrendChart from './UsageTrendChart';
import PMAssignForm from './PMAssignForm';

interface Part {
  id: number;
  name: string;
  part_code: string;
  description: string;
  last_maintenance: string;
  expected_life: number;
  current_usage: number;
  status: string;
}

interface PartInfoPanelProps {
  part: Part | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PartInfoPanel({ part, isOpen, onClose }: PartInfoPanelProps) {
  const [showPMForm, setShowPMForm] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [usageTrend, setUsageTrend] = useState<any[]>([]);

  useEffect(() => {
    if (part) {
      loadPartData();
    }
  }, [part]);

  const loadPartData = async () => {
    if (!part) return;
    try {
      const historyData = await api.getPartHistory(part.id);
      setHistory(historyData.data || []);
      
      // Mock usage trend data
      setUsageTrend([
        { date: '01/15', usage: 120 },
        { date: '01/16', usage: 135 },
        { date: '01/17', usage: 128 },
        { date: '01/18', usage: 142 },
        { date: '01/19', usage: 138 },
        { date: '01/20', usage: 145 },
      ]);
    } catch (error) {
      console.error('Failed to load part data');
    }
  };

  if (!isOpen || !part) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      <div className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-gray-50 shadow-2xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } overflow-y-auto`}>
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 shadow-lg z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{part.name}</h2>
              <p className="text-sm text-slate-300 mt-1">Code: {part.part_code}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-600">{part.description}</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Last Maintenance</p>
              <p className="text-lg font-bold text-gray-900">{part.last_maintenance || 'Never'}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                part.status === 'good' ? 'bg-green-100 text-green-800' :
                part.status === 'due_soon' ? 'bg-yellow-100 text-yellow-800' :
                part.status === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {part.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Usage Gauge */}
          <UsageGauge
            current={part.current_usage}
            max={part.expected_life}
            title="Remaining Life"
          />

          {/* Usage Trend */}
          <UsageTrendChart data={usageTrend} />

          {/* Action Buttons */}
          {!showPMForm && (
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setShowPMForm(true)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Assign PM Task
              </button>
              <button className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                View History
              </button>
              <button className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                Open Work Orders
              </button>
            </div>
          )}

          {/* PM Assignment Form */}
          {showPMForm && (
            <PMAssignForm
              partId={part.id}
              partName={part.name}
              onSuccess={() => {
                setShowPMForm(false);
                alert('PM rule created successfully!');
                loadPartData();
              }}
              onCancel={() => setShowPMForm(false)}
            />
          )}

          {/* Maintenance History */}
          {history.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Maintenance</h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                    <span className="text-gray-600">{item.date}</span>
                    <span className="text-gray-900 font-medium">{item.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
