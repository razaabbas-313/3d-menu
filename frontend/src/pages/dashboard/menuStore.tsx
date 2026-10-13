import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, Item } from '../../lib/api';
import { errorMessage } from '../../lib/toast';

type MenuState = {
  items: Item[];
  status: 'loading' | 'ready' | 'error';
  error: string;
  reload: () => void;
  upsert: (item: Item) => void;
  remove: (id: string) => void;
  replaceAll: (items: Item[]) => void;
};

const Ctx = createContext<MenuState | null>(null);

/** Holds the signed-in owner's dishes so every dashboard page shares one source of truth. */
export function MenuProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<MenuState['status']>('loading');
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api.items()
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(errorMessage(e, 'Could not load your menu.'));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const upsert = useCallback(
    (item: Item) =>
      setItems((list) => (list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [item, ...list])),
    []
  );
  const remove = useCallback((id: string) => setItems((list) => list.filter((i) => i.id !== id)), []);
  const replaceAll = useCallback((next: Item[]) => setItems(next), []);

  const value = useMemo(
    () => ({ items, status, error, reload, upsert, remove, replaceAll }),
    [items, status, error, reload, upsert, remove, replaceAll]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMenu(): MenuState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMenu must be used inside MenuProvider');
  return ctx;
}
