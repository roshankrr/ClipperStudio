import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = getSettings();
  // Mask keys for safety
  return NextResponse.json({
    hasGroqKey: Boolean(settings.groqApiKey || process.env.GROQ_API_KEY),
    hasGeminiKey: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY),
    groqApiKey: settings.groqApiKey ? `${settings.groqApiKey.slice(0, 6)}...${settings.groqApiKey.slice(-4)}` : '',
    geminiApiKey: settings.geminiApiKey ? `${settings.geminiApiKey.slice(0, 6)}...${settings.geminiApiKey.slice(-4)}` : '',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = getSettings();

    const updated = {
      ...current,
      groqApiKey: body.groqApiKey !== undefined ? body.groqApiKey.trim() : current.groqApiKey,
      geminiApiKey: body.geminiApiKey !== undefined ? body.geminiApiKey.trim() : current.geminiApiKey,
    };

    saveSettings(updated);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
