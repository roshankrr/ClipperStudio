import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';

export interface DownloadResult {
  videoPath: string;
  title: string;
  duration?: number;
}

export async function downloadVideo(
  url: string,
  outputPrefix: string,
  onProgress?: (progress: number, message: string) => void
): Promise<DownloadResult> {
  const outputPath = path.join(CONFIG.VIDEOS_DIR, `${outputPrefix}.mp4`);

  // First fetch metadata (title, duration)
  const metaArgs = [
    CONFIG.BIN_YTDLP,
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--ffmpeg-location',
    CONFIG.BIN_FFMPEG,
    url,
  ];
  let metaJson = '';
  let metaErr = '';

  await new Promise<void>((resolve, reject) => {
    const p = spawn('python3', metaArgs);
    p.stdout.on('data', (d) => (metaJson += d.toString()));
    p.stderr.on('data', (d) => {
      metaErr += d.toString();
    });
    p.on('close', (code) => {
      if (code === 0 && metaJson.trim()) resolve();
      else reject(new Error(`yt-dlp metadata failed with code ${code}: ${metaErr.slice(-300)}`));
    });
  });

  let title = 'Downloaded Video';
  let duration = 0;
  try {
    // Extract the JSON line from stdout
    const jsonLine = metaJson
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('{') && l.endsWith('}'));

    if (jsonLine) {
      const meta = JSON.parse(jsonLine);
      title = meta.title || title;
      duration = meta.duration || 0;
    }
  } catch (err) {
    console.warn('Could not parse yt-dlp metadata JSON:', err);
  }

  // Now download video (format: max 1080p MP4)
  const downloadArgs = [
    CONFIG.BIN_YTDLP,
    '--no-playlist',
    '--ffmpeg-location',
    CONFIG.BIN_FFMPEG,
    '-f',
    'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format',
    'mp4',
    '-o',
    outputPath,
    url,
  ];

  onProgress?.(15, `Downloading: ${title.slice(0, 40)}...`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('python3', downloadArgs);
    let downloadErr = '';

    proc.stdout.on('data', (data) => {
      const str = data.toString();
      // Parse yt-dlp download percentage e.g. [download]  45.0% of ...
      const match = str.match(/\[download\]\s+([\d\.]+)%/);
      if (match) {
        const pct = parseFloat(match[1]);
        onProgress?.(Math.min(40, 15 + (pct * 0.25)), `Downloading: ${pct.toFixed(0)}%`);
      }
    });

    proc.stderr.on('data', (data) => {
      downloadErr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error(`yt-dlp download failed with exit code ${code}: ${downloadErr.slice(-300)}`));
      }
    });
  });

  return {
    videoPath: outputPath,
    title,
    duration,
  };
}
