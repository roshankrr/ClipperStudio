import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { HeatmapPoint, TranscriptSegment } from './types';

export interface VideoMetadata {
  title: string;
  duration: number;
  heatmap?: HeatmapPoint[];
}

export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
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
    p.stderr.on('data', (d) => (metaErr += d.toString()));
    p.on('close', (code) => {
      if (code === 0 && metaJson.trim()) resolve();
      else reject(new Error(`Failed to fetch metadata (code ${code}): ${metaErr.slice(-250)}`));
    });
  });

  let title = 'Stream Video';
  let duration = 0;
  let heatmap: HeatmapPoint[] | undefined = undefined;

  try {
    const jsonLine = metaJson
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('{') && l.endsWith('}'));

    if (jsonLine) {
      const meta = JSON.parse(jsonLine);
      title = meta.title || title;
      duration = meta.duration || 0;
      if (Array.isArray(meta.heatmap) && meta.heatmap.length > 0) {
        heatmap = meta.heatmap;
      }
    }
  } catch (err) {
    console.warn('Could not parse metadata JSON:', err);
  }

  return { title, duration, heatmap };
}

/**
 * Attempts to extract YouTube native/auto-generated captions first with word timestamps.
 * Returns TranscriptSegment[] if available, or null to fall back to Whisper.
 */
export async function tryFetchYouTubeSubtitles(
  url: string,
  outputPrefix: string
): Promise<TranscriptSegment[] | null> {
  const subFilePrefix = path.join(CONFIG.SUBS_DIR, `ytsub_${outputPrefix}`);
  const args = [
    CONFIG.BIN_YTDLP,
    '--no-playlist',
    '--no-warnings',
    '--skip-download',
    '--write-auto-sub',
    '--write-sub',
    '--sub-lang',
    'en.*,en',
    '--sub-format',
    'json3',
    '-o',
    `${subFilePrefix}.%(ext)s`,
    url,
  ];

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', args);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp sub exit ${code}`));
      });
    });

    const dirFiles = fs.readdirSync(CONFIG.SUBS_DIR);
    const subFile = dirFiles.find(
      (f) => f.startsWith(`ytsub_${outputPrefix}`) && f.endsWith('.json3')
    );

    if (!subFile) return null;

    const fullPath = path.join(CONFIG.SUBS_DIR, subFile);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const parsed = JSON.parse(content);

    if (!parsed.events || !Array.isArray(parsed.events)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {}
      return null;
    }

    const segments: TranscriptSegment[] = [];
    let segIdx = 0;

    for (const event of parsed.events) {
      if (!event.segs || event.tStartMs === undefined) continue;
      const startSec = event.tStartMs / 1000;
      const durSec = (event.dDurationMs || 0) / 1000;
      const text = event.segs.map((s: any) => s.utf8 || '').join('').trim();
      if (!text || text === '\n') continue;

      const words = event.segs
        .filter((s: any) => s.utf8 && s.utf8.trim().length > 0 && s.utf8 !== '\n')
        .map((s: any) => {
          const wStart = (event.tStartMs + (s.tOffsetMs || 0)) / 1000;
          return {
            word: s.utf8.trim(),
            start: wStart,
            end: wStart + 0.35,
          };
        });

      segments.push({
        id: segIdx++,
        start: startSec,
        end: startSec + durSec,
        text,
        words: words.length > 0 ? words : undefined,
      });
    }

    try {
      fs.unlinkSync(fullPath);
    } catch {}

    return segments.length > 0 ? segments : null;
  } catch (err) {
    return null;
  }
}

/**
 * Downloads speech-optimized mono 16kHz audio stream
 */
export async function downloadAudioOnly(
  url: string,
  outputPrefix: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const outputPath = path.join(CONFIG.AUDIO_DIR, `${outputPrefix}.mp3`);

  const args = [
    CONFIG.BIN_YTDLP,
    '--no-playlist',
    '--no-warnings',
    '--ffmpeg-location',
    CONFIG.BIN_FFMPEG,
    '-f',
    'ba/b',
    '-x',
    '--audio-format',
    'mp3',
    '--postprocessor-args',
    'ExtractAudio:-ar 16000 -ac 1 -b:a 32k',
    '-o',
    outputPath,
    url,
  ];

  onProgress?.(15, 'Downloading speech-optimized audio stream...');

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('python3', args);
    let err = '';

    proc.stdout.on('data', (d) => {
      const str = d.toString();
      const match = str.match(/\[download\]\s+([\d\.]+)%/);
      if (match) {
        const pct = parseFloat(match[1]);
        onProgress?.(Math.min(30, 15 + pct * 0.15), `Downloading audio: ${pct.toFixed(0)}%`);
      }
    });

    proc.stderr.on('data', (d) => (err += d.toString()));

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) resolve();
      else reject(new Error(`Audio download failed (${code}): ${err.slice(-250)}`));
    });
  });

  return outputPath;
}

/**
 * Downloads ONLY a surgical 30-40s slice of the video using HTTP range requests
 */
export async function downloadVideoSection(
  url: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<string> {
  const rangeStr = `*${startTime.toFixed(1)}-${endTime.toFixed(1)}`;

  const args = [
    CONFIG.BIN_YTDLP,
    '--no-playlist',
    '--no-warnings',
    '--ffmpeg-location',
    CONFIG.BIN_FFMPEG,
    '--download-sections',
    rangeStr,
    '-f',
    'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[height<=1080]/best',
    '--merge-output-format',
    'mp4',
    '-o',
    outputPath,
    url,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('python3', args);
    let err = '';

    proc.stderr.on('data', (d) => (err += d.toString()));

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) resolve();
      else reject(new Error(`Section download failed (${code}): ${err.slice(-250)}`));
    });
  });

  return outputPath;
}
