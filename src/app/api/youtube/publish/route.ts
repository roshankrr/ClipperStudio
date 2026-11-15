import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '@/lib/config';
import { Job, Clip } from '@/lib/types';
import { uploadShortToYouTube, getSavedYouTubeTokens } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

function getJobs(): Job[] {
  try {
    if (fs.existsSync(CONFIG.DB_FILE)) {
      const data = fs.readFileSync(CONFIG.DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read jobs database:', err);
  }
  return [];
}

function saveJobs(jobs: Job[]) {
  fs.writeFileSync(CONFIG.DB_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
}

export async function POST(req: NextRequest) {
  try {
    const tokens = getSavedYouTubeTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: 'YouTube account is not connected. Connect your channel in Settings first.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { clipId, jobId, title, description, tags, privacyStatus, publishAt } = body;

    if (!clipId || !jobId) {
      return NextResponse.json({ error: 'Missing clipId or jobId' }, { status: 400 });
    }

    const jobs = getJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const clip = job.clips.find((c) => c.id === clipId);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Locate the video file on disk
    let videoFilePath = clip.videoPath;
    if (!videoFilePath || !fs.existsSync(videoFilePath)) {
      const candidate1 = path.join(CONFIG.CLIPS_DIR, `clip_${clip.id}.mp4`);
      const candidate2 = path.join(CONFIG.CLIPS_DIR, `${job.id}_${clip.id}.mp4`);
      const candidate3 = path.join(CONFIG.CLIPS_DIR, `${clip.id}.mp4`);

      if (fs.existsSync(candidate1)) videoFilePath = candidate1;
      else if (fs.existsSync(candidate2)) videoFilePath = candidate2;
      else if (fs.existsSync(candidate3)) videoFilePath = candidate3;
      else {
        return NextResponse.json(
          { error: `Video file not found on disk for clip ${clip.id}` },
          { status: 404 }
        );
      }
    }

    // Build credit notice if not present
    let finalDesc = (description || clip.description || '').trim();
    if (!finalDesc.toLowerCase().includes('credit') && !finalDesc.toLowerCase().includes('original')) {
      const creditLine = job.sourceUrl
        ? `\n\n---\n📌 Credit / Original Source: ${job.title || 'Original Creator'}\n🔗 ${job.sourceUrl}\nAll rights and credits belong to the original owner.`
        : job.title
        ? `\n\n---\n📌 Credit / Original Source: ${job.title}\nAll rights and credits belong to the original owner.`
        : `\n\n---\n📌 Credit to original creator / broadcaster.`;
      finalDesc = `${finalDesc}${creditLine}`;
    }

    if (!finalDesc.toLowerCase().includes('#shorts')) {
      finalDesc = `${finalDesc}\n\n${clip.hashtags.join(' ')}\n\n#shorts`;
    }

    // Default privacy is 'private' (Draft mode) for creator review in YouTube Studio
    const finalPrivacy = privacyStatus || 'private';

    // Upload to YouTube Shorts
    const result = await uploadShortToYouTube({
      videoFilePath,
      title: title || clip.title,
      description: finalDesc,
      tags: tags || clip.hashtags,
      privacyStatus: finalPrivacy,
      publishAt: publishAt || undefined,
    });

    // Save the YouTube URL onto the clip
    clip.youtubeUrl = result.videoUrl;
    saveJobs(jobs);

    return NextResponse.json({
      success: true,
      videoId: result.videoId,
      videoUrl: result.videoUrl,
    });
  } catch (err: unknown) {
    console.error('Failed to publish to YouTube:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
