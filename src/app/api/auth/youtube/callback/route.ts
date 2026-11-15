import { NextRequest, NextResponse } from 'next/server';
import { handleYouTubeCallback } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>YouTube Authorization Failed</title>
  <style>
    body { background: #080A0F; color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .box { background: #0E1118; border: 1px solid rgba(255,255,255,0.1); padding: 32px; border-radius: 16px; max-width: 420px; }
    h2 { color: #f43f5e; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
    button { margin-top: 16px; background: #FF6B00; color: #000; border: 0; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Connection Denied</h2>
    <p>Google returned error: <strong>${error}</strong></p>
    <button onclick="window.close()">Close Window</button>
  </div>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
    );
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    const tokens = await handleYouTubeCallback(code);

    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>YouTube Channel Connected</title>
  <style>
    body { background: #080A0F; color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .box { background: #0E1118; border: 1px solid rgba(255,255,255,0.1); padding: 36px 32px; border-radius: 20px; max-width: 440px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .avatar { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #FF6B00; margin-bottom: 16px; object-fit: cover; }
    h2 { color: #10b981; margin: 0 0 6px 0; font-size: 20px; }
    h3 { margin: 4px 0 8px 0; font-size: 16px; color: #fff; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 20px; }
    button { background: #FF6B00; color: #080A0F; border: 0; padding: 10px 24px; font-weight: bold; border-radius: 10px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="box">
    ${tokens.channelAvatar ? `<img src="${tokens.channelAvatar}" class="avatar" alt="Channel Avatar" />` : ''}
    <h2>Channel Linked!</h2>
    <h3>${tokens.channelTitle || 'YouTube Account'}</h3>
    <p>Your channel is now authorized for 1-click Shorts publishing. You can close this tab and return to PeakCut Studio.</p>
    <button onclick="finish()">Return to Studio</button>
  </div>
  <script>
    function finish() {
      if (window.opener) {
        window.opener.postMessage({ type: 'YOUTUBE_AUTH_SUCCESS' }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    }
    setTimeout(finish, 1800);
  </script>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Connection Error</title>
  <style>
    body { background: #080A0F; color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .box { background: #0E1118; border: 1px solid rgba(255,255,255,0.1); padding: 32px; border-radius: 16px; max-width: 440px; }
    h2 { color: #f43f5e; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.5; word-break: break-word; }
    button { margin-top: 16px; background: #FF6B00; color: #000; border: 0; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Failed to Connect YouTube</h2>
    <p>${msg}</p>
    <button onclick="window.close()">Close</button>
  </div>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
}
