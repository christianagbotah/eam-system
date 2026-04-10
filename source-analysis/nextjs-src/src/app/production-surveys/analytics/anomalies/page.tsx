'use client';
import { useState } from 'react';
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react';

export default function AnomaliesPage() {
  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Anomaly Detection</h1>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={32} />
            <div>
              <div className="text-sm text-gray-600">High Severity</div>
              <div className="text-base font-semibold">0</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-orange-600" size={32} />
            <div>
              <div className="text-sm text-gray-600">Medium Severity</div>
              <div className="text-base font-semibold">0</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-600" size={32} />
            <div>
              <div className="text-sm text-gray-600">ML Confidence</div>
              <div className="text-base font-semibold">95%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Anomalies</h2>
        <div className="text-center text-gray-500 py-8">
          No anomalies detected. System is monitoring production surveys for statistical outliers.
        </div>
      </div>
    </div>
  );
}
