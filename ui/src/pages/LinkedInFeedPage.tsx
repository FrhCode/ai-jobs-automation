import {
  finalizeLinkedInUpload,
  initLinkedInUpload,
  uploadLinkedInChunk,
} from "@/api";
import { BatchHistoryModal } from "@/components/BatchHistoryModal";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDeleteLinkedInPost,
  useLinkedInBatchPolling,
  useLinkedInPosts,
  useRetryLinkedInBatch,
  useUpdateLinkedInPost,
} from "@/hooks/useLinkedInFeed";
import { extractEmails, extractUrls } from "@/lib/extractContact";
import { cn } from "@/lib/utils";
import {
  APP_STATUS,
  APP_STATUS_COLOR,
  APP_STATUS_LABEL,
} from "@/shared/constants";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Filter,
  History,
  Link as LinkIcon,
  Loader2,
  Mail,
  RotateCcw,
  Rss,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate, useSearchParams } from "react-router-dom";

function ScoreBadge({
  score,
  recommendation,
}: {
  score: number | null;
  recommendation: string | null;
}) {
  if (score === null || score < 0) {
    return <Badge variant="outline">Not analyzed</Badge>;
  }
  const color =
    score >= 70
      ? "bg-emerald/10 text-emerald border-emerald/20"
      : score >= 50
        ? "bg-amber/10 text-amber border-amber/20"
        : "bg-rose/10 text-rose border-rose/20";
  return (
    <Badge className={cn(color, "font-semibold")}>
      {score} — {recommendation}
    </Badge>
  );
}

const RECOMMENDATION_OPTIONS = ["All", "Apply", "Consider", "Skip"];

export function LinkedInFeedPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [showBatchHistory, setShowBatchHistory] = useState(false);
  const [deletePostId, setDeletePostId] = useState<number | null>(null);

  // Single source of truth: all filter + page + batch state from URL
  const page = Number(searchParams.get("page")) || 1;
  const programmerOnly = searchParams.get("programmer") !== "0";
  const recommendationFilter = searchParams.get("recommendation") || "All";
  const minScore = searchParams.get("minScore") || "";
  const statusFilter = searchParams.get("status") || "All";
  const activeBatchId = searchParams.get("batch");

  const filters = {
    isJob: programmerOnly ? true : undefined,
    recommendation:
      recommendationFilter !== "All" ? recommendationFilter : undefined,
    minScore: minScore ? Number(minScore) : undefined,
    appStatus: statusFilter !== "All" ? statusFilter : undefined,
  };

  const { data, isLoading } = useLinkedInPosts(page, filters);
  const batch = useLinkedInBatchPolling(activeBatchId);
  const del = useDeleteLinkedInPost();
  const retry = useRetryLinkedInBatch();
  const update = useUpdateLinkedInPost();

  // Chunked upload state
  const CHUNK_SIZE = 512 * 1024;
  type ChunkStatus = "pending" | "done" | "failed";
  type UploadPhase = "idle" | "uploading" | "error" | "done";
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [chunkStatuses, setChunkStatuses] = useState<ChunkStatus[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    batchId: string | null;
    total: number;
    matched: number;
    status: string;
    message?: string;
  } | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const uploadFileRef = useRef<File | null>(null);

  const updateUrl = (updates: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, v);
    });
    setSearchParams(sp);
  };

  const runUpload = async (
    file: File,
    existingUploadId?: string,
    existingStatuses?: ChunkStatus[],
  ) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let statuses: ChunkStatus[] =
      existingStatuses ?? new Array(totalChunks).fill("pending");

    let currentUploadId = existingUploadId;
    if (!currentUploadId) {
      const { uploadId } = await initLinkedInUpload();
      currentUploadId = uploadId;
      uploadIdRef.current = uploadId;
      uploadFileRef.current = file;
      statuses = new Array(totalChunks).fill("pending");
      setChunkStatuses(statuses);
    }

    setUploadPhase("uploading");
    setUploadError(null);

    const CONCURRENCY = 5;
    const pending = Array.from({ length: totalChunks }, (_, i) => i).filter(
      (i) => statuses[i] !== "done",
    );
    let hasError = false;

    for (let offset = 0; offset < pending.length; offset += CONCURRENCY) {
      if (hasError) break;
      const batch = pending.slice(offset, offset + CONCURRENCY);
      await Promise.all(
        batch.map(async (i) => {
          if (hasError) return;
          const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          try {
            await uploadLinkedInChunk(currentUploadId!, i, totalChunks, chunk);
            statuses = statuses.map((s, idx) => (idx === i ? "done" : s));
            setChunkStatuses([...statuses]);
          } catch (err) {
            hasError = true;
            statuses = statuses.map((s, idx) => (idx === i ? "failed" : s));
            setChunkStatuses([...statuses]);
            setUploadPhase("error");
            setUploadError(
              err instanceof Error ? err.message : "Chunk upload failed",
            );
          }
        }),
      );
    }

    if (hasError) return;

    try {
      const result = await finalizeLinkedInUpload(currentUploadId, file.name);
      setUploadResult(result);
      setUploadPhase("done");
      if (result.batchId) updateUrl({ batch: result.batchId });
    } catch (err) {
      setUploadPhase("error");
      setUploadError(err instanceof Error ? err.message : "Finalize failed");
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    updateUrl({ batch: undefined });
    uploadIdRef.current = null;
    uploadFileRef.current = null;
    setChunkStatuses([]);
    setUploadPhase("idle");
    setUploadResult(null);
    setUploadError(null);
    runUpload(file);
  };

  const handleRetryFailed = () => {
    if (!uploadFileRef.current || !uploadIdRef.current) return;
    runUpload(uploadFileRef.current, uploadIdRef.current, chunkStatuses);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/html": [".html", ".htm"] },
    multiple: false,
  });

  // Invalidate posts list periodically while batch is processing
  useEffect(() => {
    if (!activeBatchId || batch.data?.status === "completed") return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["linkedin-posts"] });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBatchId, batch.data?.status, qc]);

  const isProcessing = activeBatchId && batch.data?.status !== "completed";
  const batchProgress = batch.data
    ? Math.round((batch.data.processed / Math.max(batch.data.total, 1)) * 100)
    : 0;

  const hasActiveFilters =
    !programmerOnly ||
    recommendationFilter !== "All" ||
    minScore !== "" ||
    statusFilter !== "All";

  const clearFilters = () => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("page");
    sp.delete("programmer");
    sp.delete("recommendation");
    sp.delete("minScore");
    sp.delete("status");
    setSearchParams(sp);
  };

  const handleToggleNotInterested = (
    e: React.MouseEvent,
    postId: number,
    currentStatus: string | null,
  ) => {
    e.stopPropagation();
    const next =
      currentStatus === "not_interested" ? "not_applied" : "not_interested";
    update.mutate({ id: postId, appStatus: next });
  };

  const handleDeleteConfirm = () => {
    if (deletePostId !== null) {
      del.mutate(deletePostId, { onSuccess: () => setDeletePostId(null) });
    }
  };

  return (
    <div className="space-y-6">
      <BatchHistoryModal
        open={showBatchHistory}
        onClose={() => setShowBatchHistory(false)}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deletePostId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletePostId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This will permanently remove the post and its AI analysis. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeletePostId(null)}
              className="px-4 py-2 rounded-lg text-sm border border-border-subtle text-text-secondary hover:border-border-hover transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={del.isPending}
              className="px-4 py-2 rounded-lg text-sm bg-rose/10 text-rose border border-rose/20 hover:bg-rose/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {del.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Rss className="w-5 h-5 text-cyan" />
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            LinkedIn Feed
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatchHistory(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle bg-surface-elevated text-text-secondary hover:border-border-hover transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            Batch History
          </button>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
              hasActiveFilters
                ? "bg-cyan/10 text-cyan border-cyan/20"
                : "bg-surface-elevated text-text-secondary border-border-subtle hover:border-border-hover",
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
            )}
          </button>
          {data && (
            <p className="text-sm text-text-secondary">{data.total} posts</p>
          )}
        </div>
      </div>

      <p className="text-sm text-text-secondary -mt-4">
        Upload a saved LinkedIn feed HTML file. We'll extract posts, detect
        job-related keywords, filter for programmer jobs, and score the fit
        against your resume.
      </p>

      {/* Filters */}
      {showFilters && (
        <div className="glass-card rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Filter className="w-4 h-4 text-cyan" />
              Filter Posts
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-rose transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Programmer jobs only */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={programmerOnly}
                  onChange={(e) => {
                    updateUrl({
                      programmer: e.target.checked ? undefined : "0",
                      page: undefined,
                    });
                  }}
                  className="peer sr-only"
                />
                <div className="w-9 h-5 bg-surface-elevated border border-border-subtle rounded-full peer-checked:bg-cyan peer-checked:border-cyan transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-text-secondary">
                Programmer jobs only
              </span>
            </label>

            {/* Recommendation filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted shrink-0">
                Recommendation
              </span>
              <select
                value={recommendationFilter}
                onChange={(e) => {
                  updateUrl({
                    recommendation:
                      e.target.value === "All" ? undefined : e.target.value,
                    page: undefined,
                  });
                }}
                className="flex-1 min-w-0 text-sm bg-surface-elevated border border-border-subtle rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-cyan cursor-pointer dark:[&>option]:bg-surface dark:[&>option]:text-text-primary"
              >
                {RECOMMENDATION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted shrink-0">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  updateUrl({
                    status:
                      e.target.value === "All" ? undefined : e.target.value,
                    page: undefined,
                  });
                }}
                className="flex-1 min-w-0 text-sm bg-surface-elevated border border-border-subtle rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-cyan cursor-pointer dark:[&>option]:bg-surface dark:[&>option]:text-text-primary"
              >
                <option value="All">All</option>
                {APP_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {APP_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Min score */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted shrink-0">
                Min score
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => {
                  updateUrl({
                    minScore: e.target.value || undefined,
                    page: undefined,
                  });
                }}
                placeholder="0–100"
                className="flex-1 min-w-0 text-sm bg-surface-elevated border border-border-subtle rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-cyan"
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
          uploadPhase === "uploading"
            ? "border-cyan/40 bg-cyan/5 cursor-default pointer-events-none"
            : isDragActive
              ? "border-cyan bg-cyan-dim"
              : "border-border-subtle hover:border-border-hover hover:bg-surface-elevated/60",
        )}
      >
        <input {...getInputProps()} disabled={uploadPhase === "uploading"} />
        <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center mx-auto mb-4">
          <Upload
            className={cn(
              "w-5 h-5",
              isDragActive ? "text-cyan" : "text-text-muted",
            )}
          />
        </div>
        <p className="text-sm text-text-primary font-medium">
          {isDragActive
            ? "Drop HTML here"
            : "Drag & drop your saved LinkedIn HTML, or click to select"}
        </p>
        <p className="text-xs text-text-muted mt-1.5">
          Only .html files are supported. Max 100 MB.
        </p>
        {uploadPhase === "uploading" && chunkStatuses.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
              <span className="text-xs text-cyan">
                Uploading{" "}
                {chunkStatuses.length > 0
                  ? Math.round(
                      (chunkStatuses.filter((s) => s === "done").length /
                        chunkStatuses.length) *
                        100,
                    )
                  : 0}
                %…
              </span>
            </div>
            <div className="w-full max-w-xs mx-auto h-1.5 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan rounded-full transition-all duration-300"
                style={{
                  width: `${(chunkStatuses.filter((s) => s === "done").length / chunkStatuses.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chunk upload error with retry */}
      {uploadPhase === "error" && uploadError && (
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-rose">{uploadError}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {chunkStatuses.length > 0
                ? Math.round(
                    (chunkStatuses.filter((s) => s === "done").length /
                      chunkStatuses.length) *
                      100,
                  )
                : 0}
              % uploaded before error
            </p>
          </div>
          <button
            onClick={handleRetryFailed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose/10 text-rose border border-rose/20 hover:bg-rose/20 transition-all cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry failed
          </button>
        </div>
      )}

      {/* Processing progress */}
      {isProcessing && batch.data && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-cyan animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Analyzing posts with AI…
              </p>
              <p className="text-xs text-text-secondary">
                {batch.data.processed} of {batch.data.total} posts processed
              </p>
            </div>
            <span className="text-sm font-mono text-cyan">
              {batchProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan rounded-full transition-all duration-500"
              style={{ width: `${batchProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed summary */}
      {activeBatchId && batch.data?.status === "completed" && (
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald shrink-0" />
          <div className="text-sm flex-1">
            <span className="text-text-primary font-medium">
              Analysis complete
            </span>
            <span className="text-text-secondary">
              {" "}
              {batch.data.total} posts processed
            </span>
            {(batch.data.failed ?? 0) > 0 && (
              <span className="text-rose"> · {batch.data.failed} failed</span>
            )}
          </div>
          {(batch.data.failed ?? 0) > 0 && (
            <button
              onClick={() => retry.mutate(activeBatchId)}
              disabled={retry.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose/10 text-rose border border-rose/20 hover:bg-rose/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {retry.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              Retry {batch.data.failed} failed
            </button>
          )}
        </div>
      )}

      {/* Upload done (no batch) */}
      {uploadPhase === "done" && uploadResult && !activeBatchId && (
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald shrink-0" />
          <div className="text-sm">
            <span className="text-text-primary font-medium">
              {uploadResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Posts list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
          <div className="w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
          Loading posts…
        </div>
      ) : (
        <div className="space-y-3">
          {data?.posts.length === 0 && (
            <div className="text-center py-16 text-text-muted text-sm">
              {hasActiveFilters
                ? "No posts match your filters. Try clearing them."
                : "No LinkedIn posts yet. Upload a saved feed HTML to get started."}
            </div>
          )}

          {data?.posts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/linkedin-feed/${post.id}`)}
              className="glass-card rounded-xl overflow-hidden cursor-pointer hover:border-cyan/30 transition-colors"
            >
              <div className="p-4 sm:p-5 space-y-3">
                {/* Author + delete */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {post.authorName || "Unknown author"}
                    </p>
                    {post.authorHeadline && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {post.authorHeadline}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {post.appStatus && post.appStatus !== "not_applied" && (
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                          APP_STATUS_COLOR[
                            post.appStatus as keyof typeof APP_STATUS_COLOR
                          ] ?? "badge-slate",
                        )}
                      >
                        {
                          APP_STATUS_LABEL[
                            post.appStatus as keyof typeof APP_STATUS_LABEL
                          ]
                        }
                      </span>
                    )}
                    {post.isJob === false && post.aiAnalyzed && (
                      <Badge
                        variant="outline"
                        className="text-text-muted border-border-subtle"
                      >
                        Not programmer job
                      </Badge>
                    )}
                    <button
                      onClick={(e) =>
                        handleToggleNotInterested(
                          e,
                          post.id,
                          post.appStatus ?? null,
                        )
                      }
                      disabled={update.isPending}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer",
                        post.appStatus === "not_interested"
                          ? "text-text-muted bg-surface-elevated hover:text-text-primary"
                          : "text-text-muted hover:text-amber hover:bg-amber/10",
                      )}
                      title={
                        post.appStatus === "not_interested"
                          ? "Mark as not applied"
                          : "Not interested"
                      }
                    >
                      {post.appStatus === "not_interested" ? (
                        <RotateCcw className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePostId(post.id);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-rose hover:bg-rose-glow transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Keywords */}
                {post.matchedKeywords && post.matchedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.matchedKeywords.map((kw) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="text-cyan border-cyan/20 bg-cyan/5"
                      >
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed line-clamp-6">
                  {post.postContent}
                </div>

                {/* AI Analysis */}
                {post.aiAnalyzed && (
                  <div className="pt-3 border-t border-border-subtle space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Sparkles className="w-3.5 h-3.5 text-cyan" />
                      <ScoreBadge
                        score={post.score}
                        recommendation={post.recommendation}
                      />
                      {post.title && post.title !== "Unknown" && (
                        <Badge variant="outline">{post.title}</Badge>
                      )}
                      {post.company && post.company !== "Unknown" && (
                        <Badge variant="outline">{post.company}</Badge>
                      )}
                      {(post.applyUrl ||
                        extractUrls(post.postContent).length > 0) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cyan/10 text-cyan">
                          <LinkIcon className="w-3 h-3" />
                          Link
                        </span>
                      )}
                      {(post.contactEmail ||
                        extractEmails(post.postContent).length > 0) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cyan/10 text-cyan">
                          <Mail className="w-3 h-3" />
                          Email
                        </span>
                      )}
                    </div>
                    {post.summary && (
                      <p className="text-xs text-text-secondary">
                        {post.summary}
                      </p>
                    )}
                    {post.matchedSkills && post.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.matchedSkills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-emerald/10 text-emerald"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                disabled={page <= 1}
                onClick={() => updateUrl({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary font-mono">
                Page{" "}
                <span className="text-text-primary font-medium">{page}</span> of{" "}
                {Math.ceil(data.total / 20)}
              </span>
              <button
                className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                disabled={page >= Math.ceil(data.total / 20)}
                onClick={() => updateUrl({ page: String(page + 1) })}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
