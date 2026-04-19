import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ExternalLink, MapPin, DollarSign, FileText, Copy, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import type { Job } from '@/types/data';
import { APP_STATUS, APP_STATUS_LABEL, RECOMMENDATION_COLOR } from '@/shared/constants';

interface JobDetailPanelProps {
  readonly job: Job;
  readonly onUpdate: (data: { appStatus?: string; appNotes?: string }) => void;
  readonly onReanalyze: () => void;
  readonly onGenerateCoverLetter?: () => void;
  readonly isGeneratingCoverLetter?: boolean;
}

function scoreTextColor(score: number) {
  if (score >= 80) return 'text-emerald';
  if (score >= 60) return 'text-amber';
  return 'text-rose';
}

function scoreBgColor(score: number) {
  if (score >= 80) return 'bg-emerald';
  if (score >= 60) return 'bg-amber';
  return 'bg-rose';
}

export function JobDetailPanel({ job, onUpdate, onReanalyze, onGenerateCoverLetter, isGeneratingCoverLetter }: JobDetailPanelProps) {
  const navigate = useNavigate();
  const score = job.score ?? 0;
  const [notesDraft, setNotesDraft] = useState(job.appNotes ?? '');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!job.coverLetter) return;
    await navigator.clipboard.writeText(job.coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/jobs')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono uppercase tracking-widest text-text-muted">Job Details</span>
      </div>

      {/* Title Block */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary font-heading leading-tight">
          {job.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
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

      {/* Score & Recommendation */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-text-secondary">Match Score</span>
          {job.recommendation && (
            <span className={cn('inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold', RECOMMENDATION_COLOR[job.recommendation as 'Apply' | 'Consider' | 'Skip'])}>
              {job.recommendation}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 score-bar">
            <div
              className={cn('score-bar-fill', scoreBgColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className={cn('text-3xl font-bold font-heading tabular-nums', scoreTextColor(score))}>
            {job.score ?? '—'}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      {job.summary && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-3">
            AI Summary
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">{job.summary}</p>
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
              <span key={s} className="px-2 py-0.5 rounded text-xs font-mono badge-emerald">
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
              <span key={s} className="px-2 py-0.5 rounded text-xs font-mono badge-rose">
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
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-cyan transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
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
              <p className="text-xs text-text-muted">Generate one with AI based on your resume</p>
            </div>
            <button
              onClick={onGenerateCoverLetter}
              disabled={isGeneratingCoverLetter}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

      {/* Application Tracking */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">
          Application Tracking
        </h3>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={job.appStatus ?? undefined}
              onChange={(e) => onUpdate({ appStatus: e.target.value })}
            >
              {APP_STATUS.map((s) => (
                <option key={s} value={s}>{APP_STATUS_LABEL[s]}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                if (notesDraft !== (job.appNotes ?? '')) {
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

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onReanalyze}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-cyan hover:border-cyan transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-analyze
        </button>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-cyan hover:underline"
        >
          View Original
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
