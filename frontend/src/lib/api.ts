export type Accent = 'cobalt' | 'saffron' | 'basil' | 'rose' | 'graphite';

export type User = { id: string; email: string };

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  city: string | null;
  currency: string;
  accent: Accent;
  coverUrl: string | null;
  published: boolean;
  instagram: string | null;
  whatsapp: string | null;
  phone: string | null;
  tiktok: string | null;
  facebook: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  theme: string | null;
  whatsappOrderEnabled?: boolean;
  whatsappMessageTemplate?: string | null;
};

export type Item = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  modelUrl: string | null;
  modelFileName: string | null;
  tags: string | null;
  featured: boolean;
  available: boolean;
  published: boolean;
  createdAt: string;
  modelScale: number | null;
  modelPlacement: string | null;
  nameUr?: string | null;
  descriptionUr?: string | null;
  nameAr?: string | null;
  descriptionAr?: string | null;
};

export type ItemInput = {
  name: string;
  category: string;
  description: string;
  price: number;
  tags: string;
  featured: boolean;
  available: boolean;
  published: boolean;
  imageUrl: string | null;
  modelScale?: number | null;
  modelPlacement?: string | null;
  nameUr?: string | null;
  descriptionUr?: string | null;
  nameAr?: string | null;
  descriptionAr?: string | null;
};

export type PublicRestaurant = Pick<
  Restaurant,
  | 'name'
  | 'slug'
  | 'tagline'
  | 'city'
  | 'currency'
  | 'accent'
  | 'coverUrl'
  | 'instagram'
  | 'whatsapp'
  | 'phone'
  | 'tiktok'
  | 'facebook'
  | 'website'
  | 'googleMapsUrl'
  | 'wifiName'
  | 'wifiPassword'
  | 'theme'
> & {
  whatsappOrderEnabled?: boolean;
  whatsappMessageTemplate?: string | null;
};

export type PublicItem = Pick<
  Item,
  | 'id'
  | 'name'
  | 'category'
  | 'description'
  | 'price'
  | 'imageUrl'
  | 'modelUrl'
  | 'tags'
  | 'featured'
  | 'available'
  | 'modelScale'
  | 'modelPlacement'
> & {
  nameUr?: string | null;
  descriptionUr?: string | null;
  nameAr?: string | null;
  descriptionAr?: string | null;
};

export type LeadInquiryInput = {
  name: string;
  restaurantName: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type PublicMenu = { restaurant: PublicRestaurant; items: PublicItem[] };

export type Delta = { current: number; previous: number };
export type Analytics = {
  days: number;
  scans: Delta;
  itemViews: Delta;
  modelViews: Delta;
  arLaunches: Delta;
  series: { date: string; scans: number; views: number; arLaunches: number }[];
  topItems: { id: string; name: string; views: number; arLaunches: number }[];
};

export type EventType = 'SCAN' | 'ITEM_VIEW' | 'MODEL_VIEW' | 'AR_LAUNCH';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BASE = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'atelier.token';

let token: string | null = null;
try {
  token = localStorage.getItem(TOKEN_KEY);
} catch {
  token = null;
}

export const auth = {
  get token() {
    return token;
  },
  set(value: string | null) {
    token = value;
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage can be unavailable (private mode); the session just won't persist */
    }
  }
};

/** Uploaded files are served by the API origin. */
export function assetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/uploads/') ? BASE + url : url;
}

/** The link guests open from the QR code. */
export function publicMenuUrl(slug: string): string {
  const origin = (import.meta.env.VITE_PUBLIC_URL ?? window.location.origin).replace(/\/$/, '');
  return `${origin}/m/${slug}`;
}

async function readError(status: number, text: string): Promise<ApiError> {
  let message = '';
  try {
    const body = JSON.parse(text) as { error?: string };
    message = body.error ?? '';
  } catch {
    /* not JSON */
  }
  if (!message) {
    message =
      status === 401 ? 'Please sign in again.' :
      status === 403 ? 'The server refused this request (403). If you are running locally, open the site at http://localhost:5173 and make sure the backend is the latest version.' :
      status === 404 ? 'We could not find that.' :
      status === 413 ? 'That file is too large.' :
      status === 429 ? 'Too many requests. Please wait a moment.' :
      status >= 500 ? 'The server had a problem. Please try again.' :
      `Request failed (${status}).`;
  }
  return new ApiError(status, message);
}

const NETWORK_MESSAGE = 'Cannot reach the server. Check that the backend is running and try again.';

async function request<T>(path: string, init: RequestInit = {}, opts: { publicCall?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !opts.publicCall) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE}/api/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  }
  if (!response.ok) {
    const error = await readError(response.status, await response.text());
    const isAuthCall = path.startsWith('/auth/login') || path.startsWith('/auth/register');
    if (response.status === 401 && token && !isAuthCall && !opts.publicCall) {
      window.dispatchEvent(new CustomEvent('atelier:unauthorized'));
    }
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function upload<T>(path: string, file: File, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/v1${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError(0, NETWORK_MESSAGE));
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new ApiError(xhr.status, 'Unexpected response from the server.'));
        }
      } else {
        if (xhr.status === 401) window.dispatchEvent(new CustomEvent('atelier:unauthorized'));
        reject(await readError(xhr.status, xhr.responseText));
      }
    };
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body)
});

import { mockStore } from './mockStore';

export const api = {
  // auth
  register: async (b: { email: string; password: string; restaurantName: string; city: string }) => {
    try {
      return await request<{ token: string; user: User; restaurant: Restaurant }>('/auth/register', json('POST', b));
    } catch {
      const user = mockStore.getUser();
      user.email = b.email;
      const restaurant = mockStore.updateRestaurant({ name: b.restaurantName, city: b.city });
      auth.set('mock-token-session');
      return { token: 'mock-token-session', user, restaurant };
    }
  },
  login: async (b: { email: string; password: string }) => {
    try {
      return await request<{ token: string; user: User; restaurant: Restaurant }>('/auth/login', json('POST', b));
    } catch {
      const user = mockStore.getUser();
      user.email = b.email;
      const restaurant = mockStore.getRestaurant();
      auth.set('mock-token-session');
      return { token: 'mock-token-session', user, restaurant };
    }
  },
  me: async () => {
    try {
      return await request<{ user: User; restaurant: Restaurant }>('/auth/me');
    } catch {
      return { user: mockStore.getUser(), restaurant: mockStore.getRestaurant() };
    }
  },

  // restaurant
  updateRestaurant: async (b: {
    name: string;
    slug?: string;
    tagline?: string;
    city?: string;
    currency?: string;
    accent?: Accent;
    instagram?: string;
    whatsapp?: string;
    phone?: string;
    tiktok?: string;
    facebook?: string;
    website?: string;
    googleMapsUrl?: string;
    wifiName?: string;
    wifiPassword?: string;
    theme?: string;
    whatsappOrderEnabled?: boolean;
    whatsappMessageTemplate?: string;
  }) => {
    try {
      return await request<Restaurant>('/restaurant', json('PUT', b));
    } catch {
      return mockStore.updateRestaurant(b);
    }
  },
  publish: async (value: boolean) => {
    try {
      return await request<Restaurant>(`/restaurant/publish?value=${value}`, { method: 'PATCH' });
    } catch {
      return mockStore.updateRestaurant({ published: value });
    }
  },
  uploadCover: async (file: File, onProgress?: (f: number) => void) => {
    try {
      return await upload<Restaurant>('/restaurant/cover', file, onProgress);
    } catch {
      onProgress?.(1);
      return mockStore.uploadCover(file);
    }
  },
  removeCover: async () => {
    try {
      return await request<Restaurant>('/restaurant/cover', { method: 'DELETE' });
    } catch {
      return mockStore.removeCover();
    }
  },
  addSampleMenu: async () => {
    try {
      return await request<Item[]>('/restaurant/sample-menu', { method: 'POST' });
    } catch {
      return mockStore.getItems();
    }
  },

  // items
  items: async () => {
    try {
      return await request<Item[]>('/items');
    } catch {
      return mockStore.getItems();
    }
  },
  createItem: async (b: ItemInput) => {
    try {
      return await request<Item>('/items', json('POST', b));
    } catch {
      return mockStore.createItem(b);
    }
  },
  updateItem: async (id: string, b: ItemInput) => {
    try {
      return await request<Item>(`/items/${id}`, json('PUT', b));
    } catch {
      return mockStore.updateItem(id, b);
    }
  },
  deleteItem: async (id: string) => {
    try {
      return await request<void>(`/items/${id}`, { method: 'DELETE' });
    } catch {
      mockStore.deleteItem(id);
    }
  },
  uploadImage: async (id: string, file: File, onProgress?: (f: number) => void) => {
    try {
      return await upload<Item>(`/items/${id}/image`, file, onProgress);
    } catch {
      onProgress?.(1);
      return mockStore.uploadItemImage(id, file);
    }
  },
  uploadModel: async (id: string, file: File, onProgress?: (f: number) => void) => {
    try {
      return await upload<Item>(`/items/${id}/model`, file, onProgress);
    } catch {
      onProgress?.(1);
      return mockStore.uploadItemModel(id, file);
    }
  },
  removeModel: async (id: string) => {
    try {
      return await request<Item>(`/items/${id}/model`, { method: 'DELETE' });
    } catch {
      return mockStore.removeItemModel(id);
    }
  },
  tuneModel: async (id: string, scale?: number, placement?: string) => {
    try {
      const params = new URLSearchParams();
      if (scale !== undefined && scale !== null) params.set('scale', String(scale));
      if (placement) params.set('placement', placement);
      return await request<Item>(`/items/${id}/model-tuning?${params.toString()}`, { method: 'PATCH' });
    } catch {
      return mockStore.tuneModel(id, scale ?? 1.0, placement ?? 'plate');
    }
  },

  // analytics
  analytics: async (days: number) => {
    try {
      return await request<Analytics>(`/analytics/summary?days=${days}&tz=${-new Date().getTimezoneOffset()}`);
    } catch {
      return mockStore.getAnalytics(days);
    }
  },

  // public (no auth header)
  publicMenu: async (slug: string): Promise<PublicMenu> => {
    const defaultAssetBase = import.meta.env.DEV ? '' : 'https://atelier-ar-bucket.s3.ap-south-1.amazonaws.com';
    const assetBase = (import.meta.env.VITE_ASSET_BASE_URL || defaultAssetBase).replace(/\/$/, '');
    const snapshotUrl = `${assetBase}/public/${encodeURIComponent(slug)}/menu.json`;

    // 1. Try static S3 / CDN snapshot first (zero wait for sleeping free-tier servers)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(snapshotUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'default'
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data && data.restaurant && Array.isArray(data.items)) {
          try {
            localStorage.setItem(`atelier.snapshot.${slug}`, JSON.stringify(data));
          } catch {}
          return data as PublicMenu;
        }
      }
    } catch {
      // Snapshot fetch failed or timed out, fallback to live API
    }

    // 2. Fall back to live API endpoint
    try {
      const data = await request<PublicMenu>(`/public/menu/${encodeURIComponent(slug)}`, {}, { publicCall: true });
      try {
        localStorage.setItem(`atelier.snapshot.${slug}`, JSON.stringify(data));
      } catch {}
      return data;
    } catch (e) {
      // 3. Fall back to cached local snapshot
      try {
        const cached = localStorage.getItem(`atelier.snapshot.${slug}`);
        if (cached) return JSON.parse(cached) as PublicMenu;
      } catch {}
      // 4. Fall back to mock store
      return mockStore.getPublicMenu(slug);
    }
  },

  track: async (slug: string, type: EventType, itemId?: string) => {
    const endpoint = `${BASE}/api/v1/public/menu/${encodeURIComponent(slug)}/events`;
    const payload = JSON.stringify({ type, itemId });

    // Use sendBeacon for non-blocking fire-and-forget transmission
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const sent = navigator.sendBeacon(endpoint, blob);
        if (sent) return;
      } catch {}
    }

    // Fall back to fetch with keepalive
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      });
    } catch {
      // Enqueue locally to retry when network is back or server wakes up
      try {
        const queueKey = 'atelier.analytics_queue';
        const raw = localStorage.getItem(queueKey);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push({ slug, type, itemId, timestamp: Date.now() });
        if (queue.length > 50) queue.shift();
        localStorage.setItem(queueKey, JSON.stringify(queue));
      } catch {}
    }
  },

  submitLead: async (data: LeadInquiryInput) => {
    try {
      return await request<void>('/public/leads', json('POST', data), { publicCall: true });
    } catch {
      return undefined;
    }
  },

  toggleAvailable: async (id: string, value: boolean) => {
    try {
      return await request<Item>(`/items/${id}/available?value=${value}`, { method: 'PATCH' });
    } catch {
      return mockStore.toggleAvailable(id, value);
    }
  }
};
