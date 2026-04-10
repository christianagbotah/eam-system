'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportDashboard from '@/components/reports/ReportDashboard';
import WorkOrderPerformanceService from '@/services/RWOP/Reports/WorkOrderPerformanceService';
import { KPIMetric, ChartData } from '@/services/RWOP/Reports/BaseReportService';

export default function WorkOrderPerformancePage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIMetric[]>([]);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);

  const filters = {
    dateFrom: searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: searchParams.get('to') || new Date().toISOString().split('T')[0],
    departmentId: searchParams.get('department') ? parseInt(searchParams.get('department')!) : undefined,
    priority: searchParams.get('priority') || undefined
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [kpiData, chartData, reportData] = await Promise.all([
        WorkOrderPerformanceService.getKPIs(filters),
        WorkOrderPerformanceService.getChartData(filters),
        WorkOrderPerformanceService.getReportData(filters)
      ]);

      setKpis(kpiData);
      setCharts(chartData);
      
      // Convert report data to table format
      const tableRows = reportData.byPriority.map((item: any) => ({
        priority: item.priority,
        count: item.count,
        avg_hours: item.avgHours,
        percentage: ((item.count / reportData.summary.totalWorkOrders) * 100).toFixed(1) + '%'
      }));
      
      setTableData(tableRows);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportDashboard
      title="Work Order Performance Report"
      description="Track completion rates, SLA compliance, and productivity metrics"
      kpis={kpis}
      charts={charts}
      tableData={tableData}
      reportType="work-order-performance"
      filters={filters}
      loading={loading}
    />
  );
}