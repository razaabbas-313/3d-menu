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
  categories?: string[] | null;
};

export type Item = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  thumbnailUrl?: string | null;
  modelUrl: string | null;
  originalModelUrl?: string | null;
  modelFileName: string | null;
  modelStatus?: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | string | null;
  modelFileSize?: number | null;
  originalModelFileSize?: number | null;
  modelOptimizationNotes?: string | null;
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
  | 'thumbnailUrl'
  | 'modelUrl'
  | 'modelStatus'
  | 'modelFileSize'
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

const PRODUCTION_API = 'https://atelier-api-jyit.onrender.com';
const BASE = (
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? PRODUCTION_API : '')
).replace(/\/$/, '');
const TOKEN_KEY = 'atelier.token';

if (typeof window !== 'undefined') {
  // Pre-warm backend immediately on page load to eliminate cold-start delay for users
  const warmUrl = (BASE || PRODUCTION_API) + '/health';
  try {
    fetch(warmUrl, { mode: 'no-cors', keepalive: true }).catch(() => {});
  } catch {}
}

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
      status === 403 ? 'The server refused this request (403).' :
      status === 404 ? 'We could not find that.' :
      status === 413 ? 'That file is too large. Models can be up to 30 MB.' :
      status === 429 ? 'Too many requests. Please wait a moment.' :
      status === 502 || status === 503 || status === 504 ? 'The backend server is waking up or temporarily restarting. Please retry in a few seconds.' :
      status >= 500 ? 'The server had a problem. Please try again.' :
      `Request failed (${status}).`;
  }
  return new ApiError(status, message);
}

const NETWORK_MESSAGE = 'Cannot reach the server. Check that the backend is running and try again.';

async function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function request<T>(path: string, init: RequestInit = {}, opts: { publicCall?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !opts.publicCall) headers.set('Authorization', `Bearer ${token}`);

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${BASE}/api/v1${path}`, { ...init, headers });
    } catch {
      if (attempt < maxAttempts) {
        await delay(attempt * 2000);
        continue;
      }
      throw new ApiError(0, NETWORK_MESSAGE);
    }

    if (!response.ok) {
      // If server is cold-starting (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout), wait and retry
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < maxAttempts) {
        await delay(attempt * 2500);
        continue;
      }

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

  throw new ApiError(0, NETWORK_MESSAGE);
}

function upload<T>(path: string, file: File, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/v1${path}`);
    xhr.timeout = 180000; // 3 minutes for larger 3D model uploads
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.ontimeout = () => reject(new ApiError(408, 'Upload timed out. The file may be too large or the internet connection is slow.'));
    xhr.onerror = () => reject(new ApiError(0, 'Cannot reach the server. The backend may be restarting or processing a heavy task. Please retry in a few moments.'));
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

const isMock = () => !import.meta.env.PROD && token === 'mock-token-session';

export const api = {
  // auth
  register: async (b: { email: string; password: string; restaurantName: string; city: string }) => {
    try {
      return await request<{ token: string; user: User; restaurant: Restaurant }>('/auth/register', json('POST', b));
    } catch (err) {
      if (!BASE && !import.meta.env.PROD) {
        const user = mockStore.getUser();
        user.email = b.email;
        const restaurant = mockStore.updateRestaurant({ name: b.restaurantName, city: b.city });
        auth.set('mock-token-session');
        return { token: 'mock-token-session', user, restaurant };
      }
      throw err;
    }
  },
  login: async (b: { email: string; password: string }) => {
    try {
      return await request<{ token: string; user: User; restaurant: Restaurant }>('/auth/login', json('POST', b));
    } catch (err) {
      if (!BASE && !import.meta.env.PROD) {
        const user = mockStore.getUser();
        user.email = b.email;
        const restaurant = mockStore.getRestaurant();
        auth.set('mock-token-session');
        return { token: 'mock-token-session', user, restaurant };
      }
      throw err;
    }
  },
  me: async () => {
    try {
      return await request<{ user: User; restaurant: Restaurant }>('/auth/me');
    } catch (err) {
      if (token === 'mock-token-session' || (!BASE && !import.meta.env.PROD)) {
        return { user: mockStore.getUser(), restaurant: mockStore.getRestaurant() };
      }
      throw err;
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
    categories?: string[];
  }) => {
    try {
      return await request<Restaurant>('/restaurant', json('PUT', b));
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.updateRestaurant(b);
    }
  },
  restaurant: async () => {
    try {
      return await request<Restaurant>('/restaurant');
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.getRestaurant();
    }
  },
  updateCategories: async (categories: string[]) => {
    try {
      return await request<Restaurant>('/restaurant/categories', json('PATCH', categories));
    } catch (err) {
      if (!isMock()) throw err;
      const r = mockStore.getRestaurant();
      r.categories = categories;
      return r;
    }
  },
  publish: async (value: boolean) => {
    try {
      return await request<Restaurant>(`/restaurant/publish?value=${value}`, { method: 'PATCH' });
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.updateRestaurant({ published: value });
    }
  },
  uploadCover: async (file: File, onProgress?: (f: number) => void) => {
    try {
      return await upload<Restaurant>('/restaurant/cover', file, onProgress);
    } catch (err) {
      if (!isMock()) throw err;
      onProgress?.(1);
      return mockStore.uploadCover(file);
    }
  },
  removeCover: async () => {
    try {
      return await request<Restaurant>('/restaurant/cover', { method: 'DELETE' });
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.removeCover();
    }
  },
  addSampleMenu: async () => {
    try {
      return await request<Item[]>('/restaurant/sample-menu', { method: 'POST' });
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.getItems();
    }
  },

  // items
  items: async () => {
    try {
      return await request<Item[]>('/items');
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.getItems();
    }
  },
  createItem: async (b: ItemInput) => {
    try {
      return await request<Item>('/items', json('POST', b));
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.createItem(b);
    }
  },
  updateItem: async (id: string, b: ItemInput) => {
    try {
      return await request<Item>(`/items/${id}`, json('PUT', b));
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.updateItem(id, b);
    }
  },
  deleteItem: async (id: string) => {
    try {
      return await request<void>(`/items/${id}`, { method: 'DELETE' });
    } catch (err) {
      if (!isMock()) throw err;
      mockStore.deleteItem(id);
    }
  },
  uploadImage: async (id: string, file: File, onProgress?: (f: number) => void) => {
    try {
      return await upload<Item>(`/items/${id}/image`, file, onProgress);
    } catch (err) {
      if (!isMock()) throw err;
      onProgress?.(1);
      return mockStore.uploadItemImage(id, file);
    }
  },
  uploadModel: async (id: string, file: File, onProgress?: (f: number) => void): Promise<Item> => {
    // 1. Try direct presigned S3 PUT (0 bytes through Render's 512MB RAM)
    try {
      const presign = await request<{ directS3: string; uploadUrl?: string; key?: string; fileName?: string }>(
        `/items/${id}/model-presign`,
        json('POST', { fileName: file.name, fileSize: file.size })
      );

      if (presign && presign.directS3 === 'true' && presign.uploadUrl && presign.key) {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presign.uploadUrl!);
          xhr.setRequestHeader('Content-Type', 'model/gltf-binary');
          xhr.timeout = 180000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress?.(e.loaded / e.total);
          };
          xhr.ontimeout = () => reject(new ApiError(408, 'Upload to S3 timed out.'));
          xhr.onerror = () => reject(new ApiError(0, 'Failed to upload directly to S3. Check network connection.'));
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new ApiError(xhr.status, `S3 upload failed (${xhr.status}).`));
            }
          };
          xhr.send(file);
        });

        return await request<Item>(
          `/items/${id}/model-confirm`,
          json('POST', { key: presign.key, fileName: file.name, fileSize: file.size })
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 413) throw err;
      // Fall through to standard upload if direct S3 is not available
    }

    try {
      return await upload<Item>(`/items/${id}/model`, file, onProgress);
    } catch (err) {
      if (!isMock()) throw err;
      onProgress?.(1);
      return mockStore.uploadItemModel(id, file);
    }
  },
  removeModel: async (id: string) => {
    try {
      return await request<Item>(`/items/${id}/model`, { method: 'DELETE' });
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.removeItemModel(id);
    }
  },
  tuneModel: async (id: string, scale?: number, placement?: string) => {
    try {
      const params = new URLSearchParams();
      if (scale !== undefined && scale !== null) params.set('scale', String(scale));
      if (placement) params.set('placement', placement);
      return await request<Item>(`/items/${id}/model-tuning?${params.toString()}`, { method: 'PATCH' });
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.tuneModel(id, scale ?? 1.0, placement ?? 'plate');
    }
  },
  getOriginalModelUrl: async (id: string) => {
    try {
      return await request<{ url: string }>(`/items/${id}/original-model-url`);
    } catch (err) {
      if (!isMock()) throw err;
      return { url: '' };
    }
  },

  // analytics
  analytics: async (days: number) => {
    try {
      return await request<Analytics>(`/analytics/summary?days=${days}&tz=${-new Date().getTimezoneOffset()}`);
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.getAnalytics(days);
    }
  },

  // public (no auth header)
  publicMenu: async (slug: string): Promise<PublicMenu> => {
    const assetBase = (import.meta.env.VITE_ASSET_BASE_URL || import.meta.env.VITE_S3_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const snapshotUrl = assetBase
      ? `${assetBase}/public/${encodeURIComponent(slug)}/menu.json`
      : `${BASE}/uploads/public/${encodeURIComponent(slug)}/menu.json`;

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
      // 4. In development only, fall back to mock store for 'demo'
      if (!import.meta.env.PROD && slug === 'demo') {
        return mockStore.getPublicMenu(slug);
      }
      throw e;
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
    return await request<{ id: string }>('/public/leads', json('POST', data), { publicCall: true });
  },

  leads: async () => {
    return await request<Array<LeadInquiryInput & { id: string; createdAt: string }>>('/leads');
  },

  toggleAvailable: async (id: string, value: boolean) => {
    try {
      return await request<Item>(`/items/${id}/available?value=${value}`, { method: 'PATCH' });
    } catch (err) {
      if (!isMock()) throw err;
      return mockStore.toggleAvailable(id, value);
    }
  }
};
