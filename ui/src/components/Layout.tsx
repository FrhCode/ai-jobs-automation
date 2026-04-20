import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  PlusCircle,
  ListOrdered,
  FileText,
  Settings,
  BarChart3,
  LogOut,
  Sparkles,
  Menu,
  X,
  Sun,
  Moon,
  Rss,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLinkedInPostReminders } from '@/hooks/useLinkedInFeed';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/jobs', label: 'Jobs', icon: Briefcase, defaultSearch: 'appStatus=not_applied&sort=score&dir=desc&page=1&limit=50' },
  { path: '/add', label: 'Add URLs', icon: PlusCircle },
  { path: '/queue', label: 'Queue', icon: ListOrdered },
  { path: '/resume', label: 'Resume', icon: FileText },
  { path: '/linkedin-feed', label: 'LinkedIn Feed', icon: Rss, defaultSearch: 'status=not_applied' },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/stats', label: 'Stats', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: { readonly children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeCooldown, setThemeCooldown] = useState(false);
  const { data: reminders } = useLinkedInPostReminders();
  const dueCount = reminders?.filter((r) => r.reminderAt && new Date(r.reminderAt).getTime() <= Date.now()).length ?? 0;

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border-subtle flex items-center justify-between px-4 z-30 lg:hidden">
        <Link to="/jobs" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-heading text-[15px] font-semibold text-text-primary leading-none tracking-tight">
            JobSearch
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'w-60 bg-surface border-r border-border-subtle flex flex-col fixed h-screen z-50 transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-border-subtle flex items-center justify-between">
          <Link to="/jobs" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-cyan flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-[17px] font-semibold text-text-primary leading-none tracking-tight">
                JobSearch
              </h1>
              <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase mt-0.5">
                AI Powered
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            const to = item.defaultSearch ? `${item.path}?${item.defaultSearch}` : item.path;
            const badge = item.path === '/reminders' && dueCount > 0 ? dueCount : 0;
            return (
              <Link
                key={item.path}
                to={to}
                className={cn(
                  'nav-item flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'active text-cyan'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    active ? 'text-cyan' : 'text-text-muted'
                  )}
                />
                {item.label}
                {badge > 0 && (
                  <span className="ml-auto min-w-4.5 h-4.5 rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-border-subtle space-y-1">
          <button
            disabled={themeCooldown}
            onClick={() => {
              setThemeCooldown(true);
              toggleTheme();
              setTimeout(() => setThemeCooldown(false), 400);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 shrink-0" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 shrink-0" />
                Dark Mode
              </>
            )}
          </button>
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-rose hover:bg-rose-glow transition-all cursor-pointer"
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 min-h-screen pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
