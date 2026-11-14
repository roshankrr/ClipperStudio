import fs from 'fs';
import { getSettings } from './config';
import { TranscriptSegment, WordTimestamp } from './types';

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  duration: number;
}

export async function transcribeAudio(
  audioPath: string
): Promise<TranscriptionResult> {
  const settings = getSettings();
  const groqApiKey = settings.groqApiKey || process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    throw new Error(
      'Groq API key not configured. Please open Settings in PeakCut Studio and enter your free Groq API key.'
    );
  }

  // Create form-data with the audio file
  const fileBuffer = fs.readFileSync(audioPath);
  const blob = new Blob([fileBuffer], { type: 'audio/mp3' });
  const formData = new FormData();
  formData.append('file', blob, 'audio.mp3');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await fetch(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq Whisper transcription failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawWords: Array<{ word: string; start: number; end: number }> =
    data.words || [];

  const segments: TranscriptSegment[] = (data.segments || []).map(
    (seg: any, idx: number) => {
      // Find words that belong to this segment interval
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
    }
  );

  return {
    text: data.text || '',
    segments,
    duration: data.duration || 0,
  };
}
