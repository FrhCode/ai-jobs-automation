import { z } from 'zod';

export const clearQueueSchema = z.object({
  statuses: z.string().array().min(1).max(10),
});

export type ClearQueueInput = z.infer<typeof clearQueueSchema>;
