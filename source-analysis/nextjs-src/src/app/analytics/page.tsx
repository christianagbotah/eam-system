'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { 
  TrendingUp, 
  Activity, 
  AlertCircle, 
  BarChart3,
  PieChart,
  LineChart,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface AnalyticsCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  permission: string;
  path: string;
  color: string;
}

export default function AnalyticsPage() {
  const { hasPermission } = usePermissions();

  const analytics: AnalyticsCard[] = [
    {
      id: 'kpi',
      title: 'KPI Dashboard',
      description: 'Key Performance Indicators - MTBF, MTTR, Asset Availability, and more',
      icon: BarChart3,
      permission: 'kpi.view',
      path: '/analytics/kpi',
      color: 'blue'
    },
    {
      id: 'oee',
      title: 'OEE Dashboard',
      description: 'Overall Equipment Effectiveness - Availability, Performance, Quality',
      icon: Activity,
      permission: 'oee.view',
      path: '/analytics/oee',
      color: 'green'
    },
    {
      id: 'downtime',
      title: 'Downtime Tracker',
      description: 'Equipment downtime analysis with Pareto charts and root cause tracking',
      icon: AlertCircle,
      permission: 'downtime.view',
      path: '/analytics/downtime',
      color: 'red'
    },
    {
      id: 'energy',
      title: 'Energy Analytics',
      description: 'Monitor energy consumption and costs',
      icon: LineChart,
      permission: 'analytics.view',
      path: '/analytics/energy',
      color: 'orange'
    },
    {
      id: 'performance',
      title: 'Performance Metrics',
      description: 'Asset and team performance benchmarking and comparisons',
      icon: TrendingUp,
      permission: 'analytics.view',
      path: '/analytics/performance',
      color: 'orange'
    },
    {
      id: 'custom',
      title: 'Custom Reports',
      description: 'Build custom analytics dashboards with drag-and-drop widgets',
      icon: PieChart,
      permission: 'analytics.create',
      path: '/analytics/custom',
      color: 'indigo'
    }
  ];

  const accessibleAnalytics = analytics.filter(item => hasPermission(item.permission));

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; hover: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50' },
      green: { bg: 'bg-green-100', text: 'text-green-600', hover: 'hover:bg-green-50' },
      red: { bg: 'bg-red-100', text: 'text-red-600', hover: 'hover:bg-red-50' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-50' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', hover: 'hover:bg-orange-50' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', hover: 'hover:bg-indigo-50' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Hub</h1>
        <p className="text-gray-600 mt-1">
          Real-time analytics and performance monitoring dashboards
        </p>
      </div>

      {/* Analytics Grid */}
      {accessibleAnalytics.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Available</h3>
          <p className="text-gray-600">
            You don't have permission to view any analytics dashboards.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleAnalytics.map(item => {
            const Icon = item.icon;
            const colors = getColorClasses(item.color);
            
            return (
              <Link
                key={item.id}
                href={item.path}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all p-6 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 ${colors.bg} rounded-lg group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Available Dashboards</div>
          <div className="text-2xl font-bold text-gray-900">{accessibleAnalytics.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Active Alerts</div>
          <div className="text-2xl font-bold text-red-600">0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Data Points</div>
          <div className="text-2xl font-bold text-gray-900">0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Last Updated</div>
          <div className="text-sm font-medium text-gray-900">Just now</div>
        </div>
      </div>
    </div>
  );
}
