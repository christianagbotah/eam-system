import api from '@/lib/api';

export interface TeamMember {
  id: number;
  work_order_id: number;
  user_id: number;
  is_leader: boolean;
  assigned_at: string;
}

export interface ShiftHandover {
  id: number;
  work_order_id: number;
  from_shift: string;
  to_shift: string;
  status: 'pending' | 'signed' | 'rejected';
  handover_notes?: string;
  signed_by?: number;
  signed_at?: string;
}

export class RWOPWorkOrderService {
  
  /**
   * CRITICAL: Team Leader Enforcement for Work Order Completion
   */
  async completeWorkOrder(
    workOrderId: number | string, 
    completionData: any, 
    currentUserId: number,
    overrideReason?: string
  ) {
    // 1. Validate team leader authorization
    const teamValidation = await this.validateTeamLeaderAccess(workOrderId, currentUserId);
    
    if (!teamValidation.isAuthorized && !overrideReason) {
      throw new Error('UNAUTHORIZED: Only assigned team leader can complete work order');
    }

    // 2. Validate shift handover if required
    await this.validateShiftHandover(workOrderId);

    // 3. Process completion with audit logging
    const completionPayload = {
      ...completionData,
      completed_by: currentUserId,
      supervisor_override: !!overrideReason,
      override_reason: overrideReason
    };

    const response = await api.post(`/work-orders/${workOrderId}/complete`, completionPayload);

    // 4. Log enforcement action
    if (overrideReason) {
      await this.logAuditAction(workOrderId, currentUserId, 'SUPERVISOR_OVERRIDE', {
        reason: overrideReason,
        original_team_leader: teamValidation.teamLeaderId
      });
    }

    return response.data;
  }

  /**
   * Validate team leader access
   */
  private async validateTeamLeaderAccess(workOrderId: number | string, userId: number) {
    try {
      const response = await api.get(`/work-orders/${workOrderId}/team-members`);
      const teamMembers: TeamMember[] = response.data.data || [];
      
      const teamLeader = teamMembers.find(member => member.is_leader);
      const isTeamLeader = teamLeader?.user_id === userId;
      
      return {
        isAuthorized: isTeamLeader,
        teamLeaderId: teamLeader?.user_id,
        teamMembers
      };
    } catch (error) {
      console.error('Team validation error:', error);
      return { isAuthorized: false, teamLeaderId: null, teamMembers: [] };
    }
  }

  /**
   * CRITICAL: Shift Handover Gate Enforcement
   */
  private async validateShiftHandover(workOrderId: number | string) {
    try {
      const response = await api.get(`/work-orders/${workOrderId}/shift-handovers`);
      const handovers: ShiftHandover[] = response.data.data || [];
      
      const pendingHandovers = handovers.filter(h => h.status === 'pending');
      
      if (pendingHandovers.length > 0) {
        throw new Error('SHIFT_HANDOVER_REQUIRED: Pending shift handovers must be signed before completion');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('SHIFT_HANDOVER_REQUIRED')) {
        throw error;
      }
      // If handover endpoint doesn't exist, continue (backward compatibility)
      console.warn('Shift handover validation skipped:', error);
    }
  }

  /**
   * Log audit actions for enforcement
   */
  private async logAuditAction(
    workOrderId: number | string, 
    userId: number, 
    action: string, 
    metadata: any
  ) {
    try {
      await api.post('/audit-logs', {
        module: 'RWOP',
        entity_type: 'work_order',
        entity_id: workOrderId,
        user_id: userId,
        action,
        metadata: JSON.stringify(metadata),
        ip_address: 'system',
        user_agent: 'RWOP_Service'
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Delegate to existing work order service for other operations
   */
  async getWorkOrder(id: number | string) {
    const response = await api.get(`/work-orders/${id}`);
    return response.data;
  }

  async updateWorkOrder(id: number | string, data: any) {
    const response = await api.put(`/work-orders/${id}`, data);
    return response.data;
  }

  async assignTeamMember(workOrderId: number | string, userId: number, isLeader: boolean = false) {
    const response = await api.post(`/work-orders/${workOrderId}/team-members`, {
      user_id: userId,
      is_leader: isLeader
    });
    return response.data;
  }

  async createShiftHandover(workOrderId: number | string, handoverData: any) {
    const response = await api.post(`/work-orders/${workOrderId}/shift-handovers`, handoverData);
    return response.data;
  }

  async signShiftHandover(handoverId: number, userId: number, notes?: string) {
    const response = await api.post(`/shift-handovers/${handoverId}/sign`, {
      signed_by: userId,
      notes
    });
    return response.data;
  }
}

export default new RWOPWorkOrderService();