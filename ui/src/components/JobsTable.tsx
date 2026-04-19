import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type Column,
  type Row,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, ExternalLink, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/data';
import { RECOMMENDATION_COLOR, APP_STATUS_LABEL, APP_STATUS_COLOR, APP_STATUS } from '@/shared/constants';

interface JobsTableProps {
  readonly jobs: Job[];
  readonly onDelete: (ids: number[]) => void;
}

function scoreColorClass(score: number) {
  if (score >= 80) return 'bg-emerald';
  if (score >= 60) return 'bg-amber';
  return 'bg-rose';
}

function scoreTextClass(score: number) {
  if (score >= 80) return 'text-emerald';
  if (score >= 60) return 'text-amber';
  return 'text-rose';
}

function SortIcon({ sorted }: { readonly sorted: string | boolean }) {
  if (sorted === 'asc') return <ArrowUp className="w-3 h-3 text-cyan" />;
  if (sorted === 'desc') return <ArrowDown className="w-3 h-3 text-cyan" />;
  return <ArrowUpDown className="w-3 h-3 text-text-muted" />;
}

export function JobsTable({ jobs, onDelete }: JobsTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const columns = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={jobs.length > 0 && Object.keys(rowSelection).length === jobs.length}
          onChange={(e) => {
            if (e.target.checked) {
              const all: Record<string, boolean> = {};
              jobs.forEach((_, i) => (all[i] = true));
              setRowSelection(all);
            } else {
              setRowSelection({});
            }
          }}
          className="rounded border-border-subtle bg-surface accent-cyan"
        />
      ),
      cell: ({ row }: { row: Row<Job> }) => (
        <input
          type="checkbox"
          checked={!!rowSelection[row.index]}
          onChange={(e) => {
            setRowSelection((prev) => ({ ...prev, [row.index]: e.target.checked }));
          }}
          className="rounded border-border-subtle bg-surface accent-cyan"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      accessorKey: 'title',
      header: 'Position',
      cell: ({ row }: { row: Row<Job> }) => (
        <div>
          <div className="font-medium text-text-primary">{row.original.title}</div>
          <div className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
            {row.original.company}
            {row.original.location && (
              <>
                <span className="text-text-muted">·</span>
                {row.original.location}
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'score',
      header: ({ column }: { column: Column<Job> }) => (
        <button
          className="flex items-center gap-1.5 hover:text-cyan transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Match
          <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }: { row: Row<Job> }) => {
        const score = row.original.score;
        if (score == null) return <span className="text-text-muted font-mono">—</span>;
        return (
          <div className="flex items-center gap-3">
            <div className="w-20 h-1.5 score-bar">
              <div className={cn('score-bar-fill', scoreColorClass(score))} style={{ width: `${score}%` }} />
            </div>
            <span className={cn('text-sm font-mono font-semibold', scoreTextClass(score))}>{score}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'recommendation',
      header: 'AI Says',
      cell: ({ row }: { row: Row<Job> }) => {
        const rec = row.original.recommendation;
        if (!rec) return <span className="text-text-muted">—</span>;
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', RECOMMENDATION_COLOR[rec as 'Apply' | 'Consider' | 'Skip'])}>
            {rec}
          </span>
        );
      },
    },
    {
      accessorKey: 'appStatus',
      header: 'Status',
      cell: ({ row }: { row: Row<Job> }) => (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', APP_STATUS_COLOR[row.original.appStatus as typeof APP_STATUS[number]])}>
          {APP_STATUS_LABEL[row.original.appStatus as typeof APP_STATUS[number]]}
        </span>
      ),
    },
    {
      accessorKey: 'salary',
      header: 'Compensation',
      cell: ({ row }: { row: Row<Job> }) => (
        <span className="text-sm text-text-secondary font-mono">
          {row.original.salary ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: Row<Job> }) => (
        <a
          href={row.original.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-cyan transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ),
    },
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: jobs,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  const selectedIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map((k) => jobs[Number(k)].id);

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 animate-fade-in-up">
          <span className="text-sm text-text-secondary">
            <span className="text-cyan font-mono font-semibold">{selectedIds.length}</span> selected
          </span>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-glow text-rose border border-rose/15 hover:bg-rose/10 transition-all"
            onClick={() => { onDelete(selectedIds); setRowSelection({}); }}
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border-subtle bg-surface-elevated">
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border-subtle/60 table-row-hover cursor-pointer"
                onClick={() => navigate(`/jobs/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Briefcase className="w-7 h-7 text-text-muted/40" />
                    <p className="text-sm">No jobs found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
