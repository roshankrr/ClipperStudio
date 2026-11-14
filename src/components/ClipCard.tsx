'use client';

import React, { useState } from 'react';
import { Download, Copy, Check, Play, Flame, Share2, Clock } from 'lucide-react';
import { Clip } from '@/lib/types';

interface ClipCardProps {
  clip: Clip;
}

export default function ClipCard({ clip }: ClipCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyText() {
    const text = `${clip.title}\n\n${clip.description}\n\n${clip.hashtags.join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-dark-surface border border-dark-border rounded-3xl overflow-hidden shadow-2xl flex flex-col group hover:border-brand/50 transition-all duration-300">
      {/* 9:16 Video Container */}
      <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
        <video
          src={clip.publicUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />

        {/* Viral Score Badge */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-frame/90 backdrop-blur-md border border-brand/40 text-brand text-xs font-bold shadow-lg">
          <Flame className="w-3.5 h-3.5 fill-brand" />
          <span>{clip.score}/100</span>
        </div>

        {/* Duration Badge */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-stone-300 text-xs font-semibold">
          <Clock className="w-3 h-3" />
          <span>{clip.duration.toFixed(0)}s</span>
        </div>
      </div>

      {/* Info & Actions */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Hook Badge */}
          <div className="mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-brand/15 text-brand border border-brand/30">
              Hook: {clip.hook}
            </span>
          </div>

          <h4 className="text-base font-bold text-white line-clamp-1">{clip.title}</h4>
          <p className="text-xs text-stone-400 mt-1 line-clamp-2">{clip.description}</p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {clip.hashtags.slice(0, 4).map((tag, idx) => (
              <span key={idx} className="text-[10px] text-stone-500 font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dark-border/60">
          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-dark-frame hover:bg-dark-border/80 border border-dark-border text-xs font-semibold text-stone-200 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-400" />
                <span>Copy Post</span>
              </>
            )}
          </button>

          <a
            href={clip.publicUrl}
            download={`${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-dark-frame text-xs font-bold transition-all shadow-md shadow-brand/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download MP4</span>
          </a>
        </div>
      </div>
    </div>
  );
}
