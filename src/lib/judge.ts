import { getSettings } from './config';
import { TranscriptSegment, ClipMoment } from './types';
import { AudioEnergyPoint } from './audio';

export async function findPeakMoments(
  segments: TranscriptSegment[],
  energyPoints: AudioEnergyPoint[],
  totalDuration: number,
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

  // To stay safely within Groq Free Tier TPM limit (8,000 tokens per minute),
  // we intelligently condense the transcript to ~8,000 characters (~1,800 tokens).
  // If the transcript is long, we select segments around the loudest audio energy peaks!
  let selectedSegments = segments;

  if (segments.length > 50) {
    // Sort energy points to find top energy peaks
    const topPeaks = [...energyPoints]
      .sort((a, b) => b.energyScore - a.energyScore)
      .slice(0, 10);

    // Pick segments that fall near those top energy peaks
    const peakSegments = new Set<TranscriptSegment>();
    for (const peak of topPeaks) {
      for (const seg of segments) {
        if (seg.start >= peak.time - 30 && seg.end <= peak.time + 30) {
          peakSegments.add(seg);
        }
      }
    }

    if (peakSegments.size >= 10) {
      selectedSegments = Array.from(peakSegments).sort((a, b) => a.start - b.start);
    } else {
      // Otherwise evenly sample segments across the duration
      const step = Math.ceil(segments.length / 45);
      selectedSegments = segments.filter((_, idx) => idx % step === 0);
    }
  }

  // Format into a clean, concise timestamped transcript
  const formattedTranscript = selectedSegments
    .map((s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`)
    .join('\n')
    .slice(0, 8500); // Guarantees <= 2000 tokens to easily clear Groq's 8000 TPM limit

  const prompt = `You are the "Words Judge" for PeakCut, an elite viral video editor.
Find the top ${targetClipCount} most engaging, viral, funny, or high-hook highlight moments for vertical TikTok/Shorts/Reels (each 20 to 50 seconds long).

RULES:
1. For each moment:
   - Provide exact startTime and endTime in seconds matching the transcript.
   - wordsScore from 1 to 100.
   - Catchy, bold hook headline (3-5 words) to overlay on video.
   - Title, description, and 3-5 hashtags.
2. Output STRICTLY a JSON object with a "moments" key containing the array.

Example JSON output format:
{
  "moments": [
    {
      "startTime": 10.0,
      "endTime": 40.0,
      "wordsScore": 92,
      "hook": "THE SECRET POWER",
      "title": "Why Doctor Doom Needs Wanda",
      "description": "The secret reason Doctor Doom is hunting Wanda in the multiverse.",
      "hashtags": ["#shorts", "#marvel", "#mcu"]
    }
  ]
}

TRANSCRIPT:
${formattedTranscript}
`;

  let responseText = '';
  let lastError: Error | null = null;

  // Active models on your Groq key (decommissioned models removed)
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
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          responseText = json.choices[0]?.message?.content || '{}';
          lastError = null;
          break; // Success!
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

  // If Groq attempts failed, try Gemini as fallback
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
      } else {
        lastError = new Error(`Gemini LLM call failed: ${await res.text()}`);
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

  // Safe fallback if LLM returned 0 items
  if (!moments || moments.length === 0) {
    moments = [
      {
        startTime: Math.max(0, totalDuration * 0.2),
        endTime: Math.min(totalDuration, (totalDuration * 0.2) + 35),
        wordsScore: 85,
        reason: 'Featured clip segment',
        hook: 'MUST WATCH',
        title: 'Top Highlight',
        description: 'Check out this moment from the video!',
        hashtags: ['#shorts', '#viral', '#highlight'],
      },
    ];
  }

  // Cross-reference with the Reaction Judge (Audio Energy)
  return moments.map((m, idx) => {
    const start = Math.max(0, Number(m.startTime));
    const end = Math.min(totalDuration, Number(m.endTime));

    // Calculate average audio energy during this clip window
    const pointsInWindow = energyPoints.filter(
      (p) => p.time >= start && p.time <= end
    );

    const avgReaction =
      pointsInWindow.length > 0
        ? pointsInWindow.reduce((acc, p) => acc + p.energyScore, 0) /
          pointsInWindow.length
        : 65;

    const wordsScore = Math.min(100, Math.max(1, Number(m.wordsScore || 75)));
    const reactionScore = Math.round(avgReaction);
    const finalScore = Math.round(wordsScore * 0.6 + reactionScore * 0.4);

    return {
      id: `clip-${idx + 1}`,
      startTime: Math.round(start * 10) / 10,
      endTime: Math.round(end * 10) / 10,
      wordsScore,
      reactionScore,
      score: finalScore,
      reason: m.reason || 'AI consensus pick',
      hook: (m.hook || 'WATCH THIS').toUpperCase(),
      title: m.title || `Viral Highlight #${idx + 1}`,
      description: m.description || 'Top clip from the stream.',
      hashtags: Array.isArray(m.hashtags) ? m.hashtags : ['#shorts', '#viral'],
    };
  });
}
