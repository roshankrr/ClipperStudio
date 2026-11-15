import fs from 'fs';
import path from 'path';
import { CONFIG, getSettings } from './config';

const YOUTUBE_AUTH_FILE = path.join(CONFIG.STORAGE_DIR, 'youtube_auth.json');
const REDIRECT_URI = 'http://localhost:3000/api/auth/youtube/callback';

export interface YouTubeTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  channelId?: string;
  channelTitle?: string;
  channelCustomUrl?: string;
  channelAvatar?: string;
}

export function getYouTubeClientCredentials(): { clientId: string; clientSecret: string } {
  const settings = getSettings();
  const clientId =
    process.env.CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.YOUTUBE_CLIENT_ID ||
    (settings as any).youtubeClientId ||
    '';
  const clientSecret =
    process.env.CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.YOUTUBE_CLIENT_SECRET ||
    (settings as any).youtubeClientSecret ||
    '';
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

export function getSavedYouTubeTokens(): YouTubeTokens | null {
  try {
    if (fs.existsSync(YOUTUBE_AUTH_FILE)) {
      const raw = fs.readFileSync(YOUTUBE_AUTH_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read YouTube tokens:', err);
  }
  return null;
}

export function saveYouTubeTokens(tokens: YouTubeTokens): void {
  if (!fs.existsSync(CONFIG.STORAGE_DIR)) {
    fs.mkdirSync(CONFIG.STORAGE_DIR, { recursive: true });
  }
  fs.writeFileSync(YOUTUBE_AUTH_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function clearYouTubeTokens(): void {
  try {
    if (fs.existsSync(YOUTUBE_AUTH_FILE)) {
      fs.unlinkSync(YOUTUBE_AUTH_FILE);
    }
  } catch (err) {
    console.error('Failed to clear YouTube tokens:', err);
  }
}

/**
 * Generate Google OAuth2 authorization URL
 */
export function getYouTubeAuthUrl(): string {
  const { clientId } = getYouTubeClientCredentials();
  if (!clientId) {
    throw new Error('Google Client ID is missing. Add CLIENT_ID to your .env file or Settings.');
  }

  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange auth code for tokens and fetch channel profile
 */
export async function handleYouTubeCallback(code: string): Promise<YouTubeTokens> {
  const { clientId, clientSecret } = getYouTubeClientCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Missing Google Client ID or Client Secret');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange OAuth code for tokens');
  }

  const expiryDate = Date.now() + (tokenData.expires_in || 3600) * 1000;
  const currentTokens = getSavedYouTubeTokens();

  const newTokens: YouTubeTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || currentTokens?.refreshToken,
    expiryDate,
  };

  // Fetch channel info
  try {
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: { Authorization: `Bearer ${newTokens.accessToken}` },
      }
    );
    const channelData = await channelRes.json();
    if (channelData.items && channelData.items[0]) {
      const ch = channelData.items[0];
      newTokens.channelId = ch.id;
      newTokens.channelTitle = ch.snippet?.title || 'YouTube Channel';
      newTokens.channelCustomUrl = ch.snippet?.customUrl || '';
      newTokens.channelAvatar = ch.snippet?.thumbnails?.default?.url || '';
    }
  } catch (err) {
    console.warn('Failed to fetch YouTube channel profile details:', err);
  }

  saveYouTubeTokens(newTokens);
  return newTokens;
}

/**
 * Retrieve a guaranteed valid access token (refreshes if within 5 min of expiry)
 */
export async function getValidYouTubeAccessToken(): Promise<string> {
  const tokens = getSavedYouTubeTokens();
  if (!tokens || !tokens.accessToken) {
    throw new Error('YouTube is not connected. Connect your YouTube account in Settings.');
  }

  const { clientId, clientSecret } = getYouTubeClientCredentials();

  // If expiring soon (within 5 minutes) and we have a refresh token, refresh it
  const isExpiring = !tokens.expiryDate || tokens.expiryDate - Date.now() < 300000;
  if (isExpiring && tokens.refreshToken) {
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.access_token) {
        tokens.accessToken = refreshData.access_token;
        tokens.expiryDate = Date.now() + (refreshData.expires_in || 3600) * 1000;
        saveYouTubeTokens(tokens);
      }
    } catch (err) {
      console.error('Failed to refresh YouTube access token:', err);
    }
  }

  return tokens.accessToken;
}

export interface UploadShortOptions {
  videoFilePath: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: 'public' | 'unlisted' | 'private';
  publishAt?: string; // ISO 8601 string for scheduled release
}

/**
 * Resumable upload of 9:16 vertical short to YouTube Data API v3
 */
export async function uploadShortToYouTube(options: UploadShortOptions): Promise<{ videoId: string; videoUrl: string }> {
  if (!fs.existsSync(options.videoFilePath)) {
    throw new Error(`Video file does not exist: ${options.videoFilePath}`);
  }

  const accessToken = await getValidYouTubeAccessToken();
  const fileStat = fs.statSync(options.videoFilePath);
  const fileSize = fileStat.size;

  // Make sure title conforms to YouTube limits (<= 100 chars)
  let cleanTitle = options.title.trim();
  if (!cleanTitle.toLowerCase().includes('#shorts')) {
    cleanTitle = `${cleanTitle} #shorts`;
  }
  if (cleanTitle.length > 100) {
    cleanTitle = cleanTitle.slice(0, 92).trim() + '... #shorts';
  }

  // Ensure description includes #shorts
  let cleanDesc = options.description.trim();
  if (!cleanDesc.toLowerCase().includes('#shorts')) {
    cleanDesc = `${cleanDesc}\n\n#shorts`;
  }

  const tags = Array.from(new Set(['shorts', 'Shorts', ...(options.tags || [])]));

  const metadata: any = {
    snippet: {
      title: cleanTitle,
      description: cleanDesc,
      tags,
      categoryId: '22', // People & Blogs / General
    },
    status: {
      privacyStatus: options.privacyStatus || 'public',
      selfDeclaredMadeForKids: false,
    },
  };

  // If scheduled publication is set and privacyStatus is private
  if (options.publishAt && options.privacyStatus === 'private') {
    metadata.status.publishAt = new Date(options.publishAt).toISOString();
  }

  // Step 1: Initiate Resumable Upload
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(fileSize),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    let parsedErr = errText;
    try {
      const j = JSON.parse(errText);
      parsedErr = j.error?.message || errText;
    } catch {}
    throw new Error(`YouTube upload initiation failed (${initRes.status}): ${parsedErr}`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube did not return a resumable upload location header.');
  }

  // Step 2: Stream video bytes to YouTube upload location
  const videoBuffer = fs.readFileSync(options.videoFilePath);

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(fileSize),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    let parsedErr = errText;
    try {
      const j = JSON.parse(errText);
      parsedErr = j.error?.message || errText;
    } catch {}
    throw new Error(`YouTube video transfer failed (${uploadRes.status}): ${parsedErr}`);
  }

  const uploadResult = await uploadRes.json();
  const videoId = uploadResult.id;
  if (!videoId) {
    throw new Error('Upload succeeded but YouTube did not return a video ID.');
  }

  return {
    videoId,
    videoUrl: `https://youtube.com/shorts/${videoId}`,
  };
}
