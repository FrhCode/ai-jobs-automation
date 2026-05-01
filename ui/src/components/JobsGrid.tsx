import { cn } from "@/lib/utils";
import {
  APP_STATUS,
  APP_STATUS_COLOR,
  APP_STATUS_LABEL,
  RECOMMENDATION_COLOR,
} from "@/shared/constants";
import type { UpdateJob } from "@/shared/schemas";
import type { Job } from "@/types/data";
import { Ban, Briefcase, ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface JobsGridProps {
  readonly jobs: Job[];
  readonly onDelete: (ids: number[]) => void;
  readonly onUpdateJob?: (id: number, data: UpdateJob) => void;
}

function scoreColorClass(score: number) {
  if (score >= 80) return "bg-emerald";
  if (score >= 60) return "bg-amber";
  return "bg-rose";
}

function scoreTextClass(score: number) {
  if (score >= 80) return "text-emerald";
  if (score >= 60) return "text-amber";
  return "text-rose";
}

export function JobsGrid({ jobs, onDelete, onUpdateJob }: JobsGridProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allSelected = jobs.length > 0 && selectedIds.size === jobs.length;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const selectedArray = Array.from(selectedIds);

  return (
    <div className="space-y-3">
      {/* Selection bar */}
      {selectedArray.length > 0 ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">
            <span className="text-cyan font-mono font-semibold">
              {selectedArray.length}
            </span>{" "}
            selected
          </span>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-glow text-rose border border-rose/15 hover:bg-rose/10 transition-all cursor-pointer"
            onClick={() => {
              onDelete(selectedArray);
              setSelectedIds(new Set());
            }}
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="rounded border-border-subtle bg-surface accent-cyan"
          />
          <span className="text-xs text-text-muted">Select all</span>
        </div>
      )}

      {/* Grid */}
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const isSelected = selectedIds.has(job.id);
            return (
              <div
                key={job.id}
                className={cn(
                  "glass-card rounded-xl p-4 relative group cursor-pointer transition-all",
                  "hover:border-border-hover"
                )}
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                {/* Top row: checkbox + actions */}
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(job.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-border-subtle bg-surface accent-cyan mt-0.5"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-lg text-text-muted hover:text-rose hover:bg-rose/10 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Mark as Not Interested"
                      disabled={
                        job.appStatus === "not_interested" || !onUpdateJob
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateJob?.(job.id, { appStatus: "not_interested" });
                      }}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-text-muted hover:text-cyan hover:bg-cyan/10 transition-colors cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-text-primary text-sm leading-snug mb-1">
                  {job.title ?? "Untitled Position"}
                </h3>

                {/* Company + location */}
                <div className="text-xs text-text-secondary flex items-center gap-1 mb-4">
                  {job.company ?? "Unknown Company"}
                  {job.location && (
                    <>
                      <span className="text-text-muted">·</span>
                      {job.location}
                    </>
                  )}
                </div>

                {/* Bottom row: score, badges, salary */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Score */}
                  {job.score != null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 score-bar">
                        <div
                          className={cn(
                            "score-bar-fill",
                            scoreColorClass(job.score)
                          )}
                          style={{ width: `${job.score}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-mono font-semibold",
                          scoreTextClass(job.score)
                        )}
                      >
                        {job.score}
                      </span>
                    </div>
                  ) : (
                    <span className="text-text-muted font-mono text-xs">
                      —
                    </span>
                  )}

                  {/* Recommendation badge */}
                  {job.recommendation && (
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                        RECOMMENDATION_COLOR[
                          job.recommendation as "Apply" | "Consider" | "Skip"
                        ]
                      )}
                    >
                      {job.recommendation}
                    </span>
                  )}

                  {/* Status badge */}
                  {job.appStatus && (
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                        APP_STATUS_COLOR[
                          job.appStatus as (typeof APP_STATUS)[number]
                        ]
                      )}
                    >
                      {
                        APP_STATUS_LABEL[
                          job.appStatus as (typeof APP_STATUS)[number]
                        ]
                      }
                    </span>
                  )}

                  {/* Salary */}
                  {job.salary && (
                    <span className="text-xs text-text-secondary font-mono ml-auto">
                      {job.salary}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-xl py-16 text-center text-text-muted">
          <div className="flex flex-col items-center gap-2">
            <Briefcase className="w-7 h-7 text-text-muted/40" />
            <p className="text-sm">
              No jobs found matching your criteria.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
