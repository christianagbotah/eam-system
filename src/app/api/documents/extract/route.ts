import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { DocumentIntelligenceService } from '@/services/documents/documentIntelligence.service';
import { PidLinkingService } from '@/services/documents/pidLinking.service';
import { AiDocumentSearchService } from '@/services/documents/aiDocumentSearch.service';

/**
 * POST /api/documents/extract
 * Extract text, metadata, classify, and auto-tag from a document
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { documentId, text, action } = body;

    if (action === 'extract_tags') {
      // Extract equipment/instrument tags from provided text
      if (!text) {
        return NextResponse.json({ success: false, error: 'text is required for extract_tags' }, { status: 400 });
      }
      const tags = PidLinkingService.extractTags(text);
      return NextResponse.json({ success: true, data: tags });
    }

    if (action === 'classify') {
      // Classify document by content
      if (!text) {
        return NextResponse.json({ success: false, error: 'text is required for classify' }, { status: 400 });
      }
      const classification = DocumentIntelligenceService.classifyDocument(text);
      return NextResponse.json({ success: true, data: classification });
    }

    if (action === 'parse_title_block') {
      // Parse title block from text
      if (!text) {
        return NextResponse.json({ success: false, error: 'text is required for parse_title_block' }, { status: 400 });
      }
      const titleBlock = DocumentIntelligenceService.parseTitleBlock(text);
      return NextResponse.json({ success: true, data: titleBlock });
    }

    if (action === 'extract_key_info') {
      // Extract key engineering information
      if (!text) {
        return NextResponse.json({ success: false, error: 'text is required for extract_key_info' }, { status: 400 });
      }
      const metadata = DocumentIntelligenceService.extractKeyInformation(text);
      return NextResponse.json({ success: true, data: metadata });
    }

    if (action === 'extract_tables') {
      // Extract tables from text
      if (!text) {
        return NextResponse.json({ success: false, error: 'text is required for extract_tables' }, { status: 400 });
      }
      const tables = DocumentIntelligenceService.extractTables(text);
      return NextResponse.json({ success: true, data: tables });
    }

    if (action === 'find_similar') {
      // Find similar documents
      if (!documentId) {
        return NextResponse.json({ success: false, error: 'documentId is required for find_similar' }, { status: 400 });
      }
      const limit = body.limit || 10;
      const similar = await DocumentIntelligenceService.findSimilar(documentId, limit);
      return NextResponse.json({ success: true, data: similar });
    }

    if (action === 'recommend') {
      // Get document recommendations
      if (!documentId) {
        return NextResponse.json({ success: false, error: 'documentId is required for recommend' }, { status: 400 });
      }
      const limit = body.limit || 5;
      const recommendations = await AiDocumentSearchService.recommend(documentId, limit);
      return NextResponse.json({ success: true, data: recommendations });
    }

    if (action === 'analytics') {
      // Get search analytics
      const analytics = await AiDocumentSearchService.getAnalytics();
      return NextResponse.json({ success: true, data: analytics });
    }

    // Default: full document processing (requires documentId)
    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: 'documentId is required. Provide action parameter for text-only operations.',
      }, { status: 400 });
    }

    const metadata = await DocumentIntelligenceService.processDocument(documentId);
    return NextResponse.json({ success: true, data: metadata });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to extract document info';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
