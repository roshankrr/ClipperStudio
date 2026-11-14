'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Check, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasExistingGroq, setHasExistingGroq] = useState(false);
  const [hasExistingGemini, setHasExistingGemini] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-dark-frame border border-dark-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Engine Configuration</h3>
            <p className="text-xs text-stone-400">
              Keys are strictly saved on the backend server and never returned to the browser.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Groq Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <span>Groq API Key</span>
                {hasExistingGroq ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Configured &amp; Active
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-brand/20 text-brand border border-brand/30">
                    Required for Whisper + Llama
                  </span>
                )}
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand hover:underline flex items-center gap-1"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder={hasExistingGroq ? '•••••••••••••••••••••••••••••••• (Enter new to replace)' : 'gsk_...'}
              className="w-full bg-dark-surface border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-brand"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Powers word-level Whisper transcription and moments scoring for free.
            </p>
          </div>

          {/* Gemini Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <span>Google Gemini API Key</span>
                {hasExistingGemini && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Configured &amp; Active
                  </span>
                )}
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand hover:underline flex items-center gap-1"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={hasExistingGemini ? '•••••••••••••••••••••••••••••••• (Enter new to replace)' : 'AIzaSy... (Optional)'}
              className="w-full bg-dark-surface border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-dark-surface/60 border border-dark-border/60 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-300 space-y-1">
              <p className="font-semibold text-white">Zero Frontend Exposure</p>
              <p className="text-stone-400 text-[11px]">
                API keys are stored strictly in the backend <code className="text-stone-300">storage/settings.json</code>. All AI requests execute server-side; keys are never transmitted to browser clients or network inspection tabs.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-stone-400 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading || (!groqKey.trim() && !geminiKey.trim())}
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-50 text-dark-frame font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-brand/20 cursor-pointer disabled:cursor-not-allowed"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
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
