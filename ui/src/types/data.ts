export interface Job {
  id: number;
  url: string;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  descriptionSummary: string | null;
  score: number | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  summary: string | null;
  recommendation: string | null;
  scrapeStatus: string | null;
  appStatus: string | null;
  appNotes: string | null;
  appliedAt: string | null;
  addedAt: string;
  processedAt: string | null;
  updatedAt: string;
}

export interface QueueItem {
  id: number;
  url: string;
  status: string;
  errorMsg: string | null;
  attempts: number;
  maxAttempts: number;
  source: string | null;
  addedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ResumeData {
  filename: string;
  extractedText: string;
  uploadedAt: string;
}

export interface StatsData {
  total: number;
  byRecommendation: Record<string, number>;
  byAppStatus: Record<string, number>;
  avgScore: number;
  scoreHistogram: { bucket: string; count: number }[];
  topCompanies: { company: string; count: number }[];
}
