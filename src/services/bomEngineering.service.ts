// ============================================================================
// BOM ENGINEERING SERVICE — Phase B: Engineering BOM & Assembly Intelligence
// ============================================================================

import { BaseRepository } from '@/repositories/BaseRepository';
import { createLogger } from '@/lib/logger';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { db } from '@/lib/db';

const log = createLogger('BomEngineeringService');

// Repositories
const bomRepo = new BaseRepository('billOfMaterial');
const bomRevRepo = new BaseRepository('bomRevision');
const bomItemRepo = new BaseRepository('bomRevisionItem');
const altPartRepo = new BaseRepository('alternatePart');
const ecrRepo = new BaseRepository('engineeringChangeRequest');
const spareAnalysisRepo = new BaseRepository('criticalSpareAnalysis');

export const bomEngineeringService = {
  // ── BOM Revisions ──────────────────────────────────────────────────────

  async createBomRevision(data: {
    bomId: string;
    revision: string;
    description?: string;
    changeReason?: string;
    items: Array<{
      itemNumber: string;
      itemName: string;
      description?: string;
      quantity: number;
      unitOfMeasure?: string;
      assemblySequence?: number;
      relationshipType?: string;
      isCritical?: boolean;
      componentId?: string;
      inventoryItemId?: string;
      parentItemId?: string;
    }>;
    createdById: string;
  }) {
    const timer = log.timer('createBomRevision');
    await bomRepo.findByIdOrFail(data.bomId);

    const rev = await db.$transaction(async (tx: any) => {
      // Deactivate previous revisions
      await tx.bomRevision.updateMany({ where: { bomId: data.bomId }, data: { isActive: false, status: 'superseded' } });

      const revision = await tx.bomRevision.create({
        data: {
          bomId: data.bomId,
          revision: data.revision,
          description: data.description,
          changeReason: data.changeReason,
          status: 'approved',
          isActive: true,
          createdById: data.createdById,
        },
      });

      // Create items
      if (data.items?.length) {
        await tx.bomRevisionItem.createMany({
          data: data.items.map(item => ({
            revisionId: revision.id,
            parentItemId: item.parentItemId || null,
            componentId: item.componentId || null,
            inventoryItemId: item.inventoryItemId || null,
            itemNumber: item.itemNumber,
            itemName: item.itemName,
            description: item.description || null,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure || 'EA',
            assemblySequence: item.assemblySequence ?? null,
            relationshipType: item.relationshipType || 'mechanical',
            isCritical: item.isCritical || false,
          })),
        });
      }

      return revision;
    });

    log.info('BOM revision created', { bomId: data.bomId, revision: data.revision });
    timer.end();
    return rev;
  },

  async listBomRevisions(bomId: string) {
    return db.bomRevision.findMany({
      where: { bomId },
      include: {
        createdBy: { select: { id: true, name: true, fullName: true } },
        approvedBy: { select: { id: true, name: true, fullName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getBomTree(bomId: string) {
    const timer = log.timer('getBomTree');
    const revisions = await db.bomRevision.findMany({
      where: { bomId, isActive: true },
      include: {
        items: {
          include: {
            children: { include: { component: true, inventory: true } },
            component: true,
            inventory: true,
          },
          orderBy: [{ assemblySequence: 'asc' }, { itemNumber: 'asc' }],
        },
        createdBy: { select: { id: true, name: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    timer.end();
    return revisions;
  },

  async deleteBomRevision(id: string) {
    return bomRevRepo.delete(id);
  },

  // ── Alternate Parts ─────────────────────────────────────────────────────

  async listAlternateParts(componentId: string) {
    return db.alternatePart.findMany({
      where: { primaryPartId: componentId, isActive: true },
      include: {
        alternatePart: { include: { asset: true } },
        approvedBy: { select: { id: true, name: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createAlternatePart(data: {
    primaryPartId: string;
    alternatePartId: string;
    interchangeability?: string;
    notes?: string;
    createdById: string;
  }) {
    if (data.primaryPartId === data.alternatePartId) {
      throw new ValidationError({ parts: 'Primary and alternate parts must be different' });
    }
    const existing = await altPartRepo.exists({ primaryPartId: data.primaryPartId, alternatePartId: data.alternatePartId });
    if (existing) throw new ConflictError('AlternatePart', 'parts', 'combination');
    return altPartRepo.create(data as Record<string, unknown>);
  },

  async deleteAlternatePart(id: string) {
    return altPartRepo.delete(id);
  },

  // ── Engineering Change Requests ─────────────────────────────────────────

  async listECRs(params: {
    page: number;
    limit: number;
    status?: string;
    plantId?: string;
    assetId?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.plantId) where.plantId = params.plantId;
    if (params.assetId) where.assetId = params.assetId;
    if (params.search) where.OR = [{ title: { contains: params.search } }, { ecrNumber: { contains: params.search } }];

    return ecrRepo.findManyPaginated({
      where,
      include: {
        requestedBy: { select: { id: true, name: true, fullName: true } },
        reviewedBy: { select: { id: true, name: true, fullName: true } },
        approvedBy: { select: { id: true, name: true, fullName: true } },
        asset: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      page: params.page,
      limit: params.limit,
    });
  },

  async getECR(id: string) {
    return ecrRepo.findByIdOrFail(id, {
      include: {
        requestedBy: { select: { id: true, name: true, fullName: true } },
        reviewedBy: { select: { id: true, name: true, fullName: true } },
        approvedBy: { select: { id: true, name: true, fullName: true } },
        asset: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true } },
        bom: { select: { id: true } },
      },
    });
  },

  async createECR(data: {
    title: string;
    description: string;
    changeType: string;
    reason: string;
    priority?: string;
    impact?: string;
    bomId?: string;
    assetId?: string;
    plantId?: string;
    requestedById: string;
  }) {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await db.engineeringChangeRequest.count({
      where: { ecrNumber: { startsWith: `ECR-${yearMonth}` } },
    });
    const ecrNumber = `ECR-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

    return ecrRepo.create({
      ...data,
      ecrNumber,
      status: 'draft',
      requestedById: data.requestedById,
      createdById: data.requestedById,
    } as Record<string, unknown>);
  },

  async updateECRStatus(id: string, status: string, userId: string) {
    const updateData: Record<string, unknown> = { status };
    if (status === 'reviewing') updateData.reviewedById = userId;
    if (status === 'reviewing') updateData.reviewedAt = new Date();
    if (status === 'approved') {
      updateData.approvedById = userId;
      updateData.approvedAt = new Date();
    }
    if (status === 'implemented') updateData.implementedAt = new Date();
    return ecrRepo.update(id, updateData);
  },

  // ── Critical Spare Analysis ─────────────────────────────────────────────

  async runSpareAnalysis(componentId: string, analyzedById: string) {
    const timer = log.timer('runSpareAnalysis');
    const component = await db.componentRegistry.findUnique({
      where: { id: componentId },
      include: {
        sparePartLinks: { include: { sparePart: true } },
        failureRecords: { orderBy: { detectedAt: 'desc' }, take: 20 },
      },
    });
    if (!component) throw new NotFoundError('Component', componentId);

    // Simplified criticality scoring
    let score = 50;
    const recentFailures = component.failureRecords.filter(
      f => !f.resolvedAt && new Date(f.detectedAt) > new Date(Date.now() - 365 * 86400000)
    );
    score += Math.min(25, recentFailures.length * 5);
    if (component.lifecycleStatus === 'failed') score += 15;
    if (component.lifecycleStatus === 'degraded') score += 10;
    if (!component.sparePartLinks.length) score += 20; // no spares = higher risk

    score = Math.min(100, score);
    const leadTimeRisk = score > 75 ? 'critical' : score > 50 ? 'high' : score > 25 ? 'medium' : 'low';
    const stockoutRisk = component.sparePartLinks.length === 0 ? 'high' : 'low';

    const result = await db.criticalSpareAnalysis.upsert({
      where: { componentId },
      create: { componentId, criticalityScore: score, leadTimeRisk, stockoutRisk, analyzedById },
      update: { criticalityScore: score, leadTimeRisk, stockoutRisk, lastAnalysisDate: new Date(), analyzedById },
    });

    timer.end();
    return { ...result, score, leadTimeRisk, stockoutRisk };
  },

  async getSpareAnalysis(componentId: string) {
    return db.criticalSpareAnalysis.findUnique({
      where: { componentId },
      include: {
        component: { select: { id: true, componentCode: true, name: true, componentType: true, criticality: true, lifecycleStatus: true } },
        analyzedBy: { select: { id: true, name: true, fullName: true } },
      },
    });
  },
};
