import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = getSettings();
  // Never expose or send any portion of API keys to the client browser
  return NextResponse.json({
    hasGroqKey: Boolean(settings.groqApiKey || process.env.GROQ_API_KEY),
    hasGeminiKey: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = getSettings();

    const updated = {
      ...current,
      groqApiKey: body.groqApiKey ? body.groqApiKey.trim() : current.groqApiKey,
      geminiApiKey: body.geminiApiKey ? body.geminiApiKey.trim() : current.geminiApiKey,
    };

    saveSettings(updated);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
