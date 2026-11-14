import fs from 'fs';
import path from 'path';
import { CONFIG } from './config';
import { CaptionStyle, TranscriptSegment, WordTimestamp } from './types';

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

export function generateAssSubtitles(
  segments: TranscriptSegment[],
  clipStart: number,
  clipEnd: number,
  hook: string,
  style: CaptionStyle,
  outputPath: string
): string {
  // Filter segments within clip time range and offset times relative to clip start
  const clipWords: WordTimestamp[] = [];

  for (const seg of segments) {
    if (seg.words && seg.words.length > 0) {
      for (const w of seg.words) {
        if (w.start >= clipStart - 0.5 && w.end <= clipEnd + 0.5) {
          clipWords.push({
            word: w.word.trim(),
            start: Math.max(0, w.start - clipStart),
            end: Math.max(0, w.end - clipStart),
          });
        }
      }
    } else if (seg.start >= clipStart - 0.5 && seg.end <= clipEnd + 0.5) {
      // Fallback: estimate word timings if individual word timestamps are missing
      const words = seg.text.split(/\s+/);
      const duration = (seg.end - seg.start) / Math.max(1, words.length);
      words.forEach((w, i) => {
        const wStart = seg.start + (i * duration) - clipStart;
        const wEnd = wStart + duration;
        if (wStart >= 0) {
          clipWords.push({ word: w, start: wStart, end: wEnd });
        }
      });
    }
  }

  // Style configurations
  // Colors in ASS are &HAABBGGRR (Alpha, Blue, Green, Red)
  let fontName = 'Arial';
  let primaryColor = '&H00FFFFFF'; // White
  let highlightColor = '&H0000D4FF'; // Orange/Yellow (&H00338BFF in BGR)
  let outlineColor = '&H00000000'; // Black
  let backColor = '&H80000000';
  let fontSize = 48;
  let bold = 1;
  let outline = 4;
  let shadow = 2;
  let alignment = 2; // Bottom center
  let marginV = 280; // Raised up from bottom to clear mobile UI

  if (style === 'bounce') {
    fontName = 'Arial Black';
    fontSize = 54;
    primaryColor = '&H00FFFFFF';
    highlightColor = '&H0000E6FF'; // Vibrant Yellow-Orange
    outline = 5;
    shadow = 3;
    marginV = 320;
  } else if (style === 'hype') {
    fontName = 'Impact';
    fontSize = 58;
    primaryColor = '&H0000FFFF'; // Bright Yellow
    highlightColor = '&H0033FF33'; // Neon Green
    outline = 6;
    shadow = 4;
    marginV = 340;
  } else if (style === 'clean') {
    fontName = 'Helvetica';
    fontSize = 42;
    primaryColor = '&H00FFFFFF';
    highlightColor = '&H00FFB27A'; // Warm Peach
    outline = 2;
    shadow = 0;
    marginV = 260;
  }

  const assHeader = `[Script Info]
Title: PeakCut Studio Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,${fontName},${fontSize},${primaryColor},${highlightColor},${outlineColor},${backColor},${bold},0,0,0,100,100,0,0,1,${outline},${shadow},${alignment},40,40,${marginV},1
Style: Hook,Arial Black,50,&H00FFFFFF,&H00FFFFFF,&H00000000,&H801E1612,1,0,0,0,100,100,2,0,1,4,4,8,40,40,160,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = '';

  // 1. Pinned Hook Line (Top center banner, visible throughout the clip)
  const clipDuration = clipEnd - clipStart;
  if (hook) {
    events += `Dialogue: 0,0:00:00.00,${formatAssTime(clipDuration)},Hook,,0,0,0,,{\\bord3\\shad2\\c&H00338BFF&}[ ${hook.toUpperCase()} ]\n`;
  }

  // 2. Group words into 3-4 word phrases with karaoke highlighting
  const phraseSize = 3;
  for (let i = 0; i < clipWords.length; i += phraseSize) {
    const chunk = clipWords.slice(i, i + phraseSize);
    if (chunk.length === 0) continue;

    const phraseStart = chunk[0].start;
    const phraseEnd = chunk[chunk.length - 1].end;

    // Create a dialogue line for each active word inside the phrase
    for (let activeIdx = 0; activeIdx < chunk.length; activeIdx++) {
      const activeWord = chunk[activeIdx];
      const wordStart = activeWord.start;
      const wordEnd = activeWord.end;

      if (wordEnd <= wordStart) continue;

      // Construct phrase with active word highlighted
      const phraseText = chunk
        .map((w, idx) => {
          if (idx === activeIdx) {
            // Highlighted active word
            if (style === 'bounce') {
              return `{\\c${highlightColor}\\fscx112\\fscy112}${w.word}{\\r}`;
            } else if (style === 'hype') {
              return `{\\c${highlightColor}\\u1}${w.word.toUpperCase()}{\\r}`;
            } else {
              return `{\\c${highlightColor}}${w.word}{\\r}`;
            }
          } else {
            return `{\\c${primaryColor}}${style === 'hype' ? w.word.toUpperCase() : w.word}`;
          }
        })
        .join(' ');

      events += `Dialogue: 1,${formatAssTime(wordStart)},${formatAssTime(wordEnd)},Main,,0,0,0,,${phraseText}\n`;
    }
  }

  const fullAss = assHeader + events;
  fs.writeFileSync(outputPath, fullAss, 'utf-8');
  return outputPath;
}
