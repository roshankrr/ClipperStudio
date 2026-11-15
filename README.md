# 🎬 PeakCut Studio

> **100% Free, Self-Hosted AI Video Clipper & Content Studio.**  
> Turn long Twitch, Kick, and YouTube streams into high-retention 9:16 vertical shorts (TikTok, Reels, Shorts) with automated karaoke subtitles, multi-format templates, and 1-click YouTube publishing. **Zero subscriptions. Zero paywalls.**

---

## ✨ Features

- **⚡ 3 Modular Content Studio Templates**:
  - **Viral Stream Clipper**: Analyzes 1–3 hr VODs using YouTube audience engagement heatmaps, audio energy spikes, and AI humor/tension scoring to extract the top 3 moments.
  - **Versus Studio**: Stacks two clips vertically (*"Old vs New"*, *"Then vs Now"*, *"Original vs Remake"*) with an alternating spotlight mechanic (the waiting video pauses in black-and-white blur, then swaps).
  - **Gaming Studio**: 9:14 Action View that simultaneously frames streamer facecam and gameplay without harsh horizontal bars or cutoffs.
- **🎨 Interactive Studio Editor**:
  - Visual 9:16 canvas with draggable text badges and headlines.
  - Interactive subtitle zone positioning (drag up/down).
  - Visual timeline scrubber with instant start/end trims and playback speed controls (`0.8x` to `1.5x`).
  - Non-destructive re-rendering without redownloading source video.
- **🚀 1-Click Direct YouTube Shorts Publishing**:
  - Direct integration with YouTube Data API v3.
  - **Draft Mode by Default**: Uploads safely as a draft (`private`) so you can review in [YouTube Studio](https://studio.youtube.com/) before going live.
  - **Automatic Creator Attribution**: Embeds original stream links and creator credits in the description.
  - Supports scheduled publishing to release on specific dates/times.
- **🏎️ Audio-First Streaming Engine**:
  - Downloads only ~15 MB of stream audio for transcription instead of multi-gigabyte video files.
  - Downloads only the exact 30–60 second surgical video slice required for final rendering.
- **🔒 Local & Private**:
  - All processing and video rendering runs locally on your machine.
  - API keys and tokens are stored on your local backend and never exposed to the client.

---

## 🛠️ Prerequisites

1. **Node.js**: v18.0.0 or higher (v20+ recommended).
2. **ffmpeg & ffprobe**: Automatically bundled via `ffmpeg-static` / `ffprobe-static`, or uses your system `ffmpeg`.
3. **yt-dlp**: Placed in `bin/yt-dlp` or installed on your system `PATH`.
4. **Free Groq API Key**: Get a free key at [console.groq.com/keys](https://console.groq.com/keys) (powers fast Whisper transcription and AI peak scoring).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd peakcut-studio
npm install
```

### 2. Configure Environment (Optional)
You can set your keys directly in `.env`, or enter them via the in-app **Settings** modal:

```env
# Free Groq API Key (Transcription + Virality scoring)
GROQ_API_KEY=gsk_...

# Optional: Google Gemini API Key
GEMINI_API_KEY=AIzaSy...

# Optional: 1-Click YouTube Shorts Publishing
CLIENT_ID=xxxxxx.apps.googleusercontent.com
CLIENT_SECRET=GOCSPX-xxxxxx
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📺 Setting Up 1-Click YouTube Shorts Publishing

To publish generated clips straight to your YouTube channel as drafts:

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. `PeakCut Studio`).
2. **Enable YouTube Data API v3**:
   - Go to **APIs & Services** $\rightarrow$ **Library** $\rightarrow$ Search for **YouTube Data API v3** $\rightarrow$ Click **Enable**.
3. **Configure OAuth Consent Screen**:
   - In **OAuth consent screen**, select **External**.
   - Fill in App Name (`PeakCut Studio`) and your developer email.
   - On the **Test users** page, click **+ ADD USERS** and enter your personal Google email address (*this bypasses Google's public verification check*).
4. **Create OAuth Client ID**:
   - Go to **Credentials** $\rightarrow$ **Create Credentials** $\rightarrow$ **OAuth client ID**.
   - Application Type: **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3000` *(no trailing slash)*.
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/youtube/callback`.
   - Click **Create**.
5. **Add to `.env` or Settings**:
   - Add `CLIENT_ID` and `CLIENT_SECRET` to `peakcut-studio/.env`.
   - In the PeakCut dashboard, open **Settings** $\rightarrow$ click **Authorize & Link YouTube Channel**.
   - Your channel is now connected and ready for 1-click publishing!

---

## 📂 Project Architecture

```text
peakcut-studio/
├── bin/                        # Local CLI binaries (yt-dlp)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/youtube/   # YouTube OAuth URL, callback, and status
│   │   │   ├── gaming-split/   # Gaming 9:14 Action View pipeline
│   │   │   ├── process/        # Main stream ingestion & peak extraction
│   │   │   ├── rerender/       # Studio Editor non-destructive re-render
│   │   │   ├── settings/       # Server-side API key management
│   │   │   ├── status/         # Job progress tracking
│   │   │   ├── storage/        # Cache & disk cleanup API
│   │   │   ├── versus/         # Versus Studio alternating comparison engine
│   │   │   └── youtube/publish # Resumable video upload to YouTube Shorts
│   │   ├── globals.css         # High-taste obsidian styling & design tokens
│   │   ├── layout.tsx          # Root layout with dark mode metadata
│   │   └── page.tsx            # Main studio dashboard
│   ├── components/
│   │   ├── ClipCard.tsx        # 9:16 Video card with hover lift & actions
│   │   ├── EditModePanel.tsx   # Visual Studio Editor (text, trim, crop, subtitles)
│   │   ├── Navbar.tsx          # Obsidian glassmorphic header with status badge
│   │   ├── ProgressStepper.tsx # Real-time job progress indicators
│   │   ├── SettingsModal.tsx   # Local API key & YouTube integration modal
│   │   ├── TemplatePicker.tsx  # Multi-format studio console deck
│   │   ├── UrlInputForm.tsx    # Dynamic input forms for each template
│   │   └── YouTubePublishModal.tsx # 1-Click Shorts publish & scheduling modal
│   └── lib/
│       ├── config.ts           # Storage paths & environment configuration
│       ├── gamingSplitRenderer.ts # 9:14 wide action composition filters
│       ├── orchestrator.ts     # Ingestion, audio chunking & dual AI scoring
│       ├── peakFinder.ts       # YouTube heatmap peak detection
│       ├── subtitles.ts        # Word-timed karaoke subtitle generator (.ass)
│       ├── types.ts            # Core TypeScript data schemas
│       ├── versusRenderer.ts   # Dual-feed alternating spotlight filtergraphs
│       └── youtube.ts          # Resumable upload & OAuth token manager
├── storage/                    # Local storage (cached audio, slices, clips)
└── tailwind.config.js          # Obsidian dark mode palette & specular borders
```

---

## 🧹 Disk & Storage Cleanup

Video files can consume disk space over time. PeakCut Studio includes built-in storage management:
- Click **"Clear Storage"** in the top navbar to purge temporary downloaded audio, video slices, and cached render files in one click.
- Click **"Remove Video"** on any individual clip group to delete only that job's source slices and rendered MP4s.

---

## 📜 License

MIT License. Free for personal, commercial, and creator use.
