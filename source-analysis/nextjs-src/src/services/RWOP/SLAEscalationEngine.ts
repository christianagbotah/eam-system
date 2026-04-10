import api from '@/lib/api';
import AuditService from './AuditService';

export interface SLAMetrics {
  responseTime: number; // minutes
  repairDuration: number; // minutes
  downtimeDuration: number; // minutes
  slaBreached: boolean;
  escalationLevel: number;
}

export interface SLAThresholds {
  priority: string;
  responseTimeMinutes: number;
  repairDurationHours: number;
  downtimeThresholdHours: number;
}

export class SLAEscalationEngine {
  private defaultThresholds: SLAThresholds[] = [
    { priority: 'critical', responseTimeMinutes: 15, repairDurationHours: 2, downtimeThresholdHours: 1 },
    { priority: 'high', responseTimeMinutes: 30, repairDurationHours: 4, downtimeThresholdHours: 2 },
    { priority: 'medium', responseTimeMinutes: 60, repairDurationHours: 8, downtimeThresholdHours: 4 },
    { priority: 'low', responseTimeMinutes: 240, repairDurationHours: 24, downtimeThresholdHours: 8 }
  ];

  /**
   * Calculate SLA metrics for work order
   */
  async calculateSLAMetrics(workOrderId: number | string): Promise<SLAMetrics> {
    const response = await api.get(`/work-orders/${workOrderId}/sla-metrics`);
    const workOrder = response.data.data;
    
    const thresholds = this.getThresholds(workOrder.priority);
    const now = new Date();
    
    // Calculate response time (created to assigned)
    const responseTime = workOrder.assigned_at 
      ? this.getMinutesDiff(workOrder.created_at, workOrder.assigned_at)
      : this.getMinutesDiff(workOrder.created_at, now);

    // Calculate repair duration (started to completed)
    const repairDuration = workOrder.actual_start && workOrder.actual_end
      ? this.getMinutesDiff(workOrder.actual_start, workOrder.actual_end)
      : workOrder.actual_start
      ? this.getMinutesDiff(workOrder.actual_start, now)
      : 0;

    // Calculate downtime duration
    const downtimeDuration = workOrder.downtime_start && workOrder.downtime_end
      ? this.getMinutesDiff(workOrder.downtime_start, workOrder.downtime_end)
      : workOrder.downtime_start
      ? this.getMinutesDiff(workOrder.downtime_start, now)
      : 0;

    const slaBreached = 
      responseTime > thresholds.responseTimeMinutes ||
      (repairDuration / 60) > thresholds.repairDurationHours ||
      (downtimeDuration / 60) > thresholds.downtimeThresholdHours;

    const escalationLevel = this.calculateEscalationLevel(responseTime, repairDuration, thresholds);

    return {
      responseTime,
      repairDuration,
      downtimeDuration,
      slaBreached,
      escalationLevel
    };
  }

  /**
   * Check and trigger escalations
   */
  async checkEscalations(workOrderId: number | string, userId: number): Promise<void> {
    const metrics = await this.calculateSLAMetrics(workOrderId);
    
    if (metrics.slaBreached && metrics.escalationLevel > 0) {
      await this.triggerEscalation(workOrderId, metrics.escalationLevel, userId);
    }
  }

  /**
   * Trigger escalation alert
   */
  private async triggerEscalation(workOrderId: number | string, level: number, userId: number): Promise<void> {
    const escalationData = {
      work_order_id: workOrderId,
      escalation_level: level,
      triggered_by: userId,
      triggered_at: new Date().toISOString(),
      alert_type: level === 1 ? 'supervisor' : level === 2 ? 'manager' : 'executive'
    };

    try {
      await api.post('/work-orders/escalations', escalationData);
      
      // Log escalation
      await AuditService.logEnforcement(
        'work_order',
        workOrderId,
        userId,
        'SLA_ESCALATION_TRIGGERED',
        {
          escalation_level: level,
          alert_type: escalationData.alert_type,
          timestamp: escalationData.triggered_at
        }
      );
    } catch (error) {
      console.error('Failed to trigger escalation:', error);
    }
  }

  /**
   * Get SLA thresholds for priority
   */
  private getThresholds(priority: string): SLAThresholds {
    return this.defaultThresholds.find(t => t.priority === priority) || this.defaultThresholds[2];
  }

  /**
   * Calculate minutes difference between dates
   */
  private getMinutesDiff(start: string | Date, end: string | Date): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  }

  /**
   * Calculate escalation level based on SLA breach severity
   */
  private calculateEscalationLevel(responseTime: number, repairDuration: number, thresholds: SLAThresholds): number {
    const responseOverrun = responseTime / thresholds.responseTimeMinutes;
    const repairOverrun = (repairDuration / 60) / thresholds.repairDurationHours;
    
    const maxOverrun = Math.max(responseOverrun, repairOverrun);
    
    if (maxOverrun >= 3) return 3; // Executive
    if (maxOverrun >= 2) return 2; // Manager
    if (maxOverrun >= 1.5) return 1; // Supervisor
    return 0; // No escalation
  }
}

export default new SLAEscalationEngine();