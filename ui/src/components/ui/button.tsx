import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-cyan text-black hover:shadow-lg hover:shadow-cyan-glow hover:-translate-y-0.5': variant === 'default',
            'border border-border-subtle bg-surface hover:bg-surface-elevated hover:border-border-hover text-text-primary': variant === 'outline',
            'hover:bg-surface-elevated text-text-secondary hover:text-text-primary': variant === 'ghost',
            'bg-rose text-white hover:bg-rose/90': variant === 'destructive',
            'bg-surface-elevated text-text-primary hover:bg-surface-elevated/80 border border-border-subtle': variant === 'secondary',
            'h-9 px-4 py-2 text-sm': size === 'default',
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-6 text-base': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
export { Button };
