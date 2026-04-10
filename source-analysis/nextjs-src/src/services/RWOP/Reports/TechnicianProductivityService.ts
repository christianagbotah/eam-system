import { BaseReportService, ReportFilters, KPIMetric, ChartData } from './BaseReportService';
import api from '@/lib/api';

export interface TechnicianProductivityData {
  summary: {
    totalTechnicians: number;
    avgProductivity: number;
    totalHoursWorked: number;
    avgCompletionRate: number;
  };
  technicianMetrics: Array<{
    technicianId: number;
    name: string;
    workOrdersCompleted: number;
    hoursWorked: number;
    avgCompletionTime: number;
    productivity: number;
    shiftPreference: string;
    unionMember: boolean;
  }>;
  shiftAnalysis: Array<{
    shift: string;
    technicians: number;
    workOrdersCompleted: number;
    avgProductivity: number;
    shiftAllowanceGHS: number;
  }>;
  skillUtilization: Array<{
    skill: string;
    techniciansWithSkill: number;
    utilizationRate: number;
    avgHourlyRate: number;
  }>;
}

export class TechnicianProductivityService extends BaseReportService {
  
  async getReportData(filters: ReportFilters): Promise<TechnicianProductivityData> {
    const response = await api.get('/reports/technician-productivity', { params: filters });
    return response.data.data;
  }
  
  async getKPIs(filters: ReportFilters): Promise<KPIMetric[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        label: 'Total Technicians',
        value: data.summary.totalTechnicians,
        format: 'number',
        trend: 5.2
      },
      {
        label: 'Average Productivity',
        value: data.summary.avgProductivity,
        format: 'percentage',
        trend: 12.8
      },
      {
        label: 'Total Hours Worked',
        value: data.summary.totalHoursWorked,
        format: 'hours',
        trend: 8.5
      },
      {
        label: 'Completion Rate',
        value: data.summary.avgCompletionRate,
        format: 'percentage',
        trend: 15.3
      }
    ];
  }
  
  async getChartData(filters: ReportFilters): Promise<ChartData[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        labels: data.shiftAnalysis.map(item => item.shift),
        datasets: [{
          label: 'Work Orders Completed by Shift',
          data: data.shiftAnalysis.map(item => item.workOrdersCompleted),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
        }]
      },
      {
        labels: data.skillUtilization.map(item => item.skill),
        datasets: [{
          label: 'Skill Utilization %',
          data: data.skillUtilization.map(item => item.utilizationRate),
          backgroundColor: ['#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899']
        }]
      },
      {
        labels: data.technicianMetrics.slice(0, 10).map(item => item.name),
        datasets: [{
          label: 'Productivity Score',
          data: data.technicianMetrics.slice(0, 10).map(item => item.productivity),
          borderColor: '#10b981'
        }]
      }
    ];
  }
}

export default new TechnicianProductivityService();