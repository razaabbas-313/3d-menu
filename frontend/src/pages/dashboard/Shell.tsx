import { lazy, ReactNode, Suspense, useEffect, useState } from 'react';
import { Box, Eye, LayoutGrid, LogOut, Menu as MenuIcon, QrCode, Settings, UtensilsCrossed, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { Link, navigate, useLocation } from '../../lib/router';
import { initials } from '../../lib/format';
import { Button, Chip, Logo, Spinner } from '../../components/ui';
import { MenuProvider } from './menuStore';
import { Guest } from '../Guest';

const Overview = lazy(() => import('./Overview').then((m) => ({ default: m.Overview })));
const MenuLibrary = lazy(() => import('./MenuLibrary').then((m) => ({ default: m.MenuLibrary })));
const Studio = lazy(() => import('./Studio').then((m) => ({ default: m.Studio })));
const Share = lazy(() => import('./Share').then((m) => ({ default: m.Share })));
const SettingsPage = lazy(() => import('./Settings').then((m) => ({ default: m.SettingsPage })));

const NAV = [
  { to: '/app', label: 'Overview', short: 'Home', icon: LayoutGrid },
  { to: '/app/menu', label: 'Menu', short: 'Menu', icon: UtensilsCrossed },
  { to: '/app/studio', label: '3D studio', short: '3D', icon: Box },
  { to: '/app/share', label: 'QR and sharing', short: 'Share', icon: QrCode },
  { to: '/app/settings', label: 'Settings', short: 'Settings', icon: Settings }
];

export function Dashboard() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '') || '/';

  return (
    <MenuProvider>
      {path === '/app/preview' ? <Guest mode="preview" /> : <Frame path={path} />}
    </MenuProvider>
  );
}

function Frame({ path }: { path: string }) {
  const { restaurant, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  let page: ReactNode;
  switch (path) {
    case '/app': page = <Overview />; break;
    case '/app/menu': page = <MenuLibrary />; break;
    case '/app/studio': page = <Studio />; break;
    case '/app/share': page = <Share />; break;
    case '/app/settings': page = <SettingsPage />; break;
    default: page = null;
  }
  const known = NAV.some((n) => n.to === path);
  useEffect(() => {
    if (!known) navigate('/app', { replace: true });
  }, [known]);

  return (
    <div className="d-shell">
      <aside className="d-rail">
        <Link to="/app" className="d-brand" aria-label="Atelier AR home">
          <Logo size={34} />
          <span>Atelier AR</span>
        </Link>
        <nav aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={`d-nav ${path === to ? 'active' : ''}`} aria-current={path === to ? 'page' : undefined}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="d-rail-foot">
          <div className="d-me">
            <div className="d-avatar" aria-hidden>{initials(restaurant?.name ?? '')}</div>
            <div className="d-me-text">
              <strong>{restaurant?.name}</strong>
              <Chip tone={restaurant?.published ? 'basil' : 'neutral'}>{restaurant?.published ? '● Live' : '○ Draft'}</Chip>
            </div>
          </div>
          <Button size="sm" icon={<Eye size={15} />} onClick={() => navigate('/app/preview')}>Preview menu</Button>
          <Button size="sm" variant="ghost" icon={<LogOut size={15} />} onClick={signOut}>Sign out</Button>
        </div>
      </aside>

      <div className="d-main">
        <header className="d-topbar">
          <button
            type="button"
            className="icon-btn d-topbar-menu-btn"
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon size={21} />
          </button>
          <Link to="/app" className="d-topbar-brand" aria-label="Atelier AR home"><Logo size={28} /></Link>
          <strong className="d-topbar-name">{restaurant?.name}</strong>
          <Chip tone={restaurant?.published ? 'basil' : 'neutral'}>
            {restaurant?.published ? '● Live' : '○ Draft'}
          </Chip>
        </header>
        <main className="d-content" id="main">
          <Suspense fallback={<div className="boot"><Spinner label="Loading…" /></div>}>
            {page}
          </Suspense>
        </main>
      </div>

      <nav className="d-tabbar" aria-label="Main">
        {NAV.map(({ to, short, icon: Icon }) => (
          <Link key={to} to={to} className={path === to ? 'active' : ''} aria-current={path === to ? 'page' : undefined}>
            <Icon size={20} />
            <span>{short}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile Fixed Sliding Drawer Sidebar */}
      {mobileNavOpen && (
        <div className="d-mobile-drawer-backdrop" onClick={() => setMobileNavOpen(false)}>
          <aside className="d-mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="d-mobile-drawer-head">
              <Link to="/app" className="d-brand" onClick={() => setMobileNavOpen(false)}>
                <Logo size={30} />
                <span>Atelier AR</span>
              </Link>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="d-mobile-drawer-restaurant">
              <div className="d-avatar" aria-hidden>{initials(restaurant?.name ?? '')}</div>
              <div className="d-me-text">
                <strong>{restaurant?.name}</strong>
                <Chip tone={restaurant?.published ? 'basil' : 'neutral'}>
                  {restaurant?.published ? '● Live Menu' : '○ Draft'}
                </Chip>
              </div>
            </div>

            <nav className="d-mobile-drawer-nav" aria-label="Main navigation">
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`d-nav ${path === to ? 'active' : ''}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            <div className="d-mobile-drawer-foot">
              <Button
                size="sm"
                icon={<Eye size={15} />}
                onClick={() => { setMobileNavOpen(false); navigate('/app/preview'); }}
                className="wide"
              >
                Preview guest menu
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<LogOut size={15} />}
                onClick={signOut}
                className="wide"
              >
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}


export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
