import { z } from 'zod';

export const jobsQuerySchema = z.object({
  recommendation: z.enum(['Apply', 'Consider', 'Skip']).optional(),
  appStatus: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['score', 'addedAt']).default('score'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const updateJobSchema = z.object({
  appStatus: z.enum(['not_applied', 'applied', 'interviewing', 'offer', 'rejected']).optional(),
  appNotes: z.string().optional(),
  appliedAt: z.string().datetime().optional(),
});

export const enqueueSchema = z.object({
  urls: z.string().url().array().min(1).max(50),
});

export const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type JobsQuery = z.infer<typeof jobsQuerySchema>;
export type UpdateJob = z.infer<typeof updateJobSchema>;
export type EnqueueInput = z.infer<typeof enqueueSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
