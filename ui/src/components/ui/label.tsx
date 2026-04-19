import { cn } from '@/lib/utils';
import { forwardRef, type LabelHTMLAttributes } from 'react';

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-xs text-text-muted uppercase tracking-wider font-mono', className)}
      {...props}
    />
  )
);
Label.displayName = 'Label';
export { Label };
