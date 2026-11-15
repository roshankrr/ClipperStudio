export type CaptionStyle = 'bounce' | 'hype' | 'clean';
export type FrameLayout = 'blurred-fill' | 'smart-crop' | 'center-crop';
export type TemplateId = 'viral-clipper' | 'versus-comparison' | 'gaming-split';

export interface TextOverlay {
  id: string;
  text: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  fontSize?: number;
  fontColor?: string;
  bgColor?: string;
  style?: 'badge' | 'banner' | 'clean';
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
}

export interface HeatmapPoint {
  start_time: number;
  end_time: number;
  value: number;
}

export interface ClipMoment {
  id: string;
  startTime: number;
  endTime: number;
  score: number;
  reason: string;
  hook: string;
  title: string;
  description: string;
  hashtags: string[];
  wordsScore: number;
  reactionScore: number;
  heatmapScore?: number;
}

export interface Clip {
  id: string;
  jobId: string;
  title: string;
  hook: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number;
  style: CaptionStyle;
  layout: FrameLayout;
  videoPath: string;
  publicUrl: string;
  description: string;
  hashtags: string[];
  overlays?: TextOverlay[];
  youtubeUrl?: string;
  createdAt: string;
}

export type JobStatus =
  | 'pending'
  | 'downloading'
  | 'extracting_audio'
  | 'transcribing'
  | 'scoring'
  | 'rendering'
  | 'completed'
  | 'failed';

export interface Job {
  id: string;
  title?: string;
  sourceUrl?: string;
  inputFilename?: string;
  videoPath?: string;
  audioPath?: string;
  duration?: number;
  hasHeatmap?: boolean;
  templateId?: TemplateId;
  status: JobStatus;
  progress: number;
  statusMessage: string;
  captionStyle: CaptionStyle;
  frameLayout: FrameLayout;
  clips: Clip[];
  error?: string;
  createdAt: string;
}
