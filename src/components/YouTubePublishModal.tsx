'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Youtube,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Calendar,
  Lock,
  Globe,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { Clip } from '@/lib/types';

interface YouTubePublishModalProps {
  clip: Clip;
  jobId: string;
  sourceTitle?: string;
  sourceUrl?: string;
  onClose: () => void;
  onPublished?: (videoUrl: string) => void;
}

interface YouTubeStatus {
  hasCredentials: boolean;
  isConnected: boolean;
  channelTitle?: string | null;
  channelCustomUrl?: string | null;
  channelAvatar?: string | null;
}

export default function YouTubePublishModal({
  clip,
  jobId,
  sourceTitle,
  sourceUrl,
  onClose,
  onPublished,
}: YouTubePublishModalProps) {
  const [status, setStatus] = useState<YouTubeStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [title, setTitle] = useState(
    clip.title.length > 85 ? clip.title.slice(0, 85) + '...' : clip.title
  );

  const initialCredit = sourceUrl
    ? `\n\n---\n📌 Credit / Original Creator: ${sourceTitle || 'Original Streamer/Creator'}\n🔗 Watch Original: ${sourceUrl}\nAll rights belong to the original owner.`
    : sourceTitle
    ? `\n\n---\n📌 Credit / Original Creator: ${sourceTitle}\nAll rights belong to the original owner.`
    : `\n\n---\n📌 Credit to the original creator and broadcaster.`;

  const [description, setDescription] = useState(
    `${clip.description}\n\n${clip.hashtags.join(' ')}${initialCredit}\n\n#shorts`
  );
  const [tags, setTags] = useState(clip.hashtags.join(', '));
  // Default to 'private' (Draft mode) so user can review in YouTube Studio
  const [privacyStatus, setPrivacyStatus] = useState<'public' | 'unlisted' | 'private'>('private');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(0);
    return d.toISOString().slice(0, 16);
  });

  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(clip.youtubeUrl || null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStatus();

    // Listen for auth success message from OAuth popup window
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
        fetchStatus();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function fetchStatus() {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/auth/youtube/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch YouTube status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleConnect() {
    try {
      const res = await fetch('/api/auth/youtube/url');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get auth URL');

      const width = 520;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        data.url,
        'YouTubeAuth',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setPublishing(true);
    setError('');

    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await fetch('/api/youtube/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: clip.id,
          jobId,
          title: title.trim(),
          description: description.trim(),
          tags: parsedTags,
          privacyStatus: isScheduled ? 'private' : privacyStatus,
          publishAt: isScheduled ? new Date(scheduledDate).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload video to YouTube');
      }

      setPublishedUrl(data.videoUrl);
      onPublished?.(data.videoUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setPublishing(false);
    }
  }

  function handleCopy() {
    if (!publishedUrl) return;
    navigator.clipboard.writeText(publishedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0E1118] border border-white/[0.1] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shadow-sm">
              <Youtube className="w-5 h-5 fill-red-500 stroke-0" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Publish to YouTube Shorts</h3>
              <p className="text-xs text-stone-400">1-click direct upload via YouTube Data API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Channel Connection Banner */}
          {loadingStatus ? (
            <div className="p-4 rounded-xl bg-[#141824] border border-white/[0.08] flex items-center justify-center gap-2 text-xs text-stone-400">
              <Loader2 className="w-4 h-4 animate-spin text-brand" />
              <span>Checking channel connection status...</span>
            </div>
          ) : !status?.isConnected ? (
            <div className="p-4 rounded-xl bg-[#141824] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Connect YouTube Channel</h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Link your YouTube account to upload directly with 1 click.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnect}
                  className="btn-primary px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Youtube className="w-4 h-4 fill-[#080A0F]" />
                  <span>Connect Channel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#141824] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status.channelAvatar ? (
                  <img
                    src={status.channelAvatar}
                    alt={status.channelTitle || 'Channel'}
                    className="w-8 h-8 rounded-full border border-red-500/40 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xs font-bold">
                    YT
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{status.channelTitle}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  {status.channelCustomUrl && (
                    <span className="text-[11px] text-stone-400">{status.channelCustomUrl}</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
            </div>
          )}

          {/* Published Success Banner */}
          {publishedUrl ? (
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div>
                <h4 className="text-base font-bold text-white">Short Published!</h4>
                <p className="text-xs text-stone-300 mt-1">
                  Your clip is live on YouTube Shorts. It is now processing and ready for viewers.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Watch on YouTube Shorts</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3.5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-stone-200 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-stone-300 uppercase tracking-wider">
                    Short Title
                  </label>
                  <span className="text-stone-400 font-mono text-[11px]">{title.length}/100</span>
                </div>
                <input
                  type="text"
                  value={title}
                  maxLength={95}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title of your Short..."
                  required
                  disabled={publishing || !status?.isConnected}
                  className="w-full bg-[#141824] border border-white/[0.08] focus:border-red-500/70 focus:ring-1 focus:ring-red-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-stone-500 transition-colors"
                />
                <p className="text-[10px] text-stone-400">`#shorts` is automatically appended to qualify for the Shorts feed.</p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                  Description &amp; Hashtags
                </label>
                <textarea
                  value={description}
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={publishing || !status?.isConnected}
                  className="w-full bg-[#141824] border border-white/[0.08] focus:border-red-500/70 focus:ring-1 focus:ring-red-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-stone-500 transition-colors resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={publishing || !status?.isConnected}
                  className="w-full bg-[#141824] border border-white/[0.08] focus:border-red-500/70 focus:ring-1 focus:ring-red-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-stone-500 transition-colors"
                />
              </div>

              {/* Privacy Setting */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                  Visibility
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'private', label: 'Draft (Private)', icon: Lock, desc: 'Review in Studio', isDefault: true },
                    { id: 'unlisted', label: 'Unlisted', icon: EyeOff, desc: 'Link only' },
                    { id: 'public', label: 'Public', icon: Globe, desc: 'Instant live' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isScheduled || publishing || !status?.isConnected}
                      onClick={() => setPrivacyStatus(p.id as any)}
                      className={`relative p-2 rounded-lg border text-left transition-all ${
                        privacyStatus === p.id && !isScheduled
                          ? 'bg-red-500/15 border-red-500/60 text-white'
                          : 'bg-[#141824] border-white/[0.08] text-stone-400 hover:text-stone-200'
                      } ${isScheduled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {p.isDefault && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                          Default
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p.icon className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs font-bold text-white">{p.label}</span>
                      </div>
                      <span className="text-[10px] text-stone-400">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled Publishing */}
              <div className="p-3 rounded-xl bg-[#141824] border border-white/[0.08] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    disabled={publishing || !status?.isConnected}
                    className="accent-red-500 rounded"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Calendar className="w-3.5 h-3.5 text-red-400" />
                    <span>Schedule Release Time</span>
                  </div>
                </label>

                {isScheduled && (
                  <div className="pt-1">
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      disabled={publishing}
                      className="w-full bg-[#080A0F] border border-white/[0.08] focus:border-red-500/70 focus:ring-1 focus:ring-red-500/30 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      Uploaded as private and scheduled to go public at this exact time.
                    </p>
                  </div>
                )}
              </div>

              {/* Error Notice */}
              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={publishing || !status?.isConnected || !title.trim()}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-red-600/20 disabled:cursor-not-allowed"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Streaming to YouTube Shorts...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>{isScheduled ? 'Schedule on YouTube Shorts' : 'Upload to YouTube Shorts'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
