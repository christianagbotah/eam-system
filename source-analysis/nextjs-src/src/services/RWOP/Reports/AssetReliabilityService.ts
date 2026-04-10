import { BaseReportService, ReportFilters, KPIMetric, ChartData } from './BaseReportService';
import api from '@/lib/api';

export interface AssetReliabilityData {
  summary: {
    avgMTBF: number;
    avgMTTR: number;
    availability: number;
    criticalAssets: number;
  };
  assetMetrics: Array<{
    assetId: number;
    assetName: string;
    mtbf: number;
    mttr: number;
    availability: number;
    failureCount: number;
    totalDowntime: number;
  }>;
  failureAnalysis: Array<{
    failureType: string;
    count: number;
    avgRepairTime: number;
    costImpact: number;
  }>;
  trends: Array<{
    month: string;
    mtbf: number;
    mttr: number;
    availability: number;
  }>;
}

export class AssetReliabilityService extends BaseReportService {
  
  async getReportData(filters: ReportFilters): Promise<AssetReliabilityData> {
    const response = await api.get('/reports/asset-reliability', { params: filters });
    return response.data.data;
  }
  
  async getKPIs(filters: ReportFilters): Promise<KPIMetric[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        label: 'Average MTBF',
        value: data.summary.avgMTBF,
        unit: 'hours',
        format: 'hours',
        trend: 15.2
      },
      {
        label: 'Average MTTR',
        value: data.summary.avgMTTR,
        unit: 'hours',
        format: 'hours',
        trend: -8.5
      },
      {
        label: 'Overall Availability',
        value: data.summary.availability,
        format: 'percentage',
        trend: 3.1
      },
      {
        label: 'Critical Assets',
        value: data.summary.criticalAssets,
        format: 'number',
        trend: -12.0
      }
    ];
  }
  
  async getChartData(filters: ReportFilters): Promise<ChartData[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        labels: data.failureAnalysis.map(item => item.failureType),
        datasets: [{
          label: 'Failure Count',
          data: data.failureAnalysis.map(item => item.count),
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
        }]
      },
      {
        labels: data.trends.map(item => item.month),
        datasets: [
          {
            label: 'MTBF (hours)',
            data: data.trends.map(item => item.mtbf),
            borderColor: '#10b981'
          },
          {
            label: 'MTTR (hours)',
            data: data.trends.map(item => item.mttr),
            borderColor: '#ef4444'
          }
        ]
      },
      {
        labels: data.trends.map(item => item.month),
        datasets: [{
          label: 'Availability %',
          data: data.trends.map(item => item.availability),
          borderColor: '#3b82f6'
        }]
      }
    ];
  }

  /**
   * Get top failing assets
   */
  async getTopFailingAssets(filters: ReportFilters): Promise<Array<{
    assetId: number;
    assetName: string;
    failureCount: number;
    totalDowntimeHours: number;
    mtbf: number;
    costImpactGHS: number;
  }>> {
    const response = await api.get('/reports/top-failing-assets', { params: filters });
    return response.data.data || [];
  }

  /**
   * Get repeat failure analysis
   */
  async getRepeatFailures(filters: ReportFilters): Promise<Array<{
    assetId: number;
    assetName: string;
    failurePattern: string;
    occurrences: number;
    avgTimeBetweenFailures: number;
    recommendedAction: string;
  }>> {
    const response = await api.get('/reports/repeat-failures', { params: filters });
    return response.data.data || [];
  }

  /**
   * Get downtime cost analysis by asset, department, and shift
   */
  async getDowntimeCostAnalysis(filters: ReportFilters): Promise<{
    byAsset: Array<{
      assetId: number;
      assetName: string;
      downtimeHours: number;
      productionLossGHS: number;
      totalCostGHS: number;
    }>;
    byDepartment: Array<{
      departmentId: number;
      departmentName: string;
      downtimeHours: number;
      costGHS: number;
    }>;
    byShift: Array<{
      shiftName: string;
      downtimeHours: number;
      costGHS: number;
    }>;
  }> {
    const response = await api.get('/reports/downtime-cost-analysis', { params: filters });
    return response.data.data;
  }
}

export default new AssetReliabilityService();