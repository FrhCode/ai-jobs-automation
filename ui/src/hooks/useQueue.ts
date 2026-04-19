import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { getQueue, retryQueueItem, clearQueue, processQueue } from '@/api';

export function useQueue() {
  return useQuery({
    queryKey: qk.queue(),
    queryFn: getQueue,
    refetchInterval: 3000,
  });
}

export function useRetryQueueItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => retryQueueItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.queue() }),
  });
}

export function useClearQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ statuses }: { statuses: string[] }) => clearQueue(statuses),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.queue() }),
  });
}

export function useProcessQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: processQueue,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.queue() }),
  });
}
