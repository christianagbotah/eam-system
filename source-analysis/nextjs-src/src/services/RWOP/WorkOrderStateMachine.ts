import api from '@/lib/api';
import AuditService from './AuditService';

export enum WorkOrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  PLANNED = 'planned',
  ASSIGNED = 'assigned',
  WAITING_PARTS = 'waiting_parts',
  IN_PROGRESS = 'in_progress',
  PENDING_HANDOVER = 'pending_handover',
  COMPLETED = 'completed',
  VERIFIED = 'verified',
  CLOSED = 'closed'
}

export interface StateTransition {
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  requiredRoles: string[];
  conditions?: string[];
}

export class WorkOrderStateMachine {
  private transitions: StateTransition[] = [
    { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, requiredRoles: ['technician', 'planner', 'supervisor'] },
    { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.APPROVED, requiredRoles: ['supervisor', 'manager'] },
    { from: WorkOrderStatus.APPROVED, to: WorkOrderStatus.PLANNED, requiredRoles: ['planner', 'supervisor'] },
    { from: WorkOrderStatus.PLANNED, to: WorkOrderStatus.ASSIGNED, requiredRoles: ['supervisor', 'planner'] },
    { from: WorkOrderStatus.ASSIGNED, to: WorkOrderStatus.WAITING_PARTS, requiredRoles: ['technician'], conditions: ['parts_required'] },
    { from: WorkOrderStatus.ASSIGNED, to: WorkOrderStatus.IN_PROGRESS, requiredRoles: ['technician'] },
    { from: WorkOrderStatus.WAITING_PARTS, to: WorkOrderStatus.IN_PROGRESS, requiredRoles: ['technician'], conditions: ['parts_available'] },
    { from: WorkOrderStatus.IN_PROGRESS, to: WorkOrderStatus.PENDING_HANDOVER, requiredRoles: ['team_leader'] },
    { from: WorkOrderStatus.PENDING_HANDOVER, to: WorkOrderStatus.COMPLETED, requiredRoles: ['supervisor'], conditions: ['handover_signed'] },
    { from: WorkOrderStatus.COMPLETED, to: WorkOrderStatus.VERIFIED, requiredRoles: ['supervisor', 'manager'] },
    { from: WorkOrderStatus.VERIFIED, to: WorkOrderStatus.CLOSED, requiredRoles: ['supervisor', 'manager'] }
  ];

  /**
   * Validate and execute state transition
   */
  async transitionState(
    workOrderId: number | string,
    fromStatus: WorkOrderStatus,
    toStatus: WorkOrderStatus,
    userId: number,
    userRole: string,
    reason?: string
  ): Promise<boolean> {
    // Find valid transition
    const transition = this.transitions.find(t => t.from === fromStatus && t.to === toStatus);
    
    if (!transition) {
      throw new Error(`Invalid transition from ${fromStatus} to ${toStatus}`);
    }

    // Check role permissions
    if (!transition.requiredRoles.includes(userRole)) {
      throw new Error(`Role ${userRole} not authorized for transition ${fromStatus} → ${toStatus}`);
    }

    // Check conditions
    if (transition.conditions) {
      await this.validateConditions(workOrderId, transition.conditions);
    }

    // Execute transition
    try {
      const response = await api.post(`/work-orders/${workOrderId}/transition`, {
        from_status: fromStatus,
        to_status: toStatus,
        user_id: userId,
        reason: reason || `Status changed from ${fromStatus} to ${toStatus}`
      });

      // Log state transition
      await AuditService.logEnforcement(
        'work_order',
        workOrderId,
        userId,
        'STATE_TRANSITION',
        {
          from_status: fromStatus,
          to_status: toStatus,
          user_role: userRole,
          reason,
          timestamp: new Date().toISOString()
        }
      );

      return response.data.success;
    } catch (error) {
      await AuditService.logEnforcement(
        'work_order',
        workOrderId,
        userId,
        'STATE_TRANSITION_FAILED',
        {
          from_status: fromStatus,
          to_status: toStatus,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Get valid next states for current status and user role
   */
  getValidTransitions(currentStatus: WorkOrderStatus, userRole: string): WorkOrderStatus[] {
    return this.transitions
      .filter(t => t.from === currentStatus && t.requiredRoles.includes(userRole))
      .map(t => t.to);
  }

  /**
   * Validate transition conditions
   */
  private async validateConditions(workOrderId: number | string, conditions: string[]): Promise<void> {
    for (const condition of conditions) {
      switch (condition) {
        case 'parts_required':
          await this.checkPartsRequired(workOrderId);
          break;
        case 'parts_available':
          await this.checkPartsAvailable(workOrderId);
          break;
        case 'handover_signed':
          await this.checkHandoverSigned(workOrderId);
          break;
        default:
          throw new Error(`Unknown condition: ${condition}`);
      }
    }
  }

  private async checkPartsRequired(workOrderId: number | string): Promise<void> {
    const response = await api.get(`/work-orders/${workOrderId}/materials`);
    const materials = response.data.data || [];
    if (materials.length === 0) {
      throw new Error('No parts required for this work order');
    }
  }

  private async checkPartsAvailable(workOrderId: number | string): Promise<void> {
    const response = await api.get(`/work-orders/${workOrderId}/parts-availability`);
    if (!response.data.data.all_available) {
      throw new Error('Required parts not available');
    }
  }

  private async checkHandoverSigned(workOrderId: number | string): Promise<void> {
    const response = await api.get(`/work-orders/${workOrderId}/handover-status`);
    if (!response.data.data.signed) {
      throw new Error('Shift handover not signed');
    }
  }
}

export default new WorkOrderStateMachine();