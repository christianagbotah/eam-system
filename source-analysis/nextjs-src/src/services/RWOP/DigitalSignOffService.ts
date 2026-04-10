import api from '@/lib/api';
import AuditService from './AuditService';

export enum SignOffRole {
  TEAM_LEADER = 'team_leader',
  SUPERVISOR = 'supervisor',
  PRODUCTION = 'production',
  ENGINEERING = 'engineering'
}

export interface DigitalSignature {
  id: number;
  workOrderId: number;
  signOffRole: SignOffRole;
  userId: number;
  userName: string;
  signedAt: string;
  shiftId?: number;
  deviceInfo: string;
  ipAddress: string;
  signature?: string; // Base64 encoded signature image
  comments?: string;
  isRequired: boolean;
  sequenceOrder: number;
}

export interface SignOffChain {
  workOrderId: number;
  signatures: DigitalSignature[];
  currentStep: number;
  isComplete: boolean;
  nextRequiredRole?: SignOffRole;
}

export class DigitalSignOffService {
  
  private signOffSequence: { role: SignOffRole; required: boolean; order: number }[] = [
    { role: SignOffRole.TEAM_LEADER, required: true, order: 1 },
    { role: SignOffRole.SUPERVISOR, required: true, order: 2 },
    { role: SignOffRole.PRODUCTION, required: true, order: 3 },
    { role: SignOffRole.ENGINEERING, required: false, order: 4 }
  ];

  /**
   * Initialize sign-off chain for work order
   */
  async initializeSignOffChain(
    workOrderId: number | string,
    requireEngineering: boolean = false
  ): Promise<SignOffChain> {
    const requiredSignOffs = this.signOffSequence.filter(s => 
      s.required || (s.role === SignOffRole.ENGINEERING && requireEngineering)
    );

    try {
      const response = await api.post('/work-orders/sign-off-chain', {
        work_order_id: workOrderId,
        required_sign_offs: requiredSignOffs
      });

      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Submit digital signature
   */
  async submitSignature(
    workOrderId: number | string,
    role: SignOffRole,
    userId: number,
    signature: {
      comments?: string;
      signatureImage?: string;
      deviceInfo: string;
      shiftId?: number;
    }
  ): Promise<DigitalSignature> {
    // Validate sequence
    const chain = await this.getSignOffChain(workOrderId);
    const nextRequired = this.getNextRequiredSignOff(chain);
    
    if (!nextRequired || nextRequired.role !== role) {
      throw new Error(`Invalid sign-off sequence. Expected: ${nextRequired?.role}, Received: ${role}`);
    }

    // Validate user role
    await this.validateUserRole(userId, role);

    try {
      const response = await api.post(`/work-orders/${workOrderId}/sign-off`, {
        role,
        user_id: userId,
        comments: signature.comments,
        signature_image: signature.signatureImage,
        device_info: signature.deviceInfo,
        shift_id: signature.shiftId,
        signed_at: new Date().toISOString(),
        ip_address: await this.getClientIP()
      });

      // Log digital signature
      await AuditService.logEnforcement(
        'digital_signature',
        response.data.data.id,
        userId,
        'DIGITAL_SIGNATURE_SUBMITTED',
        {
          work_order_id: workOrderId,
          role,
          device_info: signature.deviceInfo,
          shift_id: signature.shiftId,
          has_signature_image: !!signature.signatureImage,
          timestamp: new Date().toISOString()
        }
      );

      return response.data.data;
    } catch (error) {
      await AuditService.logEnforcement(
        'digital_signature',
        `${workOrderId}_${role}`,
        userId,
        'DIGITAL_SIGNATURE_FAILED',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          role
        }
      );
      throw error;
    }
  }

  /**
   * Get sign-off chain status
   */
  async getSignOffChain(workOrderId: number | string): Promise<SignOffChain> {
    const response = await api.get(`/work-orders/${workOrderId}/sign-off-chain`);
    return response.data.data;
  }

  /**
   * Validate work order completion readiness
   */
  async validateCompletionReadiness(workOrderId: number | string): Promise<{
    canComplete: boolean;
    missingSignOffs: SignOffRole[];
    completionBlockers: string[];
  }> {
    const chain = await this.getSignOffChain(workOrderId);
    const requiredSignOffs = this.signOffSequence.filter(s => s.required);
    
    const missingSignOffs: SignOffRole[] = [];
    const completionBlockers: string[] = [];

    for (const required of requiredSignOffs) {
      const signature = chain.signatures.find(s => s.signOffRole === required.role);
      if (!signature) {
        missingSignOffs.push(required.role);
        completionBlockers.push(`Missing ${required.role} sign-off`);
      }
    }

    return {
      canComplete: missingSignOffs.length === 0,
      missingSignOffs,
      completionBlockers
    };
  }

  /**
   * Get next required sign-off
   */
  private getNextRequiredSignOff(chain: SignOffChain): { role: SignOffRole; order: number } | null {
    const completedRoles = chain.signatures.map(s => s.signOffRole);
    
    for (const step of this.signOffSequence) {
      if (!completedRoles.includes(step.role) && step.required) {
        return { role: step.role, order: step.order };
      }
    }
    
    return null;
  }

  /**
   * Validate user has required role
   */
  private async validateUserRole(userId: number, requiredRole: SignOffRole): Promise<void> {
    const response = await api.get(`/users/${userId}/roles`);
    const userRoles = response.data.data.roles || [];
    
    const roleMapping = {
      [SignOffRole.TEAM_LEADER]: ['team_leader', 'supervisor'],
      [SignOffRole.SUPERVISOR]: ['supervisor', 'manager'],
      [SignOffRole.PRODUCTION]: ['production_supervisor', 'production_manager', 'supervisor'],
      [SignOffRole.ENGINEERING]: ['engineer', 'engineering_manager']
    };

    const allowedRoles = roleMapping[requiredRole] || [];
    const hasRole = userRoles.some((role: string) => allowedRoles.includes(role));
    
    if (!hasRole) {
      throw new Error(`User does not have required role for ${requiredRole} sign-off`);
    }
  }

  /**
   * Get client IP address
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Generate sign-off report
   */
  async generateSignOffReport(workOrderId: number | string): Promise<{
    workOrderId: number | string;
    signOffChain: SignOffChain;
    auditTrail: any[];
    complianceStatus: 'compliant' | 'non_compliant' | 'pending';
  }> {
    const [chain, auditTrail] = await Promise.all([
      this.getSignOffChain(workOrderId),
      AuditService.getWorkOrderAuditTrail(workOrderId)
    ]);

    const validation = await this.validateCompletionReadiness(workOrderId);
    const complianceStatus = validation.canComplete ? 'compliant' : 
                           chain.signatures.length > 0 ? 'pending' : 'non_compliant';

    return {
      workOrderId,
      signOffChain: chain,
      auditTrail: auditTrail.filter(log => log.action.includes('SIGNATURE')),
      complianceStatus
    };
  }
}

export default new DigitalSignOffService();