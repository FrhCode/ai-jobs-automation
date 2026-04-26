import { useParams } from 'react-router-dom';
import { JobDetailPanel } from '@/components/JobDetailPanel';
import {
  useJob,
  useUpdateJob,
  useReanalyzeJob,
  useGenerateCoverLetter,
  useGenerateTailoredResume,
  useJobQuestions,
  useCreateJobQuestion,
  useUpdateJobQuestion,
  useDeleteJobQuestion,
} from '@/hooks/useJobs';
import type { AppStatus } from '@/shared/constants';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { data: job, isLoading } = useJob(jobId);
  const updateJob = useUpdateJob();
  const reanalyze = useReanalyzeJob();
  const generateCoverLetter = useGenerateCoverLetter();
  const generateTailoredResume = useGenerateTailoredResume();
  const { data: questions, isLoading: questionsLoading } = useJobQuestions(jobId);
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
      isGeneratingCoverLetter={generateCoverLetter.isPending}
      onGenerateTailoredResume={() => generateTailoredResume.mutate({ id: jobId })}
      isGeneratingTailoredResume={generateTailoredResume.isPending}
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
