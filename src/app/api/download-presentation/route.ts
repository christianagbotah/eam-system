import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'public', 'WO-Workflow-Presentation.pptx');

export async function GET(request: NextRequest) {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(FILE_PATH);
    const fileName = 'iAssetsPro-WO-Workflow-Presentation.pptx';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error('Error serving PPTX:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}