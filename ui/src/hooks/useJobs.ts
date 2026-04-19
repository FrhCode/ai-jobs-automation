import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import {
  getJobs,
  getJob,
  updateJob,
  deleteJobs,
  enqueueJobs,
  reanalyzeJob,
} from '@/api';
import type { JobsQuery, UpdateJob } from '@/shared/schemas';


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
