'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Check,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Youtube,
  Trash2,
  Loader2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface YouTubeStatus {
  hasCredentials: boolean;
  isConnected: boolean;
  channelTitle?: string | null;
  channelCustomUrl?: string | null;
  channelAvatar?: string | null;
}

export default function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasExistingGroq, setHasExistingGroq] = useState(false);
  const [hasExistingGemini, setHasExistingGemini] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [ytStatus, setYtStatus] = useState<YouTubeStatus | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGroqKey('');
      setGeminiKey('');
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          setHasExistingGroq(data.hasGroqKey);
          setHasExistingGemini(data.hasGeminiKey);
        })
        .catch(console.error);

      fetchYouTubeStatus();
    }

    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
        fetchYouTubeStatus();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen]);

  async function fetchYouTubeStatus() {
    setYtLoading(true);
    try {
      const res = await fetch('/api/auth/youtube/status');
      const data = await res.json();
      setYtStatus(data);
    } catch (err) {
      console.error('Failed to fetch YouTube status:', err);
    } finally {
      setYtLoading(false);
    }
  }

  async function handleConnectYouTube() {
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
      alert(msg);
    }
  }

  async function handleDisconnectYouTube() {
    if (!window.confirm('Disconnect your YouTube channel?')) return;
    try {
      await fetch('/api/auth/youtube/status', { method: 'DELETE' });
      fetchYouTubeStatus();
    } catch (err) {
      console.error('Failed to disconnect YouTube:', err);
    }
  }

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groqApiKey: groqKey.trim() || undefined,
          geminiApiKey: geminiKey.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          onSaved();
          onClose();
        }, 800);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0E1118] border border-white/[0.1] rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Studio Configuration</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Saved strictly on the local backend server. Never returned or leaked to the client.
            </p>
          </div>
        </div>

        {/* ── YouTube Integration Section ─────────────────────────────── */}
        <div className="p-4 rounded-xl bg-[#141824] border border-white/[0.08] mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-500 fill-red-500 stroke-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                YouTube Shorts Publishing
              </span>
            </div>
            {ytStatus?.isConnected ? (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Channel Linked
              </span>
            ) : ytStatus?.hasCredentials ? (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand/15 text-brand border border-brand/30 font-semibold">
                OAuth Configured in .env
              </span>
            ) : null}
          </div>

          {ytLoading ? (
            <div className="flex items-center gap-2 text-xs text-stone-400 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
              <span>Checking connection status...</span>
            </div>
          ) : ytStatus?.isConnected ? (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                {ytStatus.channelAvatar ? (
                  <img
                    src={ytStatus.channelAvatar}
                    alt={ytStatus.channelTitle || 'Channel'}
                    className="w-8 h-8 rounded-full border border-red-500/40 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xs font-bold">
                    YT
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white leading-none">{ytStatus.channelTitle}</p>
                  <p className="text-[10px] text-stone-400 mt-1">{ytStatus.channelCustomUrl || 'Authorized for 1-click publishing'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDisconnectYouTube}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.08] transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-stone-400 leading-relaxed">
                Connect your YouTube channel using Google Cloud OAuth credentials to unlock 1-click direct publishing.
              </p>
              <button
                type="button"
                onClick={handleConnectYouTube}
                className="btn-primary w-full py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm font-bold"
              >
                <Youtube className="w-4 h-4 fill-[#080A0F]" />
                <span>Authorize &amp; Link YouTube Channel</span>
              </button>
            </div>
          )}
        </div>

        {/* ── AI Engine Keys Section ─────────────────────────────────── */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Groq Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                <span>Groq API Key</span>
                {hasExistingGroq ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand/15 text-brand border border-brand/30">
                    Required
                  </span>
                )}
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder={hasExistingGroq ? '•••••••••••••••••••••••••••••••• (Leave blank to keep current)' : 'gsk_...'}
              className="w-full bg-[#141824] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-stone-500 transition-colors"
            />
            <p className="text-[11px] text-stone-400">
              Powers word-level Whisper transcription and moments scoring for free.
            </p>
          </div>

          {/* Gemini Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                <span>Google Gemini API Key</span>
                {hasExistingGemini && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                )}
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={hasExistingGemini ? '•••••••••••••••••••••••••••••••• (Leave blank to keep current)' : 'AIzaSy... (Optional)'}
              className="w-full bg-[#141824] border border-white/[0.08] focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-stone-500 transition-colors"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[#141824] border border-white/[0.08] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-300 space-y-0.5">
              <p className="font-semibold text-white">Local Storage &amp; Zero Exposure</p>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                Stored locally in <code className="text-stone-300">storage/settings.json</code>. Requests execute entirely on your backend; keys are never transmitted to browser clients.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading || (!groqKey.trim() && !geminiKey.trim())}
              className="btn-primary px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved
                </>
              ) : (
                'Save Keys'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
