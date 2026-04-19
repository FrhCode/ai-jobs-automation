import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  PlusCircle,
  ListOrdered,
  FileText,
  Settings,
  BarChart3,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/useAuth';

const navItems = [
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/add', label: 'Add URLs', icon: PlusCircle },
  { path: '/queue', label: 'Queue', icon: ListOrdered },
  { path: '/resume', label: 'Resume', icon: FileText },
  { path: '/stats', label: 'Stats', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: { readonly children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="w-60 bg-surface border-r border-border-subtle flex flex-col fixed h-screen z-40">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-border-subtle">
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
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
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
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-border-subtle">
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-rose hover:bg-rose-glow transition-all"
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
