import { NextResponse } from 'next/server';
import {
  getSavedYouTubeTokens,
  clearYouTubeTokens,
  getYouTubeClientCredentials,
} from '@/lib/youtube';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { clientId, clientSecret } = getYouTubeClientCredentials();
  const tokens = getSavedYouTubeTokens();

  return NextResponse.json({
    hasCredentials: Boolean(clientId && clientSecret),
    isConnected: Boolean(tokens && tokens.accessToken),
    channelTitle: tokens?.channelTitle || null,
    channelCustomUrl: tokens?.channelCustomUrl || null,
    channelAvatar: tokens?.channelAvatar || null,
    channelId: tokens?.channelId || null,
  });
}

export async function DELETE() {
  clearYouTubeTokens();
  return NextResponse.json({ success: true, isConnected: false });
}
