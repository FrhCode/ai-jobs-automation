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
  coverLetter: string | null;
  coverLetterStatus: string | null;
  coverLetterError: string | null;
  tailoredResume: string | null;
  tailoredResumePdfPath: string | null;
  tailoredResumeStatus: string | null;
  tailoredResumeError: string | null;
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

export interface JobQuestion {
  id: number;
  jobId: number;
  question: string;
  answer: string | null;
  answerStatus: string | null;
  answerError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatsData {
  total: number;
  byRecommendation: Record<string, number>;
  byAppStatus: Record<string, number>;
  avgScore: number;
  scoreHistogram: { bucket: string; count: number }[];
  topCompanies: { company: string; count: number }[];
}

export interface OpenRouterCredits {
  totalCredits: number;
  totalUsage: number;
  remaining: number;
  error?: string;
}

export interface LinkedInPost {
  id: number;
  contentHash: string;
  batchId: string | null;
  authorName: string | null;
  authorHeadline: string | null;
  postContent: string;
  rawHtml: string | null;
  matchedKeywords: string[] | null;
  isJob: boolean | null;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  score: number | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  summary: string | null;
  recommendation: string | null;
  aiAnalyzed: boolean | null;
  promotedToJobId: number | null;
  appStatus: string | null;
  appNotes: string | null;
  coverLetter: string | null;
  tailoredResume: string | null;
  tailoredResumePdfPath: string | null;
  tailoredResumeStatus: string | null;
  tailoredResumeError: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  appliedAt: string | null;
  emailSentAt: string | null;
  reminderAt: string | null;
  applyUrl: string | null;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecruiterContact {
  id: number;
  contactEmail: string;
  authorName: string | null;
  lastEmailedAt: string | null;
  emailCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedInReminder {
  id: number;
  authorName: string | null;
  company: string | null;
  title: string | null;
  reminderAt: string | null;
  appStatus: string | null;
  emailSentAt: string | null;
}
