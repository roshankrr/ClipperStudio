import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '@/lib/config';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clipId = params.id;
  const clipPath = path.join(CONFIG.CLIPS_DIR, `${clipId}.mp4`);

  if (!fs.existsSync(clipPath)) {
    return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
  }

  const stat = fs.statSync(clipPath);
  const fileSize = stat.size;
  const range = req.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(clipPath, { start, end });

    // Convert node stream to web ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(readable, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
      },
    });
  }

  const fileStream = fs.createReadStream(clipPath);
  const readable = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', (err) => controller.error(err));
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'video/mp4',
      'Content-Disposition': `inline; filename="${clipId}.mp4"`,
    },
  });
}
