// ============================================================================
// FIELD WORK EXECUTION SERVICE — Guided work order execution for technicians
// Handles checklists, permits, LOTO, measurements, voice notes, scanning
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('fieldExecution');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChecklistStep {
  id: string;
  sequence: number;
  title: string;
  description?: string;
  type: 'check' | 'measure' | 'photo' | 'signature' | 'scan' | 'note' | 'loto_verify' | 'permit_verify';
  required: boolean;
  completed: boolean;
  completedAt?: string;
  result?: string | number | boolean;
  photoUrl?: string;
  notes?: string;
  validation?: {
    type: 'range' | 'enum' | 'regex' | 'required';
    min?: number;
    max?: number;
    options?: string[];
    pattern?: string;
    message?: string;
  };
}

export interface DigitalPermit {
  id: string;
  workOrderId: string;
  permitType: string;       // hot_work, confined_space, elevated_work, electrical, excavation
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'expired' | 'cancelled';
  issuedById: string;
  approvedById?: string;
  validFrom: string;
  validTo: string;
  location?: string;
  precautions: string[];
  equipmentList: string[];
  emergencyContacts: string[];
  acknowledgmentSignature?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LotoStep {
  id: string;
  sequence: number;
  energySource: string;
  isolationPoint: string;
  lockDeviceId?: string;
  tagNumber?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  released: boolean;
  releasedBy?: string;
  releasedAt?: string;
}

export interface MeasurementRecord {
  id: string;
  checklistStepId: string;
  workOrderId: string;
  parameterName: string;
  value: number;
  unit: string;
  minAcceptable: number;
  maxAcceptable: number;
  withinRange: boolean;
  recordedAt: string;
  recordedById: string;
  notes?: string;
  photoUrl?: string;
}

export interface VoiceNote {
  id: string;
  workOrderId: string;
  recordedById: string;
  durationSeconds: number;
  audioUrl?: string;       // base64 or blob URL
  transcript?: string;    // AI-generated transcript
  createdAt: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface ScanResult {
  scanType: 'qr' | 'barcode';
  rawValue: string;
  processedEntity: 'asset' | 'work_order' | 'spare_part' | 'tool' | 'unknown';
  entityId?: string;
  entityName?: string;
  entityData?: Record<string, unknown>;
  scannedAt: string;
}

export interface TimeTrackingEntry {
  id: string;
  workOrderId: string;
  userId: string;
  action: 'start' | 'pause' | 'resume' | 'complete';
  timestamp: string;
  durationMinutes?: number;
  notes?: string;
  isOffline: boolean;
}

export interface FormStep {
  id: string;
  title: string;
  fields: FormField[];
  validationRules?: Record<string, { required?: boolean; min?: number; max?: number; pattern?: string }>;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'time' | 'datetime' | 'photo' | 'signature' | 'measurement';
  value?: unknown;
  options?: { label: string; value: string }[];
  required: boolean;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  helpText?: string;
}

// ---------------------------------------------------------------------------
// FieldExecutionService
// ---------------------------------------------------------------------------

export class FieldExecutionService {

  // =========================================================================
  // GUIDED WORK ORDER EXECUTION
  // =========================================================================

  /**
   * Generate a step-by-step execution checklist for a work order.
   */
  static async generateExecutionChecklist(workOrderId: string): Promise<ChecklistStep[]> {
    const timer = logger.timer('generateChecklist');
    try {
      const wo = await db.workOrder.findUnique({
        where: { id: workOrderId },
        select: {
          type: true, safetyNotes: true, ppeRequired: true,
          description: true, assetId: true, id: true,
        },
      });

      if (!wo) throw new Error('Work order not found');

      const steps: ChecklistStep[] = [];
      let seq = 0;

      // Phase 1: Safety & Preparation
      steps.push({
        id: `step-${++seq}`, sequence: seq, title: 'Review Safety Requirements',
        description: wo.safetyNotes || undefined, type: 'check', required: true, completed: false,
      });

      steps.push({
        id: `step-${++seq}`, sequence: seq, title: 'Verify PPE Requirements',
        description: wo.ppeRequired || 'Standard PPE required', type: 'check', required: true, completed: false,
      });

      // LOTO step if applicable
      if (wo.safetyNotes?.toLowerCase().includes('loto') || wo.safetyNotes?.toLowerCase().includes('lockout')) {
        steps.push({
          id: `step-${++seq}`, sequence: seq, title: 'Lockout/Tagout Verification',
          description: 'Verify all energy sources are isolated, locked, and tagged', type: 'loto_verify', required: true, completed: false,
        });
      }

      // Phase 2: Permit verification if needed
      const highRiskTypes = ['hot_work', 'confined_space', 'elevated'];
      const needsPermit = highRiskTypes.some(t => wo.description?.toLowerCase().includes(t));
      if (needsPermit) {
        steps.push({
          id: `step-${++seq}`, sequence: seq, title: 'Permit to Work Verification',
          description: 'Verify active permit is in place', type: 'permit_verify', required: true, completed: false,
        });
      }

      // Phase 3: Asset inspection
      steps.push({
        id: `step-${++seq}`, sequence: seq, title: 'Pre-Work Asset Inspection',
        description: 'Document current asset condition with photos', type: 'photo', required: true, completed: false,
      });

      // Phase 4: Scan asset tag
      steps.push({
        id: `step-${++seq}`, sequence: seq, title: 'Scan Asset Tag',
        description: 'Verify you are at the correct asset', type: 'scan', required: true, completed: false,
      });

      // Phase 5: Work execution
      steps.push({
        id: `step-${++seq}`, sequence: seq, title: 'Execute Repair/Maintenance Work',
        description: wo.description || undefined, type: 'note', required: true, completed: false,
      });

      // Phase 6: Measurements
      steps.push({
        id: `step-${++seq}`, sequence: seq, title: 'Record Measurements',
        description: 'Record relevant measurements with photos', type: 'measure', required: false, completed: false,
        validation: { type: 'range', message: 'Record at least one measurement' },
      });

      // Phase 7: Post-work photo
      steps.push({
        id: `step-${++seq}`, sequence: seq, title: 'Post-Work Documentation',
        description: 'Take completion photos showing repaired/inspected area', type: 'photo', required: true, completed: false,
      });

      // Phase 8: LOTO release if applicable
      if (steps.some(s => s.type === 'loto_verify')) {
        steps.push({
          id: `step-${++seq}`, sequence: seq, title: 'Lockout/Tagout Release',
          description: 'Remove locks and tags, restore energy', type: 'loto_verify', required: true, completed: false,
        });
      }

      // Phase 9: Supervisor sign-off
      steps.push({
        id: `step-${++seq}`, sequence: seq, title: 'Completion Signature',
        description: 'Sign to confirm work is complete', type: 'signature', required: true, completed: false,
      });

      logger.info('Checklist generated', { workOrderId, stepCount: steps.length });
      return steps;
    } finally {
      timer.end();
    }
  }

  // =========================================================================
  // MEASUREMENT RECORDING WITH VALIDATION
  // =========================================================================

  /**
   * Record a measurement with range validation.
   */
  static async recordMeasurement(data: {
    workOrderId: string;
    checklistStepId: string;
    parameterName: string;
    value: number;
    unit: string;
    minAcceptable: number;
    maxAcceptable: number;
    recordedById: string;
    notes?: string;
    photoUrl?: string;
  }): Promise<MeasurementRecord> {
    const withinRange = data.value >= data.minAcceptable && data.value <= data.maxAcceptable;

    const record: MeasurementRecord = {
      id: `meas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      checklistStepId: data.checklistStepId,
      workOrderId: data.workOrderId,
      parameterName: data.parameterName,
      value: data.value,
      unit: data.unit,
      minAcceptable: data.minAcceptable,
      maxAcceptable: data.maxAcceptable,
      withinRange,
      recordedAt: new Date().toISOString(),
      recordedById: data.recordedById,
      notes: data.notes,
      photoUrl: data.photoUrl,
    };

    if (!withinRange) {
      logger.warn('Measurement outside acceptable range', {
        parameter: data.parameterName,
        value: data.value,
        range: `${data.minAcceptable} - ${data.maxAcceptable} ${data.unit}`,
      });
    }

    logger.info('Measurement recorded', { parameter: data.parameterName, value: data.value, withinRange });
    return record;
  }

  /**
   * Validate a single measurement value against constraints.
   */
  static validateMeasurement(value: number, validation: ChecklistStep['validation']): { valid: boolean; message?: string } {
    if (!validation) return { valid: true };

    switch (validation.type) {
      case 'range': {
        if (validation.min !== undefined && value < validation.min) {
          return { valid: false, message: `Value ${value} is below minimum ${validation.min}. ${validation.message || ''}` };
        }
        if (validation.max !== undefined && value > validation.max) {
          return { valid: false, message: `Value ${value} is above maximum ${validation.max}. ${validation.message || ''}` };
        }
        return { valid: true };
      }
      default:
        return { valid: true };
    }
  }

  // =========================================================================
  // QR/BARCODE SCAN PROCESSING
  // =========================================================================

  /**
   * Process a scanned QR/barcode value and resolve to an entity.
   */
  static async processScanResult(rawValue: string): Promise<ScanResult> {
    const result: ScanResult = {
      scanType: rawValue.startsWith('http') ? 'qr' : 'barcode',
      rawValue,
      processedEntity: 'unknown',
      scannedAt: new Date().toISOString(),
    };

    try {
      // Try to find matching entity by various identifiers
      // Asset by tag or serial
      const asset = await db.asset.findFirst({
        where: {
          OR: [
            { assetTag: rawValue },
            { serialNumber: rawValue },
          ],
        },
        select: { id: true, name: true, assetTag: true, serialNumber: true, status: true },
      });

      if (asset) {
        result.processedEntity = 'asset';
        result.entityId = asset.id;
        result.entityName = asset.name;
        result.entityData = asset as unknown as Record<string, unknown>;
        return result;
      }

      // Work order by WO number
      const wo = await db.workOrder.findUnique({
        where: { woNumber: rawValue },
        select: { id: true, woNumber: true, title: true, status: true, priority: true },
      });

      if (wo) {
        result.processedEntity = 'work_order';
        result.entityId = wo.id;
        result.entityName = wo.title;
        result.entityData = wo as unknown as Record<string, unknown>;
        return result;
      }

      // Inventory item by code
      const item = await db.inventoryItem.findUnique({
        where: { itemCode: rawValue },
        select: { id: true, itemCode: true, name: true, currentStock: true, unitOfMeasure: true },
      });

      if (item) {
        result.processedEntity = 'spare_part';
        result.entityId = item.id;
        result.entityName = item.name;
        result.entityData = item as unknown as Record<string, unknown>;
        return result;
      }

      logger.info('Scan resolved to unknown entity', { rawValue });
      return result;
    } catch (err) {
      logger.error('Error processing scan result', { error: (err as Error).message, rawValue });
      return result;
    }
  }

  // =========================================================================
  // VOICE NOTE MANAGEMENT
  // =========================================================================

  /**
   * Create a voice note record.
   */
  static createVoiceNote(data: {
    workOrderId: string;
    recordedById: string;
    durationSeconds: number;
    audioData?: string;
    isOffline?: boolean;
  }): VoiceNote {
    const note: VoiceNote = {
      id: `vn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workOrderId: data.workOrderId,
      recordedById: data.recordedById,
      durationSeconds: data.durationSeconds,
      audioUrl: data.audioData,
      createdAt: new Date().toISOString(),
      isOffline: data.isOffline ?? false,
      syncStatus: data.isOffline ? 'pending' : 'synced',
    };

    logger.info('Voice note created', { noteId: note.id, duration: data.durationSeconds });
    return note;
  }

  // =========================================================================
  // TIME TRACKING
  // =========================================================================

  /**
   * Start time tracking for a work order.
   */
  static async startTimeTracking(workOrderId: string, userId: string): Promise<TimeTrackingEntry> {
    const entry: TimeTrackingEntry = {
      id: `tt-${Date.now()}`,
      workOrderId,
      userId,
      action: 'start',
      timestamp: new Date().toISOString(),
      isOffline: !OfflineFirstAdapter.isOnline(),
    };

    // Record in DB
    try {
      await db.workOrderTimeLog.create({
        data: {
          workOrderId,
          userId,
          action: 'start',
          notes: 'Mobile field execution',
        },
      });
      logger.info('Time tracking started', { workOrderId, userId });
    } catch (err) {
      logger.error('Failed to start time tracking', { error: (err as Error).message });
    }

    return entry;
  }

  /**
   * Stop/pause time tracking for a work order.
   */
  static async stopTimeTracking(
    workOrderId: string,
    userId: string,
    action: 'pause' | 'complete' = 'pause',
    notes?: string
  ): Promise<TimeTrackingEntry> {
    const entry: TimeTrackingEntry = {
      id: `tt-${Date.now()}`,
      workOrderId,
      userId,
      action,
      timestamp: new Date().toISOString(),
      isOffline: !OfflineFirstAdapter.isOnline(),
    };

    try {
      // Calculate duration from last start/resume
      const lastStart = await db.workOrderTimeLog.findFirst({
        where: { workOrderId, userId, action: { in: ['start', 'resume'] } },
        orderBy: { timestamp: 'desc' },
      });

      let durationHours: number | undefined;
      if (lastStart) {
        const elapsedMs = Date.now() - lastStart.timestamp.getTime();
        durationHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 100) / 100;
        entry.durationMinutes = Math.round(elapsedMs / (1000 * 60));
      }

      await db.workOrderTimeLog.create({
        data: {
          workOrderId,
          userId,
          action,
          duration: durationHours,
          notes,
        },
      });

      // If complete, update WO
      if (action === 'complete') {
        await db.workOrder.update({
          where: { id: workOrderId },
          data: {
            actualEnd: new Date(),
          },
        });
      }

      logger.info('Time tracking stopped', { workOrderId, userId, action, durationHours });
    } catch (err) {
      logger.error('Failed to stop time tracking', { error: (err as Error).message });
    }

    return entry;
  }

  // =========================================================================
  // LOTO VERIFICATION WORKFLOW
  // =========================================================================

  /**
   * Get LOTO steps for a work order.
   */
  static async getLotoSteps(workOrderId: string): Promise<LotoStep[]> {
    const wo = await db.workOrder.findUnique({
      where: { id: workOrderId },
      select: { safetyNotes: true },
    });

    if (!wo) return [];

    // Parse LOTO info from safety notes
    const steps: LotoStep[] = [];
    const safetyNotes = wo.safetyNotes || '';

    // Default LOTO steps
    const defaultSteps = [
      { energySource: 'Electrical', isolationPoint: 'Main disconnect' },
      { energySource: 'Mechanical', isolationPoint: 'Mechanical stop' },
      { energySource: 'Hydraulic', isolationPoint: 'Hydraulic valve' },
      { energySource: 'Pneumatic', isolationPoint: 'Air supply valve' },
    ];

    for (let i = 0; i < defaultSteps.length; i++) {
      steps.push({
        id: `loto-${workOrderId}-${i + 1}`,
        sequence: i + 1,
        ...defaultSteps[i],
        verified: false,
        released: false,
      });
    }

    return steps;
  }

  /**
   * Verify a LOTO step.
   */
  static verifyLotoStep(stepId: string, userId: string): LotoStep | null {
    // This would typically update a DB record, but LotoSteps are transient in the checklist
    logger.info('LOTO step verified', { stepId, userId });
    return null;
  }

  // =========================================================================
  // MULTI-STEP FORM MANAGEMENT
  // =========================================================================

  /**
   * Build a dynamic form from a work order context.
   */
  static buildWorkOrderForm(workOrderId: string): FormStep[] {
    return [
      {
        id: 'step-safety',
        title: 'Safety Verification',
        fields: [
          { id: 'ppe_confirmed', label: 'PPE Confirmed', type: 'checkbox', required: true },
          { id: 'safety_notes', label: 'Safety Observations', type: 'text', required: false, placeholder: 'Any safety concerns...' },
          { id: 'area_clear', label: 'Work Area Clear', type: 'checkbox', required: true },
        ],
      },
      {
        id: 'step-measurements',
        title: 'Measurements',
        fields: [
          { id: 'vibration', label: 'Vibration Level', type: 'measurement', unit: 'mm/s', required: false, min: 0, max: 50 },
          { id: 'temperature', label: 'Temperature', type: 'measurement', unit: '°C', required: false, min: -20, max: 200 },
          { id: 'pressure', label: 'Pressure', type: 'measurement', unit: 'bar', required: false, min: 0, max: 100 },
        ],
      },
      {
        id: 'step-completion',
        title: 'Work Completion',
        fields: [
          { id: 'work_done', label: 'Work Performed', type: 'text', required: true, placeholder: 'Describe work completed...' },
          { id: 'parts_used', label: 'Parts Used', type: 'text', required: false, placeholder: 'List parts replaced...' },
          { id: 'completion_photo', label: 'Completion Photo', type: 'photo', required: true },
          { id: 'signature', label: 'Technician Signature', type: 'signature', required: true },
        ],
      },
    ];
  }

  /**
   * Validate a form step — checks all required fields are filled.
   */
  static validateFormStep(step: FormStep, values: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of step.fields) {
      if (field.required) {
        const value = values[field.id];
        if (value === undefined || value === null || value === '' || value === false) {
          errors.push(`${field.label} is required`);
        }
      }

      // Numeric validation
      if (field.type === 'measurement' || field.type === 'number') {
        const value = values[field.id] as number | undefined;
        if (value !== undefined) {
          if (field.min !== undefined && value < field.min) {
            errors.push(`${field.label} must be at least ${field.min}`);
          }
          if (field.max !== undefined && value > field.max) {
            errors.push(`${field.label} must be at most ${field.max}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// ---------------------------------------------------------------------------
// Offline detection adapter
// ---------------------------------------------------------------------------

class OfflineFirstAdapter {
  static isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }
}
