import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';

export interface AudioExtractionResult {
  audioPath: string;
}

export interface AudioEnergyPoint {
  time: number;
  rms: number; // Volume in LUFS
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
    '32k',
    audioPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(CONFIG.BIN_FFMPEG, args);
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
 * Uses EBU R128 momentary loudness across the track to identify hype spikes, shouting, and high energy reactions.
 */
export async function analyzeAudioEnergy(
  audioPath: string
): Promise<AudioEnergyPoint[]> {
  const args = [
    '-i',
    audioPath,
    '-af',
    'ebur128',
    '-f',
    'null',
    '-',
  ];

  const points: AudioEnergyPoint[] = [];

  await new Promise<void>((resolve) => {
    const proc = spawn(CONFIG.BIN_FFMPEG, args);
    let buffer = '';

    proc.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        // ebur128 outputs: [Parsed_ebur128_0 @ ...] t: 12.345 TARGET: ... M: -16.2 S: ...
        const match = line.match(/t:\s*([\d\.]+)\s+TARGET:[^\n]*M:\s*(-?[\d\.]+)/);
        if (match) {
          const time = parseFloat(match[1]);
          const lufs = parseFloat(match[2]);

          if (!isNaN(time) && !isNaN(lufs) && isFinite(lufs)) {
            // LUFS: -50 (silence) to -10 (very loud screaming/jump scare)
            const normalized = Math.max(0, Math.min(100, ((lufs + 42) / 32) * 100));
            // Sample points at 1-second resolution to keep memory light
            if (points.length === 0 || time - points[points.length - 1].time >= 1.0) {
              points.push({
                time: Math.round(time * 10) / 10,
                rms: lufs,
                energyScore: Math.round(normalized),
              });
            }
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
