import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { getSettings, updateSettings, triggerCron } from '@/api';

export function useSettings() {
  return useQuery({
    queryKey: qk.settings(),
    queryFn: getSettings,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings() }),
  });
}

export type UpdateSettingsMutation = ReturnType<typeof useUpdateSettings>;

export function useTriggerCron() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerCron,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.queue() });
      qc.invalidateQueries({ queryKey: qk.jobs() });
      qc.invalidateQueries({ queryKey: qk.stats() });
    },
  });
}
