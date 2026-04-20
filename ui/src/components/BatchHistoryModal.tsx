import { X, AlertCircle, CheckCircle2, Loader2, History, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLinkedInBatches, useRetryLinkedInBatch } from '@/hooks/useLinkedInFeed';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function BatchHistoryModal({ open, onClose }: Props) {
  const { data: batches, isLoading, refetch } = useLinkedInBatches();
  const retry = useRetryLinkedInBatch();

  if (!open) return null;

  const hasFailed = batches?.some((b) => b.failed > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan" />
            <h2 className="text-sm font-semibold text-text-primary">Batch History</h2>
            {hasFailed && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose/10 text-rose">
                Has failures
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading batches…</span>
            </div>
          )}

          {!isLoading && (!batches || batches.length === 0) && (
            <div className="text-center py-12 text-text-muted text-sm">No batches found.</div>
          )}

          {batches?.map((batch) => {
            const isComplete = batch.processed >= batch.total;
            const hasFail = batch.failed > 0;
            const isRetrying = retry.isPending && retry.variables === batch.batchId;

            return (
              <div
                key={batch.batchId}
                className={cn(
                  'rounded-xl p-3.5 border transition-colors',
                  hasFail
                    ? 'border-rose/20 bg-rose/5'
                    : 'border-border-subtle bg-surface-elevated/40'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-cyan animate-spin shrink-0" />
                      )}
                      <span className="text-xs font-mono text-text-muted truncate max-w-[200px]" title={batch.batchId}>
                        {batch.batchId}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-text-secondary">
                      <span>{batch.total} posts</span>
                      {hasFail && (
                        <span className="text-rose font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {batch.failed} failed
                        </span>
                      )}
                      <span className="text-text-muted">{formatDate(batch.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasFail && (
                      <button
                        onClick={() => retry.mutate(batch.batchId)}
                        disabled={isRetrying}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose/10 text-rose border border-rose/20 hover:bg-rose/20 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isRetrying ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Retry {batch.failed}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 w-full h-1 bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', hasFail ? 'bg-rose/60' : 'bg-cyan')}
                    style={{ width: `${Math.round((batch.processed / Math.max(batch.total, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle shrink-0 flex justify-between items-center">
          <span className="text-xs text-text-muted">{batches?.length ?? 0} batches total</span>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
