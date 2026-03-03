import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthPage } from './components/auth/AuthPage';
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute';

// Lazy-loaded pages (added in later steps)
import { lazy, Suspense } from 'react';
import { Spinner } from './components/ui';

const BoardsPage = lazy(() => import('./pages/BoardsPage').then((m) => ({ default: m.BoardsPage })));
const BoardPage  = lazy(() => import('./pages/BoardPage').then((m) => ({ default: m.BoardPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" className="text-[--color-accent]" />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/boards" replace />} />

          {/* Guest-only (redirect to /boards if already logged in) */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<AuthPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/boards"
              element={
                <Suspense fallback={<PageLoader />}>
                  <BoardsPage />
                </Suspense>
              }
            />
            <Route
              path="/boards/:boardId"
              element={
                <Suspense fallback={<PageLoader />}>
                  <BoardPage />
                </Suspense>
              }
            />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/boards" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontSize: '14px',
            background: 'var(--color-text-primary)',
            color: '#fff',
            borderRadius: '10px',
            padding: '10px 14px',
          },
          success: { iconTheme: { primary: '#4ade80', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}