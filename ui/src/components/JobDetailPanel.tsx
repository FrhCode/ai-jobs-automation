import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { StatusToggle } from "@/components/StatusToggle";
import {
  APP_STATUS,
  APP_STATUS_LABEL,
  RECOMMENDATION_COLOR,
} from "@/shared/constants";
import { useSettings } from "@/hooks/useSettings";
import type { Job, JobQuestion } from "@/types/data";
import {
  ArrowLeft,
  Check,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  MessageCircleQuestion,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface JobDetailPanelProps {
  readonly job: Job;
  readonly onUpdate: (data: { appStatus?: string; appNotes?: string }) => void;
  readonly onReanalyze: () => void;
  readonly onGenerateCoverLetter?: () => void;
  readonly isGeneratingCoverLetter?: boolean;
  readonly questions?: JobQuestion[];
  readonly questionsLoading?: boolean;
  readonly onCreateQuestion?: (question: string) => void;
  readonly onUpdateQuestion?: (
    questionId: number,
    data: { question?: string; answer?: string },
  ) => void;
  readonly onDeleteQuestion?: (questionId: number) => void;
  readonly isCreatingQuestion?: boolean;
}

function scoreTextColor(score: number) {
  if (score >= 80) return "text-emerald";
  if (score >= 60) return "text-amber";
  return "text-rose";
}

function scoreBgColor(score: number) {
  if (score >= 80) return "bg-emerald";
  if (score >= 60) return "bg-amber";
  return "bg-rose";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-cyan transition-colors cursor-pointer"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DownloadButton({ text, filename }: { text: string; filename: string }) {
  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-cyan transition-colors cursor-pointer"
    >
      <Download className="w-3.5 h-3.5" />
      Download
    </button>
  );
}

function QuestionCard({
  q,
  onUpdate,
  onDelete,
}: {
  q: JobQuestion;
  onUpdate: (id: number, data: { question?: string; answer?: string }) => void;
  onDelete: (id: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftQuestion, setDraftQuestion] = useState(q.question);
  const [draftAnswer, setDraftAnswer] = useState(q.answer ?? "");

  const handleSave = () => {
    onUpdate(q.id, { question: draftQuestion, answer: draftAnswer });
    setIsEditing(false);
  };

  return (
    <div className="rounded-lg p-4 space-y-3 bg-surface-elevated/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Textarea
              value={draftQuestion}
              onChange={(e) => setDraftQuestion(e.target.value)}
              rows={2}
              className="text-sm font-medium resize-y"
            />
          ) : (
            <h4 className="text-sm font-semibold text-text-primary leading-relaxed">
              {q.question}
            </h4>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-1.5 rounded-md hover:bg-surface-elevated text-emerald transition-colors cursor-pointer"
                title="Save"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setDraftQuestion(q.question);
                  setDraftAnswer(q.answer ?? "");
                  setIsEditing(false);
                }}
                className="p-1.5 rounded-md hover:bg-surface-elevated text-text-muted transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-surface-elevated text-text-muted transition-colors cursor-pointer"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(q.id)}
                className="p-1.5 rounded-md hover:bg-surface-elevated text-rose transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={draftAnswer}
          onChange={(e) => setDraftAnswer(e.target.value)}
          rows={6}
          className="text-sm leading-relaxed resize-y"
          placeholder="Edit the answer..."
        />
      ) : q.answer ? (
        <div className="space-y-2">
          <Textarea
            value={q.answer}
            readOnly
            rows={6}
            className="text-sm leading-relaxed resize-y bg-transparent border-transparent focus-visible:ring-0 focus-visible:border-transparent"
          />
          <div className="flex justify-end">
            <CopyButton text={q.answer} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted italic">No answer yet.</p>
      )}
    </div>
  );
}

export function JobDetailPanel({
  job,
  onUpdate,
  onReanalyze,
  onGenerateCoverLetter,
  isGeneratingCoverLetter,
  questions = [],
  questionsLoading = false,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  isCreatingQuestion = false,
}: JobDetailPanelProps) {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const statusMode = settings?.ui_status_mode ?? "complete";
  const score = job.score ?? 0;
  const [notesDraft, setNotesDraft] = useState(job.appNotes ?? "");
  const [newQuestion, setNewQuestion] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [creatingQuestionText, setCreatingQuestionText] = useState("");

  const handleAddQuestion = () => {
    if (!newQuestion.trim() || !onCreateQuestion) return;
    setCreatingQuestionText(newQuestion.trim());
    onCreateQuestion(newQuestion.trim());
    setNewQuestion("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono uppercase tracking-widest text-text-muted">
          Job Details
        </span>
      </div>

      {/* Title Block */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading leading-tight">
          {job.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">{job.company}</span>
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-text-muted" />
              {job.location}
            </span>
          )}
          {job.salary && (
            <span className="flex items-center gap-1 text-emerald font-medium">
              <DollarSign className="w-3.5 h-3.5" />
              {job.salary}
            </span>
          )}
        </div>
      </div>

      {/* Application Tracking */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">
            Application Tracking
          </h3>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-cyan hover:underline"
          >
            View Original
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Status</FieldLabel>
            {statusMode === "simplified" ? (
              <StatusToggle
                status={job.appStatus}
                onChange={(status) => onUpdate({ appStatus: status })}
              />
            ) : (
              <Select
                value={job.appStatus ?? undefined}
                onChange={(e) => onUpdate({ appStatus: e.target.value })}
              >
                {APP_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {APP_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                if (notesDraft !== (job.appNotes ?? "")) {
                  onUpdate({ appNotes: notesDraft });
                }
              }}
              rows={3}
              placeholder="Add notes about this application…"
            />
          </Field>
          {job.appliedAt && (
            <p className="text-xs text-text-muted font-mono">
              Applied {new Date(job.appliedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Score & Recommendation */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-text-secondary">Match Score</span>
          {job.recommendation && (
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold",
                RECOMMENDATION_COLOR[
                  job.recommendation as "Apply" | "Consider" | "Skip"
                ],
              )}
            >
              {job.recommendation}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 score-bar">
            <div
              className={cn("score-bar-fill", scoreBgColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
          <span
            className={cn(
              "text-2xl sm:text-3xl font-bold font-heading tabular-nums",
              scoreTextColor(score),
            )}
          >
            {job.score ?? "—"}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      {job.summary && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-3">
            AI Summary
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {job.summary}
          </p>
        </div>
      )}

      {/* Skills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-emerald mb-3">
            Matched Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {job.matchedSkills?.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded text-xs font-mono badge-emerald"
              >
                {s}
              </span>
            )) ?? <span className="text-sm text-text-muted">None</span>}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-rose mb-3">
            Missing Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {job.missingSkills?.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded text-xs font-mono badge-rose"
              >
                {s}
              </span>
            )) ?? <span className="text-sm text-text-muted">None</span>}
          </div>
        </div>
      </div>

      {/* Cover Letter */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Cover Letter
          </h3>
          {job.coverLetter && (
            <div className="flex items-center gap-3">
              <CopyButton text={job.coverLetter} />
              <DownloadButton
                text={job.coverLetter}
                filename={`cover-letter-${(job.company ?? "unknown").replace(/\s+/g, "-").toLowerCase()}-${(job.title ?? "job").replace(/\s+/g, "-").toLowerCase()}.txt`}
              />
            </div>
          )}
        </div>

        {job.coverLetter ? (
          <div className="relative">
            <Textarea
              value={job.coverLetter}
              readOnly
              rows={12}
              className="text-sm leading-relaxed resize-y"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-text-secondary">No cover letter yet</p>
              <p className="text-xs text-text-muted">
                Generate one with AI based on your resume
              </p>
            </div>
            <button
              onClick={onGenerateCoverLetter}
              disabled={isGeneratingCoverLetter}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isGeneratingCoverLetter ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Cover Letter
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Application Questions */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted flex items-center gap-2">
            <MessageCircleQuestion className="w-3.5 h-3.5" />
            Application Questions
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs text-cyan hover:text-cyan/80 transition-colors cursor-pointer"
          >
            {showAddForm ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {showAddForm ? "Cancel" : "Add Question"}
          </button>
        </div>

        {showAddForm && (
          <div className="space-y-3">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              rows={4}
              placeholder="Paste the application question here..."
              className="text-sm resize-y"
            />
            <div className="flex justify-end">
              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.trim() || isCreatingQuestion}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isCreatingQuestion ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating answer...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Answer
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {questionsLoading ? (
          <div className="flex items-center justify-center py-8 gap-3 text-text-secondary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading questions...</span>
          </div>
        ) : questions.length === 0 && !isCreatingQuestion ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center">
              <MessageCircleQuestion className="w-4 h-4 text-text-muted" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-text-secondary">No questions yet</p>
              <p className="text-xs text-text-muted">
                Paste application questions to get AI-generated answers
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isCreatingQuestion && (
              <div className="rounded-lg p-4 space-y-3 bg-cyan/5 border border-cyan/15">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan" />
                  <span className="text-sm font-medium text-cyan">
                    Generating answer...
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {creatingQuestionText}
                </p>
              </div>
            )}
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                onUpdate={onUpdateQuestion ?? (() => {})}
                onDelete={onDeleteQuestion ?? (() => {})}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
        <button
          onClick={onReanalyze}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-cyan hover:border-cyan transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-analyze
        </button>
      </div>
    </div>
  );
}
