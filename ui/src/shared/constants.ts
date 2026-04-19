export const APP_STATUS = ['not_applied', 'applied', 'interviewing', 'offer', 'rejected'] as const;
export const RECOMMENDATION = ['Apply', 'Consider', 'Skip'] as const;
export const SCRAPE_STATUS = ['success', 'partial', 'login_wall', 'failed'] as const;
export const QUEUE_STATUS = ['pending', 'running', 'done', 'failed', 'skipped'] as const;

export type AppStatus = typeof APP_STATUS[number];
export type Recommendation = typeof RECOMMENDATION[number];
export type ScrapeStatus = typeof SCRAPE_STATUS[number];
export type QueueStatus = typeof QUEUE_STATUS[number];

export const APP_STATUS_LABEL: Record<AppStatus, string> = {
  not_applied: 'Not Applied',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  Apply: 'Apply',
  Consider: 'Consider',
  Skip: 'Skip',
};

export const RECOMMENDATION_COLOR: Record<Recommendation, string> = {
  Apply: 'badge-emerald',
  Consider: 'badge-amber',
  Skip: 'badge-slate',
};

export const QUEUE_STATUS_COLOR: Record<QueueStatus, string> = {
  pending: 'badge-slate',
  running: 'badge-cyan animate-pulse-glow',
  done: 'badge-emerald',
  failed: 'badge-rose',
  skipped: 'badge-slate',
};

export const APP_STATUS_COLOR: Record<AppStatus, string> = {
  not_applied: 'badge-slate',
  applied: 'badge-cyan',
  interviewing: 'badge-amber',
  offer: 'badge-emerald',
  rejected: 'badge-rose',
};
