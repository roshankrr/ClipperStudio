'use client';

import React, { useState } from 'react';
import {
  Link2,
  Upload,
  Wand2,
  Youtube,
  PlaySquare,
  Swords,
  Timer,
  MessageSquare,
  Gamepad2,
  Loader2,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CaptionStyle, FrameLayout, TemplateId, Job } from '@/lib/types';

interface UrlInputFormProps {
  onSubmitUrl: (url: string, style: CaptionStyle, layout: FrameLayout) => void;
  onSubmitFile: (file: File, style: CaptionStyle, layout: FrameLayout) => void;
  onJobCreated?: (job: Job) => void;
  disabled?: boolean;
  templateId?: TemplateId;
}

// ─── Versus Studio Form ───────────────────────────────────────────────────────

function VersusForm({
  disabled,
  onJobCreated,
}: {
  disabled?: boolean;
  onJobCreated?: (job: Job) => void;
}) {
  const [clipAUrl, setClipAUrl] = useState('');
  const [clipALabel, setClipALabel] = useState('Old Version');
  const [clipAStartTime, setClipAStartTime] = useState('');
  const [clipBUrl, setClipBUrl] = useState('');
  const [clipBLabel, setClipBLabel] = useState('New Version');
  const [clipBStartTime, setClipBStartTime] = useState('');
  const [interval, setIntervalVal] = useState(8);
  const [cta, setCta] = useState('Which one wins? Comment below');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clipAUrl.trim() || !clipBUrl.trim()) return;
    setLoading(true);
    setError('');
    setStatusMsg('Scanning heatmaps and aligning peak moments...');

    try {
      const payload: Record<string, unknown> = {
        clipAUrl: clipAUrl.trim(),
        clipBUrl: clipBUrl.trim(),
        clipALabel: clipALabel || 'Old Version',
        clipBLabel: clipBLabel || 'New Version',
        interval,
        cta,
      };

      if (clipAStartTime.trim()) {
        payload.clipAStartTime = Number(clipAStartTime);
      }
      if (clipBStartTime.trim()) {
        payload.clipBStartTime = Number(clipBStartTime);
      }

      setStatusMsg('Downloading surgical sections and rendering alternating video...');

      const res = await fetch('/api/versus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to render versus clip');

      if (data.job && onJobCreated) {
        onJobCreated(data.job);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  }

  return (
    <div className="bg-[#0E1118] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-brand">
          <Swords className="w-5 h-5 stroke-[2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-base tracking-tight">Versus Studio</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.06] text-stone-300 border border-white/[0.08]">
              Dual Feed
            </span>
          </div>
          <p className="text-stone-400 text-xs mt-0.5">
            Stack two videos vertically. One plays in full motion while the other pauses in subdued focus.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Video A */}
        <div className="bg-[#141824] border border-white/[0.08] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Top Video (Video A)
            </span>
            <span className="text-[11px] text-stone-400 font-mono">Stage 1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <input
                type="url"
                value={clipAUrl}
                onChange={(e) => setClipAUrl(e.target.value)}
                placeholder="YouTube URL for Video A"
                required
                disabled={disabled || loading}
                className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3.5 py-2.5 text-white placeholder-stone-500 text-xs transition-colors"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="text"
                value={clipALabel}
                onChange={(e) => setClipALabel(e.target.value)}
                placeholder="Label (e.g. Old Version)"
                disabled={disabled || loading}
                className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3.5 py-2.5 text-white placeholder-stone-500 text-xs transition-colors"
              />
            </div>
            <div className="sm:col-span-12">
              <input
                type="number"
                value={clipAStartTime}
                onChange={(e) => setClipAStartTime(e.target.value)}
                placeholder="Start second (leave blank for heatmap auto-peak)"
                disabled={disabled || loading}
                className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3.5 py-2 text-white placeholder-stone-500 text-xs transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Video B */}
        <div className="bg-[#141824] border border-white/[0.08] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Bottom Video (Video B)
            </span>
            <span className="text-[11px] text-stone-400 font-mono">Stage 2</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <input
                type="url"
                value={clipBUrl}
                onChange={(e) => setClipBUrl(e.target.value)}
                placeholder="YouTube URL for Video B"
                required
                disabled={disabled || loading}
                className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3.5 py-2.5 text-white placeholder-stone-500 text-xs transition-colors"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="text"
                value={clipBLabel}
                onChange={(e) => setClipBLabel(e.target.value)}
                placeholder="Label (e.g. New Version)"
                disabled={disabled || loading}
                className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3.5 py-2.5 text-white placeholder-stone-500 text-xs transition-colors"
              />
            </div>
            <div className="sm:col-span-12">
              <input
                type="number"
                value={clipBStartTime}
                onChange={(e) => setClipBStartTime(e.target.value)}
                placeholder="Start second (leave blank for heatmap auto-peak)"
                disabled={disabled || loading}
                className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3.5 py-2 text-white placeholder-stone-500 text-xs transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Duration and CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#141824] border border-white/[0.08] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-brand" /> Spotlight Duration
              </label>
              <span className="text-xs font-mono font-bold text-brand">{interval}s per clip</span>
            </div>
            <input
              type="range"
              min={5}
              max={12}
              value={interval}
              onChange={(e) => setIntervalVal(Number(e.target.value))}
              disabled={disabled || loading}
              className="w-full accent-brand"
            />
            <p className="text-[11px] text-stone-400">
              Total runtime: {interval * 2}s ({interval}s A, then {interval}s B).
            </p>
          </div>

          <div className="bg-[#141824] border border-white/[0.08] rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-brand" /> Bottom Call-to-Action
            </label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              disabled={disabled || loading}
              className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3.5 py-2.5 text-white text-xs transition-colors"
            />
            <p className="text-[11px] text-stone-400">
              Displays at the center split during video playback.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={disabled || loading || !clipAUrl.trim() || !clipBUrl.trim()}
          className="w-full btn-primary py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{statusMsg || 'Rendering Versus Comparison...'}</span>
            </>
          ) : (
            <>
              <Swords className="w-4 h-4" />
              <span>Generate Versus Video</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Gaming Split Form ────────────────────────────────────────────────────────

function GamingForm({
  disabled,
  onJobCreated,
}: {
  disabled?: boolean;
  onJobCreated?: (job: Job) => void;
}) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('bounce');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceUrl.trim()) return;
    setLoading(true);
    setError('');
    setStatusMsg('Locating highest-energy gameplay moment...');

    try {
      const payload: Record<string, unknown> = {
        sourceUrl: sourceUrl.trim(),
        captionStyle,
      };

      if (startTime.trim()) payload.startTime = Number(startTime);
      if (endTime.trim()) payload.endTime = Number(endTime);

      setStatusMsg('Downloading stream slice and generating 9:14 wide action composition...');

      const res = await fetch('/api/gaming-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to render gaming clip');

      if (data.job && onJobCreated) {
        onJobCreated(data.job);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  }

  return (
    <div className="bg-[#0E1118] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none -ml-20 -mt-20" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-brand">
          <Gamepad2 className="w-5 h-5 stroke-[2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-base tracking-tight">Gaming Studio</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.06] text-stone-300 border border-white/[0.08]">
              9:14 Action Framing
            </span>
          </div>
          <p className="text-stone-400 text-xs mt-0.5">
            Preserves camera framing and wide gameplay action cleanly without vertical split bars or cutoffs.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-2 uppercase tracking-wider">
            Stream VOD or Match Link
          </label>
          <div className="relative">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or Twitch VOD"
              required
              disabled={disabled || loading}
              className="w-full bg-[#141824] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-xl px-4 py-3.5 text-white placeholder-stone-500 text-sm transition-colors"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-stone-500 pointer-events-none">
              <Youtube className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#141824] border border-white/[0.08] rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand" /> Segment Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Start (s) [Auto]"
                disabled={disabled || loading}
                className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3 py-2 text-white placeholder-stone-500 text-xs transition-colors"
              />
              <input
                type="number"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="End (s) [Auto]"
                disabled={disabled || loading}
                className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-lg px-3 py-2 text-white placeholder-stone-500 text-xs transition-colors"
              />
            </div>
            <p className="text-[11px] text-stone-400">
              Leave blank to auto-detect the highest audience engagement peak.
            </p>
          </div>

          <div className="bg-[#141824] border border-white/[0.08] rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand" /> Caption Preset
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'bounce', label: 'Bounce' },
                { id: 'hype', label: 'Hype' },
                { id: 'clean', label: 'Clean' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCaptionStyle(s.id as CaptionStyle)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    captionStyle === s.id
                      ? 'bg-brand/15 border-brand/60 text-brand font-bold'
                      : 'bg-[#080A0F] border-white/[0.08] text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-400">Word-timed captions synced to speech.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={disabled || loading || !sourceUrl.trim()}
          className="w-full btn-primary py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{statusMsg || 'Rendering Gaming Clip...'}</span>
            </>
          ) : (
            <>
              <Gamepad2 className="w-4 h-4" />
              <span>Generate Gaming Short</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Main Form (Template 1: Viral Clipper) ────────────────────────────────────

export default function UrlInputForm({
  onSubmitUrl,
  onSubmitFile,
  onJobCreated,
  disabled,
  templateId = 'viral-clipper',
}: UrlInputFormProps) {
  const [tab, setTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('bounce');
  const [frameLayout, setFrameLayout] = useState<FrameLayout>('blurred-fill');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === 'url' && url.trim()) {
      onSubmitUrl(url.trim(), captionStyle, frameLayout);
    } else if (tab === 'upload' && selectedFile) {
      onSubmitFile(selectedFile, captionStyle, frameLayout);
    }
  }

  if (templateId === 'versus-comparison') {
    return <VersusForm disabled={disabled} onJobCreated={onJobCreated} />;
  }

  if (templateId === 'gaming-split') {
    return <GamingForm disabled={disabled} onJobCreated={onJobCreated} />;
  }

  return (
    <div className="bg-[#0E1118] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-6 p-1 bg-[#141824] rounded-xl border border-white/[0.08] max-w-fit">
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === 'url'
              ? 'bg-brand text-[#080A0F] shadow-sm'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Paste Video Link</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === 'upload'
              ? 'bg-brand text-[#080A0F] shadow-sm'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Input Field */}
        {tab === 'url' ? (
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-2 uppercase tracking-wider">
              Paste YouTube or Twitch VOD URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                disabled={disabled}
                className="w-full bg-[#141824] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-xl px-4 py-3.5 text-white placeholder-stone-500 text-sm pr-20 transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-stone-500 pointer-events-none">
                <Youtube className="w-4 h-4" />
                <PlaySquare className="w-4 h-4" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-2 uppercase tracking-wider">
              Select Video File (MP4, MOV, WebM)
            </label>
            <div className="border border-dashed border-white/[0.12] rounded-xl p-8 text-center hover:border-brand/50 transition-colors bg-[#141824] relative cursor-pointer">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                }}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-brand mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-200">
                {selectedFile ? selectedFile.name : 'Click or drop video file here'}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                  : 'Up to 2 GB local file'}
              </p>
            </div>
          </div>
        )}

        {/* Options Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Caption Style */}
          <div className="bg-[#141824] border border-white/[0.08] rounded-xl p-4 space-y-2">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Caption Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bounce', label: 'Bounce', desc: 'Karaoke Pop' },
                { id: 'hype', label: 'Hype', desc: 'High Energy' },
                { id: 'clean', label: 'Clean', desc: 'Minimal Sans' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCaptionStyle(s.id as CaptionStyle)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    captionStyle === s.id
                      ? 'bg-brand/15 border-brand/60 text-white shadow-sm'
                      : 'bg-[#080A0F] border-white/[0.08] text-stone-400 hover:border-white/[0.18]'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{s.label}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Frame Layout */}
          <div className="bg-[#141824] border border-white/[0.08] rounded-xl p-4 space-y-2">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Vertical 9:16 Framing
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'blurred-fill', label: 'Blurred Fill', desc: '9:16 blurred depth background' },
                { id: 'center-crop', label: 'Center Crop', desc: 'Direct center 9:16 crop' },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setFrameLayout(l.id as FrameLayout)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    frameLayout === l.id
                      ? 'bg-brand/15 border-brand/60 text-white shadow-sm'
                      : 'bg-[#080A0F] border-white/[0.08] text-stone-400 hover:border-white/[0.18]'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{l.label}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={disabled || (tab === 'url' ? !url.trim() : !selectedFile)}
          className="w-full btn-primary py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-4 h-4 stroke-[2.5]" />
          <span>Generate Viral Shorts</span>
        </button>
      </form>
    </div>
  );
}
