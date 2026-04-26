import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { getResume, uploadResume, deleteResume, updateResumeText } from '@/api';

export function useResume() {
  return useQuery({
    queryKey: qk.resume(),
    queryFn: getResume,
  });
}

export function useUploadResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadResume,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.resume() }),
  });
}

export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteResume,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.resume() }),
  });
}

export function useUpdateResumeText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateResumeText,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.resume() }),
  });
}
