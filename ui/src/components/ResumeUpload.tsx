import { cn } from "@/lib/utils";
import { FileCheck, Trash2, Upload } from "lucide-react";

import { useDropzone } from "react-dropzone";

interface ResumeUploadProps {
  readonly resume:
    | { filename: string; extractedText: string; uploadedAt: string }
    | null
    | undefined;
  readonly onUpload: (file: File) => void;
  readonly onDelete: () => void;
  readonly isUploading: boolean;
}

export function ResumeUpload({
  resume,
  onUpload,
  onDelete,
  isUploading,
}: ResumeUploadProps) {
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles[0]) onUpload(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-cyan bg-cyan-dim"
            : "border-border-subtle hover:border-border-hover hover:bg-surface-elevated/60",
        )}
      >
        <input {...getInputProps()} />
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
            ? "Drop PDF here"
            : "Drag & drop your resume PDF, or click to select"}
        </p>
        <p className="text-xs text-text-muted mt-1.5">
          Only PDF files are supported
        </p>
        {isUploading && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-4 h-4 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
            <span className="text-xs text-cyan">Uploading…</span>
          </div>
        )}
      </div>

      {resume && (
        <div className="glass-card rounded-xl overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-glow border border-emerald/20 flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4 text-emerald" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {resume.filename}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-rose hover:bg-rose-glow transition-all cursor-pointer"
              title="Delete resume"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <div className="bg-surface-elevated rounded-lg p-4 text-xs text-text-secondary whitespace-pre-wrap max-h-96 overflow-y-auto font-mono leading-relaxed border border-border-subtle">
              {resume.extractedText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
