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
    { key: 'downloading', label: '1. Ingest Video', icon: Video },
    { key: 'extracting_audio', label: '2. Audio Energy', icon: AudioWaveform },
    { key: 'transcribing', label: '3. Transcription', icon: FileText },
    { key: 'scoring', label: '4. Peak Finder', icon: Sparkles },
    { key: 'rendering', label: '5. Burn Captions', icon: CheckCircle2 },
  ];

  return (
    <div className="bg-[#0E1118] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {status === 'completed' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Processing Finished</span>
              </>
            ) : status === 'failed' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Processing Interrupted</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 text-brand animate-spin" />
                <span>Engine Running</span>
              </>
            )}
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">{statusMessage}</p>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold font-mono text-brand">{progress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#141824] rounded-full h-2 overflow-hidden border border-white/[0.08]">
        <div
          className="bg-brand h-full rounded-full transition-all duration-500 shadow-sm shadow-brand/50"
          style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
        />
      </div>

      {/* Stepper items */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
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
              className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : isActive
                  ? 'bg-brand/15 border-brand/60 text-brand'
                  : 'bg-[#141824] border-white/[0.06] text-stone-500'
              }`}
            >
              <st.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px] font-medium">{st.label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
