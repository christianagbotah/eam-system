import api from '@/lib/api';

export interface AuditLog {
  id: number;
  module: string;
  entity_type: string;
  entity_id: string | number;
  user_id: number;
  action: string;
  metadata?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export class AuditService {
  
  /**
   * Log enforcement actions for RWOP module
   */
  async logEnforcement(
    entityType: string,
    entityId: string | number,
    userId: number,
    action: string,
    details: any
  ) {
    try {
      const auditData = {
        module: 'RWOP',
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        action: `ENFORCEMENT_${action}`,
        metadata: JSON.stringify({
          ...details,
          timestamp: new Date().toISOString(),
          enforcement_level: 'CRITICAL'
        }),
        ip_address: this.getClientIP(),
        user_agent: navigator.userAgent || 'RWOP_Service'
      };

      const response = await api.post('/audit-logs', auditData);
      return response.data;
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failure shouldn't break business logic
    }
  }

  /**
   * Log team leader enforcement
   */
  async logTeamLeaderEnforcement(
    workOrderId: string | number,
    userId: number,
    action: 'AUTHORIZED' | 'DENIED' | 'OVERRIDE',
    details: any
  ) {
    return this.logEnforcement('work_order', workOrderId, userId, `TEAM_LEADER_${action}`, details);
  }

  /**
   * Log shift handover enforcement
   */
  async logShiftHandoverEnforcement(
    workOrderId: string | number,
    userId: number,
    action: 'BLOCKED' | 'VALIDATED' | 'BYPASSED',
    details: any
  ) {
    return this.logEnforcement('work_order', workOrderId, userId, `SHIFT_HANDOVER_${action}`, details);
  }

  /**
   * Get audit trail for work order
   */
  async getWorkOrderAuditTrail(workOrderId: string | number) {
    try {
      const response = await api.get(`/audit-logs?entity_type=work_order&entity_id=${workOrderId}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
      return [];
    }
  }

  /**
   * Get enforcement violations report
   */
  async getEnforcementReport(dateFrom?: string, dateTo?: string) {
    try {
      const params = new URLSearchParams();
      params.append('module', 'RWOP');
      params.append('action_filter', 'ENFORCEMENT_');
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await api.get(`/audit-logs?${params}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch enforcement report:', error);
      return [];
    }
  }

  private getClientIP(): string {
    // In browser environment, IP detection is limited
    return 'client_browser';
  }
}

export default new AuditService();