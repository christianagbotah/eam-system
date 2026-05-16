import { db } from '@/lib/db';

// ============================================================================
// COMPONENT MAPPING SERVICE — Mesh-to-Component Mapping Management
// ============================================================================

export interface ListMappingsParams {
  modelId: string;
  mappingType?: string;
  page?: number;
  limit?: number;
}

export interface CreateMappingParams {
  modelId: string;
  meshId: string;
  componentId?: string;
  mappingType?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  createdById: string;
}

export const componentMappingService = {
  async listMappings(params: ListMappingsParams) {
    const { modelId, mappingType, page = 1, limit = 50 } = params;

    const where: Record<string, unknown> = { modelId };
    if (mappingType) where.mappingType = mappingType;

    const [mappings, total] = await Promise.all([
      db.meshComponentMapping.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, fullName: true, username: true } },
          component: { select: { id: true, name: true, componentTag: true } },
        },
      }),
      db.meshComponentMapping.count({ where }),
    ]);

    return {
      data: mappings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async createMapping(params: CreateMappingParams) {
    const { modelId, meshId, componentId, mappingType, confidence, metadata, createdById } = params;

    if (!modelId || !meshId) {
      throw new Error('Invalid: modelId and meshId are required');
    }

    // Check for existing mapping conflict
    const existing = await db.meshComponentMapping.findFirst({
      where: { modelId, meshId },
    });
    if (existing) {
      throw new Error('Conflict: Mapping already exists for this mesh');
    }

    return db.meshComponentMapping.create({
      data: {
        modelId,
        meshId,
        componentId,
        mappingType: mappingType || 'manual',
        confidence: confidence ?? 1.0,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        createdById,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
        component: { select: { id: true, name: true, componentTag: true } },
      },
    });
  },

  async bulkCreateMappings(mappings: CreateMappingParams[], userId: string) {
    const results = await Promise.allSettled(
      mappings.map((m) => this.createMapping({ ...m, createdById: userId })),
    );

    const created = results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<any>).value);
    const errors = results
      .filter((r) => r.status === 'rejected')
      .map((r, i) => ({ index: i, error: (r as PromiseRejectedResult).reason?.message }));

    return {
      created,
      errors,
      totalRequested: mappings.length,
      successCount: created.length,
      errorCount: errors.length,
    };
  },

  async updateMapping(id: string, updates: Record<string, unknown>) {
    const mapping = await db.meshComponentMapping.findUnique({ where: { id } });
    if (!mapping) {
      throw new Error(`Mapping not found`);
    }

    const data: Record<string, unknown> = {};
    if (updates.componentId !== undefined) data.componentId = updates.componentId;
    if (updates.mappingType !== undefined) data.mappingType = updates.mappingType;
    if (updates.confidence !== undefined) data.confidence = updates.confidence;
    if (updates.metadata !== undefined) data.metadata = JSON.stringify(updates.metadata);

    return db.meshComponentMapping.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
        component: { select: { id: true, name: true, componentTag: true } },
      },
    });
  },

  async deleteMapping(id: string) {
    const mapping = await db.meshComponentMapping.findUnique({ where: { id } });
    if (!mapping) {
      throw new Error(`Mapping not found`);
    }

    await db.meshComponentMapping.delete({ where: { id } });
  },
};
