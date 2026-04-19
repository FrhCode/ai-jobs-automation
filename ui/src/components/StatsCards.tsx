import { Briefcase, CheckCircle2, AlertCircle, XCircle, Star, TrendingUp, Building2, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatsData, OpenRouterCredits } from '@/types/data';

interface StatsCardsProps {
  readonly stats: StatsData;
  readonly credits?: OpenRouterCredits;
  readonly creditsLoading?: boolean;
}

function scoreBarColor(count: number, max: number): string {
  const pct = count / max;
  if (pct >= 0.6) return 'bg-cyan';
  if (pct >= 0.3) return 'bg-cyan/60';
  return 'bg-cyan/35';
}

export function StatsCards({ stats, credits, creditsLoading }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Jobs',
      value: stats.total,
      icon: Briefcase,
      valueClass: 'text-text-primary',
      iconBg: 'bg-surface-elevated',
      iconColor: 'text-text-secondary',
    },
    {
      title: 'Apply',
      value: stats.byRecommendation.Apply ?? 0,
      icon: CheckCircle2,
      valueClass: 'text-emerald',
      iconBg: 'bg-emerald-glow',
      iconColor: 'text-emerald',
    },
    {
      title: 'Consider',
      value: stats.byRecommendation.Consider ?? 0,
      icon: AlertCircle,
      valueClass: 'text-amber',
      iconBg: 'bg-amber-glow',
      iconColor: 'text-amber',
    },
    {
      title: 'Skip',
      value: stats.byRecommendation.Skip ?? 0,
      icon: XCircle,
      valueClass: 'text-text-secondary',
      iconBg: 'bg-surface-elevated',
      iconColor: 'text-text-muted',
    },
    {
      title: 'Avg Score',
      value: stats.avgScore,
      icon: Star,
      valueClass: 'text-cyan',
      iconBg: 'bg-cyan-dim',
      iconColor: 'text-cyan',
      suffix: '/100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="glass-card rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-text-muted uppercase tracking-wider font-mono">{card.title}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border border-border-subtle', card.iconBg)}>
                <Icon className={cn('w-4 h-4', card.iconColor)} />
              </div>
            </div>
            <div className={cn('text-3xl font-bold font-heading tabular-nums', card.valueClass)}>
              {card.value}
              {card.suffix && <span className="text-base text-text-muted font-body ml-1">{card.suffix}</span>}
            </div>
          </div>
        );
      })}
      <div
        className="glass-card rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-text-muted uppercase tracking-wider font-mono">OpenRouter Credits</span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-border-subtle bg-cyan-dim">
            <CreditCard className="w-4 h-4 text-cyan" />
          </div>
        </div>
        {creditsLoading ? (
          <div className="text-3xl font-bold font-heading tabular-nums text-text-primary">—</div>
        ) : !credits || credits.error ? (
          <div className="text-lg font-semibold text-text-secondary">{credits?.error || 'Unavailable'}</div>
        ) : (
          <>
            <div className="text-3xl font-bold font-heading tabular-nums text-cyan">
              ${credits.remaining.toFixed(2)}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
              <span>Total: ${credits.totalCredits.toFixed(2)}</span>
              <span className="w-1 h-1 rounded-full bg-border-subtle" />
              <span>Used: ${credits.totalUsage.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ScoreHistogram({ histogram }: { readonly histogram: StatsData['scoreHistogram'] }) {
  const max = Math.max(...histogram.map((h) => h.count), 1);
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Score Distribution</h3>
      </div>
      <div className="p-5 space-y-2.5">
        {histogram.map((h) => (
          <div key={h.bucket} className="flex items-center gap-3">
            <span className="text-xs text-text-muted font-mono w-10 shrink-0">{h.bucket}</span>
            <div className="flex-1 h-5 bg-surface-elevated rounded overflow-hidden border border-border-subtle/60">
              <div
                className={cn('h-full rounded transition-all duration-500', scoreBarColor(h.count, max))}
                style={{ width: `${(h.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium text-text-secondary w-5 text-right shrink-0">
              {h.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopCompanies({ companies }: { readonly companies: StatsData['topCompanies'] }) {
  const maxCount = Math.max(...companies.map((c) => c.count), 1);
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
        <Building2 className="w-4 h-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Top Companies</h3>
      </div>
      <div className="p-3 space-y-1">
        {companies.map((c, i) => (
          <div
            key={c.company}
            className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <span className="text-xs text-text-muted font-mono w-4 shrink-0">{i + 1}</span>
            <span className="flex-1 text-sm text-text-primary">{c.company}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan/50 rounded-full"
                  style={{ width: `${(c.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-text-secondary w-4 text-right">{c.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

