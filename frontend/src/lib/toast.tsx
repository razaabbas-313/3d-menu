import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: Kind; message: string };
type Api = { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };

const Ctx = createContext<Api | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
    },
    [dismiss]
  );

  const api = useMemo<Api>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m)
    }),
    [push]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'success' ? <Check size={16} /> : t.kind === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
            <span>{t.message}</span>
            <button aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): Api {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

export const errorMessage = (e: unknown, fallback = 'Something went wrong.') =>
  e instanceof Error && e.message ? e.message : fallback;
