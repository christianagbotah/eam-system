import api from '@/lib/api';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  assetId?: number;
  departmentId?: number;
  technicianId?: number;
  priority?: string;
  status?: string;
}

export interface KPIMetric {
  label: string;
  value: number | string;
  unit?: string;
  trend?: number;
  format?: 'number' | 'currency' | 'percentage' | 'hours';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }[];
}

export abstract class BaseReportService {
  protected moduleCode = 'RWOP';
  
  abstract getReportData(filters: ReportFilters): Promise<any>;
  abstract getKPIs(filters: ReportFilters): Promise<KPIMetric[]>;
  abstract getChartData(filters: ReportFilters): Promise<ChartData[]>;
  
  async exportToExcel(filters: ReportFilters, reportType: string) {
    const response = await api.post(`/reports/${reportType}/export/excel`, filters, {
      responseType: 'blob'
    });
    return response.data;
  }
  
  async exportToPDF(filters: ReportFilters, reportType: string) {
    const response = await api.post(`/reports/${reportType}/export/pdf`, filters, {
      responseType: 'blob'
    });
    return response.data;
  }
  
  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  }
  
  protected formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
  }
  
  protected calculateTrend(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}

export default BaseReportService;