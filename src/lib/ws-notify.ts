const WS_NOTIFY_PORT = 3005; // Admin HTTP port

/**
 * Send a WebSocket notification to a specific user.
 * This is fire-and-forget — if the WS service is down, it silently fails.
 */
export async function wsNotify(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const baseUrl = process.env.WS_NOTIFY_URL || `http://localhost:${WS_NOTIFY_PORT}`;
    const res = await fetch(`${baseUrl}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, event, data }),
    });
    return res.ok;
  } catch {
    // WS service may not be running — fail silently
    return false;
  }
}

/**
 * Broadcast a WebSocket event to all connected users.
 */
export async function wsBroadcast(
  event: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const baseUrl = process.env.WS_NOTIFY_URL || `http://localhost:${WS_NOTIFY_PORT}`;
    const res = await fetch(`${baseUrl}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send a WebSocket notification to multiple users concurrently.
 */
export async function wsNotifyMultiple(
  userIds: string[],
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  await Promise.allSettled(userIds.map((id) => wsNotify(id, event, data)));
}
