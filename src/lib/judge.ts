import { getSettings } from './config';
import { TranscriptSegment, ClipMoment, HeatmapPoint } from './types';
import { AudioEnergyPoint } from './audio';

export async function findPeakMoments(
  segments: TranscriptSegment[],
  energyPoints: AudioEnergyPoint[],
  totalDuration: number,
  heatmapPoints?: HeatmapPoint[],
  targetClipCount: number = 3
): Promise<ClipMoment[]> {
  const settings = getSettings();
  const groqApiKey = settings.groqApiKey || process.env.GROQ_API_KEY;
  const geminiApiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

  if (!groqApiKey && !geminiApiKey) {
    throw new Error(
      'No API key found. Please enter a free Groq or Gemini API key in Settings.'
    );
  }

  // 1. Group Transcript into Natural Narrative Scenes (~30-50s conversation blocks)
  // This preserves jokes, roasts, storytelling, setups, and punchlines together!
  interface SceneBlock {
    id: number;
    startTime: number;
    endTime: number;
    text: string;
    avgLoudness: number;
    hasAudienceReplay: boolean;
  }

  const scenes: SceneBlock[] = [];
  const targetSceneDuration = 35; // Ideal TikTok/Shorts length
  let currentSceneSegs: TranscriptSegment[] = [];
  let sceneStart = segments.length > 0 ? segments[0].start : 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentSceneSegs.push(seg);

    const sceneDuration = seg.end - sceneStart;
    const isEndOfVideo = i === segments.length - 1;

    // When scene reaches 30-45s or pause/break
    if (sceneDuration >= targetSceneDuration || isEndOfVideo) {
      const sceneEnd = seg.end;
      const text = currentSceneSegs.map((s) => s.text.trim()).join(' ');

      // Check audio loudness as an enhancer (not a gatekeeper)
      const sceneAudio = energyPoints.filter(
        (e) => e.time >= sceneStart && e.time <= sceneEnd
      );
      const avgLoud =
        sceneAudio.length > 0
          ? sceneAudio.reduce((acc, e) => acc + e.energyScore, 0) / sceneAudio.length
          : 50;

      // Check YouTube audience heatmap replay
      let hasReplay = false;
      if (Array.isArray(heatmapPoints) && heatmapPoints.length > 0) {
        hasReplay = heatmapPoints.some(
          (h) => h.start_time >= sceneStart && h.end_time <= sceneEnd && h.value >= 0.5
        );
      }

      if (text.length > 30) {
        scenes.push({
          id: scenes.length + 1,
          startTime: Math.round(sceneStart * 10) / 10,
          endTime: Math.round(sceneEnd * 10) / 10,
          text,
          avgLoudness: Math.round(avgLoud),
          hasAudienceReplay: hasReplay,
        });
      }

      // Next scene starts
      currentSceneSegs = [];
      sceneStart = seg.end;
    }
  }

  // 2. Select diverse candidate scenes across the video to evaluate
  // We sample candidate scenes from the beginning, middle, and end,
  // prioritizing rich dialogue, audience replays, and energetic spikes.
  let candidateScenes = scenes;
  if (scenes.length > 10) {
    // Pick the most promising scenes for the LLM to inspect
    const sortedByEngagement = [...scenes].sort((a, b) => {
      const scoreA = (a.hasAudienceReplay ? 30 : 0) + (a.avgLoudness * 0.3) + Math.min(40, a.text.length / 5);
      const scoreB = (b.hasAudienceReplay ? 30 : 0) + (b.avgLoudness * 0.3) + Math.min(40, b.text.length / 5);
      return scoreB - scoreA;
    });

    // Take top 6 scenes and sort chronologically so the LLM understands the video
    candidateScenes = sortedByEngagement.slice(0, 6).sort((a, b) => a.startTime - b.startTime);
  }

  // Format scenes for AI analysis
  const formattedScenes = candidateScenes
    .map(
      (s) =>
        `SCENE #${s.id} [${s.startTime.toFixed(1)}s - ${s.endTime.toFixed(1)}s]${
          s.hasAudienceReplay ? ' (Audience Most Replayed)' : ''
        }:
Dialogue: "${s.text}"`
    )
    .join('\n\n');

  // 3. Multi-Dimensional Viral Prompt (Humor, Jokes, Intensity, Drama, Roasts)
  const prompt = `You are the lead viral content strategist and editor for TikTok, YouTube Shorts, and Instagram Reels.
Analyze these scenes from the video and select the TOP ${targetClipCount} most VIRAL clips.

LOOK FOR MULTI-DIMENSIONAL VIRALITY:
1. COMEDY & HUMOR: Funny jokes, clever punchlines, sarcasm, ironic fails, witty banter, or hilarious streamer roasts.
2. INTENSE / DRAMATIC MOMENTS: Suspenseful situations, sudden plot twists, jump scares, heated arguments, or high-stakes dilemmas.
3. STORYTELLING & CURIOSITY HOOKS: Stories that grab attention in the first 3 seconds and make viewers watch till the end.
4. RELATABLE / UNEXPECTED: Moments where something shocking, bizarre, or deeply relatable happens.

CRITICAL CLIP LENGTH RULE:
- Each selected clip MUST be between 25 and 45 seconds long (a complete narrative scene with beginning, punchline/climax, and reaction).
- Output startTime and endTime matching the scene's timestamps.

Output JSON format:
{
  "moments": [
    {
      "sceneId": 1,
      "startTime": 670.0,
      "endTime": 702.0,
      "category": "Humor | Intense | Drama | Story",
      "viralScore": 95,
      "reason": "Why this will perform well on TikTok/Shorts",
      "hook": "THE SECRET REVEALED",
      "title": "Viral Catchy Video Title",
      "description": "Engaging description for YouTube Shorts / Reels",
      "hashtags": ["#shorts", "#funny", "#viral", "#gaming"]
    }
  ]
}

SCENES:
${formattedScenes.slice(0, 8500)}
`;

  let responseText = '';
  let lastError: Error | null = null;

  const groqModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
  ];

  if (groqApiKey) {
    for (const model of groqModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.25,
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          responseText = json.choices[0]?.message?.content || '{}';
          lastError = null;
          break;
        } else {
          const errBody = await res.text();
          console.warn(`Groq model ${model} failed (${res.status}): ${errBody.slice(0, 150)}`);
          lastError = new Error(`Groq LLM call failed: ${errBody}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  // Fallback to Gemini if needed
  if (!responseText && geminiApiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt + '\nReturn pure JSON only.' }] }],
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        responseText = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        lastError = null;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!responseText && lastError) {
    throw lastError;
  }

  // Parse JSON response safely
  let moments: any[] = [];
  try {
    const clean = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    moments = Array.isArray(parsed) ? parsed : parsed.moments || parsed.clips || [];
  } catch (err) {
    console.error('Failed to parse moments JSON:', responseText, err);
  }

  // Fallback directly to the top scenes if LLM returned empty
  if (!moments || moments.length === 0) {
    moments = candidateScenes.slice(0, targetClipCount).map((s, idx) => ({
      sceneId: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      category: 'Top Highlight',
      viralScore: 88,
      reason: 'Top engaging scene with dialogue and reaction',
      hook: `MUST WATCH #${idx + 1}`,
      title: `Best Highlight #${idx + 1}`,
      description: 'Check out this moment from the video!',
      hashtags: ['#shorts', '#viral', '#trending'],
    }));
  }

  // Enforce STRICT 25-50s duration & narrative integrity
  return moments.slice(0, targetClipCount).map((m, idx) => {
    let start = Math.max(0, Number(m.startTime));
    let end = Math.min(totalDuration, Number(m.endTime));

    // Match candidate scene if start/end are invalid
    if (isNaN(start) || isNaN(end) || end <= start) {
      const matched = candidateScenes.find((s) => s.id === m.sceneId);
      if (matched) {
        start = matched.startTime;
        end = matched.endTime;
      } else {
        start = Math.max(0, (totalDuration / (idx + 2)) - 15);
        end = start + 32;
      }
    }

    // STRICT DURATION GUARDRAIL: Guarantees full narrative context (25s - 50s)
    let duration = end - start;
    if (duration < 25) {
      const needed = 30 - duration;
      start = Math.max(0, Math.round((start - needed * 0.6) * 10) / 10);
      end = Math.min(totalDuration, Math.round((end + needed * 0.4) * 10) / 10);
    } else if (duration > 55) {
      end = Math.min(totalDuration, Math.round((start + 48) * 10) / 10);
    }

    const viralScore = Math.min(99, Math.max(65, Number(m.viralScore || 85)));

    return {
      id: `clip-${idx + 1}`,
      startTime: Math.round(start * 10) / 10,
      endTime: Math.round(end * 10) / 10,
      wordsScore: viralScore,
      reactionScore: 80,
      score: viralScore,
      reason: m.reason || `${m.category || 'Viral'} highlight`,
      hook: (m.hook || 'WATCH THIS').toUpperCase(),
      title: m.title || `Viral Highlight #${idx + 1}`,
      description: m.description || 'Top clip from the stream.',
      hashtags: Array.isArray(m.hashtags) ? m.hashtags : ['#shorts', '#viral'],
    };
  });
}
