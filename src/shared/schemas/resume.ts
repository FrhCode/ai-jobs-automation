import { z } from 'zod';

export const resumeSchema = z.object({
  filename: z.string(),
  extractedText: z.string(),
  uploadedAt: z.string().datetime(),
});

export type ResumeInfo = z.infer<typeof resumeSchema>;
