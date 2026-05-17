// ============================================================================
// P&ID LINKING SERVICE
// Equipment tag extraction, tag-to-asset linking, instrument resolution,
// zone boundary management, cross-reference, change impact analysis
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('PidLinkingService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TagExtractionResult {
  tagNumber: string;
  tagType: 'equipment' | 'instrument' | 'line' | 'valve' | 'vessel' | 'unknown';
  x?: number;
  y?: number;
  confidence: number;
}

export interface LinkTagInput {
  documentId: string;
  tagNumber: string;
  tagType?: string;
  assetId?: string;
  x?: number;
  y?: number;
}

export interface PidAnalysisResult {
  documentId: string;
  documentNumber: string;
  totalTags: number;
  linkedTags: number;
  unlinkedTags: number;
  verifiedTags: number;
  tags: PidTagSummary[];
  zones: PidZoneSummary[];
}

export interface PidTagSummary {
  tagNumber: string;
  tagType: string;
  assetId: string | null;
  assetName: string | null;
  isVerified: boolean;
  x: number | null;
  y: number | null;
}

export interface PidZoneSummary {
  zoneName: string;
  tagCount: number;
  linkedCount: number;
  unlinkedCount: number;
}

export interface ChangeImpactAnalysis {
  documentId: string;
  documentNumber: string;
  affectedAssets: AffectedAsset[];
  affectedWorkOrders: AffectedWorkOrder[];
  affectedPmSchedules: AffectedPmSchedule[];
}

export interface AffectedAsset {
  assetId: string;
  assetName: string;
  assetTag: string;
  tagNumber: string;
}

export interface AffectedWorkOrder {
  workOrderId: string;
  woNumber: string;
  title: string;
  status: string;
}

export interface AffectedPmSchedule {
  scheduleId: string;
  title: string;
  frequency: string;
}

// ---------------------------------------------------------------------------
// Instrument tag prefix patterns
// ---------------------------------------------------------------------------

const INSTRUMENT_PREFIXES: Record<string, string> = {
  PT: 'pressure_transmitter',
  TT: 'temperature_transmitter',
  FT: 'flow_transmitter',
  LT: 'level_transmitter',
  AT: 'analyzer',
  PH: 'ph_analyzer',
  PD: 'pressure_differential',
  TE: 'temperature_element',
  PE: 'pressure_element',
  FE: 'flow_element',
  LE: 'level_element',
  PS: 'pressure_switch',
  TS: 'temperature_switch',
  FS: 'flow_switch',
  LS: 'level_switch',
  PC: 'pressure_controller',
  TC: 'temperature_controller',
  FC: 'flow_controller',
  LC: 'level_controller',
  PIC: 'pressure_indicating_controller',
  TIC: 'temperature_indicating_controller',
  FIC: 'flow_indicating_controller',
  LIC: 'level_indicating_controller',
  PDR: 'pressure_differential_recorder',
  TR: 'temperature_recorder',
  FR: 'flow_recorder',
  LR: 'level_recorder',
  PI: 'pressure_indicator',
  TI: 'temperature_indicator',
  FI: 'flow_indicator',
  LI: 'level_indicator',
  PR: 'pressure_recorder',
  TV: 'temperature_valve',
  PV: 'pressure_valve',
  FV: 'flow_valve',
  LV: 'level_valve',
  PCV: 'pressure_control_valve',
  TCV: 'temperature_control_valve',
  FCV: 'flow_control_valve',
  LCV: 'level_control_valve',
  PSV: 'pressure_safety_valve',
  TSV: 'temperature_safety_valve',
  BDV: 'blowdown_valve',
  SDV: 'shutdown_valve',
  XV: 'on_off_valve',
};

const EQUIPMENT_PREFIXES: Record<string, string> = {
  P: 'pump',
  C: 'compressor',
  T: 'tower',
  V: 'vessel',
  TK: 'tank',
  E: 'heat_exchanger',
  HX: 'heat_exchanger',
  R: 'reactor',
  BL: 'blower',
  FAN: 'fan',
  M: 'motor',
  D: 'dryer',
  K: 'column',
  FL: 'filter',
  CY: 'cyclone',
  DR: 'drum',
  FD: 'fired_heater',
  FH: 'furnace',
};

const LINE_TAG_PATTERN = /^[A-Z]?-?\d{2,4}(-[A-Z])?(-\d{1,2})?$/;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PidLinkingService {
  /**
   * Extract equipment and instrument tags from text
   */
  static extractTags(text: string): TagExtractionResult[] {
    const tags: TagExtractionResult[] = [];
    const tagPattern = /\b([A-Z]{1,3}[-\/]?\d{1,4}[A-Z]?(-[A-Z0-9]+)?)\b/g;

    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(text)) !== null) {
      const tagNumber = match[1];
      const tagType = this.classifyTag(tagNumber);
      const confidence = this.calculateConfidence(tagNumber, tagType);

      if (confidence > 0.3) {
        tags.push({
          tagNumber,
          tagType,
          confidence,
        });
      }
    }

    // Deduplicate by tagNumber
    const seen = new Set<string>();
    return tags.filter(t => {
      if (seen.has(t.tagNumber)) return false;
      seen.add(t.tagNumber);
      return true;
    });
  }

  /**
   * Classify a tag number into its type
   */
  static classifyTag(tagNumber: string): TagExtractionResult['tagType'] {
    const prefix = tagNumber.replace(/[-\/].*$/, '').toUpperCase();

    // Check instrument prefixes first (more specific)
    for (const [instrPrefix] of Object.entries(INSTRUMENT_PREFIXES)) {
      if (prefix === instrPrefix) return 'instrument';
    }

    // Check equipment prefixes
    for (const [eqPrefix] of Object.entries(EQUIPMENT_PREFIXES)) {
      if (prefix === eqPrefix) return 'equipment';
    }

    // Check valve patterns
    if (/^XV/.test(prefix) || /CV$/.test(prefix) || /VV$/.test(prefix)) return 'valve';

    // Check line number patterns
    if (LINE_TAG_PATTERN.test(tagNumber)) return 'line';

    // Check vessel/tank patterns
    if (/^V-/.test(tagNumber) || /^TK-/.test(tagNumber) || /^D-/.test(tagNumber)) return 'vessel';

    return 'unknown';
  }

  /**
   * Calculate confidence score for a tag classification
   */
  static calculateConfidence(tagNumber: string, tagType: string): number {
    const prefix = tagNumber.replace(/[-\/].*$/, '').toUpperCase();

    if (tagType === 'instrument' && INSTRUMENT_PREFIXES[prefix]) return 0.95;
    if (tagType === 'equipment' && EQUIPMENT_PREFIXES[prefix]) return 0.9;
    if (tagType === 'valve') return 0.8;
    if (tagType === 'vessel') return 0.85;
    if (tagType === 'line') return 0.6;

    return 0.4;
  }

  /**
   * Link a P&ID tag to an asset
   */
  static async linkTag(input: LinkTagInput) {
    // Check for existing link
    const existing = await db.pidTagLink.findUnique({
      where: {
        documentId_tagNumber: {
          documentId: input.documentId,
          tagNumber: input.tagNumber,
        },
      },
    });

    if (existing) {
      return db.pidTagLink.update({
        where: { id: existing.id },
        data: {
          tagType: input.tagType || existing.tagType,
          assetId: input.assetId,
          x: input.x,
          y: input.y,
        },
      });
    }

    return db.pidTagLink.create({
      data: {
        documentId: input.documentId,
        tagNumber: input.tagNumber,
        tagType: input.tagType || this.classifyTag(input.tagNumber),
        assetId: input.assetId,
        x: input.x,
        y: input.y,
      },
    });
  }

  /**
   * Bulk link tags from extraction results
   */
  static async bulkLinkTags(documentId: string, tags: TagExtractionResult[]) {
    const results = { created: 0, updated: 0, skipped: 0 };

    for (const tag of tags) {
      try {
        const existing = await db.pidTagLink.findUnique({
          where: {
            documentId_tagNumber: { documentId, tagNumber: tag.tagNumber },
          },
        });

        if (existing) {
          await db.pidTagLink.update({
            where: { id: existing.id },
            data: { tagType: tag.tagType, x: tag.x, y: tag.y },
          });
          results.updated++;
        } else {
          await db.pidTagLink.create({
            data: {
              documentId,
              tagNumber: tag.tagNumber,
              tagType: tag.tagType,
              x: tag.x,
              y: tag.y,
            },
          });
          results.created++;
        }
      } catch {
        results.skipped++;
      }
    }

    logger.info('Bulk tag linking completed', { documentId, ...results });
    return results;
  }

  /**
   * Auto-resolve tags to assets by searching the asset database
   */
  static async resolveTagsToAssets(documentId: string) {
    const links = await db.pidTagLink.findMany({
      where: { documentId, assetId: null },
    });

    let resolved = 0;

    for (const link of links) {
      const asset = await this.findAssetByTag(link.tagNumber);
      if (asset) {
        await db.pidTagLink.update({
          where: { id: link.id },
          data: { assetId: asset.id },
        });
        resolved++;
      }
    }

    logger.info('Tag-to-asset resolution completed', { documentId, resolved, total: links.length });
    return { resolved, total: links.length };
  }

  /**
   * Find an asset by tag number (exact or fuzzy match)
   */
  static async findAssetByTag(tagNumber: string) {
    // Exact match on assetTag
    const exact = await db.asset.findFirst({
      where: { assetTag: tagNumber },
      select: { id: true, name: true, assetTag: true },
    });

    if (exact) return exact;

    // Try partial match
    const normalizedTag = tagNumber.replace(/[-\/]/g, '');
    const partial = await db.asset.findFirst({
      where: {
        OR: [
          { assetTag: { contains: tagNumber } },
          { name: { contains: tagNumber } },
          { assetTag: { contains: normalizedTag } },
        ],
      },
      select: { id: true, name: true, assetTag: true },
    });

    return partial || null;
  }

  /**
   * Verify a tag link
   */
  static async verifyTag(linkId: string, verifiedById: string, isVerified: boolean) {
    return db.pidTagLink.update({
      where: { id: linkId },
      data: {
        isVerified,
        verifiedById,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Get full P&ID analysis results
   */
  static async analyzeDocument(documentId: string): Promise<PidAnalysisResult> {
    const document = await db.engineeringDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new Error(`Document not found: ${documentId}`);

    const links = await db.pidTagLink.findMany({
      where: { documentId },
      include: {
        document: { select: { documentNumber: true } },
      },
    });

    // Get asset names for linked tags
    const assetIds = links.filter(l => l.assetId).map(l => l.assetId!);
    const assets = assetIds.length > 0
      ? await db.asset.findMany({
          where: { id: { in: assetIds } },
          select: { id: true, name: true, assetTag: true },
        })
      : [];

    const assetMap = new Map(assets.map(a => [a.id, a]));

    const tags: PidTagSummary[] = links.map(link => {
      const asset = link.assetId ? assetMap.get(link.assetId) : null;
      return {
        tagNumber: link.tagNumber,
        tagType: link.tagType || 'unknown',
        assetId: link.assetId,
        assetName: asset?.name || null,
        isVerified: link.isVerified,
        x: link.x,
        y: link.y,
      };
    });

    // Build zones from area/folderPath
    const zones: PidZoneSummary[] = [];
    if (document.area) {
      const zoneTags = tags.filter(t => true); // All tags are in the document area
      zones.push({
        zoneName: document.area,
        tagCount: zoneTags.length,
        linkedCount: zoneTags.filter(t => t.assetId).length,
        unlinkedCount: zoneTags.filter(t => !t.assetId).length,
      });
    }

    return {
      documentId,
      documentNumber: document.documentNumber,
      totalTags: tags.length,
      linkedTags: tags.filter(t => t.assetId).length,
      unlinkedTags: tags.filter(t => !t.assetId).length,
      verifiedTags: tags.filter(t => t.isVerified).length,
      tags,
      zones,
    };
  }

  /**
   * Generate markup data highlighting unlinked tags
   */
  static async generateMarkupData(documentId: string) {
    const links = await db.pidTagLink.findMany({
      where: { documentId },
    });

    return {
      documentId,
      unlinkedTags: links
        .filter(l => !l.assetId)
        .map(l => ({
          tagNumber: l.tagNumber,
          tagType: l.tagType,
          x: l.x,
          y: l.y,
        })),
      linkedTags: links
        .filter(l => l.assetId)
        .map(l => ({
          tagNumber: l.tagNumber,
          tagType: l.tagType,
          assetId: l.assetId,
          x: l.x,
          y: l.y,
        })),
      verifiedTags: links
        .filter(l => l.isVerified)
        .map(l => ({
          tagNumber: l.tagNumber,
          tagType: l.tagType,
          assetId: l.assetId,
          x: l.x,
          y: l.y,
        })),
    };
  }

  /**
   * Analyze impact of a P&ID revision on assets, WOs, and PM schedules
   */
  static async analyzeChangeImpact(documentId: string): Promise<ChangeImpactAnalysis> {
    const document = await db.engineeringDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new Error(`Document not found: ${documentId}`);

    const links = await db.pidTagLink.findMany({
      where: { documentId, assetId: { not: null } },
    });

    const assetIds = links.map(l => l.assetId!);

    // Get affected assets
    const affectedAssets: AffectedAsset[] = [];
    if (assetIds.length > 0) {
      const assets = await db.asset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, name: true, assetTag: true },
      });
      const assetLinkMap = new Map(links.map(l => [l.assetId!, l.tagNumber]));

      for (const asset of assets) {
        affectedAssets.push({
          assetId: asset.id,
          assetName: asset.name,
          assetTag: asset.assetTag,
          tagNumber: assetLinkMap.get(asset.id) || '',
        });
      }
    }

    // Get affected work orders
    const affectedWorkOrders: AffectedWorkOrder[] = [];
    if (assetIds.length > 0) {
      const wos = await db.workOrder.findMany({
        where: {
          assetId: { in: assetIds },
          status: { notIn: ['completed', 'closed', 'cancelled'] },
        },
        select: { id: true, woNumber: true, title: true, status: true },
        take: 50,
      });
      for (const wo of wos) {
        affectedWorkOrders.push({
          workOrderId: wo.id,
          woNumber: wo.woNumber,
          title: wo.title,
          status: wo.status,
        });
      }
    }

    // Get affected PM schedules
    const affectedPmSchedules: AffectedPmSchedule[] = [];
    if (assetIds.length > 0) {
      const schedules = await db.pmSchedule.findMany({
        where: { assetId: { in: assetIds }, isActive: true },
        select: { id: true, title: true, frequencyType: true, frequencyValue: true },
        take: 50,
      });
      for (const schedule of schedules) {
        affectedPmSchedules.push({
          scheduleId: schedule.id,
          title: schedule.title,
          frequency: `${schedule.frequencyType} / ${schedule.frequencyValue}`,
        });
      }
    }

    return {
      documentId,
      documentNumber: document.documentNumber,
      affectedAssets,
      affectedWorkOrders,
      affectedPmSchedules,
    };
  }

  /**
   * Get cross-reference: all documents that reference a given asset
   */
  static async getDocumentsForAsset(assetId: string) {
    const links = await db.pidTagLink.findMany({
      where: { assetId },
      include: {
        document: {
          select: {
            id: true,
            documentNumber: true,
            title: true,
            category: true,
            status: true,
            version: true,
            revision: true,
          },
        },
      },
    });

    return links.map(link => ({
      documentId: link.document.id,
      documentNumber: link.document.documentNumber,
      title: link.document.title,
      category: link.document.category,
      status: link.document.status,
      version: link.document.version,
      revision: link.document.revision,
      tagNumber: link.tagNumber,
      tagType: link.tagType,
      isVerified: link.isVerified,
    }));
  }

  /**
   * Line number tracking
   */
  static async getLineNumbers(documentId: string) {
    const links = await db.pidTagLink.findMany({
      where: { documentId, tagType: 'line' },
    });

    return links.map(link => ({
      tagNumber: link.tagNumber,
      assetId: link.assetId,
      isVerified: link.isVerified,
    }));
  }
}
