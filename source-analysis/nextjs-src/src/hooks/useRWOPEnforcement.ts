import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import RWOPWorkOrderService from '@/services/RWOP/WorkOrderService';
import AuditService from '@/services/RWOP/AuditService';

export interface EnforcementResult {
  canComplete: boolean;
  isTeamLeader: boolean;
  requiresOverride: boolean;
  blockingReasons: string[];
  teamLeaderId?: number;
}

export const useRWOPEnforcement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enforcementResult, setEnforcementResult] = useState<EnforcementResult | null>(null);

  /**
   * Check if current user can complete work order
   */
  const checkCompletionAccess = useCallback(async (workOrderId: number | string) => {
    if (!user?.id) {
      setEnforcementResult({
        canComplete: false,
        isTeamLeader: false,
        requiresOverride: false,
        blockingReasons: ['User not authenticated']
      });
      return;
    }

    setLoading(true);
    try {
      // Check team leader status
      const teamResponse = await fetch(`/api/v1/work-orders/${workOrderId}/team-members`);
      const teamData = await teamResponse.json();
      const teamMembers = teamData.data || [];
      
      const teamLeader = teamMembers.find((member: any) => member.is_leader);
      const isTeamLeader = teamLeader?.user_id === user.id;
      
      // Check shift handover status
      let shiftHandoverBlocked = false;
      try {
        const handoverResponse = await fetch(`/api/v1/work-orders/${workOrderId}/shift-handovers`);
        const handoverData = await handoverResponse.json();
        const handovers = handoverData.data || [];
        shiftHandoverBlocked = handovers.some((h: any) => h.status === 'pending');
      } catch (error) {
        // Handover endpoint might not exist - continue
      }

      const blockingReasons: string[] = [];
      if (!isTeamLeader) {
        blockingReasons.push('Only assigned team leader can complete work order');
      }
      if (shiftHandoverBlocked) {
        blockingReasons.push('Pending shift handovers must be signed');
      }

      const result: EnforcementResult = {
        canComplete: isTeamLeader && !shiftHandoverBlocked,
        isTeamLeader,
        requiresOverride: !isTeamLeader || shiftHandoverBlocked,
        blockingReasons,
        teamLeaderId: teamLeader?.user_id
      };

      setEnforcementResult(result);
      
      // Log access check
      await AuditService.logTeamLeaderEnforcement(
        workOrderId,
        user.id,
        result.canComplete ? 'AUTHORIZED' : 'DENIED',
        { 
          team_leader_id: teamLeader?.user_id,
          blocking_reasons: blockingReasons,
          user_role: user.role 
        }
      );

    } catch (error) {
      console.error('Enforcement check failed:', error);
      setEnforcementResult({
        canComplete: false,
        isTeamLeader: false,
        requiresOverride: true,
        blockingReasons: ['System error during validation']
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Complete work order with enforcement
   */
  const completeWithEnforcement = useCallback(async (
    workOrderId: number | string,
    completionData: any,
    overrideReason?: string
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const result = await RWOPWorkOrderService.completeWorkOrder(
        workOrderId,
        completionData,
        user.id,
        overrideReason
      );

      // Log successful completion
      await AuditService.logTeamLeaderEnforcement(
        workOrderId,
        user.id,
        overrideReason ? 'OVERRIDE' : 'AUTHORIZED',
        {
          completion_data: completionData,
          override_reason: overrideReason
        }
      );

      return result;
    } catch (error) {
      // Log failed attempt
      await AuditService.logTeamLeaderEnforcement(
        workOrderId,
        user.id,
        'DENIED',
        {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          attempted_override: !!overrideReason
        }
      );
      throw error;
    }
  }, [user]);

  /**
   * Check if user can override enforcement
   */
  const canOverride = useCallback(() => {
    return user?.role === 'supervisor' || user?.role === 'admin' || user?.role === 'manager';
  }, [user]);

  return {
    loading,
    enforcementResult,
    checkCompletionAccess,
    completeWithEnforcement,
    canOverride,
    // Convenience getters
    canComplete: enforcementResult?.canComplete ?? false,
    isTeamLeader: enforcementResult?.isTeamLeader ?? false,
    blockingReasons: enforcementResult?.blockingReasons ?? []
  };
};

export default useRWOPEnforcement;