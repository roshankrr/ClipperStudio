'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import UrlInputForm from '@/components/UrlInputForm';
import ProgressStepper from '@/components/ProgressStepper';
import ClipCard from '@/components/ClipCard';
import SettingsModal from '@/components/SettingsModal';
import { Job, CaptionStyle, FrameLayout } from '@/lib/types';
import { Sparkles, Flame, Film, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check API keys on mount
  useEffect(() => {
    checkSettings();
    loadRecentJobs();
  }, []);

  function checkSettings() {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setHasApiKey(Boolean(data.hasGroqKey || data.hasGeminiKey));
      })
      .catch(console.error);
  }

  function loadRecentJobs() {
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.jobs && Array.isArray(data.jobs)) {
          setRecentJobs(data.jobs);
          // If the first job is still processing, attach to it
          if (data.jobs[0] && data.jobs[0].status !== 'completed' && data.jobs[0].status !== 'failed') {
            setActiveJob(data.jobs[0]);
          }
        }
      })
      .catch(console.error);
  }

  // Poll active job status
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      fetch(`/api/status?jobId=${activeJob.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.job) {
            setActiveJob(data.job);
            if (data.job.status === 'completed' || data.job.status === 'failed') {
              loadRecentJobs();
            }
          }
        })
        .catch(console.error);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob]);

  async function handleStartUrl(url: string, captionStyle: CaptionStyle, frameLayout: FrameLayout) {
    if (!hasApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, captionStyle, frameLayout }),
      });

      const data = await res.json();
      if (data.job) {
        setActiveJob(data.job);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start job');
    }
  }

  async function handleStartFile(file: File, captionStyle: CaptionStyle, frameLayout: FrameLayout) {
    if (!hasApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('captionStyle', captionStyle);
      formData.append('frameLayout', frameLayout);

      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.job) {
        setActiveJob(data.job);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload video');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-frame text-stone-100">
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} hasApiKey={hasApiKey} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/30 text-xs font-bold text-brand uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-brand" />
            <span>Open Source · Free Self-Hosted Alternative</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Clip live streams &amp; videos while they&apos;re fresh.
          </h1>

          <p className="text-base sm:text-lg text-stone-400">
            Dual AI judges find the viral moments and turn them into captioned 9:16 vertical clips for Shorts, Reels, and TikTok.{' '}
            <span className="text-brand font-semibold">Zero subscriptions, zero paywalls.</span>
          </p>
        </div>

        {/* Input Form */}
        <UrlInputForm
          onSubmitUrl={handleStartUrl}
          onSubmitFile={handleStartFile}
          disabled={Boolean(activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed')}
        />

        {/* Active Job Progress */}
        {activeJob && (
          <ProgressStepper
            status={activeJob.status}
            progress={activeJob.progress}
            statusMessage={activeJob.statusMessage}
            error={activeJob.error}
          />
        )}

        {/* Active Job Generated Clips */}
        {activeJob && activeJob.clips && activeJob.clips.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Flame className="w-6 h-6 text-brand fill-brand" />
                  <span>Generated Clips ({activeJob.clips.length})</span>
                </h2>
                <p className="text-xs text-stone-400">
                  Scored and ranked by AI Words &amp; Reaction Judges. Ready to download or post.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {activeJob.clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Clips / Jobs Gallery */}
        {recentJobs.length > 0 && (!activeJob || activeJob.status === 'completed') && (
          <div className="pt-8 border-t border-dark-border/60 space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-stone-400" />
                <span>Your Generated Clip Library</span>
              </h3>
              <p className="text-xs text-stone-400">Previous runs saved locally on your machine.</p>
            </div>

            {recentJobs
              .filter((j) => j.clips && j.clips.length > 0)
              .map((job) => (
                <div key={job.id} className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-stone-400 pb-2 border-b border-dark-border/30">
                    <span className="font-semibold text-stone-200">
                      {job.title || job.sourceUrl || job.inputFilename}
                    </span>
                    <span>{new Date(job.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {job.clips.map((clip) => (
                      <ClipCard key={clip.id} clip={clip} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border py-8 text-center text-xs text-stone-500">
        <p>PeakCut Studio · 100% Free &amp; Open Source · No Paywalls</p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={checkSettings}
      />
    </div>
  );
}
