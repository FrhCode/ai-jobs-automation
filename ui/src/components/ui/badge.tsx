import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors',
        {
          'bg-surface-elevated text-text-primary border border-border-subtle': variant === 'default',
          'border border-border-subtle text-text-secondary': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
