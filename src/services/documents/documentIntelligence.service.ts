// ============================================================================
// DOCUMENT INTELLIGENCE SERVICE
// OCR integration, text extraction, similarity detection, key info extraction,
// table extraction, title block parsing, classification, auto-tagging
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { PidLinkingService } from './pidLinking.service';

const logger = createLogger('DocumentIntelligenceService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  text: string;
  confidence: number;
  language: string;
  pageCount: number;
}

export interface TitleBlockData {
  drawingNumber: string;
  title: string;
  scale: string;
  revision: string;
  date: string;
  drawnBy: string;
  checkedBy: string;
  approvedBy: string;
  projectName: string;
  client: string;
  sheetNumber: string;
  totalSheets: string;
  weight?: string;
  material?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  title?: string;
  pageNumber?: number;
}

export interface ExtractedMetadata {
  titleBlock?: TitleBlockData;
  equipmentList?: ExtractedEquipment[];
  specifications?: Record<string, string>;
  designParameters?: DesignParameters;
  tables?: TableData[];
  materials?: string[];
  pressures?: string[];
  temperatures?: string[];
  classifications: string[];
  tags: string[];
}

export interface ExtractedEquipment {
  tagNumber: string;
  name: string;
  type: string;
  specification?: string;
  quantity: number;
}

export interface DesignParameters {
  designPressure?: string;
  designTemperature?: string;
  operatingPressure?: string;
  operatingTemperature?: string;
  flowRate?: string;
  medium?: string;
  material?: string;
  rating?: string;
}

export interface SimilarityResult {
  documentId: string;
  documentNumber: string;
  title: string;
  similarity: number;
  matchType: 'exact' | 'near_duplicate' | 'related';
}

export interface ClassificationResult {
  category: string;
  discipline: string;
  confidence: number;
  alternatives: { category: string; confidence: number }[];
}

// ---------------------------------------------------------------------------
// Industrial document classification keywords
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  p_id: ['p&ID', 'pid', 'piping and instrumentation', 'process flow diagram', 'process diagram', 'instrument diagram', 'control diagram'],
  pfd: ['process flow', 'pfd', 'process scheme', 'block flow'],
  isometric: ['isometric', 'iso drawing', 'pipe isometric', 'spool drawing'],
  electrical: ['single line', 'sld', 'cable schedule', 'wiring diagram', 'motor starting', 'electrical', 'lighting', 'power distribution', 'earthing'],
  instrumentation: ['instrument', 'loop diagram', 'hookup', 'i/o list', 'cable schedule', 'junction box', 'dcs', 'plc', 'scada'],
  mechanical: ['mechanical', 'general arrangement', 'ga drawing', 'equipment layout', 'structural', 'foundation', 'skid', 'pump', 'compressor'],
  civil: ['civil', 'structural', 'architectural', 'foundation', 'plot plan', 'site plan', 'grading', 'drainage', 'road', 'building'],
  safety: ['safety', 'hazard', 'hazop', 'fire protection', 'fire alarm', 'emergency', 'escape route', 'safety shower', 'eyewash'],
  quality: ['quality', 'inspection', 'test', 'itp', 'inspection plan', 'ndt', 'weld map', 'punch list'],
  procedure: ['sop', 'standard operating', 'procedure', 'method statement', 'work instruction', 'start-up', 'shut-down'],
  manual: ['manual', 'operation manual', 'maintenance manual', 'vendor manual', 'user guide', 'handbook'],
  specification: ['specification', 'datasheet', 'technical specification', 'material spec', 'design basis', 'code', 'standard'],
};

const DISCIPLINE_KEYWORDS: Record<string, string[]> = {
  mechanical: ['pump', 'compressor', 'vessel', 'tank', 'heat exchanger', 'fan', 'blower', 'motor', 'coupling', 'bearing', 'seal', 'shaft', 'impeller', 'gearbox'],
  electrical: ['voltage', 'ampere', 'cable', 'breaker', 'transformer', 'switchgear', 'motor', 'starter', 'vfd', 'panel', 'busbar', 'conduit', 'wiring'],
  instrument: ['transmitter', 'controller', 'valve', 'sensor', 'detector', 'switch', 'indicator', 'recorder', 'analyzer', 'calibration', 'dcs', 'plc'],
  civil: ['concrete', 'steel', 'foundation', 'beam', 'column', 'slab', 'grating', 'platform', 'stairway', 'handrail', 'anchor bolt', 'rebar'],
  process: ['flow', 'pressure', 'temperature', 'level', 'composition', 'reaction', 'separation', 'distillation', 'heat transfer', 'mass balance'],
  piping: ['pipe', 'fitting', 'flange', 'valve', 'gasket', 'elbow', 'tee', 'reducer', 'expansion joint', 'steam trap', 'strainer'],
};

const SPEC_PATTERNS: Record<string, RegExp> = {
  designPressure: /design\s*pressure[:\s]*(\S+)/i,
  designTemperature: /design\s*temp(?:erature)?[:\s]*(\S+)/i,
  operatingPressure: /operating\s*pressure[:\s]*(\S+)/i,
  operatingTemperature: /operating\s*temp(?:erature)?[:\s]*(\S+)/i,
  flowRate: /flow\s*(?:rate)?[:\s]*(\S+\s*\/?\s*\S*)/i,
  medium: /(?:medium|service|fluid)[:\s]*([a-zA-Z\s]+?)(?:,|\.|\n|$)/i,
  material: /(?:material|construction)[:\s]*([a-zA-Z\s\-\+\.]+?)(?:,|\.|\n|$)/i,
  rating: /rating[:\s]*(\S+)/i,
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DocumentIntelligenceService {
  /**
   * Simulate OCR/text extraction from a document
   * In production, this would call Tesseract, AWS Textract, or similar
   */
  static async extractText(fileUrl: string, fileMimeType?: string): Promise<ExtractionResult> {
    logger.info('Text extraction started', { fileUrl, mimeType: fileMimeType });

    // Simulated extraction — in production, integrate actual OCR engine
    const result: ExtractionResult = {
      text: '',
      confidence: 0.0,
      language: 'en',
      pageCount: 1,
    };

    // For text-based formats (PDF, DOCX), use native extraction
    if (fileMimeType === 'text/plain' || fileMimeType === 'text/csv') {
      result.confidence = 0.99;
    } else if (fileMimeType === 'application/pdf') {
      result.confidence = 0.85;
    } else if (fileMimeType?.startsWith('image/')) {
      result.confidence = 0.75;
    } else {
      result.confidence = 0.6;
    }

    return result;
  }

  /**
   * Parse title block information from text
   */
  static parseTitleBlock(text: string): TitleBlockData | null {
    const block: Partial<TitleBlockData> = {};

    // Drawing number patterns
    const drawingPatterns = [
      /(?:drawing\s*(?:no\.?|number|#)|doc(?:ument)?\s*(?:no\.?|#))[:\s]*([A-Z0-9\-\/]+)/i,
      /(?:dwg|drg)\s*(?:no\.?|#)?[:\s]*([A-Z0-9\-\/]+)/i,
    ];
    for (const pattern of drawingPatterns) {
      const match = text.match(pattern);
      if (match) { block.drawingNumber = match[1]; break; }
    }

    // Title
    const titleMatch = text.match(/(?:title|description)[:\s]*([^\n]+)/i);
    if (titleMatch) block.title = titleMatch[1].trim();

    // Scale
    const scaleMatch = text.match(/scale[:\s]*([^\s,]+)/i);
    if (scaleMatch) block.scale = scaleMatch[1];

    // Revision
    const revMatch = text.match(/rev(?:ision)?[:\s]*([A-Z0-9]+)/i);
    if (revMatch) block.revision = revMatch[1];

    // Date
    const dateMatch = text.match(/(?:date|dated)[:\s]*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i);
    if (dateMatch) block.date = dateMatch[1];

    // Drawn by
    const drawnMatch = text.match(/(?:drawn\s*by|drafter)[:\s]*([A-Za-z\s]+)/i);
    if (drawnMatch) block.drawnBy = drawnMatch[1].trim();

    // Checked by
    const checkMatch = text.match(/(?:check(?:ed)?\s*by|reviewer)[:\s]*([A-Za-z\s]+)/i);
    if (checkMatch) block.checkedBy = checkMatch[1].trim();

    // Approved by
    const approveMatch = text.match(/(?:approv(?:ed)?\s*by)[:\s]*([A-Za-z\s]+)/i);
    if (approveMatch) block.approvedBy = approveMatch[1].trim();

    // Sheet number
    const sheetMatch = text.match(/(?:sheet|page)\s*(?:no\.?)?[:\s]*(\d+)\s*(?:of\s*(\d+))?/i);
    if (sheetMatch) {
      block.sheetNumber = sheetMatch[1];
      block.totalSheets = sheetMatch[2] || '1';
    }

    // Project name
    const projMatch = text.match(/(?:project|plant|facility)[:\s]*([^\n,]+)/i);
    if (projMatch) block.projectName = projMatch[1].trim();

    // Client
    const clientMatch = text.match(/(?:client|owner|company)[:\s]*([^\n,]+)/i);
    if (clientMatch) block.client = clientMatch[1].trim();

    // Material
    const matMatch = text.match(/(?:material|matl)[:\s]*([^\n,]+)/i);
    if (matMatch) block.material = matMatch[1].trim();

    // Weight
    const weightMatch = text.match(/(?:weight|wt)[:\s]*([^\n,]+(?:kg|lb|ton)s?)/i);
    if (weightMatch) block.weight = weightMatch[1].trim();

    if (!block.drawingNumber && !block.title) return null;

    return {
      drawingNumber: block.drawingNumber || '',
      title: block.title || '',
      scale: block.scale || '',
      revision: block.revision || '',
      date: block.date || '',
      drawnBy: block.drawnBy || '',
      checkedBy: block.checkedBy || '',
      approvedBy: block.approvedBy || '',
      projectName: block.projectName || '',
      client: block.client || '',
      sheetNumber: block.sheetNumber || '',
      totalSheets: block.totalSheets || '',
      material: block.material,
      weight: block.weight,
    };
  }

  /**
   * Extract key information from engineering document text
   */
  static extractKeyInformation(text: string): ExtractedMetadata {
    const result: ExtractedMetadata = {
      classifications: [],
      tags: [],
    };

    // Extract design parameters
    const params: DesignParameters = {};
    for (const [key, pattern] of Object.entries(SPEC_PATTERNS)) {
      const match = text.match(pattern);
      if (match) {
        (params as Record<string, string>)[key] = match[1].trim();
      }
    }
    result.designParameters = params;

    // Extract equipment list
    const equipmentList = this.extractEquipmentList(text);
    if (equipmentList.length > 0) {
      result.equipmentList = equipmentList;
    }

    // Extract tables
    result.tables = this.extractTables(text);

    // Extract materials
    const materialPatterns = [
      /(?:material|matl)[s:]?\s*([A-Za-z\s\-\+\.\/]+?)(?:\n|$)/gi,
    ];
    const materials: string[] = [];
    for (const pattern of materialPatterns) {
      let matMatch: RegExpExecArray | null;
      while ((matMatch = pattern.exec(text)) !== null) {
        if (matMatch[1].length > 2 && matMatch[1].length < 80) {
          materials.push(matMatch[1].trim());
        }
      }
    }
    if (materials.length > 0) result.materials = [...new Set(materials)];

    // Extract pressures
    const pressurePatterns = text.match(/\d+(?:\.\d+)?\s*(?:bar|psi|kPa|MPa|barg|psig)/gi);
    if (pressurePatterns) result.pressures = [...new Set(pressurePatterns)];

    // Extract temperatures
    const tempPatterns = text.match(/\-?\d+(?:\.\d+)?\s*°?[CFK]/gi);
    if (tempPatterns) result.temperatures = [...new Set(tempPatterns)];

    // Classify document
    const classification = this.classifyDocument(text);
    result.classifications = [`${classification.category} (${classification.confidence.toFixed(0)}%)`];
    result.tags = classification.tags;

    return result;
  }

  /**
   * Extract equipment list from text
   */
  static extractEquipmentList(text: string): ExtractedEquipment[] {
    const equipment: ExtractedEquipment[] = [];
    const tagPattern = /\b([A-Z]{1,3}[-\/]\d{1,4}[A-Z]?(?:[-\/][A-Z0-9]+)?)\b/g;
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(text)) !== null) {
      const tagNumber = match[1];
      const type = PidLinkingService.classifyTag(tagNumber);

      if (type === 'equipment' || type === 'instrument') {
        // Try to find a name near the tag
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(text.length, match.index + tagNumber.length + 80);
        const context = text.substring(contextStart, contextEnd);

        const nameMatch = context.match(new RegExp(`${tagNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(.{2,40})`, 'i'));

        equipment.push({
          tagNumber,
          name: nameMatch ? nameMatch[1].trim().split(/[\n,;]/)[0] : '',
          type,
          quantity: 1,
        });
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return equipment.filter(e => {
      if (seen.has(e.tagNumber)) return false;
      seen.add(e.tagNumber);
      return true;
    });
  }

  /**
   * Extract tables from text (simple heuristic-based extraction)
   */
  static extractTables(text: string): TableData[] {
    const tables: TableData[] = [];

    // Look for tab/newline-separated rows with consistent column count
    const lines = text.split('\n');
    const tableBlocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      const cellCount = (line.match(/\t/) || line.match(/\|/))?.length || 0;

      if (cellCount >= 2) {
        currentBlock.push(line);
      } else if (currentBlock.length >= 3) {
        tableBlocks.push([...currentBlock]);
        currentBlock = [];
      } else {
        currentBlock = [];
      }
    }
    if (currentBlock.length >= 3) tableBlocks.push(currentBlock);

    for (const block of tableBlocks) {
      const delimiter = block[0].includes('\t') ? '\t' : '|';
      const headers = block[0].split(delimiter).map(h => h.trim()).filter(Boolean);
      const rows = block.slice(1).map(r => r.split(delimiter).map(c => c.trim()));

      if (headers.length >= 2) {
        tables.push({ headers, rows, title: `Table ${tables.length + 1}` });
      }
    }

    return tables;
  }

  /**
   * Classify a document based on content analysis
   */
  static classifyDocument(text: string): ClassificationResult {
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};

    // Score each category
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      scores[category] = 0;
      for (const keyword of keywords) {
        const occurrences = (lowerText.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
        scores[category] += occurrences;
      }
    }

    // Normalize scores
    const totalKeywords = Object.values(CATEGORY_KEYWORDS).reduce((sum, kws) => sum + kws.length, 0);
    const maxScore = Math.max(...Object.values(scores), 1);

    const sortedCategories = Object.entries(scores)
      .map(([category, score]) => ({
        category,
        confidence: Math.min(score / Math.max(maxScore * 0.5, 1), 1),
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const best = sortedCategories[0];
    const alternatives = sortedCategories.slice(1, 4);

    // Generate tags
    const tags = this.generateTags(text);

    return {
      category: best.category,
      discipline: this.classifyDiscipline(text),
      confidence: best.confidence,
      alternatives,
      tags,
    };
  }

  /**
   * Classify the discipline of a document
   */
  static classifyDiscipline(text: string): string {
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [discipline, keywords] of Object.entries(DISCIPLINE_KEYWORDS)) {
      scores[discipline] = 0;
      for (const keyword of keywords) {
        const occurrences = (lowerText.match(new RegExp(keyword, 'gi')) || []).length;
        scores[discipline] += occurrences;
      }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  /**
   * Generate auto-tags from document content
   */
  static generateTags(text: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    // Equipment type tags
    const equipmentTypes = ['pump', 'compressor', 'vessel', 'tank', 'heat exchanger', 'tower', 'reactor', 'valve', 'motor', 'fan'];
    for (const type of equipmentTypes) {
      if (lowerText.includes(type)) tags.push(type);
    }

    // Process condition tags
    const conditions = ['high pressure', 'high temperature', 'corrosive', 'toxic', 'flammable', 'cryogenic', 'vacuum'];
    for (const condition of conditions) {
      if (lowerText.includes(condition)) tags.push(condition);
    }

    // Code/standard tags
    const standardPatterns = lowerText.match(/\b(?:asme|api|ansi|iso|astm|iec|nec|nfpa)\s*[-\/]?\s*[A-Z0-9]+/gi);
    if (standardPatterns) {
      tags.push(...new Set(standardPatterns.map(s => s.toUpperCase())));
    }

    // Material tags
    const materials = ['carbon steel', 'stainless steel', 'alloy', 'copper', 'aluminum', 'pvc', 'hdpe', 'cs', 'ss', 'inconel', 'hastelloy'];
    for (const mat of materials) {
      if (lowerText.includes(mat)) tags.push(mat);
    }

    return [...new Set(tags)].slice(0, 20);
  }

  /**
   * Find similar or near-duplicate documents
   */
  static async findSimilar(documentId: string, limit = 10): Promise<SimilarityResult[]> {
    const doc = await db.engineeringDocument.findUnique({
      where: { id: documentId },
      select: {
        title: true,
        description: true,
        category: true,
        extractedText: true,
        tags: true,
      },
    });

    if (!doc) throw new Error(`Document not found: ${documentId}`);

    // Combine all text for comparison
    const sourceText = [
      doc.title,
      doc.description || '',
      doc.extractedText || '',
      ...(Array.isArray(doc.tags) ? doc.tags as string[] : []),
    ].join(' ').toLowerCase();

    // Get candidate documents (same category优先)
    const candidates = await db.engineeringDocument.findMany({
      where: {
        id: { not: documentId },
        OR: [
          { category: doc.category },
          { title: { contains: doc.title.split(' ')[0] } },
        ],
      },
      select: {
        id: true,
        documentNumber: true,
        title: true,
        category: true,
        extractedText: true,
        tags: true,
        description: true,
      },
      take: 100,
    });

    const similarities: SimilarityResult[] = [];

    for (const candidate of candidates) {
      const candidateText = [
        candidate.title,
        candidate.description || '',
        candidate.extractedText || '',
        ...(Array.isArray(candidate.tags) ? candidate.tags as string[] : []),
      ].join(' ').toLowerCase();

      const similarity = this.calculateTextSimilarity(sourceText, candidateText);

      if (similarity > 0.1) {
        let matchType: SimilarityResult['matchType'] = 'related';
        if (similarity > 0.9) matchType = 'exact';
        else if (similarity > 0.7) matchType = 'near_duplicate';

        similarities.push({
          documentId: candidate.id,
          documentNumber: candidate.documentNumber,
          title: candidate.title,
          similarity: Math.round(similarity * 100) / 100,
          matchType,
        });
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit);
  }

  /**
   * Calculate text similarity using Jaccard-like coefficient
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const tokenize = (t: string) => new Set(t.split(/\s+/).filter(w => w.length > 2));

    const set1 = tokenize(text1);
    const set2 = tokenize(text2);

    if (set1.size === 0 || set2.size === 0) return 0;

    let intersection = 0;
    for (const word of set1) {
      if (set2.has(word)) intersection++;
    }

    return intersection / (set1.size + set2.size - intersection);
  }

  /**
   * Process a document: extract text, metadata, classify, and auto-tag
   */
  static async processDocument(documentId: string): Promise<ExtractedMetadata> {
    const doc = await db.engineeringDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    const text = doc.extractedText || '';

    // Extract title block
    const titleBlock = this.parseTitleBlock(text);

    // Extract key information
    const metadata = this.extractKeyInformation(text);

    // Merge title block into metadata
    metadata.titleBlock = titleBlock || undefined;

    // Update document with extracted data
    const classification = this.classifyDocument(text);
    const autoTags = classification.tags;

    await db.engineeringDocument.update({
      where: { id: documentId },
      data: {
        metadata: metadata as unknown as Record<string, unknown>,
        tags: autoTags,
      },
    });

    logger.info('Document processed', { documentId, category: classification.category });
    return metadata;
  }
}
