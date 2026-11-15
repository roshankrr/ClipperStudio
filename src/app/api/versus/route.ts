/**
 * POST /api/versus
 *
 * Body: {
 *   clipAUrl: string,
 *   clipBUrl: string,
 *   clipALabel?: string,
 *   clipBLabel?: string,
 *   clipAStartTime?: number,
 *   clipBStartTime?: number,
 *   interval?: number,
 *   cta?: string,
 * }
 *
 * Returns: { job: Job }
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '@/lib/config';
import { downloadVideoSection } from '@/lib/downloader';
import { renderVersusClip, stripEmojis } from '@/lib/versusRenderer';
import { findViralWindowForUrl } from '@/lib/peakFinder';
import { saveJob, initStorage } from '@/lib/storage';
import { Job, Clip } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    initStorage();

    const body = await req.json();
    const {
      clipAUrl,
      clipBUrl,
      clipALabel = 'Old Version',
      clipBLabel = 'New Version',
      clipAStartTime,
      clipBStartTime,
      interval = 8,
      cta = 'Which one wins? Comment below! 👇',
    } = body as {
      clipAUrl: string;
      clipBUrl: string;
      clipALabel?: string;
      clipBLabel?: string;
      clipAStartTime?: number;
      clipBStartTime?: number;
      interval?: number;
      cta?: string;
    };

    if (!clipAUrl || !clipBUrl) {
      return NextResponse.json({ error: 'Both Clip A and Clip B URLs are required' }, { status: 400 });
    }

    const intv = Math.min(12, Math.max(5, Number(interval) || 8));
    const jobId = `job_vs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    fs.mkdirSync(CONFIG.VIDEOS_DIR, { recursive: true });
    fs.mkdirSync(CONFIG.CLIPS_DIR, { recursive: true });

    // 1. Detect viral peaks if start times are not explicitly supplied
    let startA = typeof clipAStartTime === 'number' && !isNaN(clipAStartTime) ? clipAStartTime : -1;
    let startB = typeof clipBStartTime === 'number' && !isNaN(clipBStartTime) ? clipBStartTime : -1;

    let peakInfoA = 'Manual timestamp';
    let peakInfoB = 'Manual timestamp';

    if (startA < 0) {
      const peakA = await findViralWindowForUrl(clipAUrl, intv);
      startA = peakA.startTime;
      peakInfoA = peakA.description;
    }

    if (startB < 0) {
      const peakB = await findViralWindowForUrl(clipBUrl, intv);
      startB = peakB.startTime;
      peakInfoB = peakB.description;
    }

    console.log(`[Versus] Slicing Clip A from ${startA}s (${peakInfoA}), Clip B from ${startB}s (${peakInfoB})`);

    const clipAPath = path.join(CONFIG.VIDEOS_DIR, `${jobId}_sliceA.mp4`);
    const clipBPath = path.join(CONFIG.VIDEOS_DIR, `${jobId}_sliceB.mp4`);
    const clipId = `${jobId}_clip_1`;
    const outputPath = path.join(CONFIG.CLIPS_DIR, `${clipId}.mp4`);

    // Download surgical sections
    await downloadVideoSection(clipAUrl, startA, startA + intv + 2, clipAPath);
    await downloadVideoSection(clipBUrl, startB, startB + intv + 2, clipBPath);

    const safeCta = stripEmojis(cta || 'Which one wins? Comment below!');
    const safeLabelA = stripEmojis(clipALabel || 'Version A');
    const safeLabelB = stripEmojis(clipBLabel || 'Version B');

    // Render clean comparison (no permanent baked-in uneditable text)
    await renderVersusClip({
      clipAPath,
      clipBPath,
      interval: intv,
      outputPath,
    });

    // Cleanup raw slices
    for (const f of [clipAPath, clipBPath]) {
      try { fs.unlinkSync(f); } catch {}
    }

    const totalDuration = intv * 2;
    const clip: Clip = {
      id: clipId,
      jobId,
      title: `${safeLabelA} vs ${safeLabelB}`,
      hook: `${safeLabelA.toUpperCase()} VS ${safeLabelB.toUpperCase()}`,
      startTime: 0,
      endTime: totalDuration,
      duration: totalDuration,
      score: 96,
      style: 'hype',
      layout: 'blurred-fill',
      videoPath: outputPath,
      publicUrl: `/api/clips/${clipId}`,
      description: `Comparison showdown: ${safeLabelA} vs ${safeLabelB}. ${peakInfoA} | ${peakInfoB}.`,
      hashtags: ['#versus', '#comparison', '#gaming', '#evolution', '#shorts'],
      overlays: [
        { id: 'topLabel', text: safeLabelA, xPercent: 50, yPercent: 6, fontSize: 36, fontColor: 'white', bgColor: 'black@0.75' },
        { id: 'vsBadge', text: 'VS', xPercent: 50, yPercent: 50, fontSize: 52, fontColor: 'yellow', bgColor: 'black@0.85' },
        { id: 'botLabel', text: safeLabelB, xPercent: 50, yPercent: 56, fontSize: 36, fontColor: 'white', bgColor: 'black@0.75' },
      ],
      createdAt: new Date().toISOString(),
    };

    const job: Job = {
      id: jobId,
      title: `${clipALabel} vs ${clipBLabel} [Versus Studio]`,
      sourceUrl: clipAUrl,
      templateId: 'versus-comparison',
      status: 'completed',
      progress: 100,
      statusMessage: `Versus video ready! Auto-detected viral peaks: Clip A @ ${startA}s, Clip B @ ${startB}s.`,
      captionStyle: 'hype',
      frameLayout: 'blurred-fill',
      clips: [clip],
      createdAt: new Date().toISOString(),
    };

    saveJob(job);

    return NextResponse.json({ job, clip });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/versus] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
