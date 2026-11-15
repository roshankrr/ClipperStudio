# PeakCut Open Studio - Project Checkpoint & Handoff Guide

> **Purpose**: This file acts as a persistent checkpoint and state ledger. If context is compacted, restarted, or transferred to another agent, any agent can read this file and instantly resume work without starting over.  
> **Roadmap & Future Upgrades**: See [POTENTIAL_UPGRADES.md](file:///Users/rish/Desktop/Trials/clipping_rea/rea/peakcut-studio/POTENTIAL_UPGRADES.md) for planned features (Hermes Agent MCP integration, YouTube Shorts direct publishing, split-screen layouts, clip trimming).

---

## 1. Goal

Reverse engineer and build a 100% free, self-hosted clone of **PeakCut** (`https://peakcut.haziqqasmi.com/`), removing all pricing paywalls, credit restrictions, and subscriptions.

---

## 2. Replicated Features & Functionalities

1. **Multi-Platform Ingestion**:
   - YouTube, Twitch, Kick links via standalone project-local `yt-dlp`.
   - Direct local video uploads (MP4, MOV, WebM).
2. **Dual-Judge AI Peak Detection**:
   - **Words Judge**: Speech-to-text with word-level timestamps (Groq Whisper `whisper-large-v3`) + LLM evaluation of dialogue, hooks, comedic beats, and emotional climax (Groq Llama-3.3-70B / Google Gemini).
   - **Reaction Judge**: Audio loudness / RMS / decibel energy spike detection (FFmpeg `astats`) to detect hype/shouting/reactions.
   - Consensus clipping: Combines words score (60%) and reaction score (40%) into a 1–100 viral score.
3. **Vertical 9:16 Re-framing Engine**:
   - Blurred Background Fill (9:16 background blur with crisp centered foreground).
   - Direct Center Crop.
4. **Animated Karaoke Subtitles**:
   - Advanced SubStation Alpha (`.ass`) burn-in engine with word-level timing.
   - 3 Style presets:
     - `Bounce`: Karaoke pop-in animation on the active spoken word with gold highlight.
     - `Hype`: Bold energetic uppercase styling with neon green punch highlight.
     - `Clean`: Modern minimalist sans-serif typography.
   - Pinned Top Hook Headline banner card overlay.
5. **Interactive Clip Studio UI**:
   - Built with Next.js 14, Tailwind CSS, Lucide icons, dark frame `#1E1612`, accent `#FF8B33`.
   - URL input bar & video file dropzone.
   - Real-time 5-stage progress indicator with percentage.
   - Interactive 9:16 video player with HTML5 streaming and seek support.
   - 1-click MP4 download.
   - 1-click Copy Title, Description & Hashtags for TikTok, YouTube Shorts, Reels.
   - Settings modal to configure free Groq or Gemini API keys.
6. **Zero Paywall & Isolated Installation**:
   - All tools (`yt-dlp`, `ffmpeg`, node modules) are installed strictly inside `peakcut-studio/`. Nothing is installed globally on the user's Mac.
   - No token billing, no credits, no subscriptions.

---

## 3. Directory Layout & Key Modules

```
peakcut-studio/
├── bin/
│   └── yt-dlp                   <- Project-local macOS arm64 yt-dlp binary
├── storage/                     <- Local media storage & JSON database
│   ├── videos/                  <- Downloaded & uploaded videos
│   ├── clips/                   <- Finalized 9:16 MP4 clips
│   ├── audio/                   <- Extracted 16kHz audio for Whisper
│   ├── subtitles/               <- Generated .ass karaoke subtitle files
│   ├── settings.json            <- Saved API keys (Groq / Gemini)
│   └── jobs.json                <- Clip jobs ledger
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── process/route.ts <- Ingestion & job orchestrator trigger
│   │   │   ├── status/route.ts  <- Live job progress polling & clip catalog
│   │   │   ├── settings/route.ts<- API key manager
│   │   │   └── clips/[id]/route.ts <- Video streaming & download endpoint
│   │   ├── globals.css          <- Theme tokens and custom scrollbars
│   │   ├── layout.tsx           <- App shell
│   │   └── page.tsx             <- Main Studio UI
│   ├── components/
│   │   ├── Navbar.tsx           <- Logo, Live zero-paywall badge, Settings button
│   │   ├── UrlInputForm.tsx     <- Link input (YT/Twitch/Kick), file dropzone, style picker
│   │   ├── ProgressStepper.tsx  <- Live 5-step progress indicator
│   │   ├── ClipCard.tsx         <- 9:16 Video player, viral score, copy post, download MP4
│   │   └── SettingsModal.tsx    <- Free Groq / Gemini API key configuration
│   └── lib/
│       ├── config.ts            <- Binary paths & settings resolver
│       ├── types.ts             <- TypeScript data contracts
│       ├── storage.ts           <- Jobs persistence & file management
│       ├── downloader.ts        <- Project-local yt-dlp wrapper
│       ├── audio.ts             <- FFmpeg audio extraction & energy spike detector
│       ├── transcriber.ts       <- Groq Whisper word-level transcription
│       ├── judge.ts             <- Dual-judge consensus & moment finder
│       ├── subtitles.ts         <- ASS karaoke subtitle generator (Bounce, Hype, Clean)
│       ├── renderer.ts          <- FFmpeg 9:16 vertical video & subtitle burn-in
│       └── orchestrator.ts      <- End-to-end pipeline runner
├── PROJECT_STATUS.md            <- THIS CHECKPOINT FILE
└── package.json
```

---

## 4. Current Milestone Status

- [x] Stage 1: Reverse-engineer target site (`https://peakcut.haziqqasmi.com/`).
- [x] Stage 2: Verify all `.agents` skills in repository.
- [x] Stage 3: Setup hermetic project-local binaries (`yt-dlp` in `bin/yt-dlp`, `ffmpeg` in `node_modules/ffmpeg-static/`).
- [x] Stage 4: Install and configure Next.js 14, Tailwind CSS, TypeScript.
- [x] Stage 5: Build core backend pipeline (`downloader`, `audio`, `transcriber`, `judge`, `subtitles`, `renderer`, `orchestrator`).
- [x] Stage 6: Build API routes (`/api/process`, `/api/status`, `/api/settings`, `/api/clips/[id]`).
- [x] Stage 7: Build sleek PeakCut-inspired web frontend (`Navbar`, `UrlInputForm`, `ProgressStepper`, `ClipCard`, `SettingsModal`).
- [x] Stage 8: Verified production build (`npm run build` passed with zero errors).
- [x] Fix: Replaced PyInstaller binary with official standalone Python zipapp for `yt-dlp` to eliminate macOS IPC semaphore (`semctl`) errors. Added explicit `--ffmpeg-location` binding.
- [x] Fix: Dev server running with network access enabled so `yt-dlp` can stream from YouTube/Twitch/Kick.
- [x] Fix: Updated Groq chat model in `judge.ts` to `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`, completely removing decommissioned llama models.
- [x] Fix: Intelligent transcript window budgeting (<2,000 tokens) prioritized by audio energy peaks to stay comfortably under Groq free-tier 8,000 TPM limit.
- [x] Optimization: Upgraded to Audio-First Ingestion (`downloadAudioOnly` downloads ~20MB audio in 2s instead of 5GB video).
- [x] Optimization: Surgical Range Slicing (`downloadVideoSection` downloads ONLY the selected 30-40s video segments via yt-dlp HTTP range requests).
- [x] Fix: Groq Whisper 413 "Request Entity Too Large" resolved by speech-optimizing audio (16kHz mono 32k/24k) with automatic compression ceiling (<22MB), allowing 1-2+ hour streams without hitting Groq's 25MB upload limit.
- [x] Fix: Overhauled Reaction Judge with EBU R128 momentary loudness (`ebur128`), capturing 10,000+ accurate excitement/screaming measurements.
- [x] Upgrade: Multi-Dimensional Viral Intelligence (Humor, Jokes, Plot Twists, Suspense, Roasts, Storytelling). The Words Judge groups complete narrative scene blocks (~35s) rather than treating audio volume as a prerequisite.
- [x] Fix: Replaced isolated sentence sampling with full candidate scene windows (buildup + climax + aftermath). Enforced STRICT 25-50s clip duration in code so clips are never 2s fragments.
- [x] Feature: Integrated YouTube Audience Rewind Heatmap (`getVideoMetadata` extracts viewer replay spikes and prioritizes them in the Words & Reaction scoring engine).
- [x] Git & Storage Setup: Implemented nested `storage/.gitignore` and `.gitkeep` patterns ensuring all heavy media (.mp4, .mp3, .ass) and private keys (settings.json) are excluded from GitHub while preserving directory hierarchy.
- [x] Security Audit & Hardening: Verified zero frontend key exposure. Removed any masked key echoes from API responses; keys are never sent over the wire or bundled in client JS.

---

## 5. How to Run the Studio

From the project folder:

```bash
cd peakcut-studio
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Click **"Set Free API Key"** on the top right to paste your free **Groq API key** (or Google Gemini key), paste any YouTube/Twitch/Kick link, and click **"Make Viral Clips"**!
