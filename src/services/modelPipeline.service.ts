import { db } from '@/lib/db';

// ============================================================================
// MODEL PIPELINE SERVICE — 3D Model Management & Processing Pipeline
// ============================================================================

export interface ListModelsParams {
  page?: number;
  limit?: number;
  search?: string;
  plantId?: string;
  format?: string;
  status?: string;
  assetId?: string;
}

export interface CreateModelParams {
  name: string;
  plantId?: string;
  assetId?: string;
  format?: string;
  fileSize?: number;
  fileKey?: string;
  version?: string;
  metadata?: Record<string, unknown>;
  uploadedById: string;
}

export const modelPipelineService = {
  async listModels(params: ListModelsParams) {
    const { page = 1, limit = 20, search, plantId, format, status, assetId } = params;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { format: { contains: search } },
      ];
    }
    if (plantId) where.plantId = plantId;
    if (assetId) where.assetId = assetId;
    if (format) where.format = format;
    if (status) where.status = status;

    const [models, total] = await Promise.all([
      db.threeDModel.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          uploadedBy: { select: { id: true, fullName: true, username: true } },
          asset: { select: { id: true, name: true, assetTag: true } },
          jobs: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      }),
      db.threeDModel.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return {
      data: models,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getModelById(id: string) {
    const model = await db.threeDModel.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, fullName: true, username: true } },
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        jobs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!model) {
      throw new Error(`3D model not found`);
    }

    return model;
  },

  async createModelRecord(params: CreateModelParams) {
    const { name, plantId, assetId, format, fileSize, fileKey, version, metadata, uploadedById } = params;

    if (!name) {
      throw new Error('Invalid: Model name is required');
    }

    return db.threeDModel.create({
      data: {
        name,
        plantId,
        assetId,
        format: format || 'glb',
        fileSize: fileSize || 0,
        fileKey: fileKey || '',
        version: version || '1.0',
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        status: 'pending',
        uploadedById,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true, username: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
      },
    });
  },

  async updateModelStatus(id: string, status: string, updates: Record<string, unknown> = {}) {
    const model = await db.threeDModel.findUnique({ where: { id } });
    if (!model) {
      throw new Error(`3D model not found`);
    }

    return db.threeDModel.update({
      where: { id },
      data: {
        status,
        ...updates,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true, username: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
      },
    });
  },

  async deleteModel(id: string) {
    const model = await db.threeDModel.findUnique({ where: { id } });
    if (!model) {
      throw new Error(`3D model not found`);
    }

    await db.threeDModel.delete({ where: { id } });
  },

  async getModelJobs(id: string) {
    const model = await db.threeDModel.findUnique({ where: { id } });
    if (!model) {
      throw new Error(`3D model not found`);
    }

    return db.modelProcessingJob.findMany({
      where: { modelId: id },
      orderBy: { createdAt: 'desc' },
    });
  },
};
