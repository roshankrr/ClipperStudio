/**
 * Versus Studio renderer — Template 2
 *
 * Creates a clean 1080×1920 vertical comparison video:
 *
 *   Phase 1 (0 → interval s):
 *     - Top (1080×960): Clip A plays in full vibrant color with its audio
 *     - Bottom (1080×960): Clip B is FROZEN on frame 0, desaturated to B&W, blurred
 *     - Clean raw video: NO hardcoded/baked-in uneditable texts or badges!
 *
 *   Phase 2 (interval → interval*2 s):
 *     - Top (1080×960): Clip A is FROZEN on its last frame, desaturated to B&W, blurred
 *     - Bottom (1080×960): Clip B comes alive in full vibrant color with its audio
 *     - Clean raw video: NO hardcoded/baked-in uneditable texts or badges!
 *
 * All text overlays, hooks, labels, and badges are fully optional and editable in Studio Editor.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';

export interface VersusRenderOptions {
  clipAPath: string;      // downloaded slice for Clip A
  clipBPath: string;      // downloaded slice for Clip B
  interval: number;       // seconds each clip is spotlit (5–12 s)
  outputPath: string;
}

/**
 * Strips emoji characters that standard FFmpeg libfreetype cannot render (avoids ugly black boxes or ?? glyphs)
 */
export function stripEmojis(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF\u2300-\u23FF\uFE0F\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes and escapes text for FFmpeg drawtext filter arguments
 */
export function escapeDrawText(text: string): string {
  const clean = stripEmojis(text);
  return clean
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\u2019")
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/%/g, '%%');
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(CONFIG.BIN_FFMPEG, args);
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    proc.on('close', (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited code ${code}. Stderr: ${stderr.slice(-600)}`));
    });
  });
}

export async function renderVersusClip(opts: VersusRenderOptions): Promise<string> {
  const { clipAPath, clipBPath, interval, outputPath } = opts;
  const intv = Math.min(12, Math.max(5, interval));

  const tmpDir = path.dirname(outputPath);
  const phaseAPath = path.join(tmpDir, `_vs_pA_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp4`);
  const phaseBPath = path.join(tmpDir, `_vs_pB_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp4`);
  const listPath  = path.join(tmpDir, `_vs_list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.txt`);

  // ── PHASE A: Clip A plays on top; Clip B is FROZEN in B&W blur on bottom ────
  // Completely CLEAN video: NO baked-in uneditable texts or boxes!
  const filterA = [
    // Clip A: plays from 0 to intv, scaled to 1080x960
    `[0:v]trim=0:${intv},setpts=PTS-STARTPTS,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,fps=30[topA]`,
    // Clip B: freeze frame 0 for intv seconds, B&W (hue=s=0) + blur, scaled to 1080x960
    `[1:v]trim=0:0.1,setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=${intv},scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,hue=s=0,boxblur=16:5[botA_raw]`,
    `[botA_raw]eq=brightness=-0.08[botA]`,
    // Stack top and bottom into clean 1080x1920
    `[topA][botA]vstack=inputs=2[v]`,
  ].join(';');

  await runFFmpeg([
    '-y',
    '-i', clipAPath,
    '-i', clipBPath,
    '-filter_complex', filterA,
    '-map', '[v]',
    '-map', '0:a?',
    '-t', String(intv),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    phaseAPath,
  ]);

  // ── PHASE B: Clip A is FROZEN in B&W blur on top; Clip B plays on bottom ────
  // Completely CLEAN video: NO baked-in uneditable texts or boxes!
  const freezeLastStart = Math.max(0, intv - 0.2);
  const filterB = [
    // Clip A: freeze its last frame in B&W + blur
    `[0:v]trim=${freezeLastStart.toFixed(2)}:${intv.toFixed(2)},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=${intv},scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,hue=s=0,boxblur=16:5[topB_raw]`,
    `[topB_raw]eq=brightness=-0.08[topB]`,
    // Clip B: plays in full color from 0 to intv
    `[1:v]trim=0:${intv},setpts=PTS-STARTPTS,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,fps=30[botB]`,
    // Stack top and bottom into clean 1080x1920
    `[topB][botB]vstack=inputs=2[v]`,
  ].join(';');

  await runFFmpeg([
    '-y',
    '-i', clipAPath,
    '-i', clipBPath,
    '-filter_complex', filterB,
    '-map', '[v]',
    '-map', '1:a?',
    '-t', String(intv),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    phaseBPath,
  ]);

  // ── Concat list ────────────────────────────────────────────────────────────
  fs.writeFileSync(
    listPath,
    `file '${phaseAPath.replace(/'/g, "'\\''")}'\nfile '${phaseBPath.replace(/'/g, "'\\''")}'\n`,
    'utf-8'
  );

  // ── Concat Pass: Clean split video with NO hardcoded baked-in text ─────────
  await runFFmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ]);

  // ── Cleanup temp slice files ───────────────────────────────────────────────
  for (const f of [phaseAPath, phaseBPath, listPath]) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }

  return outputPath;
}
