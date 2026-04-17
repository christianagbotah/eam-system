import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const DEFAULT_PREFERENCES = {
  channels: {
    inApp: true,
    email: true,
    emailAddr: '',
    sms: false,
    phone: '',
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezone: 'UTC',
  },
  types: {
    woAssigned: true,
    woStatusChange: true,
    mrApprovedRejected: true,
    pmDue: true,
    lowStockAlert: true,
    assetConditionAlert: false,
    systemNotifications: true,
    safetyAlerts: true,
    qualityAlerts: true,
  },
};

export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { notificationPreferences: true },
    });

    const preferences = user?.notificationPreferences
      ? { ...DEFAULT_PREFERENCES, ...(user.notificationPreferences as Record<string, unknown>) }
      : DEFAULT_PREFERENCES;

    // Merge nested defaults deeply
    const merged = {
      channels: { ...DEFAULT_PREFERENCES.channels, ...((preferences.channels as Record<string, unknown>) || {}) },
      quietHours: { ...DEFAULT_PREFERENCES.quietHours, ...((preferences.quietHours as Record<string, unknown>) || {}) },
      types: { ...DEFAULT_PREFERENCES.types, ...((preferences.types as Record<string, unknown>) || {}) },
    };

    return NextResponse.json({ success: true, data: merged });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load notification preferences';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // Validate structure
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ success: false, error: 'Invalid preferences format' }, { status: 400 });
    }

    // Build preferences object, only allowing known fields
    const preferences: Record<string, unknown> = {};

    if (body.channels && typeof body.channels === 'object') {
      preferences.channels = {
        inApp: typeof body.channels.inApp === 'boolean' ? body.channels.inApp : DEFAULT_PREFERENCES.channels.inApp,
        email: typeof body.channels.email === 'boolean' ? body.channels.email : DEFAULT_PREFERENCES.channels.email,
        emailAddr: typeof body.channels.emailAddr === 'string' ? body.channels.emailAddr : '',
        sms: typeof body.channels.sms === 'boolean' ? body.channels.sms : DEFAULT_PREFERENCES.channels.sms,
        phone: typeof body.channels.phone === 'string' ? body.channels.phone : '',
      };
    }

    if (body.quietHours && typeof body.quietHours === 'object') {
      preferences.quietHours = {
        enabled: typeof body.quietHours.enabled === 'boolean' ? body.quietHours.enabled : false,
        start: typeof body.quietHours.start === 'string' ? body.quietHours.start : '22:00',
        end: typeof body.quietHours.end === 'string' ? body.quietHours.end : '07:00',
        timezone: typeof body.quietHours.timezone === 'string' ? body.quietHours.timezone : 'UTC',
      };
    }

    if (body.types && typeof body.types === 'object') {
      const validTypes = { ...DEFAULT_PREFERENCES.types };
      for (const key of Object.keys(validTypes)) {
        if (typeof body.types[key] === 'boolean') {
          (validTypes as Record<string, unknown>)[key] = body.types[key];
        }
      }
      preferences.types = validTypes;
    }

    await db.user.update({
      where: { id: session.userId },
      data: { notificationPreferences: preferences },
    });

    return NextResponse.json({ success: true, data: preferences });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save notification preferences';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
