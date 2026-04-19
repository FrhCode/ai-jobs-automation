import { cn } from '@/lib/utils';
import { forwardRef, type HTMLAttributes, type LabelHTMLAttributes } from 'react';

/* ─── FieldGroup ─────────────────────────────────────────── */

type FieldGroupProps = HTMLAttributes<HTMLDivElement>;

const FieldGroup = forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-5', className)} {...props} />
  )
);
FieldGroup.displayName = 'FieldGroup';

/* ─── Field ──────────────────────────────────────────────── */

interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

const Field = forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn(
        'group/field',
        orientation === 'horizontal'
          ? 'flex items-center gap-3'
          : 'flex flex-col gap-1.5',
        className
      )}
      {...props}
    />
  )
);
Field.displayName = 'Field';

/* ─── FieldLabel ─────────────────────────────────────────── */

type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement>;

const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium text-text-primary',
        className
      )}
      {...props}
    />
  )
);
FieldLabel.displayName = 'FieldLabel';

/* ─── FieldDescription ───────────────────────────────────── */

type FieldDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

const FieldDescription = forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs text-text-muted', className)}
      {...props}
    />
  )
);
FieldDescription.displayName = 'FieldDescription';

/* ─── FieldError ─────────────────────────────────────────── */

interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  errors?: Array<{ message?: string } | undefined>;
}

const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, errors, ...props }, ref) => {
    const messages = errors?.filter(Boolean).map((e) => e?.message).filter(Boolean);
    if (!messages?.length) return null;

    return (
      <p
        ref={ref}
        role="alert"
        className={cn('text-xs text-rose flex items-center gap-1.5', className)}
        {...props}
      >
        <span className="w-1 h-1 rounded-full bg-rose shrink-0" />
        {messages.join(', ')}
      </p>
    );
  }
);
FieldError.displayName = 'FieldError';

export {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
};
