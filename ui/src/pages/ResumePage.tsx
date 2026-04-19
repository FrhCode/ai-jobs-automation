import { ResumeUpload } from '@/components/ResumeUpload';
import { useResume, useUploadResume, useDeleteResume } from '@/hooks/useResume';
import { FileText, RefreshCw } from 'lucide-react';

export function ResumePage() {
  const { data: resume, isLoading } = useResume();
  const upload = useUploadResume();
  const del = useDeleteResume();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
      <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      Loading resume...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan" />
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Resume</h1>
        </div>
        {resume && (
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-cyan hover:border-cyan hover:bg-cyan-dim transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Re-analyze All Jobs
          </button>
        )}
      </div>
      <p className="text-sm text-text-secondary -mt-4">
        Upload your resume PDF. It will be used to score and analyze job matches.
      </p>
      <ResumeUpload
        resume={resume}
        onUpload={(file) => upload.mutate(file)}
        onDelete={() => del.mutate()}
        isUploading={upload.isPending}
      />
    </div>
  );
}
