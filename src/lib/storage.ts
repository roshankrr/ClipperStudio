import fs from 'fs';
import path from 'path';
import { CONFIG } from './config';
import { Job, Clip } from './types';

// Ensure storage directories exist
export function initStorage() {
  const dirs = [
    CONFIG.STORAGE_DIR,
    CONFIG.VIDEOS_DIR,
    CONFIG.CLIPS_DIR,
    CONFIG.AUDIO_DIR,
    CONFIG.SUBS_DIR,
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
}

export function getAllJobs(): Job[] {
  initStorage();
  try {
    if (fs.existsSync(CONFIG.DB_FILE)) {
      const data = fs.readFileSync(CONFIG.DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed reading jobs DB:', err);
  }
  return [];
}

export function getJob(id: string): Job | undefined {
  const jobs = getAllJobs();
  return jobs.find((j) => j.id === id);
}

export function saveJob(job: Job): void {
  const jobs = getAllJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    jobs[idx] = job;
  } else {
    jobs.unshift(job);
  }
  fs.writeFileSync(CONFIG.DB_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
}

export function updateJob(
  id: string,
  updates: Partial<Job>
): Job | undefined {
  const jobs = getAllJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx >= 0) {
    jobs[idx] = { ...jobs[idx], ...updates };
    fs.writeFileSync(CONFIG.DB_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
    return jobs[idx];
  }
  return undefined;
}
