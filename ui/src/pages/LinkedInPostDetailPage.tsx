import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateLinkedInPostQuestion,
  useDeleteLinkedInPost,
  useDeleteLinkedInPostQuestion,
  useGenerateLinkedInCoverLetter,
  useGenerateLinkedInEmail,
  useLinkedInPost,
  useLinkedInPostQuestions,
  useUpdateLinkedInPost,
  useUpdateLinkedInPostQuestion,
  useRecruiterContact,
} from "@/hooks/useLinkedInFeed";
import { extractEmails, extractUrls } from "@/lib/extractContact";
import { cn } from "@/lib/utils";
import type { AppStatus } from "@/shared/constants";
import {
  APP_STATUS,
  APP_STATUS_LABEL,
  RECOMMENDATION_COLOR,
} from "@/shared/constants";
import type { JobQuestion } from "@/types/data";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  Mail,
  MessageCircleQuestion,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

export function LinkedInPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const postId = Number(id);

  const { data: post, isLoading } = useLinkedInPost(postId);
  const updatePost = useUpdateLinkedInPost();
  const generateCoverLetter = useGenerateLinkedInCoverLetter();
  const { data: questionsData, isLoading: questionsLoading } =
    useLinkedInPostQuestions(postId);
  const createQuestion = useCreateLinkedInPostQuestion();
  const updateQuestion = useUpdateLinkedInPostQuestion();
  const deleteQuestion = useDeleteLinkedInPostQuestion();
  const deletePost = useDeleteLinkedInPost();

  const [notesDraft, setNotesDraft] = useState(post?.appNotes ?? "");
  const [newQuestion, setNewQuestion] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [creatingQuestionText, setCreatingQuestionText] = useState("");

  // Email generation state
  const generateEmail = useGenerateLinkedInEmail();
  const [emailSubject, setEmailSubject] = useState(post?.emailSubject ?? "");
  const [emailBody, setEmailBody] = useState(post?.emailBody ?? "");

  const emails = post?.contactEmail
    ? [post.contactEmail]
    : extractEmails(post?.postContent ?? "");
  const { data: recruiterContact } = useRecruiterContact(emails[0] ?? null);

  // Sync email from post data when it loads (e.g. after refresh)
  useEffect(() => {
    if (post && !generateEmail.isPending) {
      if (post.emailSubject && emailSubject !== post.emailSubject) {
        setEmailSubject(post.emailSubject);
      }
      if (post.emailBody && emailBody !== post.emailBody) {
        setEmailBody(post.emailBody);
      }
    }
  }, [post?.emailSubject, post?.emailBody]);

  // Sync notes draft when post loads
  if (post && notesDraft !== (post.appNotes ?? "") && !updatePost.isPending) {
    // Only update if not currently editing
  }

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setCreatingQuestionText(newQuestion.trim());
    createQuestion.mutate({ id: postId, question: newQuestion.trim() });
    setNewQuestion("");
    setShowAddForm(false);
  };

  const handleDeletePost = () => {
    if (confirm("Delete this LinkedIn post?")) {
      deletePost.mutate(postId, {
        onSuccess: () => navigate("/linkedin-feed"),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
        <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
        Loading post...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center h-64 text-rose gap-2">
        <AlertCircle className="w-5 h-5" />
        Post not found.
      </div>
    );
  }

  const score = post.score ?? 0;
  const questions = questionsData?.questions ?? [];

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
          LinkedIn Post
        </span>
      </div>

      {/* Author & Content */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            {post.authorName || "Unknown author"}
          </h1>
          {post.authorHeadline && (
            <p className="text-sm text-text-muted mt-0.5">
              {post.authorHeadline}
            </p>
          )}
        </div>

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

        <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
          {post.postContent}
        </div>

        {post.isJob === false && post.aiAnalyzed && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <AlertCircle className="w-4 h-4" />
            Not a programmer/tech job — filtered out
          </div>
        )}
      </div>

      {/* Application Tracking */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">
          Application Tracking
        </h3>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={post.appStatus ?? undefined}
              onChange={(e) => {
                const status = e.target.value as AppStatus;
                const appliedAt =
                  status === "applied" && !post.appliedAt
                    ? new Date().toISOString()
                    : post.appliedAt;
                updatePost.mutate({ id: postId, appStatus: status, appliedAt });
              }}
            >
              {APP_STATUS.map((s) => (
                <option key={s} value={s}>
                  {APP_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                if (notesDraft !== (post.appNotes ?? "")) {
                  updatePost.mutate({ id: postId, appNotes: notesDraft });
                }
              }}
              rows={3}
              placeholder="Add notes about this application…"
            />
          </Field>
          {post.appliedAt && (
            <p className="text-xs text-text-muted font-mono">
              Applied {new Date(post.appliedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Score & Recommendation */}
      {post.aiAnalyzed && post.isJob !== false && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-text-secondary">Match Score</span>
            {post.recommendation && (
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold",
                  RECOMMENDATION_COLOR[
                    post.recommendation as "Apply" | "Consider" | "Skip"
                  ],
                )}
              >
                {post.recommendation}
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
              {post.score ?? "—"}
            </span>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {post.summary && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-3">
            AI Summary
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {post.summary}
          </p>
        </div>
      )}

      {/* Apply Method — Link or Email */}
      {(() => {
        const urls = post.applyUrl
          ? [post.applyUrl]
          : extractUrls(post.postContent);
        const hasLinks = urls.length > 0;
        const hasEmails = emails.length > 0;

        if (!hasLinks && !hasEmails) return null;

        return (
          <div className="space-y-4">
            {hasLinks && (
              <div className="glass-card rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-cyan" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">
                    Apply Link
                  </h3>
                </div>
                <div className="space-y-2">
                  {urls.map((url) => (
                    <div key={url} className="flex items-center gap-3">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-sm text-cyan hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {url}
                      </a>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan text-white text-xs font-medium hover:bg-cyan/90 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasEmails && (
              <div className="glass-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-cyan" />
                    <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">
                      Apply via Email
                    </h3>
                  </div>
                  {emailSubject && (
                    <CopyButton
                      text={`Subject: ${emailSubject}\n\n${emailBody}`}
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">To:</span>
                    <span className="text-text-primary font-mono">
                      {emails[0]}
                    </span>
                  </div>

                  {!emailSubject && !generateEmail.isPending && (
                    <button
                      onClick={() => {
                        generateEmail.mutate(postId, {
                          onSuccess: (data) => {
                            setEmailSubject(data.subject);
                            setEmailBody(data.body);
                          },
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Email
                    </button>
                  )}

                  {generateEmail.isPending && (
                    <div className="flex items-center gap-2 text-sm text-cyan">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating email…
                    </div>
                  )}

                  {emailSubject && (() => {
                    const lastEmailedAt = recruiterContact?.lastEmailedAt
                      ? new Date(recruiterContact.lastEmailedAt)
                      : post.emailSentAt ? new Date(post.emailSentAt) : null;
                    const hoursSinceSent = lastEmailedAt ? (Date.now() - lastEmailedAt.getTime()) / (1000 * 60 * 60) : null;
                    const withinWindow = hoursSinceSent !== null && hoursSinceSent < 24;

                    const setReminder = (hoursFromSent: number) => {
                      const base = lastEmailedAt ?? new Date();
                      const reminderAt = new Date(base.getTime() + hoursFromSent * 60 * 60 * 1000).toISOString();
                      updatePost.mutate({ id: postId, reminderAt });
                    };

                    return (
                      <div className="space-y-3">
                        {withinWindow && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber/10 border border-amber/20 text-amber text-sm">
                            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                              You already emailed this recruiter {hoursSinceSent! < 1 ? "just now" : `${Math.round(hoursSinceSent!)} hour${Math.round(hoursSinceSent!) !== 1 ? "s" : ""} ago`}{recruiterContact && recruiterContact.emailCount > 1 ? ` (${recruiterContact.emailCount}× total)` : ""}. Sending again may look spammy.
                            </span>
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-text-muted mb-1 block">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full text-sm bg-surface-elevated border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-cyan"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted mb-1 block">
                            Body
                          </label>
                          <Textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            rows={10}
                            className="text-sm leading-relaxed resize-y"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={`mailto:${emails[0]}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePost.mutate({ id: postId, emailSentAt: new Date().toISOString() });
                            }}
                            target="_blank"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Open in Mail Client
                          </a>
                          <CopyButton text={emailBody} />
                        </div>

                        {/* Reminder */}
                        <div className="pt-2 border-t border-border-subtle space-y-2">
                          {post.reminderAt ? (
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <Bell className="w-3.5 h-3.5 text-cyan" />
                                Reminder set for{" "}
                                {new Date(post.reminderAt).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <button
                                onClick={() => updatePost.mutate({ id: postId, reminderAt: null })}
                                className="flex items-center gap-1 text-xs text-text-muted hover:text-rose transition-colors cursor-pointer"
                              >
                                <BellOff className="w-3.5 h-3.5" />
                                Clear
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-xs text-text-muted">Set a follow-up reminder:</p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setReminder(12)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-text-secondary hover:text-cyan hover:border-cyan transition-all cursor-pointer"
                                >
                                  <Bell className="w-3 h-3" />
                                  12 hours
                                </button>
                                <button
                                  onClick={() => setReminder(24)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-text-secondary hover:text-cyan hover:border-cyan transition-all cursor-pointer"
                                >
                                  <Bell className="w-3 h-3" />
                                  1 day
                                </button>
                                <button
                                  onClick={() => setReminder(25)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-text-secondary hover:text-cyan hover:border-cyan transition-all cursor-pointer"
                                >
                                  <Bell className="w-3 h-3" />
                                  After 1 day
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Skills */}
      {post.aiAnalyzed && post.isJob !== false && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-emerald mb-3">
              Matched Skills
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {post.matchedSkills?.map((s) => (
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
              {post.missingSkills?.map((s) => (
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
      )}

      {/* Cover Letter */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Cover Letter
          </h3>
          {post.coverLetter && <CopyButton text={post.coverLetter} />}
        </div>

        {post.coverLetter ? (
          <div className="relative">
            <Textarea
              value={post.coverLetter}
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
              onClick={() => generateCoverLetter.mutate(postId)}
              disabled={generateCoverLetter.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {generateCoverLetter.isPending ? (
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
                disabled={!newQuestion.trim() || createQuestion.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {createQuestion.isPending ? (
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
        ) : questions.length === 0 && !createQuestion.isPending ? (
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
            {createQuestion.isPending && (
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
                onUpdate={(id, data) =>
                  updateQuestion.mutate({ id: postId, questionId: id, ...data })
                }
                onDelete={(id) =>
                  deleteQuestion.mutate({ id: postId, questionId: id })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
        <button
          onClick={handleDeletePost}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-rose/30 text-sm text-rose hover:bg-rose-glow transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Post
        </button>
      </div>
    </div>
  );
}
