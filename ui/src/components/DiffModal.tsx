import * as Dialog from '@radix-ui/react-dialog';
import { X, Check, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

type WordSegment = { text: string; highlight: boolean };
type DiffLine = { type: 'unchanged' | 'added' | 'removed'; content: string; segments?: WordSegment[]; id: number };

function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: Omit<DiffLine, 'id'>[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'unchanged', content: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', content: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', content: a[i - 1] });
      i--;
    }
  }
  return result.map((l, idx) => ({ ...l, id: idx }));
}

// Tokenize a line into words + whitespace runs
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

function diffInline(oldLine: string, newLine: string): { oldSegs: WordSegment[]; newSegs: WordSegment[] } {
  const a = tokenize(oldLine);
  const b = tokenize(newLine);
  const m = a.length, n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const oldSegs: WordSegment[] = [];
  const newSegs: WordSegment[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      oldSegs.unshift({ text: a[i - 1], highlight: false });
      newSegs.unshift({ text: b[j - 1], highlight: false });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newSegs.unshift({ text: b[j - 1], highlight: true });
      j--;
    } else {
      oldSegs.unshift({ text: a[i - 1], highlight: true });
      i--;
    }
  }
  return { oldSegs, newSegs };
}

type SplitRow = {
  type: 'row';
  key: string;
  left?: DiffLine;
  right?: DiffLine;
};

function buildSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].type === 'removed') {
      const removedStart = i;
      while (i < lines.length && lines[i].type === 'removed') i++;
      const removedEnd = i;
      const addedStart = i;
      while (i < lines.length && lines[i].type === 'added') i++;
      const addedEnd = i;

      const removedCount = removedEnd - removedStart;
      const addedCount = addedEnd - addedStart;
      const maxCount = Math.max(removedCount, addedCount);

      for (let k = 0; k < maxCount; k++) {
        const left = k < removedCount ? lines[removedStart + k] : undefined;
        const right = k < addedCount ? lines[addedStart + k] : undefined;

        let leftLine = left;
        let rightLine = right;
        if (left && right) {
          const { oldSegs, newSegs } = diffInline(left.content, right.content);
          leftLine = { ...left, segments: oldSegs };
          rightLine = { ...right, segments: newSegs };
        }

        rows.push({
          type: 'row',
          left: leftLine,
          right: rightLine,
          key: `row-${leftLine?.id ?? 'e'}-${rightLine?.id ?? 'e'}`,
        });
      }
    } else if (lines[i].type === 'added') {
      const start = i;
      while (i < lines.length && lines[i].type === 'added') i++;
      for (let k = start; k < i; k++) {
        rows.push({ type: 'row', right: lines[k], key: `row-${lines[k].id}` });
      }
    } else {
      rows.push({ type: 'row', left: lines[i], right: lines[i], key: `row-${lines[i].id}` });
      i++;
    }
  }
  return rows;
}

type EllipsisEntry = { type: 'ellipsis'; count: number; key: string };
type CollapsedEntry = SplitRow | EllipsisEntry;

function collapseSplitRows(rows: SplitRow[], context = 3): CollapsedEntry[] {
  const isUnchanged = (row: SplitRow) =>
    row.left?.type === 'unchanged' && row.right?.type === 'unchanged';

  const hasChange = (idx: number) => {
    for (let k = Math.max(0, idx - context); k <= Math.min(rows.length - 1, idx + context); k++) {
      if (!isUnchanged(rows[k])) return true;
    }
    return false;
  };

  const result: CollapsedEntry[] = [];
  let skipping = 0;
  let skipStartKey = '';

  for (let i = 0; i < rows.length; i++) {
    if (isUnchanged(rows[i]) && !hasChange(i)) {
      if (skipping === 0) skipStartKey = rows[i].key;
      skipping++;
    } else {
      if (skipping > 0) {
        result.push({ type: 'ellipsis', count: skipping, key: `ellipsis-${skipStartKey}` });
        skipping = 0;
      }
      result.push(rows[i]);
    }
  }
  if (skipping > 0) result.push({ type: 'ellipsis', count: skipping, key: `ellipsis-${skipStartKey}` });
  return result;
}

function SplitLineContent({ line, side }: { readonly line?: DiffLine; readonly side: 'left' | 'right' }) {
  if (!line) {
    return <span className="flex-1 select-none"> </span>;
  }
  if (!line.segments) {
    return <span className="flex-1">{line.content || ' '}</span>;
  }
  let offset = 0;
  return (
    <span className="flex-1">
      {line.segments.map((seg) => {
        const key = offset;
        offset += seg.text.length;
        return seg.highlight ? (
          <span
            key={key}
            className={cn(
              'font-semibold',
              side === 'left' ? 'text-red-400' : 'text-green-500'
            )}
          >
            {seg.text}
          </span>
        ) : (
          <span key={key}>{seg.text}</span>
        );
      })}
    </span>
  );
}

interface DiffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentText: string;
  proposedText: string;
  onAccept: () => void;
}

export function DiffModal({ open, onOpenChange, currentText, proposedText, onAccept }: DiffModalProps) {
  const raw = diffLines(currentText, proposedText);
  const rows = buildSplitRows(raw);
  const collapsed = collapseSplitRows(rows);

  const addedCount = raw.filter((l) => l.type === 'added').length;
  const removedCount = raw.filter((l) => l.type === 'removed').length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,1000px)] max-h-[85vh] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
            <div className="flex flex-col gap-0.5">
              <Dialog.Title className="text-sm font-semibold text-text-primary">
                Review Changes
              </Dialog.Title>
              <p className="text-xs text-text-muted">
                <span className="text-emerald font-medium">+{addedCount}</span>
                {' '}lines added,{' '}
                <span className="text-red-400 font-medium">−{removedCount}</span>
                {' '}lines removed
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-2 shrink-0 text-xs font-semibold text-text-muted border-b border-border-subtle bg-surface-elevated/50">
            <div className="px-3 py-2 border-r border-border-subtle">Current</div>
            <div className="px-3 py-2">Proposed</div>
          </div>

          {/* Diff body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="m-4 font-mono text-xs leading-relaxed rounded-lg border border-border-subtle overflow-hidden">
              {collapsed.map((entry) => {
                if (entry.type === 'ellipsis') {
                  return (
                    <div key={entry.key} className="px-4 py-1 text-text-muted border-y border-border-subtle text-center select-none">
                      ··· {entry.count} unchanged {entry.count === 1 ? 'line' : 'lines'} ···
                    </div>
                  );
                }
                return (
                  <div key={entry.key} className="grid grid-cols-2 divide-x divide-border-subtle">
                    {/* Left side */}
                    <div className={cn(
                      'flex items-start gap-2 px-3 py-0.5 whitespace-pre-wrap break-words',
                      entry.left?.type === 'removed' && 'text-red-300',
                      entry.left?.type === 'unchanged' && 'text-text-secondary',
                    )}>
                      <span className={cn(
                        'shrink-0 w-3 select-none font-bold',
                        entry.left?.type === 'removed' && 'text-red-400',
                      )}>
                        {entry.left ? (entry.left.type === 'removed' ? '−' : ' ') : ' '}
                      </span>
                      <SplitLineContent line={entry.left} side="left" />
                    </div>

                    {/* Right side */}
                    <div className={cn(
                      'flex items-start gap-2 px-3 py-0.5 whitespace-pre-wrap break-words',
                      entry.right?.type === 'added' && 'text-green-400',
                      entry.right?.type === 'unchanged' && 'text-text-secondary',
                    )}>
                      <span className={cn(
                        'shrink-0 w-3 select-none font-bold',
                        entry.right?.type === 'added' && 'text-green-500',
                      )}>
                        {entry.right ? (entry.right.type === 'added' ? '+' : ' ') : ' '}
                      </span>
                      <SplitLineContent line={entry.right} side="right" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-subtle shrink-0 bg-surface/50">
            <Dialog.Close asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer">
                <Ban className="w-3.5 h-3.5" />
                Reject
              </button>
            </Dialog.Close>
            <button
              onClick={() => {
                onAccept();
                onOpenChange(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Accept Changes
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
