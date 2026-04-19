import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { getMe, login, logout } from '@/api';

export function useAuth() {
  return useQuery({
    queryKey: qk.me(),
    queryFn: getMe,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ password }: { password: string }) => login(password),
    onSuccess: () => {
      qc.setQueryData(qk.me(), { authenticated: true });
      qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.setQueryData(qk.me(), { authenticated: false });
      qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}
