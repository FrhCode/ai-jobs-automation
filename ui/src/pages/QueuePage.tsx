import { QueueStatus } from '@/components/QueueStatus';
import { useQueue, useRetryQueueItem, useClearQueue, useProcessQueue } from '@/hooks/useQueue';
import { ListOrdered } from 'lucide-react';

export function QueuePage() {
  const { data, isLoading } = useQueue();
  const retry = useRetryQueueItem();
  const clear = useClearQueue();
  const process = useProcessQueue();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
      <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      Loading queue...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ListOrdered className="w-5 h-5 text-cyan" />
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Queue</h1>
      </div>
      <p className="text-sm text-text-secondary -mt-4">
        Manage scraping and analysis queue. Items auto-process in order.
      </p>
      <QueueStatus
        items={data?.items ?? []}
        isProcessing={data?.isProcessing ?? false}
        onRetry={(id) => retry.mutate({ id })}
        onClear={(statuses) => clear.mutate({ statuses })}
        onProcess={() => process.mutate()}
      />
    </div>
  );
}
