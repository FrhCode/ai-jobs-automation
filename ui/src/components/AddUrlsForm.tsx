import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { enqueueSchema } from '@/shared/schemas';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldError, FieldDescription, FieldGroup } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupText } from '@/components/ui/input-group';
import { Link2, CheckCircle2, ArrowRight } from 'lucide-react';

const rawSchema = z.object({
  raw: z.string().min(1, 'Enter at least one URL'),
});

type RawFormData = z.infer<typeof rawSchema>;

interface AddUrlsFormProps {
  onSubmit: (urls: string[]) => void;
  isPending: boolean;
}

export function AddUrlsForm({ onSubmit, isPending }: AddUrlsFormProps) {
  const [result, setResult] = useState<{ enqueued: number; duplicates: number } | null>(null);
  const form = useForm<RawFormData>({
    resolver: zodResolver(rawSchema),
    defaultValues: { raw: '' },
  });

  return (
    <form
      id="add-urls-form"
      onSubmit={form.handleSubmit((data) => {
        const urls = data.raw.split('\n').map((l) => l.trim()).filter(Boolean);
        const parsed = enqueueSchema.safeParse({ urls });
        if (!parsed.success) {
          return;
        }
        onSubmit(urls);
        setResult({ enqueued: urls.length, duplicates: 0 });
        form.reset();
      })}
      className="space-y-4"
    >
      <FieldGroup>
        <Controller
          name="raw"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="add-urls-raw" className="flex items-center gap-1.5">
                <Link2 className="w-3 h-3" />
                Job URLs
              </FieldLabel>
              <InputGroup>
                <Textarea
                  {...field}
                  id="add-urls-raw"
                  placeholder="Paste one URL per line...&#10;https://linkedin.com/jobs/view/...&#10;https://jobstreet.co.id/job/..."
                  rows={8}
                  className="min-h-32 font-mono"
                  aria-invalid={fieldState.invalid}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupText className="tabular-nums">
                    {field.value.length} chars
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Paste one URL per line. Duplicate URLs will be skipped automatically.
              </FieldDescription>
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <button
        type="submit"
        form="add-urls-form"
        disabled={isPending}
        className="btn-primary px-6 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Enqueueing...
          </>
        ) : (
          <>
            Add to Queue
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {result && (
        <div className="flex items-center gap-2 text-sm text-emerald bg-emerald-glow border border-emerald/20 px-4 py-3 rounded-lg animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4" />
          Enqueued {result.enqueued} URL{result.enqueued !== 1 ? 's' : ''}
          {result.duplicates > 0 && ` (${result.duplicates} duplicates skipped)`}
        </div>
      )}
    </form>
  );
}
