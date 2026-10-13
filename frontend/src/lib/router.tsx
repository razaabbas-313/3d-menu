import { AnchorHTMLAttributes, MouseEvent, ReactNode, useCallback, useSyncExternalStore } from 'react';

/** A deliberately tiny history router: enough for this app, zero dependencies. */
const EVENT = 'atelier:navigate';

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(EVENT, callback);
  };
}

const getSnapshot = () => window.location.pathname + window.location.search;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === getSnapshot()) return;
  if (opts.replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(EVENT));
  window.scrollTo(0, 0);
}

export function useLocation() {
  const full = useSyncExternalStore(subscribe, getSnapshot, () => '/');
  const q = full.indexOf('?');
  const pathname = q === -1 ? full : full.slice(0, q);
  const search = new URLSearchParams(q === -1 ? '' : full.slice(q));
  return { pathname, search };
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; children?: ReactNode };

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const handle = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (rest.target && rest.target !== '_self') return;
      e.preventDefault();
      navigate(to);
    },
    [onClick, to, rest.target]
  );
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
