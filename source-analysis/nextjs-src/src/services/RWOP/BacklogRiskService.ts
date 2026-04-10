import api from '@/lib/api';
import AuditService from './AuditService';

export interface BacklogRiskMetrics {
  plantRiskIndex: number; // 0-100
  departmentRisks: Array<{
    departmentId: number;
    departmentName: string;
    riskScore: number;
    overdueCount: number;
    criticalCount: number;
  }>;
  topRiskyJobs: Array<{
    workOrderId: string;
    woNumber: string;
    assetName: string;
    riskScore: number;
    ageInDays: number;
    priority: string;
    productionImpact: number;
  }>;
  trendData: Array<{
    date: string;
    riskIndex: number;
    backlogCount: number;
  }>;
}

export interface RiskFactors {
  ageWeight: number;
  priorityWeight: number;
  criticalityWeight: number;
  productionImpactWeight: number;
  partsAvailabilityWeight: number;
}

export class BacklogRiskService {
  
  private defaultRiskFactors: RiskFactors = {
    ageWeight: 0.3,
    priorityWeight: 0.25,
    criticalityWeight: 0.2,
    productionImpactWeight: 0.15,
    partsAvailabilityWeight: 0.1
  };

  /**
   * Calculate comprehensive backlog risk metrics
   */
  async calculateBacklogRisk(filters?: {
    departmentId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<BacklogRiskMetrics> {
    const response = await api.get('/analytics/backlog-risk', { params: filters });
    return response.data.data;
  }

  /**
   * Calculate risk score for individual work order
   */
  calculateWorkOrderRisk(workOrder: {
    createdAt: string;
    priority: string;
    assetCriticality: string;
    productionImpact: number;
    partsAvailable: boolean;
  }): number {
    const ageInDays = Math.floor(
      (new Date().getTime() - new Date(workOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Age factor (0-40 points)
    const ageFactor = Math.min(ageInDays * 2, 40) * this.defaultRiskFactors.ageWeight;

    // Priority factor (0-30 points)
    const priorityScores = { critical: 30, high: 20, medium: 10, low: 5 };
    const priorityFactor = (priorityScores[workOrder.priority as keyof typeof priorityScores] || 5) * this.defaultRiskFactors.priorityWeight;

    // Criticality factor (0-20 points)
    const criticalityScores = { critical: 20, high: 15, medium: 10, low: 5 };
    const criticalityFactor = (criticalityScores[workOrder.assetCriticality as keyof typeof criticalityScores] || 5) * this.defaultRiskFactors.criticalityWeight;

    // Production impact factor (0-15 points)
    const productionFactor = Math.min(workOrder.productionImpact / 1000, 15) * this.defaultRiskFactors.productionImpactWeight;

    // Parts availability factor (0-10 points)
    const partsFactor = workOrder.partsAvailable ? 0 : 10 * this.defaultRiskFactors.partsAvailabilityWeight;

    return Math.min(ageFactor + priorityFactor + criticalityFactor + productionFactor + partsFactor, 100);
  }

  /**
   * Get plant risk index (0-100)
   */
  async getPlantRiskIndex(): Promise<{
    currentIndex: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const metrics = await this.calculateBacklogRisk();
    const riskIndex = metrics.plantRiskIndex;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskIndex < 25) riskLevel = 'low';
    else if (riskIndex < 50) riskLevel = 'medium';
    else if (riskIndex < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    // Calculate trend from last 7 days
    const recentTrend = metrics.trendData.slice(-7);
    const avgRecent = recentTrend.reduce((sum, d) => sum + d.riskIndex, 0) / recentTrend.length;
    const previousWeek = metrics.trendData.slice(-14, -7);
    const avgPrevious = previousWeek.reduce((sum, d) => sum + d.riskIndex, 0) / previousWeek.length;

    let trend: 'increasing' | 'decreasing' | 'stable';
    const trendDiff = avgRecent - avgPrevious;
    if (Math.abs(trendDiff) < 2) trend = 'stable';
    else if (trendDiff > 0) trend = 'increasing';
    else trend = 'decreasing';

    return {
      currentIndex: riskIndex,
      trend,
      riskLevel
    };
  }

  /**
   * Get department risk ranking
   */
  async getDepartmentRiskRanking(): Promise<Array<{
    departmentId: number;
    departmentName: string;
    riskScore: number;
    rank: number;
    riskCategory: 'low' | 'medium' | 'high' | 'critical';
    keyRiskFactors: string[];
  }>> {
    const metrics = await this.calculateBacklogRisk();
    
    return metrics.departmentRisks
      .sort((a, b) => b.riskScore - a.riskScore)
      .map((dept, index) => ({
        ...dept,
        rank: index + 1,
        riskCategory: dept.riskScore < 25 ? 'low' : 
                     dept.riskScore < 50 ? 'medium' : 
                     dept.riskScore < 75 ? 'high' : 'critical',
        keyRiskFactors: this.identifyKeyRiskFactors(dept)
      }));
  }

  /**
   * Get top 10 dangerous overdue jobs
   */
  async getTopRiskyJobs(): Promise<Array<{
    workOrderId: string;
    woNumber: string;
    assetName: string;
    riskScore: number;
    riskFactors: string[];
    recommendedAction: string;
    urgencyLevel: 'immediate' | 'urgent' | 'high' | 'medium';
  }>> {
    const metrics = await this.calculateBacklogRisk();
    
    return metrics.topRiskyJobs.slice(0, 10).map(job => ({
      ...job,
      riskFactors: this.identifyJobRiskFactors(job),
      recommendedAction: this.getRecommendedAction(job.riskScore),
      urgencyLevel: job.riskScore > 80 ? 'immediate' :
                   job.riskScore > 60 ? 'urgent' :
                   job.riskScore > 40 ? 'high' : 'medium'
    }));
  }

  /**
   * Generate executive risk report
   */
  async generateExecutiveRiskReport(): Promise<{
    plantRiskIndex: number;
    riskLevel: string;
    trend: string;
    departmentRisks: any[];
    topRiskyJobs: any[];
    recommendations: string[];
    generatedAt: string;
  }> {
    const [plantRisk, departmentRanking, topJobs] = await Promise.all([
      this.getPlantRiskIndex(),
      this.getDepartmentRiskRanking(),
      this.getTopRiskyJobs()
    ]);

    const recommendations = this.generateRecommendations(plantRisk, departmentRanking, topJobs);

    return {
      plantRiskIndex: plantRisk.currentIndex,
      riskLevel: plantRisk.riskLevel,
      trend: plantRisk.trend,
      departmentRisks: departmentRanking.slice(0, 5), // Top 5 risky departments
      topRiskyJobs: topJobs,
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Store daily risk snapshot
   */
  async storeDailySnapshot(): Promise<void> {
    const plantRisk = await this.getPlantRiskIndex();
    const metrics = await this.calculateBacklogRisk();

    try {
      await api.post('/analytics/risk-snapshots', {
        date: new Date().toISOString().split('T')[0],
        plant_risk_index: plantRisk.currentIndex,
        risk_level: plantRisk.riskLevel,
        total_backlog: metrics.trendData[metrics.trendData.length - 1]?.backlogCount || 0,
        critical_count: metrics.departmentRisks.reduce((sum, d) => sum + d.criticalCount, 0),
        overdue_count: metrics.departmentRisks.reduce((sum, d) => sum + d.overdueCount, 0)
      });

      await AuditService.logEnforcement(
        'risk_snapshot',
        new Date().toISOString().split('T')[0],
        0, // System user
        'DAILY_RISK_SNAPSHOT',
        {
          plant_risk_index: plantRisk.currentIndex,
          risk_level: plantRisk.riskLevel
        }
      );
    } catch (error) {
      console.error('Failed to store daily risk snapshot:', error);
    }
  }

  /**
   * Identify key risk factors for department
   */
  private identifyKeyRiskFactors(dept: any): string[] {
    const factors: string[] = [];
    if (dept.overdueCount > 10) factors.push('High overdue count');
    if (dept.criticalCount > 5) factors.push('Multiple critical jobs');
    if (dept.riskScore > 70) factors.push('Aging backlog');
    return factors;
  }

  /**
   * Identify risk factors for individual job
   */
  private identifyJobRiskFactors(job: any): string[] {
    const factors: string[] = [];
    if (job.ageInDays > 30) factors.push('Overdue > 30 days');
    if (job.priority === 'critical') factors.push('Critical priority');
    if (job.productionImpact > 5000) factors.push('High production impact');
    return factors;
  }

  /**
   * Get recommended action based on risk score
   */
  private getRecommendedAction(riskScore: number): string {
    if (riskScore > 80) return 'Immediate escalation to management';
    if (riskScore > 60) return 'Expedite resource allocation';
    if (riskScore > 40) return 'Schedule within 48 hours';
    return 'Include in next planning cycle';
  }

  /**
   * Generate executive recommendations
   */
  private generateRecommendations(plantRisk: any, departments: any[], jobs: any[]): string[] {
    const recommendations: string[] = [];

    if (plantRisk.riskLevel === 'critical') {
      recommendations.push('URGENT: Plant risk at critical level - immediate management intervention required');
    }

    if (plantRisk.trend === 'increasing') {
      recommendations.push('Risk trend increasing - review resource allocation and prioritization');
    }

    const highRiskDepts = departments.filter(d => d.riskCategory === 'critical' || d.riskCategory === 'high');
    if (highRiskDepts.length > 0) {
      recommendations.push(`Focus maintenance resources on ${highRiskDepts.map(d => d.departmentName).join(', ')}`);
    }

    const immediateJobs = jobs.filter(j => j.urgencyLevel === 'immediate');
    if (immediateJobs.length > 0) {
      recommendations.push(`${immediateJobs.length} jobs require immediate attention`);
    }

    return recommendations;
  }
}

export default new BacklogRiskService();