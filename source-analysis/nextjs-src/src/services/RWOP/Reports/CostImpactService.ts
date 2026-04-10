import { BaseReportService, ReportFilters, KPIMetric, ChartData } from './BaseReportService';
import api from '@/lib/api';

export interface CostImpactData {
  summary: {
    totalProductionLoss: number;
    forexImpact: number;
    powerOutageLosses: number;
    maintenanceCosts: number;
  };
  productionLosses: Array<{
    date: string;
    assetName: string;
    downtimeHours: number;
    productionLossGHS: number;
    cause: string;
  }>;
  forexImpacts: Array<{
    month: string;
    partsAffected: number;
    rateVariation: number;
    costImpactGHS: number;
  }>;
  powerOutages: Array<{
    date: string;
    duration: number;
    affectedAssets: number;
    productionLossGHS: number;
    generatorUsed: boolean;
  }>;
  costBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export class CostImpactService extends BaseReportService {
  
  async getReportData(filters: ReportFilters): Promise<CostImpactData> {
    const response = await api.get('/reports/cost-impact', { params: filters });
    return response.data.data;
  }
  
  async getKPIs(filters: ReportFilters): Promise<KPIMetric[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        label: 'Production Loss (GHS)',
        value: data.summary.totalProductionLoss,
        format: 'currency',
        trend: -18.5
      },
      {
        label: 'Forex Impact (GHS)',
        value: data.summary.forexImpact,
        format: 'currency',
        trend: 25.3
      },
      {
        label: 'Power Outage Losses (GHS)',
        value: data.summary.powerOutageLosses,
        format: 'currency',
        trend: -12.1
      },
      {
        label: 'Maintenance Costs (GHS)',
        value: data.summary.maintenanceCosts,
        format: 'currency',
        trend: 8.7
      }
    ];
  }
  
  async getChartData(filters: ReportFilters): Promise<ChartData[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        labels: data.costBreakdown.map(item => item.category),
        datasets: [{
          label: 'Cost Distribution (GHS)',
          data: data.costBreakdown.map(item => item.amount),
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
        }]
      },
      {
        labels: data.forexImpacts.map(item => item.month),
        datasets: [{
          label: 'Forex Impact (GHS)',
          data: data.forexImpacts.map(item => item.costImpactGHS),
          borderColor: '#f59e0b'
        }]
      },
      {
        labels: data.powerOutages.map(item => item.date),
        datasets: [{
          label: 'Power Outage Losses (GHS)',
          data: data.powerOutages.map(item => item.productionLossGHS),
          backgroundColor: '#ef4444'
        }]
      }
    ];
  }
}

export default new CostImpactService();