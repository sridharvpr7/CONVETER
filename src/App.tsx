import React, { Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  ScrollRestoration,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import { Header } from '@/components/navigation/Header';
import { CommandPalette } from '@/components/navigation/CommandPalette';

// Pages
import { HomePage } from '@/pages/HomePage';
import { ToolsPage } from '@/pages/ToolsPage';
import { ToolPage } from '@/pages/ToolPage';
import { AuthPage } from '@/pages/AuthPage';
import { PricingPage } from '@/pages/PricingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Store
import { useAppStore } from '@/store/app.store';

// ─────────────────────────────────────────────────────────
// QueryClient
// ─────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// ─────────────────────────────────────────────────────────
// Scroll-to-top on route change
// ─────────────────────────────────────────────────────────
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

// ─────────────────────────────────────────────────────────
// Page wrapper — adds .page-enter animation + header offset
// ─────────────────────────────────────────────────────────
const PageWrapper: React.FC<{ children: React.ReactNode; noHeader?: boolean }> = ({
  children,
  noHeader = false,
}) => {
  return (
    <div className="page-enter min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {!noHeader && <Header />}
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Loading fallback
// ─────────────────────────────────────────────────────────
const PageSkeleton: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ backgroundColor: 'var(--bg)' }}
  >
    <div className="flex flex-col items-center gap-4">
      <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <path d="M9 13L13 9L17 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 9V21" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M23 19L19 23L15 19" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 23V11" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: 'var(--accent)',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────
// Notification panel (global overlay)
// ─────────────────────────────────────────────────────────
const NotificationsPanel: React.FC = () => {
  const { notificationsOpen, setNotificationsOpen } = useAppStore();

  if (!notificationsOpen) return null;

  const DEMO_NOTIFS = [
    { id: '1', title: 'PDF compressed successfully', desc: 'Annual_Report.pdf reduced by 74%', time: '2m ago', read: false, type: 'success' },
    { id: '2', title: 'Welcome to CONVETER', desc: 'Start with our popular tools or explore all 80+ tools', time: '1h ago', read: false, type: 'info' },
    { id: '3', title: 'Premium trial available', desc: 'Try all Premium features free for 7 days', time: '1d ago', read: true, type: 'promo' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-[150]"
        onClick={() => setNotificationsOpen(false)}
        aria-hidden
      />
      <div
        className="fixed top-16 right-4 z-[151] w-80 rounded-xl border shadow-cv-lg animate-slide-down overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-sm font-semibold text-primary">Notifications</span>
          <button className="text-xs text-muted-cv hover:text-accent transition-colors">
            Mark all read
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {DEMO_NOTIFS.map((n) => (
            <div
              key={n.id}
              className="flex gap-3 px-4 py-3 transition-colors hover:bg-hover-cv cursor-pointer"
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{
                  backgroundColor: n.read
                    ? 'transparent'
                    : n.type === 'success'
                    ? '#22c55e'
                    : n.type === 'promo'
                    ? '#f59e0b'
                    : 'var(--accent)',
                }}
              />
              <div>
                <p className={`text-xs font-medium ${n.read ? 'text-muted-cv' : 'text-primary'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-muted-cv mt-0.5">{n.desc}</p>
                <p className="text-2xs text-muted-cv mt-1" style={{ fontSize: '10px' }}>{n.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div
          className="px-4 py-2.5 border-t text-center"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
        >
          <button className="text-xs text-muted-cv hover:text-primary transition-colors">
            View all notifications
          </button>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────
// App Routes
// ─────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ScrollToTop />
      <CommandPalette />
      <NotificationsPanel />

      <Routes>
        {/* Public pages WITH header */}
        <Route
          path="/"
          element={
            <PageWrapper>
              <HomePage />
            </PageWrapper>
          }
        />
        <Route
          path="/tools"
          element={
            <PageWrapper>
              <ToolsPage />
            </PageWrapper>
          }
        />
        <Route
          path="/tools/:category"
          element={
            <PageWrapper>
              <ToolsPage />
            </PageWrapper>
          }
        />
        <Route
          path="/tool/:slug"
          element={
            <PageWrapper>
              <ToolPage />
            </PageWrapper>
          }
        />
        <Route
          path="/pricing"
          element={
            <PageWrapper>
              <PricingPage />
            </PageWrapper>
          }
        />

        {/* Auth pages — no header (standalone layout) */}
        <Route
          path="/login"
          element={
            <PageWrapper noHeader>
              <AuthPage mode="login" />
            </PageWrapper>
          }
        />
        <Route
          path="/register"
          element={
            <PageWrapper noHeader>
              <AuthPage mode="register" />
            </PageWrapper>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PageWrapper noHeader>
              <AuthPage mode="forgot" />
            </PageWrapper>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PageWrapper noHeader>
              <AuthPage mode="reset" />
            </PageWrapper>
          }
        />

        {/* User dashboard pages */}
        <Route
          path="/dashboard"
          element={
            <PageWrapper>
              <DashboardPage />
            </PageWrapper>
          }
        />
        <Route
          path="/history"
          element={
            <PageWrapper>
              <HistoryPage />
            </PageWrapper>
          }
        />
        <Route
          path="/favorites"
          element={
            <PageWrapper>
              <FavoritesPage />
            </PageWrapper>
          }
        />
        <Route
          path="/workflows"
          element={
            <PageWrapper>
              <WorkflowsPage />
            </PageWrapper>
          }
        />
        <Route
          path="/settings"
          element={
            <PageWrapper>
              <SettingsPage />
            </PageWrapper>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <PageWrapper>
              <NotFoundPage />
            </PageWrapper>
          }
        />
      </Routes>
    </Suspense>
  );
};

// ─────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
