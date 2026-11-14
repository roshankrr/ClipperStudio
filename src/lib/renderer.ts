import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { FrameLayout } from './types';

export interface RenderClipOptions {
  sourceVideoPath: string;
  startTime: number;
  endTime: number;
  subtitlePath?: string;
  layout: FrameLayout;
  outputClipPath: string;
}

export async function renderVerticalClip({
  sourceVideoPath,
  startTime,
  endTime,
  subtitlePath,
  layout,
  outputClipPath,
}: RenderClipOptions): Promise<string> {
  const duration = Math.max(1, endTime - startTime);

  // Construct FFmpeg complex filter for 9:16 vertical layout
  let filterString = '';

  if (layout === 'blurred-fill') {
    // Background: scale and crop to 1080x1920 with strong blur
    // Foreground: scale width to 1080 preserving aspect ratio
    // Overlay foreground centered onto blurred background
    filterString = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg]`,
      `[0:v]scale=1080:-2[fg]`,
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[base]`,
    ].join(';');
  } else if (layout === 'center-crop') {
    filterString = `[0:v]crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920[base]`;
  } else {
    // Default blurred-fill
    filterString = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg]`,
      `[0:v]scale=1080:-2[fg]`,
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[base]`,
    ].join(';');
  }

  // If subtitles are provided, burn them onto the [base] layer
  if (subtitlePath && fs.existsSync(subtitlePath)) {
    // Escape path for ffmpeg filter: escape colons and backslashes
    const escapedSubPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
    filterString += `;[base]subtitles=${escapedSubPath}[v]`;
  } else {
    filterString += `;[base]null[v]`;
  }

  const args = [
    '-y',
    '-ss',
    startTime.toFixed(2),
    '-i',
    sourceVideoPath,
    '-t',
    duration.toFixed(2),
    '-filter_complex',
    filterString,
    '-map',
    '[v]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputClipPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(CONFIG.BIN_FFMPEG, args);
    let stderr = '';

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputClipPath)) {
        resolve();
      } else {
        reject(
          new Error(
            `FFmpeg render failed with exit code ${code}. Stderr: ${stderr.slice(-500)}`
          )
        );
      }
    });
  });

  return outputClipPath;
}
