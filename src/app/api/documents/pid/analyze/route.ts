import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { PidLinkingService } from '@/services/documents/pidLinking.service';

/**
 * GET /api/documents/pid/analyze?documentId=xxx
 * Get P&ID analysis results, markup data, and change impact analysis
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const view = searchParams.get('view') || 'analysis'; // analysis | markup | impact | lines | asset_docs

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'documentId is required' }, { status: 400 });
    }

    switch (view) {
      case 'analysis': {
        const result = await PidLinkingService.analyzeDocument(documentId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'markup': {
        const result = await PidLinkingService.generateMarkupData(documentId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'impact': {
        const result = await PidLinkingService.analyzeChangeImpact(documentId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'lines': {
        const result = await PidLinkingService.getLineNumbers(documentId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'asset_docs': {
        const assetId = searchParams.get('assetId');
        if (!assetId) {
          return NextResponse.json({ success: false, error: 'assetId is required for asset_docs view' }, { status: 400 });
        }
        const result = await PidLinkingService.getDocumentsForAsset(assetId);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown view: ${view}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to analyze P&ID';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
