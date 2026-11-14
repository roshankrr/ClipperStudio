import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { CONFIG, getSettings } from './config';
import { TranscriptSegment } from './types';

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  duration: number;
}

/**
 * Probes the duration of an audio file using FFprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const proc = spawn(CONFIG.BIN_FFPROBE, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);

    let output = '';
    proc.stdout.on('data', (d) => (output += d.toString()));
    proc.on('close', (code) => {
      const dur = parseFloat(output.trim());
      resolve(!isNaN(dur) && dur > 0 ? dur : 0);
    });
  });
}

/**
 * Splits an audio file into 10-minute (600s) chunks to stay well under Groq's 25MB limit.
 */
async function splitAudioIntoChunks(
  inputPath: string,
  outputDir: string,
  chunkDurationSec: number = 600
): Promise<Array<{ path: string; offset: number }>> {
  const chunkPattern = path.join(outputDir, `chunk_${Date.now()}_%03d.mp3`);

  const args = [
    '-y',
    '-i',
    inputPath,
    '-f',
    'segment',
    '-segment_time',
    String(chunkDurationSec),
    '-c',
    'copy',
    chunkPattern,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(CONFIG.BIN_FFMPEG, args);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg audio splitting failed with exit code ${code}`));
    });
  });

  // Find generated chunk files
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.startsWith('chunk_') && f.endsWith('.mp3'))
    .sort();

  return files.map((f, index) => ({
    path: path.join(outputDir, f),
    offset: index * chunkDurationSec,
  }));
}

async function transcribeSingleFile(
  filePath: string,
  groqApiKey: string
): Promise<{ text: string; segments: any[]; words: any[]; duration: number }> {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'audio/mp3' });
  const formData = new FormData();
  formData.append('file', blob, 'audio.mp3');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq Whisper transcription failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    text: data.text || '',
    segments: data.segments || [],
    words: data.words || [],
    duration: data.duration || 0,
  };
}

/**
 * Transcribes audio with automatic 10-minute chunking.
 * Never hits Groq's 25MB 413 "Request Entity Too Large" limit regardless of video length.
 */
export async function transcribeAudio(
  audioPath: string,
  onProgress?: (message: string) => void
): Promise<TranscriptionResult> {
  const settings = getSettings();
  const groqApiKey = settings.groqApiKey || process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    throw new Error(
      'Groq API key not configured. Please open Settings in PeakCut Studio and enter your free Groq API key.'
    );
  }

  const stats = fs.statSync(audioPath);
  const maxBytesForSingleCall = 18 * 1024 * 1024; // 18 MB safety threshold (Groq limit is 25 MB)

  // Fast path: file is under 18MB, transcribe directly in a single call (~2-3s)
  if (stats.size <= maxBytesForSingleCall) {
    onProgress?.('Transcribing audio with Groq Whisper-large-v3...');
    const data = await transcribeSingleFile(audioPath, groqApiKey);
    const rawWords: Array<{ word: string; start: number; end: number }> = data.words || [];

    const segments: TranscriptSegment[] = (data.segments || []).map((seg: any, idx: number) => {
      const segWords = rawWords.filter(
        (w) => w.start >= seg.start - 0.1 && w.end <= seg.end + 0.1
      );

      return {
        id: idx,
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
        words: segWords.length > 0 ? segWords : undefined,
      };
    });

    return {
      text: data.text || '',
      segments,
      duration: data.duration || 0,
    };
  }

  // Chunked path: File is larger than 18MB (> 1 hour).
  // Split into 10-minute chunks to prevent 413 "Request Entity Too Large".
  onProgress?.(`Audio is ${(stats.size / (1024 * 1024)).toFixed(1)}MB. Slicing into 10-minute chunks for Whisper...`);
  const chunksDir = path.join(CONFIG.AUDIO_DIR, `chunks_${Date.now()}`);
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  try {
    const chunkDuration = 600; // 10 minutes per chunk
    const chunks = await splitAudioIntoChunks(audioPath, chunksDir, chunkDuration);

    const allSegments: TranscriptSegment[] = [];
    const textParts: string[] = [];
    let segGlobalIndex = 0;
    let totalDuration = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      onProgress?.(
        `Transcribing chunk ${i + 1}/${chunks.length} (${Math.round(chunk.offset / 60)}m - ${Math.round(
          (chunk.offset + chunkDuration) / 60
        )}m)...`
      );

      const chunkData = await transcribeSingleFile(chunk.path, groqApiKey);
      textParts.push(chunkData.text || '');
      totalDuration = Math.max(totalDuration, chunk.offset + (chunkData.duration || 0));

      const chunkWords: Array<{ word: string; start: number; end: number }> = (chunkData.words || []).map(
        (w: any) => ({
          word: w.word,
          start: w.start + chunk.offset,
          end: w.end + chunk.offset,
        })
      );

      for (const seg of chunkData.segments || []) {
        const adjustedStart = seg.start + chunk.offset;
        const adjustedEnd = seg.end + chunk.offset;

        const segWords = chunkWords.filter(
          (w) => w.start >= adjustedStart - 0.1 && w.end <= adjustedEnd + 0.1
        );

        allSegments.push({
          id: segGlobalIndex++,
          start: adjustedStart,
          end: adjustedEnd,
          text: seg.text.trim(),
          words: segWords.length > 0 ? segWords : undefined,
        });
      }

      // Clean up chunk file immediately
      try {
        fs.unlinkSync(chunk.path);
      } catch {}
    }

    return {
      text: textParts.join(' ').trim(),
      segments: allSegments,
      duration: totalDuration || (await getAudioDuration(audioPath)),
    };
  } finally {
    // Clean up temporary chunks folder
    try {
      if (fs.existsSync(chunksDir)) {
        fs.rmSync(chunksDir, { recursive: true, force: true });
      }
    } catch {}
  }
}
