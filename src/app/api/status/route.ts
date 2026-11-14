import { NextRequest, NextResponse } from 'next/server';
import { getJob, getAllJobs } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (jobId) {
    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json({ job });
  }

  // If no jobId, return recent jobs
  const jobs = getAllJobs();
  return NextResponse.json({ jobs: jobs.slice(0, 10) });
}
