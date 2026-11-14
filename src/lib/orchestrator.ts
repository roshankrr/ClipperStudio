import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { Job, Clip, CaptionStyle, FrameLayout } from './types';
import { saveJob, updateJob, initStorage } from './storage';
import { downloadVideo } from './downloader';
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

  // Run pipeline asynchronously in background
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
  let videoPath = '';
  let videoTitle = params.originalFilename || 'Stream Video';

  // Step 1: Ingest Video
  if (params.sourceUrl) {
    updateJob(jobId, {
      status: 'downloading',
      progress: 10,
      statusMessage: 'Downloading stream / video via yt-dlp...',
    });

    const dl = await downloadVideo(params.sourceUrl, jobId, (prog, msg) => {
      updateJob(jobId, { progress: prog, statusMessage: msg });
    });
    videoPath = dl.videoPath;
    videoTitle = dl.title;
  } else if (params.uploadedFilePath) {
    videoPath = params.uploadedFilePath;
    updateJob(jobId, {
      status: 'downloading',
      progress: 25,
      statusMessage: 'Video file received and stored.',
    });
  } else {
    throw new Error('Neither source URL nor uploaded file was provided.');
  }

  updateJob(jobId, {
    videoPath,
    title: videoTitle,
    status: 'extracting_audio',
    progress: 30,
    statusMessage: 'Extracting audio track for transcription and audio analysis...',
  });

  // Step 2: Extract Audio & Run Reaction Judge (Audio Energy Spike Analysis)
  const { audioPath } = await extractAudio(videoPath, jobId);
  updateJob(jobId, { audioPath });

  updateJob(jobId, {
    status: 'transcribing',
    progress: 45,
    statusMessage: 'Analyzing audio energy & transcribing speech with Groq Whisper...',
  });

  const [energyPoints, transcriptResult] = await Promise.all([
    analyzeAudioEnergy(audioPath),
    transcribeAudio(audioPath),
  ]);

  // Step 3: Words Judge & Dual Consensus Peak Detection
  updateJob(jobId, {
    status: 'scoring',
    progress: 65,
    statusMessage: 'Dual AI Judges finding peak viral moments and writing hooks...',
  });

  const moments = await findPeakMoments(
    transcriptResult.segments,
    energyPoints,
    transcriptResult.duration,
    3 // Find top 3 viral clips
  );

  // Step 4: Render Vertical 9:16 Clips with Animated Karaoke Subtitles
  updateJob(jobId, {
    status: 'rendering',
    progress: 75,
    statusMessage: `Rendering ${moments.length} vertical 9:16 clips with animated captions...`,
  });

  const generatedClips: Clip[] = [];

  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    const clipId = `${jobId}_clip_${i + 1}`;
    const subPath = path.join(CONFIG.SUBS_DIR, `${clipId}.ass`);
    const clipVideoPath = path.join(CONFIG.CLIPS_DIR, `${clipId}.mp4`);

    updateJob(jobId, {
      progress: Math.min(95, 75 + Math.round(((i + 1) / moments.length) * 20)),
      statusMessage: `Rendering Clip ${i + 1}/${moments.length}: "${moment.hook}"...`,
    });

    // 1. Generate styled subtitles (.ass)
    generateAssSubtitles(
      transcriptResult.segments,
      moment.startTime,
      moment.endTime,
      moment.hook,
      params.captionStyle,
      subPath
    );

    // 2. Render vertical 9:16 MP4 with burned subtitles
    await renderVerticalClip({
      sourceVideoPath: videoPath,
      startTime: moment.startTime,
      endTime: moment.endTime,
      subtitlePath: subPath,
      layout: params.frameLayout,
      outputClipPath: clipVideoPath,
    });

    generatedClips.push({
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
    });
  }

  // Done!
  updateJob(jobId, {
    status: 'completed',
    progress: 100,
    statusMessage: `Ready! Generated ${generatedClips.length} clips with zero limits.`,
    clips: generatedClips,
  });
}
