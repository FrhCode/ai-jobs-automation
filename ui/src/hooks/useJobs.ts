import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import {
  getJobs,
  getJob,
  updateJob,
  deleteJobs,
  enqueueJobs,
  reanalyzeJob,
  generateCoverLetter,
  getCoverLetterStatus,
  generateTailoredResume,
  getTailoredResumeStatus,
  getJobQuestions,
  createJobQuestion,
  updateJobQuestion,
  deleteJobQuestion,
} from '@/api';
import type { JobsQuery, UpdateJob, CreateQuestionInput, UpdateQuestionInput } from '@/shared/schemas';


export function useJobs(filters: JobsQuery) {
  return useQuery({
    queryKey: qk.jobs(filters),
    queryFn: () => getJobs(filters),
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: qk.job(id),
    queryFn: () => getJob(id),
    enabled: id > 0,
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateJob & { id: number }) => updateJob(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.jobs() });
      qc.invalidateQueries({ queryKey: qk.job(variables.id) });
    },
  });
}

export function useDeleteJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids }: { ids: number[] }) => deleteJobs(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.jobs() }),
  });
}

export function useEnqueueJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ urls }: { urls: string[] }) => enqueueJobs(urls),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.jobs() }),
  });
}

export function useReanalyzeJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => reanalyzeJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.jobs() }),
  });
}

export function useGenerateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => generateCoverLetter(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.coverLetterStatus(variables.id) });
    },
  });
}

export function useCoverLetterStatus(id: number) {
  return useQuery({
    queryKey: qk.coverLetterStatus(id),
    queryFn: () => getCoverLetterStatus(id),
    enabled: id > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'generating') return 3000;
      return false;
    },
  });
}

export function useGenerateTailoredResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => generateTailoredResume(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.jobs() });
      qc.invalidateQueries({ queryKey: qk.job(variables.id) });
      qc.invalidateQueries({ queryKey: qk.tailoredResumeStatus(variables.id) });
    },
  });
}

export function useTailoredResumeStatus(id: number) {
  return useQuery({
    queryKey: qk.tailoredResumeStatus(id),
    queryFn: () => getTailoredResumeStatus(id),
    enabled: id > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'generating') return 3000;
      return false;
    },
  });
}

export function useJobQuestions(jobId: number) {
  return useQuery({
    queryKey: qk.jobQuestions(jobId),
    queryFn: () => getJobQuestions(jobId),
    enabled: jobId > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.some((q) => q.answerStatus === 'generating')) return 3000;
      return false;
    },
  });
}

export function useCreateJobQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: CreateQuestionInput & { id: number }) => createJobQuestion(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.jobQuestions(variables.id) });
    },
  });
}

export function useUpdateJobQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, questionId, ...body }: UpdateQuestionInput & { id: number; questionId: number }) =>
      updateJobQuestion(id, questionId, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.jobQuestions(variables.id) });
    },
  });
}

export function useDeleteJobQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, questionId }: { id: number; questionId: number }) => deleteJobQuestion(id, questionId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.jobQuestions(variables.id) });
    },
  });
}
