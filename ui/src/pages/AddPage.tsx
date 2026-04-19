import { AddUrlsForm } from '@/components/AddUrlsForm';
import { useEnqueueJobs } from '@/hooks/useJobs';
import { PlusCircle } from 'lucide-react';

export function AddPage() {
  const enqueue = useEnqueueJobs();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-cyan" />
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Add Job URLs</h1>
      </div>
      <p className="text-sm text-text-secondary -mt-4">
        Paste job posting URLs to scrape and analyze. One URL per line.
      </p>
      <AddUrlsForm onSubmit={(urls) => enqueue.mutate({ urls })} isPending={enqueue.isPending} />
    </div>
  );
}
