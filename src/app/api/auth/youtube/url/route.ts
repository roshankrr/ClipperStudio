import { NextResponse } from 'next/server';
import { getYouTubeAuthUrl, getYouTubeClientCredentials } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { clientId, clientSecret } = getYouTubeClientCredentials();
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Google Client ID or Client Secret not configured. Check your .env file or Settings.',
          hasCredentials: false,
        },
        { status: 400 }
      );
    }

    const url = getYouTubeAuthUrl();
    return NextResponse.json({ url, hasCredentials: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
