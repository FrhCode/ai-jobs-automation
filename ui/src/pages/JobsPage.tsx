import { JobsTable } from "@/components/JobsTable";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDeleteJobs, useJobs } from "@/hooks/useJobs";
import {
  APP_STATUS,
  APP_STATUS_LABEL,
  RECOMMENDATION,
} from "@/shared/constants";
import type { JobsQuery } from "@/shared/schemas";
import { jobsQuerySchema } from "@/shared/schemas";
import { Briefcase, Search, SlidersHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<JobsQuery>(
    jobsQuerySchema.parse({
      recommendation: searchParams.get("recommendation") || undefined,
      appStatus: searchParams.get("appStatus") || undefined,
      q: searchParams.get("q") || undefined,
      sort: searchParams.get("sort") || "score",
      dir: searchParams.get("dir") || "desc",
      page: Number(searchParams.get("page")) || 1,
    }),
  );

  // Local state for search input to avoid API call on every keystroke
  const [searchInput, setSearchInput] = useState(filters.q ?? "");

  const { data, isLoading, isError } = useJobs(filters);
  const deleteJobs = useDeleteJobs();

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFilter = (key: keyof JobsQuery, value: string | undefined) => {
    setFilters((prev) => {
      if (prev[key] === value) return prev;
      const next = { ...prev, [key]: value, page: 1 };
      const sp = new URLSearchParams();
      Object.entries(next).forEach(([k, v]) => {
        if ((typeof v === "string" && v !== "") || typeof v === "number")
          sp.set(k, String(v));
      });
      setSearchParams(sp);
      return next;
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const nextQ = value.trim() || undefined;
      updateFilter("q", nextQ);
    }, 400);
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
        <div className="w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
        Loading jobs…
      </div>
    );
  if (isError)
    return (
      <div className="flex items-center justify-center h-64 text-rose gap-2 text-sm">
        <span className="w-2 h-2 rounded-full bg-rose shrink-0" />
        Failed to load jobs.
      </div>
    );

  const applyCount =
    data?.jobs?.filter((j) => j.recommendation === "Apply").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-text-muted" />
            <h1 className="font-heading text-2xl font-semibold text-text-primary tracking-tight">
              Jobs
            </h1>
          </div>
          <p className="text-sm text-text-secondary">
            {data?.total ?? 0} opportunities tracked
          </p>
        </div>
        <div className="text-right">
          <div className="font-heading text-3xl font-bold text-cyan tabular-nums">
            {applyCount}
          </div>
          <p className="text-xs text-text-muted uppercase tracking-wider mt-0.5">
            Recommended
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-3.5 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-55">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <Input
            placeholder="Search title, company, location…"
            className="pl-9"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
          <Select
            value={filters.recommendation ?? ""}
            onChange={(e) =>
              updateFilter("recommendation", e.target.value || undefined)
            }
            className="min-w-35"
          >
            <option value="">All Recommendations</option>
            {RECOMMENDATION.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select
            value={filters.appStatus ?? ""}
            onChange={(e) =>
              updateFilter("appStatus", e.target.value || undefined)
            }
            className="min-w-35"
          >
            <option value="">All Statuses</option>
            {APP_STATUS.map((s) => (
              <option key={s} value={s}>
                {APP_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <JobsTable
        jobs={data?.jobs ?? []}
        onDelete={(ids) => deleteJobs.mutate({ ids })}
      />

      {data && data.total > filters.limit && (
        <div className="flex items-center justify-center gap-3">
          <button
            className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={filters.page <= 1}
            onClick={() => updateFilter("page", String(filters.page - 1))}
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary font-mono">
            Page{" "}
            <span className="text-text-primary font-medium">
              {filters.page}
            </span>{" "}
            of {Math.ceil(data.total / filters.limit)}
          </span>
          <button
            className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={filters.page >= Math.ceil(data.total / filters.limit)}
            onClick={() => updateFilter("page", String(filters.page + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
