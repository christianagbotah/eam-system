import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { PidLinkingService, type TagExtractionResult, type LinkTagInput } from '@/services/documents/pidLinking.service';

/**
 * POST /api/documents/pid/link
 * Link P&ID tags to assets — single or bulk
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { documentId, tags, action } = body;

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'documentId is required' }, { status: 400 });
    }

    if (action === 'bulk_link') {
      // Bulk link from extraction results
      if (!Array.isArray(tags)) {
        return NextResponse.json({ success: false, error: 'tags array is required for bulk_link' }, { status: 400 });
      }
      const result = await PidLinkingService.bulkLinkTags(documentId, tags as TagExtractionResult[]);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'resolve') {
      // Auto-resolve unlinked tags to assets
      const result = await PidLinkingService.resolveTagsToAssets(documentId);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'verify') {
      // Verify a specific tag link
      const { linkId, isVerified } = body;
      if (!linkId) {
        return NextResponse.json({ success: false, error: 'linkId is required for verify' }, { status: 400 });
      }
      const result = await PidLinkingService.verifyTag(linkId, session.userId, isVerified ?? true);
      return NextResponse.json({ success: true, data: result });
    }

    // Default: single link
    const linkInput: LinkTagInput = {
      documentId,
      tagNumber: body.tagNumber,
      tagType: body.tagType,
      assetId: body.assetId,
      x: body.x,
      y: body.y,
    };

    if (!linkInput.tagNumber) {
      return NextResponse.json({ success: false, error: 'tagNumber is required' }, { status: 400 });
    }

    const result = await PidLinkingService.linkTag(linkInput);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to link P&ID tags';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
