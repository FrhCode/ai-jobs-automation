import { RefreshCw, Play, Trash2, Clock, CheckCircle2, XCircle, Loader2, ListOrdered } from 'lucide-react';
import type { QueueItem } from '@/types/data';
import { QUEUE_STATUS_COLOR, QUEUE_STATUS } from '@/shared/constants';
import { cn } from '@/lib/utils';

interface QueueStatusProps {
  readonly items: QueueItem[];
  readonly isProcessing: boolean;
  readonly onRetry: (id: number) => void;
  readonly onClear: (statuses: string[]) => void;
  readonly onProcess: () => void;
}

export function QueueStatus({ items, isProcessing, onRetry, onClear, onProcess }: QueueStatusProps) {
  const doneCount = items.filter((i) => i.status === 'done').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const runningCount = items.filter((i) => i.status === 'running').length;

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-secondary">
              <span className="text-text-primary font-mono font-semibold">{pendingCount}</span> pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className={cn('w-4 h-4 text-cyan', isProcessing && 'animate-spin')} />
            <span className="text-sm text-text-secondary">
              <span className="text-cyan font-mono font-semibold">{runningCount}</span> running
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald" />
            <span className="text-sm text-text-secondary">
              <span className="text-emerald font-mono font-semibold">{doneCount}</span> done
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose" />
            <span className="text-sm text-text-secondary">
              <span className="text-rose font-mono font-semibold">{failedCount}</span> failed
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onClear(['done', 'failed'])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:text-rose hover:border-rose/40 hover:bg-rose-glow transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Done/Failed
          </button>
          <button
            onClick={onProcess}
            disabled={isProcessing || pendingCount === 0}
            className="btn-primary px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5" />
            {isProcessing ? 'Processing…' : 'Process Queue'}
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary">Queue Items</h3>
        </div>
        <div className="divide-y divide-border-subtle/50">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 hover:bg-surface-elevated/60 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm text-text-primary truncate font-mono">{item.url}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted font-mono uppercase">{item.source}</span>
                  <span className="text-text-muted/50">·</span>
                  <span className="text-xs text-text-muted font-mono">
                    Attempt {item.attempts}/{item.maxAttempts}
                  </span>
                  {item.errorMsg && (
                    <span className="text-xs text-rose truncate">{item.errorMsg}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', QUEUE_STATUS_COLOR[item.status as typeof QUEUE_STATUS[number]])}>
                  {item.status}
                </span>
                {item.status === 'failed' && (
                  <button
                    onClick={() => onRetry(item.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-cyan hover:bg-cyan-dim transition-all"
                    title="Retry"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-text-muted">
              <ListOrdered className="w-7 h-7 opacity-30" />
              <p className="text-sm">Queue is empty.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
