import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const buf = readFileSync(join(process.cwd(), 'public', 'WO-Workflow-Presentation.pptx'));
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': 'attachment; filename="iAssetsPro-WO-Workflow-Presentation.pptx"',
      'Content-Length': String(buf.length),
    },
  });
}
