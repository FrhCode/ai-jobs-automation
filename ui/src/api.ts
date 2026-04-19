import type { JobsQuery, UpdateJob } from '@/shared/schemas';
import type { Job, QueueItem, ResumeData, StatsData } from '@/types/data';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options?.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message ?? 'Request failed');
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// Auth
export async function getMe() {
  return request<{ authenticated: boolean }>('/api/auth/me');
}

export async function login(password: string) {
  return request<{ ok: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}

// Jobs
export async function getJobs(query: JobsQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }
  return request<{ jobs: Job[]; total: number; page: number }>(
    `/api/jobs?${params.toString()}`
  );
}

export async function getJob(id: number) {
  return request<Job>(`/api/jobs/${id}`);
}

export async function enqueueJobs(urls: string[]) {
  return request<{ enqueued: number; duplicates: number }>('/api/jobs/enqueue', {
    method: 'POST',
    body: JSON.stringify({ urls }),
  });
}

export async function updateJob(id: number, body: UpdateJob) {
  return request<Job>(`/api/jobs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function reanalyzeJob(id: number) {
  return request<{ queued: boolean }>(`/api/jobs/${id}/reanalyze`, {
    method: 'POST',
  });
}

export async function deleteJobs(ids: number[]) {
  return request<{ deleted: number }>('/api/jobs', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}

// Queue
export async function getQueue() {
  return request<{ items: QueueItem[]; isProcessing: boolean }>('/api/queue');
}

export async function retryQueueItem(id: number) {
  return request<{ ok: boolean }>(`/api/queue/retry/${id}`, {
    method: 'POST',
  });
}

export async function clearQueue(statuses: string[]) {
  return request<{ deleted: number }>('/api/queue/clear', {
    method: 'DELETE',
    body: JSON.stringify({ statuses }),
  });
}

export async function processQueue() {
  return request<{ started: boolean }>('/api/queue/process', {
    method: 'POST',
  });
}

// Resume
export async function getResume(): Promise<ResumeData | null> {
  const res = await fetch('/api/resume', { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message ?? 'Request failed');
  }
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as ResumeData | null;
}

export async function uploadResume(file: File): Promise<ResumeData> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/resume', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(err.message);
  }
  return res.json() as Promise<ResumeData>;
}

export async function deleteResume() {
  return request<{ ok: boolean }>('/api/resume', {
    method: 'DELETE',
  });
}

// Settings
export async function getSettings() {
  return request<Record<string, string>>('/api/settings');
}

export async function updateSettings(updates: Record<string, string>) {
  return request<Record<string, string>>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// Cron
export async function triggerCron() {
  return request<{ started: boolean; searchUrls: number; found: number; newUrls: number }>('/api/cron/trigger', {
    method: 'POST',
  });
}

// Stats
export async function getStats() {
  return request<StatsData>('/api/stats');
}
