'use client';

import React, { useState } from 'react';
import { Link2, Upload, Sparkles, Film, Wand2, Youtube, PlaySquare, AlertCircle } from 'lucide-react';
import { CaptionStyle, FrameLayout } from '@/lib/types';

interface UrlInputFormProps {
  onSubmitUrl: (url: string, style: CaptionStyle, layout: FrameLayout) => void;
  onSubmitFile: (file: File, style: CaptionStyle, layout: FrameLayout) => void;
  disabled?: boolean;
}

export default function UrlInputForm({
  onSubmitUrl,
  onSubmitFile,
  disabled,
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

  return (
    <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-dark-frame rounded-2xl border border-dark-border/60 max-w-fit">
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === 'url'
              ? 'bg-brand text-dark-frame shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Paste Link</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === 'upload'
              ? 'bg-brand text-dark-frame shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Video</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Input Field */}
        {tab === 'url' ? (
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
              Paste YouTube, Twitch or Kick Link
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or Twitch / Kick URL"
                required
                disabled={disabled}
                className="w-full bg-dark-frame border border-dark-border rounded-2xl px-5 py-4 text-white placeholder-stone-500 focus:outline-none focus:border-brand text-base pr-28 transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-stone-500 pointer-events-none">
                <Youtube className="w-5 h-5 hover:text-red-500" />
                <PlaySquare className="w-5 h-5 hover:text-purple-500" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
              Select Video File (MP4, MOV, WebM)
            </label>
            <div className="border-2 border-dashed border-dark-border rounded-2xl p-6 text-center hover:border-brand/60 transition-colors bg-dark-frame/50 relative">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                }}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-brand mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-200">
                {selectedFile ? selectedFile.name : 'Click or drag video file here'}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                  : 'Up to 2GB video file'}
              </p>
            </div>
          </div>
        )}

        {/* Options Row: Caption Styles & Frame Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Caption Style */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
              Animated Caption Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bounce', label: 'Bounce', desc: 'Karaoke Pop' },
                { id: 'hype', label: 'Hype', desc: 'High Energy' },
                { id: 'clean', label: 'Clean', desc: 'Modern Sans' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCaptionStyle(s.id as CaptionStyle)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    captionStyle === s.id
                      ? 'bg-brand/10 border-brand text-white shadow-sm'
                      : 'bg-dark-frame border-dark-border text-stone-400 hover:border-stone-500'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{s.label}</p>
                  <p className="text-[10px] text-stone-400">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Frame Layout */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
              Vertical 9:16 Re-Framing
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'blurred-fill', label: 'Blurred Fill', desc: 'Centered with 9:16 background blur' },
                { id: 'center-crop', label: 'Center Crop', desc: 'Direct center 9:16 crop' },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setFrameLayout(l.id as FrameLayout)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    frameLayout === l.id
                      ? 'bg-brand/10 border-brand text-white shadow-sm'
                      : 'bg-dark-frame border-dark-border text-stone-400 hover:border-stone-500'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{l.label}</p>
                  <p className="text-[10px] text-stone-400">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || (tab === 'url' ? !url.trim() : !selectedFile)}
          className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-dark-frame font-bold text-base py-4 rounded-2xl transition-all shadow-xl shadow-brand/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          <Wand2 className="w-5 h-5 text-dark-frame" />
          <span>Make Viral Clips (Free & Unlimited)</span>
        </button>
      </form>
    </div>
  );
}
