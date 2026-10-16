import { Analytics, Item, ItemInput, PublicMenu, Restaurant, User } from './api';

const RESTAURANT_KEY = 'atelier.mock.restaurant';
const ITEMS_KEY = 'atelier.mock.items';
const USER_KEY = 'atelier.mock.user';

const INITIAL_RESTAURANT: Restaurant = {
  id: 'rest-default',
  name: 'The Grand Bistro',
  slug: 'grand-bistro',
  tagline: 'Modern fine dining with interactive 3D and Augmented Reality culinary presentation.',
  city: 'London & Paris',
  currency: 'USD',
  accent: 'cobalt',
  coverUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  published: true,
  instagram: '@thegrandbistro',
  whatsapp: '+1234567890',
  phone: '+1 (555) 019-2834',
  tiktok: '@thegrandbistro',
  facebook: 'https://facebook.com/thegrandbistro',
  website: 'https://3d-menu-three.vercel.app',
  googleMapsUrl: 'https://maps.google.com',
  wifiName: 'GrandBistro_Guest_5G',
  wifiPassword: 'gourmetdining',
  theme: 'dark',
  whatsappOrderEnabled: true,
  whatsappMessageTemplate: 'Hello, I would like to order {dish} for Table {table}.'
};

const INITIAL_ITEMS: Item[] = [
  {
    id: 'item-1',
    name: 'The Truffle Royale Burger',
    nameUr: 'دی ٹرفل رائل برگر',
    nameAr: 'برغر ذا ترافل رويال',
    category: 'Signatures',
    description: 'Dry-aged wagyu beef, black summer truffle emulsion, aged cheddar, butter-toasted artisan brioche.',
    descriptionUr: 'خشک بیف، بلیک سمر ٹرفل ایمولشن، ایجڈ چیڈر، مکھن سے ٹوسٹ شدہ بروش بن۔',
    descriptionAr: 'لحم واغيو معتق، مستحلب الترافل الأسود، جبن شيدر معتق، وخبز بريوش محمص بالزبدة.',
    price: 32,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    modelUrl: '/models/avocado.glb',
    modelFileName: 'truffle-royale.glb',
    tags: 'Halal,Chef Special',
    featured: true,
    available: true,
    published: true,
    createdAt: new Date().toISOString(),
    modelScale: 1.0,
    modelPlacement: 'plate'
  },
  {
    id: 'item-2',
    name: 'Heirloom Burrata Garden',
    category: 'Starters',
    description: 'Creamy pugliese burrata, vine-ripened heirloom tomatoes, cold-pressed basil oil, warm focaccia.',
    price: 22,
    imageUrl: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80',
    modelUrl: null,
    modelFileName: null,
    tags: 'Vegetarian',
    featured: false,
    available: true,
    published: true,
    createdAt: new Date().toISOString(),
    modelScale: 1.0,
    modelPlacement: 'slate'
  },
  {
    id: 'item-3',
    name: 'Charred Smoky Sweetcorn Ribs',
    category: 'Starters',
    description: 'Crispy curled sweetcorn ribs, smoked paprika rub, cotija cheese, lime crema drizzle.',
    price: 16,
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80',
    modelUrl: null,
    modelFileName: null,
    tags: 'Vegetarian,Spicy',
    featured: false,
    available: true,
    published: true,
    createdAt: new Date().toISOString(),
    modelScale: 1.0,
    modelPlacement: 'wood'
  },
  {
    id: 'item-4',
    name: 'Pan-Seared Saffron Sea Bass',
    category: 'Mains',
    description: 'Wild sea bass fillet, saffron velouté, butter-braised asparagus, crispy capers.',
    price: 38,
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    modelUrl: null,
    modelFileName: null,
    tags: 'Gluten-free,Halal',
    featured: true,
    available: true,
    published: true,
    createdAt: new Date().toISOString(),
    modelScale: 1.0,
    modelPlacement: 'marble'
  },
  {
    id: 'item-5',
    name: 'Midnight Espresso Tiramisu',
    category: 'Desserts',
    description: 'Traditional savoiardi ladyfingers soaked in single-origin espresso, whipped mascarpone, Valrhona cocoa.',
    price: 15,
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
    modelUrl: null,
    modelFileName: null,
    tags: 'Vegetarian',
    featured: true,
    available: true,
    published: true,
    createdAt: new Date().toISOString(),
    modelScale: 1.0,
    modelPlacement: 'plate'
  },
  {
    id: 'item-6',
    name: 'Rosewater & Pistachio Pavlova',
    category: 'Desserts',
    description: 'Crisp French meringue, rosewater chantilly cream, macerated wild berries, crushed roasted pistachios.',
    price: 14,
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
    modelUrl: null,
    modelFileName: null,
    tags: 'Vegetarian,Gluten-free',
    featured: false,
    available: true,
    published: true,
    createdAt: new Date().toISOString(),
    modelScale: 1.0,
    modelPlacement: 'slate'
  }
];

// IndexedDB helper for storing large 3D .glb models and high-res photos
const IDB_NAME = 'atelier_ar_assets';
const IDB_STORE = 'files';

function openAssetDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function persistFile(key: string, file: Blob): Promise<void> {
  const db = await openAssetDB();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(file, key);
  } catch {
    // ignore
  }
}

async function loadPersistedFile(key: string): Promise<Blob | null> {
  const db = await openAssetDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// In-memory / localStorage mock store with IndexedDB fallback
class MockStore {
  private getStorage<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? (JSON.parse(data) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable
    }
  }

  getUser(): User {
    return this.getStorage<User>(USER_KEY, {
      id: 'user-demo',
      email: 'owner@thegrandbistro.com'
    });
  }

  getRestaurant(): Restaurant {
    return this.getStorage<Restaurant>(RESTAURANT_KEY, INITIAL_RESTAURANT);
  }

  updateRestaurant(patch: Partial<Restaurant>): Restaurant {
    const current = this.getRestaurant();
    const updated = { ...current, ...patch };
    this.setStorage(RESTAURANT_KEY, updated);
    return updated;
  }

  getItems(): Item[] {
    return this.getStorage<Item[]>(ITEMS_KEY, INITIAL_ITEMS);
  }

  saveItems(items: Item[]): void {
    this.setStorage(ITEMS_KEY, items);
  }

  createItem(input: ItemInput): Item {
    const items = this.getItems();
    const newItem: Item = {
      id: `item-${Date.now()}`,
      name: input.name,
      category: input.category,
      description: input.description,
      price: input.price,
      imageUrl: input.imageUrl ?? null,
      modelUrl: null,
      modelFileName: null,
      tags: input.tags,
      featured: input.featured,
      available: input.available,
      published: input.published,
      createdAt: new Date().toISOString(),
      modelScale: input.modelScale ?? 1.0,
      modelPlacement: input.modelPlacement ?? 'plate',
      nameUr: input.nameUr ?? null,
      descriptionUr: input.descriptionUr ?? null,
      nameAr: input.nameAr ?? null,
      descriptionAr: input.descriptionAr ?? null
    };
    items.unshift(newItem);
    this.saveItems(items);
    return newItem;
  }

  updateItem(id: string, input: ItemInput): Item {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Dish not found');
    const existing = items[idx];
    const updated: Item = {
      ...existing,
      name: input.name,
      category: input.category,
      description: input.description,
      price: input.price,
      tags: input.tags,
      featured: input.featured,
      available: input.available,
      published: input.published,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl,
      modelScale: input.modelScale ?? existing.modelScale,
      modelPlacement: input.modelPlacement ?? existing.modelPlacement,
      nameUr: input.nameUr !== undefined ? input.nameUr : existing.nameUr,
      descriptionUr: input.descriptionUr !== undefined ? input.descriptionUr : existing.descriptionUr,
      nameAr: input.nameAr !== undefined ? input.nameAr : existing.nameAr,
      descriptionAr: input.descriptionAr !== undefined ? input.descriptionAr : existing.descriptionAr
    };
    items[idx] = updated;
    this.saveItems(items);
    return updated;
  }

  deleteItem(id: string): void {
    const items = this.getItems().filter((i) => i.id !== id);
    this.saveItems(items);
  }

  toggleAvailable(id: string, available: boolean): Item {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Dish not found');
    items[idx].available = available;
    this.saveItems(items);
    return items[idx];
  }

  uploadItemImage(id: string, file: File): Item {
    const url = URL.createObjectURL(file);
    persistFile(`img_${id}`, file);
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Dish not found');
    items[idx].imageUrl = url;
    this.saveItems(items);
    return items[idx];
  }

  uploadItemModel(id: string, file: File): Item {
    const url = URL.createObjectURL(file);
    persistFile(`model_${id}`, file);
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Dish not found');
    items[idx].modelUrl = url;
    items[idx].modelFileName = file.name;
    this.saveItems(items);
    return items[idx];
  }

  removeItemModel(id: string): Item {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Dish not found');
    items[idx].modelUrl = null;
    items[idx].modelFileName = null;
    this.saveItems(items);
    return items[idx];
  }

  tuneModel(id: string, scale: number, placement: string): Item {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Dish not found');
    items[idx].modelScale = scale;
    items[idx].modelPlacement = placement;
    this.saveItems(items);
    return items[idx];
  }

  uploadCover(file: File): Restaurant {
    const url = URL.createObjectURL(file);
    persistFile('cover_restaurant', file);
    return this.updateRestaurant({ coverUrl: url });
  }

  removeCover(): Restaurant {
    return this.updateRestaurant({ coverUrl: null });
  }


  getPublicMenu(slug: string): PublicMenu {
    if (slug === 'demo') {
      return {
        restaurant: {
          name: 'Le Petit Bistro 3D',
          slug: 'demo',
          tagline: 'Experience our signature culinary creations in interactive 3D and table-top Augmented Reality.',
          city: 'London & Dubai',
          currency: 'USD',
          accent: 'cobalt',
          coverUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
          instagram: '@lepetitbistro3d',
          whatsapp: '+1234567890',
          phone: '+1 (555) 234-5678',
          tiktok: '@lepetitbistro3d',
          facebook: 'https://facebook.com',
          website: 'https://lepetitbistro.com',
          googleMapsUrl: 'https://maps.google.com',
          wifiName: 'Bistro_Guest_WiFi',
          wifiPassword: 'bistrogourmet',
          theme: 'dark',
          whatsappOrderEnabled: true,
          whatsappMessageTemplate: 'Hello, I would like to order {dish} for Table {table}.'
        },
        items: [
          {
            id: 'demo-item-1',
            name: 'The Truffle Royale Burger',
            nameUr: 'دی ٹرفل رائل برگر',
            nameAr: 'برغر ذا ترافل رويال',
            category: 'Signatures',
            description: 'Dry-aged wagyu beef, black summer truffle emulsion, aged cheddar, butter-toasted artisan brioche.',
            descriptionUr: 'خشک بیف، بلیک سمر ٹرفل ایمولشن، ایجڈ چیڈر، مکھن سے ٹوسٹ شدہ بروش بن۔',
            descriptionAr: 'لحم واغيو معتق، مستحلب الترافل الأسود، جبن شيدر معتق، وخبز بريوش محمص بالزبدة.',
            price: 32,
            imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
            modelUrl: '/models/avocado.glb',
            tags: 'Halal,Chef Special',
            featured: true,
            available: true,
            modelScale: 1.0,
            modelPlacement: 'plate'
          },
          {
            id: 'demo-item-2',
            name: 'Heirloom Burrata Garden',
            nameUr: 'بوراٹا گارڈن',
            nameAr: 'حديقة البوراتا',
            category: 'Starters',
            description: 'Creamy pugliese burrata, vine-ripened heirloom tomatoes, cold-pressed basil oil, warm focaccia.',
            descriptionUr: 'کریمی بوراٹا، ٹماٹر، تلسی کا تیل اور گرم سوورڈو۔',
            descriptionAr: 'جبنة بوراتا كريمية، طماطم، زيت الريحان وخبز العجين المخمر.',
            price: 22,
            imageUrl: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80',
            modelUrl: null,
            tags: 'Vegetarian',
            featured: false,
            available: true,
            modelScale: 1.0,
            modelPlacement: 'plate'
          },
          {
            id: 'demo-item-3',
            name: 'Saffron Sea Bass',
            nameUr: 'زعفران سی باس',
            nameAr: 'سمك القاروص بالزعفران',
            category: 'Mains',
            description: 'Pan-seared Chilean sea bass, saffron emulsion, charred broccolini, confit fingerling potatoes.',
            descriptionUr: 'پین فرائیڈ سی باس، زعفرانی ساس اور تازہ سبزیاں۔',
            descriptionAr: 'سمك القاروص المحمر، صلصة الزبدة بالزعفران والخضار الموسمية.',
            price: 44,
            imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
            modelUrl: null,
            tags: 'Halal,Gluten-free',
            featured: true,
            available: true,
            modelScale: 1.0,
            modelPlacement: 'plate'
          },
          {
            id: 'demo-item-4',
            name: 'Midnight Tiramisu',
            nameUr: 'مڈ نائٹ تیرامیسو',
            nameAr: 'تيراميسو منتصف الليل',
            category: 'Desserts',
            description: 'Savoiardi ladyfingers soaked in dark roast espresso, light mascarpone cream, Valrhona cocoa.',
            descriptionUr: 'ایسپریسو، مسکارپون چیز اور ڈارک کوکو۔',
            descriptionAr: 'بسكويت مشبع بالإسبريسو، جبنة ماسكاربوني، وكاكاو داكن.',
            price: 15,
            imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
            modelUrl: null,
            tags: 'Vegetarian',
            featured: false,
            available: true,
            modelScale: 1.0,
            modelPlacement: 'plate'
          }
        ]
      };
    }
    const rest = this.getRestaurant();
    const items = this.getItems().filter((i) => i.published);
    return {
      restaurant: {
        name: rest.name,
        slug: rest.slug || slug,
        tagline: rest.tagline,
        city: rest.city,
        currency: rest.currency,
        accent: rest.accent,
        coverUrl: rest.coverUrl,
        instagram: rest.instagram,
        whatsapp: rest.whatsapp,
        phone: rest.phone,
        tiktok: rest.tiktok,
        facebook: rest.facebook,
        website: rest.website,
        googleMapsUrl: rest.googleMapsUrl,
        wifiName: rest.wifiName,
        wifiPassword: rest.wifiPassword,
        theme: rest.theme
      },
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        description: i.description,
        price: i.price,
        imageUrl: i.imageUrl,
        modelUrl: i.modelUrl,
        tags: i.tags,
        featured: i.featured,
        available: i.available,
        modelScale: i.modelScale,
        modelPlacement: i.modelPlacement
      }))
    };
  }

  getAnalytics(days: number): Analytics {
    const items = this.getItems();
    const factor = days === 30 ? 4.2 : 1.0;
    const series = Array.from({ length: days }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - idx));
      const dateStr = d.toISOString().slice(0, 10);
      const base = 25 + Math.floor(Math.sin(idx) * 12 + Math.random() * 8);
      return {
        date: dateStr,
        scans: base + 10,
        views: base * 3 + 14,
        arLaunches: Math.floor(base * 0.45)
      };
    });

    return {
      days,
      scans: { current: Math.round(348 * factor), previous: Math.round(290 * factor) },
      itemViews: { current: Math.round(1120 * factor), previous: Math.round(940 * factor) },
      modelViews: { current: Math.round(410 * factor), previous: Math.round(330 * factor) },
      arLaunches: { current: Math.round(168 * factor), previous: Math.round(122 * factor) },
      series,
      topItems: items.slice(0, 5).map((i, idx) => ({
        id: i.id,
        name: i.name,
        views: Math.round((280 - idx * 45) * factor),
        arLaunches: Math.round((55 - idx * 9) * factor)
      }))
    };
  }
}

export const mockStore = new MockStore();

// Automatically rehydrate blob URLs for 3D models and photos on page load
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      const items = mockStore.getItems();
      let updated = false;
      for (const item of items) {
        if (item.modelFileName && (!item.modelUrl || item.modelUrl.startsWith('blob:'))) {
          const blob = await loadPersistedFile(`model_${item.id}`);
          if (blob) {
            item.modelUrl = URL.createObjectURL(blob);
            updated = true;
          }
        }
        if (item.imageUrl?.startsWith('blob:')) {
          const blob = await loadPersistedFile(`img_${item.id}`);
          if (blob) {
            item.imageUrl = URL.createObjectURL(blob);
            updated = true;
          }
        }
      }
      if (updated) {
        mockStore.saveItems(items);
      }

      const rest = mockStore.getRestaurant();
      if (rest.coverUrl?.startsWith('blob:')) {
        const coverBlob = await loadPersistedFile('cover_restaurant');
        if (coverBlob) {
          mockStore.updateRestaurant({ coverUrl: URL.createObjectURL(coverBlob) });
        }
      }
    } catch {
      // ignore
    }
  }, 100);
}
