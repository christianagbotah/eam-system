import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin, type SessionData } from '@/lib/auth';

// ============================================================================
// PLANT SCOPING — Multi-Plant Data Isolation
// ============================================================================

export interface PlantScopeResult {
  plantId: string | null;
  accessLevel: 'read' | 'write' | 'admin' | null;
  isScoped: boolean;
}

/**
 * Resolve plant scope from the request headers and user session.
 *
 * Behavior:
 * - Admin / plant_manager system roles bypass scoping entirely (see all plants)
 * - If `X-Plant-ID` header is set:
 *     Validates the user has access to that plant via `UserPlant` table.
 *     Returns scoped result with plantId + accessLevel.
 * - If no header:
 *     Returns `isScoped: false` — cross-plant view showing all accessible data.
 * - If user doesn't have access to the requested plant:
 *     Returns `isScoped: false` (graceful fallback, no error).
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
    // User doesn't have access to this plant — graceful fallback (unscoped)
    return { plantId: null, accessLevel: null, isScoped: false };
  }

  return {
    plantId: userPlant.plantId,
    accessLevel: userPlant.accessLevel as 'read' | 'write' | 'admin',
    isScoped: true,
  };
}

/**
 * Returns a Prisma-compatible where clause fragment for plant filtering.
 *
 * - When plant scoping is active (isScoped && plantId), returns `{ plantId: "..." }`.
 * - When not scoped, returns an empty object `{}` (no filter applied).
 *
 * Usage:
 * ```ts
 * const plantScope = await getPlantScope(request, session);
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
