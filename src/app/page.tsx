"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import UrlInputForm from '@/components/UrlInputForm';
import ProgressStepper from '@/components/ProgressStepper';
import ClipCard from '@/components/ClipCard';
import SettingsModal from '@/components/SettingsModal';
import { Job, CaptionStyle, FrameLayout } from '@/lib/types';
import { Sparkles, Flame, Film, CheckCircle2, ShieldCheck, Zap, Trash2 } from 'lucide-react';

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
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setHasApiKey(Boolean(data.hasGroqKey || data.hasGeminiKey));
      })
      .catch(console.error);
  }

  function loadRecentJobs() {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.jobs && Array.isArray(data.jobs)) {
          setRecentJobs(data.jobs);
          // If the first job is still processing, attach to it
          if (
            data.jobs[0] &&
            data.jobs[0].status !== "completed" &&
            data.jobs[0].status !== "failed"
          ) {
            setActiveJob(data.jobs[0]);
          }
        }
      })
      .catch(console.error);
  }

  // Poll active job status
  useEffect(() => {
    if (
      !activeJob ||
      activeJob.status === "completed" ||
      activeJob.status === "failed"
    ) {
      return;
    }

    const interval = setInterval(() => {
      fetch(`/api/status?jobId=${activeJob.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.job) {
            setActiveJob(data.job);
            if (
              data.job.status === "completed" ||
              data.job.status === "failed"
            ) {
              loadRecentJobs();
            }
          }
        })
        .catch(console.error);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob]);

  async function handleStartUrl(
    url: string,
    captionStyle: CaptionStyle,
    frameLayout: FrameLayout,
  ) {
    if (!hasApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, captionStyle, frameLayout }),
      });

      const data = await res.json();
      if (data.job) {
        setActiveJob(data.job);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message || "Failed to start job");
    }
  }

  async function handleStartFile(
    file: File,
    captionStyle: CaptionStyle,
    frameLayout: FrameLayout,
  ) {
    if (!hasApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("captionStyle", captionStyle);
      formData.append("frameLayout", frameLayout);

      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.job) {
        setActiveJob(data.job);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start file upload');
    }
  }

  async function handleDeleteJob(jobId: string) {
    const ok = window.confirm('Delete this video and all its rendered clips from local storage?');
    if (!ok) return;

    try {
      const res = await fetch(`/api/storage?jobId=${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        setRecentJobs((prev) => prev.filter((j) => j.id !== jobId));
        if (activeJob?.id === jobId) {
          setActiveJob(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg text-stone-100 flex flex-col font-sans">
      {/* Top Navbar with prominent Clear Storage and Settings */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasApiKey={hasApiKey}
        onStorageCleared={() => {
          setActiveJob(null);
          setRecentJobs([]);
        }}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-semibold">
            <Flame className="w-3.5 h-3.5" />
            <span>AI Stream &amp; Long-Form Video Clipper</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Turn Streams &amp; VODs into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-amber-300">
              Viral Vertical Clips
            </span>
          </h1>

          <p className="text-sm sm:text-base text-stone-400">
            Paste a YouTube, Twitch, or Kick link. Audience heatmaps &amp; AI judges automatically find
            humorous punchlines, suspenseful climax scenes, and speech peaks—reframed to 9:16 with karaoke subtitles.
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-dark-frame border border-dark-border rounded-2xl p-6 sm:p-8 shadow-xl">
          <UrlInputForm
            onSubmitUrl={handleStartUrl}
            onSubmitFile={handleStartFile}
            disabled={Boolean(activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed')}
          />
        </div>

        {/* Active Job Progress Stepper */}
        {activeJob && (
          <div className="bg-dark-frame border border-dark-border rounded-2xl p-6 shadow-xl">
            <ProgressStepper
              status={activeJob.status}
              progress={activeJob.progress}
              statusMessage={activeJob.statusMessage}
              error={activeJob.error}
            />
          </div>
        )}

        {/* Active Job Generated Clips */}
        {activeJob && activeJob.status === 'completed' && activeJob.clips.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand" />
                  <span>Ready! Generated Viral Clips</span>
                </h3>
                <p className="text-xs text-stone-400">
                  Reframed to 9:16 with animated subtitles &amp; hook headlines. Ready for TikTok, Reels &amp; Shorts.
                </p>
              </div>

              <button
                onClick={() => handleDeleteJob(activeJob.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-red-400 hover:bg-red-500/10 border border-dark-border transition-all"
                title="Delete this video and free storage"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Video</span>
              </button>
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-stone-400" />
                  <span>Your Generated Clip Library</span>
                </h3>
                <p className="text-xs text-stone-400">Previous runs saved locally on your machine.</p>
              </div>
            </div>

            {recentJobs
              .filter((j) => j.clips && j.clips.length > 0)
              .map((job) => (
                <div key={job.id} className="space-y-4 bg-dark-frame/50 border border-dark-border/50 rounded-2xl p-5">
                  <div className="flex items-center justify-between text-xs text-stone-400 pb-3 border-b border-dark-border/40">
                    <div>
                      <span className="font-semibold text-stone-200 text-sm">
                        {job.title || job.sourceUrl || job.inputFilename}
                      </span>
                      <span className="ml-3 text-stone-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-red-400 hover:bg-red-500/10 border border-dark-border transition-all"
                      title="Delete this video & clips from storage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Video &amp; Storage</span>
                    </button>
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
