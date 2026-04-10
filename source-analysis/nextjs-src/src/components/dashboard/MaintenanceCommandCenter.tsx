'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';

interface DashboardWidget {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  format?: 'currency' | 'percentage' | 'number';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'orange';
}

interface ChartData {
  name: string;
  value: number;
}

export default function MaintenanceCommandCenter() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load main KPIs
      const [openWO, slaBreaches, downtimeCost, plantRisk] = await Promise.all([
        fetch('/api/dashboard/OPEN_WO_COUNT').then(r => r.json()),
        fetch('/api/dashboard/SLA_BREACHES').then(r => r.json()),
        fetch('/api/dashboard/DOWNTIME_COST_TODAY').then(r => r.json()),
        fetch('/api/dashboard/PLANT_RISK_INDEX').then(r => r.json())
      ]);

      setWidgets([
        {
          id: 'open_wo',
          title: 'Open Work Orders',
          value: openWO.data?.value || 0,
          icon: <RefreshCw className="h-4 w-4" />,
          color: 'blue'
        },
        {
          id: 'sla_breaches',
          title: 'SLA Breaches',
          value: slaBreaches.data?.value || 0,
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'red'
        },
        {
          id: 'downtime_cost',
          title: 'Today Downtime Cost',
          value: downtimeCost.data?.value || 0,
          format: 'currency',
          icon: <DollarSign className="h-4 w-4" />,
          color: 'orange'
        },
        {
          id: 'plant_risk',
          title: 'Plant Risk Index',
          value: plantRisk.data?.value || 0,
          icon: <TrendingUp className="h-4 w-4" />,
          color: plantRisk.data?.value > 50 ? 'red' : 'green'
        }
      ]);

      // Load chart data
      const maintenanceSpend = await fetch('/api/dashboard/MAINTENANCE_SPEND').then(r => r.json());
      setChartData(maintenanceSpend.data || []);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return `GHS ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'red':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'orange':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const exportReport = async (format: 'pdf' | 'xlsx') => {
    try {
      const response = await fetch(`/api/v1/eam/reports/EXECUTIVE_DASHBOARD?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive_dashboard.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Command Center</h1>
          <p className="text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportReport('pdf')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => exportReport('xlsx')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {widgets.map((widget) => (
          <Card key={widget.id} className={`${getColorClasses(widget.color)}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
              {widget.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(widget.value, widget.format)}
              </div>
              {widget.change && (
                <p className="text-xs text-muted-foreground">
                  {widget.change > 0 ? (
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 inline mr-1" />
                  )}
                  {Math.abs(widget.change)}% from last period
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {chartData.length > 0 ? (
                <div className="w-full">
                  {chartData.map((item, index) => (
                    <div key={index} className="flex justify-between py-2">
                      <span>{item.name}</span>
                      <span className="font-semibold">
                        GHS {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Reliability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">98.5%</div>
                <p className="text-gray-600">Overall Equipment Effectiveness</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Availability:</span>
                    <span className="font-semibold">99.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Performance:</span>
                    <span className="font-semibold">97.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality:</span>
                    <span className="font-semibold">101.5%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.open('/api/v1/eam/reports/WO_AGING?format=pdf', '_blank')}
            >
              Work Order Aging
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open('/api/v1/eam/reports/SLA_COMPLIANCE?format=xlsx', '_blank')}
            >
              SLA Compliance
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open('/api/v1/eam/reports/MAINTENANCE_COSTS?format=pdf', '_blank')}
            >
              Cost Analysis
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open('/api/v1/eam/reports/ASSET_RELIABILITY?format=xlsx', '_blank')}
            >
              Asset Performance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}