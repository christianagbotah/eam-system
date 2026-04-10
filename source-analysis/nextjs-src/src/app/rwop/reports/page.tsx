'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, FileText, Download, Printer, Calendar, Filter } from 'lucide-react';

const reports = [
  {
    id: 'work-order-performance',
    title: 'Work Order Performance',
    description: 'Track completion rates, SLA compliance, and productivity metrics',
    icon: BarChart3,
    color: 'bg-blue-500',
    href: '/rwop/reports/work-order-performance'
  },
  {
    id: 'asset-reliability',
    title: 'Asset Reliability',
    description: 'MTBF, MTTR, availability, and failure analysis',
    icon: FileText,
    color: 'bg-green-500',
    href: '/rwop/reports/asset-reliability'
  },
  {
    id: 'cost-impact',
    title: 'Cost Impact Analysis',
    description: 'Production losses, forex impact, power outage costs (GHS)',
    icon: Download,
    color: 'bg-red-500',
    href: '/rwop/reports/cost-impact'
  },
  {
    id: 'technician-productivity',
    title: 'Technician Productivity',
    description: 'Performance by shift, skills utilization, union compliance',
    icon: Printer,
    color: 'bg-purple-500',
    href: '/rwop/reports/technician-productivity'
  },
  {
    id: 'compliance-audit',
    title: 'Compliance & Audit',
    description: 'Enforcement metrics, audit trails, shift handover compliance',
    icon: Calendar,
    color: 'bg-orange-500',
    href: '/rwop/reports/compliance-audit'
  }
];

export default function RWOPReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold mb-2">RWOP Enterprise Reports</h1>
            <p className="text-blue-100">Comprehensive work order and maintenance analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Ghana Industrial EAM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Global Report Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Departments</option>
              <option value="production">Production</option>
              <option value="maintenance">Maintenance</option>
              <option value="quality">Quality Control</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report) => {
          const IconComponent = report.icon;
          return (
            <Link
              key={report.id}
              href={`${report.href}?from=${dateRange.from}&to=${dateRange.to}`}
              className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-200 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${report.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    RWOP
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {report.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {report.description}
                </p>
                <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                  View Report
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-base font-semibold text-blue-600">1,247</div>
            <div className="text-sm text-gray-600">Total Work Orders</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-base font-semibold text-green-600">94.2%</div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-base font-semibold text-red-600">GHS 45,230</div>
            <div className="text-sm text-gray-600">Cost Savings</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-base font-semibold text-purple-600">98.7%</div>
            <div className="text-sm text-gray-600">Compliance Score</div>
          </div>
        </div>
      </div>
    </div>
  );
}