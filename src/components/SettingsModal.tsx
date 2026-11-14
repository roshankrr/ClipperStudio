'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Check, ExternalLink, ShieldCheck } from 'lucide-react';

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
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          setHasExistingGroq(data.hasGroqKey);
          setHasExistingGemini(data.hasGeminiKey);
          if (data.groqApiKey) setGroqKey(data.groqApiKey);
          if (data.geminiApiKey) setGeminiKey(data.geminiApiKey);
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
          groqApiKey: groqKey.includes('...') ? undefined : groqKey,
          geminiApiKey: geminiKey.includes('...') ? undefined : geminiKey,
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
              Provide your free API keys for instant transcription and peak detection.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Groq Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <span>Groq API Key</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Recommended (Whisper + Llama)
                </span>
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
              placeholder="gsk_..."
              className="w-full bg-dark-surface border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-brand"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Powers instant word-level Whisper-large-v3 transcription and Llama-3.3 peak finding for free.
            </p>
          </div>

          {/* Gemini Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-stone-200">
                Google Gemini API Key (Optional)
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
              placeholder="AIzaSy..."
              className="w-full bg-dark-surface border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="p-3 rounded-xl bg-dark-surface/60 border border-dark-border/60 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-stone-400">
              Keys are stored locally on your machine in <code className="text-stone-300">storage/settings.json</code>. They are never transmitted to any third-party server.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-stone-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-dark-frame font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-brand/20"
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
