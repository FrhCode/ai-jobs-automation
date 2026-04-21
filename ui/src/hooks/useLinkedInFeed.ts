import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import {
  getLinkedInPosts,
  getLinkedInPost,
  getLinkedInBatches,
  getLinkedInBatchStatus,
  retryLinkedInBatch,
  updateLinkedInPost,
  generateLinkedInCoverLetter,
  generateLinkedInEmail,
  getLinkedInPostQuestions,
  createLinkedInPostQuestion,
  updateLinkedInPostQuestion,
  deleteLinkedInPostQuestion,
  deleteLinkedInPost,
  getLinkedInReminders,
  getRecruiterContact,
} from '@/api';

export function useLinkedInPosts(page = 1, filters: { isJob?: boolean; recommendation?: string; minScore?: number; appStatus?: string } = {}) {
  return useQuery({
    queryKey: qk.linkedinPosts(page, filters),
    queryFn: () => getLinkedInPosts(page, 20, filters),
  });
}

export function useLinkedInPost(id: number) {
  return useQuery({
    queryKey: qk.linkedinPost(id),
    queryFn: () => getLinkedInPost(id),
    enabled: !!id,
  });
}


export function useLinkedInBatchPolling(batchId: string | null) {
  return useQuery({
    queryKey: qk.linkedinBatch(batchId ?? ''),
    queryFn: () => getLinkedInBatchStatus(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return data.status === 'completed' ? false : 3000;
    },
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
}

export function useUpdateLinkedInPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; appStatus?: string; appNotes?: string; appliedAt?: string | null; emailSentAt?: string | null; reminderAt?: string | null }) =>
      updateLinkedInPost(id, body),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: qk.linkedinPost(vars.id) });
      qc.invalidateQueries({ queryKey: qk.linkedinPosts() });
      qc.invalidateQueries({ queryKey: qk.linkedinReminders() });
      if (vars.emailSentAt && data.contactEmail) {
        qc.invalidateQueries({ queryKey: qk.recruiterContact(data.contactEmail) });
      }
    },
  });
}

export function useRecruiterContact(email: string | null) {
  return useQuery({
    queryKey: qk.recruiterContact(email ?? ''),
    queryFn: () => getRecruiterContact(email!),
    enabled: !!email,
    retry: false,
  });
}

export function useLinkedInPostReminders() {
  return useQuery({
    queryKey: qk.linkedinReminders(),
    queryFn: getLinkedInReminders,
    staleTime: 60_000,
  });
}

export function useGenerateLinkedInCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => generateLinkedInCoverLetter(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: qk.linkedinPost(id) });
    },
  });
}

export function useGenerateLinkedInEmail() {
  return useMutation({
    mutationFn: (id: number) => generateLinkedInEmail(id),
  });
}

export function useLinkedInPostQuestions(id: number) {
  return useQuery({
    queryKey: qk.linkedinPostQuestions(id),
    queryFn: () => getLinkedInPostQuestions(id),
    enabled: !!id,
  });
}

export function useCreateLinkedInPostQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, question }: { id: number; question: string }) => createLinkedInPostQuestion(id, { question }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.linkedinPostQuestions(vars.id) });
    },
  });
}

export function useUpdateLinkedInPostQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, questionId, ...body }: { id: number; questionId: number; question?: string; answer?: string }) =>
      updateLinkedInPostQuestion(id, questionId, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.linkedinPostQuestions(vars.id) });
    },
  });
}

export function useDeleteLinkedInPostQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, questionId }: { id: number; questionId: number }) => deleteLinkedInPostQuestion(id, questionId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qk.linkedinPostQuestions(vars.id) });
    },
  });
}

export function useDeleteLinkedInPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteLinkedInPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.linkedinPosts() });
    },
  });
}

export function useLinkedInBatches() {
  return useQuery({
    queryKey: qk.linkedinBatches(),
    queryFn: getLinkedInBatches,
  });
}

export function useRetryLinkedInBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => retryLinkedInBatch(batchId),
    onSuccess: (_, batchId) => {
      qc.invalidateQueries({ queryKey: qk.linkedinBatch(batchId) });
      qc.invalidateQueries({ queryKey: qk.linkedinBatches() });
    },
  });
}
