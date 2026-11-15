/**
 * POST /api/gaming-split
 *
 * Professional Gaming Split-Screen Pipeline:
 *  - Top 65%: Gameplay (Wide action view)
 *  - Bottom 35%: Streamer Webcam / Facecam
 *  - Word-timed bouncing karaoke captions (same as Viral Clipper)
 *  - Clean text without ugly border boxes
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '@/lib/config';
import { downloadVideoSection, tryFetchYouTubeSubtitles } from '@/lib/downloader';
import { renderGamingSplit } from '@/lib/gamingSplitRenderer';
import { findViralWindowForUrl } from '@/lib/peakFinder';
import { generateAssSubtitles } from '@/lib/subtitles';
import { extractAudio } from '@/lib/audio';
import { transcribeAudio } from '@/lib/transcriber';
import { saveJob, initStorage } from '@/lib/storage';
import { Job, Clip, CaptionStyle, TranscriptSegment } from '@/lib/types';
import { stripEmojis } from '@/lib/versusRenderer';

export async function POST(req: NextRequest) {
  try {
    initStorage();

    const body = await req.json();
    const {
      sourceUrl,
      startTime,
      endTime,
      captionStyle = 'bounce',
    } = body as {
      sourceUrl: string;
      startTime?: number;
      endTime?: number;
      captionStyle?: CaptionStyle;
    };

    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
    }

    const jobId = `job_game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    fs.mkdirSync(CONFIG.VIDEOS_DIR, { recursive: true });
    fs.mkdirSync(CONFIG.CLIPS_DIR, { recursive: true });
    fs.mkdirSync(CONFIG.SUBS_DIR, { recursive: true });
    fs.mkdirSync(CONFIG.AUDIO_DIR, { recursive: true });

    let start = typeof startTime === 'number' && !isNaN(startTime) ? startTime : -1;
    let end = typeof endTime === 'number' && !isNaN(endTime) ? endTime : -1;
    let peakInfo = 'Manual timestamp';

    if (start < 0) {
      const peak = await findViralWindowForUrl(sourceUrl, 35);
      start = peak.startTime;
      end = peak.endTime;
      peakInfo = peak.description;
    } else if (end <= start) {
      end = start + 35;
    }

    const duration = Math.min(50, Math.max(10, end - start));
    console.log(`[GamingSplit] Slicing gameplay from ${start}s to ${start + duration}s (${peakInfo})`);

    const rawPath = path.join(CONFIG.VIDEOS_DIR, `${jobId}_raw.mp4`);
    const clipId = `${jobId}_clip_1`;
    const outputPath = path.join(CONFIG.CLIPS_DIR, `${clipId}.mp4`);
    const subPath = path.join(CONFIG.SUBS_DIR, `${clipId}.ass`);

    await downloadVideoSection(sourceUrl, start, start + duration + 2, rawPath);

    // ── Word-Timed Karaoke Subtitles (Same as Viral Clipper) ────────────────
    let segments: TranscriptSegment[] = [];
    try {
      const nativeSubs = await tryFetchYouTubeSubtitles(sourceUrl, jobId);
      if (nativeSubs && nativeSubs.length > 0) {
        segments = nativeSubs;
      }
    } catch {}

    // Fallback: extract slice audio and run Whisper word-level transcriber
    if (segments.length === 0) {
      try {
        const extracted = await extractAudio(rawPath, jobId);
        const transcript = await transcribeAudio(extracted.audioPath);
        segments = transcript.segments || [];
      } catch (err) {
        console.warn('[GamingSplit] Whisper fallback error:', err);
      }
    }

    let hasSubtitles = false;
    if (segments.length > 0) {
      generateAssSubtitles(
        segments,
        start,
        start + duration,
        '', // No fake hook text in subtitle file!
        captionStyle,
        subPath
      );
      hasSubtitles = fs.existsSync(subPath);
    }

    // ── Render 9:16 Gaming Video (Wide 9:14 Action View, Natural Composition) ──
    await renderGamingSplit({
      sourceVideoPath: rawPath,
      startTime: 0,
      endTime: duration,
      layout: 'wide-action',
      subtitlePath: hasSubtitles ? subPath : undefined,
      outputPath,
    });

    try { fs.unlinkSync(rawPath); } catch {}

    const clip: Clip = {
      id: clipId,
      jobId,
      title: `Gaming Highlight (${formatTime(start)} - ${formatTime(start + duration)})`,
      hook: '',
      startTime: start,
      endTime: start + duration,
      duration,
      score: 95,
      style: captionStyle,
      layout: 'center-crop',
      videoPath: outputPath,
      publicUrl: `/api/clips/${clipId}`,
      description: `Gaming highlight (${peakInfo}). Natural video framing with word-timed captions.`,
      hashtags: ['#gaming', '#twitchclips', '#streamer', '#clutch', '#shorts'],
      overlays: [], // Zero fake text! Completely clean video
      createdAt: new Date().toISOString(),
    };

    const job: Job = {
      id: jobId,
      title: `Gaming Short [${formatTime(start)} - ${formatTime(start + duration)}]`,
      sourceUrl,
      templateId: 'gaming-split',
      status: 'completed',
      progress: 100,
      statusMessage: `Gaming video ready! Clean 9:14 action view with word-level captions.`,
      captionStyle,
      frameLayout: 'center-crop',
      clips: [clip],
      createdAt: new Date().toISOString(),
    };

    saveJob(job);

    return NextResponse.json({ job, clip });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/gaming-split] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
