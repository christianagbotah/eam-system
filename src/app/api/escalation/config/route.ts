import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

// ============================================================================
// Escalation Configuration — GET/PUT
// Stores config in system_configs DB table under key "escalation"
// ============================================================================

interface EscalationConfig {
  enabled: boolean;
  maintenanceRequests: {
    enabled: boolean;
    level1ThresholdHours: number;
    level2ThresholdHours: number;
    cooldownMinutes: number;
  };
  workOrders: {
    enabled: boolean;
    level1ThresholdHours: number;
    level2ThresholdHours: number;
    cooldownMinutes: number;
  };
  safetyIncidents: {
    enabled: boolean;
    level1ThresholdHours: number;
    level2ThresholdHours: number;
    cooldownMinutes: number;
  };
  lastCheckAt: string | null;
  lastCheckResults: Record<string, unknown> | null;
}

const DEFAULT_CONFIG: EscalationConfig = {
  enabled: true,
  maintenanceRequests: {
    enabled: true,
    level1ThresholdHours: 24,
    level2ThresholdHours: 48,
    cooldownMinutes: 360,
  },
  workOrders: {
    enabled: true,
    level1ThresholdHours: 0,
    level2ThresholdHours: 48,
    cooldownMinutes: 360,
  },
  safetyIncidents: {
    enabled: true,
    level1ThresholdHours: 4,
    level2ThresholdHours: 8,
    cooldownMinutes: 240,
  },
  lastCheckAt: null,
  lastCheckResults: null,
};

async function readConfig(): Promise<EscalationConfig> {
  try {
    const row = await db.systemConfig.findUnique({ where: { key: 'escalation' } });
    if (row?.config) {
      const parsed = JSON.parse(row.config);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Fall through to default
  }
  return { ...DEFAULT_CONFIG };
}

async function writeConfig(config: EscalationConfig): Promise<void> {
  const configJson = JSON.stringify(config);
  await db.systemConfig.upsert({
    where: { key: 'escalation' },
    update: { config: configJson },
    create: { key: 'escalation', config: configJson },
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const config = await readConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read escalation config';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const current = await readConfig();

    // Build updated config — only allow updating specific safe fields
    const updated: EscalationConfig = {
      ...current,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
      maintenanceRequests: {
        ...current.maintenanceRequests,
        enabled: typeof body.maintenanceRequests?.enabled === 'boolean'
          ? body.maintenanceRequests.enabled
          : current.maintenanceRequests.enabled,
        level1ThresholdHours: typeof body.maintenanceRequests?.level1ThresholdHours === 'number'
          ? Math.max(1, Math.min(720, body.maintenanceRequests.level1ThresholdHours))
          : current.maintenanceRequests.level1ThresholdHours,
        level2ThresholdHours: typeof body.maintenanceRequests?.level2ThresholdHours === 'number'
          ? Math.max(1, Math.min(720, body.maintenanceRequests.level2ThresholdHours))
          : current.maintenanceRequests.level2ThresholdHours,
        cooldownMinutes: typeof body.maintenanceRequests?.cooldownMinutes === 'number'
          ? Math.max(30, Math.min(1440, body.maintenanceRequests.cooldownMinutes))
          : current.maintenanceRequests.cooldownMinutes,
      },
      workOrders: {
        ...current.workOrders,
        enabled: typeof body.workOrders?.enabled === 'boolean'
          ? body.workOrders.enabled
          : current.workOrders.enabled,
        level1ThresholdHours: typeof body.workOrders?.level1ThresholdHours === 'number'
          ? Math.max(0, Math.min(720, body.workOrders.level1ThresholdHours))
          : current.workOrders.level1ThresholdHours,
        level2ThresholdHours: typeof body.workOrders?.level2ThresholdHours === 'number'
          ? Math.max(1, Math.min(720, body.workOrders.level2ThresholdHours))
          : current.workOrders.level2ThresholdHours,
        cooldownMinutes: typeof body.workOrders?.cooldownMinutes === 'number'
          ? Math.max(30, Math.min(1440, body.workOrders.cooldownMinutes))
          : current.workOrders.cooldownMinutes,
      },
      safetyIncidents: {
        ...current.safetyIncidents,
        enabled: typeof body.safetyIncidents?.enabled === 'boolean'
          ? body.safetyIncidents.enabled
          : current.safetyIncidents.enabled,
        level1ThresholdHours: typeof body.safetyIncidents?.level1ThresholdHours === 'number'
          ? Math.max(1, Math.min(720, body.safetyIncidents.level1ThresholdHours))
          : current.safetyIncidents.level1ThresholdHours,
        level2ThresholdHours: typeof body.safetyIncidents?.level2ThresholdHours === 'number'
          ? Math.max(1, Math.min(720, body.safetyIncidents.level2ThresholdHours))
          : current.safetyIncidents.level2ThresholdHours,
        cooldownMinutes: typeof body.safetyIncidents?.cooldownMinutes === 'number'
          ? Math.max(30, Math.min(1440, body.safetyIncidents.cooldownMinutes))
          : current.safetyIncidents.cooldownMinutes,
      },
      // Preserve lastCheck fields
      lastCheckAt: current.lastCheckAt,
      lastCheckResults: current.lastCheckResults,
    };

    await writeConfig(updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update escalation config';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
