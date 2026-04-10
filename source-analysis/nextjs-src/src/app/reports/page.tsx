'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';
import { 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  Package, 
  Wrench, 
  Calendar,
  Users,
  BarChart3,
  Download,
  Clock,
  CheckCircle
} from 'lucide-react';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  permission: string;
  category: string;
  path?: string;
}

export default function ReportsPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generatedToday, setGeneratedToday] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const reports: ReportCard[] = [
    {
      id: 'work-orders',
      title: 'Work Orders Report',
      description: 'Comprehensive work order analysis with status, priority, and completion metrics',
      icon: Wrench,
      permission: 'work_orders.view',
      category: 'maintenance',
      path: '/reports/work-orders'
    },
    {
      id: 'assets',
      title: 'Asset Performance',
      description: 'Asset utilization, downtime, and maintenance history',
      icon: Package,
      permission: 'assets.view',
      category: 'assets',
      path: '/reports/asset-reports'
    },
    {
      id: 'inventory',
      title: 'Inventory Report',
      description: 'Stock levels, consumption rates, and reorder recommendations',
      icon: Package,
      permission: 'inventory.view',
      category: 'inventory',
      path: '/reports/inventory-reports'
    },
    {
      id: 'pm-compliance',
      title: 'PM Compliance',
      description: 'Preventive maintenance schedule adherence and overdue tasks',
      icon: Calendar,
      permission: 'pm_schedules.view',
      category: 'maintenance',
      path: '/reports/maintenance-reports'
    },
    {
      id: 'production',
      title: 'Production Report',
      description: 'Production output, efficiency, and quality metrics',
      icon: TrendingUp,
      permission: 'production.view',
      category: 'production',
      path: '/reports/production-reports'
    },
    {
      id: 'downtime',
      title: 'Downtime Analysis',
      description: 'Equipment downtime causes, duration, and trends',
      icon: AlertCircle,
      permission: 'downtime.view',
      category: 'performance',
      path: '/performance/downtime'
    },
    {
      id: 'oee',
      title: 'OEE Dashboard',
      description: 'Overall Equipment Effectiveness metrics and trends',
      icon: BarChart3,
      permission: 'oee.view',
      category: 'performance',
      path: '/performance/oee'
    },
    {
      id: 'quality',
      title: 'Quality Reports',
      description: 'Quality inspections, NCR, and compliance metrics',
      icon: CheckCircle,
      permission: 'quality.view',
      category: 'quality',
      path: '/reports/quality-reports'
    },
    {
      id: 'safety',
      title: 'Safety Reports',
      description: 'Incident reports, safety inspections, and compliance',
      icon: AlertCircle,
      permission: 'safety.view',
      category: 'safety',
      path: '/reports/safety-reports'
    },
    {
      id: 'financial',
      title: 'Financial Reports',
      description: 'Cost analysis, budget tracking, and financial metrics',
      icon: TrendingUp,
      permission: 'financial.view',
      category: 'financial',
      path: '/reports/financial-reports'
    },
    {
      id: 'users',
      title: 'User Activity',
      description: 'User login history, work order assignments, and productivity',
      icon: Users,
      permission: 'users.view',
      category: 'admin',
      path: '/reports/users'
    },
    {
      id: 'custom',
      title: 'Custom Reports',
      description: 'Build and save custom reports with flexible parameters',
      icon: FileText,
      permission: 'reports.create',
      category: 'custom',
      path: '/reports/custom-reports'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Reports' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'assets', label: 'Assets' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'production', label: 'Production' },
    { id: 'performance', label: 'Performance' },
    { id: 'quality', label: 'Quality' },
    { id: 'safety', label: 'Safety' },
    { id: 'financial', label: 'Financial' },
    { id: 'custom', label: 'Custom' },
    { id: 'admin', label: 'Administration' }
  ];

  const filteredReports = reports.filter(report => {
    const hasAccess = hasPermission(report.permission);
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    return hasAccess && matchesCategory && matchesSearch;
  });

  const handleGenerateReport = async (report: ReportCard) => {
    if (report.path) {
      window.location.href = report.path;
    } else {
      setGeneratingReport(report.id);
      try {
        const response = await api.get(report.path || '/reports');
        if (response.data?.status === 'success') {
          const { exportToCSV } = require('@/lib/exportUtils');
          exportToCSV(response.data.data, report.title.toLowerCase().replace(/\s+/g, '-'));
          setGeneratedToday(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report');
      } finally {
        setGeneratingReport(null);
      }
    }
  };

  const handleExportReport = (reportId: string, format: 'pdf' | 'csv' | 'excel') => {
    alert(`Exporting ${reportId} as ${format.toUpperCase()}...`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Reports Hub</h1>
            <p className="text-blue-100">
              Generate and export comprehensive reports based on your permissions
            </p>
          </div>
          <FileText className="w-16 h-16 text-white/30" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Available</h3>
          <p className="text-gray-600">
            You don't have permission to view reports in this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map(report => {
            const Icon = report.icon;
            return (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {report.category}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {report.description}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateReport(report)}
                    disabled={generatingReport === report.id}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {generatingReport === report.id ? 'Generating...' : 'View Report'}
                  </button>
                  <div className="relative group">
                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Download className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => handleExportReport(report.id, 'pdf')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleExportReport(report.id, 'csv')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => handleExportReport(report.id, 'excel')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                      >
                        Export Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Available Reports</div>
              <div className="text-2xl font-bold text-gray-900">{filteredReports.length}</div>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Categories</div>
              <div className="text-2xl font-bold text-gray-900">
                {categories.filter(c => c.id !== 'all').length}
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Generated Today</div>
              <div className="text-2xl font-bold text-gray-900">{generatedToday}</div>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Scheduled Reports</div>
              <div className="text-2xl font-bold text-gray-900">0</div>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
