import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { JobDetailPanel } from '@/components/JobDetailPanel';
import { qk } from '@/lib/queryKeys';
import {
  useJob,
  useUpdateJob,
  useReanalyzeJob,
  useGenerateCoverLetter,
  useCoverLetterStatus,
  useGenerateTailoredResume,
  useTailoredResumeStatus,
  useJobQuestions,
  useCreateJobQuestion,
  useUpdateJobQuestion,
  useDeleteJobQuestion,
} from '@/hooks/useJobs';
import type { AppStatus } from '@/shared/constants';
import { useEffect } from 'react';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { data: job, isLoading } = useJob(jobId);
  const updateJob = useUpdateJob();
  const reanalyze = useReanalyzeJob();
  const generateCoverLetter = useGenerateCoverLetter();
  const { data: coverLetterStatusData } = useCoverLetterStatus(jobId);
  const generateTailoredResume = useGenerateTailoredResume();
  const { data: statusData } = useTailoredResumeStatus(jobId);
  const { data: questions, isLoading: questionsLoading } = useJobQuestions(jobId);
  const qc = useQueryClient();

  useEffect(() => {
    if (statusData && statusData.status !== 'generating') {
      qc.invalidateQueries({ queryKey: qk.job(jobId) });
      qc.invalidateQueries({ queryKey: qk.jobs() });
    }
  }, [statusData, jobId, qc]);

  useEffect(() => {
    if (coverLetterStatusData && coverLetterStatusData.status === 'ready') {
      qc.invalidateQueries({ queryKey: qk.job(jobId) });
    }
  }, [coverLetterStatusData, jobId, qc]);

  const isGeneratingTailoredResume = generateTailoredResume.isPending || job?.tailoredResumeStatus === 'generating';
  const createQuestion = useCreateJobQuestion();
  const updateQuestion = useUpdateJobQuestion();
  const deleteQuestion = useDeleteJobQuestion();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
      <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      Loading job...
    </div>
  );
  if (!job) return (
    <div className="flex items-center justify-center h-64 text-rose gap-2">
      <span className="w-2 h-2 rounded-full bg-rose" />
      Job not found.
    </div>
  );

  return (
    <JobDetailPanel
      key={job.id}
      job={job}
      onUpdate={(data) => updateJob.mutate({ id: jobId, appStatus: data.appStatus as AppStatus, appNotes: data.appNotes })}
      onReanalyze={() => reanalyze.mutate({ id: jobId })}
      onGenerateCoverLetter={() => generateCoverLetter.mutate({ id: jobId })}
      coverLetterStatus={coverLetterStatusData?.status ?? job.coverLetterStatus ?? 'idle'}
      coverLetterError={coverLetterStatusData?.error ?? job.coverLetterError ?? null}
      onGenerateTailoredResume={() => generateTailoredResume.mutate({ id: jobId })}
      isGeneratingTailoredResume={isGeneratingTailoredResume}
      onDownloadTailoredResumePdf={() => {
        window.open(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/tailored-resume.pdf`, '_blank');
      }}
      questions={questions ?? []}
      questionsLoading={questionsLoading}
      onCreateQuestion={(question) => createQuestion.mutate({ id: jobId, question })}
      onUpdateQuestion={(questionId, data) => updateQuestion.mutate({ id: jobId, questionId, ...data })}
      onDeleteQuestion={(questionId) => deleteQuestion.mutate({ id: jobId, questionId })}
      isCreatingQuestion={createQuestion.isPending}
    />
  );
}
