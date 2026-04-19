export const APP_STATUS = ['not_applied', 'applied', 'interviewing', 'offer', 'rejected'] as const;
export const RECOMMENDATION = ['Apply', 'Consider', 'Skip'] as const;
export const SCRAPE_STATUS = ['success', 'partial', 'login_wall', 'failed'] as const;
export const QUEUE_STATUS = ['pending', 'running', 'done', 'failed', 'skipped'] as const;

export type AppStatus = typeof APP_STATUS[number];
export type Recommendation = typeof RECOMMENDATION[number];
export type ScrapeStatus = typeof SCRAPE_STATUS[number];
export type QueueStatus = typeof QUEUE_STATUS[number];
