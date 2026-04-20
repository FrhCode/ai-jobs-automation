import { useNavigate } from 'react-router-dom';
import { useLinkedInPostReminders, useUpdateLinkedInPost } from '@/hooks/useLinkedInFeed';
import { Bell, BellOff, ExternalLink, Loader2 } from 'lucide-react';

function formatReminderTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.round(diffMs / (1000 * 60 * 60));

  const absolute = d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffMs < 0) {
    const overH = Math.abs(diffH);
    return { label: `${overH}h overdue`, absolute, isDue: true };
  }
  if (diffH < 1) return { label: 'less than an hour', absolute, isDue: false };
  if (diffH < 24) return { label: `in ${diffH}h`, absolute, isDue: false };
  const days = Math.round(diffH / 24);
  return { label: `in ${days} day${days !== 1 ? 's' : ''}`, absolute, isDue: false };
}

export function RemindersPage() {
  const navigate = useNavigate();
  const { data: reminders, isLoading } = useLinkedInPostReminders();
  const updatePost = useUpdateLinkedInPost();

  const now = new Date();
  const due = reminders?.filter((r) => new Date(r.reminderAt!).getTime() <= now.getTime()) ?? [];
  const upcoming = reminders?.filter((r) => new Date(r.reminderAt!).getTime() > now.getTime()) ?? [];

  const dismiss = (id: number) => updatePost.mutate({ id, reminderAt: null });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-cyan" />
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Reminders</h1>
      </div>
      <p className="text-sm text-text-secondary -mt-4">
        Follow-up reminders for LinkedIn posts where you generated an email.
      </p>

      {isLoading && (
        <div className="flex items-center justify-center h-32 gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading reminders…
        </div>
      )}

      {!isLoading && reminders?.length === 0 && (
        <div className="text-center py-16 text-text-muted text-sm">
          No reminders set. Go to a LinkedIn post and generate an email to set one.
        </div>
      )}

      {due.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-rose">Due Now</h2>
          {due.map((r) => {
            const t = formatReminderTime(r.reminderAt!);
            return (
              <div key={r.id} className="glass-card rounded-xl p-4 flex items-center gap-4 border border-rose/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {r.authorName || 'Unknown'}
                    {r.company ? ` @ ${r.company}` : ''}
                  </p>
                  {r.title && <p className="text-xs text-text-muted mt-0.5 truncate">{r.title}</p>}
                  <p className="text-xs text-rose mt-1">{t.label} · {t.absolute}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/linkedin-feed/${r.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:text-cyan hover:border-cyan transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View post
                  </button>
                  <button
                    onClick={() => dismiss(r.id)}
                    disabled={updatePost.isPending}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-rose transition-colors cursor-pointer"
                    title="Dismiss reminder"
                  >
                    <BellOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted">Upcoming</h2>
          {upcoming.map((r) => {
            const t = formatReminderTime(r.reminderAt!);
            return (
              <div key={r.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {r.authorName || 'Unknown'}
                    {r.company ? ` @ ${r.company}` : ''}
                  </p>
                  {r.title && <p className="text-xs text-text-muted mt-0.5 truncate">{r.title}</p>}
                  <p className="text-xs text-text-muted mt-1">{t.label} · {t.absolute}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/linkedin-feed/${r.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:text-cyan hover:border-cyan transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View post
                  </button>
                  <button
                    onClick={() => dismiss(r.id)}
                    disabled={updatePost.isPending}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-rose transition-colors cursor-pointer"
                    title="Dismiss reminder"
                  >
                    <BellOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
