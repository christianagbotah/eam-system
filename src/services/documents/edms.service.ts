// ============================================================================
// ENGINEERING DOCUMENT MANAGEMENT SERVICE (EDMS)
// Full CRUD, numbering, revision control, lifecycle, folder hierarchy, bulk ops
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('EDMService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentCategory =
  | 'p_id' | 'pfd' | 'isometric' | 'electrical' | 'instrumentation'
  | 'mechanical' | 'civil' | 'safety' | 'quality' | 'procedure'
  | 'manual' | 'specification';

export type DocumentStatus =
  | 'draft' | 'under_review' | 'approved' | 'issued' | 'superseded' | 'obsolete';

export type DocumentDiscipline =
  | 'mechanical' | 'electrical' | 'instrument' | 'civil' | 'process' | 'piping';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'p_id', 'pfd', 'isometric', 'electrical', 'instrumentation',
  'mechanical', 'civil', 'safety', 'quality', 'procedure', 'manual', 'specification',
];

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  'draft', 'under_review', 'approved', 'issued', 'superseded', 'obsolete',
];

export const CATEGORY_PREFIXES: Record<string, string> = {
  p_id: 'PID',
  pfd: 'PFD',
  isometric: 'ISO',
  electrical: 'ELC',
  instrumentation: 'INS',
  mechanical: 'MEC',
  civil: 'CIV',
  safety: 'SAF',
  quality: 'QUA',
  procedure: 'PRC',
  manual: 'MAN',
  specification: 'SPE',
};

export const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ['under_review', 'obsolete'],
  under_review: ['approved', 'draft'],
  approved: ['issued', 'under_review', 'superseded', 'obsolete'],
  issued: ['superseded', 'obsolete'],
  superseded: ['obsolete'],
  obsolete: [],
};

export interface CreateDocumentInput {
  title: string;
  description?: string;
  category: DocumentCategory;
  subcategory?: string;
  discipline?: DocumentDiscipline;
  plantId?: string;
  area?: string;
  folderPath?: string;
  fileSize?: number;
  fileMimeType?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  createdById: string;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  category?: DocumentCategory;
  subcategory?: string;
  discipline?: DocumentDiscipline;
  plantId?: string;
  area?: string;
  folderPath?: string;
  status?: DocumentStatus;
  fileSize?: number;
  fileMimeType?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  extractedText?: string;
  metadata?: unknown;
  tags?: unknown;
  linkedAssetIds?: unknown;
  linkedTagNumbers?: unknown;
  reviewNotes?: string;
  effectiveDate?: Date;
  reviewDate?: Date;
}

export interface BulkOperationInput {
  documentIds: string[];
  operation: 'move' | 'reclassify' | 'delete';
  folderPath?: string;
  category?: DocumentCategory;
}

export interface DocumentListOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  discipline?: DocumentDiscipline;
  plantId?: string;
  area?: string;
  folderPath?: string;
  createdById?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentListResult {
  documents: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EdmsService {
  /**
   * Generate the next document number for a category
   * Format: {PREFIX}-{DISC}-{NNN}  e.g. PID-MEC-001
   */
  static async generateDocumentNumber(
    category: DocumentCategory,
    discipline?: string,
  ): Promise<string> {
    const prefix = CATEGORY_PREFIXES[category] || 'DOC';
    const disc = discipline ? discipline.substring(0, 3).toUpperCase() : 'GEN';

    // Find the highest sequential number for this prefix+discipline
    const prefixPattern = `${prefix}-${disc}-`;
    const lastDoc = await db.engineeringDocument.findFirst({
      where: { documentNumber: { startsWith: prefixPattern } },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });

    let nextNum = 1;
    if (lastDoc) {
      const parts = lastDoc.documentNumber.split('-');
      const numStr = parts[parts.length - 1];
      nextNum = (parseInt(numStr, 10) || 0) + 1;
    }

    const seq = String(nextNum).padStart(3, '0');
    return `${prefix}-${disc}-${seq}`;
  }

  /**
   * Create a new engineering document
   */
  static async createDocument(input: CreateDocumentInput) {
    const documentNumber = await this.generateDocumentNumber(input.category, input.discipline);

    const document = await db.engineeringDocument.create({
      data: {
        documentNumber,
        title: input.title,
        description: input.description,
        category: input.category,
        subcategory: input.subcategory,
        discipline: input.discipline,
        plantId: input.plantId,
        area: input.area,
        folderPath: input.folderPath || this.buildFolderPath(input),
        fileSize: input.fileSize,
        fileMimeType: input.fileMimeType,
        fileUrl: input.fileUrl,
        thumbnailUrl: input.thumbnailUrl,
        createdById: input.createdById,
        status: 'draft',
        version: 1,
        revision: 'A',
      },
    });

    // Create initial revision record
    await db.documentRevision.create({
      data: {
        documentId: document.id,
        version: 1,
        revision: 'A',
        changeDescription: 'Initial creation',
        changeType: 'new',
        fileSize: input.fileSize,
        fileUrl: input.fileUrl,
        changedById: input.createdById,
      },
    });

    logger.info('Document created', { documentNumber, category: input.category });
    return document;
  }

  /**
   * Get a single document by ID
   */
  static async getDocument(id: string) {
    const document = await db.engineeringDocument.findUnique({
      where: { id },
      include: {
        revisions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }

    return document;
  }

  /**
   * List documents with filters and pagination
   */
  static async listDocuments(options: DocumentListOptions): Promise<DocumentListResult> {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      discipline,
      plantId,
      area,
      folderPath,
      createdById,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { documentNumber: { contains: search } },
        { extractedText: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;
    if (discipline) where.discipline = discipline;
    if (plantId) where.plantId = plantId;
    if (area) where.area = area;
    if (folderPath) where.folderPath = { startsWith: folderPath };
    if (createdById) where.createdById = createdById;

    const total = await db.engineeringDocument.count({ where });
    const totalPages = Math.ceil(total / limit);

    const documents = await db.engineeringDocument.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        documentNumber: true,
        title: true,
        description: true,
        category: true,
        subcategory: true,
        discipline: true,
        plantId: true,
        area: true,
        folderPath: true,
        status: true,
        version: true,
        revision: true,
        fileSize: true,
        fileMimeType: true,
        fileUrl: true,
        thumbnailUrl: true,
        tags: true,
        linkedAssetIds: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { documents, total, page, limit, totalPages };
  }

  /**
   * Update a document
   */
  static async updateDocument(id: string, input: UpdateDocumentInput) {
    const existing = await db.engineeringDocument.findUnique({ where: { id } });
    if (!existing) throw new Error(`Document not found: ${id}`);

    // If category changed, regenerate document number
    let documentNumber = existing.documentNumber;
    if (input.category && input.category !== existing.category) {
      documentNumber = await this.generateDocumentNumber(input.category, input.discipline || existing.discipline);
    }

    return db.engineeringDocument.update({
      where: { id },
      data: {
        ...input,
        documentNumber,
      },
    });
  }

  /**
   * Delete a document
   */
  static async deleteDocument(id: string) {
    const existing = await db.engineeringDocument.findUnique({ where: { id } });
    if (!existing) throw new Error(`Document not found: ${id}`);

    await db.engineeringDocument.delete({ where: { id } });
    logger.info('Document deleted', { id, documentNumber: existing.documentNumber });
    return { success: true };
  }

  /**
   * Transition document status
   */
  static async transitionStatus(id: string, newStatus: DocumentStatus, userId: string, notes?: string) {
    const doc = await db.engineeringDocument.findUnique({ where: { id } });
    if (!doc) throw new Error(`Document not found: ${id}`);

    const allowed = VALID_TRANSITIONS[doc.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition: ${doc.status} -> ${newStatus}`);
    }

    if (newStatus === 'approved') {
      return db.engineeringDocument.update({
        where: { id },
        data: { status: newStatus, approvedById: userId, reviewNotes: notes },
      });
    }

    if (newStatus === 'issued') {
      return db.engineeringDocument.update({
        where: { id },
        data: {
          status: newStatus,
          issuedById: userId,
          effectiveDate: new Date(),
        },
      });
    }

    return db.engineeringDocument.update({
      where: { id },
      data: { status: newStatus, reviewNotes: notes },
    });
  }

  /**
   * Create a new revision of a document
   */
  static async createRevision(
    id: string,
    changedById: string,
    changeDescription: string,
    changeType: string = 'revision',
    fileSize?: number,
    fileUrl?: string,
  ) {
    const doc = await db.engineeringDocument.findUnique({ where: { id } });
    if (!doc) throw new Error(`Document not found: ${id}`);

    const nextVersion = doc.version + 1;
    const nextRevision = String.fromCharCode(doc.revision.charCodeAt(0) + 1);
    const newDocNumber = doc.documentNumber.replace(/-REV-[A-Z]$/, '') + `-REV-${nextRevision}`;

    // Update document
    const updated = await db.engineeringDocument.update({
      where: { id },
      data: {
        version: nextVersion,
        revision: nextRevision,
        documentNumber: newDocNumber,
        fileSize: fileSize || doc.fileSize,
        fileUrl: fileUrl || doc.fileUrl,
        status: 'draft', // New revision starts as draft
        reviewNotes: changeDescription,
      },
    });

    // Create revision history record
    await db.documentRevision.create({
      data: {
        documentId: id,
        version: nextVersion,
        revision: nextRevision,
        changeDescription,
        changeType,
        fileSize: fileSize || doc.fileSize,
        fileUrl: fileUrl || doc.fileUrl,
        changedById,
      },
    });

    logger.info('Document revision created', {
      id,
      version: nextVersion,
      revision: nextRevision,
    });

    return updated;
  }

  /**
   * Get revision history for a document
   */
  static async getRevisionHistory(id: string) {
    return db.documentRevision.findMany({
      where: { documentId: id },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Bulk operations on documents
   */
  static async bulkOperation(input: BulkOperationInput, userId: string) {
    const { documentIds, operation, folderPath, category } = input;
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const docId of documentIds) {
      try {
        const doc = await db.engineeringDocument.findUnique({ where: { id: docId } });
        if (!doc) {
          results.failed++;
          results.errors.push(`Document ${docId} not found`);
          continue;
        }

        switch (operation) {
          case 'move':
            if (!folderPath) throw new Error('folderPath required for move');
            await db.engineeringDocument.update({
              where: { id: docId },
              data: { folderPath },
            });
            break;

          case 'reclassify':
            if (!category) throw new Error('category required for reclassify');
            const newNumber = await this.generateDocumentNumber(category, doc.discipline);
            await db.engineeringDocument.update({
              where: { id: docId },
              data: { category, documentNumber: newNumber },
            });
            break;

          case 'delete':
            await db.engineeringDocument.delete({ where: { id: docId } });
            break;
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${docId}: ${(err as Error).message}`);
      }
    }

    logger.info('Bulk operation completed', { operation, ...results });
    return results;
  }

  /**
   * Get folder hierarchy tree
   */
  static async getFolderTree(plantId?: string) {
    const documents = await db.engineeringDocument.findMany({
      where: plantId ? { plantId } : undefined,
      select: { folderPath: true, category: true },
      distinct: ['folderPath', 'category'],
    });

    const folderMap: Record<string, { folders: Record<string, unknown>; count: number }> = {};

    for (const doc of documents) {
      const path = doc.folderPath || '/';
      const parts = path.split('/').filter(Boolean);
      let current = folderMap;

      for (const part of parts) {
        if (!current[part]) {
          current[part] = { folders: {}, count: 0 };
        }
        current = (current[part] as { folders: Record<string, unknown>; count: unknown }).folders as Record<string, { folders: Record<string, unknown>; count: number }>;
      }

      // Increment count at leaf
      if (!folderMap[path]) folderMap[path] = { folders: {}, count: 0 };
      folderMap[path].count++;
    }

    return folderMap;
  }

  /**
   * Get document statistics
   */
  static async getStatistics(plantId?: string) {
    const where = plantId ? { plantId } : {};

    const [total, byStatus, byCategory, recent] = await Promise.all([
      db.engineeringDocument.count({ where }),
      db.engineeringDocument.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      db.engineeringDocument.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
      }),
      db.engineeringDocument.count({
        where: { ...where, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count.id })),
      recentUploads: recent,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private static buildFolderPath(input: CreateDocumentInput): string {
    const parts: string[] = [];
    if (input.plantId) {
      // In a real app, resolve plant name from ID; here use the ID
      parts.push(input.plantId);
    }
    if (input.discipline) parts.push(input.discipline);
    if (input.category) parts.push(input.category);
    if (input.area) parts.push(input.area);
    return parts.length > 0 ? '/' + parts.join('/') : '/';
  }
}
