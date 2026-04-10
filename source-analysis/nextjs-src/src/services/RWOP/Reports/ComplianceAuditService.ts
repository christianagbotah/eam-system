import { BaseReportService, ReportFilters, KPIMetric, ChartData } from './BaseReportService';
import api from '@/lib/api';

export interface ComplianceAuditData {
  summary: {
    complianceScore: number;
    auditFindings: number;
    resolvedIssues: number;
    pendingActions: number;
  };
  enforcementMetrics: Array<{
    rule: string;
    violations: number;
    overrides: number;
    complianceRate: number;
  }>;
  auditTrail: Array<{
    date: string;
    module: string;
    action: string;
    user: string;
    entityType: string;
    status: string;
  }>;
  shiftCompliance: Array<{
    shift: string;
    handoversCompleted: number;
    handoversPending: number;
    complianceRate: number;
  }>;
  unionCompliance: Array<{
    requirement: string;
    compliant: number;
    nonCompliant: number;
    complianceRate: number;
  }>;
}

export class ComplianceAuditService extends BaseReportService {
  
  async getReportData(filters: ReportFilters): Promise<ComplianceAuditData> {
    const response = await api.get('/reports/compliance-audit', { params: filters });
    return response.data.data;
  }
  
  async getKPIs(filters: ReportFilters): Promise<KPIMetric[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        label: 'Compliance Score',
        value: data.summary.complianceScore,
        format: 'percentage',
        trend: 8.2
      },
      {
        label: 'Audit Findings',
        value: data.summary.auditFindings,
        format: 'number',
        trend: -15.5
      },
      {
        label: 'Resolved Issues',
        value: data.summary.resolvedIssues,
        format: 'number',
        trend: 22.1
      },
      {
        label: 'Pending Actions',
        value: data.summary.pendingActions,
        format: 'number',
        trend: -8.7
      }
    ];
  }
  
  async getChartData(filters: ReportFilters): Promise<ChartData[]> {
    const data = await this.getReportData(filters);
    
    return [
      {
        labels: data.enforcementMetrics.map(item => item.rule),
        datasets: [{
          label: 'Compliance Rate %',
          data: data.enforcementMetrics.map(item => item.complianceRate),
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6']
        }]
      },
      {
        labels: data.shiftCompliance.map(item => item.shift),
        datasets: [
          {
            label: 'Completed Handovers',
            data: data.shiftCompliance.map(item => item.handoversCompleted),
            backgroundColor: '#10b981'
          },
          {
            label: 'Pending Handovers',
            data: data.shiftCompliance.map(item => item.handoversPending),
            backgroundColor: '#ef4444'
          }
        ]
      },
      {
        labels: data.unionCompliance.map(item => item.requirement),
        datasets: [{
          label: 'Union Compliance Rate %',
          data: data.unionCompliance.map(item => item.complianceRate),
          borderColor: '#8b5cf6'
        }]
      }
    ];
  }
}

export default new ComplianceAuditService();