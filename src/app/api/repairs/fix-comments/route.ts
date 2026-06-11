import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

// POST /api/repairs/fix-comments
// One-time repair: replace raw userId UUIDs in comment text with actual fullName.
// E.g. "[Verification] Verified by cmq3r6ttf017w89sims65hmld" → "[Verification] Verified by Ama Supervisor"
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (!isAdmin(session)) return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });

    // Find all comments containing a userId-like UUID pattern
    // UUID format: 25+ char hex string
    const comments = await db.workOrderComment.findMany({
      where: {
        content: { contains: 'cmq3r6ttf017w89sims65hmld' }, // Catch known UUID
      },
      select: { id: true, content: true, userId: true },
    });

    if (comments.length === 0) {
      return NextResponse.json({ success: true, fixed: 0, message: 'No UUIDs found in comments' });
    }

    // Also do a broader search for any UUID-like patterns
    const allComments = await db.workOrderComment.findMany({
      select: { id: true, content: true, userId: true },
    });

    const uuidRegex = /\b[a-z0-9]{25,}\b/g;
    let fixed = 0;

    for (const comment of allComments) {
      const matches = comment.content.match(uuidRegex);
      if (!matches) continue;

      // Fetch the user for this comment
      if (!comment.userId) continue;
      const user = await db.user.findUnique({ where: { id: comment.userId }, select: { id: true, fullName: true } });
      if (!user) continue;

      let newContent = comment.content;
      // Replace each UUID with the user's full name
      for (const uuid of matches) {
        newContent = newContent.replace(uuid, user.fullName);
      }

      if (newContent !== comment.content) {
        await db.workOrderComment.update({
          where: { id: comment.id },
          data: { content: newContent },
        });
        fixed++;
      }
    }

    return NextResponse.json({ success: true, fixed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fix comments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
