import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { Job, Clip, CaptionStyle, FrameLayout } from './types';
import { saveJob, updateJob, initStorage } from './storage';
import { getVideoMetadata, downloadAudioOnly, downloadVideoSection, tryFetchYouTubeSubtitles } from './downloader';
import { extractAudio, analyzeAudioEnergy } from './audio';
import { transcribeAudio } from './transcriber';
import { findPeakMoments } from './judge';
import { generateAssSubtitles } from './subtitles';
import { renderVerticalClip } from './renderer';

export interface StartJobParams {
  sourceUrl?: string;
  uploadedFilePath?: string;
  originalFilename?: string;
  captionStyle: CaptionStyle;
  frameLayout: FrameLayout;
}

export async function processVideoJob(params: StartJobParams): Promise<Job> {
  initStorage();

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const initialJob: Job = {
    id: jobId,
    sourceUrl: params.sourceUrl,
    inputFilename: params.originalFilename,
    status: 'pending',
    progress: 5,
    statusMessage: 'Initializing pipeline...',
    captionStyle: params.captionStyle,
    frameLayout: params.frameLayout,
    clips: [],
    createdAt: new Date().toISOString(),
  };

  saveJob(initialJob);

  runPipeline(jobId, params).catch((err) => {
    console.error(`Pipeline failed for job ${jobId}:`, err);
    updateJob(jobId, {
      status: 'failed',
      statusMessage: 'Job failed',
      error: err.message,
    });
  });

  return initialJob;
}

async function runPipeline(jobId: string, params: StartJobParams) {
  let audioPath = '';
  let videoTitle = params.originalFilename || 'Stream Video';
  let totalDuration = 0;
  let heatmapData: any = undefined;

  // STEP 1 & 2: Ingestion & Audio Preparation
  if (params.sourceUrl) {
    updateJob(jobId, {
      status: 'downloading',
      progress: 10,
      statusMessage: 'Checking stream metadata & audience replay heatmap...',
    });

    const meta = await getVideoMetadata(params.sourceUrl);
    videoTitle = meta.title;
    totalDuration = meta.duration;
    heatmapData = meta.heatmap;

    updateJob(jobId, {
      title: videoTitle,
      duration: totalDuration,
      hasHeatmap: Boolean(meta.heatmap && meta.heatmap.length > 0),
      progress: 20,
      statusMessage: meta.heatmap && meta.heatmap.length > 0
        ? `Found ${meta.heatmap.length} audience engagement heatmap peaks! Downloading audio stream...`
        : 'Downloading fast audio stream (~20MB audio-first mode)...',
    });

    // Fast Audio-First Ingestion (only downloads ~20-30MB instead of 5GB video!)
    audioPath = await downloadAudioOnly(params.sourceUrl, jobId, (prog, msg) => {
      updateJob(jobId, { progress: prog, statusMessage: msg });
    });
  } else if (params.uploadedFilePath) {
    videoTitle = params.originalFilename || 'Uploaded Video';
    updateJob(jobId, {
      status: 'extracting_audio',
      progress: 25,
      statusMessage: 'Extracting audio track from uploaded file...',
    });

    const extracted = await extractAudio(params.uploadedFilePath, jobId);
    audioPath = extracted.audioPath;
  } else {
    throw new Error('Neither source URL nor uploaded file was provided.');
  }

  updateJob(jobId, {
    audioPath,
    title: videoTitle,
    status: 'transcribing',
    progress: 40,
    statusMessage: 'Checking for native captions & analyzing audio energy...',
  });

  // STEP 3: Subtitles / Transcription + Audio Energy Analysis
  let nativeSegments: any[] | null = null;
  if (params.sourceUrl) {
    try {
      nativeSegments = await tryFetchYouTubeSubtitles(params.sourceUrl, jobId);
      if (nativeSegments && nativeSegments.length > 0) {
        updateJob(jobId, {
          progress: 50,
          statusMessage: `Found ${nativeSegments.length} native YouTube captions! Skipping Whisper API...`,
        });
      }
    } catch {}
  }

  const energyPointsPromise = analyzeAudioEnergy(audioPath);

  const transcriptPromise = nativeSegments && nativeSegments.length > 0
    ? Promise.resolve({
        text: nativeSegments.map((s) => s.text).join(' '),
        segments: nativeSegments,
        duration: totalDuration,
      })
    : transcribeAudio(audioPath, (msg) => {
        updateJob(jobId, { statusMessage: msg });
      });

  const [energyPoints, transcriptResult] = await Promise.all([
    energyPointsPromise,
    transcriptPromise,
  ]);

  if (!totalDuration) {
    totalDuration = transcriptResult.duration;
  }

  // STEP 4: Dual/Triple AI Judges (Heatmap + Words + Audio Reaction)
  updateJob(jobId, {
    status: 'scoring',
    progress: 60,
    statusMessage: heatmapData && heatmapData.length > 0
      ? 'Triple AI Judges analyzing audience heatmap + words + hype reactions...'
      : 'Dual AI Judges finding peak viral moments and writing hooks...',
  });

  const moments = await findPeakMoments(
    transcriptResult.segments,
    energyPoints,
    totalDuration,
    heatmapData,
    3 // Top 3 clips
  );

  // STEP 5: Surgical Video Slicing & Vertical 9:16 Subtitle Rendering
  updateJob(jobId, {
    status: 'rendering',
    progress: 75,
    statusMessage: `Slicing & rendering ${moments.length} vertical 9:16 clips with animated captions...`,
  });

  const generatedClips: Clip[] = [];

  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    const clipId = `${jobId}_clip_${i + 1}`;
    const subPath = path.join(CONFIG.SUBS_DIR, `${clipId}.ass`);
    const clipVideoPath = path.join(CONFIG.CLIPS_DIR, `${clipId}.mp4`);

    updateJob(jobId, {
      progress: Math.min(95, 75 + Math.round(((i + 1) / moments.length) * 20)),
      statusMessage: `Slicing & rendering Clip ${i + 1}/${moments.length}: "${moment.hook}" (${moment.score}/100)...`,
    });

    let sourceForRender = '';

    if (params.sourceUrl) {
      // Surgical Range Slicing: Download ONLY this 30-40s video section directly!
      const rawSectionPath = path.join(CONFIG.VIDEOS_DIR, `${clipId}_raw.mp4`);
      await downloadVideoSection(params.sourceUrl, moment.startTime, moment.endTime, rawSectionPath);
      sourceForRender = rawSectionPath;
    } else if (params.uploadedFilePath) {
      sourceForRender = params.uploadedFilePath;
    }

    // Generate ASS karaoke subtitles with word-level highlight
    generateAssSubtitles(
      transcriptResult.segments,
      moment.startTime,
      moment.endTime,
      moment.hook,
      params.captionStyle,
      subPath
    );

    // Render vertical 9:16 MP4 with burned subtitles
    await renderVerticalClip({
      sourceVideoPath: sourceForRender,
      startTime: params.sourceUrl ? 0 : moment.startTime,
      endTime: params.sourceUrl ? (moment.endTime - moment.startTime) : moment.endTime,
      subtitlePath: subPath,
      layout: params.frameLayout,
      outputClipPath: clipVideoPath,
    });

    const clip: Clip = {
      id: clipId,
      jobId,
      title: moment.title,
      hook: moment.hook,
      startTime: moment.startTime,
      endTime: moment.endTime,
      duration: Math.round((moment.endTime - moment.startTime) * 10) / 10,
      score: moment.score,
      style: params.captionStyle,
      layout: params.frameLayout,
      videoPath: clipVideoPath,
      publicUrl: `/api/clips/${clipId}`,
      description: moment.description,
      hashtags: moment.hashtags,
      createdAt: new Date().toISOString(),
    };

    generatedClips.push(clip);

    updateJob(jobId, {
      clips: [...generatedClips],
    });

    // Clean up temporary surgical slice if it was downloaded
    if (params.sourceUrl && fs.existsSync(sourceForRender)) {
      try {
        fs.unlinkSync(sourceForRender);
      } catch {}
    }
  }

  updateJob(jobId, {
    status: 'completed',
    progress: 100,
    statusMessage: `Ready! Generated ${generatedClips.length} viral clips (Audience & AI scored).`,
    clips: generatedClips,
  });
}
