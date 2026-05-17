// ============================================================================
// AI DOCUMENT SEARCH SERVICE
// Natural language search, semantic matching, relevance scoring,
// search highlighting, faceted filters, analytics, recommendations
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AiDocumentSearchService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
  userId?: string;
}

export interface SearchFilters {
  category?: string;
  status?: string;
  discipline?: string;
  plantId?: string;
  area?: string;
  dateFrom?: string;
  dateTo?: string;
  createdById?: string;
  tags?: string[];
  hasAttachments?: boolean;
  folderPath?: string;
}

export interface SearchResult {
  id: string;
  documentNumber: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  discipline: string | null;
  plantId: string | null;
  area: string | null;
  version: number;
  revision: string;
  fileSize: number | null;
  tags: unknown;
  createdAt: Date;
  updatedAt: Date;
  score: number;
  highlights: Highlight[];
}

export interface Highlight {
  field: string;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: SearchFacets;
  queryInterpretation: QueryInterpretation;
}

export interface SearchFacets {
  categories: { value: string; count: number }[];
  statuses: { value: string; count: number }[];
  disciplines: { value: string; count: number }[];
  plants: { value: string; count: number }[];
  areas: { value: string; count: number }[];
}

export interface QueryInterpretation {
  originalQuery: string;
  normalizedQuery: string;
  extractedTerms: string[];
  entityTypes: string[];
  intent: 'find_document' | 'find_equipment' | 'find_procedure' | 'find_specification' | 'general';
}

export interface SearchAnalytics {
  popularSearches: { query: string; count: number }[];
  zeroResultSearches: { query: string; count: number }[];
  recentSearches: { query: string; count: number; lastSearchAt: Date }[];
}

export interface DocumentRecommendation {
  id: string;
  documentNumber: string;
  title: string;
  category: string;
  score: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Stop words and synonyms
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
  'or', 'if', 'while', 'about', 'up', 'it', 'its', 'this', 'that',
  'these', 'those', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him',
  'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which', 'who',
]);

const INTENT_KEYWORDS: Record<string, string[]> = {
  find_document: ['document', 'drawing', 'file', 'document', 'doc'],
  find_equipment: ['pump', 'p&id', 'pid', 'equipment', 'instrument', 'tag', 'asset', 'p-101', 'v-201', 'motor'],
  find_procedure: ['procedure', 'sop', 'method', 'instruction', 'work instruction', 'start-up', 'shutdown'],
  find_specification: ['specification', 'spec', 'datasheet', 'data sheet', 'standard', 'code', 'api', 'asme'],
};

const TAG_SYNONYMS: Record<string, string[]> = {
  'p&id': ['piping and instrumentation', 'pid', 'p&id diagram', 'process diagram'],
  'pump': ['pump', 'centrifugal', 'reciprocating', 'positive displacement'],
  'valve': ['valve', 'gate', 'globe', 'ball', 'check', 'butterfly', 'control valve'],
  'heat exchanger': ['heat exchanger', 'hx', 'exchanger', 'shell and tube', 'plate'],
  'vessel': ['vessel', 'tank', 'tower', 'column', 'drum', 'separator'],
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AiDocumentSearchService {
  /**
   * Main search method — natural language query with faceted filters
   */
  static async search(input: SearchQuery): Promise<SearchResponse> {
    const {
      query,
      filters = {},
      page = 1,
      limit = 20,
      userId,
    } = input;

    const interpretation = this.interpretQuery(query);

    // Build Prisma where clause
    const where: Record<string, unknown> = {};

    // Text search across multiple fields
    if (interpretation.extractedTerms.length > 0) {
      const termConditions = interpretation.extractedTerms.map(term => [
        { title: { contains: term } },
        { description: { contains: term } },
        { documentNumber: { contains: term } },
        { extractedText: { contains: term } },
      ]).flat();

      // Also search in tags (JSON field)
      const tagConditions = interpretation.extractedTerms.map(term => ({
        tags: { path: '$', string_contains: term },
      }));

      where.OR = [...termConditions, ...tagConditions];
    }

    // Apply filters
    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;
    if (filters.discipline) where.discipline = filters.discipline;
    if (filters.plantId) where.plantId = filters.plantId;
    if (filters.area) where.area = filters.area;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.folderPath) where.folderPath = { startsWith: filters.folderPath };
    if (filters.hasAttachments) where.fileUrl = { not: null };

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(filters.dateTo);
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { path: '$', array_contains: filters.tags };
    }

    // Execute search
    const [total, documents, facets] = await Promise.all([
      db.engineeringDocument.count({ where: Object.keys(where).length > 0 ? where : undefined }),
      this.executeSearch(where, interpretation, page, limit),
      this.getFacets(where),
    ]);

    // Log search
    if (userId) {
      await db.documentSearchLog.create({
        data: {
          userId,
          query: query,
          filters: filters as Record<string, unknown>,
          resultCount: total,
          zeroResults: total === 0,
        },
      }).catch(() => { /* non-critical */ });
    }

    logger.info('Document search completed', {
      query,
      results: total,
      intent: interpretation.intent,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      results: documents,
      total,
      page,
      limit,
      totalPages,
      facets,
      queryInterpretation: interpretation,
    };
  }

  /**
   * Execute search with relevance scoring and highlighting
   */
  private static async executeSearch(
    where: Record<string, unknown>,
    interpretation: QueryInterpretation,
    page: number,
    limit: number,
  ): Promise<SearchResult[]> {
    const documents = await db.engineeringDocument.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    // Score and highlight each result
    const results = documents.map(doc => {
      const score = this.calculateRelevanceScore(doc, interpretation);
      const highlights = this.generateHighlights(doc, interpretation.extractedTerms);

      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        status: doc.status,
        discipline: doc.discipline,
        plantId: doc.plantId,
        area: doc.area,
        version: doc.version,
        revision: doc.revision,
        fileSize: doc.fileSize,
        tags: doc.tags,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        score,
        highlights,
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Calculate relevance score for a document against a query
   */
  private static calculateRelevanceScore(
    doc: Record<string, unknown>,
    interpretation: QueryInterpretation,
  ): number {
    let score = 0;
    const terms = interpretation.extractedTerms;
    const title = (doc.title as string).toLowerCase();
    const description = ((doc.description as string) || '').toLowerCase();
    const docNumber = (doc.documentNumber as string).toLowerCase();
    const extractedText = ((doc.extractedText as string) || '').toLowerCase();

    for (const term of terms) {
      const lowerTerm = term.toLowerCase();

      // Title matches — highest weight
      if (title === lowerTerm) score += 20;
      else if (title.includes(lowerTerm)) score += 10;

      // Document number match
      if (docNumber.includes(lowerTerm)) score += 15;

      // Description match
      if (description.includes(lowerTerm)) score += 5;

      // Full text match
      const textOccurrences = extractedText.split(lowerTerm).length - 1;
      score += Math.min(textOccurrences, 10) * 0.5;

      // Category match
      if ((doc.category as string).includes(lowerTerm)) score += 3;
    }

    // Boost for status: issued/approved documents get a small boost
    if ((doc.status as string) === 'issued') score += 0.5;

    return Math.round(score * 100) / 100;
  }

  /**
   * Generate search result highlights
   */
  private static generateHighlights(
    doc: Record<string, unknown>,
    terms: string[],
  ): Highlight[] {
    const highlights: Highlight[] = [];

    const addHighlight = (field: string, text: string) => {
      if (!text) return;
      for (const term of terms) {
        const idx = text.toLowerCase().indexOf(term.toLowerCase());
        if (idx >= 0) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(text.length, idx + term.length + 40);
          const snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
          highlights.push({ field, snippet });
          return; // One highlight per field
        }
      }
    };

    addHighlight('title', doc.title as string);
    addHighlight('description', doc.description as string);

    // For extracted text, only show first 2 matches
    const extractedText = doc.extractedText as string;
    if (extractedText) {
      for (const term of terms) {
        const idx = extractedText.toLowerCase().indexOf(term.toLowerCase());
        if (idx >= 0) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(extractedText.length, idx + term.length + 60);
          const snippet = (start > 0 ? '...' : '') + extractedText.substring(start, end) + (end < extractedText.length ? '...' : '');
          highlights.push({ field: 'content', snippet });
          if (highlights.filter(h => h.field === 'content').length >= 2) break;
        }
      }
    }

    return highlights;
  }

  /**
   * Interpret natural language query — extract terms, detect intent
   */
  static interpretQuery(query: string): QueryInterpretation {
    // Normalize: lowercase, remove extra whitespace
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');

    // Tokenize and remove stop words
    const rawTerms = normalizedQuery.split(/\s+/);
    const extractedTerms = rawTerms
      .filter(term => !STOP_WORDS.has(term) && term.length > 1)
      .map(term => term.replace(/[.,;:!?()[\]{}"']/g, ''));

    // Detect intent
    let intent: QueryInterpretation['intent'] = 'general';
    let maxIntentScore = 0;

    for (const [intentType, keywords] of Object.entries(INTENT_KEYWORDS)) {
      const score = keywords.reduce((sum, kw) => {
        return sum + (normalizedQuery.includes(kw) ? 1 : 0);
      }, 0);
      if (score > maxIntentScore) {
        maxIntentScore = score;
        intent = intentType as QueryInterpretation['intent'];
      }
    }

    // Detect entity types mentioned
    const entityTypes: string[] = [];
    if (/p[-&]?id/i.test(query)) entityTypes.push('p_id');
    if (/pump|compressor|vessel|tank|motor/i.test(query)) entityTypes.push('equipment');
    if (/transmitter|controller|valve|sensor/i.test(query)) entityTypes.push('instrument');
    if (/spec|datasheet|standard|api|asme/i.test(query)) entityTypes.push('specification');
    if (/sop|procedure|method|instruction/i.test(query)) entityTypes.push('procedure');

    // Expand with synonyms
    const expandedTerms = [...extractedTerms];
    for (const term of extractedTerms) {
      for (const [key, synonyms] of Object.entries(TAG_SYNONYMS)) {
        if (synonyms.some(s => s.includes(term) || term.includes(s))) {
          expandedTerms.push(key);
        }
      }
    }

    return {
      originalQuery: query,
      normalizedQuery,
      extractedTerms: [...new Set(expandedTerms)],
      entityTypes,
      intent,
    };
  }

  /**
   * Get faceted counts for filter refinement
   */
  private static async getFacets(where: Record<string, unknown>): Promise<SearchFacets> {
    // Get all documents matching the where clause (limited for performance)
    const docs = await db.engineeringDocument.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
        category: true,
        status: true,
        discipline: true,
        plantId: true,
        area: true,
      },
      take: 1000,
    });

    const countBy = (field: string) => {
      const counts: Record<string, number> = {};
      for (const doc of docs) {
        const val = (doc as Record<string, unknown>)[field] as string;
        if (val) {
          counts[val] = (counts[val] || 0) + 1;
        }
      }
      return Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      categories: countBy('category'),
      statuses: countBy('status'),
      disciplines: countBy('discipline'),
      plants: countBy('plantId'),
      areas: countBy('area'),
    };
  }

  /**
   * Get search analytics — popular searches, zero-result searches, recent
   */
  static async getAnalytics(): Promise<SearchAnalytics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Popular searches
    const popularRaw = await db.documentSearchLog.groupBy({
      by: ['query'],
      where: { createdAt: { gte: thirtyDaysAgo }, zeroResults: false },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    // Zero-result searches
    const zeroRaw = await db.documentSearchLog.groupBy({
      by: ['query'],
      where: { createdAt: { gte: thirtyDaysAgo }, zeroResults: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Recent searches
    const recentRaw = await db.documentSearchLog.groupBy({
      by: ['query'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: 10,
    });

    return {
      popularSearches: popularRaw.map(r => ({ query: r.query, count: r._count.id })),
      zeroResultSearches: zeroRaw.map(r => ({ query: r.query, count: r._count.id })),
      recentSearches: recentRaw.map(r => ({
        query: r.query,
        count: r._count.id,
        lastSearchAt: r._max.createdAt!,
      })),
    };
  }

  /**
   * Recommend related documents based on a source document
   */
  static async recommend(documentId: string, limit = 5): Promise<DocumentRecommendation[]> {
    const doc = await db.engineeringDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        documentNumber: true,
        title: true,
        category: true,
        discipline: true,
        plantId: true,
        area: true,
        tags: true,
        extractedText: true,
      },
    });

    if (!doc) throw new Error(`Document not found: ${documentId}`);

    // Find similar documents based on category, discipline, plant, and tags
    const candidates = await db.engineeringDocument.findMany({
      where: {
        id: { not: documentId },
        OR: [
          { category: doc.category },
          { discipline: doc.discipline },
          { plantId: doc.plantId },
        ],
      },
      select: {
        id: true,
        documentNumber: true,
        title: true,
        category: true,
        discipline: true,
        tags: true,
        extractedText: true,
      },
      take: 50,
    });

    const recommendations: DocumentRecommendation[] = [];

    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];

      // Same category
      if (candidate.category === doc.category) {
        score += 3;
        reasons.push('same category');
      }

      // Same discipline
      if (candidate.discipline === doc.discipline && doc.discipline) {
        score += 2;
        reasons.push('same discipline');
      }

      // Shared tags
      const docTags = new Set(Array.isArray(doc.tags) ? (doc.tags as string[]) : []);
      const candidateTags = new Set(Array.isArray(candidate.tags) ? (candidate.tags as string[]) : []);
      const sharedTags = [...docTags].filter(t => candidateTags.has(t));
      if (sharedTags.length > 0) {
        score += sharedTags.length * 1.5;
        reasons.push(`shared tags: ${sharedTags.slice(0, 3).join(', ')}`);
      }

      // Text similarity (simple word overlap)
      const docWords = new Set((doc.extractedText || '').toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const candidateWords = new Set((candidate.extractedText || '').toLowerCase().split(/\s+/).filter(w => w.length > 3));
      let overlap = 0;
      for (const word of docWords) {
        if (candidateWords.has(word)) overlap++;
      }
      if (overlap > 0) {
        score += Math.min(overlap * 0.2, 2);
        reasons.push('similar content');
      }

      if (score > 1) {
        recommendations.push({
          id: candidate.id,
          documentNumber: candidate.documentNumber,
          title: candidate.title,
          category: candidate.category,
          score: Math.round(score * 100) / 100,
          reason: reasons[0],
        });
      }
    }

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit);
  }

  /**
   * Log a click-through event for analytics
   */
  static async logClick(userId: string, query: string, clickedDocumentId: string) {
    await db.documentSearchLog.create({
      data: {
        userId,
        query,
        clickedDocumentId,
        resultCount: 1,
        zeroResults: false,
      },
    }).catch(() => { /* non-critical */ });
  }
}
