import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin, type SessionData } from '@/lib/auth';

// ============================================================================
// PLANT SCOPING — Multi-Plant Data Isolation
// ============================================================================

export interface PlantScopeResult {
  plantId: string | null;
  accessLevel: 'read' | 'write' | 'admin' | 'none' | null;
  isScoped: boolean;
  /** When true, the caller should return 403 Forbidden. */
  denyAccess?: boolean;
}

/**
 * Resolve plant scope from the request headers and user session.
 *
 * Behavior:
 * - Admin / plant_manager system roles bypass scoping entirely (see all plants)
 * - If no `X-Plant-ID` header:
 *     Returns `isScoped: false` — cross-plant view showing all accessible data.
 * - If `X-Plant-ID` header is set:
 *     Validates the user has access to that plant via `UserPlant` table.
 *     - Has access  → `{ isScoped: true, plantId, accessLevel }`
 *     - No access   → `{ isScoped: true, plantId: null, accessLevel: 'none', denyAccess: true }`
 *       (fail-closed: caller should return 403 or the Prisma filter will match nothing)
 *
 * @param request — NextRequest (reads X-Plant-ID header)
 * @param session — Validated session from getSession()
 */
export async function getPlantScope(
  request: NextRequest,
  session: SessionData
): Promise<PlantScopeResult> {
  // Admin and plant_manager roles bypass plant scoping — they see all plants
  if (isAdmin(session) || session.roles.includes('plant_manager')) {
    return { plantId: null, accessLevel: null, isScoped: false };
  }

  const plantIdHeader = request.headers.get('X-Plant-ID');

  if (!plantIdHeader) {
    // No plant selected — cross-plant view, show all accessible data
    return { plantId: null, accessLevel: null, isScoped: false };
  }

  // Validate user has access to the requested plant
  const userPlant = await db.userPlant.findUnique({
    where: {
      userId_plantId: { userId: session.userId, plantId: plantIdHeader },
    },
  });

  if (!userPlant) {
    // FAIL-CLOSED: User explicitly requested a plant they don't have access to.
    // Deny access instead of silently falling back to an unscoped (all-data) view.
    return {
      plantId: null,
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    };
  }

  return {
    plantId: userPlant.plantId,
    accessLevel: userPlant.accessLevel as 'read' | 'write' | 'admin',
    isScoped: true,
  };
}

// Sentinel value that will never match any real plant ID in the database.
// Used to produce an empty result set when access is denied.
const DENY_ACCESS_SENTINEL = '__ACCESS_DENIED__';

/**
 * Returns a Prisma-compatible where clause fragment for plant filtering.
 *
 * - When `denyAccess` is true, returns a never-matching filter (effectively `WHERE plantId = '<sentinel>'`).
 * - When plant scoping is active (`isScoped && plantId`), returns `{ plantId: "..." }`.
 * - When not scoped, returns an empty object `{}` (no filter applied).
 *
 * Usage:
 * ```ts
 * const plantScope = await getPlantScope(request, session);
 * if (plantScope.denyAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 * const where = { ...otherFilters, ...getPlantFilterWhere(plantScope) };
 * ```
 *
 * @param plantScope — Result from getPlantScope()
 * @param plantIdField — The model field name (default: 'plantId')
 */
export function getPlantFilterWhere(
  plantScope: PlantScopeResult,
  plantIdField: string = 'plantId'
): Record<string, unknown> {
  // Fail-closed: if access is denied, produce a filter that matches nothing
  if (plantScope.denyAccess) {
    return { [plantIdField]: DENY_ACCESS_SENTINEL };
  }

  if (!plantScope.isScoped || !plantScope.plantId) {
    return {};
  }
  return { [plantIdField]: plantScope.plantId };
}

/**
 * Merge plant filter into an existing where clause object.
 * Returns a new object with the plant filter applied.
 * When scoping is inactive, returns the original where clause unchanged.
 *
 * **Security note**: If `plantScope.denyAccess` is true the merged where clause
 * will never match any rows, effectively returning an empty result set.
 * Callers that want a proper 403 response should check `plantScope.denyAccess` first.
 *
 * Usage:
 * ```ts
 * const where = { status: 'active' };
 * const scopedWhere = applyPlantScope(where, plantScope);
 * ```
 *
 * @param where — Existing Prisma where clause
 * @param plantScope — Result from getPlantScope()
 * @param plantIdField — The model field name (default: 'plantId')
 */
export function applyPlantScope<T extends Record<string, unknown>>(
  where: T,
  plantScope: PlantScopeResult,
  plantIdField: string = 'plantId'
): T {
  const plantFilter = getPlantFilterWhere(plantScope, plantIdField);
  if (Object.keys(plantFilter).length === 0) {
    return where;
  }
  return { ...where, ...plantFilter } as T;
}
