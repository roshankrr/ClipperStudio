'use client';

import React, { useState } from 'react';
import { Settings, Scissors, Trash2, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  hasApiKey: boolean;
  onStorageCleared?: () => void;
}

export default function Navbar({ onOpenSettings, hasApiKey, onStorageCleared }: NavbarProps) {
  const [clearing, setClearing] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  async function handleClearStorage() {
    const ok = window.confirm(
      'Are you sure you want to clean storage? This will remove all downloaded stream audio, video sections, and rendered clips to free up your disk space.'
    );
    if (!ok) return;

    setClearing(true);
    try {
      const res = await fetch('/api/storage', { method: 'DELETE' });
      if (res.ok) {
        setClearedNotice(true);
        onStorageCleared?.();
        setTimeout(() => setClearedNotice(false), 3000);
      }
    } catch (err) {
      console.error('Failed to clear storage:', err);
    } finally {
      setClearing(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-dark-frame border-b border-dark-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-dark-frame font-bold shadow-lg shadow-brand/20">
            <Scissors className="w-5 h-5 text-dark-frame" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">PeakCut</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand/20 text-brand border border-brand/30">
                STUDIO
              </span>
            </div>
            <p className="text-xs text-stone-400">AI Stream Clipper · No Subscription · 100% Free</p>
          </div>
        </div>

        {/* Actions & Settings */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-surface border border-dark-border text-xs text-stone-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Zero Paywall Active</span>
          </div>

          {/* Clear Storage Button */}
          <button
            onClick={handleClearStorage}
            disabled={clearing}
            title="Clean all cached stream audio, video slices, and generated clips"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-dark-surface hover:bg-red-500/10 hover:border-red-500/40 text-stone-300 hover:text-red-400 border border-dark-border transition-all"
          >
            {clearedNotice ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Cleaned!</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-400" />
                <span>{clearing ? 'Cleaning...' : 'Clear Storage'}</span>
              </>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              hasApiKey
                ? 'bg-dark-surface hover:bg-dark-border text-stone-200 border border-dark-border'
                : 'bg-brand text-dark-frame font-semibold hover:bg-brand-hover shadow-lg shadow-brand/20 animate-bounce'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{hasApiKey ? 'Settings' : 'Set Free API Key'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
