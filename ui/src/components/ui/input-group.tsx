import { cn } from '@/lib/utils';
import { forwardRef, type HTMLAttributes } from 'react';

/* ─── InputGroup ─────────────────────────────────────────── */

type InputGroupProps = HTMLAttributes<HTMLDivElement>;

const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative flex items-stretch', className)}
      {...props}
    />
  )
);
InputGroup.displayName = 'InputGroup';

/* ─── InputGroupAddon ────────────────────────────────────── */

interface InputGroupAddonProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'block-start' | 'block-end';
}

const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = 'end', ...props }, ref) => {
    const isBlock = align === 'block-start' || align === 'block-end';
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          isBlock
            ? 'absolute right-0 px-3'
            : 'px-3 border border-border-subtle bg-surface-elevated',
          align === 'start' && 'rounded-l-lg border-r-0',
          align === 'end' && 'rounded-r-lg border-l-0',
          align === 'block-start' && 'top-0 h-10',
          align === 'block-end' && 'bottom-0 h-10',
          className
        )}
        {...props}
      />
    );
  }
);
InputGroupAddon.displayName = 'InputGroupAddon';

/* ─── InputGroupText ─────────────────────────────────────── */

type InputGroupTextProps = HTMLAttributes<HTMLSpanElement>;

const InputGroupText = forwardRef<HTMLSpanElement, InputGroupTextProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('text-xs text-text-muted', className)}
      {...props}
    />
  )
);
InputGroupText.displayName = 'InputGroupText';

export {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
};
