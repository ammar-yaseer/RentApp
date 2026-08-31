// AppShell — main layout with sidebar, header, and mobile nav.
// Uses Supabase Auth for the current user (no more localStorage user switching).
import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, MoreHorizontal, Car, ChevronLeft, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
import { MOBILE_PRIMARY, type NavItem } from './nav';
import { useStore } from '../data/store';
import { useAuth } from '../lib/auth';
import { useCurrentUser } from '../lib/hooks';
import { visibleNavItems, canView, hasAnyAccess } from '../lib/permissions';
import { cn, formatDateTime } from '../lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { db } = useStore();
  const currentUser = useCurrentUser();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = useMemo(() => visibleNavItems(currentUser), [currentUser]);
  const groups: NavItem['group'][] = ['Operations', 'Finance', 'Partnership', 'System'];

  const unread = canView(currentUser, 'notifications')
    ? db.notifications.filter((n) => !n.read && n.status !== 'Pending').length
    : 0;
  const current = navItems.find((n) => n.path === location.pathname)
    ?? navItems.find((n) => location.pathname.startsWith(n.path) && n.path !== '/');

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
    setMoreOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-dvh flex">
      {/* Desktop sidebar — collapsible */}
      <aside className={cn(
        'hidden lg:flex flex-col shrink-0 border-r border-slate-200 bg-white h-dvh sticky top-0 overflow-hidden transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}>
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600 hover:border-brand-300 transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <SidebarContent items={navItems} groups={groups} currentPath={location.pathname} collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile drawer sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-72 bg-white flex flex-col animate-slide-up overflow-hidden h-dvh">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
              <Brand logoUrl={db.settings.logoUrl} />
              <button className="btn-ghost !p-2" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
            </div>
            <SidebarContent items={navItems} groups={groups} currentPath={location.pathname} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar — fixed on mobile, sticky on desktop */}
        <header className="fixed top-0 inset-x-0 lg:sticky lg:top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 pt-safe shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-14 max-w-7xl mx-auto">
            <button className="lg:hidden btn-ghost !p-2 -ml-1" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div className="lg:hidden min-w-0">
              <Brand small logoUrl={db.settings.logoUrl} />
            </div>
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-slate-900">{current?.label ?? 'Dashboard'}</h2>
              <p className="text-xs text-slate-500">{formatDateTime(new Date().toISOString())}</p>
            </div>
            <div className="flex-1 min-w-0" />
            {canView(currentUser, 'notifications') && (
              <NavLink to="/notifications" className="relative btn-ghost !p-2 shrink-0">
                <Bell size={20} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </NavLink>
            )}
            {/* Current user + switcher */}
            <div className="relative flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 shrink-0">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg hover:bg-slate-50 p-1 -m-1 transition-colors"
                aria-label="User menu"
              >
                {db.settings.logoUrl ? (
                  <img src={db.settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
                    {(currentUser?.name ?? 'AD').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block leading-tight text-left min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{currentUser?.name ?? 'Admin'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{currentUser?.role ?? 'Super Admin'}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-20 w-56 max-w-[calc(100vw-1rem)] bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">{currentUser?.name ?? 'Admin'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{currentUser?.email ?? ''}</p>
                    </div>
                    {canView(currentUser, 'settings') && (
                      <NavLink to="/settings" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-xs text-brand-600 hover:bg-brand-50 border-t border-slate-100">
                        Manage users in Settings
                      </NavLink>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 border-t border-slate-100"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Spacer for fixed header on mobile */}
        <div className="lg:hidden h-14 pt-safe shrink-0" />

        {/* Page content */}
        <main className="flex-1 px-3 sm:px-4 py-4 sm:py-5 pb-32 lg:pb-8 max-w-7xl w-full mx-auto min-w-0">
          {hasAnyAccess(currentUser) ? children : <NoAccess />}
        </main>

        {/* Mobile bottom nav — fixed */}
        {navItems.length > 0 && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex items-stretch max-w-md mx-auto">
              {MOBILE_PRIMARY.map((key) => {
                if (key === 'more') {
                  const extraCount = navItems.filter((n) => !MOBILE_PRIMARY.includes(n.key)).length;
                  if (extraCount === 0) return null;
                  return (
                    <button
                      key="more"
                      onClick={() => setMoreOpen(true)}
                      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-slate-500 active:text-brand-700 min-w-0"
                    >
                      <MoreHorizontal size={20} />
                      <span className="text-[10px] font-medium">More</span>
                    </button>
                  );
                }
                const item = navItems.find((n) => n.key === key);
                if (!item) return null;
                const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={key}
                    to={item.path}
                    className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0', active ? 'text-brand-700' : 'text-slate-500')}
                  >
                    {item.icon}
                    <span className="text-[10px] font-medium truncate">{item.shortLabel}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* More sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl animate-slide-up pb-safe">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold">All modules</h3>
              <button className="btn-ghost !p-2" onClick={() => setMoreOpen(false)}><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-3 gap-2 max-h-[70dvh] overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg text-center',
                    location.pathname === item.path ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {item.icon}
                  <span className="text-[11px] font-medium leading-tight">{item.shortLabel}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <LockIcon />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">No modules assigned</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Your account doesn't have access to any modules yet. Ask an administrator to assign
        module permissions from <span className="font-medium">Settings &rarr; User Accounts</span>.
      </p>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SidebarContent({ items, groups, currentPath, onNavigate, collapsed }: { items: NavItem[]; groups: NavItem['group'][]; currentPath: string; onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 min-h-0">
      <div className={cn('px-2 mb-4', collapsed && 'px-0')}>
        <Brand logoUrl={undefined} collapsed={collapsed} />
      </div>
      {groups.map((g) => {
        const itemsInGroup = items.filter((n) => n.group === g);
        if (itemsInGroup.length === 0) return null;
        return (
        <div key={g} className="mb-4">
          {!collapsed && <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>}
          <div className="space-y-0.5">
            {itemsInGroup.map((item) => {
              const active = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <NavLink
                  key={item.key}
                  to={item.path}
                  onClick={onNavigate}
                  className={cn('nav-link', active && 'nav-link-active', collapsed && 'justify-center px-2')}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

function Brand({ small, logoUrl, collapsed }: { small?: boolean; logoUrl?: string; collapsed?: boolean }) {
  // NOTE: When migrating to Supabase, logo will be stored in Supabase Storage bucket.
  // For now, logoUrl is a base64 data URL stored in localStorage settings.
  if (collapsed) {
    return (
      <div className="flex items-center justify-center">
        {logoUrl ? (
          <img src={logoUrl} alt="RentFlow" className="w-8 h-8 rounded-lg object-contain" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
            <Car size={18} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        <img src={logoUrl} alt="RentFlow" className="w-8 h-8 rounded-lg object-contain shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
          <Car size={18} />
        </div>
      )}
      <div className="leading-tight">
        <p className={cn('font-bold text-slate-900', small ? 'text-sm' : 'text-base')}>RentFlow</p>
        {!small && <p className="text-[10px] text-slate-500">Rental & Partnership</p>}
      </div>
    </div>
  );
}
