import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ResumeUpload } from '@/components/ResumeUpload';
import { SectionNavigator } from '@/components/SectionNavigator';
import { KeywordCloud } from '@/components/KeywordCloud';
import { ResumeChatPanel } from '@/components/ResumeChatPanel';
import { WeakSpotView } from '@/components/WeakSpotView';
import {
  useResume,
  useUploadResume,
  useDeleteResume,
  useUpdateResumeText,
} from '@/hooks/useResume';
import { useSettings } from '@/hooks/useSettings';
import { analyzeResume } from '@/api';
import type { WeakSpot } from '@/api';
import {
  AlertCircle,
  Bot,
  Download,
  Edit3,
  FileText,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';

export function ResumePage() {
  const { data: resume, isLoading } = useResume();
  const upload = useUploadResume();
  const del = useDeleteResume();
  const update = useUpdateResumeText();
  const { data: settings } = useSettings();
  const maxFileSizeMb = settings?.max_resume_file_size_mb
    ? parseInt(settings.max_resume_file_size_mb, 10)
    : 10;

  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (resume) setEditedText(resume.extractedText);
  }, [resume?.extractedText]);

  useEffect(() => {
    if (isEditing && textareaRef.current) textareaRef.current.focus();
  }, [isEditing]);

  // Proactive weak spot analysis on resume load
  useEffect(() => {
    if (!resume?.extractedText) return;
    setWeakSpots([]);
    setIsAnalyzing(true);
    analyzeResume()
      .then((res) => setWeakSpots(res.weakSpots ?? []))
      .catch(() => setWeakSpots([]))
      .finally(() => setIsAnalyzing(false));
  }, [resume?.extractedText]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await update.mutateAsync(editedText);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const isModified = resume ? editedText !== resume.extractedText : false;

  const handleSectionClick = (section: string) => {
    setIsCoachOpen(true);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('resume-chat-prefill', {
          detail: `Look at my ${section} section. What's weak about it? What specific questions do you have before we improve it?`,
        })
      );
    }, 150);
  };

  const handleWeakSpotClick = (spot: WeakSpot) => {
    setIsCoachOpen(true);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('resume-chat-prefill', {
          detail: `I was told this part of my resume has an issue:\n"${spot.snippet}"\n\nIssue flagged: ${spot.issue}\n\nBe honest — how bad is it? What questions do you need answered before we fix it?`,
        })
      );
    }, 150);
  };

  const handleDownloadPDF = () => window.print();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
        <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
        Loading resume…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan" />
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Resume</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {resume && (
            <>
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan text-white text-sm font-medium hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditedText(resume?.extractedText ?? '');
                      setIsEditing(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all cursor-pointer',
                    isModified
                      ? 'border-cyan text-cyan bg-cyan-dim hover:bg-cyan hover:text-white'
                      : 'border-border-subtle text-text-secondary hover:text-cyan hover:border-cyan hover:bg-cyan-dim'
                  )}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isModified ? 'Edit Resume (unsaved)' : 'Edit Resume'}
                </button>
              )}
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-cyan hover:border-cyan hover:bg-cyan-dim transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-cyan hover:border-cyan hover:bg-cyan-dim transition-all cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" />
                Re-analyze All Jobs
              </button>
              <button
                onClick={() => setIsCoachOpen((v) => !v)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer',
                  isCoachOpen
                    ? 'bg-cyan text-white border-cyan hover:bg-cyan/90'
                    : 'border-border-subtle text-text-secondary hover:text-cyan hover:border-cyan hover:bg-cyan-dim'
                )}
              >
                <Bot className="w-3.5 h-3.5" />
                {isCoachOpen ? 'Close Coach' : 'AI Coach'}
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-text-secondary -mt-2 sm:-mt-4">
        Upload your resume PDF. It will be used to score and analyze job matches.
      </p>

      <ResumeUpload
        resume={resume}
        onUpload={(file) => upload.mutate(file)}
        onDelete={() => del.mutate()}
        isUploading={upload.isPending}
        maxFileSizeMb={maxFileSizeMb}
      />

      {resume && (
        <div className="space-y-5">
          {/* Print-only resume text */}
          <div id="resume-print" className="hidden">
            <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{editedText}</div>
          </div>

          {/* Navigator + Keywords row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionNavigator resumeText={editedText} onSectionClick={handleSectionClick} />
            <KeywordCloud resumeText={editedText} />
          </div>

          {/* Resume panel */}
          <div
            id="resume-text-preview"
            className="glass-card rounded-xl overflow-hidden flex flex-col"
            style={{ minHeight: '32rem' }}
          >
            <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface/50">
              <h3 className="text-sm font-semibold text-text-primary">
                {isEditing ? 'Editing Resume' : 'Resume Text'}
              </h3>
              <div className="flex items-center gap-3">
                {isAnalyzing && !isEditing && (
                  <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <div className="w-3 h-3 border border-cyan border-t-transparent rounded-full animate-spin" />
                    Analyzing… (~2 min)
                  </span>
                )}
                {!isAnalyzing && weakSpots.length > 0 && !isEditing && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber bg-amber-glow px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    {weakSpots.length} issue{weakSpots.length !== 1 ? 's' : ''} found
                  </span>
                )}
                {isModified && !isEditing && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber bg-amber-glow px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    Unsaved changes
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 p-5 min-h-0">
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full h-full min-h-112 rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm text-text-primary font-mono leading-relaxed resize-y focus-visible:outline-none focus-visible:border-cyan focus-visible:ring-1 focus-visible:ring-cyan"
                />
              ) : (
                <div className="bg-surface-elevated rounded-lg p-4 h-full min-h-112 overflow-y-auto border border-border-subtle">
                  <WeakSpotView
                    text={editedText}
                    weakSpots={weakSpots}
                    onSpotClick={handleWeakSpotClick}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Coach panel — full width below resume, shown when open */}
          {isCoachOpen && (
            <ResumeChatPanel
              resumeText={editedText}
              onApplyText={(text) => {
                setEditedText(text.trim());
                document.getElementById('resume-text-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
