import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { getOpenRouterCredits } from '@/api';

export function useOpenRouterCredits() {
  return useQuery({
    queryKey: qk.openrouterCredits(),
    queryFn: getOpenRouterCredits,
    refetchInterval: 60000,
  });
}
