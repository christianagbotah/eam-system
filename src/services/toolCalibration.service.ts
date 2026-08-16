/**
 * Tool Calibration Service
 *
 * Manages tool calibration status checks, emergency overrides,
 * and calibration enforcement for tool issue operations.
 */

import { db } from '@/lib/db'
import { isAdmin, hasRole } from '@/lib/auth'

type SessionLike = { userId: string; roles: string[] }

export interface CalibrationCheckResult {
  blocked: boolean
  reason?: string
  status: string
  overrideAvailable: boolean
}

/**
 * Check if a tool is blocked due to calibration status.
 *
 * Rules:
 * - No calibration requirement → not blocked
 * - Calibrated and nextDue > now → not blocked
 * - Overdue/failed/expired AND no emergency override → BLOCKED
 * - Emergency override exists and is valid → not blocked (warning)
 */
export async function checkToolCalibration(
  toolId: string,
): Promise<CalibrationCheckResult> {
  const req = await db.toolCalibrationRequirement.findUnique({
    where: { toolId },
  })

  // No calibration requirement configured → not blocked
  if (!req || !req.calibrationRequired) {
    return {
      blocked: false,
      status: 'not_required',
      overrideAvailable: false,
    }
  }

  // If calibrated and not overdue → not blocked
  if (
    req.calibrationStatus === 'calibrated' &&
    req.nextCalibrationDue &&
    new Date(req.nextCalibrationDue) > new Date()
  ) {
    return {
      blocked: false,
      status: 'calibrated',
      overrideAvailable: false,
    }
  }

  // Check for valid emergency override
  if (req.emergencyOverride && req.emergencyOverrideAt) {
    return {
      blocked: false,
      reason: `Tool calibration ${req.calibrationStatus} — emergency override in effect: "${req.emergencyOverrideReason || 'No reason provided'}"`,
      status: req.calibrationStatus,
      overrideAvailable: false,
    }
  }

  // Blocked: overdue / failed / expired without override
  const statusDescriptions: Record<string, string> = {
    overdue: 'calibration is overdue',
    failed: 'last calibration failed',
    expired: 'calibration has expired',
    due_soon: 'calibration is due soon',
  }

  const description = statusDescriptions[req.calibrationStatus] || `calibration status is "${req.calibrationStatus}"`

  return {
    blocked: true,
    reason: `Tool blocked — ${description}. Request an emergency override if this tool must be issued.`,
    status: req.calibrationStatus,
    overrideAvailable: true,
  }
}

/**
 * Request an emergency override for a tool with failed/expired calibration.
 * Requires admin or supervisor role.
 */
export async function requestEmergencyOverride(
  toolId: string,
  userId: string,
  reason: string,
  session?: SessionLike,
): Promise<void> {
  // Role check if session is provided
  if (session && !isAdmin(session as any) && !hasRole(session as any, 'maintenance_supervisor')) {
    throw new Error('Emergency override requires admin or supervisor role')
  }

  const req = await db.toolCalibrationRequirement.findUnique({
    where: { toolId },
  })

  if (!req || !req.calibrationRequired) {
    throw new Error('No calibration requirement exists for this tool')
  }

  if (req.calibrationStatus === 'calibrated' && req.nextCalibrationDue && new Date(req.nextCalibrationDue) > new Date()) {
    throw new Error('Tool calibration is current — override not needed')
  }

  await db.toolCalibrationRequirement.update({
    where: { toolId },
    data: {
      emergencyOverride: true,
      emergencyOverrideReason: reason,
      emergencyOverrideById: userId,
      emergencyOverrideAt: new Date(),
    },
  })
}

/**
 * Revoke an emergency override for a tool.
 */
export async function revokeEmergencyOverride(
  toolId: string,
  userId: string,
): Promise<void> {
  const req = await db.toolCalibrationRequirement.findUnique({
    where: { toolId },
  })

  if (!req) {
    throw new Error('No calibration requirement exists for this tool')
  }

  if (!req.emergencyOverride) {
    throw new Error('No emergency override is currently active')
  }

  await db.toolCalibrationRequirement.update({
    where: { toolId },
    data: {
      emergencyOverride: false,
      emergencyOverrideReason: null,
      emergencyOverrideById: null,
      emergencyOverrideAt: null,
    },
  })
}
