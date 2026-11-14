import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';

export interface AudioExtractionResult {
  audioPath: string;
}

export interface AudioEnergyPoint {
  time: number;
  rms: number; // Volume in dB (e.g. -12dB is loud, -50dB is quiet)
  energyScore: number; // Normalized 0-100
}

/**
 * Extracts 16kHz mono MP3 audio for Whisper processing
 */
export async function extractAudio(
  videoPath: string,
  outputPrefix: string
): Promise<AudioExtractionResult> {
  const audioPath = path.join(CONFIG.AUDIO_DIR, `${outputPrefix}.mp3`);

  // ffmpeg -y -i video.mp4 -vn -ar 16000 -ac 1 -b:a 64k audio.mp3
  const args = [
    '-y',
    '-i',
    videoPath,
    '-vn',
    '-ar',
    '16000',
    '-ac',
    '1',
    '-b:a',
    '64k',
    audioPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(CONFIG.BIN_FFMPEG, args);
    proc.stderr.on('data', (d) => {
      // ffmpeg outputs info on stderr
    });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(audioPath)) {
        resolve();
      } else {
        reject(new Error(`FFmpeg audio extraction failed with exit code ${code}`));
      }
    });
  });

  return { audioPath };
}

/**
 * "Reaction Judge" Audio Analyzer:
 * Analyzes audio volume across the track to identify hype spikes, shouting, and high energy reactions.
 */
export async function analyzeAudioEnergy(
  audioPath: string
): Promise<AudioEnergyPoint[]> {
  // Use ebur128 or astats to get RMS volume across intervals
  const args = [
    '-i',
    audioPath,
    '-af',
    'astats=metadata=1:reset=1',
    '-f',
    'null',
    '-',
  ];

  const points: AudioEnergyPoint[] = [];
  let currentTime = 0;

  await new Promise<void>((resolve) => {
    const proc = spawn(CONFIG.BIN_FFMPEG, args);
    let buffer = '';

    proc.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        // Parse time: e.g. pts_time: 12.345
        const timeMatch = line.match(/pts_time:\s*([\d\.]+)/);
        if (timeMatch) {
          currentTime = parseFloat(timeMatch[1]);
        }
        // Parse RMS level: e.g. [Parsed_astats_0] RMS level dB: -24.5
        const rmsMatch = line.match(/RMS level dB:\s*(-?[\d\.]+)/);
        if (rmsMatch) {
          const rms = parseFloat(rmsMatch[1]);
          if (!isNaN(rms) && isFinite(rms)) {
            // Normalize dB: -60dB (silence) to -5dB (very loud / peak)
            const normalized = Math.max(0, Math.min(100, ((rms + 50) / 45) * 100));
            points.push({
              time: currentTime,
              rms,
              energyScore: Math.round(normalized),
            });
          }
        }
      }
    });

    proc.on('close', () => {
      resolve();
    });
  });

  return points;
}
