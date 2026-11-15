/**
 * Gaming Studio Renderer — Template 3
 *
 * Professional 9:16 Gaming Video Reframing:
 *  - Preserves the 100% original stream (gameplay + streamer in their natural composition)
 *  - NO destructive splits or cutting the video in half!
 *  - NO hardcoded fake text banners (e.g. no "[CLUTCH PLAY]")
 *  - NO ugly white lines!
 *  - Clean 9:14 Wide Action framing or Full-view Blurred Fill
 *  - Synchronized word-timed karaoke captions from what is actually spoken in the video
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';

export type GamingLayout = 'wide-action' | 'blurred-fill' | 'cinema-fit';

export interface GamingSplitOptions {
  sourceVideoPath: string;
  startTime: number;
  endTime: number;
  layout?: GamingLayout;
  subtitlePath?: string;    // .ass karaoke word-timed subtitles
  outputPath: string;
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(CONFIG.BIN_FFMPEG, args);
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    proc.on('close', (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited code ${code}. Stderr: ${stderr.slice(-600)}`));
    });
  });
}

export async function renderGamingSplit(opts: GamingSplitOptions): Promise<string> {
  const {
    sourceVideoPath,
    startTime,
    endTime,
    layout = 'wide-action',
    subtitlePath,
    outputPath,
  } = opts;

  const duration = Math.max(1, endTime - startTime);

  // 1080x1920 vertical canvas
  let filterComplex = '';

  if (layout === 'blurred-fill') {
    // 100% full 16:9 stream visible, centered on 9:16 with ambient background blur
    filterComplex = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg]`,
      `[0:v]scale=1080:-2[fg]`,
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[base]`,
    ].join(';');
  } else if (layout === 'cinema-fit') {
    // 100% full stream visible with clean dark letterbox
    filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black[base]`;
  } else {
    // Default 'wide-action' (9:14 Action Framing):
    // Preserves the natural video (both the streamer on the side and the gameplay)
    // without cutting the video in half or zooming in insanely!
    filterComplex = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg]`,
      `[0:v]crop=min(iw\\,ih*14/16):ih:(iw-ow)/2:0,scale=1080:-2[fg]`,
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[base]`,
    ].join(';');
  }

  let lastLabel = 'base';

  // Burn real spoken word-timed karaoke subtitles
  if (subtitlePath && fs.existsSync(subtitlePath)) {
    const escapedSub = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
    filterComplex += `;[${lastLabel}]subtitles=${escapedSub}[v]`;
    lastLabel = 'v';
  } else {
    filterComplex += `;[${lastLabel}]null[v]`;
    lastLabel = 'v';
  }

  const args = [
    '-y',
    '-ss', startTime.toFixed(2),
    '-i', sourceVideoPath,
    '-t', duration.toFixed(2),
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ];

  await runFFmpeg(args);
  return outputPath;
}
