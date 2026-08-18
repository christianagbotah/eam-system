/**
 * API Client for server-state assertions in E2E tests.
 *
 * All mutations go through this client so that tests can assert on
 * the server response AND independently verify state via GET.
 */

const BASE = 'http://localhost:3000';

// ── UAT credentials ──────────────────────────────────────────────────────

const USERS: Record<string, string> = {
  requester: 'uat_requester',
  supervisor: 'uat_supervisor',
  planner: 'uat_planner',
  tech_single: 'uat_tech_single',
  tech_leader: 'uat_tech_leader',
  tech_assistant: 'uat_tech_assistant',
  storekeeper: 'uat_storekeeper',
  plant_a_user: 'uat_plant_a_user',
  plant_b_user: 'uat_plant_b_user',
  supervisor_plant_a: 'uat_supervisor_plant_a',
  planner_plant_a: 'uat_planner_plant_a',
  supervisor_plant_b: 'uat_supervisor_plant_b',
  planner_plant_b: 'uat_planner_plant_b',
};

// ── Low-level helpers ────────────────────────────────────────────────────

/** Get auth token for a UAT user */
export async function getToken(userKey: string): Promise<string> {
  const username = USERS[userKey];
  if (!username) throw new Error(`Unknown UAT user key: ${userKey}`);

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'TestPass123!' }),
  });
  if (!res.ok) throw new Error(`Auth failed for ${userKey}: ${res.status}`);
  const json = await res.json();
  if (!json.data?.token) throw new Error(`No token for ${userKey}`);
  return json.data.token as string;
}

/** Make authenticated API call */
export async function apiCall(
  token: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, data: json };
}

// ── ID lookups ───────────────────────────────────────────────────────────

const userCache: Record<string, string> = {};

/** Look up a user's DB ID by their username */
export async function lookupUserId(token: string, username: string): Promise<string> {
  if (userCache[username]) return userCache[username];
  const { status, data } = await apiCall(token, 'GET', `/api/users?search=${username}`);
  if (status !== 200 || !data.success) {
    throw new Error(`Failed to look up user ${username}: ${status} ${JSON.stringify(data)}`);
  }
  const users = data.data as Array<{ id: string; username: string }>;
  const found = users.find((u) => u.username === username);
  if (!found) throw new Error(`User ${username} not found in API response`);
  userCache[username] = found.id;
  return found.id;
}

/** Look up a user's DB ID by their UAT user key (e.g. 'tech_single' → uat_tech_single → id) */
export async function lookupUserByKey(token: string, userKey: string): Promise<string> {
  return lookupUserId(token, USERS[userKey]);
}

const assetCache: Record<string, string> = {};

/** Look up an asset's DB ID by its tag */
export async function lookupAssetId(token: string, assetTag: string): Promise<string> {
  if (assetCache[assetTag]) return assetCache[assetTag];
  const { status, data } = await apiCall(token, 'GET', `/api/assets?search=${assetTag}`);
  if (status !== 200 || !data.success) {
    throw new Error(`Failed to look up asset ${assetTag}: ${status} ${JSON.stringify(data)}`);
  }
  const assets = data.data as Array<{ id: string; assetTag: string }>;
  const found = assets.find((a) => a.assetTag === assetTag);
  if (!found) throw new Error(`Asset ${assetTag} not found`);
  assetCache[assetTag] = found.id;
  return found.id;
}

const plantCache: Record<string, string> = {};

/** Look up a plant's DB ID by its code */
export async function lookupPlantId(token: string, code: string): Promise<string> {
  if (plantCache[code]) return plantCache[code];
  const { status, data } = await apiCall(token, 'GET', `/api/plants`);
  if (status !== 200 || !data.success) {
    throw new Error(`Failed to look up plants: ${status}`);
  }
  const plants = data.data as Array<{ id: string; code: string }>;
  const found = plants.find((p) => p.code === code);
  if (!found) throw new Error(`Plant ${code} not found`);
  plantCache[code] = found.id;
  return found.id;
}

const toolCache: Record<string, string> = {};

/** Look up a tool's DB ID by its name */
export async function lookupToolId(token: string, toolName: string): Promise<string> {
  if (toolCache[toolName]) return toolCache[toolName];
  const { status, data } = await apiCall(token, 'GET', `/api/tools?search=${encodeURIComponent(toolName)}`);
  if (status !== 200 || !data.success) {
    throw new Error(`Failed to look up tool ${toolName}: ${status} ${JSON.stringify(data)}`);
  }
  const tools = data.data as Array<{ id: string; name: string }>;
  const found = tools.find((t) => t.name === toolName);
  if (!found) throw new Error(`Tool ${toolName} not found`);
  toolCache[toolName] = found.id;
  return found.id;
}

const inventoryCache: Record<string, string> = {};

/** Look up an inventory item's DB ID by its itemCode or name */
export async function lookupInventoryItemId(token: string, itemCodeOrName: string): Promise<string> {
  if (inventoryCache[itemCodeOrName]) return inventoryCache[itemCodeOrName];
  const { status, data } = await apiCall(token, 'GET', `/api/inventory?search=${encodeURIComponent(itemCodeOrName)}`);
  if (status !== 200 || !data.success) {
    throw new Error(`Failed to look up inventory item ${itemCodeOrName}: ${status} ${JSON.stringify(data)}`);
  }
  const items = data.data as Array<{ id: string; itemCode: string; name: string; currentStock: number }>;
  const found = items.find((i) => i.itemCode === itemCodeOrName) || items.find((i) => i.name === itemCodeOrName);
  if (!found) throw new Error(`Inventory item ${itemCodeOrName} not found`);
  inventoryCache[itemCodeOrName] = found.id;
  return found.id;
}

/** Get inventory item details (currentStock, name, etc.) */
export async function getInventoryItem(token: string, itemCodeOrName: string) {
  const { status, data } = await apiCall(token, 'GET', `/api/inventory?search=${encodeURIComponent(itemCodeOrName)}`);
  if (status !== 200 || !data.success) {
    throw new Error(`Failed to look up inventory item ${itemCodeOrName}: ${status} ${JSON.stringify(data)}`);
  }
  const items = data.data as Array<{ id: string; itemCode: string; name: string; currentStock: number }>;
  const found = items.find((i) => i.itemCode === itemCodeOrName) || items.find((i) => i.name === itemCodeOrName);
  if (!found) throw new Error(`Inventory item ${itemCodeOrName} not found`);
  return found;
}

// ── MR operations ────────────────────────────────────────────────────────

/** Create MR via API and return the created MR */
export async function createMR(
  token: string,
  data: {
    title: string;
    description: string;
    assetId: string;
    priority: string;
    plantId: string;
  },
) {
  const { status, data: resp } = await apiCall(token, 'POST', '/api/maintenance-requests', data);
  if (status < 200 || status >= 300) {
    throw new Error(`MR creation failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Approve MR */
export async function approveMR(token: string, mrId: string) {
  const { status, data: resp } = await apiCall(token, 'POST', `/api/maintenance-requests/${mrId}/approve`, {});
  if (status < 200 || status >= 300) {
    throw new Error(`MR approval failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Convert MR to WO — returns the created WO */
export async function convertMR(
  token: string,
  mrId: string,
  payload?: {
    assignedTo?: string;
    teamLeaderId?: string;
    teamMembers?: Array<{ userId: string; role: string }>;
    assignmentType?: 'direct' | 'via_supervisor';
    assignedSupervisorId?: string;
    tradeActivity?: string;
    workOrderType?: string;
    priority?: string;
  },
) {
  const { status, data: resp } = await apiCall(
    token,
    'POST',
    `/api/maintenance-requests/${mrId}/convert`,
    payload || {},
  );
  if (status < 200 || status >= 300) {
    throw new Error(`MR conversion failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Get MR details */
export async function getMR(token: string, mrId: string) {
  const { status, data: resp } = await apiCall(token, 'GET', `/api/maintenance-requests/${mrId}`);
  if (status !== 200) {
    throw new Error(`MR fetch failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

// ── WO operations ────────────────────────────────────────────────────────

/** Assign WO to technician(s) */
export async function assignWO(
  token: string,
  woId: string,
  body: {
    assignedTo?: string;
    teamLeaderId?: string;
    teamMembers?: Array<{ userId: string; role?: string }>;
    assignedSupervisorId?: string;
    assignmentType?: 'direct' | 'via_supervisor';
  },
) {
  const { status, data: resp } = await apiCall(token, 'POST', `/api/work-orders/${woId}/assign`, body);
  if (status < 200 || status >= 300) {
    throw new Error(`WO assignment failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Start WO */
export async function startWO(token: string, woId: string) {
  const { status, data: resp } = await apiCall(token, 'POST', `/api/work-orders/${woId}/start`, {});
  if (status < 200 || status >= 300) {
    throw new Error(`WO start failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Log time on WO */
export async function logTime(
  token: string,
  woId: string,
  body: {
    action: string;
    manualHours?: number;
    notes?: string;
  },
) {
  const { status, data: resp } = await apiCall(token, 'POST', `/api/work-orders/${woId}/time-logs`, body);
  if (status < 200 || status >= 300) {
    throw new Error(`Time log creation failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Complete WO */
export async function completeWO(token: string, woId: string, notes?: string) {
  const { status, data: resp } = await apiCall(token, 'POST', `/api/work-orders/${woId}/complete`, { notes });
  if (status < 200 || status >= 300) {
    throw new Error(`WO completion failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Verify WO (supervisor) */
export async function verifyWO(token: string, woId: string, qualityRating?: number) {
  const { status, data: resp } = await apiCall(token, 'POST', `/api/work-orders/${woId}/verify`, { qualityRating });
  if (status < 200 || status >= 300) {
    throw new Error(`WO verification failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Request rework (supervisor) — sends action='rework' to the verify endpoint */
export async function requestRework(token: string, woId: string, reason?: string) {
  const { status, data: resp } = await apiCall(token, 'POST', `/api/work-orders/${woId}/verify`, {
    action: 'rework',
    reason,
  });
  if (status < 200 || status >= 300) {
    throw new Error(`Rework request failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Close WO (planner) */
export async function closeWO(token: string, woId: string) {
  const { status, data: resp } = await apiCall(token, 'POST', `/api/work-orders/${woId}/close`, {});
  if (status < 200 || status >= 300) {
    throw new Error(`WO closure failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Get WO details */
export async function getWO(token: string, woId: string) {
  const { status, data: resp } = await apiCall(token, 'GET', `/api/work-orders/${woId}`);
  if (status !== 200) {
    throw new Error(`WO fetch failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Get WO capabilities */
export async function getCapabilities(token: string, woId: string) {
  const { status, data: resp } = await apiCall(token, 'GET', `/api/work-orders/${woId}/capabilities`);
  if (status !== 200) {
    throw new Error(`Capabilities fetch failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

// ── Team member requests (assistance) ────────────────────────────────────

/** Request assistance — create a team member request */
export async function requestAssistance(
  token: string,
  woId: string,
  body: {
    requestedUserId?: string;
    requestedTrade?: string;
    reason?: string;
    role?: string;
  },
) {
  const { status, data: resp } = await apiCall(
    token,
    'POST',
    `/api/work-orders/${woId}/team-member-requests`,
    body,
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Assistance request failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Approve a team member request */
export async function approveAssistanceRequest(
  token: string,
  woId: string,
  reqId: string,
  assignUserId?: string,
) {
  const { status, data: resp } = await apiCall(
    token,
    'PUT',
    `/api/work-orders/${woId}/team-member-requests/${reqId}`,
    { action: 'approve', assignUserId },
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Assistance approval failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Get team member requests for a WO */
export async function getTeamMemberRequests(token: string, woId: string) {
  const { status, data: resp } = await apiCall(
    token,
    'GET',
    `/api/work-orders/${woId}/team-member-requests`,
  );
  if (status !== 200) {
    throw new Error(`Team member requests fetch failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Attempt an action that is expected to fail — returns the response */
export async function expectFailure(
  token: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, data: json };
}

/** Initiate shift handover */
export async function initiateHandoverWO(token: string, woId: string, reason?: string) {
  const { status, data } = await apiCall(token, 'POST', `/api/work-orders/${woId}/handover`, { reason });
  if (status < 200 || status >= 300) throw new Error(`Handover failed: ${status} ${JSON.stringify(data)}`);
  return data.data || data;
}

/** Resume after handover */
export async function resumeAfterHandoverWO(token: string, woId: string, reason?: string) {
  const { status, data } = await apiCall(token, 'POST', `/api/work-orders/${woId}/handover`, { action: 'resume', reason });
  if (status < 200 || status >= 300) throw new Error(`Resume after handover failed: ${status} ${JSON.stringify(data)}`);
  return data.data || data;
}

/** Request rework */
export async function requestReworkWO(token: string, woId: string, reason: string, category?: string) {
  const { status, data } = await apiCall(token, 'POST', `/api/work-orders/${woId}/rework`, { reason, category });
  if (status < 200 || status >= 300) throw new Error(`Rework failed: ${status} ${JSON.stringify(data)}`);
  return data.data || data;
}

// ── Material request operations ──────────────────────────────────────────

/** Create a material request for a work order */
export async function createMaterialRequest(
  token: string,
  body: {
    workOrderId: string;
    itemName: string;
    quantityRequested: number;
    unit?: string;
    urgency?: string;
    reason: string;
    itemId?: string;
  },
) {
  const { status, data: resp } = await apiCall(
    token, 'POST', '/api/repairs/material-requests', body,
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Material request creation failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Supervisor-approve a material request */
export async function supervisorApproveMaterial(token: string, materialRequestId: string, approvedQuantity?: number) {
  const { status, data: resp } = await apiCall(
    token, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
      action: 'supervisor_approve',
      ...(approvedQuantity !== undefined ? { approvedQuantity } : {}),
    },
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Material supervisor approval failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Storekeeper-approve a material request */
export async function storekeeperApproveMaterial(token: string, materialRequestId: string, approvedQuantity?: number) {
  const { status, data: resp } = await apiCall(
    token, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
      action: 'storekeeper_approve',
      ...(approvedQuantity !== undefined ? { approvedQuantity } : {}),
    },
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Material storekeeper approval failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Issue a material request */
export async function issueMaterial(token: string, materialRequestId: string, quantityIssued?: number) {
  const { status, data: resp } = await apiCall(
    token, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
      action: 'issue',
      ...(quantityIssued !== undefined ? { approvedQuantity: quantityIssued } : {}),
    },
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Material issuance failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Consume material on a material request */
export async function consumeMaterial(token: string, materialRequestId: string, quantity: number, notes?: string) {
  const { status, data: resp } = await apiCall(
    token, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
      action: 'consume_material',
      quantityConsumed: quantity,
      notes,
    },
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Material consumption failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Record wasted material on a material request */
export async function wasteMaterial(token: string, materialRequestId: string, quantity: number, notes?: string) {
  const { status, data: resp } = await apiCall(
    token, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
      action: 'waste_material',
      quantityWasted: quantity,
      notes,
    },
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Material waste recording failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Return material on a material request */
export async function returnMaterial(token: string, materialRequestId: string, quantity: number, notes?: string) {
  const { status, data: resp } = await apiCall(
    token, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
      action: 'record_return',
      quantityReturned: quantity,
      notes,
    },
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Material return failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Reconcile a material request — validates consumed + wasted + returned == issued */
export async function reconcileMaterial(token: string, materialRequestId: string) {
  const { status, data: resp } = await apiCall(
    token, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
      action: 'reconcile',
    },
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Material reconciliation failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

/** Get material request details */
export async function getMaterialRequest(token: string, materialRequestId: string) {
  const { status, data: resp } = await apiCall(
    token, 'GET', `/api/repairs/material-requests/${materialRequestId}`,
  );
  if (status !== 200) {
    throw new Error(`Material request fetch failed: ${status} ${JSON.stringify(resp)}`);
  }
  return resp.data;
}

// ── Plant-scoped helpers (for cross-plant security testing) ──────────────

/** Make authenticated API call with explicit X-Plant-ID header */
export async function apiCallWithPlant(
  token: string,
  method: string,
  path: string,
  plantId: string,
  body?: unknown,
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Plant-ID': plantId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, data: json };
}

/** Attempt an action with a forged X-Plant-ID header (expected to fail) */
export async function expectFailureWithPlant(
  token: string,
  method: string,
  path: string,
  plantId: string,
  body?: unknown,
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Plant-ID': plantId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, data: json };
}
