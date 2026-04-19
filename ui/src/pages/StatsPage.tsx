import { StatsCards, ScoreHistogram, TopCompanies } from '@/components/StatsCards';
import { useStats } from '@/hooks/useStats';
import { useOpenRouterCredits } from '@/hooks/useOpenRouterCredits';
import { BarChart3 } from 'lucide-react';

export function StatsPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: credits, isLoading: creditsLoading } = useOpenRouterCredits();

  if (statsLoading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
      <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      Loading stats...
    </div>
  );
  if (!stats) return (
    <div className="flex items-center justify-center h-64 text-rose gap-2">
      <span className="w-2 h-2 rounded-full bg-rose" />
      Failed to load stats.
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-cyan" />
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Statistics</h1>
      </div>
      <p className="text-sm text-text-secondary -mt-4">
        Overview of your job search pipeline.
      </p>
      <StatsCards stats={stats} credits={credits} creditsLoading={creditsLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScoreHistogram histogram={stats.scoreHistogram} />
        <TopCompanies companies={stats.topCompanies} />
      </div>
    </div>
  );
}
