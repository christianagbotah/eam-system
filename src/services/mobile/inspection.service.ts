// ============================================================================
// MOBILE INSPECTION SERVICE — Dynamic inspection forms, scoring,
// defect tracking, compliance, trend analysis
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('mobileInspection');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RatingValue = 'pass' | 'fail' | 'conditional' | 'na';
export type DefectSeverity = 'cosmetic' | 'minor' | 'major' | 'critical';

export interface InspectionTemplateItem {
  id: string;
  sectionTitle: string;
  sequence: number;
  label: string;
  type: 'pass_fail' | 'rating' | 'measurement' | 'photo' | 'text' | 'checkbox' | 'select';
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  conditional?: {
    showWhenItemId: string;
    showWhenValue: string | string[];
  };
  helpText?: string;
  criticalItem: boolean; // Failure fails the entire inspection
}

export interface InspectionResultItem {
  itemId: string;
  value: RatingValue | string | number | boolean;
  rating?: RatingValue;
  photoUrl?: string;
  notes?: string;
  measuredAt?: string;
  gps?: { lat: number; lng: number; accuracy: number };
}

export interface InspectionFinding {
  itemId: string;
  severity: DefectSeverity;
  description: string;
  photos: string[];
  requiresFollowUp: boolean;
  followUpWorkOrderId?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface InspectionScore {
  overallScore: number;        // 0 to 1
  passRate: number;            // passCount / (total - naCount)
  passCount: number;
  failCount: number;
  conditionalCount: number;
  naCount: number;
  totalItems: number;
  passed: boolean;
  passThreshold: number;
  criticalFailures: string[];  // IDs of failed critical items
}

export interface InspectionCompliance {
  templateId: string;
  templateName: string;
  period: string;
  requiredCount: number;
  completedCount: number;
  complianceRate: number;
  averageScore: number;
  overdueCount: number;
  nextDue: string | null;
}

export interface InspectionTrend {
  period: string;
  averageScore: number;
  passRate: number;
  totalInspections: number;
  findingsCount: number;
  criticalFindings: number;
}

// ---------------------------------------------------------------------------
// InspectionService
// ---------------------------------------------------------------------------

export class InspectionService {

  // =========================================================================
  // DYNAMIC FORM BUILDER
  // =========================================================================

  /**
   * Parse a template's sectionsJson into flat inspection items.
   */
  static parseTemplateItems(sectionsJson: unknown): InspectionTemplateItem[] {
    const sections = sectionsJson as Array<{
      title: string;
      items: Array<{
        type: string;
        label: string;
        required?: boolean;
        options?: string[];
        min?: number;
        max?: number;
        unit?: string;
        conditional?: { showWhenItemId: string; showWhenValue: string | string[] };
        helpText?: string;
        criticalItem?: boolean;
      }>;
    }> | null;

    if (!sections || !Array.isArray(sections)) return [];

    const items: InspectionTemplateItem[] = [];
    let globalSeq = 0;

    for (const section of sections) {
      if (!section.items) continue;
      for (const item of section.items) {
        globalSeq++;
        items.push({
          id: `item-${globalSeq}`,
          sectionTitle: section.title,
          sequence: globalSeq,
          label: item.label,
          type: (item.type as InspectionTemplateItem['type']) || 'pass_fail',
          required: item.required ?? false,
          options: item.options,
          min: item.min,
          max: item.max,
          unit: item.unit,
          conditional: item.conditional ? {
            showWhenItemId: item.conditional.showWhenItemId,
            showWhenValue: item.conditional.showWhenValue,
          } : undefined,
          helpText: item.helpText,
          criticalItem: item.criticalItem ?? false,
        });
      }
    }

    return items;
  }

  /**
   * Build a dynamic inspection form from a template.
   * Applies conditional logic to determine visible items.
   */
  static buildInspectionForm(
    template: { sectionsJson: unknown; passThreshold: number },
    currentAnswers: Record<string, unknown> = {}
  ): InspectionTemplateItem[] {
    const allItems = InspectionService.parseTemplateItems(template.sectionsJson);

    // Filter items based on conditional logic
    return allItems.filter(item => {
      if (!item.conditional) return true;

      const parentValue = currentAnswers[item.conditional.showWhenItemId];
      if (parentValue === undefined) return false;

      const showValues = Array.isArray(item.conditional.showWhenValue)
        ? item.conditional.showWhenValue
        : [item.conditional.showWhenValue];

      return showValues.includes(String(parentValue));
    });
  }

  // =========================================================================
  // SCORING & COMPLIANCE
  // =========================================================================

  /**
   * Calculate inspection score from result items.
   */
  static calculateScore(
    results: InspectionResultItem[],
    items: InspectionTemplateItem[],
    passThreshold: number = 0.8
  ): InspectionScore {
    let passCount = 0;
    let failCount = 0;
    let conditionalCount = 0;
    let naCount = 0;
    let totalItems = 0;
    const criticalFailures: string[] = [];

    for (const result of results) {
      const item = items.find(i => i.id === result.itemId);
      if (!item) continue;

      // Skip items hidden by conditional logic
      if (item.conditional) {
        const parentResult = results.find(r => r.itemId === item.conditional!.showWhenItemId);
        if (!parentResult) continue;
        const showValues = Array.isArray(item.conditional.showWhenValue)
          ? item.conditional.showWhenValue
          : [item.conditional.showWhenValue];
        if (!showValues.includes(String(parentResult.value))) continue;
      }

      totalItems++;
      const rating = result.rating || (typeof result.value === 'string' ? result.value as RatingValue : null);

      switch (rating) {
        case 'pass':
          passCount++;
          break;
        case 'fail':
          failCount++;
          if (item.criticalItem) {
            criticalFailures.push(item.id);
          }
          break;
        case 'conditional':
          conditionalCount++;
          break;
        case 'na':
          naCount++;
          break;
        default:
          // Non-rated items don't count toward pass/fail
          naCount++;
          break;
      }
    }

    const ratedItems = totalItems - naCount;
    const passRate = ratedItems > 0 ? passCount / ratedItems : 1;
    const overallScore = ratedItems > 0
      ? (passCount * 1 + conditionalCount * 0.5) / ratedItems
      : 1;

    // Critical item failure auto-fails
    const passed = criticalFailures.length === 0 && passRate >= passThreshold;

    return {
      overallScore: Math.round(overallScore * 1000) / 1000,
      passRate: Math.round(passRate * 1000) / 1000,
      passCount,
      failCount,
      conditionalCount,
      naCount,
      totalItems,
      passed,
      passThreshold,
      criticalFailures,
    };
  }

  // =========================================================================
  // DEFECT TRACKING
  // =========================================================================

  /**
   * Extract findings (defects) from inspection results.
   */
  static extractFindings(
    results: InspectionResultItem[],
    items: InspectionTemplateItem[]
  ): InspectionFinding[] {
    const findings: InspectionFinding[] = [];

    for (const result of results) {
      const item = items.find(i => i.id === result.itemId);
      if (!item) continue;

      const rating = result.rating || (typeof result.value === 'string' ? result.value as RatingValue : null);

      if (rating === 'fail' || rating === 'conditional') {
        const severity: DefectSeverity = item.criticalItem
          ? 'critical'
          : rating === 'fail'
            ? 'major'
            : 'minor';

        findings.push({
          itemId: item.id,
          severity,
          description: result.notes || `Failed inspection item: ${item.label}`,
          photos: result.photoUrl ? [result.photoUrl] : [],
          requiresFollowUp: severity === 'major' || severity === 'critical',
        });
      }
    }

    // Sort by severity
    const severityOrder: Record<DefectSeverity, number> = { critical: 0, major: 1, minor: 2, cosmetic: 3 };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return findings;
  }

  /**
   * Generate a follow-up work order from an inspection finding.
   */
  static async generateFollowUpWorkOrder(data: {
    finding: InspectionFinding;
    assetId?: string;
    inspectionId: string;
    inspectorId: string;
    plantId?: string;
    departmentId?: string;
  }): Promise<string | null> {
    if (!data.finding.requiresFollowUp) return null;

    try {
      const priorityMap: Record<DefectSeverity, string> = {
        critical: 'critical',
        major: 'high',
        minor: 'medium',
        cosmetic: 'low',
      };

      // Generate WO number
      const now = new Date();
      const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const count = await db.workOrder.count({
        where: { woNumber: { startsWith: `WO-${monthStr}` } },
      });
      const woNumber = `WO-${monthStr}-${String(count + 1).padStart(4, '0')}`;

      const wo = await db.workOrder.create({
        data: {
          woNumber,
          title: `Inspection Finding: ${data.finding.description.substring(0, 100)}`,
          description: `Automatically generated from inspection finding.\n\nSeverity: ${data.finding.severity}\n${data.finding.description}`,
          type: 'corrective',
          priority: priorityMap[data.finding.severity],
          status: 'draft',
          assetId: data.assetId,
          plantId: data.plantId,
          departmentId: data.departmentId,
          assignedBy: data.inspectorId,
          failureDescription: data.finding.description,
        },
      });

      logger.info('Follow-up work order created', {
        woNumber: wo.woNumber,
        findingSeverity: data.finding.severity,
        inspectionId: data.inspectionId,
      });

      return wo.id;
    } catch (err) {
      logger.error('Failed to create follow-up work order', { error: (err as Error).message });
      return null;
    }
  }

  // =========================================================================
  // INSPECTION HISTORY & TREND ANALYSIS
  // =========================================================================

  /**
   * Get inspection compliance metrics for a template.
   */
  static async getComplianceMetrics(
    templateId: string,
    months: number = 12
  ): Promise<InspectionCompliance> {
    try {
      const template = await db.inspectionTemplate.findUnique({
        where: { id: templateId },
        select: { name: true, frequency: true, passThreshold: true },
      });

      if (!template) {
        return {
          templateId, templateName: 'Unknown', period: `${months}m`,
          requiredCount: 0, completedCount: 0, complianceRate: 0,
          averageScore: 0, overdueCount: 0, nextDue: null,
        };
      }

      const since = new Date();
      since.setMonth(since.getMonth() - months);

      // Calculate required inspections based on frequency
      const frequencyMap: Record<string, number> = {
        daily: 30 * months,
        weekly: 4 * months,
        monthly: months,
        quarterly: Math.ceil(months / 3),
        semiannual: Math.ceil(months / 6),
        annual: 1,
        on_demand: 0,
      };
      const requiredCount = frequencyMap[template.frequency || 'on_demand'] || 0;

      // Get completed inspections
      const completed = await db.mobileInspection.findMany({
        where: { templateId, completedAt: { gte: since }, status: 'completed' },
        select: { score: true, completedAt: true },
      });

      const completedCount = completed.length;
      const complianceRate = requiredCount > 0 ? Math.min(completedCount / requiredCount, 1) : 0;
      const averageScore = completed.length > 0
        ? completed.reduce((sum, c) => sum + (c.score || 0), 0) / completed.length
        : 0;

      // Determine next due date
      let nextDue: string | null = null;
      if (template.frequency && template.frequency !== 'on_demand') {
        const lastCompleted = completed.sort((a, b) =>
          new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
        )[0];
        if (lastCompleted?.completedAt) {
          const intervalMs: Record<string, number> = {
            daily: 86400000,
            weekly: 604800000,
            monthly: 2592000000,
            quarterly: 7776000000,
            semiannual: 15552000000,
            annual: 31536000000,
          };
          const next = new Date(lastCompleted.completedAt.getTime() + (intervalMs[template.frequency] || 0));
          if (next > new Date()) nextDue = next.toISOString();
        }
      }

      const overdueCount = nextDue ? (new Date(nextDue) < new Date() ? 1 : 0) : 0;

      return {
        templateId,
        templateName: template.name,
        period: `${months}m`,
        requiredCount,
        completedCount,
        complianceRate: Math.round(complianceRate * 1000) / 1000,
        averageScore: Math.round(averageScore * 1000) / 1000,
        overdueCount,
        nextDue,
      };
    } catch (err) {
      logger.error('Failed to get compliance metrics', { error: (err as Error).message });
      return {
        templateId, templateName: 'Unknown', period: `${months}m`,
        requiredCount: 0, completedCount: 0, complianceRate: 0,
        averageScore: 0, overdueCount: 0, nextDue: null,
      };
    }
  }

  /**
   * Get inspection score trends over time.
   */
  static async getInspectionTrends(
    templateId?: string,
    months: number = 6
  ): Promise<InspectionTrend[]> {
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const where: Record<string, unknown> = {
        status: 'completed',
        completedAt: { gte: since },
      };
      if (templateId) where.templateId = templateId;

      const inspections = await db.mobileInspection.findMany({
        where,
        select: { completedAt: true, score: true, passCount: true, failCount: true, totalItems: true, findingsJson: true },
        orderBy: { completedAt: 'asc' },
      });

      // Group by month
      const monthlyMap = new Map<string, InspectionTrend>();

      for (const insp of inspections) {
        if (!insp.completedAt) continue;
        const monthKey = insp.completedAt.toISOString().substring(0, 7); // YYYY-MM

        const existing = monthlyMap.get(monthKey) || {
          period: monthKey,
          averageScore: 0,
          passRate: 0,
          totalInspections: 0,
          findingsCount: 0,
          criticalFindings: 0,
        };

        existing.totalInspections++;
        existing.averageScore += insp.score || 0;
        const ratedItems = insp.totalItems - (insp.totalItems > 0 ? 0 : 0);
        existing.passRate += ratedItems > 0 ? insp.passCount / ratedItems : 1;

        if (insp.findingsJson) {
          const findings = insp.findingsJson as Array<{ severity: string }>;
          existing.findingsCount += findings.length;
          existing.criticalFindings += findings.filter(f => f.severity === 'critical').length;
        }

        monthlyMap.set(monthKey, existing);
      }

      // Calculate averages
      return Array.from(monthlyMap.values()).map(m => ({
        ...m,
        averageScore: Math.round((m.averageScore / m.totalInspections) * 1000) / 1000,
        passRate: Math.round((m.passRate / m.totalInspections) * 1000) / 1000,
      }));
    } catch (err) {
      logger.error('Failed to get inspection trends', { error: (err as Error).message });
      return [];
    }
  }

  // =========================================================================
  // REGULATORY COMPLIANCE TRACKING
  // =========================================================================

  /**
   * Get overall regulatory compliance summary.
   */
  static async getRegulatorySummary(): Promise<{
    totalTemplates: number;
    compliantTemplates: number;
    complianceRate: number;
    overdueInspections: number;
    criticalFindings: number;
    categories: Array<{ category: string; complianceRate: number; templateCount: number }>;
  }> {
    try {
      const templates = await db.inspectionTemplate.findMany({
        where: { isActive: true },
        select: { id: true, category: true },
      });

      const categories = new Map<string, { total: number; compliant: number }>();
      let totalCompliant = 0;
      let overdueInspections = 0;
      let criticalFindings = 0;

      for (const template of templates) {
        const compliance = await InspectionService.getComplianceMetrics(template.id, 1);
        const isCompliant = compliance.complianceRate >= 1;

        if (isCompliant) totalCompliant++;
        overdueInspections += compliance.overdueCount;

        // Count critical findings
        const recentFindings = await db.mobileInspection.count({
          where: {
            templateId: template.id,
            status: 'completed',
            findingsJson: { path: '$[*].severity', equals: 'critical' },
          },
        });
        criticalFindings += recentFindings;

        const cat = template.category || 'other';
        const catData = categories.get(cat) || { total: 0, compliant: 0 };
        catData.total++;
        if (isCompliant) catData.compliant++;
        categories.set(cat, catData);
      }

      return {
        totalTemplates: templates.length,
        compliantTemplates: totalCompliant,
        complianceRate: templates.length > 0 ? totalCompliant / templates.length : 0,
        overdueInspections,
        criticalFindings,
        categories: Array.from(categories.entries()).map(([category, data]) => ({
          category,
          complianceRate: data.total > 0 ? data.compliant / data.total : 0,
          templateCount: data.total,
        })),
      };
    } catch (err) {
      logger.error('Failed to get regulatory summary', { error: (err as Error).message });
      return {
        totalTemplates: 0, compliantTemplates: 0, complianceRate: 0,
        overdueInspections: 0, criticalFindings: 0, categories: [],
      };
    }
  }

  // =========================================================================
  // TEMPLATE MANAGEMENT
  // =========================================================================

  /**
   * Create a new inspection template.
   */
  static async createTemplate(data: {
    name: string;
    description?: string;
    category?: string;
    frequency?: string;
    estimatedMinutes?: number;
    sections: Array<{ title: string; items: Array<Record<string, unknown>> }>;
    passThreshold?: number;
    createdById: string;
  }): Promise<unknown> {
    try {
      const template = await db.inspectionTemplate.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          frequency: data.frequency,
          estimatedMinutes: data.estimatedMinutes,
          sectionsJson: data.sections as unknown as Record<string, unknown>[],
          passThreshold: data.passThreshold ?? 0.8,
          createdById: data.createdById,
        },
      });

      logger.info('Inspection template created', { templateId: template.id, name: data.name });
      return template;
    } catch (err) {
      logger.error('Failed to create inspection template', { error: (err as Error).message });
      throw err;
    }
  }
}
