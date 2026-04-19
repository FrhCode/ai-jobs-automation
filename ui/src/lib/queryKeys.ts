export const qk = {
  me: () => ['me'] as const,
  jobs: (f?: Record<string, unknown>) => ['jobs', f ?? {}] as const,
  job: (id: number) => ['jobs', id] as const,
  jobQuestions: (id: number) => ['jobs', id, 'questions'] as const,
  queue: () => ['queue'] as const,
  resume: () => ['resume'] as const,
  settings: () => ['settings'] as const,
  stats: () => ['stats'] as const,
};
