'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Sparkles, AudioWaveform, FileText, Video } from 'lucide-react';
import { JobStatus } from '@/lib/types';

interface ProgressStepperProps {
  status: JobStatus;
  progress: number;
  statusMessage: string;
  error?: string;
}

export default function ProgressStepper({
  status,
  progress,
  statusMessage,
  error,
}: ProgressStepperProps) {
  const steps = [
    { key: 'downloading', label: '1. Ingesting Stream / Video', icon: Video },
    { key: 'extracting_audio', label: '2. Audio Energy Analysis', icon: AudioWaveform },
    { key: 'transcribing', label: '3. Groq Whisper Transcription', icon: FileText },
    { key: 'scoring', label: '4. Dual AI Judges Finding Peaks', icon: Sparkles },
    { key: 'rendering', label: '5. Burning 9:16 Captions', icon: CheckCircle2 },
  ];

  return (
    <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {status === 'completed' ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Processing Finished!</span>
              </>
            ) : status === 'failed' ? (
              <>
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Processing Interrupted</span>
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 text-brand animate-spin" />
                <span>AI Moments Engine Running</span>
              </>
            )}
          </h3>
          <p className="text-xs text-stone-400 mt-1">{statusMessage}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-brand">{progress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-dark-frame rounded-full h-3 overflow-hidden border border-dark-border/60 p-0.5">
        <div
          className="bg-gradient-to-r from-brand to-amber-400 h-full rounded-full transition-all duration-500 shadow-lg shadow-brand/40"
          style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
        ></div>
      </div>

      {/* Stepper items */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
        {steps.map((st, idx) => {
          const isDone =
            status === 'completed' ||
            (idx === 0 && progress >= 30) ||
            (idx === 1 && progress >= 45) ||
            (idx === 2 && progress >= 65) ||
            (idx === 3 && progress >= 75) ||
            (idx === 4 && progress >= 95);

          const isActive =
            status !== 'completed' &&
            status !== 'failed' &&
            ((idx === 0 && progress < 30) ||
              (idx === 1 && progress >= 30 && progress < 45) ||
              (idx === 2 && progress >= 45 && progress < 65) ||
              (idx === 3 && progress >= 65 && progress < 75) ||
              (idx === 4 && progress >= 75 && progress < 100));

          return (
            <div
              key={st.key}
              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : isActive
                  ? 'bg-brand/10 border-brand text-brand animate-pulse'
                  : 'bg-dark-frame border-dark-border/60 text-stone-500'
              }`}
            >
              <st.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px] font-medium">{st.label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
