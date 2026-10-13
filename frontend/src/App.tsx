import { useEffect } from 'react';
import { useAuth } from './lib/auth';
import { navigate, useLocation } from './lib/router';
import { Spinner, EmptyState, ButtonLink } from './components/ui';
import { Landing } from './pages/Landing';
import { AuthPage } from './pages/Auth';
import { Guest } from './pages/Guest';
import { Dashboard } from './pages/dashboard/Shell';

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
  if (guest) return <Guest mode="public" slug={decodeURIComponent(guest[1])} />;

  if (pathname === '/' ) return <Landing />;

  if (pathname === '/login' || pathname === '/register') {
    if (status === 'loading') return <Spinner label="Loading" />;
    if (status === 'signedIn') return <Redirect to="/app" />;
    return <AuthPage mode={pathname === '/login' ? 'login' : 'register'} />;
  }

  if (pathname === '/app' || pathname.startsWith('/app/')) {
    if (status === 'loading') return <div className="boot"><Spinner label="Loading your studio" /></div>;
    if (status === 'signedOut') return <Redirect to="/login" />;
    return <Dashboard />;
  }

  return (
    <div className="guest guest-center">
      <EmptyState title="Page not found" text="That address does not exist." action={<ButtonLink to="/" variant="primary">Go to the home page</ButtonLink>} />
    </div>
  );
}
