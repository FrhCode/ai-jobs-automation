import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema } from '@/shared/schemas';
import type { LoginInput } from '@/shared/schemas';
import { useLogin } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Sparkles, Lock, ArrowRight, Briefcase, Star, Zap } from 'lucide-react';

const features = [
  { icon: Star, text: 'AI-scored job matches from 0–100' },
  { icon: Briefcase, text: 'Track applications across every stage' },
  { icon: Zap, text: 'Automated scraping on a schedule' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' },
  });

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand / editorial */}
      <div className="hidden lg:flex w-[46%] bg-[#4338CA] flex-col justify-between p-12 relative overflow-hidden">
        {/* subtle dot texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading text-xl font-semibold text-white">JobSearch AI</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8">
          <h2 className="font-heading text-4xl font-semibold text-white leading-snug">
            Your job search,<br />
            <em className="not-italic font-normal opacity-80">elevated by AI.</em>
          </h2>
          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85 text-sm">
                <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="relative z-10 text-white/40 text-xs font-mono">
          © 2025 JobSearch AI
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-bg px-6">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#4338CA] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading text-lg font-semibold text-text-primary">JobSearch AI</span>
          </div>

          <div className="mb-8">
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              Sign in to your job search dashboard.
            </p>
          </div>

          <form
            id="login-form"
            onSubmit={form.handleSubmit((data) => {
              login.mutate(data, { onSuccess: () => navigate('/jobs') });
            })}
            className="space-y-5"
          >
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-password" className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-text-muted" />
                    Password
                  </FieldLabel>
                  <Input
                    {...field}
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {login.isError && (
              <div className="text-sm text-rose bg-rose-glow border border-rose/15 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose shrink-0" />
                {(login.error as Error).message}
              </div>
            )}

            <button
              type="submit"
              form="login-form"
              disabled={login.isPending}
              className="w-full btn-primary py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {login.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-text-muted font-mono">
            Secure access only
          </p>
        </div>
      </div>
    </div>
  );
}
