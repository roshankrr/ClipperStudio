import { NextRequest, NextResponse } from 'next/server';
import { clearAllStorage, deleteJob } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      const deleted = deleteJob(jobId);
      return NextResponse.json({ success: true, deleted, jobId });
    }

    clearAllStorage();
    return NextResponse.json({ success: true, message: 'All storage media cleared successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Storage cleanup failed' }, { status: 500 });
  }
}

