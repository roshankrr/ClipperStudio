'use client';

import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Flame,
  Clock,
  PencilLine,
  Sparkles,
  Youtube,
  ExternalLink,
} from 'lucide-react';
import { Clip } from '@/lib/types';
import EditModePanel from './EditModePanel';
import YouTubePublishModal from './YouTubePublishModal';

interface ClipCardProps {
  clip: Clip;
  jobId: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

export default function ClipCard({ clip: initialClip, jobId, sourceTitle, sourceUrl }: ClipCardProps) {
  const [clip, setClip] = useState<Clip>(initialClip);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  function handleCopyText() {
    const text = `${clip.title}\n\n${clip.description}\n\n${clip.hashtags.join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="bg-[#0E1118] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col card-lift group hover:border-brand/40 transition-all duration-200">
        {/* 9:16 Video Container */}
        <div className="relative aspect-[9/16] bg-[#050608] overflow-hidden flex items-center justify-center">
          <video
            key={clip.publicUrl}
            src={clip.publicUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />

          {/* Viral Score Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080A0F]/90 backdrop-blur-md border border-brand/40 text-brand text-[11px] font-bold shadow-lg">
            <Flame className="w-3.5 h-3.5 fill-brand" />
            <span>{clip.score}/100</span>
          </div>

          {/* Duration Badge */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#080A0F]/80 backdrop-blur-md text-stone-300 text-[10px] font-mono font-medium border border-white/[0.08]">
            <Clock className="w-3 h-3 text-stone-400" />
            <span>{clip.duration.toFixed(0)}s</span>
          </div>

          {/* Fast Edit Trigger floating pill */}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            title="Open Studio Editor"
            className="absolute top-12 right-3 z-10 px-2.5 py-1 rounded-full bg-brand/90 hover:bg-brand text-[#080A0F] font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-brand/20 backdrop-blur-md flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <PencilLine className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        {/* Info & Actions */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
          <div>
            {/* Hook Badge */}
            {clip.hook && (
              <div className="mb-2">
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-white/[0.05] text-stone-300 border border-white/[0.08] line-clamp-1 inline-block">
                  Hook: {clip.hook}
                </span>
              </div>
            )}

            <h4 className="text-sm font-bold text-white line-clamp-1">{clip.title}</h4>
            <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">{clip.description}</p>

            <div className="flex flex-wrap gap-1 mt-3">
              {clip.hashtags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="text-[10px] text-stone-500 font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            {/* YouTube 1-Click Publish Button */}
            {clip.youtubeUrl ? (
              <a
                href={clip.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all cursor-pointer active:scale-98"
              >
                <Youtube className="w-4 h-4 fill-emerald-400 stroke-0" />
                <span>Live on YouTube Shorts</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setPublishOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer active:scale-98 shadow-sm"
              >
                <Youtube className="w-4 h-4 fill-current stroke-0" />
                <span>1-Click Publish to YouTube Shorts</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyText}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-stone-300 transition-all cursor-pointer active:scale-98"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <a
                href={clip.publicUrl}
                download={`${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-stone-200 text-xs font-bold transition-all cursor-pointer active:scale-98"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save MP4</span>
              </a>
            </div>

            {/* Studio Editor Button */}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand text-xs font-bold transition-all cursor-pointer active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio Editor (Crop, Text, Subtitles, Trim)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Mode Panel */}
      {editOpen && (
        <EditModePanel
          clip={clip}
          jobId={jobId}
          onClose={() => setEditOpen(false)}
          onClipUpdated={(updated) => setClip(updated)}
        />
      )}

      {/* YouTube Publish Modal */}
      {publishOpen && (
        <YouTubePublishModal
          clip={clip}
          jobId={jobId}
          sourceTitle={sourceTitle}
          sourceUrl={sourceUrl}
          onClose={() => setPublishOpen(false)}
          onPublished={(url) => setClip((prev) => ({ ...prev, youtubeUrl: url }))}
        />
      )}
    </>
  );
}
