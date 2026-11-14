import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { processVideoJob } from '@/lib/orchestrator';
import { CONFIG } from '@/lib/config';
import { CaptionStyle, FrameLayout } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { url, captionStyle = 'bounce', frameLayout = 'blurred-fill' } = body;

      if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }

      const job = await processVideoJob({
        sourceUrl: url,
        captionStyle: captionStyle as CaptionStyle,
        frameLayout: frameLayout as FrameLayout,
      });

      return NextResponse.json({ job });
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const captionStyle = (formData.get('captionStyle') as CaptionStyle) || 'bounce';
      const frameLayout = (formData.get('frameLayout') as FrameLayout) || 'blurred-fill';

      if (!file) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const tempFilename = `upload_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9\._-]/g, '_')}`;
      const savedPath = path.join(CONFIG.VIDEOS_DIR, tempFilename);

      if (!fs.existsSync(CONFIG.VIDEOS_DIR)) {
        fs.mkdirSync(CONFIG.VIDEOS_DIR, { recursive: true });
      }
      fs.writeFileSync(savedPath, buffer);

      const job = await processVideoJob({
        uploadedFilePath: savedPath,
        originalFilename: file.name,
        captionStyle,
        frameLayout,
      });

      return NextResponse.json({ job });
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/process:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
