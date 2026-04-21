import type { JobsQuery, UpdateJob, CreateQuestionInput, UpdateQuestionInput } from '@/shared/schemas';
import type { Job, JobQuestion, QueueItem, ResumeData, StatsData, OpenRouterCredits, LinkedInPost } from '@/types/data';

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

export async function generateCoverLetter(id: number) {
  return request<Job>(`/api/jobs/${id}/cover-letter`, {
    method: 'POST',
  });
}

export async function getJobQuestions(id: number) {
  return request<JobQuestion[]>(`/api/jobs/${id}/questions`);
}

export async function createJobQuestion(id: number, body: CreateQuestionInput) {
  return request<JobQuestion>(`/api/jobs/${id}/questions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateJobQuestion(id: number, questionId: number, body: UpdateQuestionInput) {
  return request<JobQuestion>(`/api/jobs/${id}/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteJobQuestion(id: number, questionId: number) {
  return request<{ deleted: boolean }>(`/api/jobs/${id}/questions/${questionId}`, {
    method: 'DELETE',
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

// OpenRouter
export async function getOpenRouterCredits() {
  return request<OpenRouterCredits>('/api/openrouter/credits');
}

// LinkedIn Feed — chunked upload
export async function initLinkedInUpload(): Promise<{ uploadId: string }> {
  return request<{ uploadId: string }>('/api/linkedin-feed/upload/init', { method: 'POST' });
}

export async function uploadLinkedInChunk(uploadId: string, chunkIndex: number, totalChunks: number, data: Blob): Promise<{ received: number }> {
  const formData = new FormData();
  formData.append('uploadId', uploadId);
  formData.append('chunkIndex', String(chunkIndex));
  formData.append('totalChunks', String(totalChunks));
  formData.append('data', data);
  const res = await fetch('/api/linkedin-feed/upload/chunk', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Chunk upload failed' }));
    throw new Error(err.message);
  }
  return res.json();
}

export async function finalizeLinkedInUpload(uploadId: string, filename: string): Promise<{ batchId: string | null; total: number; matched: number; status: string; message?: string }> {
  return request('/api/linkedin-feed/upload/finalize', {
    method: 'POST',
    body: JSON.stringify({ uploadId, filename }),
  });
}

export async function parseLinkedInFeed(file: File) {
  const CHUNK_SIZE = 512 * 1024;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  const { uploadId } = await initLinkedInUpload();

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await uploadLinkedInChunk(uploadId, i, totalChunks, chunk);
  }

  return finalizeLinkedInUpload(uploadId, file.name);
}

export async function getLinkedInBatches() {
  return request<{ batchId: string; total: number; processed: number; failed: number; createdAt: string }[]>(
    '/api/linkedin-feed/batches'
  );
}

export async function getLinkedInBatchStatus(batchId: string) {
  return request<{
    batchId: string;
    total: number;
    processed: number;
    failed: number;
    status: string;
    posts: LinkedInPost[];
  }>(`/api/linkedin-feed/batch/${batchId}`);
}

export async function retryLinkedInBatch(batchId: string) {
  return request<{ retriedCount: number; batchId: string; message: string }>(
    `/api/linkedin-feed/batch/${batchId}/retry`,
    { method: 'POST' }
  );
}

export async function getLinkedInPosts(page = 1, limit = 20, filters: { isJob?: boolean; recommendation?: string; minScore?: number; appStatus?: string } = {}) {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (filters.isJob !== undefined) params.append('isJob', String(filters.isJob));
  if (filters.recommendation) params.append('recommendation', filters.recommendation);
  if (filters.minScore !== undefined) params.append('minScore', String(filters.minScore));
  if (filters.appStatus) params.append('appStatus', filters.appStatus);
  return request<{ posts: LinkedInPost[]; total: number; page: number }>(
    `/api/linkedin-posts?${params.toString()}`
  );
}

export async function getLinkedInPost(id: number) {
  return request<LinkedInPost>(`/api/linkedin-posts/${id}`);
}

export async function updateLinkedInPost(id: number, body: { appStatus?: string; appNotes?: string; appliedAt?: string | null; emailSentAt?: string | null; reminderAt?: string | null }) {
  return request<LinkedInPost>(`/api/linkedin-posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function getLinkedInReminders() {
  return request<import('@/types/data').LinkedInReminder[]>('/api/linkedin-posts/reminders');
}

export async function generateLinkedInCoverLetter(id: number) {
  return request<{ coverLetter: string; post: LinkedInPost }>(`/api/linkedin-posts/${id}/cover-letter`, {
    method: 'POST',
  });
}

export async function generateLinkedInEmail(id: number) {
  return request<{ subject: string; body: string }>(`/api/linkedin-posts/${id}/email`, {
    method: 'POST',
  });
}

export async function getLinkedInPostQuestions(id: number) {
  return request<{ questions: JobQuestion[] }>(`/api/linkedin-posts/${id}/questions`);
}

export async function createLinkedInPostQuestion(id: number, body: { question: string }) {
  return request<{ question: JobQuestion }>(`/api/linkedin-posts/${id}/questions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateLinkedInPostQuestion(id: number, questionId: number, body: { question?: string; answer?: string }) {
  return request<{ question: JobQuestion }>(`/api/linkedin-posts/${id}/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteLinkedInPostQuestion(id: number, questionId: number) {
  return request<{ deleted: boolean }>(`/api/linkedin-posts/${id}/questions/${questionId}`, {
    method: 'DELETE',
  });
}

export async function deleteLinkedInPost(id: number) {
  return request<{ deleted: boolean }>(`/api/linkedin-posts/${id}`, {
    method: 'DELETE',
  });
}

export async function getRecruiterContact(email: string) {
  return request<import('@/types/data').RecruiterContact>(`/api/recruiter-contacts/${encodeURIComponent(email)}`);
}
