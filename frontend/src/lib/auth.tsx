import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, auth, Restaurant, User } from './api';
import { navigate } from './router';
import { useToast } from './toast';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: Status;
  user: User | null;
  restaurant: Restaurant | null;
  setRestaurant: (r: Restaurant) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (b: { email: string; password: string; restaurantName: string; city: string }) => Promise<void>;
  signOut: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>(auth.token ? 'loading' : 'signedOut');
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const clear = useCallback(() => {
    auth.set(null);
    setUser(null);
    setRestaurant(null);
    setStatus('signedOut');
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    if (!auth.token) return;
    let cancelled = false;
    api.me()
      .then((me) => {
        if (cancelled) return;
        setUser(me.user);
        setRestaurant(me.restaurant);
        setStatus('signedIn');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Only drop the session when the server says it is invalid, not when it is merely unreachable.
        if (e instanceof Error && 'status' in e && (e as { status: number }).status === 401) clear();
        else {
          setStatus('signedOut');
          toast.error(e instanceof Error ? e.message : 'Could not restore your session.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clear, toast]);

  // Any API call that comes back 401 ends the session.
  useEffect(() => {
    const onUnauthorized = () => {
      clear();
      toast.info('Your session ended. Please sign in again.');
      navigate('/login', { replace: true });
    };
    window.addEventListener('atelier:unauthorized', onUnauthorized);
    return () => window.removeEventListener('atelier:unauthorized', onUnauthorized);
  }, [clear, toast]);

  const accept = useCallback((res: { token: string; user: User; restaurant: Restaurant }) => {
    auth.set(res.token);
    setUser(res.user);
    setRestaurant(res.restaurant);
    setStatus('signedIn');
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      restaurant,
      setRestaurant,
      signIn: async (email, password) => accept(await api.login({ email, password })),
      signUp: async (b) => accept(await api.register(b)),
      signOut: () => {
        clear();
        navigate('/');
      }
    }),
    [status, user, restaurant, accept, clear]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
