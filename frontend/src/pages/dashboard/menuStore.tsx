import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, Item } from '../../lib/api';
import { DEFAULT_CATEGORIES, sortCategories } from '../../lib/format';
import { errorMessage } from '../../lib/toast';

const CATEGORIES_STORAGE_KEY = 'atelier.categories';

function getStoredCategories(): string[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // storage not accessible
  }
  return DEFAULT_CATEGORIES;
}

function saveStoredCategories(cats: string[]) {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
  } catch {
    // storage not accessible
  }
}

type MenuState = {
  items: Item[];
  categories: string[];
  status: 'loading' | 'ready' | 'error';
  error: string;
  reload: () => void;
  upsert: (item: Item) => void;
  remove: (id: string) => void;
  replaceAll: (items: Item[]) => void;
  addCategory: (name: string) => boolean;
  removeCategory: (name: string, fallbackCategory?: string) => Promise<void>;
};

const Ctx = createContext<MenuState | null>(null);

/** Holds the signed-in owner's dishes & categories so every dashboard page shares one source of truth. */
export function MenuProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [customCats, setCustomCats] = useState<string[]>(getStoredCategories);
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

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    setCustomCats((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, trimmed];
      saveStoredCategories(next);
      return next;
    });
    return true;
  }, []);

  const removeCategory = useCallback(async (name: string, fallbackCategory: string = 'Mains') => {
    const targetLower = name.trim().toLowerCase();
    // 1. Reassign any dishes in this category to fallback
    const affected = items.filter((i) => i.category.toLowerCase() === targetLower);
    for (const dish of affected) {
      try {
        const updated = await api.updateItem(dish.id, {
          name: dish.name,
          category: fallbackCategory,
          description: dish.description ?? '',
          price: dish.price,
          tags: dish.tags ?? '',
          featured: dish.featured,
          available: dish.available,
          published: dish.published,
          imageUrl: dish.imageUrl,
          modelScale: dish.modelScale,
          modelPlacement: dish.modelPlacement
        });
        upsert(updated);
      } catch {
        // continue
      }
    }
    // 2. Remove from active category list
    setCustomCats((prev) => {
      const next = prev.filter((c) => c.toLowerCase() !== targetLower);
      saveStoredCategories(next);
      return next;
    });
  }, [items, upsert]);

  const categories = useMemo(() => {
    const dishCats = items.map((i) => i.category);
    const combined = Array.from(new Set([...customCats, ...dishCats]));
    return sortCategories(combined);
  }, [customCats, items]);

  const value = useMemo(
    () => ({ items, categories, status, error, reload, upsert, remove, replaceAll, addCategory, removeCategory }),
    [items, categories, status, error, reload, upsert, remove, replaceAll, addCategory, removeCategory]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMenu(): MenuState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMenu must be used inside MenuProvider');
  return ctx;
}
