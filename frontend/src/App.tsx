import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from './lib/auth';
import { navigate, useLocation } from './lib/router';
import { Spinner, EmptyState, ButtonLink } from './components/ui';

const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));
const AuthPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.AuthPage })));
const Guest = lazy(() => import('./pages/Guest').then((m) => ({ default: m.Guest })));
const Dashboard = lazy(() => import('./pages/dashboard/Shell').then((m) => ({ default: m.Dashboard })));

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

export default function App() {
  const { pathname, search } = useLocation();
  const { status } = useAuth();

  // Legacy QR links from the first MVP: /?menu=<slug>
  const legacy = search.get('menu');
  if (pathname === '/' && legacy) return <Redirect to={`/m/${encodeURIComponent(legacy)}`} />;

  const guest = pathname.match(/^\/m\/([^/]+)\/?$/);
  if (guest) {
    return (
      <Suspense fallback={<div className="boot"><Spinner label="Loading menu…" /></div>}>
        <Guest mode="public" slug={decodeURIComponent(guest[1])} />
      </Suspense>
    );
  }

  if (pathname === '/') {
    return (
      <Suspense fallback={<div className="boot"><Spinner label="Loading Atelier AR…" /></div>}>
        <Landing />
      </Suspense>
    );
  }

  if (pathname === '/login' || pathname === '/register') {
    if (status === 'loading') return <Spinner label="Loading" />;
    if (status === 'signedIn') return <Redirect to="/app" />;
    return (
      <Suspense fallback={<div className="boot"><Spinner label="Loading…" /></div>}>
        <AuthPage mode={pathname === '/login' ? 'login' : 'register'} />
      </Suspense>
    );
  }

  if (pathname === '/app' || pathname.startsWith('/app/')) {
    if (status === 'loading') return <div className="boot"><Spinner label="Loading your studio" /></div>;
    if (status === 'signedOut') return <Redirect to="/login" />;
    return (
      <Suspense fallback={<div className="boot"><Spinner label="Loading dashboard…" /></div>}>
        <Dashboard />
      </Suspense>
    );
  }

  return (
    <div className="guest guest-center">
      <EmptyState title="Page not found" text="That address does not exist." action={<ButtonLink to="/" variant="primary">Go to the home page</ButtonLink>} />
    </div>
  );
}
