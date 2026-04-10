'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Users, Package, TrendingUp } from 'lucide-react';

interface BreakdownWorkOrder {
  id: string;
  woNumber: string;
  assetName: string;
  priority: 'critical' | 'high' | 'medium';
  status: string;
  downtimeMinutes: number;
  slaMinutesRemaining: number;
  assignedTechnicians: string[];
  partsStatus: 'available' | 'waiting' | 'partial';
  escalationLevel: number;
  productionLossGHS: number;
}

export default function BreakdownWarRoom() {
  const [breakdowns, setBreakdowns] = useState<BreakdownWorkOrder[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const fetchBreakdowns = async () => {
      try {
        const response = await fetch('/api/v1/eam/rwop/war-room/active-breakdowns');
        const data = await response.json();
        setBreakdowns(data.data || []);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch breakdowns:', error);
      }
    };

    fetchBreakdowns();
    const interval = setInterval(fetchBreakdowns, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (priority: string, slaRemaining: number) => {
    if (slaRemaining < 0) return 'bg-red-600 text-white';
    if (priority === 'critical') return 'bg-red-500 text-white';
    if (slaRemaining < 30) return 'bg-orange-500 text-white';
    return 'bg-yellow-500 text-black';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const totalProductionLoss = breakdowns.reduce((sum, wo) => sum + wo.productionLossGHS, 0);
  const criticalCount = breakdowns.filter(wo => wo.priority === 'critical').length;
  const overdueCount = breakdowns.filter(wo => wo.slaMinutesRemaining < 0).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-white">BREAKDOWN WAR ROOM</h1>
          <div className="text-right">
            <div className="text-base font-semibold">{new Date().toLocaleTimeString()}</div>
            <div className="text-sm text-gray-400">Last Update: {lastUpdate.toLocaleTimeString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          <div className="bg-red-600 p-6 rounded-lg text-center">
            <div className="text-lg font-semibold">{breakdowns.length}</div>
            <div className="text-sm">Active Breakdowns</div>
          </div>
          <div className="bg-orange-600 p-6 rounded-lg text-center">
            <div className="text-lg font-semibold">{criticalCount}</div>
            <div className="text-sm">Critical Priority</div>
          </div>
          <div className="bg-red-700 p-6 rounded-lg text-center">
            <div className="text-lg font-semibold">{overdueCount}</div>
            <div className="text-sm">SLA Breached</div>
          </div>
          <div className="bg-purple-600 p-6 rounded-lg text-center">
            <div className="text-lg font-semibold">GHS {totalProductionLoss.toLocaleString()}</div>
            <div className="text-sm">Production Loss</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {breakdowns.map((breakdown) => (
          <div
            key={breakdown.id}
            className={`p-6 rounded-lg border-l-8 ${getSeverityColor(breakdown.priority, breakdown.slaMinutesRemaining)} bg-gray-800`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">{breakdown.woNumber}</h3>
                <p className="text-lg text-gray-300">{breakdown.assetName}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Priority</div>
                <div className="text-xl font-bold uppercase">{breakdown.priority}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center">
                <Clock className="w-4 h-4 mx-auto mb-1" />
                <div className="text-base font-semibold text-red-400">{formatDuration(breakdown.downtimeMinutes)}</div>
                <div className="text-xs text-gray-400">Downtime</div>
              </div>
              <div className="text-center">
                <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                <div className={`text-2xl font-bold ${breakdown.slaMinutesRemaining < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {breakdown.slaMinutesRemaining < 0 
                    ? `+${formatDuration(Math.abs(breakdown.slaMinutesRemaining))}`
                    : formatDuration(breakdown.slaMinutesRemaining)
                  }
                </div>
                <div className="text-xs text-gray-400">SLA {breakdown.slaMinutesRemaining < 0 ? 'Overdue' : 'Remaining'}</div>
              </div>
              <div className="text-center">
                <Users className="w-4 h-4 mx-auto mb-1" />
                <div className="text-base font-semibold text-blue-400">{breakdown.assignedTechnicians.length}</div>
                <div className="text-xs text-gray-400">Technicians</div>
              </div>
              <div className="text-center">
                <Package className="w-4 h-4 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-400">{breakdown.partsStatus.toUpperCase()}</div>
                <div className="text-xs text-gray-400">Parts</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">{breakdown.status.replace('_', ' ').toUpperCase()}</span>
              {breakdown.escalationLevel > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">Level {breakdown.escalationLevel}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {breakdowns.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-lg font-semibold text-green-400 mb-2">ALL CLEAR</h2>
          <p className="text-xl text-gray-400">No active breakdowns</p>
        </div>
      )}
    </div>
  );
}