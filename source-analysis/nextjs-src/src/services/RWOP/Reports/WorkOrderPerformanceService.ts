import { BaseReportService, ReportFilters, KPIMetric, ChartData } from './BaseReportService';
import api from '@/lib/api';

export interface WorkOrderPerformanceData {
  summary: {
    totalWorkOrders: number;
    completedOnTime: number;
    averageCompletionTime: number;
    costSavings: number;
  };
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
    avgHours: number;
  }>;
  trends: Array<{
    date: string;
    completed: number;
    created: number;
    overdue: number;
  }>;
}

export class WorkOrderPerformanceService extends BaseReportService {
  
  async getReportData(filters: ReportFilters): Promise<WorkOrderPerformanceData> {
    const response = await api.get('/reports/work-order-performance', { params: filters });
    return response.data.data;
  }
  
  async getKPIs(filters: ReportFilters): Promise<KPIMetric[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        label: 'Total Work Orders',
        value: data.summary.totalWorkOrders,
        format: 'number',
        trend: 12.5
      },
      {
        label: 'On-Time Completion',
        value: data.summary.completedOnTime,
        format: 'percentage',
        trend: 8.2
      },
      {
        label: 'Avg Completion Time',
        value: data.summary.averageCompletionTime,
        format: 'hours',
        trend: -15.3
      },
      {
        label: 'Cost Savings (GHS)',
        value: data.summary.costSavings,
        format: 'currency',
        trend: 22.1
      }
    ];
  }
  
  async getChartData(filters: ReportFilters): Promise<ChartData[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        labels: data.byStatus.map(item => item.status),
        datasets: [{
          label: 'Work Orders by Status',
          data: data.byStatus.map(item => item.count),
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
        }]
      },
      {
        labels: data.trends.map(item => item.date),
        datasets: [
          {
            label: 'Completed',
            data: data.trends.map(item => item.completed),
            borderColor: '#10b981'
          },
          {
            label: 'Created',
            data: data.trends.map(item => item.created),
            borderColor: '#3b82f6'
          },
          {
            label: 'Overdue',
            data: data.trends.map(item => item.overdue),
            borderColor: '#ef4444'
          }
        ]
      }
    ];
  }
}

export default new WorkOrderPerformanceService();