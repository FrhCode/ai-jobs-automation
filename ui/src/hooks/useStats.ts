import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { getStats } from '@/api';


export function useStats() {
  return useQuery({
    queryKey: qk.stats(),
    queryFn: getStats,
  });
}
